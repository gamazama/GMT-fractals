---
subsystem_id: e08-shortcuts-undo
audited_at: 2026-05-19T00:00:00Z
files:
  - path: engine/plugins/Shortcuts.ts
    blob_sha: 45aa222b296bb73154824d30cea4cf4656d0ed64
    lines_read: [1, 283]
  - path: engine/plugins/Undo.tsx
    blob_sha: 2f5a0f29376d5ecc563a07d80ae2f387580511c7
    lines_read: [1, 170]
---

## Public API surface

### `engine/plugins/Shortcuts.ts`
- `interface ShortcutDef` — Shortcuts.ts:28-49 (fields: `id`, `key`, `scope?`, `priority?`, `handler`, `description?`, `category?`, `when?`, `consume?`, `ignoreInputs?`).
- `interface InstallShortcutsOptions` — Shortcuts.ts:208-215 (`domRoot?`, `capture?`, `ignoreSelector?`).
- `const shortcuts` registry object — Shortcuts.ts:139-171 with methods `register`, `unregister`, `pushScope`, `popScope`, `list`, `lookup`, `clear`.
- `installShortcuts(options?)` — Shortcuts.ts:217-249. Installs single `keydown` listener; idempotent via `_installed` flag (Shortcuts.ts:218).
- `uninstallShortcuts()` — Shortcuts.ts:251-261. Removes listener (both bubble+capture), clears registry, resets scope stack to `['global']`.
- `useShortcut(def)` React hook — Shortcuts.ts:268-274.
- `useShortcutScope(scope, active)` React hook — Shortcuts.ts:277-283.

### `engine/plugins/Undo.tsx`
- `UndoButton: React.FC` — Undo.tsx:41-57.
- `RedoButton: React.FC` — Undo.tsx:59-75.
- `interface InstallUndoOptions` — Undo.tsx:81-86 (`hideTopBarButtons?`, `hideShortcuts?`).
- `installUndo(options?)` — Undo.tsx:88-159. Idempotent via `_installed` (Undo.tsx:89-90).
- `uninstallUndo()` — Undo.tsx:161-170.

## Architecture (10-25 bullets)

- Shortcuts module owns a flat `Map<id, ShortcutDef>` registry plus a stack of scope names initialized to `['global']` (Shortcuts.ts:133-134).
- Key normalization fixes modifier order (`Ctrl|Alt|Shift|Meta`) and case (Shortcuts.ts:63, 66-88); ordering of mods in user strings does not matter.
- `'Mod'` resolves to `'Meta'` on Mac (via `isMac()` UA sniff) and `'Ctrl'` elsewhere (Shortcuts.ts:79, 54-59).
- Named-key map normalizes aliases: `esc→Escape`, `space→Space`, `up→ArrowUp`, etc., plus F1-F12 passthrough (Shortcuts.ts:90-110).
- `keyFromEvent` builds the canonical key from a `KeyboardEvent`, ignoring bare modifier presses and special-casing `e.code === 'Space'` (Shortcuts.ts:113-129).
- `pushScope` / `popScope` are name-based with tolerant pop: scans newest-first for nearest match rather than asserting LIFO order, to survive out-of-order effect cleanup under fast scope changes (Shortcuts.ts:150-160).
- Scope subscription set (`_scopeSubscribers`) and `_notifyScope()` exist but are not consumed by anything exported (Shortcuts.ts:135-137) — defined but unused publicly.
- `resolve()` scoring: `scope_index_in_stack * 10000 + (priority ?? 0)`; highest wins, tie-break by registration recency (`sort` is stable; matches array order = `Map` insertion order) (Shortcuts.ts:183-203).
- A shortcut whose scope is not present in `_scopeStack` is silently ignored (Shortcuts.ts:186-190).
- Default text-input guard selector: `'input:not([type=range]),textarea,[contenteditable="true"],[contenteditable=""]'` (Shortcuts.ts:175). Range inputs are intentionally allowed-through.
- Listener installs on `window` by default (bubble phase); `consume !== false` triggers `preventDefault()` + `stopPropagation()` after the handler runs (Shortcuts.ts:221-240).
- On install, `window.__shortcuts` is exposed for dev console / smoke tests (Shortcuts.ts:246-248).
- `uninstallShortcuts` removes the listener with both `false` and `true` capture flags (Shortcuts.ts:253-254) — guards against capture-flag mismatch on teardown.
- `useShortcut` registers/unregisters via `useEffect` keyed on every field of the def including `handler` (Shortcuts.ts:268-274) — re-registers whenever any prop identity changes.
- `useShortcutScope` is a no-op when `active === false`; otherwise pushes on mount, pops on cleanup (Shortcuts.ts:277-283).
- Undo plugin layers three concerns on the shortcut + topbar registries: keybindings, topbar buttons, and timeline-scope routing (Undo.tsx:1-17 header).
- `UndoButton` / `RedoButton` are hard-wired to the `'param'` scope of the store (`undo('param')`, `peekUndo('param')`, `canUndo('param')`) — Undo.tsx:42-49, 60-67. Camera lane is intentionally not exposed via topbar.
- Three global keybindings registered at default priority 0, no scope (i.e. `'global'`): `Mod+Z → undo('param')`, `Mod+Y → redo('param')`, `Mod+Shift+Z → redo('param')` (Undo.tsx:98-118).
- Two timeline-hover keybindings at priority 10, scope `'timeline-hover'`: `Mod+Z` / `Mod+Y` route to `useAnimationStore.getState().undo()/redo()` via `animUndo()` dispatcher (Undo.tsx:131-152).
- `animUndo` reaches into the animation store via `(state as any)[action]` and typeof-checks before invoking (Undo.tsx:131-134) — defensive against the method being absent.
- Topbar registration: `undo` at `slot:'right', order:-20`, `redo` at `slot:'right', order:-19` (Undo.tsx:156-157).
- `uninstallUndo` unregisters all five shortcut ids and both topbar items, then resets `_installed = false` (Undo.tsx:161-170).
- Animation store import is direct (`useAnimationStore` from `store/animationStore`) — header comment justifies this as cycle-free because animation slice files don't import back into engine-core (Undo.tsx:20, 125-130).

## Invariants and gotchas

- `_scopeStack` always contains `'global'` as element 0 after `installShortcuts` or after `uninstallShortcuts` re-seeds it (Shortcuts.ts:134, 258-259). Calling `popScope('global')` would remove it — there is no guard.
- The module's `_registry`, `_scopeStack`, and `_installed` are module-scoped singletons (Shortcuts.ts:133-134, 205). Cannot run two independent dispatcher instances in the same JS realm.
- `installShortcuts` is idempotent but **silently ignores options on the second call** (Shortcuts.ts:218-219) — no warning if `domRoot`/`capture` change.
- `uninstallShortcuts` clears the registry but `installUndo`'s `_installed` flag is in a different module (Undo.tsx:79). After a shortcut teardown, calling `installUndo()` again will be a no-op and bindings won't return — Undo bindings can be silently lost.
- `useShortcut` dep array includes `handler` (Shortcuts.ts:273); callers passing inline arrow functions will re-register every render.
- `keyFromEvent` uppercases `e.key`, so layouts where the key character is non-Latin will produce non-normalizable strings; no fallback to `e.code` for letters (Shortcuts.ts:125).
- Tie-break within a scope is "most recently registered wins" because `Array.sort` is stable and Map preserves insertion order (Shortcuts.ts:201). This is the mechanism doc 06 invokes for the `Ctrl+Shift+Z` collision — but the comment in Shortcuts.ts:184-185 actually says "most-recently-registered wins within same priority", which contradicts the doc claim that `installUndo()` registers first and "would steal" without an override (see drift table).
- `consume` default is `true` (Shortcuts.ts:236), so registered shortcuts call `preventDefault` + `stopPropagation` unless explicitly opted out — can block browser defaults users expect (e.g. browser refresh on F5).
- `ignoreInputs` default is `false`, meaning the input guard **is** applied unless the shortcut sets `ignoreInputs: true` (Shortcuts.ts:232). The JSDoc on the field (Shortcuts.ts:47) reads "Fire even when an `<input>`... has focus. Default false" — semantics correct, name is inverted from intuitive reading.
- `UndoButton` / `RedoButton` reach into `useEngineStore` directly (Undo.tsx:42-44, 60-62) — they are not portable to apps using a different store identity.
- Three undo IDs registered by `installUndo` (`undo.global`, `redo.global`, `redo.global.shift`, `undo.animation`, `redo.animation`) collide-by-id with any other registrant using the same names — Shortcuts.ts:140-142 silently replaces.
- Animation undo path uses `(state as any)[action]` (Undo.tsx:132) — bypasses TypeScript; renaming `animationStore.undo` would not produce a compile error.
- `Mod+Shift+Z` (Undo.tsx:114) is registered as redo for Mac convention but on Win/Linux this expands to `Ctrl+Shift+Z` — which is exactly app-gmt's camera-redo binding per doc 06. Both end up at scope `'global'` priority 0; resolution depends on registration order (see drift).

## Drift from existing doc (`dev/docs/engine/06_Undo_Transactions.md`)

| Doc claim | Current code | Severity |
|---|---|---|
| Hotkey table row: `Mod+Y / Mod+Shift+Z (Mac)` → `redo('param')` registered by `@engine/undo` global (06:110) | Three separate registrations: `redo.global` for `Mod+Y` (Undo.tsx:105-111) and `redo.global.shift` for `Mod+Shift+Z` (Undo.tsx:112-118). Both unconditional (not Mac-only). Description for the shift variant is literally `"Redo (Mac)"` (Undo.tsx:115) but the binding fires on every platform. | minor — doc reads as if `Mod+Shift+Z` is Mac-only; in code it's universal |
| "The priority-10 override on `Ctrl+Shift+Z` exists because `Mod+Shift+Z` also expands to `Ctrl+Shift+Z` on Win/Linux ... Both bind at scope `'global'` priority 0, so the resolver tie-breaks on insertion order; `installUndo()` registers first, which would steal the binding without the override." (06:116) | Confirmed: `redo.global.shift` is scope=undefined (→ `'global'`) priority undefined (→ 0) (Undo.tsx:112-118). Tie-break comment in Shortcuts.ts:184 says "most-recently-registered wins within same priority". By that rule, the last-registered binding wins — so if app-gmt registers `Ctrl+Shift+Z` *after* `installUndo()`, it would already win without a priority override. The doc's reasoning about who registers first depends on tie-break being "first-registered wins"; code comment says the opposite. Either the doc's rationale or the code comment is wrong; the priority-10 override on the app-gmt side makes the question moot in practice. | break — internal rationale inconsistent; check actual `resolve()` behavior against doc and Shortcuts.ts:184 comment |
| "`@engine/undo` registers `Mod+Z` and `Mod+Y` under the `'timeline-hover'` shortcut scope at priority 10" (06:128) | Matches: `undo.animation` Undo.tsx:135-143, `redo.animation` Undo.tsx:144-152 — both `scope:'timeline-hover'`, `priority:10`. | none |
| "Both call `undo('param')` / `redo('param')` — they intentionally never operate on the camera stack" (06:120, re UndoButton/RedoButton) | Matches: Undo.tsx:42-49, 60-67. | none |
| "Animation history lives in `animationStore.undoStack`... The F2b unification ... never landed" (06:43, 130) | Matches comment in Undo.tsx:125-130. | none |
| Doc lists `installUndo`-registered hotkeys but doesn't mention the `description` / `category` metadata (06:107-114) | Each registration carries `description` + `category: 'Edit'` or `'Animation'` (Undo.tsx:101-117, 139-151), suitable for a shortcut-help UI. Not surfaced in doc 06 — but doc 07 is in scope per the prompt header. | minor — surface in 07 if not already |
| Doc 06 doesn't mention `InstallUndoOptions` (`hideTopBarButtons`, `hideShortcuts`) (06 has no install API section for the plugin) | `InstallUndoOptions` exists, Undo.tsx:81-86. Doc only describes the hotkey table and topbar binding as facts of life. | minor — install knobs missing from doc |
| "Camera has its own Ctrl+Shift+Z binding" (Undo.tsx:96-97 comment, mirroring 06:113) | The camera binding itself is **not in either audited file** — it's registered by app-gmt. Audited code only documents this as a comment. | n/a — out of scope file |
| Doc 06 says nothing about the `_installed` flag or idempotency contract | `installUndo` is idempotent and `uninstallUndo` resets it (Undo.tsx:79, 89-90, 169). | minor — install contract undocumented |
| Doc 06 says `undo`/`redo` "always carry a scope; there is no unscoped fallback" (06:6) | UndoButton/RedoButton + the three undo plugin handlers all pass an explicit `'param'` (Undo.tsx:49, 67, 103, 110, 117). Consistent. | none |

No `Recommendation:` line needed — drift is small and contained to two minor doc gaps plus one inconsistent rationale.

## Open questions

- `pushCameraTransaction` and the `'timeline-hover'` scope-push site are referenced by doc 06 but live outside the two audited files (in `store/slices/historySlice.ts` and the Timeline component respectively). Not verified here.
- The app-gmt `Ctrl+Shift+Z` / `Ctrl+Shift+Y` camera binding referenced in doc 06:113-116 is not in the audited files; if the tie-break rule in Shortcuts.ts:184 ("most-recently-registered wins") is authoritative, the priority-10 override may be defensive rather than necessary — depends on registration order vs. `installUndo`. Worth checking app-gmt's plugin install order.
- `_scopeSubscribers` (Shortcuts.ts:135) is wired up internally but has no exported subscription API. Either intended for a future shortcut-help UI that re-renders on scope changes, or dead code. Worth a one-line comment or removal.
- `lookup(key)` (Shortcuts.ts:164-167) and `clear()` (Shortcuts.ts:168-170) are on the public registry but no caller seen in audited files — usage probably in shortcut-help or test infra.
- Whether any app currently passes `InstallShortcutsOptions.domRoot` / `capture` (Shortcuts.ts:208-215). The idempotency check (Shortcuts.ts:218) silently drops options on second call, which could surprise.
- `useAnimationStore.getState()[action]` (Undo.tsx:132) — does the animation store actually expose `undo` / `redo` methods? The defensive `typeof fn === 'function'` check (Undo.tsx:133) suggests uncertainty.
