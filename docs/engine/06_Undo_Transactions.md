# 06 — Undo & Transactions 🚧

Unified transaction stack with scoped groups. Replaces GMT's three independent undo stacks (param, camera, animation) that were stitched together by UI hover state.

**Rule:** every undoable change goes through a transaction. The stack is single; scopes are labels, not separate stacks.

## Why one stack

GMT's audit found:
- `paramUndo` (in `historySlice.ts`), `cameraUndo` (in `cameraSlice.ts`), `sequenceUndo` (in `sequenceSlice.ts`) — three stacks.
- Ctrl+Z routed between them using `isTimelineHovered` as the selector.
- Undo behavior felt non-deterministic to users ("why did that undo a parameter when I'm editing keyframes?").

A single stack with scope labels fixes both:
- **Determinism:** most recent transaction wins, regardless of scope.
- **Scope-specific undo:** the timeline panel's dedicated undo button can call `undo.undo('animation')` to skip param/camera entries and pop only animation ones.

## API

```ts
interface UndoAPI {
  // Begin a transaction. Returns a handle. Must be committed or cancelled.
  begin(scope: UndoScope, label?: string): TransactionHandle;

  // Convenience wrapper — auto-commits on synchronous return, auto-cancels on throw.
  group<T>(scope: UndoScope, label: string, fn: () => T): T;

  // Stack operations. No-op when stack is empty for the scope.
  undo(scope?: UndoScope): boolean;   // returns true if popped
  redo(scope?: UndoScope): boolean;

  canUndo(scope?: UndoScope): boolean;
  canRedo(scope?: UndoScope): boolean;

  // Inspection (for timeline UI, debug panel)
  peekUndo(scope?: UndoScope): TransactionSummary | null;
  peekRedo(scope?: UndoScope): TransactionSummary | null;
}

interface TransactionHandle {
  commit(): void;    // pushes to stack
  cancel(): void;    // discards; nothing pushed
  label(next: string): void;
}

type UndoScope = 'param' | 'camera' | 'animation' | 'ui' | string;
```

**Rule:** scopes are open strings, but the canonical four (`param`, `camera`, `animation`, `ui`) should cover most needs. New scopes are a signal to reconsider; add one only when there's a real UI need to scope a button/hotkey to it.

## Usage patterns

### Auto-bracketed setters (the common case)

Feature setters are auto-wrapped. Calling `setDye({ dissipation: 0.95 })` is implicitly:

```ts
undo.group('param', 'Adjust dye.dissipation', () => {
  // the actual set
});
```

Interaction-end debounce (for sliders) groups continuous drags into one transaction. Default 300ms of silence after last change → commit.

### Explicit transactions

For multi-step operations that should undo as one:

```ts
undo.group('animation', 'Insert keyframes across selection', () => {
  for (const track of selection) {
    animation.addKeyframe(track, time, value);
  }
});
```

### Debounced groups (camera gestures, continuous mutations)

```ts
installUndo({
  scopes: {
    camera: { debounceMs: 1500 },   // continuous orbit drags collapse into one entry
    animation: { debounceMs: 0 },   // every keyframe edit is its own entry
  },
});
```

## Scope-routed shortcuts

With `@engine/shortcuts` installed, default bindings are:

```ts
// Global — most recent across all scopes
'Ctrl+Z'       → undo.undo()
'Ctrl+Y'       → undo.redo()

// Timeline-hover scope (when mouse is over timeline UI)
'Ctrl+Z'       → undo.undo('animation')     // higher priority
'Ctrl+Y'       → undo.redo('animation')

// Camera-dedicated (always routes to camera scope)
'Ctrl+Shift+Z' → undo.undo('camera')
'Ctrl+Shift+Y' → undo.redo('camera')
```

**Rule:** scope-routing via shortcut scope replaces GMT's `isTimelineHovered`-threaded-through-multiple-files pattern. The hover state affects which *shortcut* fires, not which *stack* is popped.

## Transaction storage

Each transaction is stored as:
- Forward patch (what changed)
- Backward patch (how to reverse)
- Scope + label + timestamp
- Feature-registry generation (for stale-reference detection; see below)

**Rule:** patches are minimal diffs, not full state snapshots.
**Why:** storing full snapshots (GMT's old approach) bloats memory and masks bugs where a later change should have blocked undoing an earlier one. Patches fail cleanly when intermediate state changed unexpectedly.

## Stale transactions

If a feature is unregistered (rare, but possible in hot-reload scenarios), transactions referencing its state are marked stale and skipped on undo/redo. User sees "1 step skipped (stale)" in dev.

## History limits

Default `maxEntries: 50` per scope. Configurable:

```ts
installUndo({
  maxEntries: 100,
  scopes: {
    animation: { maxEntries: 200 },
  },
});
```

Hitting the limit drops the oldest entry of that scope.

## Undo and preset load

**Rule:** loading a preset clears the undo stack for all scopes.
**Why:** preserving undo across a full state swap leads to paradoxes (undoing past a load would produce a state that never existed on disk and never was on screen in that order). A clear clean-slate is simpler and matches user expectation.

An explicit "Undo load" entry is pushed instead, so the user can revert the load itself.

## Non-undoable state

Some state changes must not go onto the stack:
- Viewport size changes (window resize)
- Mouse cursor position, hover states
- Framerate counters, debug overlays
- UI-only state that's not user-meaningful

**Rule:** don't wrap these in a transaction. If the change path goes through a feature setter, and you don't want it undoable, mark the param `undoable: false` in the feature def.

```ts
params: {
  dissipation: { type: 'float', default: 0.98, undoable: true },   // default
  currentFps:  { type: 'float', default: 60,   undoable: false },  // transient
}
```

## UI integration

Timeline panel shows:
- Undo stack depth per scope (small pips to the right of the track header).
- Next undo label on the undo button hover (`Undo: Adjust dye.dissipation`).

TopBar (when @engine/topbar installed):
- Undo/Redo buttons in the right slot.
- Clicking executes global undo; right-click shows a dropdown of recent transactions.

## Decisions

### 2026-04-22 — Single stack with scope labels (not three stacks)
**Decision:** one transaction stack, scopes are filter labels.
**Alternative:** keep three stacks, formalize the hover-based routing. Rejected — the confusion was endemic, not a fix-in-place opportunity.

### 2026-04-22 — Patches (forward + backward), not full snapshots
**Decision:** diffs, with stale-detection via registry generation.
**Alternative:** GMT's full-state snapshots. Rejected — bloated memory, slow, masks bugs.

### 2026-04-22 — Preset load clears undo
**Decision:** loading a preset clears all scopes; pushes one "Undo load" entry.
**Rationale:** predictable; avoids paradoxical states.

### 2026-04-22 — `undoable: false` per-param opt-out
**Decision:** transient params (FPS counter, hover state) opt out at feature-def time.
**Alternative:** heuristic classification. Rejected — explicit is better than clever.

## Known fragilities

See [20_Fragility_Audit.md](20_Fragility_Audit.md):
- **F2b** (formerly F2, now split) — three-stack confusion. Fixed by this design, but the migration from GMT's existing stacks will require careful patch translation for any existing saved sessions.

## Cross-refs

- Shortcut routing to scopes: [07_Shortcuts.md](07_Shortcuts.md)
- Feature-setter auto-wrapping: [02_Feature_Registry.md § auto-derivation](02_Feature_Registry.md#what-gets-auto-derived)
- Animation-specific scope interactions: [08_Animation.md](08_Animation.md)
