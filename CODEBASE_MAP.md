# Codebase Map

One-glance guide to what's where. Complement to [`docs/DOCS_INDEX.md`](docs/DOCS_INDEX.md) (which maps docs) — this file maps *code*.

## The three buckets

1. **Engine core** — generic, shared plumbing. Touched by every app.
2. **Base plugins** — opt-in core plugins shipped with the engine. Live inside the engine.
3. **App-specific** — code that belongs to a single app and can be deleted when that app is retired.

## Top-level tour

```
gmt-engine/
│
├── engine/                       🔧 ENGINE CORE + BASE PLUGINS
│   ├── FeatureSystem.ts            DDFS registry, feature definition, freeze semantics
│   ├── RenderPipeline.ts           shared render-pass orchestrator
│   ├── ShaderBuilder.ts            shader composition (used by shader-based apps)
│   ├── ShaderFactory.ts            GLSL generation from feature configs
│   ├── AnimationEngine.ts          keyframe interpolation core
│   ├── BloomPass.ts                shared bloom FBO pass
│   ├── TickRegistry.ts             phase-based tick orchestrator
│   ├── FractalEvents.ts            pub/sub for engine-level events
│   ├── HardwareDetection.ts        WebGL caps probe
│   ├── UniformNames.ts             canonical uniform names
│   ├── UniformSchema.ts            feature uniforms map
│   ├── ConfigDefaults.ts           defaults that features can merge
│   ├── BezierMath.ts               spline math (animation, gradients)
│   ├── appHandles.ts               defineAppHandles<T> — typed cross-tree state
│   ├── applyDefaultPanelLayout.ts  app setup helper — dock panels by tabConfig
│   ├── defineEnumParam.ts          DDFS enum-param helper
│   ├── migrations.ts               @engine/migrations — preset-load slice migrations
│   ├── typedSlices.ts              typed useSlice/setSlice/getSlice/subscribeSlice
│   │
│   ├── plugins/                  ⚙️ BASE PLUGINS (opt-in at install time)
│   │   ├── Camera.ts               slot-based camera with preset round-trip
│   │   ├── Help.tsx                ? menu + Show Hints toggle + HudHint API
│   │   ├── Hud.tsx                 slot-based overlay host
│   │   ├── Menu.tsx                generic dropdown menus in topbar
│   │   ├── RenderLoop.tsx          <RenderLoopDriver /> RAF wrapper
│   │   ├── SceneIO.tsx             save/load/share — JSON, PNG, URL
│   │   ├── Shortcuts.ts            keyboard registry, scopes, priority
│   │   ├── TopBar.tsx              slot-based topbar chrome
│   │   ├── Undo.tsx                unified transaction stack
│   │   ├── Viewport.tsx            adaptive quality, DPR, fixed-res, size modes
│   │   └── {camera,topbar,viewport}/  plugin-specific sub-components
│   │
│   ├── features/                 🎛️  ENGINE-BUNDLED DDFS FEATURES
│   │   ├── audioMod/               AudioFeature — reactive to microphone
│   │   ├── modulation/             ModulationFeature — LFO/driver targets
│   │   ├── webcam/                 WebcamFeature — camera texture
│   │   ├── debug_tools/            DebugToolsFeature — dev overlays
│   │   ├── post_effects.ts         generic bloom / aberration / caustics
│   │   ├── color_grading.ts        generic exposure / vibrance / tone-map
│   │   ├── ui.tsx                  componentRegistry → AutoFeaturePanel registration
│   │   ├── types.ts                FeatureStateMap etc.
│   │   └── index.ts                registerFeatures() — call at app boot
│   │
│   ├── animation/                  AnimationSystem tick (ex-legacy), binder registry, camera keys
│   ├── algorithms/                 track utilities
│   ├── codec/                      video export types, Halton sampler
│   ├── managers/                   ConfigManager
│   ├── math/                       AnimationMath
│   ├── utils/                      FullscreenQuad
│   └── worker/                     ViewportRefs, WorkerProxy (worker-mode hooks)
│
├── components/                   🎨 ENGINE CORE — SHARED UI PRIMITIVES
│   ├── Slider, Knob, Button, Dropdown, ToggleSwitch, …      Pure input primitives
│   ├── AutoFeaturePanel.tsx        auto-generated panel from DDFS params
│   ├── PanelRouter.tsx             tab → feature panel routing (+ aggregatesFrom)
│   ├── Dock / DraggableWindow / DropZones                    Dock/float layout
│   ├── AdvancedGradientEditor                                Gradient UI (engine primitive)
│   ├── GraphEditor, Timeline, HelpBrowser, ContextMenu       Richer shared surfaces
│   └── registry/ContextRegistry / {gradient,graph,timeline,inputs,vector-input,viewport,widgets}/
│
├── store/                        🗄️ ENGINE CORE — SHARED STATE
│   ├── engineStore.ts              primary Zustand store
│   ├── createFeatureSlice.ts       DDFS → slice + setter generator
│   ├── CompileGate.ts              progress indicator for long ops
│   ├── slices/                     ui, renderControl (ex-legacy), viewport, history
│   └── animation/                  playback, selection, sequence slices
│
├── hooks/                        🪝 ENGINE CORE — SHARED HOOKS (useMobileLayout, useGlobalContextMenu, …)
├── utils/                        🧰 ENGINE CORE — SceneFormat, PresetLogic, Sharing, colorUtils, …
├── types/                        🔠 ENGINE CORE — shared TS types
├── data/                         📊 ENGINE CORE — constants, gradient presets, theme, blue noise
├── shaders/                      ⚡ ENGINE CORE — shared GLSL chunks (vertex, blue noise, uniforms)
│
├── fluid-toy/                    🌊 APP — Julia ↔ fluid coupling
│   ├── fluid/                      app-specific FluidEngine + shaders (not shared)
│   ├── features/                   app DDFS: julia, coupling, palette, collision, fluidSim, postFx, composite, brush, presets
│   ├── brush/                      app module: color, particles, emitter
│   ├── components/                 app-specific UI: HotkeysCheatsheet, JuliaCPicker, MandelbrotPicker, …
│   ├── presets/                    preset data + apply (slice-translation)
│   ├── storeTypes.ts               typed-slice augmentation for AppFeatureSlices
│   ├── migrations.ts               app-specific slice migrations
│   ├── engineHandles.ts            appEngine / brushHandles / cursorHandles (defineAppHandles)
│   └── FluidToyApp.tsx + FluidPointerLayer.tsx + main.tsx + wiring
│
├── fractal-toy/                  🔮 APP — raymarcher (Mandelbulb + Mandelbox)
│   ├── renderer/                   renderer PLUGIN (installFractalRenderer + Canvas)
│   │   ├── FractalEngine.ts          main-thread WebGL2 engine
│   │   ├── shaderAssembler.ts        formula-aware GLSL composition
│   │   ├── formulaRegistry.ts        GMT-shaped formula table + DDFS auto-lift
│   │   ├── formulas/                 mandelbulb, mandelbox
│   │   └── install.tsx               install + Canvas component + Formula menu
│   ├── features/                   generic features: camera, lighting
│   └── FractalToyApp.tsx + main.tsx + wiring
│
├── engine-gmt/                   🎨 GMT PLUGIN LIBRARY — the real GMT raymarcher + its plugins
│   ├── engine/                     ported verbatim from GMT's engine/
│   │   ├── FractalEngine.ts          + MaterialController, PrecisionMath, SceneController,
│   │   │                             ShaderFactory, RenderPipeline, UniformManager, ConfigManager,
│   │   │                             SDFShaderBuilder, FractalRegistry, BucketRenderer, …
│   │   ├── worker/                   renderWorker + WorkerProxy + WorkerProtocol + WorkerExporter +
│   │   │                             WorkerHistogram + WorkerDepthReadback + ViewportRefs
│   │   ├── controllers/              CameraController + PickingController
│   │   ├── managers/                 UniformManager + ConfigManager
│   │   └── utils/, codec/, algorithms/, math/, overlay/
│   ├── renderer/                   PLUGIN wrapper
│   │   ├── install.ts                installGmtRenderer() + gmtRenderer handle
│   │   ├── GmtRendererCanvas.tsx     (ex-WorkerDisplay) — DOM canvas + initWorkerMode
│   │   ├── GmtRendererTickDriver.tsx (ex-WorkerTickScene) — useFrame → sendRenderTick
│   │   └── bindings.ts               generic renderControlSlice → GMT worker/lighting/uniform side effects
│   ├── navigation/                 GMT camera nav — verbatim port (Orbit + Fly + HUD + physics probe)
│   │   ├── Navigation.tsx            (ex-components/Navigation.tsx) — R3F scene input + absorb
│   │   ├── useInputController.ts     keyboard + pointer + joystick handler
│   │   ├── usePhysicsProbe.ts        depth-readback → lastMeasuredDistance (DST readout)
│   │   ├── HudOverlay.tsx            DST/SPD/reticle/reset-button DOM overlay
│   │   └── index.ts                  barrel — GmtNavigation, GmtNavigationHud
│   ├── features/                   GMT-specific DDFS features (26 features registered)
│   ├── formulas/                   42 FractalDefinitions
│   ├── shaders/                    GMT GLSL chunks (coloring, de, lighting/shading, main, …)
│   ├── types/                      GMT-specific types (FractalDefinition etc.) + index barrel
│   ├── utils/                      GMT-specific: FormulaFormat, GraphCompiler
│   ├── data/                       GMT-specific: initialPipelines
│   ├── storeTypes.ts               declaration-merges GMT slices into root FeatureStateMap
│   ├── tsconfig.json               isolated typecheck (TSX panels excluded pending Phase E UI port)
│   └── index.ts                    public API barrel
│
├── app-gmt/                       🕰️ APP — GMT's application (uses engine-gmt + engine/)
│   ├── AppGmt.tsx                   full layout: TopBar + Dock + ViewportFrame + HUD + Canvas + Navigation
│   └── main.tsx                     registers GMT features + plugins + boots renderer
│
├── demo/                         📦 sample plugin add-on (used by the legacy root app)
│
├── fluid-toy.html                🚪 app entry
├── fractal-toy.html              🚪 app entry
├── app-gmt.html                  🚪 GMT app entry
├── index.html + App.tsx + index.tsx + index.css    🚪 legacy pre-extraction root (preserved, unused)
│
├── public/                       📁 static assets (favicons, icons, webmanifest, blue-noise PNG)
├── debug/                        🧪 Playwright smoke tests + helpers/webglHarness.ts
└── docs/                         📚 docs split into engine/ and gmt/ subdirs — see DOCS_INDEX.md
```

## Heuristics for "where does this go?"

| New thing | Location |
|---|---|
| Generic UI primitive usable by any app | `components/` |
| Shared utility function (not UI) | `utils/` |
| Shared TS type | `types/` |
| Generic DDFS feature (audio, webcam, modulation, …) | `engine/features/` |
| New core plugin (opt-in, slot-based) | `engine/plugins/` — follow `docs/engine/11_Plugin_Authoring.md` |
| App-specific UI | `<app>/components/` |
| App-specific DDFS feature | `<app>/features/` |
| App cross-tree singleton state | `<app>/<name>Handles.ts` — use `defineAppHandles<T>()` |
| App preset-load migration | `<app>/migrations.ts` — register via `engine/migrations.ts` |

## Rules

- **App code must not be imported by engine code.** `engine/**`, `components/**`, `store/**`, `utils/**`, `hooks/**`, `types/**`, `data/**`, `shaders/**` must never `import '../fluid-toy/…'` or `'../fractal-toy/…'`. Apps import from shared, not the other way around.
- **Engine features are generic.** Anything in `engine/features/` must work independently of any specific app. App-specific features live under `<app>/features/` instead.
- **Plugin authoring pattern:** see [`docs/engine/11_Plugin_Authoring.md`](docs/engine/11_Plugin_Authoring.md) for the four-part shape every plugin follows.
- **Cross-tree state:** see [`docs/engine/12_App_Handles.md`](docs/engine/12_App_Handles.md) for `defineAppHandles<T>()` — avoid growing grab-bag singletons.
