# 04 — Core Plugins 🚧

Overview of the plugins that ship with the engine. Each is opt-in: apps call `install*()` at boot. Each plugin has its own doc for deep detail; this doc is the map.

## Plugin ship status

| Plugin | Install | Source | Status | Detail |
|---|---|---|---|---|
| `@engine/viewport` | `installViewport()` | `engine/plugins/Viewport.tsx` | ✅ Shipped (phase 2) | [10_Viewport.md](10_Viewport.md) |
| `@engine/topbar` | `installTopBar()` | `engine/plugins/TopBar.tsx` | ✅ Shipped (phase 3) | § topbar |
| `@engine/scene-io` | `installSceneIO()` | `engine/plugins/SceneIO.tsx` | ✅ Shipped (phase 3) | § scene-io |
| `@engine/render-loop` | (via `<RenderLoopDriver />`) | `engine/plugins/RenderLoop.tsx` | ✅ Shipped (F4 fix) | § render-loop |
| `@engine/shortcuts` | `installShortcuts()` | `engine/plugins/Shortcuts.ts` | ✅ Shipped (phase 4b) | [07_Shortcuts.md](07_Shortcuts.md) |
| `@engine/undo` | `installUndo()` | `engine/plugins/Undo.tsx` | ✅ Shipped (phase 4c) | [06_Undo_Transactions.md](06_Undo_Transactions.md) |
| `@engine/camera` | `installCamera()` | `engine/plugins/Camera.ts` | ✅ Shipped (phase 4d) | § camera |
| `@engine/animation` | `installModulation()` | `engine/animation/modulationTick.ts` | ✅ Shipped (phase 5) | [08_Animation.md](08_Animation.md) |
| `@engine/environment` | `installEnvironment()` | — | 🔴 Not built | Theme, DPR, mobile-detect (placeholder) — partially absorbed today by `useMobileLayout` + the mobile layout primitives in [17_Mobile_Layout.md](17_Mobile_Layout.md) |

**Eight shipped plugins as of 2026-04-23.** Screenshot folded into `@engine/scene-io` (2026-04-23) — standalone camera button + `Alt+S` hotkey; identical code path as the "Save PNG…" dropdown item, which matched its output byte-for-byte anyway. The animation plugin is named `installModulation()` for historical reasons (it registers the modulation/animation tick into `TickRegistry.ANIMATE`); `installAnimation()` is an alias candidate for the rename pass.

**Rule:** every plugin is opt-in and idempotent. Calling `install*()` twice is a no-op.
**Why:** when two independent bundles both want the plugin (e.g. an editor add-on and a viewer add-on in the same app), both call install — the second should be harmless.

## Plugin interfaces

Each plugin exposes a small public API at the engine level. Below are the contracts; full detail in per-plugin docs.

---

### `@engine/scene-io`

Wraps `utils/SceneFormat.ts` with UI surfaces (file picker, download triggers, drag-drop target).

```ts
installSceneIO({
  // Optional: register app-specific top-level preset fields
  // (anything not under a feature's namespace)
  fields?: SceneFieldDescriptor[];
});

interface SceneFieldDescriptor {
  key: string;                               // top-level key in Preset (e.g. 'savedCameras')
  serialize:   (state: AppState) => any;     // what to include in the preset
  deserialize: (preset: any, set) => void;   // how to restore it
}

// Register a field at any time before store freeze:
sceneIO.registerField({
  key: 'savedCameras',
  serialize:   (s) => s.savedCameras,
  deserialize: (p, set) => set({ savedCameras: p.savedCameras ?? [] }),
});
```

**Rule:** any non-feature state that should round-trip must be registered as a preset field.
**Why:** PresetLogic used to hardcode `savedCameras` / `cameraRot` / `targetDistance`. The field registry makes the engine extensible without edits to PresetLogic. (See [20_Fragility_Audit.md F3](20_Fragility_Audit.md#f3-presetlogic-hardcoded-fields).)

**What scene-io provides on top of SceneFormat:**
- `<SaveMenu />` — dropdown with JSON / PNG / share link options.
- `<LoadDropZone />` — drag-drop target that auto-routes JSON/PNG/URL.
- Hotkey bindings (via `@engine/shortcuts`): Ctrl+S save, Ctrl+O load.
- TopBar slot registration (via `@engine/topbar`): save/load menu in the right slot.

---

### Screenshot — folded into `@engine/scene-io`

When we sketched a separate `@engine/screenshot` plugin, its `capture()` method produced byte-for-byte identical output to SceneIO's "Save PNG…" dropdown item (same `snapshotSceneToPng` call, same preset, same download path). The user-facing difference was "one-click button vs menu item" — purely UX, zero code. Two plugins doing the same thing with identical primitives would drift. So it's folded in: `installSceneIO` now additionally registers a standalone camera button in the topbar (when `getCanvas` is supplied) plus an `Alt+S` hotkey. Both route through the same `saveCurrentPng()` helper SceneIO uses for its dropdown item.

**Hotkey choice:** `Alt+S`. Ctrl+S and Ctrl+Shift+S are browser-reserved for "Save" and "Save As" and never reach JavaScript; Alt+S is unclaimed across major browsers and maps to Option+S on Mac.

---

### `@engine/topbar`

Slot-based host for the top chrome. Plugins and apps register items into named slots.

```ts
installTopBar({
  slots?: string[];                        // default: ['left', 'center', 'right']
});

topbar.register({
  slot: 'right',
  id: 'save-menu',                         // unique per-slot; re-register replaces
  order: 10,                               // ascending; lower renders first
  component: SaveMenuComponent,
  when?: (state) => state.canSave,         // conditional visibility
});

topbar.unregister('save-menu');
```

**Rule:** a slot entry with the same `id` replaces the previous entry. Use deterministic IDs so the second `install*()` call of a plugin is a no-op replace.
**Why:** the old GMT TopBar hardcoded its layout; replacing an item required editing `TopBar.tsx`. Slot registration lets GMT, toy-fluid, and future apps contribute without touching engine code.

**Default registrations when installed:**
- `'left':0` — project name + version (ProjectName)
- `'right':0` — help/about/donate menu (HelpMenu)

Other plugins register into `'right'` when installed:
- `@engine/scene-io` registers save/load menu
- `@engine/screenshot` registers camera button
- `@engine/undo` registers undo/redo buttons

---

### `@engine/camera`

**Adapter-based slot + animation binding plugin.** Navigation input is the app's concern; the plugin has no knowledge of the camera's shape.

```ts
installCamera({ hideShortcuts?: boolean });

// Apps declare HOW to capture/apply their camera state:
camera.register({
  featureId: 'sceneCamera',
  captureState: () => ({ center: { ...s.center }, zoom: s.zoom }),
  applyState:   (state) => setSceneCamera(state),
});

// Slots: save/recall opaque JSON blobs via the adapter
camera.saveSlot(n: number, label?: string): boolean;
camera.recallSlot(n: number): boolean;
camera.clearSlot(n: number): void;
camera.getAllSlots(): (CameraSlot | null)[];
```

**Design rationale (commit `2b8b6f9`):** the two toy apps have fundamentally different camera shapes (fluid-toy's 2D `{center, zoom}` vs fractal-toy's 3D orbit `{orbitTheta, orbitPhi, distance, fov, target}`). GMT's eventual 6-DOF camera manager adds a third shape. A canonical `CameraState` shape would force bad abstractions; instead, the plugin stores adapter-opaque JSON state and lets the adapter own interpretation. The same API works for a headless test harness, a VR app, or a 2D side-scroller.

**Preset round-trip:** `camera/presetField.ts` is a standalone side-effect module that registers `cameraSlots` into the preset-field registry (F3). Apps import it as an early side effect *before* any store-touching import — this avoids triggering the registry freeze via the plugin's Zustand import.

**Animation tracks:** the plugin does NOT register animation binders. Apps register their track list via `engine/animation/cameraKeyRegistry.ts`'s `registerCameraKeyTracks(tracks)`; the shared `<TimelineToolbar>`'s Key Cam button reads that list.

**Hotkeys (when installed alongside `@engine/shortcuts`):** Ctrl+1..9 save slot, 1..9 recall slot.
**Rule:** the camera plugin does NOT handle mouse/keyboard navigation input — apps install their own navigation controller.

---

### `@engine/render-loop`

Default RAF driver. Calls `tickRegistry.runTicks(dt)` each frame.

**Shipped as a React component** — no `install*()` required. Apps mount `<RenderLoopDriver />` directly in their React tree (usually alongside `<EngineBridge />` in the root app component).

```tsx
import { RenderLoopDriver } from '../engine/plugins/RenderLoop';

function App() {
  return (
    <>
      <EngineBridge />
      <RenderLoopDriver />
      ...
    </>
  );
}
```

**Rule:** apps that need a custom loop (worker-driven, synthetic-tick, headless) skip `<RenderLoopDriver />` and call `runTicks` themselves.
**Why:** see [01_Architecture.md § render-loop](01_Architecture.md#the-render-loop-contract).

**Dev-only assertion:** `TickRegistry` warns if 3 seconds pass after the first `registerTick()` without any `runTicks()` — catches apps that forgot to mount the driver. (Part of F4 fix, commit c6ee640.)

---

### `@engine/viewport` — see [10_Viewport.md](10_Viewport.md)

### `@engine/shortcuts` — see [07_Shortcuts.md](07_Shortcuts.md)

### `@engine/undo` — see [06_Undo_Transactions.md](06_Undo_Transactions.md)

### `@engine/animation` — see [08_Animation.md](08_Animation.md)

## Install patterns

### Minimal viewer
```tsx
// No install* calls. Just mount <RenderLoopDriver /> in your React tree.
<RenderLoopDriver />
```

### Standard creative tool (toy-fluid, fractal-toy as of phase 5)
```ts
// main.tsx — order matters; see fluid-toy/main.tsx for the canonical order.
import './registerFeatures';                    // register DDFS features FIRST
import '../engine/plugins/camera/presetField';  // registers cameraSlots preset field
                                                 // BEFORE any store import freezes the registry

installViewport({ enabled: true, alwaysActive: true, targetFps: 45 });
installTopBar();
installSceneIO({ getCanvas: () => document.querySelector('canvas') });  // also wires Alt+S + camera button when getCanvas is supplied
installModulation();                             // animation tick (registers into TickRegistry)
installShortcuts();
installUndo();
installCamera();
// (No installRenderLoop — mount <RenderLoopDriver /> in the React tree.)

// Register app-specific wiring:
registerCameraKeyTracks(['sceneCamera.center.x', 'sceneCamera.center.y', 'sceneCamera.zoom']);
camera.register({ featureId: 'sceneCamera', captureState, applyState });
```

### Test harness
```ts
// Install none. Drive ticks synthetically via tickRegistry.runTicks(16.67).
```

## Decisions

### 2026-04-22 — Nine core plugins, not fewer or more
**Decision:** the nine listed above ship with the engine. Other candidates (help-browser, PWA-update-prompt, hardware-prefs) stay app-specific or domain-specific for now.

**Rationale:** each of the nine is reusable by GMT AND toy-fluid without modification. Anything unique to GMT (formula library, light studio, bucket render) is a GMT plugin, not an engine plugin.

### 2026-04-22 — `@engine/viewport` added as the ninth plugin
**Decision:** viewport size + interaction state + adaptive quality are a cohesive core-plugin responsibility, not engine-core internals.
**Rationale:** both GMT and toy-fluid reinvented 80% of this; the 20% that differs (how each engine maps "reduce quality" to its internal knobs) stays app-level. See [10_Viewport.md](10_Viewport.md) for the full design and audit.

### 2026-04-22 — Plugins are opt-in singletons (not always-on)
**Decision:** `install*()` is required; nothing is automatic.
**Alternative:** engine auto-installs everything. Rejected — headless/embedded contexts would pay for chrome they don't use.

### 2026-04-22 — Slot registration is id-keyed, re-register replaces
**Decision:** `topbar.register({ id: 'save-menu', … })` — same id replaces.
**Alternative:** append-only. Rejected — would break re-install idempotency.

## Known fragilities

See [20_Fragility_Audit.md](20_Fragility_Audit.md). Most relevant here:
- **F3** — PresetLogic hardcoded fields (addressed by scene-io `registerField`).

## Cross-refs

- Plugin registration contract: [03_Plugin_Contract.md](03_Plugin_Contract.md)
- Individual plugin docs: [06](06_Undo_Transactions.md), [07](07_Shortcuts.md), [08](08_Animation.md).
