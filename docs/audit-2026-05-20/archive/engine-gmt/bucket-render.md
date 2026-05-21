---
source: engine-gmt/engine/worker/WorkerExporter.ts
lines: 893
last_verified_sha: 3ad294b7a1bc4feb7252ab54c05096430a915015
additional_sources:
  - engine-gmt/engine/BucketRenderer.ts
  - engine-gmt/engine/GmtBucketHost.ts
  - engine-gmt/engine/worker/WorkerHistogram.ts
  - engine-gmt/engine/worker/WorkerDepthReadback.ts
audited: 2026-05-20T09:16:29Z
audited_by: claude-opus-4-7
public_api:
  - BucketRenderer
  - bucketRenderer
  - BucketRenderConfig
  - BucketEngineRef
  - GmtBucketHost
  - WorkerExporter
  - ExportPostFn
  - handleHistogramReadback
  - WorkerDepthReadback
depends_on:
  - e05-render-pipeline
  - e11-worker-contract
  - g01-renderer
---

# Bucket Render, Export, and Worker Readback (engine-gmt)

This module covers the GMT-side machinery that drives high-resolution still export
("bucket render" / Refine View), timeline video + image-sequence export, and the
two read-from-GPU worker subsystems (depth probe, histogram). The five files are
sibling consumers of the same worker, the same `engine.materials`, and the same
`BloomPass` pattern; they were grouped because they all live on the engine-gmt
side of the worker boundary and all reach back into `RenderPipeline` for some
flavour of "render into a target, read it back out."

## Public API

| Symbol | File | Lines | Role |
|--------|------|-------|------|
| `BucketRenderer` class | `engine-gmt/engine/BucketRenderer.ts` | 27-87 | Compatibility shim over the generic `BucketRunner`. |
| `bucketRenderer` singleton | `engine-gmt/engine/BucketRenderer.ts` | 89 | The module-level instance consumed by the worker hot path. |
| `BucketRenderConfig` (re-export) | `engine-gmt/engine/BucketRenderer.ts` | 22 | Re-exported from `engine/export/BucketRenderTypes`. |
| `BucketEngineRef` (re-export) | `engine-gmt/engine/BucketRenderer.ts` | 23 | Re-exported from `./GmtBucketHost`. |
| `BucketEngineRef` interface | `engine-gmt/engine/GmtBucketHost.ts` | 28-36 | Contract from `FractalEngine` to the bucket host. |
| `GmtBucketHost` class | `engine-gmt/engine/GmtBucketHost.ts` | 38-280 | `BucketRenderHost` impl: aspect/size/bloom save+restore, async convergence polling, Refine View blit. |
| `WorkerExporter` class | `engine-gmt/engine/worker/WorkerExporter.ts` | 81-893 | Video / image-sequence export driver, owns its own accumulation RTs. |
| `ExportPostFn` type | `engine-gmt/engine/worker/WorkerExporter.ts` | 79 | Worker `postMessage` shape WorkerExporter uses. |
| `handleHistogramReadback` | `engine-gmt/engine/worker/WorkerHistogram.ts` | 43-90 | Module-singleton histogram readback function. |
| `WorkerDepthReadback` class | `engine-gmt/engine/worker/WorkerDepthReadback.ts` | 24-175 | Async PBO depth readback + DoF focus-pick state machine. |

`BucketRenderer` forwards every public method to one `BucketRunner` plus one
`GmtBucketHost` (`engine-gmt/engine/BucketRenderer.ts:28-29, 31-77`). The shim
exists so `FractalEngine`, `renderWorker`, and the `handleRenderTick` path can
keep importing `bucketRenderer` by its pre-extraction name
(`engine-gmt/engine/BucketRenderer.ts:1-13`).

## Architecture

### Bucket render pipeline (still / Refine View)

- Post-extraction split. The 89-line `BucketRenderer` is now a thin shim; the
  generic image-tile loop, GPU-bucket spiral, scissor copy, readback, and save
  all live in `BucketRunner` (`engine/export/BucketRunner.ts`), and the
  GMT-specific work lives in `GmtBucketHost`
  (`engine-gmt/engine/BucketRenderer.ts:1-13, 27-89`).
- `start()` serializes the scene via `saveGMFScene(preset)` and wraps it into a
  `BucketRunnerExportData` whose `metadataJson` is embedded into each saved
  PNG; the shim only builds the metadata and delegates
  (`engine-gmt/engine/BucketRenderer.ts:43-54`).
- `beginRender(outputW, outputH)` snapshots viewport size, camera aspect, and
  `uPixelSizeBase`, overrides `cam.aspect = outputW/outputH`, toggles
  `pipeline.setBucketRendering(true)`, and seeds
  `uFullOutputResolution` (constant across image tiles)
  (`engine-gmt/engine/GmtBucketHost.ts:78-103`).
- The aspect override relies on `UniformManager.syncFrame` skipping the
  `cam.aspect` re-sync while `state.isBucketRendering` is true — the host
  comment calls this out explicitly
  (`engine-gmt/engine/GmtBucketHost.ts:89-96`).
- Per-image-tile setup (`beginImageTile`) writes the
  `ImageTileOrigin` / `ImageTileSize` / `TilePixelOrigin` uniforms; these are
  the no-op-default uniforms the modified `ray.ts` reads to keep primary rays
  in full-image NDC across tiles
  (`engine-gmt/engine/GmtBucketHost.ts:112-121`).
- Per-GPU-bucket setup (`beginGpuBucket`) sets `RegionMin` / `RegionMax` on the
  materials, caches the bucket UV for convergence polling, and applies a
  pipeline scissor over the bucket pixel rect. The shader still has a
  `vUv`-based discard, but scissor is the actual perf-saving mechanism — the
  discard still costs a history fetch + MRT write per pixel
  (`engine-gmt/engine/GmtBucketHost.ts:123-144`).
- Per-bucket accumulation reset goes through the pipeline; engine-level
  `resetAccumulation` is reserved for `endRender` cleanup so the viewport
  resumes from a fresh frame
  (`engine-gmt/engine/GmtBucketHost.ts:146-150, 278`).
- Async convergence polling. `isCurrentBucketConverged` runs a two-tick state
  machine: poll the pending fence first (returning true if `result < threshold`),
  otherwise issue a fresh `pipeline.startAsyncConvergence`. The threshold is
  a percent — the host divides by 100
  (`engine-gmt/engine/GmtBucketHost.ts:152-179`).
- Bloom routing branches on whether the output is upscaled relative to the
  viewport: viewport-res bloom when upscaled (matches on-screen preview),
  tile-res bloom otherwise. `exportMaterial.uEncodeOutput` is always set to
  `1.0` for the bucket readback path
  (`engine-gmt/engine/GmtBucketHost.ts:185-217`).
- Refine View blit. `onTileBlitToScreen` renders the composite through
  `materials.displayMaterial` to the canvas using the externally-supplied
  display scene/camera, then calls `gl.getContext().flush()` — three.js doesn't
  always flush after a single render to the default framebuffer, and removing
  the flush can leave the canvas blank
  (`engine-gmt/engine/GmtBucketHost.ts:219-240`).
- `endRender` is the only cleanup path. It clears the scissor, resets the
  region + image-tile uniforms, restores pipeline size, resolution, aspect,
  bloom dimensions, then clears `savedPixelSizeBase_` and calls
  `engine.resetAccumulation()`
  (`engine-gmt/engine/GmtBucketHost.ts:242-279`).
- SSAA override. `savedPixelSizeBase_` is captured at `beginRender` (line 87),
  exposed via `getSavedPixelSizeBase()` (line 70) so `FractalEngine.compute()`
  can override `uPixelSizeBase` per frame, and zeroed in `endRender` (line 277)
  (`engine-gmt/engine/GmtBucketHost.ts:70, 78-103, 242-279`).

### Video / image-sequence export (WorkerExporter)

- Separate driver from `BucketRenderer`. They share `engine.materials.exportMaterial`,
  the `BloomPass`, and the post-process fullscreen-pass pattern, but
  `WorkerExporter` allocates its own ping-pong accumulation RTs and never goes
  through `BucketRunner`
  (`engine-gmt/engine/worker/WorkerExporter.ts:81-103, 111-298`).
- `start()` aligns the output to a 2-px boundary (chroma-subsampling safe),
  then computes `renderW/H = safe * internalScale` for the accumulation RTs.
  `exportTarget` is `UnsignedByte` at `safeWidth × safeHeight` for direct
  readback into the encoder buffer
  (`engine-gmt/engine/worker/WorkerExporter.ts:130-167`).
- Image mode requires `dirHandle`; video mode takes an optional `stream` for
  `Mediabunny.StreamTarget` and falls back to `BufferTarget`
  (`engine-gmt/engine/worker/WorkerExporter.ts:125-128, 202-210`).
- Encoder config is `latencyMode: 'quality'` (B-frames OK because of the
  per-track first-chunk PTS normalization later), `bitrateMode: 'constant'`,
  and an encoder bitrate of
  `config.bitrate * VIDEO_CONFIG.BITRATE_MULTIPLIER * 2.5`. The two factors do
  different jobs: `BITRATE_MULTIPLIER` is the Mbps→bps unit conversion, the
  `2.5×` is a content-specific CBR-undershoot correction documented in the
  in-source comment block
  (`engine-gmt/engine/worker/WorkerExporter.ts:226-249`).
- Audio path. When the timeline carries clips, AAC (`mp4a.40.2`) for MP4 or
  Opus for WebM. Audio is encoded once in 1024-frame interleaved-stereo
  chunks after `output.start()` succeeds; the same first-chunk-offset
  normalization the video path uses is applied independently to audio
  (`engine-gmt/engine/worker/WorkerExporter.ts:252-276, 711-770, 772-808`).
- `renderFrame` is the entry point. It calls `applyFrameState` once for the
  whole frame (camera, offset, scene uniforms — invariant across passes), then
  dispatches to `renderFrameVideo` or `renderFrameImageSequence`
  (`engine-gmt/engine/worker/WorkerExporter.ts:302-323, 329-357`).
- `renderOnePass` clears both accum RTs, runs `N = samples` ping-pong steps with
  Halton(2) / Halton(3) jitter at `s > 0`, applies bloom on beauty only (alpha
  and depth passes write greyscale luminance to the alpha channel and bloom
  would smear it), post-processes into `exportTarget`, reads back to
  `pixelBuffer`, and flips Y in place
  (`engine-gmt/engine/worker/WorkerExporter.ts:364-436`).
- Video frame path. `renderFrameVideo` calls `renderOnePass`, does a centre-pixel
  depth probe (skipped during the alpha pass because the alpha channel holds
  binary coverage), builds a `VideoFrame` with `colorSpace: bt709`, and encodes
  with a keyframe at frame 0
  (`engine-gmt/engine/worker/WorkerExporter.ts:441-474`).
- Image-sequence path. `renderFrameImageSequence` loops over `config.passes`,
  flips `uOutputPass` between beauty (0) / alpha (1) / depth (2), snapshots
  `pixelBuffer` per pass into a `Map`, then resets `uOutputPass = 0` before
  the preview blit so the viewport always shows beauty
  (`engine-gmt/engine/worker/WorkerExporter.ts:482-530`).
- PNG image-mode merges beauty + alpha into a single RGBA file
  (alpha-pass luminance → alpha channel) when both are present; depth always
  emits a separate greyscale file. JPG mode is one file per selected pass
  (`engine-gmt/engine/worker/WorkerExporter.ts:545-577`).
- Per-frame file I/O is fire-and-forget via `imageWriteChain` so the next
  frame's GPU work overlaps with disk I/O; `finish()` and `cancel()` both
  await whichever chain applies
  (`engine-gmt/engine/worker/WorkerExporter.ts:515-517, 812-849`).
- First-chunk PTS normalization (`handleEncodedChunk`) subtracts the very first
  chunk's timestamp from every subsequent chunk so the muxed track starts at
  PTS 0. This undoes Firefox's one-frame leading-latency offset (which would
  otherwise inflate the file's `mvhd` / `tkhd` duration); on Chrome the offset
  is 0 and the subtraction is a no-op. Duration is hardcoded to `1/fps`
  because Firefox does not echo the source `VideoFrame.duration`
  (`engine-gmt/engine/worker/WorkerExporter.ts:679-737`).
- Worker messages emitted: `EXPORT_READY`, `EXPORT_ERROR`,
  `EXPORT_FRAME_DONE`, `EXPORT_COMPLETE`, `FRAME_READY`
  (`engine-gmt/engine/worker/WorkerExporter.ts:297, 222, 473, 529, 821, 843, 847, 654`).

### Depth readback + DoF focus pick (WorkerDepthReadback)

- `tick()` runs every render tick after the display blit. Phase 1 polls the
  previous fence; phase 2 issues a new async readback every 3rd tick if none
  is pending; finally the focus-pick state machine is advanced
  (`engine-gmt/engine/worker/WorkerDepthReadback.ts:41-52`).
- Async PBO path (WebGL2 only). Create a 1-pixel PBO at
  `pipeline.getPreviousRenderTarget()` centre, `readPixels(...)` with
  `RGBA + HALF_FLOAT|FLOAT` (format chosen by
  `pipeline._qualityState.bufferPrecision > 0.5`), then
  `fenceSync(SYNC_GPU_COMMANDS_COMPLETE)`
  (`engine-gmt/engine/worker/WorkerDepthReadback.ts:90-117`).
- Half-float unpacking is inlined (sign/exponent/mantissa) at lines 67-74;
  full-float reads alpha directly at lines 77-80. Both gate on
  `0 < d < MAX_SKY_DISTANCE && Number.isFinite(d)` before writing
  `engine.lastMeasuredDistance`
  (`engine-gmt/engine/worker/WorkerDepthReadback.ts:56-86`).
- Synchronous fallback (no `fenceSync`) calls `pipeline.readPixels(...)` for a
  1×1 RGBA float and writes the alpha channel. This is the path that incurs
  the ~40ms `glFinish` stall the file's docblock warns about
  (`engine-gmt/engine/worker/WorkerDepthReadback.ts:1-10, 118-128`).
- Focus pick is a three-phase state machine: `pending` (set by
  `startFocusPick`) → on the next tick the entire depth buffer is snapshotted,
  the clicked pixel is read, `FOCUS_RESULT` is posted, and the state moves
  to `ready` → subsequent `sampleFocusPick` reads from the cached snapshot
  until `endFocusPick` clears it
  (`engine-gmt/engine/worker/WorkerDepthReadback.ts:131-174`).
- NDC → pixel mapping for focus pick is `(x+1)*0.5*w` / `(y+1)*0.5*h`, clamped
  to valid pixel range
  (`engine-gmt/engine/worker/WorkerDepthReadback.ts:147-149, 166-167`).

### Histogram readback (WorkerHistogram)

- Module-singleton state: one 128×128 RGBA-Float32 RT, one `Float32Array`
  pixel buffer, one RGB→luminance shader material, lazily initialized on
  first call
  (`engine-gmt/engine/worker/WorkerHistogram.ts:14-19, 21-41`).
- Geometry source path uses `engine.histogramMaterial` /
  `engine.histogramUniforms`, calls `virtualSpace.updateShaderUniforms`
  (high/low offset split), zeros `uCameraPosition` (the offset split has
  already written the camera origin), and derives per-pixel basis vectors
  from FOV + aspect
  (`engine-gmt/engine/worker/WorkerHistogram.ts:53-70`).
- Color source path samples `engine.pipeline?.getOutputTexture()` through a
  tiny RGB → luminance fragment shader; if the output texture is `null`,
  posts an empty `Float32Array(0)` and returns
  (`engine-gmt/engine/worker/WorkerHistogram.ts:71-79`).
- The result is transferred as a fresh `Float32Array` copy of the persistent
  buffer (the buffer itself is reused across calls)
  (`engine-gmt/engine/worker/WorkerHistogram.ts:88-89`).

## Invariants

| Invariant | Where enforced |
|-----------|----------------|
| Camera aspect override is the host's job; `UniformManager.syncFrame` must skip `cam.aspect` while `state.isBucketRendering` is true. | `engine-gmt/engine/GmtBucketHost.ts:89-96` |
| `uFullOutputResolution` is seeded once in `beginRender` and held constant across image tiles; only reset in `endRender`. | `engine-gmt/engine/GmtBucketHost.ts:100-103, 262-263` |
| `savedPixelSizeBase_` must be cleared in `endRender`; while >0 it forces `FractalEngine.compute()` to override `uPixelSizeBase`. | `engine-gmt/engine/GmtBucketHost.ts:87, 277` |
| Pipeline scissor and region uniforms must both be reset on `endRender`, otherwise the next viewport frame's region mask discards everything outside the last bucket. | `engine-gmt/engine/GmtBucketHost.ts:138-143, 246, 249-250` |
| Convergence state is per-GPU-bucket, not per-image-tile; `convergenceRequested` and `cachedConvergenceResult` reset every `beginGpuBucket`. | `engine-gmt/engine/GmtBucketHost.ts:130-131, 152-179` |
| `config.convergenceThreshold` is a percent; the host divides by 100. Callers passing raw 0–1 would silently never converge. | `engine-gmt/engine/GmtBucketHost.ts:160` |
| Bloom resolution branches on `fullOutput > originalSize` (output-upscaled), not on whether tiling is active. | `engine-gmt/engine/GmtBucketHost.ts:201-208` |
| `exportMaterial.uEncodeOutput = 1.0` is mandatory for the bucket readback path (the export material's shader has both encoded and unencoded branches). | `engine-gmt/engine/GmtBucketHost.ts:215` |
| `onTileBlitToScreen` must call `gl.getContext().flush()`; three.js doesn't always flush after a single render to the default framebuffer. | `engine-gmt/engine/GmtBucketHost.ts:239` |
| `WorkerExporter.config.samples >= 1` is required; `renderOnePass` clears `accumA` then writes to it at `s=0`. | `engine-gmt/engine/worker/WorkerExporter.ts:367-394` |
| Pixel-buffer Y-flip is in place; for odd height `halfH = floor(h/2)` correctly leaves the middle row untouched (it is its own mirror). | `engine-gmt/engine/worker/WorkerExporter.ts:421-433` |
| Image-mode preview blit must force `uOutputPass = 0` before `blitPreview` so the viewport always shows beauty even when the rendered passes were alpha/depth. | `engine-gmt/engine/worker/WorkerExporter.ts:519-526` |
| First-chunk-offset normalization is per-track; video and audio offsets are independent because audio enters the encoder later and has its own priming delay. | `engine-gmt/engine/worker/WorkerExporter.ts:704-707, 783-787` |
| Encoder bitrate stacks `BITRATE_MULTIPLIER × 2.5`; tuning the user-facing slider requires accounting for both, plus the Firefox OpenH264 Level-4.0 ~31 Mbps cap. | `engine-gmt/engine/worker/WorkerExporter.ts:230-247` |
| `cleanup()` is one-shot — `if (!this.session) return` at the top is what makes `cancel()` and `finish()` both safe to call. | `engine-gmt/engine/worker/WorkerExporter.ts:868-892` |
| Depth readback uses `pipeline.getPreviousRenderTarget()`, not the current one — reading the in-flight render target would race the active render. | `engine-gmt/engine/worker/WorkerDepthReadback.ts:91, 140` |
| PBO size depends on the float format — 8 bytes for half-float, 16 bytes for float. Mismatched sizes silently corrupt the readback. | `engine-gmt/engine/worker/WorkerDepthReadback.ts:103, 112` |
| Depth is read from the alpha channel of the accumulation RT. Anything else in alpha (e.g. coverage during alpha-pass export) would clobber `lastMeasuredDistance`. The export path explicitly skips the probe during alpha export, but the worker tick path does not gate on `uOutputPass`. | `engine-gmt/engine/worker/WorkerDepthReadback.ts:71, 79, 125, 150, 168`; `engine-gmt/engine/worker/WorkerExporter.ts:447-455` |
| Histogram color path silently no-ops (posts `Float32Array(0)`) when `pipeline.getOutputTexture()` is null. Main-thread consumer must handle this. | `engine-gmt/engine/worker/WorkerHistogram.ts:71-75` |
| `histogramPass.mesh.material` reassignment is per-call; the module-singleton assumption breaks if multiple histograms run concurrently from the same worker. | `engine-gmt/engine/worker/WorkerHistogram.ts:54, 77` |
| Histogram geometry path must zero `uCameraPosition`; `virtualSpace.updateShaderUniforms` has already written the high/low offset split. | `engine-gmt/engine/worker/WorkerHistogram.ts:62` |

## Interactions with other subsystems

- `e05-render-pipeline`. `GmtBucketHost` is the GMT consumer of the pipeline's
  bucket API: `setBucketRendering(true)` toggle at `beginRender`
  (line 98), `setBucketScissor` per bucket in `beginGpuBucket`
  (lines 138-143), `resetAccumulation()` per bucket (lines 146-150), and
  `startAsyncConvergence` / `pollConvergenceResult` polled in
  `isCurrentBucketConverged` (lines 152-179). `WorkerDepthReadback` reaches
  into `pipeline.getPreviousRenderTarget()` / `pipeline.readPixels` for both
  the async PBO path and the sync fallback
  (`engine-gmt/engine/worker/WorkerDepthReadback.ts:91, 123, 145`). See
  followup `plans/doc-audit-state/survey/_followups/q-036.md` for the
  confirmation that this subsystem owns the pipeline-bucket-API call sites.
- `e11-worker-contract`. `WorkerExporter` emits `EXPORT_READY`,
  `EXPORT_ERROR`, `EXPORT_FRAME_DONE`, `EXPORT_COMPLETE`, and `FRAME_READY`
  (`engine-gmt/engine/worker/WorkerExporter.ts:297, 222, 473, 529, 654, 821,
  843, 847`). `WorkerHistogram` emits `HISTOGRAM_RESULT` with a transferred
  `Float32Array` (`engine-gmt/engine/worker/WorkerHistogram.ts:74, 89`).
  `WorkerDepthReadback` emits `FOCUS_RESULT` from
  `_tickFocusPick` and `sampleFocusPick`
  (`engine-gmt/engine/worker/WorkerDepthReadback.ts:151, 162, 169`).
- `g01-renderer`. `BucketEngineRef` is the contract from `FractalEngine` into
  the bucket host: renderer + pipeline + main uniforms + camera + materials
  + `resetAccumulation()` + `pipelineRender(renderer)`
  (`engine-gmt/engine/GmtBucketHost.ts:28-36`). `WorkerExporter` reads
  `engine.materials.exportMaterial`, `engine.materials.displayMaterial`,
  `engine.virtualSpace`, `engine.lastMeasuredDistance`,
  `engine.state.isExporting`, and `engine.sceneCtrl` directly
  (`engine-gmt/engine/worker/WorkerExporter.ts:142-143, 295, 339-356,
  411-412, 452-454, 637-650, 877-882`). `WorkerHistogram` reads
  `engine.histogramMaterial`, `engine.histogramUniforms`,
  `engine.virtualSpace`, and `engine.pipeline.getOutputTexture()`
  (`engine-gmt/engine/worker/WorkerHistogram.ts:54-78`).
- `BucketRunner` (sibling `engine/export/`). `BucketRenderer.start()` builds
  a `BucketRunnerExportData` whose `metadataJson` comes from
  `saveGMFScene(preset)` and forwards everything else to the runner
  (`engine-gmt/engine/BucketRenderer.ts:43-54`). The runner is not part of
  this subsystem; filename / tiling-suffix conventions live there.

## Known issues / Phase 2 carry-in

### q-112 — `MAX_SKY_DISTANCE` vs hardcoded `< 1000` divergence — _FIXED 2026-05-20_

Originally a production bug: `WorkerDepthReadback` had two sky-vs-surface
filters that had drifted to different thresholds — the auto-readback path
gated on `d < MAX_SKY_DISTANCE` (50.0, from `data/constants.ts:26`)
(`engine-gmt/engine/worker/WorkerDepthReadback.ts:75, 80, 126`), while the
focus-pick path hardcoded `< 1000` inline at lines 151 and 169. Both branches
answer the same "is this a sky hit on the alpha-channel sentinel?" question;
the `< 1000` literal predated `MAX_SKY_DISTANCE` being lowered to 50.0.

**Fixed 2026-05-20**: both `< 1000` literals at
`engine-gmt/engine/worker/WorkerDepthReadback.ts:151, 169` now use
`< MAX_SKY_DISTANCE` (the constant was already imported by the file). See
`plans/doc-audit-state/survey/_followups/q-112.md` for the original analysis.

### q-114 — `2.5×` bitrate multiplier undocumented in troubleshooting (doc gap)

`WorkerExporter` configures the encoder with
`config.bitrate * VIDEO_CONFIG.BITRATE_MULTIPLIER * 2.5`
(`engine-gmt/engine/worker/WorkerExporter.ts:236`). `BITRATE_MULTIPLIER` is the
Mbps→bps unit conversion (`data/constants.ts`); the `2.5×` is a content-specific
CBR-undershoot correction documented only in the in-source comment block at
`engine-gmt/engine/worker/WorkerExporter.ts:230-235`. The main-thread encoder
path duplicates the same expression at `engine/export/videoEncoder.ts:114` and
re-states the contract in its JSDoc at `engine/export/videoEncoder.ts:27-28`,
but the capability probe at `engine/export/videoEncoder.ts:54` deliberately
omits the `2.5×` (capability tests use the raw unit-converted value).

Today the only user-facing surface of the multiplier is
`RenderPopup.tsx`'s `isFirefoxH264BitrateCapped` notice at ~12 Mbps — which is
itself derived from the `2.5×` (12 × 2.5 ≈ 30 Mbps, under the OpenH264 ~31 Mbps
cap). A dedicated paragraph in `docs/gmt/06_Troubleshooting_and_Quirks.md` near
the existing Firefox-cap entry would consolidate the three scattered comment
blocks. Any future change to the `2.5×` factor needs to land in both encoder
sites plus the JSDoc plus the 12 Mbps RenderPopup threshold simultaneously.
See `plans/doc-audit-state/survey/_followups/q-114.md` for the full analysis.

### Pending followups

- One pending followup (q-113) is unresolved at audit time. This module doc is
  defensively skipping it; any invariants or claims it adds will need to land
  on top of this doc once the followup is answered.

### Smaller carry-in

- Half-float NaN decode (`exp === 31`) returns `NaN` and is silently dropped
  by the `Number.isFinite(d)` guard
  (`engine-gmt/engine/worker/WorkerDepthReadback.ts:73, 75`). Behaviour is
  correct (NaN should not update auto-focus), but the silent drop is worth
  knowing when diagnosing why DoF "sticks" on certain frames.
- `WorkerHistogram`'s module-singleton state would race if a future
  geometry-and-color side-by-side UI ran two histograms concurrently from the
  same worker; the `histogramPass.mesh.material` reassignment at lines 54 and
  77 is the failure point.
- `BucketRenderer.update()` ignores the `_gl` argument
  (`engine-gmt/engine/BucketRenderer.ts:60-63`); the renderer is sourced from
  the host's engine ref.

## Historical context

This module doc supersedes `docs/gmt/43_Bucket_Render_Overhaul.md`, which was
written 2026-04-20 as a draft design plan ("Draft plan | 2026-04-20" —
`docs/gmt/43_Bucket_Render_Overhaul.md:3`) before extraction and shipped well
past the original scope. The pre-extraction `engine/BucketRenderer.ts` it
references as a ~485-line orchestrator no longer exists in this form: the
89-line file at `engine-gmt/engine/BucketRenderer.ts` is now a compatibility
shim, the orchestration lives in `engine/export/BucketRunner.ts`, and the
GMT-specific bits live in `engine-gmt/engine/GmtBucketHost.ts`. The bloom
"option (b)" the original described as "feasible; recommend as v2" has
shipped — `getReadbackMaterial` branches on whether the output is upscaled
relative to the viewport
(`engine-gmt/engine/GmtBucketHost.ts:201-208`).

Preservable signal from the original (retained because the conceptual
framework still describes the shipped system):

- **Two-distinct-concepts terminology.** From the original at
  `docs/gmt/43_Bucket_Render_Overhaul.md:29-32`:
  > "**Bucket** = internal GPU tile for VRAM safety (128–512 px). Lives
  > entirely inside the worker; user cares about it only as a memory knob.
  > **Image tile (new)** = an output sub-image that gets saved as its own PNG.
  > … An image tile contains many buckets. The bucket loop is unchanged — we
  > wrap it in an outer 'for each image tile' loop."
  This vocabulary is load-bearing in the shipped code: `beginImageTile` vs
  `beginGpuBucket` are the two distinct lifecycle hooks
  (`engine-gmt/engine/GmtBucketHost.ts:112-121, 123-144`).
- **UV-remap shader change with no-op defaults** — forward-compatible rollout.
  The shipped uniforms `Uniforms.ImageTileOrigin`, `Uniforms.ImageTileSize`,
  `Uniforms.TilePixelOrigin` are reset to `(0,0)` / `(1,1)` / `(0,0)` on
  `endRender` and re-seeded per image tile
  (`engine-gmt/engine/GmtBucketHost.ts:112-121, 252-257`).
- **Output-aspect-vs-canvas-aspect distinction** — the camera basis stays
  configured for full output aspect (not per-tile) so UV-remapped rays remain
  geometrically consistent across tiles. The `cam.aspect = outputW/outputH`
  override during bucket render is the realization of that decision
  (`engine-gmt/engine/GmtBucketHost.ts:89-96`).
- **Bloom resolution decision.** The original's v2 "bloom from viewport when
  output is upscaled" sampling design — preserves spatial continuity for
  free — shipped in `getReadbackMaterial`
  (`engine-gmt/engine/GmtBucketHost.ts:201-208`).
- **Per-tile VRAM safety** via `bucketSize` is unchanged at the host level;
  the GPU tile lives entirely inside the worker as a memory knob.

Other content of the original draft — print-size presets at 300DPI
(A3/A2/A1), per-tile VRAM warning thresholds, the seam-handling matrix,
filename `_r0c0` conventions, and the staged rollout — has either landed in
sibling subsystems (`BucketRunner`, `BucketRenderControls`) or has shipped
without modification; consult the live code there for current behaviour.
The `Refine View` button described at
`docs/gmt/43_Bucket_Render_Overhaul.md:60` is implemented as the
`onTileBlitToScreen` path routed through `BucketRenderer.blitHeldFinalFrame`
(`engine-gmt/engine/GmtBucketHost.ts:219-240`,
`engine-gmt/engine/BucketRenderer.ts:69-73`).
