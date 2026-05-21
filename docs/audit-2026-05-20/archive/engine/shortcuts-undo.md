---
source: engine/plugins/Shortcuts.ts
lines: 283
last_verified_sha: 45aa222b296bb73154824d30cea4cf4656d0ed64
additional_sources:
  - engine/plugins/Undo.tsx
audited: 2026-05-20T09:30:00Z
audited_by: claude-opus-4-7
public_api:
  - ShortcutDef
  - InstallShortcutsOptions
  - shortcuts
  - installShortcuts
  - uninstallShortcuts
  - useShortcut
  - useShortcutScope
  - UndoButton
  - RedoButton
  - InstallUndoOptions
  - installUndo
  - uninstallUndo
depends_on: []
---

# Shortcuts + Undo

`@engine/shortcuts` is a scope-stack-based keyboard dispatcher: shortcuts register declaratively against a flat id-keyed registry, a single `keydown` listener normalises the event to a canonical key string, and a resolver walks the scope stack newest-first (with priority as a tiebreaker) to pick at most one matching handler per event. `@engine/undo` is a thin plugin layered on top — it wires the unified history slice's `undo('param')`/`redo('param')` into `Mod+Z`/`Mod+Y`/`Mod+Shift+Z`, mounts `UndoButton`/`RedoButton` into the topbar, and registers `'timeline-hover'`-scoped overrides that route to the separate `animationStore` undo stack when the cursor is over the timeline (engine/plugins/Shortcuts.ts:1-26, engine/plugins/Undo.tsx:1-17).

## Public API

### `engine/plugins/Shortcuts.ts`

- **`interface ShortcutDef`** — Declarative shortcut entry. Fields: `id` (unique; re-registration replaces), `key` (combo string, normalised case- and order-insensitive), optional `scope` (defaults to `'global'`), optional `priority` (tiebreak within scope; default 0), `handler: (e: KeyboardEvent) => void`, optional `description` / `category` for shortcut-help UIs, optional `when` runtime guard, optional `consume` (calls `preventDefault` + `stopPropagation` after firing; default `true`), optional `ignoreInputs` (fire even when an input is focused; default `false`) (engine/plugins/Shortcuts.ts:28-49).
- **`interface InstallShortcutsOptions`** — `{ domRoot?: Window | Document | HTMLElement; capture?: boolean; ignoreSelector?: string }`. Defaults: `window`, bubble phase, the built-in `DEFAULT_IGNORE_SELECTOR` (engine/plugins/Shortcuts.ts:208-215).
- **`shortcuts`** — Module-scope registry object with seven methods:

| Method | Signature | Effect |
|---|---|---|
| `register` | `(def: ShortcutDef) => void` | `Map.set(def.id, def)` — re-registration silently replaces (engine/plugins/Shortcuts.ts:140-142). |
| `unregister` | `(id: string) => void` | `Map.delete(id)` (engine/plugins/Shortcuts.ts:143-145). |
| `pushScope` | `(scope: string) => void` | Append to `_scopeStack`; notify subscribers (engine/plugins/Shortcuts.ts:146-149). |
| `popScope` | `(scope: string) => void` | Walks stack newest-first; removes the first matching entry (tolerant of out-of-order pops) (engine/plugins/Shortcuts.ts:150-160). |
| `list` | `() => ShortcutDef[]` | Snapshot in `Map` insertion order (engine/plugins/Shortcuts.ts:161-163). |
| `lookup` | `(key: string) => ShortcutDef[]` | All defs whose normalised key matches; ignores scope (engine/plugins/Shortcuts.ts:164-167). |
| `clear` | `() => void` | Empties the registry; does not touch `_scopeStack` (engine/plugins/Shortcuts.ts:168-170). |

- **`installShortcuts(options?: InstallShortcutsOptions): void`** — Idempotent (`_installed` guard). Attaches the single `keydown` listener; exposes `window.__shortcuts` for dev-console / smoke tests (engine/plugins/Shortcuts.ts:217-249).
- **`uninstallShortcuts(): void`** — Removes the listener at both `false` and `true` capture flags, clears the registry, resets `_scopeStack` back to `['global']`, clears `_installed` (engine/plugins/Shortcuts.ts:251-261).
- **`useShortcut(def: ShortcutDef): void`** — React hook. Registers on mount, unregisters on unmount; dep-array tracks every field of `def` including `handler` (engine/plugins/Shortcuts.ts:268-274).
- **`useShortcutScope(scope: string, active: boolean): void`** — React hook. While `active` is true, `pushScope` on mount, `popScope` on cleanup (engine/plugins/Shortcuts.ts:277-283).

### `engine/plugins/Undo.tsx`

- **`UndoButton: React.FC`** — Topbar button. Reads `canUndo('param')`, `peekUndo('param')`, and `undo` directly from `useEngineStore`; click dispatches `undo('param')` (engine/plugins/Undo.tsx:41-57).
- **`RedoButton: React.FC`** — Symmetric. Click dispatches `redo('param')` (engine/plugins/Undo.tsx:59-75).
- **`interface InstallUndoOptions`** — `{ hideTopBarButtons?: boolean; hideShortcuts?: boolean }`. Apps that ship a different chrome or different keybindings set the corresponding flag (engine/plugins/Undo.tsx:81-86).
- **`installUndo(options?: InstallUndoOptions): void`** — Idempotent (`_installed` guard). Registers five shortcuts (three global, two timeline-hover) and two topbar items (engine/plugins/Undo.tsx:88-159).
- **`uninstallUndo(): void`** — Unregisters all five shortcut ids and both topbar items; clears `_installed` (engine/plugins/Undo.tsx:161-170).

### Shortcuts registered by `installUndo`

| id | key | scope | priority | routes to |
|---|---|---|---|---|
| `undo.global` | `Mod+Z` | `global` (default) | 0 (default) | `useEngineStore.undo('param')` (engine/plugins/Undo.tsx:98-104) |
| `redo.global` | `Mod+Y` | `global` | 0 | `useEngineStore.redo('param')` (engine/plugins/Undo.tsx:105-111) |
| `redo.global.shift` | `Mod+Shift+Z` | `global` | 0 | `useEngineStore.redo('param')` (engine/plugins/Undo.tsx:112-118) |
| `undo.animation` | `Mod+Z` | `timeline-hover` | 10 | `useAnimationStore.undo()` (engine/plugins/Undo.tsx:135-143) |
| `redo.animation` | `Mod+Y` | `timeline-hover` | 10 | `useAnimationStore.redo()` (engine/plugins/Undo.tsx:144-152) |

Topbar items registered: `undo` at `{ slot: 'right', order: -20 }`, `redo` at `{ slot: 'right', order: -19 }` (engine/plugins/Undo.tsx:155-158).

## Architecture

- **Single listener, single registry, single scope stack.** `_registry: Map<string, ShortcutDef>`, `_scopeStack: string[]` seeded with `['global']`, `_scopeSubscribers: Set<() => void>` are all module-scope singletons (engine/plugins/Shortcuts.ts:133-135). The dispatcher binds exactly one `keydown` listener on `installShortcuts()` (engine/plugins/Shortcuts.ts:242).
- **Key normalisation.** `normalizeKey` splits on `+`, lowercases each token, maps modifier aliases (`control`→`Ctrl`, `cmd`/`command`/`win`→`Meta`, `option`→`Alt`), resolves `mod` against `isMac()`, fixes modifier order to `Ctrl|Alt|Shift|Meta`, uppercases single-letter mains, and routes named keys through `canonicalNamedKey` (engine/plugins/Shortcuts.ts:63-88). `keyFromEvent` mirrors the same shape from a `KeyboardEvent`, special-casing `e.code === 'Space'` and dropping bare modifier-only events (engine/plugins/Shortcuts.ts:113-129).
- **`'Mod'` is platform-resolved.** `isMac()` UA-sniffs `navigator.platform`/`userAgent`; `Mod` becomes `Meta` on Mac and `Ctrl` everywhere else (engine/plugins/Shortcuts.ts:54-59, 79).
- **Named-key map.** `esc/escape`, `enter/return`, `tab`, `space/spacebar`, all four arrow aliases, `home`, `end`, `pageup`/`pagedown`, `backspace`, `delete/del`, plus `F1`–`F12` regex-passthrough (engine/plugins/Shortcuts.ts:90-110).
- **Resolution score.** `scoreOf(def) = scopeStack.lastIndexOf(def.scope ?? 'global') * 10000 + (def.priority ?? 0)`. Defs whose scope is not on the stack are filtered out first; the remaining matches are sorted by `scoreOf` descending and the top entry wins (engine/plugins/Shortcuts.ts:183-202).
- **Tiebreak is most-recently-registered, not first-registered.** `Array.prototype.sort` is stable; `shortcuts.list()` iterates `Map` insertion order; the matches array's natural order is therefore registration order. When `scoreOf` ties, the comparator returns 0 and stability preserves array order — so the last-registered binding ends up later in the array and wins the head slot (engine/plugins/Shortcuts.ts:184-185, 201). The header comment at line 184 documents this rule explicitly.
- **Dispatcher pipeline.** `keydown` → `keyFromEvent` → `resolve` → input-focus guard (unless `ignoreInputs`) → `when` predicate → `handler(e)` → `preventDefault` + `stopPropagation` unless `consume === false` (engine/plugins/Shortcuts.ts:225-240).
- **Default input-focus guard selector** is `'input:not([type=range]),textarea,[contenteditable="true"],[contenteditable=""]'` — range inputs are deliberately allowed through (engine/plugins/Shortcuts.ts:175).
- **Idempotent install.** `installShortcuts` short-circuits on the `_installed` flag; options on the second call are silently ignored (engine/plugins/Shortcuts.ts:218-219). `uninstallShortcuts` removes the listener with both capture flags as a safety belt (engine/plugins/Shortcuts.ts:253-254).
- **`useShortcut` re-registers on any prop change.** The dep array enumerates every field including `handler`, so inline arrow handlers re-register every render. Caller is expected to memoise the handler if that matters (engine/plugins/Shortcuts.ts:269-273).
- **`useShortcutScope` is a no-op when `active === false`** — the effect early-returns before pushing (engine/plugins/Shortcuts.ts:278-279).
- **Undo plugin layers three concerns** on top of the shared shortcut + topbar registries: keybindings (five entries), topbar buttons (two), and timeline-scope hover routing (engine/plugins/Undo.tsx:1-17 header).
- **Topbar buttons are bound to the `'param'` scope by construction.** `UndoButton`/`RedoButton` reach into `useEngineStore` directly for `canUndo('param')`, `peekUndo('param')`, and `undo` — there is no camera-lane equivalent in this file. Camera undo lives in app-gmt's hotkey + the engine-gmt Camera menu (engine/plugins/Undo.tsx:41-75; see Interactions § camera below).
- **`Mod+Shift+Z` is registered unconditionally**, despite its `description: 'Redo (Mac)'` label — on Win/Linux it expands to `Ctrl+Shift+Z` and fires the engine-core redo (engine/plugins/Undo.tsx:112-118). App-gmt's camera-undo binding (registered later in `main.tsx` at `priority: 10`) shadows it intentionally; see Interactions.
- **`animUndo` dispatcher.** Timeline-hover shortcuts route to `useAnimationStore.getState()[action]()`. The `(state as any)[action]` cast plus `typeof fn === 'function'` guard are dead defensiveness — `undo` / `redo` are declared required on the `SequenceSlice` interface and never absent (engine/plugins/Undo.tsx:131-134; followup q-060).
- **Direct animation-store import is cycle-safe** by inspection: animation-store slice files do not import back into engine-core. The header comment (engine/plugins/Undo.tsx:125-130) records this rationale.
- **`uninstallUndo` resets the `_installed` flag** so subsequent calls to `installUndo()` rebind cleanly (engine/plugins/Undo.tsx:169).

## Invariants

- **`_scopeStack[0] === 'global'`** by construction. Seeded once at module load (engine/plugins/Shortcuts.ts:134); re-seeded by `uninstallShortcuts` (engine/plugins/Shortcuts.ts:258-259). Calling `popScope('global')` would remove it — there is no guard; callers must not push a scope literally named `'global'`.
- **`installShortcuts` is idempotent but options-on-second-call are silently dropped.** A second `installShortcuts({ domRoot: customRoot })` after a first bare call leaves the listener on `window` and emits no warning (engine/plugins/Shortcuts.ts:218-219).
- **`uninstallShortcuts` clears the *shortcut* registry** but does not reset `Undo`'s `_installed` flag (engine/plugins/Undo.tsx:79). After teardown, a subsequent `installUndo()` is a no-op and the five undo bindings never come back — call `uninstallUndo()` first.
- **`consume` defaults to `true`.** Every registered shortcut calls `preventDefault` + `stopPropagation` unless the def opts out. This blocks browser defaults users expect for unbound modifier combos that happen to share a key (engine/plugins/Shortcuts.ts:236-239).
- **`ignoreInputs` defaults to `false`** — meaning the input guard *is* applied. The name reads as the inverse of its semantics (engine/plugins/Shortcuts.ts:47, 232).
- **Range inputs (`<input type="range">`) bypass the input guard.** Intentional — keyboard accelerators must still work while a slider has focus (engine/plugins/Shortcuts.ts:175).
- **Tiebreak rule: most-recently-registered wins** within the same scope-score + priority. The source comment at engine/plugins/Shortcuts.ts:184-185 states this explicitly; this is the rule code follows. The corresponding paragraph in `docs/engine/06_Undo_Transactions.md:116` inverts the direction in its rationale for the `Ctrl+Shift+Z` priority-10 override (see Known issues; followup q-056).
- **`keyFromEvent` uppercases `e.key`.** Non-Latin keyboard layouts that produce non-ASCII `e.key` values normalise to whatever uppercasing yields; no `e.code` fallback for letters (engine/plugins/Shortcuts.ts:125).
- **The five `installUndo` ids are reserved.** Any subsequent `shortcuts.register({ id: 'undo.global', … })` silently replaces the binding via `Map.set` (engine/plugins/Shortcuts.ts:141).
- **`UndoButton` / `RedoButton` are not host-portable.** They import `useEngineStore` from `../../store/engineStore` directly; an app using a different store identity must skip `hideTopBarButtons: true` and ship its own topbar items (engine/plugins/Undo.tsx:20, 42-44, 60-62).
- **Timeline-scope priority convention.** Both timeline-hover undo/redo bindings register at `priority: 10`. The convention also holds for the generic `Space` play-toggle override at `scope: 'timeline-hover'` in app-gmt's own shortcut registrations (followup q-055). New timeline-hover overrides should follow the priority-10 rule.

## Interactions with other subsystems

Outgoing (real edges):

- **engine store (`useEngineStore`)** — `UndoButton`/`RedoButton` and the three `'param'`-scoped handlers read/dispatch `canUndo/peekUndo/undo/redo` on the unified history slice. The slice itself (`store/slices/historySlice.ts`) owns the per-scope stacks and `pushCameraTransaction` typed entry point; see `docs/engine/06_Undo_Transactions.md` for the lane model.
- **animation store (`useAnimationStore`)** — `'timeline-hover'`-scoped handlers route to `useAnimationStore.getState().undo()` / `.redo()` from `store/animation/sequenceSlice.ts`. The cross-store import is acyclic by inspection (engine/plugins/Undo.tsx:125-134).
- **`@engine/topbar`** — `installUndo` registers two topbar items at `slot: 'right'` (engine/plugins/Undo.tsx:155-157).

Incoming (representative consumers, not exhaustive):

- **Timeline component** pushes the `'timeline-hover'` scope via `useShortcutScope('timeline-hover', isTimelineHovered)` at `components/Timeline.tsx:59`. The flag is derived from pointer-enter/leave handlers and persisted in the engine store; the reset-on-unmount safety net at `components/Timeline.tsx:61-63` prevents the scope from sticking when the timeline closes mid-hover (followup q-055).
- **History slice** — `pushCameraTransaction(state: CameraState)` (`store/slices/historySlice.ts:79` declaration, `:199` impl) is the typed entry the camera lane uses; the back-compat shim at `store/slices/historySlice.ts:289-297` routes the legacy `handleInteractionStart(CameraState)` overload through to it (followup q-055).
- **app-gmt camera bindings** — `app-gmt/main.tsx` registers `gmt.undoCameraMove` (`Ctrl+Shift+Z`, `priority: 10`) and `gmt.redoCameraMove` (`Ctrl+Shift+Y`, `priority: 10`) after `installUndo()`. Under the most-recently-registered-wins tiebreak, the camera binding would already win even without the priority override; the `priority: 10` is defensive against future re-orderings (followup q-056).
- **Space-to-play override** — `engine/plugins/Shortcuts.ts:67` (referenced as a consumer site, not part of this module's contract) registers a `Space → toggle-play` shortcut under `scope: 'timeline-hover'` priority 10 alongside the Undo plugin's bindings (followup q-055).

`depends_on: []` — `Shortcuts.ts` imports only `react`; `Undo.tsx` imports `react`, `useEngineStore`, `useAnimationStore`, `./Shortcuts`, and `./TopBar`. Every dependency is a sibling plugin or a store-shaped contract, not another e0X subsystem.

## Known issues / Phase 2 carry-in

- **drift / cleanup** — `app-gmt/main.tsx:408-414` comment inverts the tiebreak direction. It claims engine-plugin shortcuts register first and "would steal the binding" without the `priority: 10` override; in fact, registering first means *losing* the tiebreak (stable-sort + insertion-order rule). The `priority: 10` is defensive, not necessary. Originating: followup q-056. (engine/plugins/Shortcuts.ts:184-185, 201).
- **drift** — `docs/engine/06_Undo_Transactions.md:116` repeats the same inverted rationale ("`installUndo()` registers first, which would steal the binding without the override"). The conclusion (camera-undo wins) is right; the stated reason contradicts the source comment at engine/plugins/Shortcuts.ts:184-185. Either the doc or the comment should be updated for consistency. Originating: e08-shortcuts-undo survey drift row.
- **drift / cleanup** — `Mod+Shift+Z` is registered unconditionally with `description: 'Redo (Mac)'` (engine/plugins/Undo.tsx:115), but the binding fires on every platform — `docs/engine/06_Undo_Transactions.md:110` reads as though it were Mac-only. Originating: e08-shortcuts-undo survey drift row.
- **cleanup / dead defensiveness** — `animUndo`'s `(state as any)[action]` cast + `typeof fn === 'function'` guard cannot fail in practice — `undo` and `redo` are declared required on the `SequenceSlice` interface and unconditionally defined. Tighten to `useAnimationStore.getState()[action]()`. Originating: followup q-060. (engine/plugins/Undo.tsx:131-134).
- **doc-rewrite-target** — `InstallUndoOptions` (`hideTopBarButtons`, `hideShortcuts`) is not documented in `docs/engine/06_Undo_Transactions.md`. The install contract (idempotency, the `Undo._installed` vs `Shortcuts._installed` interleave footgun) is also not surfaced there. Originating: e08-shortcuts-undo survey drift table.
- **doc-rewrite-target** — The `priority: 10` convention for hover-shadowed timeline shortcuts (used by both Undo bindings and the Space play-toggle) is implicit. Worth a one-liner in `docs/engine/07_Shortcuts.md` so future contributors don't pick a colliding value. Originating: followup q-055 related findings.
- **cleanup (dead-ish)** — `_scopeSubscribers` and `_notifyScope` are wired internally (engine/plugins/Shortcuts.ts:135, 137, 148, 156) but no exported subscription API consumes them. Either the planned shortcut-help-UI subscription never landed, or this is the next refactor step. A one-line `// TODO` or removal would resolve the ambiguity.
- **invariant footgun** — `popScope('global')` would remove the seed entry from `_scopeStack`; there is no guard. Defensive enough today (no caller pushes `'global'`), but a `pushScope` whitelist or an explicit invariant assertion would harden the boundary (engine/plugins/Shortcuts.ts:134, 150-160).

## Historical context

`docs/engine/06_Undo_Transactions.md` preserves the unified-vs-per-scope migration story that this module doc does not duplicate. The two structural failure modes of the earlier unified-with-tags design — the rationale this module's `'param'`-only binding choices are still answering to — are recorded there in full:

1. **Implicit-scope conflation.** A unified stack with scope filters works for explicitly-scoped consumers (timeline-hover routing to `'animation'`, the camera-only `Ctrl+Shift+Z`), but generic UI like the topbar Undo button or a global `Ctrl+Z` handler tends to call `undo()` with no scope. With a unified stack that meant "newest entry of any kind"; camera gestures and parameter edits raced on top and the wrong lane was popped. The user-visible bug class was *"Ctrl+Z popped a camera move when the user meant to undo a slider tweak"* (`docs/engine/06_Undo_Transactions.md:7, 13`).
2. **Untyped overload at the entry point.** The pre-migration `handleInteractionStart(mode)` accepted either a string (`'param'`) or a `CameraState` object, dispatching at runtime via `typeof mode === 'object' && mode.position`. Two recording paths shared a function but not a contract (`docs/engine/06_Undo_Transactions.md:14`).

Per-scope stacks plus typed entry points (`pushCameraTransaction(state: CameraState)`) make both bug classes structurally unrepresentable (`docs/engine/06_Undo_Transactions.md:16`). The rejected alternative ("keep one stack, default unscoped to skip `'camera'`") would have fixed the immediate symptom while preserving the conflated model (`docs/engine/06_Undo_Transactions.md:165`).

That doc also preserves:

- The non-undoable-state philosophy (no per-param `undoable: false` flag yet; future direction is a dedicated `'ui'` slice the snapshotter skips) at `docs/engine/06_Undo_Transactions.md:146-152`.
- The F2b animation-history-deferral rationale (unifying the animation undo stack into engine-core's history slice would deduplicate stack-management code but require careful patch translation per keyframe edit; deferred until a real cross-scope undo flow needs it) at `docs/engine/06_Undo_Transactions.md:130`.
- The `MAX_STACK = 50` per-lane cap and diff-not-snapshot storage contract (`docs/engine/06_Undo_Transactions.md:41, 134-139`).

This module doc supersedes the existing doc for the keybinding-routing surface and the dispatcher contract; design-rationale claims (the migration story, the deferred-F2b stance, the storage decisions) stay there. `docs/engine/07_Shortcuts.md` is the cross-referenced design doc for the dispatcher itself.
