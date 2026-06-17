# ADR-0001: Tick phases as numeric constants, sorted by integer compare

**Date:** 2026-05-20 _(retroactive — captures a decision made during pre-extraction Phase 5/6 engine work; surfaced and crystallised during the 2026-05-20 doc audit.)_
**Status:** Accepted
**Scope:** `engine/TickRegistry.ts`

## Context

Per-frame work on the main thread needs a deterministic execution order:
SNAPSHOT (freeze camera) → ANIMATE (timeline, modulation) → OVERLAY (DOM
gizmos) → UI (counters, monitors). Within a phase, registration order should
be stable so consumers can predict adjacency.

Alternatives considered for representing phases:

- **String tags** (e.g. `'snapshot'`, `'animate'`). Self-documenting at call
  sites but every dispatch becomes a string compare, and sort comparators
  must hand-roll the ordering.
- **Symbol enum** (TS `enum { SNAPSHOT, ANIMATE, ... }`). Compiles to numbers
  in practice but TypeScript's union-typing of `enum` values is awkward and
  forces opaque imports.
- **Numeric constants in a frozen object literal** (the chosen path).

## Decision

Phases are encoded as numeric constants in a single frozen object literal
`TICK_PHASE = { SNAPSHOT: 0, ANIMATE: 1, OVERLAY: 2, UI: 3 } as const`
(`engine/TickRegistry.ts:23-28`). The exported type is
`TickPhase = typeof TICK_PHASE[keyof typeof TICK_PHASE]` — i.e. `0 | 1 | 2 | 3`.

Ordering is via integer compare on the `phase` field: `(a, b) => a.phase - b.phase`.
Within a phase, `Array.prototype.sort` is stable in V8/SpiderMonkey, so
registration order is preserved.

## Consequences

- Sort is a single integer subtraction per pair — minimal overhead, lazy
  (only runs when `_needsSort` is dirty).
- Call sites use `TICK_PHASE.OVERLAY` constants, not raw integers, preserving
  readability.
- Adding a new phase requires picking an integer slot. The current 0-3 range
  is dense; inserting a phase between SNAPSHOT and ANIMATE would either
  renumber (breaking source-code constants) or use a float (e.g. 0.5). Neither
  has been needed in practice.
- The numeric encoding makes the `phaseNames` array in `getTickManifest`
  (line 129) a positional lookup — fragile if phases are ever renumbered.
  Acceptable trade-off given how rarely phases change.
