# 06 — Undo & Transactions

Per-scope transaction stacks. Each scope (`'param'` / `'camera'`) owns its own undo + redo stack; scope is a required argument on every public history call.

**Rule:** every undoable change goes through a transaction. `undo` / `redo` always carry a scope; there is no unscoped fallback.

> **Migration note (2026-04-30).** An earlier iteration unified all scopes onto one stack with scope tags, treating scope as a filter. That collapsed under bugs of the form "Ctrl+Z popped a camera move when the user meant to undo a slider tweak" — any consumer that called `undo()` without a scope would happen to pop whatever was newest on the unified stack. The unscoped form is gone; the type signature now forces every call site to declare which lane it operates on.

## Why per-scope stacks (not one stack with scope tags)

A unified stack with scope filters works for the explicitly-scoped consumers (timeline-hover routing to `'animation'`, the camera-only Ctrl+Shift+Z), but has two structural failure modes:

1. **Implicit-scope conflation.** Generic UI like the topbar Undo button or a global Ctrl+Z handler doesn't know which lane it represents — it tends to call `undo()` with no scope. With a unified stack, that means "newest entry of any kind". Camera gestures and parameter edits then race on top of the stack and the wrong lane gets popped.
2. **Untyped overload at the entry point.** GMT's `handleInteractionStart(mode)` accepted either a string (`'param'`) or a CameraState object, dispatching at runtime via `typeof mode === 'object' && mode.position`. The two recording paths shared a function but not a contract.

Per-scope stacks fix both: the lanes don't share storage, and each lane has a typed entry point.

## State shape

Defined in [`store/slices/historySlice.ts`](../../store/slices/historySlice.ts):

```ts
interface HistorySliceState {
  paramUndoStack:  Transaction[];
  paramRedoStack:  Transaction[];
  cameraUndoStack: Transaction[];
  cameraRedoStack: Transaction[];
  interactionSnapshot: Partial<EngineStoreState> | null;
}

type UndoScope = 'param' | 'camera';

interface Transaction {
  scope: UndoScope;
  label?: string;
  diff: Partial<EngineStoreState>;  // minimal — only keys that changed
  timestamp: number;
}
```

`MAX_STACK = 50` per stack. Each lane independently caps; eviction in one lane never touches the other.

Animation history is intentionally separate (lives in `animationStore.undoStack` — see [Animation scope](#animation-scope) below). The F2b unification of animation into the engine-core slice never landed and isn't on the current critical path.

## Public API

```ts
// Canonical entry points — typed, lane-specific.
beginParamTransaction(): void
endParamTransaction(): void
pushCameraTransaction(state: CameraState): void

// Scoped undo / redo. `scope` is required.
undo(scope: 'param' | 'camera'): boolean
redo(scope: 'param' | 'camera'): boolean
canUndo(scope: 'param' | 'camera'): boolean
canRedo(scope: 'param' | 'camera'): boolean
peekUndo(scope: 'param' | 'camera'): Transaction | null
peekRedo(scope: 'param' | 'camera'): Transaction | null

clearHistory(): void   // resets all four stacks
```

### Backward-compat shims

For existing call sites (~30 widgets that already use the right names):

```ts
handleInteractionStart(mode?: 'param' | 'camera' | CameraState): void
handleInteractionEnd(): void
undoParam():  void  // → undo('param')
redoParam():  void
undoCamera(): void
redoCamera(): void
resetParamHistory(): void  // → clearHistory()
```

`handleInteractionStart` still accepts a `CameraState` object and routes to `pushCameraTransaction` so legacy camera-record sites don't break, but new callers should use the typed entry point directly.

## Recording

### Parameter transactions (the common case)

Bracket a user gesture with `beginParamTransaction()` / `endParamTransaction()`:

```ts
const onPointerDown = () => store.beginParamTransaction();
const onPointerUp   = () => store.endParamTransaction();
```

`beginParamTransaction` snapshots every registered feature's slice state (via `featureRegistry.getAll()`) plus a few preset-round-trippable scene fields. `endParamTransaction` diffs against that snapshot — only keys that actually changed get written into the transaction. If nothing changed, the snapshot is dropped and no entry is pushed.

This means a slider-drag that ends back at its start value records nothing, and a five-knob multi-touch gesture records exactly one transaction with five-key diff.

### Camera transactions

Camera gestures call `pushCameraTransaction(state)` at the start of the gesture (when the camera state is still the pre-gesture pose). The transaction stores `cameraRot` + `sceneOffset` + `targetDistance` from the supplied state.

Continuous orbit drags collapse via a 1500 ms debounce (`CAMERA_UNDO_DEBOUNCE_MS`): subsequent calls within the window are suppressed if the camera stack is non-empty. So a single orbit drag → one transaction; a quick second gesture → no new transaction; a gesture after the user pauses → new transaction.

`pushCameraTransaction` also sets `isUserInteracting: true` so the engine drops quality during the gesture. The flag is cleared by `endParamTransaction` (the gesture-end callback regardless of which lane the gesture targeted).

## Hotkey routing

The three lanes have distinct keybindings. Routing is the shortcut layer's job, not the history slice's.

| Key | Source | Routes to |
|---|---|---|
| `Mod+Z` | `@engine/undo` global | `undo('param')` |
| `Mod+Y` / `Mod+Shift+Z` (Mac) | `@engine/undo` global | `redo('param')` |
| `Mod+Z` over timeline | `@engine/undo` `'timeline-hover'` scope, priority 10 | `animationStore.undo()` |
| `Mod+Y` over timeline | `@engine/undo` `'timeline-hover'` scope, priority 10 | `animationStore.redo()` |
| `Ctrl+Shift+Z` | app-gmt `'global'` scope, priority 10 | `undo('camera')` |
| `Ctrl+Shift+Y` | app-gmt `'global'` scope, priority 10 | `redo('camera')` |

The priority-10 override on `Ctrl+Shift+Z` exists because `Mod+Shift+Z` also expands to `Ctrl+Shift+Z` on Win/Linux (engine-core registers it as the Mac-redo alias). Both bind at scope `'global'` priority 0, so the resolver tie-breaks on insertion order; `installUndo()` registers first, which would steal the binding without the override.

## Topbar buttons

`UndoButton` / `RedoButton` (in `engine/plugins/Undo.tsx`) are the engine-core topbar items. Both call `undo('param')` / `redo('param')` — they intentionally never operate on the camera stack. Camera undo is dedicated to its hotkey + the Camera menu items in `engine-gmt/topbar.tsx` (which use `canUndo('camera')` / `canRedo('camera')` for their disabled-checks).

This isn't a limitation; it's the model. Generic chrome doesn't speculate about which lane the user means. If you want a camera-undo button, install one with an explicit scope.

## Animation scope

Animation edits live in `animationStore` with their own `undoStack` / `redoStack`. The engine-core history slice does not see them.

`@engine/undo` registers `Mod+Z` and `Mod+Y` under the `'timeline-hover'` shortcut scope at priority 10. The timeline component pushes `'timeline-hover'` on mouse-enter and pops on leave, so cursor-over-timeline routes Ctrl+Z to the animation store, otherwise the global parameter binding wins.

Unifying animation history into the engine-core slice (the F2b plan) would deduplicate the stack-management code but require careful patch translation for every keyframe edit. It's deferred until there's a real cross-scope undo flow that needs it.

## Transaction storage

Each entry is a minimal diff, not a full snapshot:

- Parameter transactions store only the keys whose JSON-stringification changed during the gesture.
- Camera transactions store at most three fields (`cameraRot`, `sceneOffset` if present, `targetDistance` if present).

`undo(scope)` pops the newest entry, captures the **current** state of those same keys into a redo entry (so redo replays the post-undo state), then applies the diff via the standard setter path (`setX(...)` if it exists, otherwise direct `set()`). `applyStateRestore` calls `engine.resetAccumulation()` to invalidate any in-flight accumulated frames.

## Undo and preset load

Loading a preset clears all stacks. Preserving undo across a full state swap creates paradoxes (undoing past a load produces a state that never existed in that order). `engineStore.setFormula` and `loadPreset` both call `clearHistory()`.

## Non-undoable state

Some state changes must not go onto the stack:

- Viewport size / dpr / msaa changes that the slice itself adjusts during `endParamTransaction` (excluded by the snapshot's key list — only feature-slice keys are tracked).
- Hover, focus, scroll, FPS counters — these aren't in any feature slice and aren't snapshotted.

There's no per-param `undoable: false` flag yet. If a feature wants a sub-key excluded, the path forward is to put it in a non-snapshotted scope (e.g. a dedicated `ui` slice that the snapshotter skips).

## Known limitations

- **No `'ui'` scope.** Panel collapse, timeline scroll, dock layout don't undo. F8 in the fragility audit. Low-impact.
- **No grouped-multi-step `group(scope, label, fn)` API.** Not currently needed — multi-step writes happen through DDFS setters bracketed by a single `begin/end` pair, which already collapses to one transaction.
- **`UndoScope` is a closed union (`'param' | 'camera'`).** Adding a third scope requires a state-shape change. Keep it that way until a real third lane shows up.

## Decisions

### 2026-04-30 — Per-scope stacks (revert from unified-with-tags)
**Decision:** split `paramUndoStack`/`paramRedoStack`/`cameraUndoStack`/`cameraRedoStack`. Make `scope` required on `undo`/`redo`/`canUndo`/`canRedo`/`peekUndo`/`peekRedo`.
**Driver:** the unscoped `undo()` form caused intermittent "Ctrl+Z undid a camera move" reports when a camera gesture sat on top of a unified stack and the global hotkey didn't carry scope.
**Alternative considered:** keep one stack, default unscoped to skip `'camera'`. Rejected — would have fixed the immediate symptom but kept the structurally-conflated model. Per-scope stacks make the bug class unrepresentable.

### 2026-04-30 — Typed `pushCameraTransaction`, retire the overloaded `handleInteractionStart`
**Decision:** new entry point `pushCameraTransaction(state: CameraState)` for the camera path; `handleInteractionStart` keeps the `CameraState` overload only as a back-compat shim that routes to it.
**Why:** the runtime overload (`typeof mode === 'object' && mode.position`) was the smell that allowed param and camera recording paths to share a function but not a contract.

### 2026-04-22 — Patches (forward + backward), not full snapshots
**Decision:** diff-based. Param transactions snapshot pre-state, diff at commit; camera transactions store only the camera fields.
**Why:** full snapshots bloat memory and mask bugs where intermediate state should have invalidated the undo.

### 2026-04-22 — Preset load clears undo
**Decision:** loading a preset clears all stacks.
**Why:** predictable; avoids paradoxical states.

## Cross-refs

- Shortcut scope routing: [07_Shortcuts.md](07_Shortcuts.md)
- Camera plugin (slot saves, not undo): [04_Core_Plugins.md § camera](04_Core_Plugins.md#enginecamera)
- Fragility audit history: [20_Fragility_Audit.md § F2b](20_Fragility_Audit.md#f2b--three-undo-stacks-routed-by-hover-state)
