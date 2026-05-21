---
subsystem_id: t02-fractal-toy
audited_at: 2026-05-20T00:00:00Z
files:
  - path: fractal-toy/FractalToyApp.tsx
    blob_sha: 723ddc0b3321984434ed169f57da471f97801ffa
    lines_read: [1, 113]
  - path: fractal-toy/features/camera.ts
    blob_sha: d3210946361784116cf2f0a863867198f1bd487e
    lines_read: [1, 43]
  - path: fractal-toy/features/lighting.ts
    blob_sha: a0905d05f04987e8274c9a4c61c177c3a039b935
    lines_read: [1, 44]
  - path: fractal-toy/main.tsx
    blob_sha: b83080db98e45d1c1d8b92e87f1b94fbabe2472a
    lines_read: [1, 162]
  - path: fractal-toy/panels.ts
    blob_sha: 8edc3b9a3fc3887b278e7b6bcf5c90949eb874ea
    lines_read: [1, 14]
  - path: fractal-toy/registerFeatures.ts
    blob_sha: 26797f6c97ed0605516a5fb7010ad6b8f3411c95
    lines_read: [1, 31]
  - path: fractal-toy/renderer/FractalEngine.ts
    blob_sha: b998b1993387a5c3487ce04372855f10e4ba7bf4
    lines_read: [1, 198]
  - path: fractal-toy/renderer/formulaRegistry.ts
    blob_sha: 960b290b8f45a196983d3c279b4a648bab713ccb
    lines_read: [1, 132]
  - path: fractal-toy/renderer/formulas/mandelbox.ts
    blob_sha: 41d1ac2b373f3589562486b3dff3f67bda0cf9b6
    lines_read: [1, 76]
  - path: fractal-toy/renderer/formulas/mandelbulb.ts
    blob_sha: d1230f370d0a7915c30055b39f31eab3f0ac7ca1
    lines_read: [1, 90]
  - path: fractal-toy/renderer/index.ts
    blob_sha: b540ac563fb093f03143d397f19e09b5536544bb
    lines_read: [1, 27]
  - path: fractal-toy/renderer/install.tsx
    blob_sha: cdc74d039955f2b80213121d98f3fcbaa1fff625
    lines_read: [1, 301]
  - path: fractal-toy/renderer/shaderAssembler.ts
    blob_sha: 51771016331286dfcc3f0501341b752178f4573b
    lines_read: [1, 216]
  - path: fractal-toy/setup.ts
    blob_sha: 6af811b2ee89f8b35a8b960e70b14477ed22af09
    lines_read: [1, 11]
---

## Public API surface

- `FractalToyApp` React root component — exported from `fractal-toy/FractalToyApp.tsx:49`.
- Entry script `fractal-toy/main.tsx` — registers features (`fractal-toy/main.tsx:22`), installs engine plugins (`fractal-toy/main.tsx:63-104`), seeds default formula (`fractal-toy/main.tsx:150`), and mounts `<FractalToyApp />` via `ReactDOM.createRoot` (`fractal-toy/main.tsx:157-162`).
- Renderer plugin barrel `fractal-toy/renderer/index.ts:13-27`:
  - `installFractalRenderer(options?)` — one-time install (`fractal-toy/renderer/install.tsx:54`).
  - `<FractalRendererCanvas />` — drop-in canvas component (`fractal-toy/renderer/install.tsx:219`).
  - `fractalRenderer` — imperative object: `getCanvas()` + `rebuild()` (`fractal-toy/renderer/install.tsx:92-102`).
  - `InstallFractalRendererOptions` (`fractal-toy/renderer/install.tsx:39`).
- Formula registry surface re-exported from same barrel: `formulaRegistry`, `registerFormula`, plus types `FormulaDefinition`, `FormulaUniform`, `UniformType`, `UniformSetters` (`fractal-toy/renderer/install.tsx`/`formulaRegistry.ts`).
- `formulaRegistry` object methods: `get`, `getAll`, `has`, `resolve` (`fractal-toy/renderer/formulaRegistry.ts:121-132`).
- `FractalEngine` class — public ctor + methods `setShader`, `setUniformF/I/2F/3F/4F`, `resize`, `start`, `stop`, `dispose`, `canvas` (readonly) (`fractal-toy/renderer/FractalEngine.ts:35-116`).
- `assembleRayMarchShader(builder, options)` + `AssembleOptions` (`fractal-toy/renderer/shaderAssembler.ts:37`, `:30`).
- Feature definitions exported as constants: `CameraFeature` (`fractal-toy/features/camera.ts:19`), `LightingFeature` (`fractal-toy/features/lighting.ts:16`), `MandelbulbFormula` (`fractal-toy/renderer/formulas/mandelbulb.ts:57`), `MandelboxFormula` (`fractal-toy/renderer/formulas/mandelbox.ts:46`).
- Static panel manifest `FractalToyPanels` (`fractal-toy/panels.ts:11`).
- `setupFractalToy()` — applies static manifest post-mount (`fractal-toy/setup.ts:11`).

## Architecture

- Three-file add-on contract documented at `fractal-toy/main.tsx:9-15`: `registerFeatures.ts` runs first for side-effect registration, store freezes registries on first touch, `setup.ts` seeds panels after React mount.
- `fractal-toy/main.tsx:22` imports `./registerFeatures` for its side effect BEFORE any store-touching imports; `fractal-toy/main.tsx:23` likewise imports `../engine/plugins/camera/presetField` only for module-level registration.
- Boot order in `main.tsx`: `registerUI()` (`:55`) → `installViewport` (`:63-69`, targetFps 30, minQuality 0.35, interactionDownsample 0.55, activityGraceMs 100) → `installTopBar` (`:73`) → `installPwaUpdate` (`:77`) → `installSceneIO({ getCanvas })` (`:80-82`) → `installMenu` (`:85`) → `installFractalRenderer({ onFrameEnd: viewport.frameTick })` (`:89-91`) → `installShortcuts` (`:96`) → `installUndo` (`:99`) → `installCamera` + `camera.register` (`:104-127`) → `registerCameraKeyTracks([...])` (`:134-142`) → `setupFractalToy()` (`:145`) → `setState({ formula: 'Mandelbulb' })` (`:150`) → mount root (`:157-162`).
- `fractal-toy/registerFeatures.ts:23-24` registers formulas first (so DDFS auto-lift happens before the static panel manifest fires), then `featureRegistry.register(CameraFeature)` (`:28`) and `featureRegistry.register(LightingFeature)` (`:31`).
- `FractalToyApp` layout: full-screen flex column, `<EngineBridge />` + `<DropZones />` + floating panels + `<TopBarHost />` + viewport row (`<ViewportFrame>` containing `<FractalRendererCanvas />` and `<DomOverlays />`) + right `<Dock />` + `<TimelineHost />` + global context menu + fps/quality readout (`fractal-toy/FractalToyApp.tsx:63-110`).
- `DomOverlays` iterates `featureRegistry.getViewportOverlays()` filtered to `type === 'dom'` and resolves each component via `componentRegistry.get` (`fractal-toy/FractalToyApp.tsx:34-47`).
- `fractal-toy/main.tsx:104-127` registers a camera adapter with `@engine/camera`: `captureState` reads `state.camera`, `applyState` calls `setCamera(...)` — wires Ctrl+1..9 save / 1..9 recall onto orbit params.
- `registerCameraKeyTracks` uses underscore form for vec components (`camera.target_x` etc.) to match AutoFeaturePanel readout (`fractal-toy/main.tsx:133-142`).
- Renderer plugin is the only canvas owner: `_engine` module singleton (`fractal-toy/renderer/install.tsx:48`), `getCanvas()` returns `_engine?.canvas ?? null` (`:94`).
- Formula menu registration: `menu.register({ id: 'formula', slot: 'left', order: 50, … })` then per-formula toggle items in a loop (`fractal-toy/renderer/install.tsx:61-89`). Each item writes `state.formula` directly via `setState`, skipping `setFormula` to avoid GMT-era CONFIG emit + history reset; the Zustand subscription on `s.formula` in the Canvas effect picks up the change and triggers a CompileGate-wrapped rebuild (`:253-256`).
- `_rebuildNow` (`fractal-toy/renderer/install.tsx:112-142`): resolves active formula, runs every registered feature's `inject(builder, {} as any, 'Main')`, calls `assembleRayMarchShader`, then `engine.setShader(fragSrc)`. Always emits `FRACTAL_EVENTS.IS_COMPILING, false` (success and failure) and `FRACTAL_EVENTS.RESET_ACCUM` on success.
- `_pushAllUniforms` (`fractal-toy/renderer/install.tsx:146-164`): looks up active formula by `state.formula`, reads slice `state[formula.id.toLowerCase()]`, delegates to `formula.pushUniforms(_uniformSetters(engine), sliceState)`; then `_pushCamera(s.camera)` and `_pushLighting(s.lighting)`.
- `_pushLighting` parses color as either object `{r,g,b}` or `'#rrggbb'` string, fallback white (`fractal-toy/renderer/install.tsx:188-200`).
- `<FractalRendererCanvas />` effect (`fractal-toy/renderer/install.tsx:232-281`): constructs `FractalEngine` with `onFrameEnd` (defaults to `viewport.frameTick`), calls `_rebuildNow()`, `engine.start()`, then sets up four Zustand subscriptions: `s.formula` → rebuild; active-formula slice (resolved via `formulaRegistry.resolve(state.formula).id.toLowerCase()`) → push formula uniforms only; `s.camera` → `_pushCamera`; `s.lighting` → `_pushLighting`. Cleanup unsubs and disposes engine.
- Resize effect (`fractal-toy/renderer/install.tsx:284-293`): on `canvasPixelSize` or `quality` change, calls `engine.resize(floor(physW * quality), floor(physH * quality))` — dynamic-resolution by shrinking the WebGL drawing buffer beneath a CSS-stretched canvas.
- `FractalEngine` is WebGL2-only with `{ antialias: false, alpha: false, preserveDrawingBuffer: true }` (`fractal-toy/renderer/FractalEngine.ts:49`) — `preserveDrawingBuffer: true` documented as required for PNG export + Playwright `readPixels` (`:47-49`).
- `FractalEngine.setShader` compiles vertex + fragment, binds `aPosition` to location 0, links, deletes shaders, then caches all active uniform locations stripping any `[0]` array suffix (`fractal-toy/renderer/FractalEngine.ts:57-81`, `:151-164`).
- Per-frame render (`fractal-toy/renderer/FractalEngine.ts:118-141`): clears, sets `uTime` (seconds since `startTime`), `uResolution` (canvas px), `uFrame` (integer counter), draws 6-vertex quad, calls `onFrameEnd?.()`.
- `formulaRegistry.registerFormula` auto-lifts `def.params` into `featureRegistry` with `id: def.id.toLowerCase()`, `category: 'Fractal'`, no `inject` (GLSL goes via assembler, not generic sweep) — `fractal-toy/renderer/formulaRegistry.ts:84-103`.
- Each formula registration also calls `addPanel({ id: def.name, dock: 'right', order: 0, active: true, features: [featureId] })` if not already present (`fractal-toy/renderer/formulaRegistry.ts:108-118`) — first registered formula effectively wins the active tab (`:108-118`, see comment at `:108-110`).
- `formulaRegistry.resolve(activeId)` falls back to the first registered formula when `activeId` is empty or unknown (`fractal-toy/renderer/formulaRegistry.ts:127-131`).
- Shader assembly (`fractal-toy/renderer/shaderAssembler.ts:37-89`): pulls defines / uniforms / headers / preambles / functions from `ShaderBuilder`, hard-codes built-in uniforms `uTime`, `uResolution`, `uFrame`, then inlines formula GLSL + raymarch body. Gradient fallback used when no formula (`:55-58`, `:92-96`).
- Raymarch body (`fractal-toy/renderer/shaderAssembler.ts:107-216`): pinhole camera from orbit angles `uCamOrbitTheta/Phi` + `uCamDistance` + `uCamTarget` + `uCamFov`; `MAX_STEPS=200`, `MAX_DIST=20.0`, `HIT_EPS=0.001`, step factor 0.9, inner loop hard-bounded to 32 iters guarded by `uIterations`; DE via templated `deExpr`; finite-difference normal via three additional inner-loop replays at `hStep=0.002`; Lambert + ambient + step-count AO + gamma 2.2.
- Mandelbulb formula: classic 3D Mandelbrot with `uPower`, `uPhaseTheta`, `uPhasePhi`, optional Z-twist, optional Radiolaria mutation (`min(z.y, uRadiolariaLimit)`) gated by `uRadiolariaEnabled > 0.5` (`fractal-toy/renderer/formulas/mandelbulb.ts:16-55`). Uses default DE (no `deExpr`) and default escape (2.0).
- Mandelbox formula: box fold + sphere fold + scale; declares `deExpr: 'r / abs(dr)'` and `escapeRadius: 1024.0` (`fractal-toy/renderer/formulas/mandelbox.ts:46-76`).
- `panels.ts` static manifest: Camera (order 1) + Lighting (order 2), both `dock: 'right'`, no `active` flag — formula tabs assert themselves active when registered (`fractal-toy/panels.ts:11-14`).
- `setupFractalToy()` is a one-liner that applies the static manifest (`fractal-toy/setup.ts:11`).

## Invariants and gotchas

- Renderer plugin keeps `_engine`, `_options`, `_installed` as module-level singletons (`fractal-toy/renderer/install.tsx:46-48`). Only one `<FractalRendererCanvas />` can be mounted; multiple roots would race and clobber the singleton.
- `<FractalRendererCanvas />` warns to console (not throws) when rendered without `installFractalRenderer()` having run — frame telemetry then missing (`fractal-toy/renderer/install.tsx:220-222`).
- Formula menu items skip the canonical `setFormula` action and write `state.formula` directly via `setState` to avoid GMT-era side effects (CONFIG emit + history reset) — Canvas subscription is solely responsible for rebuilding (`fractal-toy/renderer/install.tsx:79-87`).
- `_rebuildNow` always emits `IS_COMPILING:false` even on failure paths (no engine, compile throw) so the `<CompilingIndicator />` cannot get stuck (`fractal-toy/renderer/install.tsx:115`, `:134`, `:141`). This is explicitly because the stub `WorkerProxy` never replies with `CONFIG_DONE` (`:108-111`).
- `_rebuildNow` runs `inject(builder, {} as any, 'Main')` for every feature including ones that don't have `inject` defined (guarded by `if (feat.inject)`), passing an unsafe-cast empty config object (`fractal-toy/renderer/install.tsx:127`). Features must not actually rely on the config arg.
- Formula slice subscription tracks the slice for `formulaRegistry.resolve(state.formula).id.toLowerCase()`; switching formulas invalidates the previous subscription's tracked slice and the slice changes flow through the new active formula automatically — but the resolver returns the first registered formula when `state.formula` is empty, so a transient "no active formula" state still pushes Mandelbulb uniforms (`fractal-toy/renderer/install.tsx:259-271`, `fractal-toy/renderer/formulaRegistry.ts:127-131`).
- `formulaRegistry.registerFormula` throws on duplicate `id` (`fractal-toy/renderer/formulaRegistry.ts:85-87`).
- Feature id auto-lifted from formulas is `def.id.toLowerCase()`, e.g. `Mandelbulb` → slice key `mandelbulb` (`fractal-toy/renderer/formulaRegistry.ts:93`, consumer at `install.tsx:155`). Mixed-case formula ids would still lowercase, but two formulas differing only in case would collide silently (no explicit check beyond the literal-id dedupe in `_formulas`).
- Inner GLSL loop is hard-bounded to a literal `32` iterations (`fractal-toy/renderer/shaderAssembler.ts:149`, `:171`, `:182`, `:193`); the `uIterations` uniform only narrows that ceiling. Formula params allow `iterations` up to 32 for both formulas (`mandelbulb.ts:73`, `mandelbox.ts:63`) — bumping that param max would silently saturate.
- Mandelbulb feature uses `uRadiolariaEnabled` as a float threshold (`> 0.5`) backed by a `boolean` param, pushed via `s.radiolariaEnabled ? 1.0 : 0.0` (`fractal-toy/renderer/formulas/mandelbulb.ts:49`, `:87`).
- Color uniform `uLightColor` has dual ingest paths: `{r,g,b}` object or `'#rrggbb'` string (`fractal-toy/renderer/install.tsx:188-200`); the LightingFeature declares the param with `type: 'color'` and default `'#ffffff'` (`fractal-toy/features/lighting.ts:27`).
- Camera ray builder lives in `shaderAssembler.ts`, not `CameraFeature.inject` — comment at `fractal-toy/features/camera.ts:11-14` calls this out as deliberate ("camera math is pipeline-level (not a per-formula concern)").
- `FractalEngine.setShader` uses `gl.bindAttribLocation(prog, 0, 'aPosition')` BEFORE `linkProgram` (`fractal-toy/renderer/FractalEngine.ts:68-69`) — required because the cached VAO uses location 0 (`:178`).
- `cacheUniforms` strips trailing `[0]` from uniform names (`fractal-toy/renderer/FractalEngine.ts:160`), so consumers can address array uniforms by base name; but none of the current formulas declare arrays.
- Dev-only block in `main.tsx:43-52` unregisters stale service workers and purges caches when running under `import.meta.env.DEV` to undo state left by `npm run preview`.
- `FractalEngine.resize` is silently a no-op for sub-pixel dimensions (`widthPx < 1 || heightPx < 1`) — `fractal-toy/renderer/FractalEngine.ts:90`.
- `setShader` will only call `gl.deleteProgram` on success of compile/link; if compile throws inside `compile()`, the old `this.program` is already deleted before the new one is built (`fractal-toy/renderer/FractalEngine.ts:59-79`) — leaves the engine in a "no program" state where subsequent `render()` calls are no-ops (`:120`).

## Open questions

- Orphan-sweep candidate: fractal-toy/FractalToyApp.tsx
- Orphan-sweep candidate: fractal-toy/features/camera.ts
- Orphan-sweep candidate: fractal-toy/features/lighting.ts
- Orphan-sweep candidate: fractal-toy/main.tsx
- Orphan-sweep candidate: fractal-toy/panels.ts
- Orphan-sweep candidate: fractal-toy/registerFeatures.ts
- Orphan-sweep candidate: fractal-toy/renderer/FractalEngine.ts
- Orphan-sweep candidate: fractal-toy/renderer/formulaRegistry.ts
- Orphan-sweep candidate: fractal-toy/renderer/formulas/mandelbox.ts
- Orphan-sweep candidate: fractal-toy/renderer/formulas/mandelbulb.ts
- Orphan-sweep candidate: fractal-toy/renderer/index.ts
- Orphan-sweep candidate: fractal-toy/renderer/install.tsx
- Orphan-sweep candidate: fractal-toy/renderer/shaderAssembler.ts
- Orphan-sweep candidate: fractal-toy/setup.ts
