# ADR-0009: Tutorial actionBus vs store-monkeypatch

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/plugins/tutorial/actionBus.ts`

## Context

An earlier `action` trigger design patched store actions at runtime
to fire trigger-advance side-effects. Lessons declaring
`{ kind: 'action', name: 'camera.reset' }` couldn't be expressed
without each named action knowing about the tutorial system.

## Decision

Introduce `engine/plugins/tutorial/actionBus.ts` — a string-keyed
pub/sub. Call sites fire by name (`actionBus.fire('camera.reset')`);
lesson trigger evaluators subscribe by name. No store mutation;
clean unsubscribe on lesson end.

## Consequences

- Names are stringly-typed and not enumerated centrally — typos
  surface as silent no-advance.
- Current cost is small (one fire site per action); rationale is
  documented in `engine/plugins/tutorial/actionBus.ts:1-6`.
