# Bucket Render Overhaul — Explicit Dimensions + Output Tiling

> Draft plan | 2026-04-20

## Problem

The current high-resolution export ("bucket render") suffers from two user-facing issues:

1. **Opaque sizing.** Export size is controlled by a 1×–8× `bucketUpscale` **multiplier** on the current viewport. To get a specific output resolution, users must first size the viewport (or toggle into Fixed mode, pick dims, then guess a multiplier). The VRAM-estimate label — "3840×2160 • 450 MB VRAM" — is the only signal of the actual output size, and it only appears after the user has already twiddled sliders.
2. **Hard VRAM ceiling for massive prints.** The renderer allocates a single Float32 composite buffer at full output resolution (16 B/px). An 8 K × 8 K export needs ~1 GB just for the composite, plus ~2 GB for the ping‑pong targets — it pushes most GPUs over the edge. There is no way to produce larger-than-viewport prints suitable for physical output (e.g. 20 K × 20 K wall art) even though the engine would otherwise be capable of it.

Users have specifically asked for (a) the ability to type the output dimensions they want, and (b) the ability to split a massive render into a grid of separate image files that can be stitched externally.

## Current architecture (verified first‑hand)

Key paths (all `file:line`):

- [components/topbar/BucketRenderControls.tsx:50-60](components/topbar/BucketRenderControls.tsx#L50-L60) — UX: `upscale × viewportPixels → outW/outH`; VRAM estimate drives a warning label.
- [engine/BucketRenderer.ts:120-210](engine/BucketRenderer.ts#L120-L210) — `start()`: saves viewport size, multiplies by `bucketUpscale`, calls `pipeline.resize(targetW, targetH)`, allocates one full-size Float32 composite, builds a center-spiral list of GPU tiles (`bucketSize`-pixel chunks of the full output).
- [engine/BucketRenderer.ts:334-403](engine/BucketRenderer.ts#L334-L403) — per-GPU-tile loop sets `uRegionMin/Max` (in full-output UV), accumulates until convergence, then scissor-copies the tile into the composite buffer.
- [engine/BucketRenderer.ts:410-485](engine/BucketRenderer.ts#L410-L485) — on finish, runs bloom/CA/color-grade/tone-mapping on the **full** composite, then reads back + saves one PNG.
- [shaders/chunks/ray.ts:19-84](shaders/chunks/ray.ts#L19-L84) — `getCameraRay(uvCoord)` converts `uv = uvCoord*2-1` and builds `rd = forward + uv.x·basisX + uv.y·basisY`. **Rays are driven by fragment `vUv` (0..1 across the rendered surface), not by pixel index.**
- [engine/managers/UniformManager.ts:255-269](engine/managers/UniformManager.ts#L255-L269) — `basisX = right · (tanFov · aspect)`, `basisY = up · tanFov`. Aspect comes from `cam.aspect`, which is synced to canvas size in `Full` mode only.
- [shaders/chunks/main.ts:73-92](shaders/chunks/main.ts#L73-L92) — `main()` uses raw `vUv` for the region-mask check and for ray generation; history-preserve outside region, accumulate inside.
- [engine/worker/renderWorker.ts:645-682](engine/worker/renderWorker.ts#L645-L682) — `BUCKET_START` one-shots `cam.aspect = renderer.domElement.width/height` before `bucketRenderer.start()`. **This is the canvas aspect, not the output aspect.** Today that's fine because output = canvas × upscale (same aspect).

### Two distinct concepts that the rename should make clear

- **Bucket** = internal GPU tile for VRAM safety (128–512 px). Lives entirely inside the worker; user cares about it only as a memory knob.
- **Image tile (new)** = an output sub-image that gets saved as its own PNG. A 10 K × 10 K image split 2×2 becomes four 5 K × 5 K PNG files.

An image tile contains many buckets. The bucket loop is unchanged — we wrap it in an outer "for each image tile" loop.

## Proposed design

### UX changes (BucketRenderControls)

Replace the `Export Scale` slider with an **explicit dimensions block**:

```
┌─ Output ──────────────────────────────┐
│  Width:  [ 3840 ]  Height: [ 2160 ]  │
│  Preset: [ 4K UHD       ▼ ]          │
│  ☐  Match viewport aspect             │
│                                        │
│  Tile grid:  [ 1 ] × [ 1 ]            │
│  (per-tile: 3840 × 2160 • 450 MB)     │
└───────────────────────────────────────┘
```

- **Width/Height numeric inputs** with snap-to-8 (matches the existing Quality panel convention) and per-axis aspect lock (reuses the aspect-lock affordance already in `QualityPanel.tsx`).
- **Preset dropdown** — HD/FHD/QHD/4K/8K, plus print sizes (A3/A2/A1 at 300 DPI: 4961×3508, 7016×4961, 9933×7016), and Custom. The preset button writes into the width/height fields; users can then tweak.
- **"Match viewport aspect" checkbox** — when on, changing width auto-sets height (and vice-versa) to preserve the current viewport ratio. This is the natural replacement for today's multiplier UX for users who don't care about exact dimensions.
- **Tile grid: cols × rows** (both default 1). When either > 1, the filename template adds `_rXcY` and multiple PNGs are produced. The VRAM estimate becomes `per-tile` — i.e. computed against `W/cols × H/rows`, which is the actual max buffer size.

Derived state surfaced inline (no extra math for the user):
- Total pixels, per-tile pixels, per-tile VRAM, file-count preview ("Will produce 9 files: `fractal_v3_r0c0.png` … `fractal_v3_r2c2.png`").
- A red warning if **per-tile** VRAM > 1.5 GB; a yellow warning at 500 MB. (Today the warning bands are on full-image VRAM.)

The "Refine View" button stays unchanged — it's an at-viewport-resolution quality refinement and has nothing to do with export sizing. Hide the tile-grid row when Refine is invoked (force 1×1).

### Engine changes

#### 1. Output-dimensions-first sizing

Replace `bucketUpscale: number` in `BucketRenderConfig` with `outputWidth: number, outputHeight: number`. In `BucketRenderer.start()`:

- Remove the `originalSize × activeUpscale` math. `targetResolution = (outputWidth, outputHeight)`.
- Compute and apply `outputAspect = outputWidth / outputHeight` to `cam.aspect` (and `updateProjectionMatrix`) before capturing basis uniforms. The worker-side one-shot aspect fix in `renderWorker.ts:653-663` stays for the canvas-aspect case but we add a second branch for "override to output aspect during bucket render."
- Store the saved `cam.aspect` so `cleanup()` can restore.

Existing VRAM-safety `bucketSize` (GPU tile) is unchanged. Existing `samplesPerBucket` / `convergenceThreshold` are unchanged.

#### 2. Image-tile loop (new)

Add `tileCols: number, tileRows: number` to `BucketRenderConfig`. Default both to 1 (single image — identical to today's behavior). When either > 1:

- `BucketRenderer.start()` computes per-tile output size `tileW = floor(outputWidth / tileCols)`, `tileH = floor(outputHeight / tileRows)`. Rounds the **last** column/row up to cover any remainder (so nothing is lost to `floor`).
- Allocates a `tileW × tileH` Float32 composite buffer (not full-output-sized).
- Outer loop over `(tr, tc)` image tiles, inner loop is today's bucket loop.

Per image tile:

1. **Set UV remap uniforms.** Two new vec2 uniforms: `uImageTileOrigin` (default `(0,0)`), `uImageTileSize` (default `(1,1)`). In `ray.ts`, change:
   ```glsl
   vec2 uv = uvCoord * 2.0 - 1.0;
   ```
   to:
   ```glsl
   vec2 uvFull = uImageTileOrigin + uvCoord * uImageTileSize;
   vec2 uv = uvFull * 2.0 - 1.0;
   ```
   Camera basis vectors stay configured for the **full output aspect** — the remap makes the fullscreen quad cover the current tile's slice of full-image NDC. Default values make this a no-op for single-image render.
2. **Blue-noise seam fix.** Blue-noise lookups in `ray.ts:50-51, 99-100` currently use `noiseCoord * uResolution`. If `uResolution` is per-tile, adjacent tiles repeat the noise pattern and path-traced seams appear. Fix by offsetting: `noiseCoord * uFullOutputResolution + uTilePixelOrigin`. Adds one vec2 uniform + uses the existing `uResolution` for TAA jitter (which is fine — TAA jitter is global per frame, not per-pixel-position).
3. **Resize pipeline to tile size.** `pipeline.resize(tileW, tileH)`. Same internal bucket loop runs inside.
4. **Region mask stays raw.** `uRegionMin/Max` continues to use `vUv` in the shader — it's a screen-space mask on the currently-rendered surface (the tile). GPU buckets inside a tile use the same UV-space region mask they do today, just at tile resolution. No conflict with the new UV remap because that only affects ray generation, not the region check.
5. **Run post-processing per tile.** Bloom/CA/color-grade/tone-map run on the per-tile composite (the existing `runPostProcessing()`, unchanged). This is the known seam cost — see caveats below.
6. **Save tile as PNG with `_rXcY` suffix.** Emit one `BUCKET_IMAGE` worker message per tile; `WorkerProxy._handleBucketImage` already handles the DOM save. File-naming uses the existing `getExportFileName` + append `_r{tr}c{tc}`.
7. **Advance to next tile.** Reset accumulation, repeat.

Progress reporting becomes `(tiles_done × buckets_per_tile + current_bucket) / total_buckets` so the progress bar remains smooth across tiles.

#### 3. Tile-boundary seams — what we accept and what we fix

- **Ray origin/direction:** seamless by construction once UV-remap is in place (camera basis is full-output-aspect).
- **Blue noise:** seamless once pixel-origin offset is applied (see #2 above).
- **TAA jitter:** global per frame, seamless.
- **Primary ray accumulation:** each tile converges independently. If the user stops early on one tile but not another, noise variance differs at the seam. Mitigation: require all tiles to hit the same convergence threshold (they will, modulo ~1 sample of variance). No code change needed.
- **Bloom, chromatic aberration:** spatial post-processing. Bloom at tile edges bleeds from black instead of neighboring-tile pixels. **This is the real seam.** Options:
  - (a) **Document + warn.** The panel shows a yellow "Bloom/CA may produce visible seams when tiling" note when cols×rows > 1 and bloomIntensity > 0. Users who care can disable bloom for the tiled export.
  - (b) **Render bloom from the low-res viewport.** Today's offline-compose path already supports a per-viewport-resolution bloom upsampled over the full composite (see `BucketRenderer.ts:425-431`). For tiled export we can render bloom **once** from the viewport at the start of a tiled session, then sample it per-tile using a full-image UV. This preserves bloom spatial continuity at zero extra per-tile cost. Feasible; recommend as v2.
  - (c) Render with overlap margins (e.g. +64 px skirt per tile) and feather-composite externally. Out of scope — moves the stitching problem into the user's tooling.

v1 = (a). v2 = (b). (c) isn't worth the complexity.

#### 4. Settings changes

`rendererSlice.ts`:

- **Remove** `bucketUpscale` + `setBucketUpscale` (deprecated — not yet shipped to end users based on store defaults, safe to rename).
- **Add** `outputWidth` (default 1920), `outputHeight` (default 1080), `tileCols` (default 1), `tileRows` (default 1), `matchViewportAspect` (default true) + setters.
- Keep `bucketSize`, `convergenceThreshold`, `samplesPerBucket` unchanged.

`BucketRenderConfig` in `engine/BucketRenderer.ts`:

```ts
export interface BucketRenderConfig {
    bucketSize: number;        // unchanged — GPU tile size
    outputWidth: number;       // NEW — explicit
    outputHeight: number;      // NEW — explicit
    tileCols: number;          // NEW — default 1
    tileRows: number;          // NEW — default 1
    convergenceThreshold: number;
    accumulation: boolean;
    samplesPerBucket?: number;
}
```

`startRefineRender()` in BucketRenderControls bypasses output/tile fields and passes `outputW/H = canvasPixelSize`, `tileCols=1, tileRows=1`.

## Rollout steps (suggested order)

1. **Shader uniforms in place, no-op defaults.** Add `uImageTileOrigin = (0,0)`, `uImageTileSize = (1,1)`, `uFullOutputResolution = uResolution`, `uTilePixelOrigin = (0,0)`. Wire them through `UniformSchema.ts` / `UniformNames.ts` / `UniformManager.ts`. Apply the UV remap in `ray.ts`. Apply the blue-noise offset in `ray.ts`. Verify all existing tests pass (`test:shader`, `test:render`) — with defaults, behavior is identical.
2. **Explicit output dims, single-image (no tiling yet).** Replace `bucketUpscale` with `outputWidth/outputHeight` in config + store + UI. BucketRenderer computes output aspect, overrides `cam.aspect` at start, restores at cleanup. Viewport-aspect-lock checkbox drives the UI math. Verify existing behavior (viewport × integer upscale) can be reproduced exactly via explicit W/H.
3. **Image-tile loop.** Add `tileCols/tileRows` to config + store + UI. BucketRenderer outer-loops tiles, sets uniforms per tile, runs the existing bucket loop, saves per-tile PNGs. Filename `_rXcY` suffix via `getExportFileName` extension. Progress-bar math updated.
4. **Seam mitigations.** Bloom "render once, sample many" v2 (optional; ship v1 with the warning first).
5. **Docs.** Update `docs/02_Rendering_Internals.md` §6 (Bucket Renderer) with the new concepts (output vs bucket vs image-tile), and the in-app help (`data/help/`) for the revised panel.

## Testing

- **Regression**: `npm run test:shader` (compile) and `npm run test:render` (headless PNG sweep) — all should continue passing with new uniforms at default values.
- **Single image, explicit dims**: render 1920×1080 and 3840×2160 via the new UX; byte-compare against the same render produced by the old `bucketUpscale` path. Should match within floating-point tolerance.
- **Tiled render seam test**: render a 2048×2048 image both as 1×1 and as 2×2, stitch the 2×2 externally, diff against 1×1. With bloom/CA off, seams should be below blue-noise variance. With bloom/CA on, v1 documents the seam; v2 removes it.
- **Massive render smoke test**: 16 K × 16 K at 4×4 tiles on a mid-range GPU (per-tile = 4 K × 4 K, ~450 MB VRAM). Confirms the tile loop doesn't leak buffers between iterations.

## Open questions

- Should the tile grid also control output file count for formats other than PNG (future EXR)? The pipeline is PNG-only today; EXR is flagged in code-health docs. Tile loop is format-agnostic, so this is a free win when EXR lands.
- Is there a reason to keep the 1–8× multiplier as a "shortcut" for users who liked it? I'd say no — it can be reproduced trivially by typing `viewportW × 4`. Cleaner to remove.
- Filename convention: `_r0c0` vs `_row0_col0` vs `_tile_0_0`? Existing convention in `getExportFileName` is compact — recommend `_r0c0` for zero-padded grids ≥ 10 use `_r00c00` per row/col max.
