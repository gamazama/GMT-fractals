# ADR-0022: Shortcuts scope stack

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/plugins/Shortcuts.ts`

> **Update 2026-07-28 (tiebreak direction corrected; decision unchanged):** the
> Decision's parenthetical and the last Consequences bullet state the tiebreak
> backwards. `resolve()` sorts matches descending by
> `scopeStack.lastIndexOf(scope) * 10000 + priority` and returns `matches[0]`.
> `Array.prototype.sort` is stable (ES2019) and `matches` derives from
> `shortcuts.list()`, i.e. registry **Map insertion order** — so on a score tie
> the **FIRST-registered** shortcut stays at index 0 and wins; later
> registrations sink to the tail. To beat an existing binding you must raise
> `priority` or use a deeper scope. `docs/history/engine/06_Undo_Transactions.md`
> (§Hotkey routing) was right all along; this ADR's "legacy docs that claim
> 'first wins' are wrong" bullet, and its `Shortcuts.ts:184-185` line reference,
> are both retracted. Practical consequence: `installUndo()` registers
> `redo.global.shift` (`Mod+Shift+Z`, which expands to `Ctrl+Shift+Z` on
> Win/Linux) *before* `app-gmt/main.tsx` registers `gmt.undoCameraMove`, so that
> binding's `priority: 10` is **load-bearing** — removing it silently turns
> Ctrl+Shift+Z from camera-undo into param-redo. The scope-stack design and the
> `consume: true` default are unaffected. Pinned by `npm run smoke:undo`
> ("[shortcuts] resolver tiebreak") and by the `@invariant` on `resolve` in
> `engine/plugins/Shortcuts.ts`.

## Context

The previous central if-ladder approach made it impossible for
plugins to contribute keybindings without touching a core file, and
a `Ctrl+Z` at the global level couldn't be overridden by the
timeline-hovered animation undo without if-ladder edits.

## Decision

Scope-stack-based dispatcher — shortcuts declare a `scope` (default
`'global'`); the dispatcher walks the stack newest-first and uses
`scopeStack.lastIndexOf(scope) * 10000 + priority` to score.
Tiebreak is most-recently-registered (stable sort + insertion
order). Default `consume: true` blocks browser defaults — opt-out
with `consume: false`.

## Consequences

- Timeline-hover overrides simply push `'timeline-hover'` while
  hovered and register at scope `'timeline-hover'` priority 10
  (convention).
- Registering AFTER another shortcut with the same key + scope +
  priority wins — legacy docs that claim "first wins" are wrong;
  source comment at `Shortcuts.ts:184-185` is authoritative.
