---
subsystem_id: g06-bucket-render
audited_at: 2026-05-20T00:00:00Z
files:
  - path: engine-gmt/engine/BucketRenderer.ts
    blob_sha: 638c33c407c88fc6ce8150a52a01c82844fa74ac
    lines_read: [1, 89]
  - path: engine-gmt/engine/GmtBucketHost.ts
    blob_sha: f63e306a09022fffe62dd884aaf078306e736200
    lines_read: [1, 280]
  - path: engine-gmt/engine/worker/WorkerExporter.ts
    blob_sha: 3ad294b7a1bc4feb7252ab54c05096430a915015
    lines_read: [1, 893]
  - path: engine-gmt/engine/worker/WorkerHistogram.ts
    blob_sha: 726f7b0f6fb236f49c49028bf8af89bdbcccc94a
    lines_read: [1, 90]
  - path: engine-gmt/engine/worker/WorkerDepthReadback.ts
    blob_sha: 57a4918d9dbed116fb7ae6e6426e396b4c64e232
    lines_read: [1, 175]
---

## Public API surface

**`BucketRenderer`** (`engine-gmt/engine/BucketRenderer.ts:27-89`) — GMT compatibility shim. Public surface mirrors the pre-extraction class:
- `init(engineRef: BucketEngineRef)` (`:31-33`) — installs engine ref on the host.
- `setBloomPass(bp: BloomPass)` (`:35-37`).
- `setDisplayRefs(scene, camera)` (`:39-41`) — for the Refine View blit.
- `start(exportImage, config, exportData?)` (`:43-54`) — wraps `exportData` into a `BucketRunnerExportData` (with `metadataJson` from `saveGMFScene(preset)`) and delegates to `runner.start(host, config, exportImage, runnerExportData)`.
- `stop()` (`:56-58`).
- `update(_gl, config)` (`:60-63`) — passes config to runner, runs one tick.
- `getIsRunning()` (`:65`), `isHoldingFinalFrame()` (`:66`), `releaseHeldFinalFrame()` (`:67`).
- `blitHeldFinalFrame()` (`:69-73`) — pulls composite texture from runner and calls `host.onTileBlitToScreen`.
- `getCurrentTilePixelSize(): [w, h]` (`:75-77`).
- `get savedPixelSizeBase(): number` (`:84-86`) — SSAA override read each frame by `FractalEngine.compute()`.
- Module singleton `bucketRenderer` (`:89`).
- Re-exports `BucketRenderConfig` (`:22`) from `engine/export/BucketRenderTypes` and `BucketEngineRef` (`:23`) from `./GmtBucketHost`.

**`GmtBucketHost implements BucketRenderHost`** (`engine-gmt/engine/GmtBucketHost.ts:38-280`) — GMT specifics behind the generic `BucketRenderHost` contract:
- `BucketEngineRef` interface (`:28-36`): `renderer`, `pipeline`, `mainUniforms`, `mainCamera`, `materials`, `resetAccumulation()`, `pipelineRender(renderer)`.
- `init(engineRef)` (`:55-57`), `setBloomPass(bp)` (`:59`), `setDisplayRefs(scene, camera)` (`:60-63`), `getSavedPixelSizeBase()` (`:70`).
- `BucketRenderHost` impl: `getRenderer()` (`:74-76`), `beginRender(outputW, outputH)` (`:78-103`), `setRenderSize(w, h)` (`:105-110`), `beginImageTile(tile, fullOutput)` (`:112-121`), `beginGpuBucket(uvRect, pixelRect)` (`:123-144`), `resetAccumulation()` (`:146-150`), `isCurrentBucketConverged(_frameCount, config)` (`:152-179`), `getOutputTexture()` (`:181-183`), `getReadbackMaterial(composite, tileSize, fullOutput)` (`:185-217`), `onTileBlitToScreen(composite)` (`:219-240`), `endRender()` (`:242-279`).

**`WorkerExporter`** (`engine-gmt/engine/worker/WorkerExporter.ts:81-893`) — video / image-sequence export driver, owned by the worker:
- Constructor takes `engine`, `renderer`, `camera`, `postMsg` (`:92-103`); allocates a `BloomPass`.
- `get active()` (`:105-107`).
- `start(config, stream | null, dirHandle?, audio?)` (`:111-298`) — branches on `formatDef.imageSequence`; builds ping-pong accum RTs, `exportTarget` (UnsignedByte), pixel buffer, fullscreen post-process pass (`createFullscreenPass(engine.materials.exportMaterial)`), Mediabunny `Output` / `VideoEncoder` / optional `AudioEncoder`. Sets `engine.state.isExporting = true`, posts `EXPORT_READY`.
- `renderFrame(frameIndex, time, cameraData, offset, renderState, modulations)` (`:302-323`) — calls `applyFrameState` once, then dispatches to `renderFrameVideo` or `renderFrameImageSequence`.
- `finish()` (`:812-849`) — drains writes / flushes encoders / finalizes container / posts `EXPORT_COMPLETE` (with `blob` for `BufferTarget`, `null` otherwise).
- `cancel()` (`:853-864`) — close encoder + cleanup; in-flight image writes are dropped.
- Worker messages emitted: `EXPORT_READY`, `EXPORT_ERROR`, `EXPORT_FRAME_DONE`, `EXPORT_COMPLETE`, `FRAME_READY` (`:297, :222, :473, :529, :654, :820, :843, :847, :580`).

**`handleHistogramReadback`** (`engine-gmt/engine/worker/WorkerHistogram.ts:43-90`) — module-singleton function with module-level pass/RT/buffer (`:14-19`). Args: `id, source: 'geometry'|'color', engine, renderer, camera, postMsg`. Posts `HISTOGRAM_RESULT` with a transferred Float32Array.

**`WorkerDepthReadback`** (`engine-gmt/engine/worker/WorkerDepthReadback.ts:24-175`):
- `tick(engine, renderer, tickCount, postMsg)` (`:41-52`).
- `startFocusPick(id, x, y)` (`:156-158`), `sampleFocusPick(id, x, y, postMsg)` (`:160-170`), `endFocusPick()` (`:172-174`). Posts `FOCUS_RESULT`.

## Architecture (10-25 bullets, file:line)

- Post-extraction split: `BucketRenderer` (89 lines) is now a thin shim over `BucketRunner` (in `engine/export/BucketRunner.ts`) + `GmtBucketHost`; the generic orchestration (image-tile loop, GPU-bucket spiral, scissor copy, readback, save) is no longer in this file (`engine-gmt/engine/BucketRenderer.ts:1-13, 27-89`).
- `BucketRenderer` owns one `BucketRunner` + one `GmtBucketHost` instance and forwards every method (`engine-gmt/engine/BucketRenderer.ts:28-29, 32-77`).
- `start()` builds `BucketRunnerExportData` by serializing the scene with `saveGMFScene(preset)`; that metadata is embedded into PNGs the runner writes (`engine-gmt/engine/BucketRenderer.ts:48-53`, depends on `utils/FormulaFormat`).
- `BucketEngineRef` (`engine-gmt/engine/GmtBucketHost.ts:28-36`) is the contract from `FractalEngine` to the bucket host: renderer + pipeline + main uniforms + camera + materials + `resetAccumulation()` + `pipelineRender(renderer)`. It is consumed only inside `GmtBucketHost`.
- `beginRender(outputW, outputH)` (`engine-gmt/engine/GmtBucketHost.ts:78-103`) snapshots viewport size + camera aspect + `uPixelSizeBase`, overrides `cam.aspect = outputW/outputH`, calls `pipeline.setBucketRendering(true)`, and seeds `uFullOutputResolution` (constant across image tiles).
- The camera-aspect override relies on `UniformManager.syncFrame` *skipping* the `cam.aspect` re-sync while `state.isBucketRendering` is true — explicitly called out in the comment (`engine-gmt/engine/GmtBucketHost.ts:90-92`).
- `setRenderSize(w, h)` (`:105-110`) is called per image tile by `BucketRunner`: resizes pipeline, updates `uResolution`, caches `currentTileSize` for convergence polling.
- `beginImageTile(tile, fullOutput)` (`:112-121`) writes per-tile UV remap uniforms (`ImageTileOrigin`, `ImageTileSize`, `TilePixelOrigin`). Each tile is one slice of full-image NDC — used by the modified `ray.ts` to keep rays in full-image space across tiles.
- `beginGpuBucket(uvRect, pixelRect)` (`:123-144`) sets `RegionMin`/`RegionMax` on the materials and applies a pipeline scissor (`pipeline.setBucketScissor`). Belt-and-braces: shader still has a `vUv` discard but scissor is the actual perf-saving mechanism (`:133-138`).
- Per-bucket accumulation reset goes through the pipeline (`engine-gmt/engine/GmtBucketHost.ts:146-150`) — keeps the engine-level accumulation identity intact; engine `resetAccumulation` only runs in `endRender()` (`:278`).
- Convergence polling is fully async: `isCurrentBucketConverged` (`:152-179`) drives a state machine of `convergenceRequested` + `cachedConvergenceResult`. Each tick polls `pipeline.pollConvergenceResult(gl)`; if null, no result yet; if `<thresholdRaw` the bucket is done. A fresh `pipeline.startAsyncConvergence(gl, min, max)` is issued whenever none is in flight.
- `convergenceThreshold` is supplied as a percent — divided by 100 inside the host (`:160`).
- Bloom routing differs from in-engine rendering: `getReadbackMaterial` (`:185-217`) chooses bloom resolution based on whether the output is upscaled relative to the viewport — bloom at viewport res when upscaled, tile res otherwise — preserving visual parity with the on-screen preview.
- `onTileBlitToScreen` (`:219-240`) renders the composite through `materials.displayMaterial` to the canvas using the externally-supplied `displayScene` + `displayCamera`, with bloom forwarded; `gl.getContext().flush()` is called to make sure the blit reaches the canvas (`:239`).
- `endRender()` (`:242-279`) is the **only** cleanup path; it reverses every uniform / size / aspect / bloom change `beginRender` made and finally calls `engine.resetAccumulation()` so the viewport resumes from a fresh frame.
- `WorkerHistogram` is a module-level singleton (`engine-gmt/engine/worker/WorkerHistogram.ts:14-19`): single 128×128 RGBA-Float32 RT, single Float32 pixel buffer, single color-luminance material. Initialized lazily on first call (`:21-41`).
- For `source === 'geometry'`, the histogram pass uses `engine.histogramMaterial`/`engine.histogramUniforms`, including `virtualSpace.updateShaderUniforms` (high/low offset split) and per-pixel camera basis derived from FOV + aspect (`engine-gmt/engine/worker/WorkerHistogram.ts:53-70`).
- For `source === 'color'`, it samples `engine.pipeline?.getOutputTexture()` through a tiny RGB→luminance shader (`fragmentShader` at `:34-36`). If no output texture, posts an empty `Float32Array(0)` (`:73-75`).
- The histogram result is transferred to the main thread as a fresh `Float32Array` copy of the pixel buffer (`:88-89`) — the persistent buffer is not transferred, so subsequent calls reuse it.
- `WorkerDepthReadback.tick` is structured as two phases plus focus pick: phase 1 polls the previous fence (`:54-86`), phase 2 issues a new readback every 3rd tick if none pending (`:48, :88-129`).
- Async PBO path (WebGL2 only): create a 1-pixel PBO at `engine.pipeline.getPreviousRenderTarget()` center, `readPixels(...)` with `RGBA + HALF_FLOAT|FLOAT`, then `fenceSync(SYNC_GPU_COMMANDS_COMPLETE)` (`engine-gmt/engine/worker/WorkerDepthReadback.ts:90-117`). Format depends on `pipeline._qualityState.bufferPrecision > 0.5` (`:96-98`).
- Half-float unpacking is inlined (sign/exponent/mantissa) at `:67-74`; full-float just reads `alpha` directly (`:77-80`). Both gate on `0 < d < MAX_SKY_DISTANCE` before writing `engine.lastMeasuredDistance`.
- Synchronous fallback (no `fenceSync`) (`:118-128`) calls `pipeline.readPixels` for a 1×1 RGBA float and writes the alpha channel. This is the path that incurs the ~40ms `glFinish` stall the file's docblock warns about (`:6-7`).
- Focus pick (`:131-174`) snapshots the entire depth buffer on the next frame, then samples it for the clicked pixel; subsequent `sampleFocusPick` reads from the cached snapshot until `endFocusPick` clears it. NDC → pixel mapping is `(x+1)*0.5*w` / `(y+1)*0.5*h` (`:147-149, :166-167`).
- `WorkerExporter` is the worker's video/image-sequence export driver — separate from `BucketRenderer` (which is the high-res-still / Refine View path). They share `engine.materials.exportMaterial`, `BloomPass`, and the post-process scene pattern, but `WorkerExporter` allocates its own ping-pong accum RTs and never goes through `BucketRunner`.
- `WorkerExporter.start` aligns output to `align = 2` (chroma-subsampling-safe) (`:131-138`), then computes `renderW/H = safe * internalScale` for the accumulation RTs. `exportTarget` is post-process resolved at `safeWidth/safeHeight` UnsignedByte for direct readback into the encoder buffer.
- Image-mode requires `dirHandle` (`:125-128`); video-mode takes optional `stream` for `StreamTarget`, falling back to `BufferTarget` (`:202-210`).
- Encoder configuration includes a `2.5× BITRATE_MULTIPLIER` to counter CBR undershoot on smooth content (`:236-247`) and `'quality' latencyMode` — the comment explicitly notes B-frame reordering is OK because of the first-chunk-offset normalization in `handleEncodedChunk`.
- Audio is encoded **once** as 1024-frame chunks (`:742-770`) after `output.start()` succeeds. AAC is `mp4a.40.2`; Opus path for `.webm`. Audio first-chunk offset is normalized the same way video is (`:783-787`).
- `renderOnePass` (`:364-436`) is the per-pass accumulation loop: clear both accum RTs, ping-pong for `N = samples`, compute Halton(2)/Halton(3) jitter at `s > 0` (`:384-390`), then run post-processing into `exportTarget`, read back pixels into `pixelBuffer`, flip Y in place (`:421-433`).
- `renderFrameVideo` (`:441-474`) calls `renderOnePass` once, does a focus-lock depth probe at the buffer centre (skipped for `pass === 'alpha'` because main shader writes binary coverage to alpha (`:447-455`)), builds a `VideoFrame` with `colorSpace: bt709`, encodes (keyframe at frame 0), and blits a centred preview to the canvas.
- `renderFrameImageSequence` (`:482-530`) loops over `config.passes`, flipping `uOutputPass` between beauty/alpha/depth, snapshotting `pixelBuffer` per pass (`:509`), then resets `uOutputPass = 0` for preview, schedules a fire-and-forget write through `imageWriteChain`.
- PNG image-mode merges beauty + alpha into a single RGBA file (alpha-pass luminance → A channel) when both are present (`:553-561`); depth always emits a separate greyscale PNG. JPG mode is one file per pass (`:570-577`).
- First-chunk PTS normalization (`handleEncodedChunk`, `:679-737`): subtracts `firstChunkOffsetMicros` from every chunk timestamp to remove Firefox's one-frame leading-latency offset (which would otherwise inflate the muxed file's duration via `mvhd`/`tkhd`). Duration is hardcoded to `1/fps` because Firefox doesn't echo the source `VideoFrame.duration`.
- Cleanup (`:868-892`) restores `engine.state.isExporting`, viewport resolution, pipeline size, `uOutputPass = 0`, renderer viewport/scissor, then `engine.resetAccumulation()`. Image-mode `cancel()` drops the session without awaiting writes — partial files stay on disk (`:861-862`).

## Invariants and gotchas

- **Camera aspect override is the host's responsibility.** `GmtBucketHost.beginRender` sets `cam.aspect = outputW/outputH`; `UniformManager.syncFrame` must skip the cam-aspect re-sync while `state.isBucketRendering` is true, otherwise the host's override is clobbered every frame (`engine-gmt/engine/GmtBucketHost.ts:90-96, 98`).
- **`uFullOutputResolution` is seeded in `beginRender` and held constant across image tiles.** `endRender` resets it to the viewport size, but in between only `beginRender` writes it (`engine-gmt/engine/GmtBucketHost.ts:101-103, 261-263`). UniformManager's normal copy from `uResolution → uFullOutputResolution` is suppressed while bucket rendering is active.
- **`savedPixelSizeBase` is *not* cleared until `endRender`.** While `>0` it forces `FractalEngine.compute()` to override `uPixelSizeBase` for SSAA — leaving it set after the run would silently mis-density the viewport. `endRender` resets to 0 (`engine-gmt/engine/GmtBucketHost.ts:47, 84-87, 277`).
- **Bucket scissor `null` reset on `endRender`.** The pipeline scissor is set per-bucket and must be cleared in cleanup (`engine-gmt/engine/GmtBucketHost.ts:138-143, 246`).
- **Region uniforms must be reset to `(0,0)`/`(1,1)` after a bucket render**, otherwise the next viewport frame's region mask discards everything outside the last bucket's UV (`engine-gmt/engine/GmtBucketHost.ts:249-250`).
- **Convergence state is per-bucket, not per-tile.** `convergenceRequested` and `cachedConvergenceResult` are reset every `beginGpuBucket` (`engine-gmt/engine/GmtBucketHost.ts:130-131`). Each bucket's first tick *issues* a request; the result is only checked on the *following* tick.
- **`config.convergenceThreshold` is a percent.** The host divides by 100 (`engine-gmt/engine/GmtBucketHost.ts:160`); callers passing the raw 0–1 value would silently never converge.
- **Bloom resolution decision branches on `fullOutput.w/h > originalSize.x/y`** — i.e. on whether the output is upscaled relative to the viewport, not on whether tiling is active. A non-tiled full-output render at viewport size uses tile-res bloom; a per-tile section of a larger output uses viewport-res bloom (`engine-gmt/engine/GmtBucketHost.ts:201-208`).
- **`exportMaterial.uniforms.uEncodeOutput = 1.0`** is always set in `getReadbackMaterial` (`engine-gmt/engine/GmtBucketHost.ts:215`); the export material's shader has both encoded and unencoded branches and the bucket path needs the encoded one for PNG.
- **`onTileBlitToScreen` calls `gl.getContext().flush()`** to force the canvas commit (`engine-gmt/engine/GmtBucketHost.ts:239`). Removing it can leave the Refine View display blank because three.js doesn't always flush after a single `render` to the default framebuffer.
- **`WorkerHistogram` color path silently no-ops when `pipeline.getOutputTexture()` is null** — posts an empty `Float32Array(0)` and returns, instead of erroring (`engine-gmt/engine/worker/WorkerHistogram.ts:73-75`). Main-thread consumer must handle this.
- **Histogram material assignment mutates `histogramPass.mesh.material` per call** (`engine-gmt/engine/worker/WorkerHistogram.ts:54, 77`). Both `engine.histogramMaterial` (geometry) and the module-local `histogramColorMaterial` (color) live in module scope — the singleton assumption breaks if multiple histograms run concurrently from the same worker.
- **`uCameraPosition` is zeroed for the histogram pass** (`engine-gmt/engine/worker/WorkerHistogram.ts:62`) because `virtualSpace.updateShaderUniforms` has already written the high/low offset split. Setting it to anything else would double-apply the camera origin.
- **Depth readback uses `engine.pipeline.getPreviousRenderTarget()` not the current one** (`engine-gmt/engine/worker/WorkerDepthReadback.ts:91, 140`). This is the just-finished ping-pong target — reading the current frame's render target would race the in-flight render.
- **PBO size depends on float format** — 8 bytes for half-float, 16 for float (`engine-gmt/engine/worker/WorkerDepthReadback.ts:103, 112`). Mismatched buffer sizes silently corrupt the readback.
- **Depth value is read from the alpha channel of the accumulation RT** — i.e. `floatBuf[3]` / `halfBuf[3]` (`engine-gmt/engine/worker/WorkerDepthReadback.ts:71, 79, 125, 150, 168`). Anything else encoded in alpha (e.g. coverage during alpha-pass export) would clobber `lastMeasuredDistance` — the export path explicitly skips the probe during alpha export, but the worker tick path doesn't gate on `uOutputPass`.
- **Synchronous fallback uses an instance `_readBuffer` of length 4** (`engine-gmt/engine/worker/WorkerDepthReadback.ts:31, 120`). Async path allocates `Uint16Array(4)` / `Float32Array(4)` per readback (`:66, :77`), trading allocations for not stomping the buffer mid-fence-wait.
- **Focus-pick `MAX_SKY_DISTANCE` gate is `< 1000`, hardcoded** (`engine-gmt/engine/worker/WorkerDepthReadback.ts:151, 169`) — inconsistent with the imported `MAX_SKY_DISTANCE` constant used for the tick path (`:75, 80, 126`). If `MAX_SKY_DISTANCE` ever changes, focus pick won't follow.
- **Half-float NaN exponent decode** — `exp === 31` returns `NaN`, which then fails `Number.isFinite(d)` and is silently dropped (`engine-gmt/engine/worker/WorkerDepthReadback.ts:73-75`).
- **WorkerExporter `lastWrite` selection** — `(N - 1) % 2 === 0 ? accumA : accumB` (`engine-gmt/engine/worker/WorkerExporter.ts:396`). Independent of any other ping-pong state — purely a function of `samples` parity.
- **First-chunk-offset normalization is per-track.** Video uses `firstChunkOffsetMicros`; audio uses `audioFirstChunkOffsetMicros` — they are *independent* because audio enters the encoder later than video and has its own priming delay (`engine-gmt/engine/worker/WorkerExporter.ts:76, 47, 704-707, 783-787`).
- **Pixel-buffer Y-flip is in-place** (`engine-gmt/engine/worker/WorkerExporter.ts:421-433`). For odd height `halfH = floor(h/2)` leaves the middle row untouched, which is correct (its own mirror).
- **`writeOneImageFile` copies pixels into a fresh `Uint8ClampedArray`** (`engine-gmt/engine/worker/WorkerExporter.ts:597-602`) — the comment notes TS 5.x shared-buffer types block the zero-copy form via `.buffer`.
- **Image-mode preview blit forces `uOutputPass = 0`** before `blitPreview` (`engine-gmt/engine/worker/WorkerExporter.ts:520-526`) so the viewport always shows beauty, even when the rendered passes were alpha/depth.
- **`config.samples >= 1` is required** — `renderOnePass` clears `accumA` then writes to it at `s=0` (`engine-gmt/engine/worker/WorkerExporter.ts:367-394`). `samples = 0` would render nothing into the export target.
- **`bitrate: config.bitrate * VIDEO_CONFIG.BITRATE_MULTIPLIER * 2.5`** stacks two multipliers (`engine-gmt/engine/worker/WorkerExporter.ts:236`). Tuning the user-facing bitrate slider requires accounting for both — and Firefox's OpenH264 Level 4.0 cap (~31 Mbps) takes precedence regardless.
- **`session.muxerChain` is initialized to `Promise.resolve()` only for video mode** (`engine-gmt/engine/worker/WorkerExporter.ts:185`); image mode initializes `imageWriteChain` instead. `finish()` awaits whichever applies (`:817-833`).
- **Cancel and finish both run `cleanup()`**, which disposes the accumulation RTs and resets engine state — calling either twice would NPE the second `dispose()` (`engine-gmt/engine/worker/WorkerExporter.ts:868-892`). `if (!this.session) return` at the top guards that.

## Drift from existing doc (dev/docs/gmt/43_Bucket_Render_Overhaul.md)

| Doc claim | Code reality | Recommendation |
|-----------|--------------|----------------|
| `engine/BucketRenderer.ts` is a ~485-line orchestrator (start/spiral/composite/save/post) (`43_Bucket_Render_Overhaul.md:19-21`) | File is now an 89-line shim (`engine-gmt/engine/BucketRenderer.ts:1-89`). Orchestration moved to `engine/export/BucketRunner.ts` (`:16-17`); GMT-specific work moved to `engine-gmt/engine/GmtBucketHost.ts` (`:18`). | Update the file references in the doc's "Current architecture" section to point at `BucketRunner` + `GmtBucketHost`. Promote the post-extraction split to a "Status" header since v1 has shipped. |
| "`bucketRenderer.start()` ... saves viewport size, multiplies by `bucketUpscale`, ... allocates one full-size Float32 composite" (`43_Bucket_Render_Overhaul.md:19`) | Sizing math lives in `BucketRunner` (not audited here); `start()` only builds export-metadata wrapper and delegates (`engine-gmt/engine/BucketRenderer.ts:43-54`). Saved viewport size lives in `GmtBucketHost.originalSize` / `originalAspect` / `savedPixelSizeBase_` (`engine-gmt/engine/GmtBucketHost.ts:45-47, 83-87`). | Rewrite this bullet against the host's `beginRender`/`endRender` save+restore lifecycle. |
| "VRAM-safety `bucketSize` (GPU tile) is unchanged" + "image-tile loop is new" (`43_Bucket_Render_Overhaul.md:72, 75-101`) | Both concepts are now present and operational: per-image-tile uniforms (`Uniforms.ImageTileOrigin`, `ImageTileSize`, `TilePixelOrigin`) are set every tile (`engine-gmt/engine/GmtBucketHost.ts:112-121`); per-bucket scissor + region uniforms are set every bucket (`:123-144`). | Mark this section as implemented; move design notes to a "Shipped" subsection. |
| Camera-aspect override is described as "we add a second branch for 'override to output aspect during bucket render'" (`43_Bucket_Render_Overhaul.md:69`) | Implemented inside `GmtBucketHost.beginRender`: `cam.aspect = outputW/outputH; cam.updateProjectionMatrix()` + dependency on `state.isBucketRendering` suppressing the per-frame re-sync (`engine-gmt/engine/GmtBucketHost.ts:84-96, 98`). | Document the runtime contract: the host owns the override, UniformManager's per-frame sync must skip while `state.isBucketRendering` is true. |
| "Refine View" button blits at viewport resolution (`43_Bucket_Render_Overhaul.md:60`) | Refine View is implemented via `onTileBlitToScreen` (`engine-gmt/engine/GmtBucketHost.ts:219-240`) routed through `BucketRenderer.blitHeldFinalFrame` (`engine-gmt/engine/BucketRenderer.ts:69-73`) using externally-supplied `displayScene`/`displayCamera`. | Add a "Refine View path" note showing the held-final-frame flow (`getCompositeTexture()` → `onTileBlitToScreen` → `gl.getContext().flush()`). |
| Async convergence polling is not mentioned at all (entire doc) | `GmtBucketHost.isCurrentBucketConverged` is a two-tick async state machine using `pipeline.startAsyncConvergence` / `pipeline.pollConvergenceResult` (`engine-gmt/engine/GmtBucketHost.ts:152-179`). | Add a section on per-bucket convergence: percent-threshold, fence-based polling, one-tick latency between issue and read. |
| `WorkerExporter` is completely outside the doc's scope (entire doc) | The video / image-sequence path lives in `engine-gmt/engine/worker/WorkerExporter.ts:81-893` — separate from the bucket path, but shares `engine.materials.exportMaterial`, `BloomPass`, and the export-pixel encoding conventions. | Add a sibling section (or cross-reference) explaining that two distinct export drivers exist: `BucketRenderer` (still / Refine View) and `WorkerExporter` (timeline video + image sequence). |
| Async depth readback / focus pick not mentioned (entire doc) | `WorkerDepthReadback` (`engine-gmt/engine/worker/WorkerDepthReadback.ts:24-175`) runs every render tick, polling the previous fence and issuing a new readback every 3rd tick. Drives `engine.lastMeasuredDistance` (DoF auto-focus). | Not in scope for *this* doc, but flag for cross-link from `02_Rendering_Internals.md` / `06_Troubleshooting_and_Quirks.md` (the ~40ms `glFinish` quirk on WebGL1). |
| Histogram path not mentioned (entire doc) | `WorkerHistogram.handleHistogramReadback` is a separate module-singleton subsystem (`engine-gmt/engine/worker/WorkerHistogram.ts:43-90`). | Not in scope for *this* doc; flag for cross-link from a "worker subsystems" overview. |
| "Filename convention: `_r0c0` vs `_row0_col0` … existing convention in `getExportFileName`" (`43_Bucket_Render_Overhaul.md:160`) | Filename logic is now inside `BucketRunner` (not in this subsystem's files). The shim only constructs `BucketRunnerExportData` with `metadataJson` from `saveGMFScene(preset)` plus `projectName` / `projectVersion` (`engine-gmt/engine/BucketRenderer.ts:48-53`). | Move filename / tiling-suffix discussion to the BucketRunner audit (likely `g??-export` or merged here as a "deferred to runner" note). |
| "Bloom at viewport resolution when output is upscaled, otherwise at tile composite resolution" — described as a future option (b) (`43_Bucket_Render_Overhaul.md:111`) | Shipped: `getReadbackMaterial` branches on `fullOutput.w/h > originalSize.x/y` (`engine-gmt/engine/GmtBucketHost.ts:201-208`). | Promote option (b) to "Shipped"; remove the "feasible; recommend as v2" wording. |
| `uPixelSizeBase` SSAA override (entire doc) | Lives in this file: `savedPixelSizeBase_` is captured in `beginRender` (`:87`), read every frame by `FractalEngine.compute()` via `getSavedPixelSizeBase()` (`:70`), restored to 0 in `endRender` (`:277`). | Add a paragraph on the SSAA override mechanism — it's a load-bearing piece of the bucket pipeline that the doc never describes. |

## Open questions

- Orphan-sweep candidate: engine-gmt/engine/BucketRenderer.ts — keep (`bucketRenderer` singleton at `:89` is consumed by the worker hot path).
- Orphan-sweep candidate: engine-gmt/engine/GmtBucketHost.ts — keep (implements the generic `BucketRenderHost` contract; only loader for `BucketRunner` in the GMT app).
- Orphan-sweep candidate: engine-gmt/engine/worker/WorkerExporter.ts — keep (sole video/image-sequence export path; `engine.state.isExporting` gate at `:295` and `EXPORT_*` worker protocol show clear callers).
- Orphan-sweep candidate: engine-gmt/engine/worker/WorkerHistogram.ts — verify a `HISTOGRAM_READBACK` message handler still exists in `renderWorker.ts` and a histogram-consuming UI panel is mounted; module-singleton state with no callers anywhere would be dead. (Out of audit scope to confirm — flag for follow-up.)
- Orphan-sweep candidate: engine-gmt/engine/worker/WorkerDepthReadback.ts — keep (drives `engine.lastMeasuredDistance` used by DoF auto-focus, and `FOCUS_RESULT` is the click-to-focus reply path).
- Is `MAX_SKY_DISTANCE` (currently used at `WorkerDepthReadback:75, 80, 126`) intended to also gate focus-pick? The focus-pick paths hardcode `< 1000` (`:151, :169`) — divergence is real and silent.
- Should `WorkerHistogram`'s module-singleton state move onto a class so a future multi-histogram UI (geometry + color side-by-side) is supportable without re-introducing race bugs? The mesh.material reassignment at `:54, :77` is the failure point.
- The `2.5×` multiplier stacked on `VIDEO_CONFIG.BITRATE_MULTIPLIER` (`WorkerExporter:236`) deserves a dedicated paragraph in the troubleshooting doc — it's load-bearing for Chrome/Firefox bitrate-target parity but invisible in the UI.
