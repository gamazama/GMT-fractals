---
paths:
  - "engine/features/audioMod/**"
---

# Audio modulation (the VJ rig)

Read first, in signal order: `AudioTransport.ts` (how sound reaches a node),
`worklet/analysisProcessor.ts` + `dsp/bandAnalyser.ts` (where analysis actually
runs), `WorkletAnalysis.ts` (the main-thread receiver), then `filterBank.ts`
(a holder + range queries) and `freqScale.ts` (display only).
`AudioAnalysisEngine.ts` is a delegating facade over the first and third.

Decisions: ADR-0103 (live-session hold), ADR-0104 (fractional-octave
filterbank), ADR-0105 (per-band adaptive gain rejected), ADR-0106 (bands in
Hz), **ADR-0110 (analysis moved into an AudioWorklet)**.

## What's load-bearing

- The WebAudio graph and its live-input constraints.
- **Analysis runs on the audio thread**, at a quantum-aligned hop (256 samples
  ≈ 187.5 Hz at 48 kHz), and posts BANDS — not bins — in ~60 Hz batches.
  `filterBank.ts` no longer analyses anything; its DSP copy was deleted with
  ADR-0110 precisely because a second implementation drifts. Don't put DSP back
  in it — `dsp/` is the shared home both threads import.
- **There is no main-thread analysis fallback, deliberately.** A worklet load
  failure surfaces as `analysisFailed` in the panel.
- **The live-session hold across scene loads** — the audio ENGINE survives a
  scene swap deliberately (it is equipment). Don't "fix" it by tearing the
  graph down. Note the 2026-07-25 reversal: `modulation.rules` are scene
  CONTENT and are NOT held. `test:session-hold` pins both halves.
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
npm run test:session-hold
npm run smoke:audio-fps-remap
```