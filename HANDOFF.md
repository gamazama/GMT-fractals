# gmt-engine — Session Handoff

**Location:** `h:/GMT/gmt-engine/`
**Origin:** Forked from `h:/GMT/gmt-0.8.5` (kept as `upstream` remote)
**Status:** ✅ **Phases 1–5 complete (2026-04-23).** Two playground apps (`fractal-toy.html`, `fluid-toy.html`) boot on the engine with the full shared chrome: topbar, viewport with adaptive quality, scene save/load, shortcuts, unified undo, camera slots, animation timeline with playback. `npx tsc --noEmit` → 0 errors. Six of ten designed core plugins are shipped; see `docs/04_Core_Plugins.md` for the current map.

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

## Phase progress

### ✅ Phase 0 — Architecture baseline (2026-04-22, stages 14-15)
- Feature-residuals cleaned, SceneFormat.ts generic, default panel config genericized.
- Runtime boot verified; `debug/smoke-boot.mts` passes.
- `PanelId: string` + `AutoFeaturePanel` registered as `'auto-feature-panel'`.
- Demo add-on in `demo/` proves the three-step plugin contract end-to-end.
- Fragilities F1 (96a4b5f), F2 (96a4b5f), F3 (a4e7d6b), F4 (c6ee640) — all 🟢 Fixed.

### ✅ Phase 1 — Fractal-toy (2026-04-22, commits `4830a2c` … `b9d13f9`)
- `fractal-toy/` — minimal Mandelbulb playground: one formula, orbit+fly camera, directional light. Used `ShaderBuilder.addSection` as the escape hatch's first real load.

### ✅ Phase 2 — Viewport plugin (2026-04-22, `610b4e0` … `2f73612`)
- `@engine/viewport` (`engine/plugins/Viewport.tsx`) with GMT's production adaptive-quality loop ported and genericized.
- `<ViewportFrame>`, `<ViewportModeControls>`, `<FixedResolutionControls>`, `<AdaptiveResolutionBadge>` — shared plugin components.
- Immediate quality drop on interaction; `smoke:viewport` passes.

### ✅ Phase 3 — Toy-fluid port (2026-04-22, `4830a2c` … `205745a`)
- `fluid-toy/` — engine-native port of the reference `toy-fluid/`. FluidEngine mounts via `<ViewportFrame>` + `qualityFraction`; pointer→splat interaction layer; julia-c auto-orbit via modulation-style tick.
- `@engine/topbar` (`engine/plugins/TopBar.tsx`) — slot-based host + default items (ProjectName, FpsCounter).
- `@engine/scene-io` (`engine/plugins/SceneIO.tsx`) — Save + Load via topbar slot registration, delegates to `utils/SceneFormat.ts`.
- `<TimelineHost>` — shared animation-timeline chrome with GMT's 317-line TimelineToolbar ported as reusable engine chrome.

### ✅ Phase 4 — Input + undo + camera (2026-04-23, `8662447` … `2b8b6f9`)
- **4a** `engine/animation/modulationTick.ts` — canonical modulation tick; orbit refactored to register LFO animations via `setAnimations` instead of its own per-frame tick.
- **4b** `@engine/shortcuts` (`engine/plugins/Shortcuts.ts`) — scope-based keyboard dispatcher with priority resolution, text-input guard, rebinding hook.
- **4c** `@engine/undo` (`engine/plugins/Undo.tsx`) — unified transaction stack with scoped shortcuts (`Mod+Z` global, `Mod+Z` in `timeline-hover` scope routes to animation undo). Topbar Undo/Redo buttons. (F2b — 🟢 Fixed.)
- **4d** `@engine/camera` (`engine/plugins/Camera.ts`) — adapter-based slot plugin. Apps register a `CameraAdapter` with `captureState`/`applyState`; slots 1-9 save/recall via Ctrl+1..9 / 1..9. Preset round-trip via `camera/presetField.ts` side-effect module (F3 registry).

### ✅ Phase 5 — Animation plumbing (2026-04-23, commit `b82dc18`)
- `engine/animation/modulationTick.ts` now **delegates to GMT's AnimationSystem.tick** via `TickRegistry.ANIMATE`. No reinvention — same code path GMT uses, so keyframe playback, LFO modulation, audio-reactive rules, and resolved liveModulations all work identically.
- `engine/animation/cameraKeyRegistry.ts` — generic Key Cam track list. Default capture path-resolves scalar paths in DDFS store; apps override via `setCameraKeyCaptureFn`.
- `engine/AnimationEngine.ts` extended binder resolution: generic 3-part vec paths (`feature.param.x/y/z/w`) alongside GMT's legacy `vec[23][ABC]_axis` convention.
- `store/fractalStore.ts` eagerly imports `animationStore` so `window.useAnimationStore` is set before `bindStoreToEngine()` runs → `animationEngine.connect(animStore, hostStore)` always succeeds.
- Both toys now mount `<EngineBridge />`, `<RenderLoopDriver />`, `<GlobalContextMenu />` from the GMT chrome — not reinvented, just mounted.

**Verified via `debug/smoke-anim-play.mts`:** playback advances frame 0 → 73.5 in 700ms; a 2-keyframe track on `julia.power` (2 → 6 over 30 frames) drives the bound param correctly.

### 🚧 Known gaps after Phase 5

Identified in headless + manual testing:

- **Vec2 animation tracks use UNDERSCORE format** (`featureId.key_x` / `_y`) per AutoFeaturePanel convention, but Phase 5's additions (orbit LFO targets, `cameraKeyRegistry` default paths, `AnimationEngine.getBinder` 3-part extension) use DOT format (`feature.param.x`). Result: vec2 controls don't show live modulation; Key Cam for vec2-backed camera poses doesn't round-trip cleanly. Fix queued — flip DOT→UNDERSCORE in `fluid-toy/orbitTick.ts`, `fluid-toy/main.tsx` + `fractal-toy/main.tsx` camera-track registration, and `AnimationEngine.getBinder`.
- **Right-click context menus** — `<GlobalContextMenu />` mounted but some entry points (timeline ruler, keyframe dots) may still need wire-up verification.

## Remaining work

### Designed plugins not yet shipped
- **`@engine/screenshot`** (`installScreenshot()`) — canvas → PNG with metadata; auto-detect via viewport registry; topbar camera icon. Design in `docs/04_Core_Plugins.md`.
- **`@engine/environment`** (implied in architecture but not explicit) — theme, DPR, mobile-detect.
- **Help system integration** — the shared chrome has `HelpBrowser.tsx` + `helpUtils.ts`; not yet surfaced as `@engine/help`.

### Fragilities still open
See `docs/20_Fragility_Audit.md` for full list.
- **F5** — AnimationEngine hardcodes legacy camera tracks (`camera.unified.*`, `camera.rotation.*`). Clean fix is `@engine/camera` registering its own binders via a proper `binderRegistry`. Current mitigation: `cameraKeyRegistry` lets apps opt out of the legacy tracks.
- **F6** — `set${Feature}` name inference in `AnimationEngine.getBinder`. Replace with auto-bind at freeze time.
- **F7** — `animationStore ↔ fractalStore` circular import via `window.useAnimationStore`. Express as explicit bridge (see `docs/09_Bridges_and_Derived.md`).
- **F9** — `componentId` references not validated at registry freeze.

### Deferred
- **Rename pass** — `fractalStore` → `engineStore`, `FractalEvents` → `EngineEvents`, etc. Single commit after more apps have ported.
- **F8** — UI state undo (panel collapse, timeline scroll).
- **F10** — `formula` field rename to `mode` (cosmetic).

## How to resume

```bash
cd h:/GMT/gmt-engine
git log --oneline -30          # full stage progression
npm run typecheck              # should exit 0
npm run dev                    # plain vite on localhost:3400

# Entry points:
#   http://localhost:3400/               — engine shell (demo add-on)
#   http://localhost:3400/fractal-toy.html — minimal Mandelbulb playground (phase 1)
#   http://localhost:3400/fluid-toy.html   — engine-native fluid toy port (phases 3-5)

# In another shell — smoke checks:
npm run smoke:boot             # headless boot, fail on pageerrors
npm run smoke:interact         # state-flow + save round-trip
npm run smoke:screenshot       # visual baseline → debug/scratch/engine-boot.png
npm run smoke:viewport         # adaptive-quality viewport plugin
# Direct:
npx tsx debug/smoke-anim-play.mts  # timeline playback (phase 5)
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
