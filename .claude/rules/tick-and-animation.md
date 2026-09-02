---
paths:
  - "engine/TickRegistry.ts"
  - "engine/plugins/RenderLoop.tsx"
  - "engine/AnimationEngine.ts"
  - "engine/animation/**"
  - "engine-gmt/animation/**"
---

# Tick loop + animation engine

Read first: JSDoc at the top of `engine/TickRegistry.ts` and `engine/AnimationEngine.ts`.

`engine/plugins/RenderLoop.tsx` (`@engine/render-loop`) is the *only* file under
`engine/**` that calls `runTicks` — it is the default RAF driver. It is mounted by
`App.tsx` (the demo entry, `demo.html` → `index.tsx` → `App.tsx`), `fluid-toy/` and
`gradient-explorer/`. **app-gmt does NOT mount it**: its canonical driver is
`engine-gmt/renderer/GmtRendererTickDriver.tsx`, which runs the tick phases *and*
dispatches the worker frame. Mounting both is the ADR-0003 double-run bug.

Decisions: ADR-0001 (tick phases as numeric constants), ADR-0002 (delta in
seconds), ADR-0003 (single-driver double-run guard), ADR-0004 (TickRegistry
singleton scope), ADR-0015 (log-value-space + camera-pair linear-in-zoom),
ADR-0016 (deterministic playback). Modulation dispatch off the ANIMATE tick:
ADR-0107 (live-modulation transport), ADR-0109 (one modulation dispatcher).
There is no binder-registry ADR — `engine/animation/binderRegistry.ts`'s
top-of-file JSDoc is the contract.

## Invariants

- **`runTicks` takes SECONDS, not milliseconds.** `runTicks(deltaSec)` per ADR-0002.
  The pre-extraction narrative doc claiming `runTicks(deltaMs)` is wrong.
- **The render loop is app-owned.** The engine provides `TickRegistry` phases; the
  app (or the `@engine/render-loop` core plugin) calls `runTicks(dt)` each frame.
  Don't bypass it with an ad-hoc `useFrame`.
- Track binding follows the DDFS string contract — see
  [`docs/policy/ddfs-string-contract.md`](../../docs/policy/ddfs-string-contract.md).
- **`binderRegistry.lookup` is consulted BEFORE `AnimationEngine`'s per-id
  binder cache**, so a binder registered after a DDFS-derived lookup still
  takes effect. Don't "optimise" the registry hit behind the cache.
- **Log tracks interpolate in log-value space, Bezier included.** Tangent
  y-values on a track registered via `logTrackRegistry` are LOG-UNITS;
  `AnimationMath.calculateTangents` takes the same `isLog` flag so authored
  and evaluated curves agree. ADR-0015's Decision section predates this and
  says Bezier is unsupported on log tracks — the code is the truth.
- **Modulation branch bodies are NOT in `AnimationSystem.tsx`.** Routing lives
  in `engine/features/modulation/targetRouting.ts`, the branch bodies in
  `engine/features/modulation/applyTarget.ts` (shared with the export path,
  ADR-0109). The tick only executes the returned plan.

## Guards

```
npm run test:tick-registry   # node-only: phase order, a throwing tick is isolated and
                             # reported once, disposer, the 1 ms double-run guard
npm run smoke:anim-play
npm run smoke:anim-orbit
npm run smoke:anim-vec2
npm run smoke:track-binding
npm run smoke:binder-registry
```