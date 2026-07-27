---
paths:
  - "engine/TickRegistry.ts"
  - "engine/AnimationEngine.ts"
  - "engine/animation/**"
  - "engine-gmt/animation/**"
---

# Tick loop + animation engine

Read first: JSDoc at the top of `engine/TickRegistry.ts` and `engine/AnimationEngine.ts`.

Decisions: ADRs 0001-0004 (loop, phases, delta units), 0015-0017 (binders,
recording, log/camera-pair tracks).

## Invariants

- **`runTicks` takes SECONDS, not milliseconds.** `runTicks(deltaSec)` per ADR-0002.
  The pre-extraction narrative doc claiming `runTicks(deltaMs)` is wrong.
- **The render loop is app-owned.** The engine provides `TickRegistry` phases; the
  app (or the `@engine/render-loop` core plugin) calls `runTicks(dt)` each frame.
  Don't bypass it with an ad-hoc `useFrame`.
- Track binding follows the DDFS string contract — see
  [`docs/policy/ddfs-string-contract.md`](../../docs/policy/ddfs-string-contract.md).

## Guards

```
npm run smoke:anim-play
npm run smoke:anim-orbit
npm run smoke:anim-vec2
npm run smoke:track-binding
npm run smoke:binder-registry
```