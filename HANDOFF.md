# gmt-engine — Session Handoff

**Location:** `h:/GMT/gmt-engine/`
**Origin:** Forked from `h:/GMT/gmt-0.8.5` (kept as `upstream` remote)
**Status:** Skeleton extraction in progress — engine core is genericized, downstream UI tree still has broken imports from the stripped fractal pieces.

## What this is

An experiment in extracting a reusable application engine (DDFS + animation + UI framework + save/load + worker architecture + shader assembly) from GMT. The goal is to port toy-fluid onto this engine as the first proof, then eventually rebuild GMT's raymarching pipeline on top as a plugin.

**Core principle:** strip fractal/raymarching content, preserve every generic pattern with plugin seams so the stripped capabilities can be re-introduced cleanly later.

## Current tree

```
engine/           FeatureSystem, FractalEvents, TickRegistry, AnimationEngine,
                  BezierMath, UniformSchema, UniformNames, HardwareDetection,
                  ShaderBuilder (generic 5-primitive + addSection),
                  ShaderFactory (generic, iterates features), ConfigManager
                  (generic DDFS diffing), ConfigDefaults (generic),
                  RenderPipeline (ping-pong + accumulation), BloomPass,
                  worker/, codec/, algorithms/, math/, utils/

store/            fractalStore (generic composition shell), createFeatureSlice,
                  CompileGate, animationStore, animation/, slices/ (ui,
                  renderer, history — all generic)

utils/            colorUtils, pngMetadata, fileUtils, helpUtils, CurveFitting,
                  ConstrainedSmoothing, GraphUtils + GraphRenderer (animation
                  keyframe curve editor), keyframeViewBounds, timelineUtils,
                  PresetLogic (generic), Sharing, UrlStateEncoder,
                  histogramUtils

features/         index, types, ui, navigation, optics, camera_manager,
                  droste, color_grading, post_effects, audioMod, drawing,
                  modulation, webcam, debug_tools, coloring
                  — these are the "next decision point": keep which?

components/       primitives (Slider, Knob, Dropdown, ToggleSwitch,
                  PanelHeader, TabBar, StatusDot, etc), inputs/,
                  vector-input/, pickers, gradient/, timeline/, graph/
                  (animation keyframe), layout/, viewport/,
                  AutoFeaturePanel, CompilableFeatureSection, PanelRouter,
                  Dock, AnimationSystem, KeyframeButton, Histogram,
                  ParameterSelector, PopupSliderSystem, DraggableWindow,
                  ComponentRegistry, contexts/StoreCallbacksContext

toy-fluid/        Kept as reference; will become the first port target

docs/             Preserved as reference (all fractal-documented — read-only
                  for patterns, don't treat as engine truth)
```

## What's done (13 commits on top of GMT's history)

Each stage is its own commit, independently revertable. `git log --oneline` shows them cleanly.

**Delete stages (1–11):**
1. Fractal formula library + data
2. Mesh export pipeline
3. Fragmentarium importer
4. Raymarching shader chunks
5. Fractal-specific DDFS features (geometry, lighting, materials, reflections, etc.)
6. Fractal engine internals (VirtualSpace, BucketRenderer, FractalRegistry)
7. Modular graph system (+ a fix commit restoring animation-graph utilities I over-deleted)
8. Prototypes + test harnesses
9. Misc GMT ephemera (tutorials, plans, help content)
10. Fractal-shaped UI components (FormulaPanel, QualityPanel, tutorial, etc.)
11. 4 truly fractal files (cameraSlice, scalabilitySlice, PickingController, CameraUtils)

**Genericize stage (12):**
- Types — `types/graph.ts` refs removed, `Preset` loses graph/pipeline
- `ShaderBuilder` — 634 lines → 150 lines (5 primitives + `addSection`)
- `ShaderFactory` — stripped to feature-registry iteration
- `ConfigManager` — generic DDFS diffing preserved, fractal branches dropped
- `ConfigDefaults` — formulaId now optional
- `fractalStore` — 518 lines → 260 lines, generic composition shell
- `historySlice` — REWRITE; generic undo/redo with feature-registry snapshot loop, camera undo moved here
- `PresetLogic` — stripped to generic per-feature setter loop

Plus deletes in the same commit for `FractalEngine`, `MaterialController`, `SceneController`, `UniformManager`, `controllers/`, `overlay/`, `FormulaFormat`, remaining `shaders/chunks/*.ts`.

## What's NOT done — 95 broken imports remain

All are downstream UI/hooks/app-shell referencing deleted engine or feature files. Clean mechanical list — each file either needs (a) the broken import removed + surrounding code stubbed, or (b) the whole file deleted because it was fractal-UI anyway.

**Categories:**

1. **App shell** (needs rewrite for the engine's new shape):
   - `App.tsx`, `index.tsx`
   - `hooks/useAppStartup.ts` — boot sequence
   - `components/EngineBridge.tsx`
   - `components/WorkerTickScene.tsx`, `StandaloneTickLoop.ts`
   - `components/LoadingScreen.tsx` — strip SDF preview, keep splash framework
   - `components/ViewportArea.tsx`

2. **Features with residual imports**:
   - `features/coloring/index.ts` — references deleted feature
   - `features/camera_manager/*` — VirtualSpace/CameraUtils refs
   - `features/drawing/*`, `features/audioMod/*` — may reference deleted helpers

3. **Topbar / panels** that were fractal-UI:
   - `components/topbar/SystemMenu.tsx`, `CameraTools.tsx` (save/load UI, used FormulaFormat)
   - `components/StateDebugger.tsx`
   - Anything still importing `types/graph`, `FormulaFormat`, `FractalRegistry`

4. **Hooks**:
   - `hooks/useInputController.ts`, `useInteractionManager.ts`, `usePreviewTarget.ts`
   - (`useTutorialEngine.ts`, `useTutorialHints.ts`, `usePhysicsProbe.ts`, `useGraphInteraction.ts`, `useGraphTools.ts` already deleted)

## Plugin seams designed in

The point of genericizing (not deleting wholesale) was to leave clean re-entry points. When a future fractal plugin wants to re-install raymarching, these are the hooks:

| Capability | Re-entry via |
|-----------|--------------|
| Named shader pipeline stages (post-map, miss-handler, integrator, etc.) | `ShaderBuilder.addSection(name, code)` + `getSections(name)` — plugin registers its pipeline DSL, its own assembler reads sections back |
| Feature state (any shape) | `FeatureRegistry.register(def)` + generic `createFeatureSlice` auto-generates Zustand slice + `AutoFeaturePanel` auto-generates UI |
| Render engine | Totally pluggable; engine doesn't supply one. App instantiates its own render loop consuming the store + the shader built by ShaderFactory |
| Compile scheduling | `CompileGate.queue(msg, fn)` — generic two-phase compile trigger with spinner |
| Config diffing | `ConfigManager.update(newConfig, runtimeState)` — returns `{rebuildNeeded, uniformUpdate, modeChanged, needsAccumReset}` |
| Preset save/load framework | `PresetLogic.applyPresetState` iterates feature registry + invokes feature setters |
| PNG metadata embed | `utils/pngMetadata.ts` (untouched) |
| URL scene sharing | `utils/Sharing.ts`, `utils/UrlStateEncoder.ts` (untouched) |
| Undo/redo | `historySlice` — snapshots ALL feature state via registry loop, automatic for any future plugin |
| Animation engine | `engine/AnimationEngine.ts` — uses `connect(animStore, hostStore)` injection; no direct store coupling |
| Worker lifecycle | `engine/worker/` framework intact |
| TickRegistry phases | SNAPSHOT → ANIMATE → OVERLAY → UI |

## Next session: where to pick up

**Priority 1 — Get the engine to type-check.** Either fix or delete each of the 95 broken imports. The app shell files (App.tsx, index.tsx, useAppStartup.ts, EngineBridge.tsx, LoadingScreen.tsx) are the critical path — without them nothing boots. Fractal-UI topbar files are DELETE candidates.

**Priority 2 — Decide the feature inventory.** Remaining `features/` directory has ~15 features. Some are genuinely generic (audioMod, modulation, drawing, webcam, debug_tools, color_grading, post_effects). Some are fractal-leaning (optics, navigation, camera_manager, coloring, droste). Per-feature decision: keep/rewrite/delete.

**Priority 3 — Build a minimal RenderEngine replacement.** Thin class that owns a WebGL canvas, compiles a shader from ShaderFactory, ticks per frame, syncs uniforms from the store. ~200 lines. Apps can extend with their own render passes. This is what replaces the deleted FractalEngine.

**Priority 4 — Port toy-fluid onto the engine.** This is the proving test. Success = toy-fluid runs via DDFS-driven UI + save/load + animation. If scope gets weird here, it signals an engine seam is missing and needs revisiting.

**Priority 5 — Rename.** `fractalStore` → `engineStore`, `useFractalStore` → `useEngineStore`, `FractalEvents` → `EngineEvents`, etc. Do this in ONE pass at the end so git history stays clean.

## How to resume

```bash
cd h:/GMT/gmt-engine
git log --oneline -15              # see stage progression
git -C . status                    # clean, on main
npx tsc --noEmit 2>&1 | grep "error TS2307" | wc -l   # 95 broken imports
```

The `upstream` remote points at GMT. Pull updates with `git fetch upstream`. There is no `origin` — nothing pushes anywhere until you add one.

If the path doesn't work out, delete the folder. GMT is untouched.

## Key memory references

- `memory/feedback_refactor_approach_selection.md` — why this clone approach beat in-place workspace refactor
- `memory/feedback_strip_vs_delete.md` — when to genericize vs delete (generic patterns worth preserving even when fractal-coupled)
- `memory/project_monetization_strategy.md`, `project_hosting_setup.md` — GMT-side context that may inform engine direction
