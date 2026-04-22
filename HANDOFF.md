# gmt-engine — Session Handoff

**Location:** `h:/GMT/gmt-engine/`
**Origin:** Forked from `h:/GMT/gmt-0.8.5` (kept as `upstream` remote)
**Status:** ✅ **Engine is runnable and verified end-to-end.** `npx tsc --noEmit` → 0 errors. `PORT=3400 npm run dev` serves a working shell. A Demo add-on plugs in via the documented contract, proving DDFS + auto-panel + overlay + save/load all round-trip correctly.

**📐 Architecture baseline committed (2026-04-22).** 12 engine-scope docs written under `docs/01_*` through `docs/20_*`. Start any session with `docs/DOCS_INDEX.md`; the table in `CLAUDE.md` maps "working on X" → "read Y". All design decisions (core+plugins model, feature isolation, unified undo, auto-binding animation, bridges/derived) live in those docs. Any architectural change goes in a doc before it goes in code.

## What this is

An experiment in extracting a reusable application engine (DDFS + animation + UI framework + save/load + worker stub + shader assembly) from GMT. The first goal is to port toy-fluid onto this engine as a proof, then eventually rebuild GMT's raymarching pipeline on top as a plugin.

**Core principle:** strip fractal/raymarching content, preserve every generic pattern with plugin seams so the stripped capabilities can be re-introduced cleanly later.

## Current tree

```
engine/           FeatureSystem, FractalEvents, TickRegistry, AnimationEngine,
                  BezierMath, UniformSchema, UniformNames, HardwareDetection,
                  ShaderBuilder (generic 5-primitive + addSection),
                  ShaderFactory (generic, iterates features), ConfigManager
                  (generic DDFS diffing), ConfigDefaults (generic),
                  RenderPipeline (ping-pong + accumulation), BloomPass,
                  worker/ (WorkerProxy STUB + ViewportRefs), codec/,
                  algorithms/, math/, utils/

store/            fractalStore (generic composition shell, 260 lines),
                  createFeatureSlice, CompileGate, animationStore,
                  animation/, slices/ (ui, renderer, history — generic)

utils/            colorUtils, pngMetadata, fileUtils, helpUtils, CurveFitting,
                  ConstrainedSmoothing, GraphUtils + GraphRenderer (animation
                  keyframe curve editor), keyframeViewBounds, timelineUtils
                  (generic), PresetLogic (generic), Sharing, UrlStateEncoder,
                  histogramUtils

features/         index, types, ui, audioMod, modulation, webcam, debug_tools,
                  color_grading, post_effects
                  — all generic. Fractal-leaning features (camera_manager,
                  coloring, navigation, optics, droste, drawing) deleted.

components/       App shell (App.tsx, LoadingScreen, ViewportArea generic),
                  primitives (Slider, Knob, Dropdown, ToggleSwitch, TabBar,
                  Popover, CollapsibleSection, PanelHeader, StatusDot, etc.),
                  inputs/, vector-input/, pickers, gradient/, timeline/
                  (DopeSheet, KeyframeInspector, TrackRow, minimal
                  TimelineToolbar stub), graph/ (animation keyframe curve
                  editor), layout/ (Dock, DropZones), viewport/ (Composition
                  Overlay, FixedResolutionControls), AutoFeaturePanel,
                  CompilableFeatureSection, PanelRouter, AnimationSystem,
                  KeyframeButton, Histogram, ParameterSelector,
                  PopupSliderSystem, DraggableWindow, ComponentRegistry,
                  GlobalContextMenu, HelpBrowser, CompilingIndicator,
                  MobileControls, PerformanceMonitor,
                  contexts/StoreCallbacksContext

toy-fluid/        Kept as reference; first port target

docs/             Preserved as reference (all fractal-documented — read-only
                  for patterns, don't treat as engine truth)

HANDOFF.md        This doc
```

## What's done

**Git history on top of GMT (15 commits):**

1–11. Delete-by-domain stages (formulas, mesh export, Fragmentarium, raymarching shader chunks, fractal DDFS features, fractal engine internals, modular graph, prototypes/test harnesses, misc ephemera, fractal UI, 4 truly fractal files).

12. Genericize stage — ShaderBuilder rewritten to 5 generic primitives + `addSection`, ShaderFactory/ConfigManager/historySlice/fractalStore/PresetLogic all stripped to their generic kernel. FractalEngine, MaterialController, SceneController, UniformManager, controllers/, overlay/, FormulaFormat, remaining shader chunks deleted.

13. **Fix pass to zero tsc errors** — deleted remaining fractal-leaning features (camera_manager, coloring, navigation, optics, droste, drawing), stubbed the worker subsystem (WorkerProxy as in-memory stub; internals deleted), rewrote App/LoadingScreen/ViewportArea/useAppStartup as minimal generic shells, property-access-cast all downstream feature consumers, fixed type mismatches (QualityState typed numerics, WorkerProxy overloads, Timeline onZoom, registry stub shape).

**Verified:** `npx tsc --noEmit` exits 0.

## Plugin seams designed in

Where a future fractal plugin (or any other app) re-installs its capabilities:

| Capability | Re-entry via |
|-----------|--------------|
| Named shader pipeline stages (post-map, miss-handler, integrator, …) | `ShaderBuilder.addSection(name, code)` + `getSections(name)` — plugin registers its pipeline DSL, its own assembler reads sections back |
| Feature state (any shape) | `FeatureRegistry.register(def)` + generic `createFeatureSlice` auto-generates Zustand slice + `AutoFeaturePanel` auto-generates UI |
| Render engine / render loop | Not supplied by engine. App instantiates its own, consuming the store + the shader built by ShaderFactory |
| Worker offload | `WorkerProxy` is an in-memory stub. Apps subclass or replace the singleton with a Worker-backed implementation |
| Compile scheduling | `CompileGate.queue(msg, fn)` — generic two-phase trigger with spinner |
| Config diffing | `ConfigManager.update(newConfig, runtimeState)` → `{rebuildNeeded, uniformUpdate, modeChanged, needsAccumReset}` |
| Preset save/load | `PresetLogic.applyPresetState` iterates feature registry + invokes feature setters. `utils/pngMetadata` for PNG embed. `utils/Sharing` + `UrlStateEncoder` for URL state |
| Undo/redo | `historySlice` — snapshots ALL feature state via registry iteration, automatic for any future plugin |
| Animation engine | `engine/AnimationEngine.ts` with `connect(animStore, hostStore)` injection; no direct store coupling |
| TickRegistry phases | SNAPSHOT → ANIMATE → OVERLAY → UI |
| UI componentRegistry | Apps register panel + overlay components by string ID; DDFS feature defs reference them |
| Custom camera controller | Not supplied. Apps install their own Navigation component |
| FormulaType | `type FormulaType = string` — apps narrow via declaration merging |
| ShaderConfig | `Record<string, any>` with engine-level scalar fields — apps widen via declaration merging |

## Remaining work before toy-fluid port

**✅ Done (stages 14 + 15, 2026-04-22):**
- Feature-residuals cleaned.
- SceneFormat.ts — generic save/load (JSON + PNG-iTXt + URL).
- Default panel config genericized.
- Runtime boot verified — engine serves a clean shell, `debug/smoke-boot.mts` passes.
- **PanelId widened to `string`** + **AutoFeaturePanel registered as `'auto-feature-panel'`** — any add-on can now register a feature with an auto-generated panel.
- **Demo add-on** (`demo/` folder) proves the three-step add-on contract: `registerFeatures.ts` → store construction → `setup.ts`. Cyan square in viewport, auto-generated panel with Color/Position/Size/Opacity controls.
- **State flow verified** via `debug/smoke-interact.mts`: state slice exists, auto-generated `setDemo` propagates, `getPreset()` round-trips.

**Not needed for toy-fluid (deferred or dropped):**
- RenderEngine — toy-fluid brings its own `FluidEngine` with its own canvas + WebGL + sim loop. The engine's role is pure framework (DDFS + UI + save/load + animation). If/when another app needs a shared render engine, build it then.

**✅ Done (2026-04-22) — the four toy-fluid-blocking fragility fixes landed:**
- **F1** (commit 96a4b5f) — `featureRegistry.freeze()` in `createFeatureSlice`; dev-throw on late registration, prod-warn+no-op.
- **F2** (commit 96a4b5f) — `DuplicateFeatureError` thrown in prod; HMR-same-def is a no-op, HMR-different-def warns+replaces in dev.
- **F3** (commit a4e7d6b) — `utils/PresetFieldRegistry.ts` + `utils/defaultPresetFields.ts`; `PresetLogic`/`getPreset` iterate the registry instead of hardcoded `savedCameras`/`cameraRot`/`targetDistance`.
- **F4** (commit c6ee640) — `engine/plugins/RenderLoop.tsx` provides `<RenderLoopDriver />`, mounted in `App.tsx`; `TickRegistry` warns in dev if 3s pass after first `registerTick()` without any `runTicks()`.

All four fixes verified via `npm run typecheck` (0 errors) + `smoke:boot` (no pageerrors) + `smoke:interact` (state round-trip passes).

**Next session — toy-fluid port itself (direct copy of the Demo add-on pattern):**

Study `demo/README.md` + `docs/03_Plugin_Contract.md` — they document the three-step contract toy-fluid follows. Concretely:

1. **Define DDFS features** that replace toy-fluid's React `useState`:
   - `fluidSim` — simResolution, viscosity, dissipation, autoQuality, kind, forceMode
   - `julia` — juliaC (vec2), zoom, center (vec2), orbit (enabled/radius/speed)
   - `dye` — gradient, collisionGradient
   - `sceneCamera` — pan/zoom

2. **`toy-fluid/registerFeatures.ts`** — side-effect module that imports `featureRegistry` + `componentRegistry` and registers all features + viewport overlay. Imported at the TOP of `toy-fluid.html`'s entry (before anything touches the store).

3. **`toy-fluid/setup.ts`** — `wireToyFluidPanels()` seeds panel state via `movePanel(...)`.

4. **Mount FluidEngine**: register a `'dom'` viewport overlay that renders a `<canvas>` and attaches the existing `FluidEngine` instance to it. Read params from the store via `useFractalStore(s => s.fluidSim)` etc.

5. **Rewrite `toy-fluid/savedState.ts`** as thin wrappers over `utils/SceneFormat.ts`: `downloadSceneJson`, `downloadScenePng`, `loadSceneFromFile` are all there.

6. **TopBar**: either add a toy-fluid-owned top bar component mounted in its own entry (`toy-fluid.html` already exists), or keep the engine's App.tsx shell and add a minimal toy-fluid TopBar.

**Deferred — rename pass.** Once the toy-fluid port proves the shape, do the one-shot rename: `fractalStore` → `engineStore`, `useFractalStore` → `useEngineStore`, `FractalEvents` → `EngineEvents`, `FractalStoreState`/`FractalActions` → `EngineStoreState`/`EngineActions`, file `store/fractalStore.ts` → `store/engineStore.ts`. Single commit.

## How to resume

```bash
cd h:/GMT/gmt-engine
git log --oneline -20          # full stage progression
npm run typecheck              # should exit 0
npm run dev                    # plain vite on localhost:3400

# In another shell — smoke checks:
npm run smoke:boot             # headless boot, fail on pageerrors
npm run smoke:interact         # state-flow + save round-trip
npm run smoke:screenshot       # visual baseline → debug/scratch/engine-boot.png
```

Note: the `dev` script is now plain `vite`. GMT's custom Express
`server/server.js` was removed in stage 16 — it ran Vite in
middleware mode without attaching HMR to the HTTP server, which
caused full-page reloads every 1-2s. Plain `vite` works out of
the box.

The `upstream` remote points at GMT. Pull updates with `git fetch upstream`. There is no `origin` — nothing pushes anywhere until you add one.

If the experiment turns out not to work: `rm -rf h:/GMT/gmt-engine`. GMT is untouched.

## Key memory references

- `memory/feedback_refactor_approach_selection.md` — why clone-and-strip beat in-place workspace refactor
- `memory/feedback_strip_vs_delete.md` — when to genericize vs delete (generic patterns worth preserving even when fractal-coupled)
- `memory/project_gmt_engine_extraction.md` — pointer to this repo + HANDOFF.md
