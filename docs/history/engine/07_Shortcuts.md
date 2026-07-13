# 07 — Shortcuts 🚧

Pluggable keyboard shortcut registry. Replaces the centralized `useKeyboardShortcuts` hook in GMT with a declarative, scope-aware dispatcher.

**Rule:** shortcuts register themselves; the dispatcher resolves by scope stack and priority. No if-ladders, no hover-state-threading, no hardcoded lists.

## Why a registry, not a hook

GMT's audit found:
- `useKeyboardShortcuts.ts` is one big switch statement.
- Adding a shortcut requires editing that file.
- Disabling a shortcut (during modal input, e.g.) has no clean path.
- Rebinding is impossible without a fork.
- Scope handling is ad-hoc (`isTimelineHovered` threaded through three files).

A registry fixes all four.

## Registration API

```ts
installShortcuts({
  domRoot?: HTMLElement | Window;                  // default: window
  capture?: boolean;                               // default: true
  ignoreOn?: string[];                             // default: ['input:not([type=range])', 'textarea', '[contenteditable]']
});

shortcuts.register({
  id: 'undo-global',                               // unique; re-register replaces
  key: 'Ctrl+Z',                                   // see "key syntax" below
  scope?: 'global' | string;                       // default: 'global'
  priority?: number;                               // default: 0; higher wins within scope
  when?: () => boolean;                            // gate; if false, shortcut is skipped
  handler: (e: KeyboardEvent) => void;
  description?: string;                            // for shortcut-help UI
  category?: string;                               // 'Edit' | 'View' | 'Animation' | …
  consume?: boolean;                               // default: true; call preventDefault/stopPropagation
});

shortcuts.unregister('undo-global');
```

## Key syntax

Normalized, case-insensitive, plus-separated.

```
'Ctrl+Z'           — Windows/Linux Ctrl
'Cmd+Z'            — Mac Cmd (engine normalizes to Meta internally)
'Mod+Z'            — Ctrl on Win/Linux, Cmd on Mac
'Shift+Ctrl+Z'     — modifier order doesn't matter
'Escape'           — named keys: Escape, Enter, Tab, Space, ArrowUp, ArrowDown, …
'1', 'A', '`'      — literal keys
'Ctrl+Alt+F12'     — any combo
```

**Rule:** `Mod` is preferred over `Ctrl` when the intent is "the primary edit modifier." Don't hardcode Ctrl if the app should work on Mac.

## Scope stack

A scope is an arbitrary string. Scopes stack: when a scope is active, shortcuts registered in that scope are added to the resolver above `'global'`.

```ts
// Push a scope when the timeline is hovered
shortcuts.pushScope('timeline-hover');
// ... later:
shortcuts.popScope('timeline-hover');

// React integration
useShortcutScope('timeline-hover', isHovering);
```

### Resolution order

On a keypress, the dispatcher walks the scope stack from top to bottom:

1. Find all registered shortcuts matching the key (normalized).
2. Filter by active scope (must be in the scope stack).
3. Filter by `when()` (if defined and returns false, skip).
4. Take highest-priority remaining.
5. Ties within a scope: most-recently-registered wins.

**Rule:** scope + priority is a 2D tiebreak. Scope beats priority.
**Why:** timeline-hover Ctrl+Z (scope: timeline-hover, priority 0) should beat global Ctrl+Z (scope: global, priority 99) when the timeline is hovered. Scope affinity is the user's real intent.

## Text input guard

Shortcuts are auto-skipped when the active element matches `ignoreOn`. Default selectors:
- `input:not([type=range])` — text boxes but not sliders
- `textarea`
- `[contenteditable]`

**Rule:** range inputs are NOT in the ignore list.
**Why:** the user's arrow-key value adjustments and Ctrl+Z on a slider still feel native — GMT feedback confirmed this.

Per-shortcut override:
```ts
shortcuts.register({
  id: 'save-in-text-field',
  key: 'Ctrl+S',
  ignoreInputs: false,          // fire even in text fields
  handler: handleSave,
});
```

## Canonical shortcuts (installed by plugins)

When multiple plugins are installed, they register their default bindings. Apps can rebind any of these via `shortcuts.register()` with the same `id` (which replaces).

### `@engine/shortcuts` (self — universal)
| Key | Action |
|---|---|
| `?` | Show shortcut-help overlay |
| `Escape` | Dismiss overlay, deselect |

### `@engine/undo`
| Key | Scope | Action |
|---|---|---|
| `Mod+Z` | global | `undo('param')` |
| `Mod+Y` / `Mod+Shift+Z` | global | `redo('param')` |
| `Mod+Z` | timeline-hover | `animationStore.undo()` — priority 10 |
| `Mod+Y` | timeline-hover | `animationStore.redo()` — priority 10 |

Apps that want camera-scoped Ctrl+Shift+Z install it themselves at priority 10 (so it wins over the engine's Mac-redo alias on Win/Linux). app-gmt registers `gmt.undoCameraMove` / `gmt.redoCameraMove` via `shortcuts.register` in `app-gmt/main.tsx`. See [06_Undo_Transactions.md § Hotkey routing](06_Undo_Transactions.md#hotkey-routing).

### `@engine/animation`
| Key | Scope | Action |
|---|---|---|
| `Space` | global | `animation.toggle()` — gated by `when: () => !isFlyCameraActive` |
| `Space` | timeline-hover | `animation.toggle()` — priority 10, no gating |
| `Home` | global | `animation.seek(0)` |
| `End` | global | `animation.seek(duration)` |
| `,` | timeline-hover | previous keyframe |
| `.` | timeline-hover | next keyframe |
| `K` | timeline-hover | toggle keyframe at current time |

### `@engine/camera`
| Key | Action |
|---|---|
| `Ctrl+1..9` | Save camera slot N |
| `1..9` | Recall camera slot N (when slot exists; otherwise falls through) |
| `Tab` | Cycle camera mode (when mode list is defined) |

### `@engine/scene-io`
| Key | Action |
|---|---|
| `Ctrl+S` | Save (opens save menu) |
| `Ctrl+O` | Open (opens file picker) |
| `Alt+S` | Quick Save PNG (scene-io's folded-in screenshot) |

`Ctrl+Shift+S` is browser-reserved for "Save Page As" and never reaches JS — do not use it. `Alt+S` is unclaimed across major browsers and maps to Option+S on Mac.

## Shortcut-help overlay

Pressing `?` opens a modal listing every registered shortcut, grouped by `category` and scope. Uses `description` text from registrations.

**Rule:** every registered shortcut should have a `description`. Undocumented shortcuts show as "(no description)" and fail the `smoke:audit-shortcuts` check if we implement one.

## Rebinding

```ts
// Replace the default undo binding with F4
shortcuts.register({
  id: 'undo-global',      // same id as the default
  key: 'F4',
  scope: 'global',
  handler: () => undo.undo(),
  description: 'Undo (custom)',
});
```

App-level rebinding UIs can read all registrations (`shortcuts.list()`), save a user config, and re-register on boot.

## Conflicts

When two shortcuts register the same `id`, the second replaces the first (re-registration is idempotent by id). When two shortcuts match the same key + scope + priority, most-recently-registered wins.

**Rule:** use descriptive, unique IDs. Prefix plugin IDs with the plugin name: `'undo-global'`, `'camera-slot-save'`, `'animation-toggle-playback'`.

## Dev tooling

- `shortcuts.list()` — all registered shortcuts
- `shortcuts.lookup('Ctrl+Z')` — which shortcut(s) match this key, in resolution order
- `shortcuts.trace(true)` — logs every dispatch with scope stack + resolved id

## Decisions

### 2026-04-22 — Registry replaces the central hook
**Decision:** declarative registration, scope stack, priority.
**Alternative:** keep the hook, add a "shortcut map" prop. Rejected — still brittle at the intersection of plugins + apps.

### 2026-04-22 — `Mod` key abstraction
**Decision:** `'Mod+Z'` means Ctrl on Win/Linux, Cmd on Mac.
**Rationale:** most apps want platform-native modifier; explicit `'Ctrl'` remains available when truly intended.

### 2026-04-22 — Scope beats priority
**Decision:** scope affinity is a stronger tiebreak than priority.
**Rationale:** matches user intent — if the timeline is hovered, timeline Ctrl+Z should win even against a global priority 99 binding.

### 2026-04-22 — Range inputs are NOT ignored
**Decision:** shortcuts fire on sliders.
**Rationale:** preserves GMT's existing good UX; feedback memory confirms this was the right call.

## Known fragilities

None in the new design. Previous fragilities (hardcoded hover state threading, no rebind path) are structurally addressed.

## Cross-refs

- Undo scope routing: [06_Undo_Transactions.md § scope-routed-shortcuts](06_Undo_Transactions.md#scope-routed-shortcuts)
- Animation shortcuts: [08_Animation.md](08_Animation.md)
- Plugin install patterns: [04_Core_Plugins.md](04_Core_Plugins.md)
