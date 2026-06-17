---
source: fractal-toy/main.tsx
lines: 162
last_verified_sha: b83080db98e45d1c1d8b92e87f1b94fbabe2472a
additional_sources:
  - fractal-toy/FractalToyApp.tsx
  - fractal-toy/registerFeatures.ts
  - fractal-toy/setup.ts
  - fractal-toy/panels.ts
  - fractal-toy/features/camera.ts
  - fractal-toy/features/lighting.ts
  - fractal-toy/renderer/index.ts
  - fractal-toy/renderer/install.tsx
  - fractal-toy/renderer/FractalEngine.ts
  - fractal-toy/renderer/formulaRegistry.ts
  - fractal-toy/renderer/shaderAssembler.ts
  - fractal-toy/renderer/formulas/mandelbulb.ts
  - fractal-toy/renderer/formulas/mandelbox.ts
audited: 2026-05-20T09:23:39Z
audited_by: claude-opus-4-7
public_api:
  - FractalToyApp
  - setupFractalToy
  - FractalToyPanels
  - CameraFeature
  - LightingFeature
  - installFractalRenderer
  - FractalRendererCanvas
  - fractalRenderer
  - InstallFractalRendererOptions
  - formulaRegistry
  - registerFormula
  - type FormulaDefinition
  - type FormulaUniform
  - type UniformType
  - type UniformSetters
  - FractalEngine
  - FractalEngineOptions
  - assembleRayMarchShader
  - AssembleOptions
  - MandelbulbFormula
  - MandelboxFormula
depends_on:
  - e01-feature-system
  - e04-shader-builder
  - e06-adaptive-resolution
  - e07-plugins-host
  - e08-shortcuts-undo
  - e09-camera-plugin
---

# Fractal Toy — sibling raymarcher app

`fractal-toy/` is a minimal raymarched-fractal sibling app built directly on the shared engine. It is the second live consumer of the engine's plugin surface (alongside the Demo add-on) and the documented nucleus of the eventual full GMT port (`fractal-toy/main.tsx:1-7`). The app demonstrates the engine's three-file add-on contract: side-effect registration (`fractal-toy/registerFeatures.ts:1-31`), store-driven boot (the engine store freezes registries on first touch), and a post-mount panel-manifest seed (`fractal-toy/setup.ts:1-11`). The renderer is itself a plugin (`fractal-toy/renderer/install.tsx:54`) so the canvas component can be swapped for a future worker-mode renderer with a one-line import change (`fractal-toy/renderer/install.tsx:16-20`).

## Public API

### App-level

| Symbol | Location | Purpose |
|---|---|---|
| `FractalToyApp` | `fractal-toy/FractalToyApp.tsx:49` | React root component — full-screen layout with `<EngineBridge />`, floating panels, `<TopBarHost />`, `<ViewportFrame>` + `<FractalRendererCanvas />`, right `<Dock />`, `<TimelineHost />`, fps/quality readout. |
| `setupFractalToy` | `fractal-toy/setup.ts:11` | One-liner that applies `FractalToyPanels` via `applyPanelManifest`. Called from `main.tsx` after plugin installs. |
| `FractalToyPanels` | `fractal-toy/panels.ts:11` | Static panel manifest — Camera (order 1) + Lighting (order 2), both `dock: 'right'`. Formula tabs are added dynamically by `registerFormula`. |
| `CameraFeature` | `fractal-toy/features/camera.ts:19` | DDFS feature for the 4-DOF orbit camera (`orbitTheta`, `orbitPhi`, `distance`, `fov`, `target`). `inject()` declares the `uCam*` uniforms; ray construction lives in the assembler, not the feature (`fractal-toy/features/camera.ts:11-14`). |
| `LightingFeature` | `fractal-toy/features/lighting.ts:16` | DDFS feature for one directional light + Lambert + ambient + AO + albedo. Declares `uLightDir`, `uLightColor`, `uLightIntensity`, `uAmbient`, `uAoAmount`, `uAlbedo` (`fractal-toy/features/lighting.ts:36-43`). |

### Renderer plugin barrel (`fractal-toy/renderer/index.ts:13-27`)

| Symbol | Location | Purpose |
|---|---|---|
| `installFractalRenderer` | `fractal-toy/renderer/install.tsx:54` | One-time install. Registers the Formula dropdown in the topbar, stashes `onFrameEnd` options. |
| `FractalRendererCanvas` | `fractal-toy/renderer/install.tsx:219` | Drop-in canvas component. Owns `FractalEngine` lifetime + Zustand subscriptions for shader rebuild + uniform dispatch. |
| `fractalRenderer` | `fractal-toy/renderer/install.tsx:92` | Imperative API: `getCanvas(): HTMLCanvasElement \| null` (`fractal-toy/renderer/install.tsx:94`) and `rebuild(): void` (`fractal-toy/renderer/install.tsx:97`). |
| `InstallFractalRendererOptions` | `fractal-toy/renderer/install.tsx:39` | Options bag; only field is `onFrameEnd?` for swapping the default viewport-frame-tick callback. |
| `formulaRegistry` | `fractal-toy/renderer/formulaRegistry.ts:121` | `get`, `getAll`, `has`, `resolve` methods over the internal `_formulas` map (`fractal-toy/renderer/formulaRegistry.ts:122-131`). |
| `registerFormula` | `fractal-toy/renderer/formulaRegistry.ts:84` | Register a `FormulaDefinition`. Auto-lifts params into `featureRegistry` (`:103`) + adds a right-dock panel via `addPanel` (`:111-117`). |
| `FormulaDefinition` | `fractal-toy/renderer/formulaRegistry.ts:36` | Bundle of `id`, `name`, `description?`, `glsl`, `call`, `deExpr?`, `escapeRadius?`, `uniforms`, `params`, `pushUniforms?`. |
| `FormulaUniform` | `fractal-toy/renderer/formulaRegistry.ts:31` | `{ name; type: UniformType }`. |
| `UniformType` | `fractal-toy/renderer/formulaRegistry.ts:29` | `'int' \| 'float' \| 'vec2' \| 'vec3' \| 'vec4'`. |
| `UniformSetters` | `fractal-toy/renderer/formulaRegistry.ts:69` | Thin facade with `setF`, `setI`, `set2F`, `set3F`, `set4F` (`fractal-toy/renderer/formulaRegistry.ts:70-74`). |

### Renderer internals exposed for tests / direct use

| Symbol | Location | Purpose |
|---|---|---|
| `FractalEngine` | `fractal-toy/renderer/FractalEngine.ts:35` | Minimal WebGL2 renderer class — fullscreen quad, per-frame `uTime`/`uResolution`/`uFrame`, `setUniformF/I/2F/3F/4F`, `resize`, `start`, `stop`, `dispose`, readonly `canvas`. |
| `FractalEngineOptions` | `fractal-toy/renderer/FractalEngine.ts:28` | `{ onFrameEnd?: () => void }`. |
| `assembleRayMarchShader` | `fractal-toy/renderer/shaderAssembler.ts:37` | Composes the GLSL3 fragment shader: defines + headers + built-in uniforms + feature/formula uniforms + preambles + functions + active formula GLSL + raymarch body. |
| `AssembleOptions` | `fractal-toy/renderer/shaderAssembler.ts:30` | `{ formula?: FormulaDefinition }` — undefined falls back to gradient test pattern. |
| `MandelbulbFormula` | `fractal-toy/renderer/formulas/mandelbulb.ts:57` | Classic 3D Mandelbrot. Default DE (Mandelbulb log) + default escape (`2.0`). Optional Z-twist + Radiolaria mutation. |
| `MandelboxFormula` | `fractal-toy/renderer/formulas/mandelbox.ts:46` | Tglad box + sphere fold + scale. `deExpr: 'r / abs(dr)'`, `escapeRadius: 1024.0` (`fractal-toy/renderer/formulas/mandelbox.ts:53-54`). |

## Architecture

### Three-file add-on contract

The entry script documents the contract explicitly (`fractal-toy/main.tsx:9-15`):

1. `fractal-toy/registerFeatures.ts` — side-effect import that hits `featureRegistry.register` (`fractal-toy/registerFeatures.ts:28`, `:31`) and `registerFormula` (`fractal-toy/registerFeatures.ts:23-24`) BEFORE the engine store is constructed.
2. The engine store freezes the registries on first touch.
3. `setupFractalToy()` seeds panel state after React mounts (`fractal-toy/main.tsx:145`, `fractal-toy/setup.ts:11`).

Imports at `fractal-toy/main.tsx:22-23` are side-effect-only — `./registerFeatures` runs all registrations and `../engine/plugins/camera/presetField` lands its preset-field registrations module-side. These MUST precede any store-touching import (`fractal-toy/main.tsx:18-21`).

### Boot order in `main.tsx`

| Step | Line | Call |
|---|---|---|
| 1 | `fractal-toy/main.tsx:55` | `registerUI()` |
| 2 | `fractal-toy/main.tsx:63-69` | `installViewport({ enabled: true, targetFps: 30, minQuality: 0.35, interactionDownsample: 0.55, activityGraceMs: 100 })` |
| 3 | `fractal-toy/main.tsx:73` | `installTopBar()` |
| 4 | `fractal-toy/main.tsx:77` | `installPwaUpdate()` |
| 5 | `fractal-toy/main.tsx:80-82` | `installSceneIO({ getCanvas: () => fractalRenderer.getCanvas() })` |
| 6 | `fractal-toy/main.tsx:85` | `installMenu()` |
| 7 | `fractal-toy/main.tsx:89-91` | `installFractalRenderer({ onFrameEnd: () => viewport.frameTick() })` |
| 8 | `fractal-toy/main.tsx:96` | `installShortcuts()` |
| 9 | `fractal-toy/main.tsx:99` | `installUndo()` |
| 10 | `fractal-toy/main.tsx:104` | `installCamera()` |
| 11 | `fractal-toy/main.tsx:105-127` | `camera.register({ featureId: 'camera', captureState, applyState })` — wires Ctrl+1..9 / 1..9 onto orbit params |
| 12 | `fractal-toy/main.tsx:134-142` | `registerCameraKeyTracks([...])` — vec components use underscore form (`camera.target_x` etc.) to match AutoFeaturePanel readout |
| 13 | `fractal-toy/main.tsx:145` | `setupFractalToy()` |
| 14 | `fractal-toy/main.tsx:150` | Seed initial formula: `useEngineStore.setState({ formula: 'Mandelbulb' })` |
| 15 | `fractal-toy/main.tsx:157-162` | Mount `<FractalToyApp />` under React StrictMode |

### Renderer plugin

The renderer plugin is the only canvas owner. Module-scope singletons `_options`, `_installed`, `_engine` are declared at `fractal-toy/renderer/install.tsx:46-48`. `fractalRenderer.getCanvas()` returns `_engine?.canvas ?? null` (`fractal-toy/renderer/install.tsx:94`).

`_registerFormulaMenu` (`fractal-toy/renderer/install.tsx:61-89`) registers a `formula` menu (slot `left`, order 50) and a toggle item per formula. Each item writes `state.formula` directly via `setState` (`fractal-toy/renderer/install.tsx:85`) — deliberately skipping the canonical `setFormula` action to avoid GMT-era CONFIG emit + history reset side effects (`fractal-toy/renderer/install.tsx:81-86`).

`_rebuildNow` (`fractal-toy/renderer/install.tsx:112-142`):

- Resolves the active formula via `formulaRegistry.resolve(state.formula)` (`fractal-toy/renderer/install.tsx:120`).
- Runs `inject(builder, {} as any, 'Main')` for every registered feature that defines `inject` (`fractal-toy/renderer/install.tsx:126-128`).
- Calls `assembleRayMarchShader(builder, { formula })` (`fractal-toy/renderer/install.tsx:129`).
- Calls `engine.setShader(fragSrc)` (`fractal-toy/renderer/install.tsx:131`).
- Always emits `FRACTAL_EVENTS.IS_COMPILING, false` on every exit (no-engine path `fractal-toy/renderer/install.tsx:115`; compile-throw `:134`; success `:141`) and `FRACTAL_EVENTS.RESET_ACCUM` on success (`:140`).

`_pushAllUniforms` (`fractal-toy/renderer/install.tsx:146-164`): looks up active formula by `state.formula`, reads slice `state[formula.id.toLowerCase()]`, delegates to `formula.pushUniforms(_uniformSetters(engine), sliceState)`, then `_pushCamera(s.camera)` + `_pushLighting(s.lighting)`.

`_pushLighting` accepts color uniform as either `{r,g,b}` object or `'#rrggbb'` hex string, fallback white (`fractal-toy/renderer/install.tsx:188-200`).

`<FractalRendererCanvas />` boot effect (`fractal-toy/renderer/install.tsx:232-281`):

- Constructs `FractalEngine` with `onFrameEnd` defaulting to `viewport.frameTick` (`fractal-toy/renderer/install.tsx:237-239`).
- Calls `_rebuildNow()` and `engine.start()`.
- Subscribes to four slices: `s.formula` → `fractalRenderer.rebuild()` (`:253-256`); active-formula slice → push formula uniforms only (`:259-271`); `s.camera` → `_pushCamera` (`:273`); `s.lighting` → `_pushLighting` (`:274`).
- Cleanup unsubs + `engine.dispose()`.

Resize effect (`fractal-toy/renderer/install.tsx:284-293`): on `canvasPixelSize` or `quality` change, calls `engine.resize(floor(physW * quality), floor(physH * quality))` — dynamic-resolution via a smaller WebGL drawing buffer beneath a CSS-stretched canvas element.

### `FractalEngine`

WebGL2-only with `{ antialias: false, alpha: false, preserveDrawingBuffer: true }` (`fractal-toy/renderer/FractalEngine.ts:49`). `preserveDrawingBuffer: true` is required for PNG export (SceneIO `readPixels`) and Playwright smoke tests (`fractal-toy/renderer/FractalEngine.ts:46-48`).

`setShader` (`fractal-toy/renderer/FractalEngine.ts:57-81`): compiles VS + FS, calls `gl.bindAttribLocation(prog, 0, 'aPosition')` BEFORE linking (`:68`) so the cached VAO at location 0 binds correctly, links, deletes shaders, then `cacheUniforms()` (`:80`).

`cacheUniforms` (`fractal-toy/renderer/FractalEngine.ts:151-164`) strips any trailing `[0]` from uniform names (`:160`) so callers can address array uniforms by base name.

Per-frame `render` (`fractal-toy/renderer/FractalEngine.ts:118-141`): clears, sets `uTime` (seconds since `startTime`), `uResolution` (canvas px), `uFrame` (integer counter), draws 6-vertex quad, calls `onFrameEnd?.()`.

### `formulaRegistry`

`registerFormula` (`fractal-toy/renderer/formulaRegistry.ts:84-119`):

- Throws on duplicate id (`fractal-toy/renderer/formulaRegistry.ts:85-87`).
- Stores in module-scope `_formulas` map (`fractal-toy/renderer/formulaRegistry.ts:88`).
- Auto-lifts params into `featureRegistry` with `id: def.id.toLowerCase()`, `category: 'Fractal'`, and NO `inject` (formula GLSL goes via the assembler path, not the generic inject sweep) (`fractal-toy/renderer/formulaRegistry.ts:93-103`).
- Adds a panel via `addPanel({ id: def.name, dock: 'right', order: 0, active: true, features: [featureId] })` if no panel definition already exists (`fractal-toy/renderer/formulaRegistry.ts:110-118`).

`formulaRegistry.resolve(activeId)` falls back to the first registered formula when `activeId` is empty or unknown (`fractal-toy/renderer/formulaRegistry.ts:127-131`).

### `assembleRayMarchShader`

Composes a `#version 300 es` fragment shader (`fractal-toy/renderer/shaderAssembler.ts:60-88`):

1. Builder-declared formula uniforms via `builder.addUniform` (idempotent on `(name, type)`) (`fractal-toy/renderer/shaderAssembler.ts:42-46`).
2. Built-in uniforms hard-coded — `uTime`, `uResolution`, `uFrame` (`fractal-toy/renderer/shaderAssembler.ts:67-70`).
3. Feature/formula uniforms block, preambles, functions, then the active formula's `glsl` block (`fractal-toy/renderer/shaderAssembler.ts:73-80`).
4. `RAYMARCH_BODY(formulaCall, deExpr, escapeRadius)` (`fractal-toy/renderer/shaderAssembler.ts:107-216`) — pinhole camera from orbit angles + `uCamDistance` + `uCamTarget` + `uCamFov`; `MAX_STEPS=200`, `MAX_DIST=20.0`, `HIT_EPS=0.001` (`fractal-toy/renderer/shaderAssembler.ts:137-139`); step factor 0.9 (`:159`); inner iteration loop hard-bounded to literal `32` iters (`:149`, `:171`, `:182`, `:193`), guarded by `uIterations`; templated `deExpr` defaults to `'0.5 * log(max(r, 1e-8)) * r / dr'` (`:54`).
5. Finite-difference normal via three additional inner-loop replays at `hStep = 0.002` (`fractal-toy/renderer/shaderAssembler.ts:166-200`).
6. Lambert + ambient + step-count AO + gamma 2.2 (`fractal-toy/renderer/shaderAssembler.ts:202-214`).

When `options.formula` is undefined, the body falls back to a gradient test pattern (`fractal-toy/renderer/shaderAssembler.ts:56-58`, `:92-96`).

### Formulas

| Formula | DE | Escape | Notable |
|---|---|---|---|
| `MandelbulbFormula` | default Mandelbulb log-DE | default `2.0` | Power, phase θ/φ, optional Z-twist, Radiolaria gated by `uRadiolariaEnabled > 0.5` (`fractal-toy/renderer/formulas/mandelbulb.ts:49`). |
| `MandelboxFormula` | `'r / abs(dr)'` | `1024.0` | Box fold + sphere fold + scale inline; no shared GLSL helpers (`fractal-toy/renderer/formulas/mandelbox.ts:17-44`). |

## Invariants

- **Single canvas owner.** `_engine`, `_options`, `_installed` are module-level singletons (`fractal-toy/renderer/install.tsx:46-48`). Only one `<FractalRendererCanvas />` can be mounted; multiple roots would race the singleton.
- **No-install warning, not throw.** `<FractalRendererCanvas />` `console.warn`s when rendered without `installFractalRenderer()` having run; frame telemetry is then missing (`fractal-toy/renderer/install.tsx:220-222`).
- **Formula menu bypasses `setFormula`.** Items write `state.formula` directly via `setState` to skip GMT-era CONFIG emit + history reset; the Canvas subscription is solely responsible for rebuilding (`fractal-toy/renderer/install.tsx:79-87`).
- **`IS_COMPILING:false` always fires.** Even on the no-engine + compile-throw paths, so the spinner cannot get stuck. The stub `WorkerProxy` never replies with `CONFIG_DONE`, so the renderer signals completion itself (`fractal-toy/renderer/install.tsx:106-111`, `:115`, `:134`, `:141`).
- **Unsafe-cast empty config arg to feature `inject`.** `_rebuildNow` passes `{} as any` as the config to every feature's `inject` (`fractal-toy/renderer/install.tsx:127`). Features must not rely on the config argument here.
- **Duplicate formula id throws.** `registerFormula` rejects collisions on literal `def.id` (`fractal-toy/renderer/formulaRegistry.ts:85-87`), but two formula ids that differ only in case would lowercase to the same feature id silently (`:93`).
- **First-registered formula wins as default active tab.** Static manifest does not mark Camera/Lighting `active`, so the formula's auto-added panel claims the dock's active tab (`fractal-toy/renderer/formulaRegistry.ts:107-117`, `fractal-toy/panels.ts:11-14`).
- **Resolver fallback.** `formulaRegistry.resolve('')` returns the first registered formula — Mandelbulb (`fractal-toy/renderer/formulaRegistry.ts:127-131`). A transient cold-boot still pushes Mandelbulb uniforms.
- **Inner GLSL loop hard-bounded to 32.** The literal `32` at four sites (`fractal-toy/renderer/shaderAssembler.ts:149`, `:171`, `:182`, `:193`) is the ceiling; `uIterations` only narrows it. Both formulas' `iterations` param `max: 32` (`fractal-toy/renderer/formulas/mandelbulb.ts:73`, `fractal-toy/renderer/formulas/mandelbox.ts:63`) — raising those silently saturates.
- **Radiolaria as float-threshold.** `boolean` param is pushed as `1.0`/`0.0` and tested in GLSL as `> 0.5` (`fractal-toy/renderer/formulas/mandelbulb.ts:87`, `:49`).
- **Lighting color dual ingest.** `{r,g,b}` object OR `'#rrggbb'` string (`fractal-toy/renderer/install.tsx:188-200`); the `LightingFeature` param is `type: 'color'`, default `'#ffffff'` (`fractal-toy/features/lighting.ts:27`).
- **Camera ray builder lives in the assembler, not `CameraFeature.inject`.** Deliberate — camera math is pipeline-level, not per-formula (`fractal-toy/features/camera.ts:11-14`).
- **VAO location-0 bind.** `gl.bindAttribLocation(prog, 0, 'aPosition')` MUST precede `linkProgram` because the cached VAO uses location 0 (`fractal-toy/renderer/FractalEngine.ts:68`, `:178`).
- **`cacheUniforms` strips `[0]`** so callers address arrays by base name (`fractal-toy/renderer/FractalEngine.ts:160`). No current formula uses arrays.
- **Dev-only SW purge.** `import.meta.env.DEV` unregisters service workers + purges caches left by `npm run preview` (`fractal-toy/main.tsx:43-52`).
- **Sub-pixel resize is a no-op.** `FractalEngine.resize` early-returns when `widthPx < 1 || heightPx < 1` (`fractal-toy/renderer/FractalEngine.ts:90`).
- **No-program render.** If `setShader` throws during compile, the old program has already been deleted (`fractal-toy/renderer/FractalEngine.ts:59`); subsequent `render()` calls are no-ops via the `this.program` guard (`:120`).

## Interactions with other subsystems

- **e01-feature-system** — Registers `CameraFeature` + `LightingFeature` (`fractal-toy/registerFeatures.ts:28`, `:31`) and auto-lifts every formula's params into `featureRegistry` (`fractal-toy/renderer/formulaRegistry.ts:103`). Reads `featureRegistry.getAll()` in `_rebuildNow` to apply each feature's `inject` (`fractal-toy/renderer/install.tsx:126-128`), and `featureRegistry.getViewportOverlays()` to mount DOM overlays in `DomOverlays` (`fractal-toy/FractalToyApp.tsx:34-47`).
- **e04-shader-builder** — Constructs a `ShaderBuilder('Main')` per rebuild (`fractal-toy/renderer/install.tsx:125`); the assembler reads defines/uniforms/headers/preambles/functions blocks (`fractal-toy/renderer/shaderAssembler.ts:48-52`) and relies on `addUniform` being idempotent on `(name, type)` (`fractal-toy/renderer/shaderAssembler.ts:16-18`).
- **e06-adaptive-resolution** — Installs `@engine/viewport` at boot with raymarching-tuned defaults (`fractal-toy/main.tsx:63-69`). Default `onFrameEnd` is `viewport.frameTick()` (`fractal-toy/renderer/install.tsx:238`). Canvas resize multiplies physical pixels by `useQualityFraction()` (`fractal-toy/renderer/install.tsx:284-293`).
- **e07-plugins-host** — Installs `installTopBar`, `installPwaUpdate`, `installSceneIO`, `installMenu`, `installCamera`, `installShortcuts`, `installUndo`, `installFractalRenderer` (`fractal-toy/main.tsx:73-104`). `installSceneIO` is wired with `getCanvas: () => fractalRenderer.getCanvas()` (`fractal-toy/main.tsx:80-82`). The formula dropdown is registered via the menu plugin (`fractal-toy/renderer/install.tsx:62-70`).
- **e08-shortcuts-undo** — `installShortcuts` + `installUndo` are wired during boot (`fractal-toy/main.tsx:96`, `:99`); the `FRACTAL_EVENTS.RESET_ACCUM` emit on rebuild is the renderer's signal back into the shared event bus (`fractal-toy/renderer/install.tsx:140`).
- **e09-camera-plugin** — `camera.register({ featureId: 'camera', captureState, applyState })` adapts the `state.camera` orbit slice into Ctrl+1..9 save / 1..9 recall (`fractal-toy/main.tsx:105-127`). `registerCameraKeyTracks([...])` declares the 4-DOF camera as Key Cam's capture set (`fractal-toy/main.tsx:134-142`).

## Known issues / Phase 2 carry-in

No entries for `t02-fractal-toy` exist in `plans/doc-audit-state/phase-2-carry-in.json` `by_subsystem`. The 14 files in the secondary survey were all flagged as orphan-sweep candidates with no break-severity drift rows. Open observations carried forward from the survey:

- Inner GLSL loop literal `32` cap silently saturates if any formula raises its `iterations` param `max` above 32 (`fractal-toy/renderer/shaderAssembler.ts:149`, `fractal-toy/renderer/formulas/mandelbulb.ts:73`, `fractal-toy/renderer/formulas/mandelbox.ts:63`).
- Case-only-distinct formula ids would collide on the auto-lifted feature id (`fractal-toy/renderer/formulaRegistry.ts:93`) with no explicit check beyond the literal-id dedupe in `_formulas` (`fractal-toy/renderer/formulaRegistry.ts:85-88`).
- `_rebuildNow` passes `{} as any` as the per-feature `inject` config (`fractal-toy/renderer/install.tsx:127`). Any future fractal-toy feature that reads its config arg would silently break.

## Historical context

The in-source rationale comments are the canonical narrative:

- `fractal-toy/main.tsx:1-15` documents the app as "the nucleus of the eventual full GMT port and the second live consumer of the engine's plugin surface (alongside the Demo add-on and the future toy-fluid port)" and spells out the three-file add-on contract.
- `fractal-toy/renderer/FractalEngine.ts:12-16` explicitly enumerates what this engine class is NOT — "no MRT, no accumulation, no ping-pong, no convergence, no path tracing, no history buffers. All of that lands when the minimal rendering is proven and we tackle the full GMT port."
- `fractal-toy/renderer/formulaRegistry.ts:17-22` records the rationale for keeping formulas in their own registry (mutually exclusive, carry their own GLSL function, only one panel visible at a time) rather than the DDFS feature registry.
- `fractal-toy/renderer/install.tsx:16-20` flags that the worker-mode renderer (future) will ship beside this folder with the same export shape so apps swap renderers at import time only.
- `fractal-toy/features/lighting.ts:8-12` notes that GMT's full lighting feature (multiple lights, shadows, specular, environment maps) will live in a future plugin; the minimal version here exists to make the Mandelbulb legible and prove the DDFS-feature pattern extends to color params.
- `fractal-toy/renderer/formulas/mandelbulb.ts:1-12` describes the file as a verbatim port of GMT's `formulas/Mandelbulb.ts` with feature-owned uniform names instead of the generic `uParamA`/`uVec2A` GMT convention (justified by fractal-toy needing only two formulas).
