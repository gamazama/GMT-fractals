# GMT systems vs the deep zoomer - rendering out and animating

Reader: render-export-anim, 2026-10-07. Read-only pass, about 12 minutes. Verdict words: AS-IS,
ADAPTER, REWORK, NOT-NOW. Every code statement names the file and symbol I opened; the last
section lists what I did not open.

## 0. The short answer

Nothing in this area has to be reworked before the deep zoomer can use it. The engine already has
the three contracts a foreign renderer plugs into, and fluid-toy (a non-three.js, main-thread
renderer) already plugs into all three:

1. `AccumulationController` (`engine/AccumulationController.ts`) - sample counter, pause, sample cap, reset.
2. `BucketRenderController` (`engine/plugins/topbar/BucketRenderController.ts`) - the high-res still panel.
3. `RenderDialogRunner` (`engine/plugins/RenderDialog/types.ts`) - the video render dialog.

What IS missing sits in the renderer module (render one frame to memory, pause, a settable sample
target, progress events - the blueprint's H4 / K3 / H3), not in GMT. The blueprint's line "PauseControls /
BucketRender: not used ... They drive `isPaused` / `sampleCap` and a three.js tiled renderer"
(BLUEPRINT.md, plugin table) is half wrong: only `BucketRunner` is three.js-bound. The panel, the
pause button and the sample counter are not, and the owner asked for as many native plugins as possible.

Two small engine reworks are worth doing because the alternative is a third copy of code two apps
already duplicate (section 3, R1 and R2). One larger one is optional and can wait (R3).

## 1. Facts

### 1.1 Accumulation state and its UI (generic already)

- `store/slices/renderControlSlice.ts` holds `isPaused: false`, `sampleCap: 64`, `accumulationCount: 0`,
  `activeRenderSampleCap: null`, with `reportAccumulation(count)` (equality-gated:
  `if (get().accumulationCount === count) return;`).
- `engine/AccumulationController.ts`, interface `AccumulationController`: `accumulationCount` (read),
  `convergenceValue` (read; "Renderers without one may always return 1"), `isPaused` (settable),
  `setPreviewSampleCap(n)`, `resetAccumulation()`. Its own JSDoc: "generic protocol for any renderer
  that accumulates samples over multiple frames".
- `store/slices/installAccumulationBindings.ts`, `installAccumulationBindings(store, controller)`:
  subscribes `isPaused` and `sampleCap` and forwards them to the controller. It does NOT report the
  count ("That side is owned by the renderer's tick driver") - `reportAccumulationToStore` is the helper.
  Reset arrives on the event bus: "`FRACTAL_EVENTS.RESET_ACCUM` -> renderer-side listener ->
  `controller.resetAccumulation()`".
- `engine/plugins/topbar/PauseControls.tsx`, `PauseControls`: reads only `isPaused`, `sampleCap`,
  `accumulationCount`, `activeRenderSampleCap` from the engine store plus `selectIsGlobalInteraction`
  and the animation store's `isCameraInteracting` / `isScrubbing`. "Zero GMT imports". Shows a fill
  bar `accumCount / effectiveCap` and a slider `label="Auto-Stop (Samples)" min={0} max={4096} step={32}`,
  0 shown as `Infinite`.
- `engine/plugins/topbar/FpsCounter.tsx`: "No coupling to any specific render engine - it reads whatever
  apps report via reportRenderFps() / reportAccumulation() / reportFps()". Its SPS metric is the rate of
  change of `accumulationCount`.
- fluid-toy proves the route: `fluid-toy/main.tsx` calls `installPauseControls()` with the comment
  "Reads renderControlSlice (isPaused, sampleCap) which fluid-toy also consumes for TSAA gating".
- The deep zoomer already publishes the numbers: its telemetry carries `accumN, accumMax, exporting`
  (plans/deep-zoom-shell/research/host-interface.md line 25 / 213; I did not re-open the page for this).
  It has no pause ("No pause, no stop, no dispose", same file line 58) and no setter for the sample target
  that I found.
- `store/slices/viewportSlice.ts` (adaptive resolution) also reads `accumulationCount` and `sampleCap`
  for its deep-accumulation gate ("so the deep-accum gate works for any app that wires reportAccumulation").

### 1.2 Reset and convergence rules

- ADR-0061 (`docs/adr/0061-interaction-session-single-source-of-truth.md`) is the "is the user
  mid-gesture" primitive; its Scope line says "**GMT only** for now - sibling apps ...". Its root cause A:
  the modulation tick used to reset accumulation whenever an offset was non-zero; it is now delta-based.
- ADR-0062 is the worker canvas `desynchronized` present hint - GMT worker only, not an accumulation rule.
- ADR-0067 (`0067-bucket-render-equal-spp-no-convergence.md`): bucket render uses a fixed sample count,
  no per-bucket convergence test, because post runs once on the assembled composite and unequal samples
  showed as seams.
- The deep zoomer resets itself: every setter in the page ends `accumReset = true`
  (`window.__setLook`, `__setGuide`, `__setMarch`, `__clearGradient` in mandelbulb_deepzoom/index.html).

### 1.3 Tiled progressive renderer (GMT-internal)

- `engine-gmt/engine/BandScheduler.ts`: splits the screen into horizontal bands, one band per tick,
  "Consumed by FractalEngine.compute(), which drives RenderPipeline via uRegionMin/uRegionMax ...
  pipeline.setTiledBlend(blend) ... pipeline.accumulationCount". It is a part of GMT's renderer, not a
  service another renderer calls.

### 1.4 High-res still: panel, controller, runner, host

- `engine/plugins/topbar/installBucketRender.tsx`, `installBucketRender({ controller, slot, order, id, anchor, when })`:
  registers a topbar button that opens `BucketRenderPanel`. One global `_installed` guard.
- `engine/plugins/topbar/BucketRenderController.ts`, interface `BucketRenderController`:
  `startBucketRender(exportImage: boolean, config: BucketRenderConfig)`, `stopBucketRender()`,
  optional `setPreviewRegion?` / `clearPreviewRegion?`, `readonly accumulationCount`. This is the whole
  contract the panel needs. The JSDoc names both implementers: app-gmt wraps the worker; "fluid-toy ->
  FluidBucketController drives BucketRunner directly" - that sentence is stale: `fluid-toy/bucket/FluidBucketController.ts`
  imports neither `BucketRunner` nor `BucketRenderHost`; it runs its own two loops ("Build the image-tile
  grid (mirrors BucketRunner.start logic)") and emits `FRACTAL_EVENTS.BUCKET_STATUS` itself.
- `engine/export/BucketRenderTypes.ts`, `BucketRenderConfig`: `bucketSize, outputWidth, outputHeight,
  tileCols, tileRows, accumulation, samplesPerBucket?, includeGmfData?`.
- `engine/export/BucketRenderTypes.ts`, `BucketRenderHost`: `getRenderer(): THREE.WebGLRenderer | null`,
  `getOutputTexture(): THREE.Texture | null`, `getReadbackMaterial(...): THREE.ShaderMaterial | null`,
  plus `beginRender / setRenderSize / beginImageTile / beginGpuBucket / resetAccumulation / endRender`.
  `engine/export/BucketRunner.ts` scissor-copies the host's ONE accumulator texture into a per-tile
  Float32 composite inside the host's own GL context, and "does not drive rendering - it observes" the
  host's normal frame loop. Only GMT implements the host (`engine-gmt/engine/GmtBucketHost.ts`).
- `BucketRenderPanel.tsx` reads a lot of store state (`state.previewRegion`, `interactionMode`,
  `fixedResolution`, `resolutionMode`, `dpr`, `canvasPixelSize`, `samplesPerBucket`, `bucketSize`,
  `accumulation`, `setActiveRenderSampleCap`, `setAdaptiveSuppressed`). All of it is engine-store state;
  preview-region UI hides when the controller omits the two optional methods
  (`supportsPreview = !!controller.setPreviewRegion && !!controller.clearPreviewRegion`).
- The panel only enters its "Rendering" state if someone flips `isBucketRendering` in the store.
  `fluid-toy/main.tsx` carries an 8-line `FractalEvents.on(FRACTAL_EVENTS.BUCKET_STATUS, ...)` bridge for
  that, with a comment that without it "tiled renders ... silently produced no file", and "engine-gmt does
  the same two-flip bridge in engine-gmt/renderer/bindings.ts" (that second file not opened).
- Why `BucketRunner` itself does not fit: the deep zoomer is raw WebGL2 on its own canvas, its
  accumulated product is a G-buffer (depth log, palette parameter, step count, packed normal), and its
  shading pass uses whole-picture information - lights hung off a plane fitted to the surface in view,
  shadows and ambient occlusion read from the depth buffer. A runner that shades one bucket at a time,
  or composites one RGBA texture, would put a seam at every bucket edge. The shading must run after the
  whole G-buffer for an image is assembled. The page already has a tiled export of its own
  (`__export(longEdge, samples, tile)`), so this problem is solved inside the renderer.

### 1.5 Video render dialog

- `engine/plugins/RenderDialog/types.ts`: `RenderDialogConfig { width, height, formatIndex, bitrate,
  samplesPerFrame, startFrame, endFrame, frameStep, fps }`; `RenderDialogFlags { cancelledRef,
  finishEarlyRef, stoppingRef, startTimeRef }`; `RenderDialogStatus { setProgress (0..1), setElapsedTime,
  setEtaRange, setLastFrameTime, setStatusText, setIsRendering, setIsStopping }`;
  `RenderDialogRunner = (deps) => Promise<void>`. Header comment: "Apps install the plugin once and
  provide an app-specific `runner` that handles the per-frame pump + encoder lifecycle."
  `InstallRenderDialogOptions` has `extraFormFields`, `formatFilter`, `canEncode`, `resolutionPresets`,
  `isStartDisabled`, `onMount`, `showSamplesPerFrame`.
- The reference implementation for a main-thread renderer is `fluid-toy/components/RenderDialog/exportRunner.ts`:
  per frame `animationEngine.scrub(frame)` -> `applyModulationsAt(time, dt)` -> yield to React ->
  converge `cfg.samplesPerFrame` samples -> `encoder.encodeCanvas(canvas, i)` -> `status.setProgress`.
  Cancel / pause is polled from `flags.cancelledRef` / `stoppingRef` between frames. About 240 lines.
- `engine/animation/renderAdjunctRegistry.ts`, `registerRenderAdjunct({ label, title?, Dialog })`: extra
  rows in the timeline's Render overflow menu; "keeps engine-core domain-agnostic".
- `app-gmt/main.tsx` installs `installRenderDialog<AppGmtExtra>` and registers `afxRenderAdjunct`,
  `fbxRenderAdjunct`. Those are app-gmt code, not shared.

### 1.6 Timeline and modulation as renderer drivers

- `engine/AnimationEngine.ts`: `scrub(frame)` evaluates each track and calls `getBinder(track.id)`;
  `binderRegistry.lookup` wins over built-ins; `registerScrubHook('pre' | 'post', fn)` lets an app batch
  composite writes once per scrubbed frame. It writes store values; it never talks to a renderer.
- `engine/animation/modulationTick.ts`, `installModulation()`: registers `engine.animation` in
  `TICK_PHASE.ANIMATE`; "Writes resolved offsets -> store.liveModulations". The offsets are NOT added to
  the param values in the store - each renderer adds them (app-gmt's worker maps them to uniforms).
- `engine/features/modulation/applyAt.ts`, `applyModulationsAt(time, dt)`: the export-time version,
  "previously lived inline in three different runners (demo, fluid-toy, app-gmt)".

### 1.7 Perf and diagnostics

- `FpsCounter` (1.1) and `viewport.reportRenderFps` are generic (`engine-gmt/renderer/GmtRendererTickDriver.tsx`
  calls `viewport.reportRenderFps(t.renderFps)`; the blueprint already plans the same call).
- `engine-gmt/renderer/perfProbe.ts` (`?perf`): counts `RENDER_TICK`s to the worker, `FRAME_READY`s back,
  hover pre-picks, audio input. Worker-shaped throughout; loaded only by `app-gmt/main.tsx`.

## 2. What the renderer module must expose (the host interface)

No new engine interface is needed; these are the calls the shell's three adapters need from
`deep-zoom/renderer/`. All are changes to the ported module, none to GMT.

| Call | Used by | In the page today |
|---|---|---|
| `renderFrame({ width, height, samples, tile, view or path+u, onProgress, signal }) -> pixels or Blob` (no download) | still export, video runner | internal `renderFrameToBlob`; public wrappers download by themselves (blueprint H4) |
| `cancel` honoured between tiles and between samples, not only between frames | Stop buttons | `__export` returns `{cancelled}`; granularity unverified |
| `pause(on)` | `AccumulationController.isPaused` | missing (K3) |
| `setSampleTarget(n)` and `accumN / accumMax` in telemetry | `setPreviewSampleCap`, `reportAccumulation` | read side exists; setter not found |
| `resetAccumulation()` | `FRACTAL_EVENTS.RESET_ACCUM` | internal `accumReset = true`; no public call found |
| progress as an event with numbers (frame, tile, sample, phase incl. "building reference") | `status.setProgress` / `setStatusText`, `BUCKET_STATUS` | DOM scrape today (H3) |
| optional: render a sub-rectangle of a larger virtual picture | `tileCols x tileRows` multi-file stills beyond one PNG's size | unverified |

The reference-orbit rebuild is the one cost GMT's UI has no word for. It is per camera pose, so a
video pays it once per frame and a still once. It belongs in `setStatusText` and in the measured
per-frame time (`setLastFrameTime`), which the dialog already turns into the ETA. If the rebuild runs
on the main thread the runner must yield around it or the Stop button will not respond.

## 3. Table

| Sub-system | What it assumes today | Verdict | The rework, stated generically | Size | What GMT gains or risks |
|---|---|---|---|---|---|
| `renderControlSlice` (`isPaused`, `sampleCap`, `accumulationCount`, `activeRenderSampleCap`) | One accumulator per app reports a count | AS-IS | - | - | - |
| `AccumulationController` + `installAccumulationBindings` | A renderer object with pause, cap, reset, count | ADAPTER | Shell object over the module: count = `accumN`, `convergenceValue` = 1, cap -> sample target, pause -> module pause. Report the count from the telemetry stream with `reportAccumulation` | 0.25 session once the module has pause + a target setter | none |
| `PauseControls` (button, fill bar, "Auto-Stop (Samples)") | Engine store only | AS-IS (through the adapter above) | - . Note the slider default is 64, the same as the deep zoomer's still target, and 0 means never stop - the module must accept "no cap" or the adapter clamps it | - | none. Reverses the blueprint's "not used" |
| `FpsCounter` / `viewport.reportRenderFps` | Apps report fps and sample count | AS-IS | - | - | - |
| Reset rule (`FRACTAL_EVENTS.RESET_ACCUM`) | Renderer listens and resets | ADAPTER | One listener in the shell; the module already resets on its own setters | minutes | none |
| InteractionSession (ADR-0061) | GMT gesture producers, GMT consumers | NOT-NOW | Applies if the shell wants "interacting" to un-pause the button or hold adaptive resolution; then the shell's fly input opens a session - still an adapter | - | - |
| Adaptive resolution (`viewportSlice`, reads `accumulationCount`) | The surface obeys the store's render scale | NOT-NOW | The blueprint drops the badge (ENGINE-GAPS E3, E4). Applies when the module takes a resolution scale from outside | - | - |
| Tiled progressive idle renderer (`engine-gmt/engine/BandScheduler.ts`) | GMT's pipeline, region uniforms, one RGBA history | NOT-NOW | It is renderer internals. Applies only if flying at depth stalls the UI; the idea (one band per tick, equal blend per pass) would be re-done inside the module against its G-buffer | - | - |
| `installBucketRender` + `BucketRenderPanel` + `BucketRenderController` | A controller with start / stop / count; engine-store fields for size, tiles, samples | ADAPTER | A `DeepZoomBucketController` like fluid-toy's: `startBucketRender(exportImage, cfg)` -> `renderFrame` at `outputWidth x outputHeight`, `samplesPerBucket`, `tile = bucketSize`; emit `BUCKET_STATUS`; save with the engine's file-name and PNG-metadata helpers. Omit the preview-region methods | 1 session after H4 | none |
| The `BUCKET_STATUS` -> `isBucketRendering` store bridge | Every app copies 8 lines or the panel closes mid-render and cancels the job | REWORK (R1) | Move the bridge inside `installBucketRender` so installing the panel is enough | S, under half a day | Gain: removes a trap that already cost fluid-toy silent lost renders. Risk: GMT's own bridge (engine-gmt/renderer/bindings.ts, unverified) must be removed in the same change or the flag is set twice - harmless but untidy |
| `BucketRunner` + `BucketRenderHost` | three.js renderer; one RGBA accumulator texture; the runner copies inside the host's GL context; post runs per image tile on that composite | NOT-NOW as it stands; REWORK (R3) only if a shared runner is wanted | Split the runner into (a) a plain scheduler - image-tile grid, bucket grid, progress, file naming, metadata, status events - with no graphics import, and (b) the three.js compositor GMT uses. fluid-toy and any other renderer then use (a) and stop re-deriving the grid | M, 1-2 days | Gain: fluid-toy drops its duplicate grid code. Risk: this is the code ADR-0067 stabilised against seams; GMT's output must be bit-identical before and after. Not needed for the deep zoomer |
| Refine View (the panel's non-export start, `exportImage = false`) | The runner blits the composite to the screen and holds it | NOT-NOW | Needs the module to hold a finished high-sample picture on its canvas; the shell can hide nothing here because the panel has no switch for it - see unverified | - | - |
| `installRenderDialog` (form, flags, status, ETA) | A runner callback | AS-IS | - | - | - |
| The video runner | App-written loop: scrub, modulate, yield, converge, encode | ADAPTER | `runDeepZoomExport`, modelled on fluid-toy's runner; needs H4. `width / height` from the dialog map to the module's long edge and frame shape | 1 session after H4 | none |
| The scrub -> modulate -> yield -> render -> encode loop itself | Each app re-writes about 240 lines | REWORK (R2), optional | A shared frame-loop helper in `engine/export/`: the app passes "render this frame into this canvas with N samples" and the helper owns scrub, `applyModulationsAt`, the React yield, cancel / pause / finish-early, encoder lifecycle, ETA. Same move the engine already made for `applyModulationsAt` | M, 1 day | Gain: the cancel and restore-state rules live once. Risk: app-gmt's runner goes through the worker and should not be forced onto it; make the helper opt-in |
| Image-sequence output | The shared encoder throws on sequence formats | REWORK, already listed as ENGINE-GAPS E24 | A main-thread sequence sink in `engine/export/` | M | Gain for fluid-toy too |
| `renderAdjunctRegistry` | Label + dialog | AS-IS | - | - | - |
| app-gmt render extras (passes, internal scale, depth range), After Effects and FBX camera adjuncts | app-gmt state; a camera in ordinary doubles | NOT-NOW | Passes apply once the module can write its G-buffer layers (depth, normal) as extra outputs. Camera export applies only for shallow flights: a position with 256 fractional bits has no meaning in a DCC scene | - | - |
| `AnimationEngine` (`scrub`, binders, scrub hooks) | Tracks write plain numbers into the store | AS-IS | - . Use `registerScrubHook('post')` so one scrub causes one seek and one reference rebuild, not one per track | - | none |
| LFO / audio modulation (`installModulation`, `liveModulations`) | The renderer adds offsets to its inputs each frame; any offset change resets accumulation | ADAPTER for look params (colour, lights, falloff); NOT-NOW for anything that rebuilds the reference orbit or recompiles | The shell's sync layer adds `liveModulations[target]` before pushing a value. A modulated still never reaches its sample target - same as GMT. Params whose change rebuilds the BigInt reference (power, position) must not be offered as targets until the rebuild is cheap or off-thread | 0.5 session | none. Whether a param can be declared "not a modulation target" is unverified |
| `applyModulationsAt` (export time) | Any runner | AS-IS | - | - | - |
| `?perf` probe (`engine-gmt/renderer/perfProbe.ts`) | Worker ticks, worker frames, hover picks | NOT-NOW | Applies if the deep zoomer moves to a worker. Until then its own timers feed the HUD | - | - |

## 4. The reworks that matter

1. **Module handles, not GMT changes** (blueprint H4, K3, H3 plus a sample-target setter and a public
   reset): with them the pause button, sample counter, high-res panel and video dialog all work through
   adapters. Without H4 neither export route works; without K3 the pause button is a lie.
2. **R1 - the status bridge into `installBucketRender`** (S). Otherwise the new shell is the third app to
   copy 8 lines whose absence cancels a render silently.
3. **R2 - a shared export frame loop** (M, optional, later). Worth it only when a third main-thread
   renderer exists - the deep zoomer is that third one.

`BucketRunner` should be left alone: the deep zoomer's shading needs the whole picture's G-buffer, and
GMT's seam history makes that file expensive to touch for no gain here.

## 5. Unverified

- I did not open `app-gmt/renderDialogExtras.tsx`, `app-gmt/AfxRenderAdjunct.tsx`,
  `engine/plugins/RenderDialog/index.tsx`, `ConfigForm.tsx`, `engine-gmt/engine/GmtBucketHost.ts`,
  `engine-gmt/renderer/bindings.ts`, `engine/export/videoEncoder.ts` (exports list only) or the body of
  `BucketRunner.ts` past its `start()` head (grep of host calls and events only).
- ADR-0061, 0062, 0067: heading and context paragraphs only.
- The deep-zoom page: I grepped `index.html` for handles and took `accumN / accumMax`, "no pause",
  `__export`, `__renderPath` and `renderFrameToBlob` from research/host-interface.md. Not checked: how
  the page's tiled export keeps the fitted light plane and depth-buffer shadows consistent across
  tiles; whether it can render a sub-rectangle of a larger picture; whether accumulation can run with
  no cap; cancel granularity; whether the reference rebuild blocks the main thread during an export.
- The 64-sample still and the guided start are from the brief; I saw the guide code
  (`guideOn`, `GUIDE_MAX_PX = 1 << 24` - "above this an export goes unguided") but not the 64.
- Whether `BucketRenderPanel` can hide Refine View or the tile-grid fields per controller: not read.
- Whether DDFS has a way to exclude a param from the LFO target list: not checked.
- Whether `deep-zoom/` in this worktree (it has `DeepZoomApp.tsx`, `bridge.ts`, `main.tsx`, `store.ts`,
  `ui/`) already carries any of the adapters above: directory listing only.
- Sizes are estimates from reading, not from a build; nothing was run.
