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

Decisions: **ADR-0107** (targets), **ADR-0108** (slider curves), **ADR-0109** (dispatch).

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

## Guards

```
npm run test:modulation-coverage
npm run test:modulation-parity
npm run test:param-mapping
npm run test:modulated-setter
```