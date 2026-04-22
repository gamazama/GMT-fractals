# gmt-engine — Session Handoff

**Location:** `h:/GMT/gmt-engine/`
**Origin:** Forked from `h:/GMT/gmt-0.8.5` (kept as `upstream` remote)
**Status:** ✅ **Engine skeleton fully type-checks.** `npx tsc --noEmit` → 0 errors.

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

**Priority 1 — Decide what to do about feature-residuals.** Components like PerformanceMonitor, AnimationSystem, PopupSliderSystem still have `(state as any).coreMath` style reads that return undefined at runtime (no coreMath feature exists anymore). They compile but do nothing. Either:
- (a) leave them — they become active when a plugin registers `coreMath`
- (b) rewrite the components to not assume specific feature names
- (c) delete the components and apps rebuild as plugins

**Priority 2 — Minimal render engine.** Currently the engine has no render loop. ShaderFactory produces a GLSL string but nothing runs it. Write a thin `RenderEngine` class (~200 lines) that:
- Creates a WebGL2 context on a provided canvas
- Compiles the shader from ShaderFactory
- Ticks per frame, calling a plugin-provided `onRender(gl, uniforms)` hook
- Swaps framebuffers for accumulation
Apps that want richer rendering install their own; this is the shared baseline.

**Priority 3 — Port toy-fluid.** The real proof. Success metric: toy-fluid runs via DDFS-driven UI + save/load + animation + URL sharing, with LoC comparable or smaller than current toy-fluid code.

**Priority 4 — Scene save/load format.** Generic `SceneFormat.ts` to replace the deleted `FormulaFormat.ts`:
- Serialize store → JSON
- Embed in PNG iTXt via pngMetadata
- Load path: parse → `applyPresetState`
- Pluggable sections per feature

**Priority 5 — Rename.** `fractalStore` → `engineStore`, `useFractalStore` → `useEngineStore`, `FractalEvents` → `EngineEvents`, `FractalStoreState`/`FractalActions` → `EngineStoreState`/`EngineActions`. One sweep at the end.

## How to resume

```bash
cd h:/GMT/gmt-engine
git log --oneline -20           # see full stage progression
npx tsc --noEmit                # should still be exit 0
npm run dev                     # tries to serve — may fail on missing things, that's Priority 1
```

The `upstream` remote points at GMT. Pull updates with `git fetch upstream`. There is no `origin` — nothing pushes anywhere until you add one.

If the experiment turns out not to work: `rm -rf h:/GMT/gmt-engine`. GMT is untouched.

## Key memory references

- `memory/feedback_refactor_approach_selection.md` — why clone-and-strip beat in-place workspace refactor
- `memory/feedback_strip_vs_delete.md` — when to genericize vs delete (generic patterns worth preserving even when fractal-coupled)
- `memory/project_gmt_engine_extraction.md` — pointer to this repo + HANDOFF.md
