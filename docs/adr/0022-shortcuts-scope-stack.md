# ADR-0022: Shortcuts scope stack

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/plugins/Shortcuts.ts`

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
