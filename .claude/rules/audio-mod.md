---
paths:
  - "engine/features/audioMod/**"
---

# Audio modulation (the VJ rig)

Read first: `engine/features/audioMod/filterBank.ts` JSDoc (start here), then
`AudioAnalysisEngine.ts` and `freqScale.ts`.

Decisions: ADR-0103, ADR-0104, ADR-0106.

## What's load-bearing

- The WebAudio graph and its live-input constraints.
- The fractional-octave filterbank and the rule pipeline built on it.
- **The live-session hold across scene loads** — audio state survives a scene
  swap deliberately. Don't "fix" it by tearing the graph down.
- **THREE durable routing-string stores.** They are separate on purpose.

## The rate-calibration trap

Analysis rates and frame rates are not the same clock. Anything that derives a
per-frame value from a per-analysis-block measurement has to be calibrated
explicitly — a value that looks right at 60fps will be wrong at 30 or 144.

## Guards

```
npm run test:filterbank
npm run test:band-math
npm run test:band-analyser
npm run test:audio-signal
npm run test:fft
npm run smoke:audio-fps-remap
```