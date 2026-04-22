# 01 — Architecture 🚧

Foundation doc. Describes the engine's three-tier model (core → core plugins → apps), the render-loop contract, and the boundaries that separate them.

## The three tiers

```
┌─────────────────────────────────────────────────────────────┐
│  APPS                                                       │
│    - GMT (fractals): formula library, raymarching, lights   │
│    - toy-fluid:      fluid sim, brush, particle emitter     │
│    - <your app>:     anything                               │
│                                                             │
│    Each app installs the core plugins it wants, registers   │
│    its own features + bridges, and takes canvas ownership.  │
├─────────────────────────────────────────────────────────────┤
│  CORE PLUGINS (ship with engine, opt-in per app)            │
│    @engine/shortcuts   @engine/undo      @engine/animation  │
│    @engine/scene-io    @engine/screenshot  @engine/topbar   │
│    @engine/camera      @engine/render-loop                  │
├─────────────────────────────────────────────────────────────┤
│  CORE (tiny, opinionated)                                   │
│    featureRegistry      binderRegistry    bridgeRegistry    │
│    componentRegistry    TickRegistry      EventBus          │
│    ShaderBuilder        SceneFormat       store primitives  │
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
| `@engine/shortcuts` | Keyboard registry, scope stack, priority resolution |
| `@engine/undo` | Unified transaction stack, scoped groups, debounce |
| `@engine/animation` | Timeline, keyframes, modulation, auto-binding to DDFS params |
| `@engine/scene-io` | Save/load UI, file pickers, PNG/JSON/URL surfaces on top of `SceneFormat` |
| `@engine/screenshot` | Canvas → PNG with metadata embed |
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

**Rule:** the app owns the canvas. The engine provides a `<ViewportArea>` component that is a DOM host — the app mounts its canvas inside.

**Why:** GMT's worker-owned OffscreenCanvas and toy-fluid's synchronous WebGL2 context need different creation paths. Forcing one is a coupling we're not willing to accept.

**What the engine provides:**
- A flex-sized `<div>` with `ResizeObserver` wired to `canvasPixelSize` in the store.
- A viewport-overlay loop that renders features with `viewportConfig.type === 'dom'`.
- No canvas element.

**What the app does:**
- `<ViewportArea canvasSlot={<canvas ref={canvasRef} />} />` — or a custom mount.
- Instantiates its render engine (FractalEngine, FluidEngine, etc.) in a `useEffect` with `canvasRef.current`.

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
