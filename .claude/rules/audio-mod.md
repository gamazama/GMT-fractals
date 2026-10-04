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

## Performance: the audio stack is cheap; what it switches ON is not

Measured 2026-10-04 (the `bench:audio` script, RTX 2070, Mandelbulb at 888×664):
an audio rule and an LFO on the same param cost the same — 5.8 ms GPU per frame,
60 fps, ~19 % main thread. Analysis itself is ~0.2 ms per hop on the audio thread.
The 14–30 fps collapse reported as "audio drops the frame rate" was not the audio
stack. It was **the page repainting every frame**: switching modulation on lights
the slider's "modulated" dot, a smooth infinite CSS pulse, which makes the browser
present the whole window at 60 Hz. Those presents run on the GPU process's main
thread — the thread that decodes the render worker's WebGL commands — and after a
focus change each one blocks ~15 ms. The same happened with nothing modulated
whenever a light gizmo was up (it rewrote its SVG attributes every tick) or a
point light existed (an infinite ping on its top-bar orb).

So, for anything under this rule that puts pixels on screen (`AudioPanel`,
`AudioSpectrum`, `AudioLinkControls`):

- **No smooth infinite CSS animation.** Use `animate-pulse-live` (stepped; ~3
  presents/s) for a state indicator, never `animate-pulse`. See
  `tailwind.config.js`.
- **No per-frame DOM write.** Write on change. The spectrum canvas is the one
  deliberate exception: 30 Hz, CPU-raster, only while on screen.
- **Measure with `bench:audio`, not the fps counter.** Compare `lfo` against
  `audio` (same params moving, with and without the audio stack) and run a focus
  change (`lfo@bg`, `lfo@fg`) — the collapse only appears after one. Lead with
  `presMs` (how long each compositor present blocks) and `gpu ms`; frames/s is
  what those two produce.

## Guards

```
npm run smoke:idle-damage
npm run test:filterbank
npm run test:band-math
npm run test:band-analyser
npm run test:worklet-analysis
npm run test:audio-signal
npm run test:fft
npm run test:session-hold
npm run smoke:audio-fps-remap
```