# ADR-0004: TickRegistry is a module-scope singleton, single-instance per realm

**Date:** 2026-05-20 _(retroactive — captures the design choice made when
extracting TickRegistry into the portable engine core; reaffirmed by the
F14 fix making engine-gmt's TickRegistry a re-export shim of engine-core's.)_
**Status:** Accepted
**Scope:** `engine/TickRegistry.ts`, `engine-gmt/engine/TickRegistry.ts`

## Context

The render loop needs a single point of truth for ordered per-frame work.
Multiple options for the state container were considered:

- **Per-app instance** held in app-level state (a React context or store
  slice). Lets multiple engines coexist in one realm but adds boilerplate at
  every register/run call site.
- **Module-scope singleton** with `let`/`const` bindings inside the
  TickRegistry module. Simplest possible call shape (`registerTick(...)`,
  `runTicks(dt)`) but inherently single-instance per JS realm.

## Decision

Module-scope singleton. `_entries`, `_needsSort`, `_firstRegisterTime`,
`_lastTickTime`, `_warnedNoTicks`, and `_warnedDoubleRun` are all `let` /
`const` bindings shared by every import of the module
(`engine/TickRegistry.ts:38-46, 93`).

The engine-gmt fork is a re-export shim (`export * from '../../engine/TickRegistry'`)
not a separate singleton — both engine and engine-gmt consumers share the
single registry. This is the F14 fix; previously each tree had its own copy
and registrations from engine-gmt code didn't reach the engine-core run loop.

## Consequences

- Multi-engine-instance in the same realm is **not supported**. Two engine
  boots would share one tick list and the double-run guard would actively
  drop the second driver's calls (see ADR-0003). The supported way to run
  two engines is to fork the worker — each worker has its own JS realm and
  its own singleton.
- The shim shape (engine-gmt re-exporting from engine-core) is the second
  half of this decision: without the shim, engine-gmt would have its own
  module-scope singleton with its own registry, and the F14 silent-no-tick
  failure mode would return. See `docs/modules/engine-fork-rules.md` for
  the general policy on shim vs fork.
- HMR adds complexity: if the module is re-executed, the bindings reset.
  Duplicate-name guards survive HMR (different module-instance but same id);
  warn-once flags do not (each module instance has its own).
- See followup q-025 (`plans/doc-audit-state/survey/_followups/q-025.md`).
