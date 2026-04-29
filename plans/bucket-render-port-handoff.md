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

**Phase 1 validated in the worktree (`npm run dev` from `dev-bucket-render/`).** App-gmt: Refine View, 4K bucket render, 2×2 tile grids at multiple aspect ratios — all produce output identical to pre-refactor. The `bindings.ts` BUCKET_STATUS bridge is also confirmed working: panel controls dim during render, cyan progress bar fills.

**Resume from here**: skip section A (no longer needed — bridge works). Start at section B.

## Remaining work, in order

### A. ✅ DONE — `bindings.ts` BUCKET_STATUS bridge

The two-flip bridge (`setIsBucketRendering` + `setIsExporting` on receiving `FRACTAL_EVENTS.BUCKET_STATUS`) was added inside the exported `bindGmtRenderer()` in `engine-gmt/renderer/bindings.ts` (lines ~82–95). Confirmed firing — panel dims and progress bar shows during renders. Reference for what it mirrors: `h:/GMT/workspace-gmt/stable/store/fractalStore.ts:507`.

---

### B. ✅ DONE — Phase 2 — Generic topbar plugin

The panel was extracted from `engine-gmt/topbar/BucketRenderControls.tsx` (now deleted) into `engine/plugins/topbar/BucketRenderPanel.tsx`, parameterized on a `BucketRenderController` interface. New files:

- `engine/plugins/topbar/BucketRenderController.ts` — the UI-side controller interface (start/stop/preview/accumulationCount). Distinct from `BucketRenderHost` (which is the runner-side adapter).
- `engine/plugins/topbar/BucketRenderPanel.tsx` — the generic panel. Optional preview-region affordances hide automatically when the controller doesn't implement them (good for fluid-toy v1).
- `engine/plugins/topbar/installBucketRender.tsx` — registers the topbar button + popover wrapper. Takes `{ controller, slot?, order?, id? }`.
- `engine-gmt/topbar/GmtBucketController.ts` — wraps WorkerProxy and reads GMT preset state for export metadata. Replaces the inline GMT-specific code that used to live in the panel's `handleExport`.

`engine-gmt/topbar.tsx` now calls `installBucketRender({ controller: new GmtBucketController(), slot: 'left', order: 30, id: 'gmt-bucket-render' })` instead of registering its old toggle component directly. The local `RenderGridIcon` and `BucketRenderToggle` definitions in that file were removed.

Typecheck + build pass. Awaiting the user's manual test that app-gmt bucket render still works through the new path.

---

### C. ✅ DONE — Phase 3 — Fluid-toy shader hooks

`fluid-toy/fluid/shaders/julia.ts` — added the 4 uniforms with no-op defaults, plus a region-mask `discard` early-out at the top of `main()` and an image-tile UV remap on the per-K `uvJ`. Live viewport unchanged at defaults.

`fluid-toy/fluid/FluidEngine.ts` — added private state (`forceJuliaOnly`, `bucketTileOrigin/Size`, `bucketRegionMin/Max`), uploads the new uniforms each frame in `renderJulia()`, public setters `setForceJuliaOnly`, `isForceJuliaOnly`, `isForceFluidPaused`, `setBucketImageTile`, `setBucketRegion`. The display path now overrides show mode to `'julia'` when `forceJuliaOnly` is true, so during a bucket render the user sees the converged fractal alone (no dye/velocity blend).

**Caveat (deep-zoom + bucket-render)**: the deep-zoom path uses `gl_FragCoord` for high-precision pixel offset from a reference orbit. Bucket render with deep-zoom enabled would need an additional `uTilePixelOrigin` offset in that math. For v1 we'll document "disable deep-zoom for export"; can be fixed later.

---

### D. ✅ DONE (awaiting validation) — Phase 4 — fluid-toy adapters + install

`fluid-toy/bucket/FluidBucketController.ts` — implements `BucketRenderController`. Drives the image-tile loop directly against `FluidEngine` (no `BucketRunner`, see architectural finding below). Per tile: setBucketImageTile → setRenderSize → forceJuliaOnly+forceFluidPaused → resetAccumulation → await convergence (`getAccumulationCount() >= samplesPerBucket`) → if exporting, `canvas.toBlob` + download with `_rXcY` suffixed filename. Final block restores all saved state. Emits `FRACTAL_EVENTS.BUCKET_STATUS` for the panel's progress bar.

`fluid-toy/main.tsx` — calls `installBucketRender({ controller: new FluidBucketController(() => appEngine.ref.current), slot: 'left', order: 30 })`. Lazy engine getter resolves at call time, so the install is safe to run before the engine boots.

`fluid-toy/fluid/FluidEngine.ts` — added `getCanvas()` accessor (already had `setRenderSize`, `resetAccumulation`, `getAccumulationCount` from before).

**Awaiting user validation in worktree** (`cd dev-bucket-render && npm run dev`):
- Live fluid-toy viewport unchanged (uniform defaults are no-op).
- Bucket-render button appears in fluid-toy's topbar at order 30.
- Panel preview-region affordances are auto-hidden (controller doesn't implement them).
- Refine View at viewport size: converges, no save.
- Export at 4K, 1×1: one PNG saves, fractal-only (no dye/velocity blend).
- Export at 8K, 2×2: four PNGs save with `_r0c0`/`_r0c1`/`_r1c0`/`_r1c1` suffixes; stitched externally should match a 1×1 8K render (no bloom/CA in fluid-toy = no seams).
- After render finishes, viewport returns to normal (composite mode, sim resumes if it was running).

**Trade-offs accepted in v1**:
- Refine View doesn't keep the converged frame on screen (state restoration nukes it). User who wants the result should use Export Image. Could add held-final-frame later, mirroring GMT's pattern.
- No GPU sub-bucketing within an image tile, so a single image tile must fit in VRAM. Fluid-toy has no multi-target ping-pong, so a 4K tile is ~50 MB — fine on any GPU. For larger single-tile renders, user picks a tile grid.
- Deep-zoom + bucket-render: not supported. The deep-zoom path uses `gl_FragCoord` for high-precision pixel offset and would need an additional `uTilePixelOrigin` to be tile-aware. Disable deep-zoom for export in v1.

**Architectural finding from this work**: `fluid-toy/fluid/FluidEngine.ts` uses raw WebGL2 (`gl: WebGL2RenderingContext`), not Three.js. The generic `BucketRunner` from phase 1 is hardcoded to `THREE.WebGLRenderer`/`WebGLRenderTarget`/`ShaderMaterial` for its composite buffer + scissor copy + readback machinery, and its `BucketRenderHost.getRenderer()` returns a `THREE.WebGLRenderer`. **Therefore fluid-toy cannot directly reuse `BucketRunner`** without a Three.js wrapper around its WebGL2 context.

**Recommended path** (simplest): skip `BucketRunner` for fluid-toy v1 and run the tile loop directly inside `FluidBucketController`. Architecture:

```
fluid-toy/bucket/FluidBucketController.ts
    implements BucketRenderController (engine/plugins/topbar/...)
    constructor(fluidEngine: FluidEngine)
    startBucketRender(exportImage, config) — drives the loop directly:
        save state (renderSize, forceJuliaOnly, forceFluidPaused, show mode)
        for each image tile (built same way as BucketRunner.start does):
            engine.setRenderSize(tileW, tileH)
            engine.setBucketImageTile(originUV, sizeUV)
            engine.setBucketRegion([0,0], [1,1])  // single GPU bucket per tile in v1
            engine.setForceJuliaOnly(true)
            engine.setForceFluidPaused(true)
            engine.resetAccumulation()
            // wait until accumulationCount >= samplesPerBucket
            // (poll in a setTimeout/RAF loop; the live render loop is still running
            //  so frames accumulate naturally)
            await convergence
            if (exportImage) {
                read pixels from canvas (gl.readPixels or canvas.toBlob)
                save PNG with metadata (mirror BucketRunner.buildTileFilename)
            }
        endRender — restore state
    stopBucketRender() — flag a cancellation
    accumulationCount — proxy fluidEngine.getAccumulationCount()
```

**Skipped vs GMT**: no Float32 HDR composite, no GPU sub-buckets within a tile (so a single image tile must fit in VRAM — for fluid-toy this is fine since it has no multi-target ping-pong like GMT does), no bloom/CA post-pass on the composite. All acceptable for v1 ("converged fractal at print resolution"). Adding GPU sub-bucketing later would need a Three.js-context wrapper or a WebGL2-native composite implementation.

**File checklist**:

1. `fluid-toy/bucket/FluidBucketController.ts` — implements `BucketRenderController`. Owns the tile loop. Reads `samplesPerBucket` from store / config, polls `engine.getAccumulationCount()` for convergence, calls into `engine.set*` methods built in phase 3.

2. PNG save — fluid-toy is main-thread (no worker proxy), so save directly via `canvas.toBlob` + download link, similar to the DOM fallback in `BucketRunner.saveImage`. Filename: copy `buildTileFilename` from `BucketRunner` (single image vs `_rXcY` suffix for multi-tile).

3. `fluid-toy/main.tsx` — after engine boot, call:
   ```ts
   import { installBucketRender } from '../engine/plugins/topbar/installBucketRender';
   import { FluidBucketController } from './bucket/FluidBucketController';
   installBucketRender({ controller: new FluidBucketController(fluidEngine) });
   ```

4. The fluid-toy panel doesn't have a `previewRegion` use case for v1. Omit `setPreviewRegion`/`clearPreviewRegion` from the controller — the panel auto-hides those affordances.

**Test**: load fluid-toy, click bucket render button (now in topbar), pick 4K, click Refine. After convergence, a PNG saves. Then 8K with 2×2 grid → 4 PNGs. Stitch externally and check seams.

**`FluidBucketHost` is no longer needed** for v1 (no `BucketRunner` to plug into). Skip that file. If GPU sub-bucketing is added later, build it then.

---

### D. Phase 4 — `FluidBucketHost` + `FluidBucketController` + `setForceJuliaOnly` + install

**Two adapters needed**: `FluidBucketHost` (runner-side, drives BucketRunner) and `FluidBucketController` (UI-side, plugs the panel in via `installBucketRender`). Mirror `engine-gmt/engine/GmtBucketHost.ts` and `engine-gmt/topbar/GmtBucketController.ts` respectively.

For fluid-toy v1, the controller can omit `setPreviewRegion` / `clearPreviewRegion` — the panel auto-hides those buttons. The controller's `startBucketRender` calls into a new entry point on `FluidEngine` that does:

```ts
fluidEngine.startBucketRender(exportImage: boolean, config: BucketRenderConfig) {
    if (this.bucketRunner.getIsRunning()) return;
    this.bucketRunner.start(this.bucketHost, config, exportImage);
}
fluidEngine.stopBucketRender() { this.bucketRunner.stop(); }
get accumulationCount() { return this.tsaaSampleCount; } // or wherever fluid-toy tracks it
```

Where `this.bucketRunner` is a `BucketRunner` instance owned by FluidEngine, and `this.bucketHost` is a `FluidBucketHost` instance bound to it.

Important: fluid-toy needs its own per-frame tick to call `this.bucketRunner.update()` after each render — same pattern as `engine-gmt/engine/FractalEngine.ts:422` (`bucketRenderer.update(this.renderer, this.state.bucketConfig)`).

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
