# 04 — Core Plugins 🚧

Overview of the plugins that ship with the engine. Each is opt-in: apps call `install*()` at boot. Each plugin has its own doc for deep detail; this doc is the map.

## The nine core plugins

| Plugin | Install | Scope | Detail doc |
|---|---|---|---|
| `@engine/viewport` | `installViewport()` | Size modes, DPR, interaction state, adaptive quality, perf warnings | [10_Viewport.md](10_Viewport.md) |
| `@engine/shortcuts` | `installShortcuts()` | Keyboard registry, scope stack, priority | [07_Shortcuts.md](07_Shortcuts.md) |
| `@engine/undo` | `installUndo()` | Unified transaction stack, scoped groups | [06_Undo_Transactions.md](06_Undo_Transactions.md) |
| `@engine/animation` | `installAnimation()` | Timeline, keyframes, auto-binding | [08_Animation.md](08_Animation.md) |
| `@engine/scene-io` | `installSceneIO()` | Save/load UI, file picker, PNG/JSON/URL | This doc § scene-io |
| `@engine/screenshot` | `installScreenshot()` | Canvas → PNG with metadata | This doc § screenshot |
| `@engine/topbar` | `installTopBar()` | Slot host + registration API | This doc § topbar |
| `@engine/camera` | `installCamera()` | Camera data, slots, animation binders | This doc § camera |
| `@engine/render-loop` | `installRenderLoop()` | Default RAF driver | This doc § render-loop |

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

### `@engine/screenshot`

Canvas → PNG with optional metadata.

```ts
installScreenshot({
  canvasSelector?: string;                 // default: auto-detect viewport canvas
  defaultFilename?: (ctx) => string;       // default: `engine-${timestamp}.png`
});

// Programmatic:
screenshot.capture({
  includePresetMetadata: true,             // embed current preset in iTXt
  filename: 'my-shot.png',
});

screenshot.captureRaw();                   // no metadata, just the pixels
```

**Rule:** screenshot works with any canvas — WebGL2, WebGPU, OffscreenCanvas (via transferBitmap), Canvas2D. The plugin auto-detects via the viewport registry.
**Why:** GMT and toy-fluid both want screenshot; each has a different canvas context. Uniform API means neither reimplements PNG encoding.

**Topbar slot:** camera icon in the right slot when installed.
**Hotkey:** Ctrl+Shift+S (configurable).

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

Camera *data* + slots + animation binders. Navigation input is the app's concern.

```ts
installCamera({
  defaultMode?: string;                    // string tag; engine doesn't interpret
  undoDebounceMs?: number;                 // default 1500
});

// Camera state shape (always at store.camera, whatever the engine)
interface CameraState {
  position: Vec3;
  rotation: Quat;
  targetDistance: number;
  fov: number;
  mode: string;                            // app-owned tag: 'Orbit' | 'Fly' | 'Pan2D' | …
  custom: Record<string, any>;             // app-owned free bucket
}

// Slots: save/recall named camera poses
camera.saveSlot(n: number): void;
camera.recallSlot(n: number): void;

// Animation: camera.position, camera.rotation, camera.targetDistance,
// camera.fov are auto-bound (see 08_Animation.md).
// For custom keys, register binders explicitly.
```

**Rule:** the camera plugin does NOT handle mouse/keyboard input. Apps install their own navigation controller that reads `mode` and maps input to camera mutations.
**Why:** GMT's Orbit/Fly/Deep-Zoom, toy-fluid's 2D Pan/Zoom, a hypothetical VR app's HMD input — none share an input paradigm. Data + slots + anim binders are universally useful; input mapping isn't.

**TopBar slot (when installed alongside @engine/topbar):** camera slots dropdown.
**Hotkeys (when installed alongside @engine/shortcuts):** Ctrl+1..9 save slot, 1..9 recall slot.

---

### `@engine/render-loop`

Default RAF driver. Calls `tickRegistry.runTicks(dt)` each frame.

```ts
installRenderLoop({
  maxFps?: number;                         // default: uncapped (driven by rAF)
  paused?: () => boolean;                  // optional pause predicate
});
```

**Rule:** apps that need a custom loop (worker-driven, synthetic-tick, headless) skip this plugin and call `runTicks` themselves.
**Why:** see [01_Architecture.md § render-loop](01_Architecture.md#the-render-loop-contract).

**Implementation note:** mounts a `<RenderLoopDriver />` component into the engine's hidden overlay root. Stops when the component unmounts.

---

### `@engine/viewport` — see [10_Viewport.md](10_Viewport.md)

### `@engine/shortcuts` — see [07_Shortcuts.md](07_Shortcuts.md)

### `@engine/undo` — see [06_Undo_Transactions.md](06_Undo_Transactions.md)

### `@engine/animation` — see [08_Animation.md](08_Animation.md)

## Install patterns

### Minimal viewer
```ts
installRenderLoop();
// That's it. No UI, no save, no undo.
```

### Standard creative tool (GMT, toy-fluid)
```ts
installViewport();
installShortcuts();
installUndo();
installAnimation();
installSceneIO();
installScreenshot();
installCamera();
installTopBar();
installRenderLoop();
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
