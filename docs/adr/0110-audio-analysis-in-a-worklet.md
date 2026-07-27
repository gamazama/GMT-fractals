# ADR-0110: Audio analysis moves to an AudioWorklet

- **Status:** Accepted (A/B in progress — see Consequences)
- **Date:** 2026-07-25
- **Relates to:** ADR-0104 (fractional-octave filterbank), ADR-0105 (per-band adaptive gain rejected), ADR-0106 (bands in Hz), ADR-0103 (audio rig as live session state)

## Context

> **Update 2026-07-27 (mechanism corrected; decision unchanged):** The paragraph
> beginning "The real exposure is main-thread **blocking**" mis-reads
> `GmtRendererTickDriver.tsx:321`. That branch does not throttle `runTicks` —
> `runTicks(clampedDelta)` is called on *both* sides of it, and the `return`
> skips only what follows: the optics merge, the R3F FOV sync, camera/offset
> serialisation, the `renderState` build, the convergence gate and
> `proxy.sendRenderTick`. At UI fps < 20 the driver yields ONE worker dispatch
> per second; every registered tick, analysis included, keeps running once per
> frame. `runTicks` has no rate limit of its own (only a 1 ms double-run guard).
> This has been the behaviour since the file was created in `50547f46` — it is
> not a regression.
>
> The starvation is real; the cause is that analysis was simply
> **frame-rate-bound** — it ran off a registered tick, so its rate *was* the UI
> frame rate, degrading to whatever the blocked main thread managed rather than
> to 1 Hz. Two effects follow mechanically from the old main-thread code, and
> the decision removes both:
>
> 1. `AnalyserNode.getFloatFrequencyData` returns only the most recent
>    `fftSize` samples — 85 ms at the default 4096/48 kHz. Once the read
>    interval exceeds that window (below ~12 fps) the audio between reads
>    enters no FFT frame at all, so transients there are lost outright rather
>    than late.
> 2. `FilterBank.computeFluxRate` differenced consecutive main-thread reads and
>    divided by the frame delta. `normalized` is bounded to [0,1], so the flux
>    rate is bounded by 1/dt = fps, and `ModulationEngine` maps it through
>    `min(1, rate / TRANSIENT_FULL_SCALE)` with `TRANSIENT_FULL_SCALE = 20`.
>    The transient channel's maximum attainable output is therefore ≈ fps/20 —
>    below 20 fps it cannot reach full scale at all, and a `thresholdMin` tuned
>    at 60 fps stops being reachable as the rate falls. A fixed ~187.5 Hz hop
>    with max-since-last-read aggregation is exactly what removes this.
>
> The magnitude in the original text ("1 Hz", "whole seconds") is not derivable
> from this path. The only thing in the system that would produce ~1 Hz is
> browser RAF throttling of a hidden or occluded tab — not investigated, and
> recorded here only as the untested candidate that fits the number. The
> decision stands regardless: all of the above are fixed by taking analysis off
> the main-thread tick. `HANDOFF.md` carries the same mis-statement, from the
> same origin (the `7ba897aa` commit message).

Analysis ran on the main thread: `AnalyserNode.getFloatFrequencyData` pulled
once per tick, then `filterBank` turned bins into bands.

The failure mode is **not** what it first appears. A heavy fractal does not
slow it down — rendering runs in a worker, and `GmtRendererTickDriver`
documents that "the main thread runs at 60 while the worker may render far
slower". Owner-confirmed in the field: no audio degradation under GPU load. An
earlier draft of this ADR and its code comments claimed otherwise and were
wrong.

The real exposure is main-thread **blocking**. `GmtRendererTickDriver.tsx:321`
throttles `runTicks` to once per SECOND when UI fps drops under 20. Analysis
then collapses to 1 Hz: the spectrum freezes, and every transient inside that
second is lost outright rather than merely delayed.

That matters more than live feel, because of how audio reaches a render.
`audioClipSync` never seeks during steady-state play — the deck free-runs on
its own realtime clock. So the FFT is never deterministic, and audio only
reaches an export by being **recorded to keyframes first**. Modulation
recording back-fills every skipped timeline frame with *the same* FFT value
(`AnimationSystem.tsx:244-248`), so under the 1 Hz throttle a whole second of
automation becomes one flat step across ~60 keyframes. The temporal fidelity of
the one path audio takes into an output is capped by main-thread health.

Secondary: `AnalyserNode.smoothingTimeConstant` is applied per read CALL with
no time compensation, so its effective time constant scales with the gap
between calls. At a steady 60 that is simply the tuning; it misbehaves only
when the rate moves.

## Decision

**Analysis moves onto the audio thread**, behind a temporary A/B flag.

Structure, in the order it had to happen:

1. **`AudioTransport` ⊥ `AudioAnalysis`.** Forced, not aesthetic — a `<audio>`
   deck cannot live on the audio thread. `AudioAnalysisEngine` became a pure
   facade so ~30 call sites did not churn. The transport exposes one node,
   `analysisBus`, which both backends hang off.
2. **`bandMath.ts`.** Band table, kernels, tilt and `dbToUnit` extracted as
   pure functions. `filterBank.ts` instantiates a singleton at module scope; a
   worklet importing from it would construct a second FilterBank on the audio
   thread.
3. **`dsp/` core.** `fft.ts` (radix-2, verified against a naive DFT to 2e-6),
   `spectrumFrame.ts` (Hann + dB), `bandAnalyser.ts` (levels, flux), all
   node-testable. Audio-thread code cannot be stepped through and a glitch in
   it is audible, so as little logic as possible lives where it cannot be
   tested — the processor is a shell around tested parts.
4. **One consumer, two producers.** `filterBank` stays the shared holder;
   `superflux()` became `computeFluxRate()` + `aggregateFlux()` so both
   backends fill the same `fluxRate` slot. `ModulationEngine` and
   `AudioSpectrum` are untouched and unaware. The A/B varies exactly one thing.
5. **`installAudioAnalysis()`** at `TICK_PHASE.SNAPSHOT`, ahead of the
   modulation dispatch that reads it. It used to be step 2 inside
   `AnimationSystem`, which meant only apps using GMT's dispatcher analysed
   audio at all.

Load-bearing details:

- **Plain JS FFT.** pffft.wasm's own benchmarks put FFT.js on V8 at ~2x the
  WASM builds. Real input is fed as a complex transform with zeroed imaginary
  rather than the pack-into-N/2 trick — ~2x the work, but verifiable against a
  textbook DFT.
- **Hann, re-levelled onto Blackman.** Hann's main lobe is ~1.5x narrower;
  Blackman's -58dB sidelobes bought leakage suppression the band kernels
  already provide. `WINDOW_CAL_DB` (≈ -1.51 dB) keeps a tone reading the same
  dBFS, so the A/B tests the architecture rather than the levels.
- **`postMessage`, not SharedArrayBuffer.** SAB needs cross-origin isolation,
  which would fight the gallery's R2/CDN images and Supabase calls. ~60 floats
  at 60 Hz is nothing.
- **Bands on the wire, never the table.** Both sides derive geometry from
  `(sampleRate, fftSize, bandsPerOctave)`. A bin array would fit today's FFT
  and no other backend.
- **`process()` allocates nothing.** A GC pause on the audio thread is a click.
  The batch is copied by structured clone rather than transferred, because
  transferring would neuter the staging buffer and force a per-post allocation.
- **Levels take the latest snapshot; flux takes the max since last read.**
  Levels are smoothed at hop rate so the newest carries the gap. Flux is an
  event measure — averaging across a gap dilutes one kick by the gap's length.

## Consequences

- **The A/B is live and must be concluded.** `analysisBackend` (advanced-only)
  selects the backend; the AnalyserNode path stays attached as the fallback
  while `addModule` resolves and permanently if it fails, with the panel
  showing when the selected backend is not the running one. When the worklet is
  confirmed in the field, delete `AudioAnalysis`, the param, `setBackend`, and
  the panel control **together**. Unlike the PCEN A/B (ADR-0105) that end
  condition is written into the code from the start.
- **A correction worth recording.** Flux was already rate-normalised —
  `ModulationEngine` divided by `dt` at the call site, one layer above the
  `superflux()` body. An earlier plan to change `TRANSIENT_FULL_SCALE` from 20
  to 1200 was based on reading the wrong layer. It stays at 20; the division
  merely moved into the bank so both producers emit identical units.
- **Rate-independence has a limit, and it is pinned.** `test-band-analyser`
  [4b]: an attack faster than one hop has an unbounded true rate, so a longer
  hop reports it lower. In production the hop is fixed at 256 samples so this is
  a constant; the rate form still removes the 44.1k-vs-48k difference and makes
  the threshold mean "level per second".
- **The `?worker&url` import must stay dynamic.** It is a Vite transform node
  cannot resolve; a static import killed every suite that transitively reached
  `WorkletAnalysis`. Verified against a real build: a 7.8 KB self-contained
  chunk with zero imports, plus a 95-byte URL wrapper.
- **`setSmoothing` is a no-op on the worklet backend.** The AnalyserNode's
  per-call constant has no counterpart; the equivalent knob is
  `smoothingTauSec`, sent at config time. Wiring the panel control to it is a
  follow-up.
- **Not yet done — per-frame recording back-fill.** The snapshot ring and
  `snapshotAt(t)` exist for it, but the recorder still writes one repeated
  value across skipped frames. Deliberately separate so recording quality can
  be judged independently of the transport swap, and because it is only worth
  building once the worklet is trusted.
- **`getRawData()` is now a liveness signal**, not data — both callers only
  null-check it, and `processAudioSignal`'s parameter is already `_data`.
  Renaming it is a follow-up, not worth churning four call sites mid-change.
