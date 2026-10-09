---
paths:
  - "engine/InteractionSessionMachine.ts"
  - "engine/hooks/useInteractionDrag.ts"
  - "store/slices/createInteractionSlice.ts"
  - "engine-gmt/interaction/**"
  - "engine-gmt/renderer/renderInteractionState.ts"
---

# InteractionSession — "is a continuous user gesture in flight?"

Read first, in this order: the JSDoc headers on
`engine/InteractionSessionMachine.ts` (the pure machine),
`store/slices/createInteractionSlice.ts` (the Zustand wrapper and its
transient-reactive contract) and `engine-gmt/renderer/renderInteractionState.ts`
(the worker read path). The canonical token table is
`engine-gmt/interaction/interactionSources.ts`.

Decisions: **ADR-0061**.

## Scope boundary

The session answers exactly one question — *is a gesture active?* It is NOT "should the
engine be doing work": render-dirtiness, camera-blocking and scene-animation are each their
own axis, and consumers COMPOSE the session with them. Playback is the case people get
wrong: `deriveInteracting` is gesture activity only; autonomous animation travels on the
separate `isSceneAnimating` key.

## Invariants

- **The reactive store write happens on EDGES only.** `interacting` flips on the first
  begin and the last end, never per source-add, never on poke, never on debounce expiry
  (wheel runs 10-50/s, pointermove 60-120Hz). Hot state lives in a module-level ref; the
  debounce tail is visible only through the polled `isInteracting()`.
- **Every producer declares through `INTERACTION_SOURCES`, never a bare string.** A typo'd
  token silently opens a *separate* session that no consumer filter matches.
- **Sibling apps are inert, by design.** fluid-toy / fractal-toy compose the same slice but
  wire no producers. Do not add producers to a sibling app.
- **`_session` is a MODULE-LEVEL singleton** in `createInteractionSlice`: one machine per
  process, not per store. Node tests that construct more than one slice harness share it,
  so their cases are order-dependent.
- **The coverage gate is only as wide as its `SCAN_DIRS`.** `test:interaction:coverage`
  walks the tree for `useDragValue` importers and `setIsScrubbing(true)` writers. If you add
  a producer outside `components / engine / engine-gmt / app-gmt / hooks / utils / store`,
  widen `SCAN_DIRS` in the same commit.

## Guards

```
npm run test:interaction            # the pure machine
npm run test:interaction:wiring     # the worker read path plus slice inertness
npm run test:interaction:coverage   # a static producer scan
```

All three are node-only, under a second each; there is no browser guard for this
subsystem. `smoke:orbit` proves the camera producer opens a session, not that this machine
is correct. Nothing covers `engine/hooks/useInteractionDrag.ts` by import — the coverage
gate reaches it only as text, through its consumers.
