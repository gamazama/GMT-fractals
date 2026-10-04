---
paths:
  - "engine/features/modulation/**"
---

# Modulation — routing, dispatch, and slider curves

Read first, in this order:
1. `engine/features/modulation/targetRouting.ts` JSDoc — the FOUR sinks.
2. `engine/features/modulation/applyTarget.ts` JSDoc — the ONE branch chain.
3. `engine/features/modulation/paramMapping.ts` JSDoc — display curves.
4. `engine/animation/AnimationSystem.tsx` — `AnimationSystem.tick`.

Decisions: **ADR-0107** (targets), **ADR-0108** (slider curves), **ADR-0109** (dispatch),
**ADR-0132** (display-pass targets do not restart accumulation).

## The three things that bite

- **"Why doesn't param X modulate?"** An offset can reach exactly four sinks:
  uniform / `engine.modulations` / renderState slice merge / display-only. If the
  param isn't wired to one of them, no amount of picker work will help.
  `npm run test:modulation-coverage` prints the full matrix of every target and
  where it lands. Run it before theorising.
- **One dispatch chain.** `planModulationTarget` is run by both the live tick and
  the render export. It was triplicated once and drifted. Keep it single —
  `npm run test:modulation-parity` is what holds the line.
- **One curve resolver.** Which curve a param's slider draws lives in
  `paramMapping.ts`. Modulation composes in slider space so a fixed Gain gives
  fixed travel. Do NOT add a widget-local `createXMapping`.

## Modulating a display-pass param must not re-trace the fractal

22 of the 443 offered targets (bloom, chromatic aberration, colour grading,
droste) are applied in the display pass and declared `noAccumReset`. Dragging one
never reset accumulation; modulating one used to — the live tick emitted one
blanket RESET_ACCUM for any offset that moved, and the tick driver called the
scene "animating" for any enabled rule. Measured 2026-10-04 at 2168x1384: an LFO
on bloom intensity cost 24.7 ms of GPU per frame and held the image at one
sample; it now costs 2-4 ms once the image has converged, and the image keeps
converging underneath it.

Two places ask the same question and must keep asking the same function —
`routingInvalidatesAccumulation` in `targetRouting.ts`:

- `AnimationSystem.tick` — which moved offsets warrant a RESET_ACCUM.
- `GmtRendererTickDriver` — whether the scene is `isSceneAnimating` (which turns
  adaptive resolution on and progressive tiling off), via the `invalidates`
  filter on `hasLiveModulationSource`.

Only a uniform-sink scalar / vec axis flagged `noAccumReset` is exempt. If you
flag a param `noAccumReset`, you are also saying it may be modulated without a
re-trace — be sure it really is display-pass.

## Guards

```
npm run test:modulation-coverage
npm run test:modulation-parity
npm run test:param-mapping
npm run test:modulated-setter
```