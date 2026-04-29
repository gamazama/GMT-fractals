# Bucket Render — Engine Extraction & Fluid-Toy Port (Handoff)

> Written for a successor LLM. Be literal — copy the patterns shown.
> All paths are relative to `h:/GMT/workspace-gmt/dev-bucket-render/` unless noted.

## Goal

Make GMT's bucket render generic so both `app-gmt` and `fluid-toy` can use it.

## Current state (what's done)

**Phase 1 — DONE** (committed on branch `bucket-render-extraction`):
- `engine/export/BucketRenderTypes.ts` — `BucketRenderHost` interface + config + tile types.
- `engine/export/BucketRunner.ts` — generic two-level loop (image tiles × GPU buckets), composite Float32 buffer, scissor copy, readback, save dispatch, progress events. ~470 LOC.
- `engine-gmt/engine/GmtBucketHost.ts` — GMT adapter. Wraps FractalEngine, BloomPass, MaterialController, RenderPipeline async-convergence.
- `engine-gmt/engine/BucketRenderer.ts` — thin 85-line shim preserving the old `bucketRenderer` singleton API. Existing call sites (`FractalEngine.ts`, `renderWorker.ts`, `handleRenderTick.ts`) untouched.

`npm run typecheck` passes. `npm run build` passes (~8s).

**WARNING — phase 1 is NOT YET validated in a real run.** The user reported success but was likely running their dev server out of `h:/GMT/workspace-gmt/dev/` (branch `dev`, original 880-line `BucketRenderer.ts`), not this worktree. To actually validate phase 1:

```bash
cd h:/GMT/workspace-gmt/dev-bucket-render
npm run dev
```

Then in app-gmt: trigger Refine View, then a real bucket render at e.g. 4K, then a 2×2 tile grid render. Confirm the output PNGs look identical to what `dev/` produces. Only then is phase 1 confirmed and the bindings.ts bridge (section A below) testable.

## Remaining work, in order

### A. Fix dim/progress bar (small bug, do first)

**Symptom**: during a bucket render, `useEngineStore.getState().isBucketRendering` reads `false`. The bucket panel only dims its controls + shows progress when this flag is `true`. Pre-existing wire-up gap from the engine extraction, **not** caused by phase 1.

**What I tried**: added a listener in `engine-gmt/renderer/bindings.ts` (inside the exported `bindGmtRenderer()` function, lines ~82–95) that calls `setIsBucketRendering(data.isRendering)` and `setIsExporting(data.isRendering)` on receiving `FRACTAL_EVENTS.BUCKET_STATUS`. After hard-reload, the flag still reads `false`.

**Why it's not firing — suspect, not confirmed**: `FractalEvents` import path drift between worker and main. The worker emits via `engine/FractalEvents.ts`; my main-thread listener imports from `../../engine/FractalEvents` which resolves to the same module. But re-check: the listener may be subscribed to a different singleton than `WorkerProxy.ts:295` re-emits to.

**To debug**:
1. Open devtools, set a breakpoint in `engine-gmt/engine/worker/WorkerProxy.ts:293` (`case 'BUCKET_STATUS'`). Trigger a render. If it hits, the worker→main bridge works.
2. Set a breakpoint inside the listener I added at `engine-gmt/renderer/bindings.ts:88`. If it doesn't hit, the listener is wired to a different bus instance than `WorkerProxy` emits on. Fix: import `FractalEvents` directly in `WorkerProxy.ts` from the same path the bindings file uses, OR move the listener registration into `WorkerProxy._handleMessage` itself (set the store directly there).
3. Reference: stable's bridge lives at `h:/GMT/workspace-gmt/stable/store/fractalStore.ts:507`. It does the same two flips — `setIsBucketRendering(isRendering)` + `setIsExporting(isRendering)`. The comment explains: "Piggyback on isExporting to lock UI (camera, panels, resize). The worker's own engine.state.isExporting stays false so compute() keeps running."

**Acceptance**: during a bucket render in app-gmt, the panel's controls go opacity-50 + pointer-events-none, and the cyan progress bar fills left→right.

---

### B. Phase 2 — Generic topbar plugin (`installBucketRender`)

**Goal**: extract the topbar bucket button + panel popover from `engine-gmt/topbar/BucketRenderControls.tsx` into a generic `engine/plugins/topbar/BucketRenderPanel.tsx` that any app installs explicitly.

**Steps**:
1. Read `engine-gmt/topbar/BucketRenderControls.tsx` end-to-end (~616 LOC). Understand which pieces are GMT-specific (none of the rendering logic — that's already in `BucketRunner` + `GmtBucketHost`; what's specific is the *button caller* of `engine.startBucketRender()`).
2. Move the panel component to `engine/plugins/topbar/BucketRenderPanel.tsx`. Replace `useEngineStore`/store types with what's already in engine-core. The panel only needs the renderControlSlice fields it already reads.
3. Replace direct `getProxy()` calls with a parameter. The panel takes an `onStartRender(config)` and `onStartRefine()` callback prop — the app provides the renderer-specific entry points.
4. Wrap with `installBucketRender({ host, presets? })` in `engine/plugins/topbar/installBucketRender.ts`. The install function:
   - Registers a topbar button via the existing `@engine/topbar` slot system (see `docs/engine/04_Core_Plugins.md` § topbar for slot API).
   - Wires onStartRender to call `host.start(...)` (or whatever entry the app passes).
5. Update `app-gmt/main.tsx` to call `installBucketRender({ host: gmtHost, ... })` and remove the old direct topbar registration.
6. Verify: `npm run typecheck` + `npm run build` pass; app-gmt bucket render still works identically.

**Pitfall**: the panel currently calls `engine.startBucketRender(config, exportImage)` (where `engine = getProxy()`). For the generic version, route through `host` or pass an explicit callback. Don't import `getProxy` into the generic plugin file — that would re-couple it to the GMT worker proxy.

**Reference for plugin pattern**: `engine/plugins/topbar/PauseControls.tsx` + how it's installed in app-gmt. Or `docs/engine/13_Extracting_From_GMT.md` for the worked TSAA + pause-button extraction (same playbook).

---

### C. Phase 3 — Fluid-toy shader hooks

**File**: `fluid-toy/fluid/shaders/julia.ts`

**Add 4 uniforms** with no-op defaults so live viewport is unaffected:

```glsl
uniform vec2 uImageTileOrigin;   // default (0, 0)
uniform vec2 uImageTileSize;     // default (1, 1)
uniform vec2 uRegionMin;         // default (0, 0)
uniform vec2 uRegionMax;         // default (1, 1)
```

**In the shader's main()**:
- Where the shader currently maps screen UV to fractal-space `c`, remap first:
  ```glsl
  vec2 uvFull = uImageTileOrigin + vUv * uImageTileSize;
  // use uvFull instead of vUv for c-coord computation
  ```
- Add region mask early-out (before the iteration loop):
  ```glsl
  if (vUv.x < uRegionMin.x || vUv.x > uRegionMax.x ||
      vUv.y < uRegionMin.y || vUv.y > uRegionMax.y) {
      // preserve previous frame, or write transparent black
      gl_FragColor = texture2D(uPrevAccum, vUv); // or whatever the existing accumulation source is
      return;
  }
  ```

**Wire uniforms through `FluidEngine`**:
- Add the 4 uniforms to the julia material's uniform map.
- Add public methods `setImageTileUv(origin, size)`, `setRegionUv(min, max)` that update them.
- Defaults so live viewport renders unchanged.

**Verify**: `npm run smoke:fluid-toy` still passes; live fluid-toy in browser looks identical to before.

---

### D. Phase 4 — `FluidBucketHost` + `setForceJuliaOnly` + install

**1. `FluidEngine.setForceJuliaOnly(on: boolean)`**:
Mirrors the existing `setForceFluidPaused` pattern. When on:
- The composite/display pass renders only the julia field (no dye blend, no velocity).
- The sim pipeline is skipped entirely (no advect, no pressure, no dye decay).
The user explicitly said "skip sim entirely - just the fractal" for v1.

Look at how `setForceFluidPaused` is implemented in `FluidEngine.ts` and follow the same pattern. Likely a boolean flag checked in the render dispatch.

**2. `fluid-toy/bucket/FluidBucketHost.ts`**:

Implement `BucketRenderHost` from `engine/export/BucketRenderTypes.ts`. Reference `engine-gmt/engine/GmtBucketHost.ts` for shape — the fluid version is simpler.

```ts
import * as THREE from 'three';
import type {
    BucketRenderHost, BucketImageTile, BucketUvRect,
    BucketSize2D, BucketRenderConfig
} from '../../engine/export/BucketRenderTypes';
import type { FluidEngine } from '../fluid/FluidEngine';

export class FluidBucketHost implements BucketRenderHost {
    private engine: FluidEngine;
    private originalSize = new THREE.Vector2();
    private savedJuliaOnly = false;
    private savedSimPaused = false;
    private sampleCap = 64;

    constructor(engine: FluidEngine) { this.engine = engine; }

    getRenderer() { return this.engine.getRenderer(); }   // expose this on FluidEngine if not already

    beginRender(outputW: number, outputH: number) {
        const gl = this.engine.getRenderer();
        if (!gl) return;
        gl.getSize(this.originalSize);
        this.savedJuliaOnly = this.engine.isForceJuliaOnly?.() ?? false;
        this.savedSimPaused = this.engine.isForceFluidPaused?.() ?? false;
        this.engine.setForceJuliaOnly(true);
        this.engine.setForceFluidPaused(true);
        // Adjust fractal aspect to outputW/outputH if FluidEngine supports it.
        // If not, fluid-toy's fractal field already responds to setRenderSize.
    }

    setRenderSize(w: number, h: number) {
        // Only the fractal/display targets resize. Sim grid stays at viewport
        // size — sim is paused and skipped anyway.
        this.engine.setFractalRenderSize?.(w, h) ?? this.engine.setRenderSize(w, h);
    }

    beginImageTile(tile: BucketImageTile, fullOutput: BucketSize2D) {
        const originUV: [number, number] = [tile.pixelX / fullOutput.w, tile.pixelY / fullOutput.h];
        const sizeUV: [number, number]   = [tile.pixelW / fullOutput.w, tile.pixelH / fullOutput.h];
        this.engine.setImageTileUv(originUV, sizeUV);
    }

    beginGpuBucket(uvRect: BucketUvRect, _pixelRect) {
        this.engine.setRegionUv([uvRect.minX, uvRect.minY], [uvRect.maxX, uvRect.maxY]);
    }

    resetAccumulation() { this.engine.resetAccumulation(); }

    isCurrentBucketConverged(frameCount: number, config: BucketRenderConfig): boolean {
        const cap = config.samplesPerBucket ?? this.sampleCap;
        return this.engine.getAccumulationCount() >= cap;
    }

    getOutputTexture(): THREE.Texture | null {
        return this.engine.getJuliaOutputTexture?.() ?? null;
    }

    getReadbackMaterial(): THREE.ShaderMaterial | null {
        // v1: passthrough. The runner has a fallback copy material when this
        // returns null. No bloom, no tone mapping — just the converged fractal.
        return null;
    }

    endRender() {
        this.engine.setForceJuliaOnly(this.savedJuliaOnly);
        this.engine.setForceFluidPaused(this.savedSimPaused);
        this.engine.setImageTileUv([0, 0], [1, 1]);
        this.engine.setRegionUv([0, 0], [1, 1]);
        this.engine.setRenderSize(this.originalSize.x, this.originalSize.y);
        this.engine.resetAccumulation();
    }
}
```

The methods marked with `?.()` (`isForceJuliaOnly`, `getJuliaOutputTexture`, `setFractalRenderSize`) may need adding to `FluidEngine` — adapt to whatever the engine's public surface actually has.

**3. Install**:
- After phase 2 lands, in `fluid-toy/main.tsx`:
  ```ts
  import { installBucketRender } from '../engine/plugins/topbar/installBucketRender';
  import { FluidBucketHost } from './bucket/FluidBucketHost';
  // ... after engine boot ...
  installBucketRender({ host: new FluidBucketHost(fluidEngine) });
  ```
- If phase 2 isn't done yet, add a temp button in fluid-toy's topbar that calls `runner.start(host, config, true, exportData)` directly. The user confirmed bucket render belongs in the topbar.

---

### E. Phase 5 — Verify

**Manual smokes**:
1. Live fluid-toy viewport looks identical to before (uniform defaults are no-op).
2. Click bucket render at 4K, single tile (1×1). PNG saves cleanly. Should be the converged fractal at 4K, no dye, no fluid motion.
3. Click bucket render at 8K with 2×2 grid. Four PNGs save (`*_r0c0.png` ... `*_r1c1.png`). Stitch them externally (ImageMagick: `montage -tile 2x2 -geometry +0+0 *_r*c*.png stitched.png`). Diff against a single 8K render — seams should be invisible (no bloom, no blue noise in fluid-toy, only TSAA jitter).
4. Live viewport returns to normal after render finishes (composite mode, sim resumes if it was running).

**Automated**: `npm run typecheck`, `npm run build`, `npm run smoke:fluid-toy`. All should pass.

---

## Things to NOT change

- The `bucketRenderer` singleton API in `engine-gmt/engine/BucketRenderer.ts` — its method signatures match what `FractalEngine.ts:170,422,449,517`, `renderWorker.ts:181,183,618,624`, and `handleRenderTick.ts:102,103,144,145` call. Don't break those.
- The Float32 composite buffer in `BucketRunner.initCompositeBuffer` — required for HDR-correct compositing across GPU buckets. Even though fluid-toy v1 doesn't need HDR, the runner is shared and GMT does need it.
- The shared uniforms `uRegionMin`, `uRegionMax`, `uImageTileOrigin`, `uImageTileSize`, `uFullOutputResolution`, `uTilePixelOrigin` are already defined in `engine/UniformNames.ts` and `engine/UniformSchema.ts`. Don't re-declare; consume.

## Why this design

The two-level loop (image tiles × GPU buckets) gives massive renders (15K, 16K, A0 print) on modest VRAM by:
- Image tiles split the output into independent PNGs (user stitches externally).
- GPU buckets within an image tile are smaller sub-rects accumulated into a per-tile Float32 composite. Both apps need this — fluid-toy too, despite its cheaper shader, because rendering a 4K-wide single image tile still needs ~225 MB ping-pong VRAM, and many users have less.

Convergence policy is host-specific: GMT polls async GPU readback against a threshold; fluid-toy compares accumulated sample count to a cap. Both plug in via `host.isCurrentBucketConverged(frameCount, config)`.

Post-processing (bloom, CA, tone map, sRGB encode) is host-specific via `host.getReadbackMaterial(...)`. GMT returns its `exportMaterial`; fluid-toy v1 returns null (passthrough). When fluid-toy adopts GMT's bloom (planned), its host returns a similar configured material.

## Where to look when stuck

- Original (pre-extraction) reference: `h:/GMT/workspace-gmt/stable/` — same code, different file layout. Especially `stable/components/topbar/BucketRenderControls.tsx`, `stable/engine/BucketRenderer.ts`, `stable/store/fractalStore.ts`.
- Design doc: `docs/gmt/43_Bucket_Render_Overhaul.md`.
- Plugin extraction cookbook: `docs/engine/13_Extracting_From_GMT.md`.
- Engine plugin contracts: `docs/engine/04_Core_Plugins.md`.
- Fluid-toy code map: `fluid-toy/CODE_MAP.md`.
