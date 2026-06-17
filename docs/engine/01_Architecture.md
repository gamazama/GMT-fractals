# 01 — Architecture 🚧

Foundation doc. Describes the engine's three-tier model (core → core plugins → apps), the render-loop contract, and the boundaries that separate them.

## Design principles

The engine exists to host multiple creative-tool apps on one substrate — initially GMT (fractal explorer) and fluid-toy (Julia/Mandelbrot fluid playground), and any future app that fits the "realtime canvas + parameter panel + timeline" shape. The target experience is that **writing a new app on this engine feels like declaring intent, not plumbing pipes.** Ship a feature registration, get a panel + save/load + keyframes + undo for free.

Five rules we apply:

1. **Generic by default, specific by exception.** Every path in the engine serves at least two apps. Anything that only GMT or only fluid-toy needs stays in the app folder. GMT-era residue (e.g. `AnimationSystem`'s old `julia.*` / `coloring.*` / `geometry.*` target hijacks) is gated on the slice actually existing (F13), not assumed.
2. **Hoist patterns at first duplicate.** When the same derivation / plumbing shows up in two or more places, extract it up into the engine layer immediately — don't ship a second copy with "TODO: unify later." See `engine/animation/trackBinding.ts` as the canonical example (collapsed four inlined copies of DDFS track-ID derivation into one helper with a smoke test covering all shapes).
3. **No duplicate UX.** If two surfaces produce byte-identical output, they are one surface with two entry points. The `@engine/screenshot` plugin was sketched as separate then folded into `@engine/scene-io` once we noticed its `capture()` was identical to "Save PNG…". One helper (`saveCurrentPng`) backs the dropdown, the standalone camera button, and the Alt+S hotkey.
4. **Follow GMT patterns when porting — don't reinvent.** GMT is the senior dependency. Its `AnimationSystem.tick`, its `EngineBridge`, its `<RenderLoopDriver />` are reused as-is rather than rewritten from scratch; the engine just mounts them in its own tick registry. The goal is that GMT itself will port onto the engine as a plugin with minimal formula-specific rewriting.
5. **Apps write features. Everything else is a plugin.** No app should need to touch engine core, engine plugins, or any other app's code. The preset-field registry, the binder registry (in progress — F5/F6), the topbar slot API, the camera adapter: all exist so apps contribute via opt-in registration.

These rules aren't aspirational — they've been enforced at commit boundaries throughout phases 1–5 and the post-phase-5 cleanup. When we catch one being broken, we fix it *in the commit that caught it*, not later.


## The three tiers

```
┌─────────────────────────────────────────────────────────────┐
│  APPS                                                       │
│    - GMT (fractals): formula library, raymarching, lights   │
│    - fluid-toy:      fluid sim, brush, Julia/Mandelbrot     │
│    - <your app>:     anything                               │
│                                                             │
│    Each app installs the core plugins it wants, registers   │
│    its own features + bridges, and takes canvas ownership.  │
├─────────────────────────────────────────────────────────────┤
│  CORE PLUGINS (ship with engine, opt-in per app)            │
│    @engine/shortcuts   @engine/undo        @engine/animation│
│    @engine/scene-io    @engine/topbar      @engine/camera   │
│    @engine/viewport    @engine/render-loop                  │
├─────────────────────────────────────────────────────────────┤
│  CORE (tiny, opinionated)                                   │
│    featureRegistry      binderRegistry    bridgeRegistry    │
│    componentRegistry    TickRegistry      EventBus          │
│    ShaderBuilder        SceneFormat       store primitives  │
│    trackBinding         animationEngine                     │
└─────────────────────────────────────────────────────────────┘
```

**Rule:** the core is small and has no opinion about chrome, shortcuts, or save/load UI. All of those are core plugins.
**Why:** a headless test harness or a worker-only render target should be able to import the core without pulling in React contexts, keyboard listeners, or a topbar DOM. Plugins are opt-in so every app pays only for what it uses.

## What each tier owns

### Core
- **Registries.** Features, binders, bridges, components. Validation (freeze, duplicate detection, isolation enforcement).
- **Tick orchestration.** Phase-ordered callbacks (SNAPSHOT → ANIMATE → OVERLAY → UI). No RAF; that's a plugin.
- **Event bus.** Typed pub/sub. Used by plugins to coordinate without coupling.
- **Shader assembly.** `ShaderBuilder` + `addSection` escape hatch. Optional — non-shader apps skip it entirely.
- **Store composition primitives.** `createFeatureSlice`, generic history-snapshot helpers. No TopBar or chrome state.
- **Scene transport.** `SceneFormat` handles JSON / PNG iTXt / URL share strings. Knows about the `Preset` shape via the preset field registry, nothing more.

### Core plugins
Each is an independent package (folder under `engine/plugins/` once split — today they live in `engine/` / `store/` / `components/` undifferentiated; splitting is tracked in [20_Fragility_Audit.md](20_Fragility_Audit.md)).

See [04_Core_Plugins.md](04_Core_Plugins.md) for per-plugin surface. Short version:

| Plugin | Owns |
|---|---|
| `@engine/viewport` | Size modes (Full/Fixed/Custom), DPR, interaction state, adaptive quality, FPS probe |
| `@engine/shortcuts` | Keyboard registry, scope stack, priority resolution |
| `@engine/undo` | Unified transaction stack, scoped groups, debounce |
| `@engine/animation` | Timeline, keyframes, modulation, auto-binding to DDFS params |
| `@engine/scene-io` | Save/load UI, file pickers, PNG/JSON/URL surfaces + one-click "screenshot" camera button + Alt+S hotkey, all on top of `SceneFormat` |
| `@engine/topbar` | Slot-host component + registration API |
| `@engine/camera` | Camera data shape, slot save/recall, animation binders. NOT navigation input. |
| `@engine/render-loop` | Default RAF driver that calls `runTicks(dt)` each frame |

### Apps
- Canvas ownership (WebGL2, WebGPU, Canvas2D — whatever).
- Domain features + bridges.
- Navigation input (how mouse/keyboard drives camera; the camera plugin records data, the app interprets input).
- Installing the core plugins they need (`installShortcuts()`, `installUndo()`, etc. at boot).
- Optionally replacing a core plugin with a custom implementation (e.g. a headless harness skips topbar + shortcuts).

## The render-loop contract

**Rule:** the engine does not spawn a RAF loop. Something must call `tickRegistry.runTicks(deltaMs)` each frame, in the phase order SNAPSHOT → ANIMATE → OVERLAY → UI.

**Why:** apps have different render-loop shapes — GMT uses a worker with `useFrame`; toy-fluid owns a RAF in React; a CLI/test harness ticks synthetically. Forcing one RAF driver into the core would break these.

**How most apps satisfy it:** install `@engine/render-loop`. That plugin mounts a `<RenderLoopDriver />` component that runs `requestAnimationFrame` and calls `runTicks`. One line at boot:

```ts
installRenderLoop({ store: engineStore });
```

**Apps that don't install it** must call `runTicks` themselves. Not calling it means animations silently don't play and overlay components don't re-render — there's an assertion in dev that warns after 3 seconds of no ticks.

### Phase semantics
- **SNAPSHOT** — freeze input state for the frame (camera, viewport, time). Plugins that need read-only consistency register here first.
- **ANIMATE** — apply keyframes + modulation + bridges. Writes go into feature state.
- **OVERLAY** — DOM overlay updates (gizmos, composition guides, brush cursor).
- **UI** — counters, HUDs, timeline scrub indicators.

Plugins register via `tickRegistry.register(phase, priority, handler)`. Within a phase, lower priority runs first.

## Canvas and viewport

**Rule:** the app owns the canvas. `@engine/viewport` owns dimensions, interaction state, and adaptive quality. Apps install the plugin, slot their canvas into `<ViewportArea canvasSlot={…}>`, and subscribe to resize / quality-change signals.

**Why:** GMT's worker-owned OffscreenCanvas and toy-fluid's synchronous WebGL2 context need different creation paths. Forcing one is a coupling we're not willing to accept. But size/DPR/adaptive are shared concerns — the plugin separates them cleanly.

**What `@engine/viewport` provides** (see [10_Viewport.md](10_Viewport.md)):
- Single ResizeObserver on the flex-1 div (authoritative physical-pixel measurement).
- Size modes: `'Full' | 'Fixed' | 'Custom'`, fixed-resolution controls UI, aspect-ratio presets.
- Interaction state: `isInteracting`, `interactionMode`, `isMouseOverCanvas`.
- FPS probe + smoothed FPS + adaptive-quality loop that emits `qualityFraction` in `[0, 1]`.
- `<PerformanceWarning>` UI with registerable suggestions.

**What the app does:**
- `<ViewportArea canvasSlot={<MyCanvas />} />` (MyCanvas is the app's render-surface component).
- Subscribes to `viewport.onResize` / `viewport.onQualityChange`.
- Maps `qualityFraction` to its own render-engine knobs (DPR + MSAA for GMT; sim-grid resolution for toy-fluid).
- Reports FPS via `viewport.reportFps(fps)` each frame.

## Store topology

```
engineStore                              ← tentative rename from fractalStore
├── formula: string                      ← app-owned string tag; engine does not interpret
├── canvasPixelSize: [number, number]
├── panels: Record<PanelId, PanelState>
├── renderRegion: RenderRegion
│
├── [featureId]: FeatureState            ← auto-derived per registered feature
│   dye: { dissipation, gradient, … }
│   audioMod: { enabled, bands, … }
│   …
│
├── set[FeatureId](partial)              ← auto-derived setter
│   setDye({ dissipation: 0.95 })
│
├── undo: TransactionAPI                 ← provided by @engine/undo when installed
├── animation: AnimationStore            ← provided by @engine/animation when installed
└── camera: CameraAPI                    ← provided by @engine/camera when installed
```

**Rule:** feature state is always namespaced under `store[featureId]`. Direct top-level state is reserved for engine-level concerns (viewport size, panels, render region).
**Why:** enables the isolation invariants in [02_Feature_Registry.md](02_Feature_Registry.md) and keeps auto-snapshot/auto-animation/auto-UI from needing hand-maintained lists.

## Opinions we're explicitly NOT holding

- **Renderer.** Engine has no renderer. WebGL? WebGPU? Canvas2D? Three.js? All fine; the app brings one.
- **Routing.** No opinion. App can use React Router, hash-based, or none.
- **Theming.** Tailwind is currently baked into the primitives; replacing it is out of scope for the v1 extraction but on the long-term table.
- **State library.** Zustand is used; abstracting away would gain little and cost a lot. Plugins assume Zustand.
- **Build tool.** Vite. No strong opinion — plugins are framework-agnostic where possible.

## Decisions

### 2026-04-22 — Core + bundled plugins (not minimal core, not opinionated engine)
**Decision:** the engine ships a tiny core plus a set of opt-in "core plugins" (shortcuts, undo, scene-io, screenshot, topbar, animation, camera, render-loop). Apps install what they want.

**Alternatives considered:**
- *Minimal core:* every app reimplements shortcuts/topbar/save. Rejected — reproduces the toy-fluid boilerplate problem.
- *Opinionated engine:* topbar/shortcuts/undo baked into core. Rejected — blurs app/engine boundary; reproduces the GMT coupling we just escaped.

**Rationale:** plugins let both GMT and toy-fluid share the same plumbing without welding opinions into the core. Headless / embedded / test contexts skip plugins entirely.

### 2026-04-22 — App owns canvas, engine owns DOM viewport host
**Decision:** `<ViewportArea>` is a DOM element host, not a canvas host. Apps mount their canvas inside.

**Alternatives considered:**
- *Engine owns canvas:* easier default but forces WebGL2 vs OffscreenCanvas compromise, and caps future WebGPU/Canvas2D apps.

**Rationale:** render-engine diversity is real (GMT's worker, toy-fluid's sync). The cost of "app creates a canvas ref" is one line per app.

### 2026-04-22 — Render loop contract is explicit
**Decision:** engine core does NOT drive RAF. Apps install `@engine/render-loop` or call `runTicks(dt)` themselves.

**Alternatives considered:**
- *Engine owns RAF:* implicit loop drove silent breakage in the audit ("who calls runTicks?"). Rejected.

**Rationale:** matches canvas-ownership philosophy. Default `@engine/render-loop` plugin covers the common case in one line.

## Known fragilities

See [20_Fragility_Audit.md](20_Fragility_Audit.md). Items most relevant to this doc:
- **F4 — Implicit render-loop contract.** Mitigated by `@engine/render-loop` default + 3-second dev warning.
- **F3 — PresetLogic hardcoded fields.** Mitigated by preset field registry (see [04_Core_Plugins.md](04_Core_Plugins.md#scene-io)).

## Cross-refs

- Feature model: [02_Feature_Registry.md](02_Feature_Registry.md)
- Plugin boot contract: [03_Plugin_Contract.md](03_Plugin_Contract.md)
- Core plugin surfaces: [04_Core_Plugins.md](04_Core_Plugins.md)
