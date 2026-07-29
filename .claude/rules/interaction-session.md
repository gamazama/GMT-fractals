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

The session answers exactly one question — *is a gesture active?* — and nothing
else. It is deliberately NOT "should the engine be doing work": render-dirtiness,
camera-blocking and scene-animation are each their own axis, and consumers
COMPOSE the session with them. Widening it into a render-intent god-object is the
trap that produced the five-iteration patch cycle the ADR was written to end.

Playback is the concrete case people get wrong. `deriveInteracting` is gesture
activity only; autonomous animation travels on the separate `isSceneAnimating`
key. Collapsing the two is caught by `test:interaction:wiring`'s
"playback is NOT gesture activity (scope boundary)" assertion.

## Invariants

- **The reactive store write happens on EDGES only.** `interacting` flips on the
  first begin and the last end, never per source-add, never on poke, never on
  debounce expiry. This primitive sits on the hottest path in the app (wheel
  10-50/s, pointermove 60-120Hz) and the codebase has already tripped React's
  "Maximum update depth" from interaction re-render storms. Hot state lives in a
  module-level ref; the debounce tail is visible only through the polled
  `isInteracting()`.
- **Every producer declares through `INTERACTION_SOURCES`, never a bare string.**
  A typo'd token does not error — it silently opens a *separate* session that no
  consumer filter matches, and a begin without its matching end strands under a
  name nothing watches.
- **Sibling apps are inert, by design.** fluid-toy / fractal-toy compose the same
  slice but wire no producers, so the machine is never activated there. Do not
  "fix" that by adding producers to a sibling app — they inherit the session from
  the connected wrappers in `components/`.
- **`_session` is a MODULE-LEVEL singleton** in `createInteractionSlice`. One
  machine per process, not per store. Node tests that construct more than one
  slice harness share it, so their cases are order-dependent.

## The coverage gate is only as wide as its SCAN_DIRS

`test:interaction:coverage` catches a missed producer by walking the tree for
`useDragValue` importers and `setIsScrubbing(true)` writers. A producer in a
directory that walk never enters is invisible to it. That is not hypothetical:
`hooks/` and `utils/` both hold live scrub producers and were unwalked until
2026-07-29, and a real one (`hooks/useDopeSheetInteraction.ts`) was verified
de-wireable with all three guards still green. If you add a producer outside
`components / engine / engine-gmt / app-gmt / hooks / utils / store`, widen
`SCAN_DIRS` in the same commit or the gate will not see it.

## Guards

```
npm run test:interaction
npm run test:interaction:wiring
npm run test:interaction:coverage
```

All three are node-only and finish in under a second each; there is no browser
guard for this subsystem. What each one can actually fail on:

- `test:interaction` — the pure machine. Falsified 2026-07-29 four ways (removing
  the unbalanced-end guard, inverting the `only` filter, making the watchdog
  ignore its activity refresh, and renaming an export so the import cannot
  resolve); all four red.
- `test:interaction:wiring` — the worker read path plus slice inertness.
  Falsified four ways, including emitting the key `interactng`, which reds here
  AND independently fails typecheck via the `Pick<EngineRenderState>` return type.
- `test:interaction:coverage` — a static producer scan. Falsified five ways after
  the SCAN_DIRS repair above.

**Not a guard for this rule, despite the name.** `smoke:orbit` drives a camera
gesture through `engine-gmt/navigation/Navigation.tsx` and is cited there; it
proves the camera producer opens a session, not that this machine is correct.
Nothing here covers `engine/hooks/useInteractionDrag.ts` by import — the coverage
gate reaches it only as text, through its consumers.
