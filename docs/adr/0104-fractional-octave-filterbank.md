# ADR-0104: Fractional-octave filterbank with per-band adaptive gain

- **Status:** Accepted
- **Date:** 2026-07-25
- **Relates to:** ADR-0103 (the audio rig as live session state)

> **Update 2026-07-25 (adaptive gain amended by ADR-0105; filterbank unchanged):**
> the fractional-octave filterbank below stands in full. The **per-band adaptive
> gain** portion did not survive field testing — it flattens the spectral
> contrast the visuals react to, and stays off by default. See
> [ADR-0105](./0105-per-band-adaptive-gain-rejected.md) for the measurement and
> the mechanism.

## Context

The spectrum → band-select → modulation path was working but not competitive.
A survey of what the reference tools do (VDMX, TouchDesigner, Resolume, Meyda,
madmom/SuperFlux, MilkDrop) found one thing in common that GMT did not do:
**none of them analyse on linear FFT bins.**

SuperFlux log-filters to 24 filters/octave over 30 Hz–17 kHz. Meyda works in
Bark bands with per-band specific loudness. TouchDesigner's palette component
ships normalised named channels. The reason is that a linear FFT is the wrong
*shape* for music: at 48 kHz / 4096, every bin is 11.7 Hz, so the octave
40–80 Hz (the entire kick region) gets 3 bins while 8–16 kHz gets 683.

Three concrete symptoms, all previously worked around rather than fixed:

1. **Band selection was unusable at the bottom.** A kick band is under 0.5% of
   a linear axis. The spectrum widget carried an ad-hoc `log(f·999+1)/log(1000)`
   display curve, a snap-to-zero hack, and 1-pixel box handling — all to make a
   hairline selection draggable.
2. **Wide bands diluted narrow sources.** Aggregating a kick fundamental (a peak
   sitting in mostly-empty bins) got *worse* as resolution rose: measured, its
   share of a 40–120 Hz band average falls from 25% at fftSize 2048 to 7% at
   8192. The previous fix — switching aggregation from mean to RMS — mitigated
   this but was treating the symptom.
3. **Per-band normalisation was not expressible.** A "band" made of raw bins has
   no stable identity across settings, so there was nothing to attach an
   adaptive gain to. Only a single global AGC was possible, which cannot fix
   spectral balance — hi-hats sit far below a kick in absolute terms no matter
   what the overall level does.

## Decision

**Analyse on fractional-octave bands.** `FilterBank` precomputes band edges from
(sampleRate, fftSize, bandsPerOctave) over 25 Hz–16 kHz, each band being a bin
range, and reduces each to one 0..1 level. Band width is user-selectable —
1/3, 1/6 (default), 1/12 octave.

Consequences that fall out of the shape rather than needing separate work:

- The x axis becomes **band index**, which is an exact log-frequency axis. The
  ad-hoc display curve, the snap-to-zero hack and the linear/log toggle are all
  retired; a rule box edge now lands exactly on the band boundary it selects.
- One bar per band, so the bars **are** the analysis rather than a resampling
  of it.
- Bass gets the same number of bands as treble, by construction.

**Per-band adaptive gain** (`normalizeBands`): each band divides by its own
slow-release running peak, so a band that is quiet in absolute terms still uses
the full 0..1 range. This is the mechanism that lets one set of thresholds keep
working across tracks and venues, and it is why MilkDrop presets react sensibly
to material their author never heard.

It composes with the existing global AGC rather than fighting it: a global scale
factor cancels out of a per-band ratio, so enabling both is not
double-normalising. They answer different questions — "the DJ turned it down"
vs "treble is always quieter than bass".

Rules keep storing `freqStart/freqEnd` as fractions of nyquist. Only the
interpretation changed, so existing scenes, share links and GMF files round-trip
untouched.

## What this explicitly does not fix

The bank is built ON the FFT and **cannot beat time-frequency uncertainty.**
Below `resolutionLimitHz` a band is narrower than one bin and neighbours read
overlapping bins, reporting near-identical values. At 1/6 octave that is 203 Hz
at fftSize 2048, 101 Hz at 4096, 51 Hz at 8192.

An earlier framing of this work claimed a filterbank would "kill the Detail
compromise". It does not. What it does is make band *selection* musical and make
per-band normalisation possible; `fftSize` still governs how low the bank stays
honest, which is now surfaced in the panel ("below X Hz…") and rendered — those
bands draw dimmed on the spectrum rather than pretending to be resolved.

Genuinely beating the limit needs a **dual-resolution FFT** (long window feeding
the low bands, short window feeding the high ones). That is a real option and
cheap in CPU, but it makes bass lag treble by up to ~85 ms, which is perceptible
on rhythm. Deferred deliberately, with that tradeoff on the record.

## Consequences

- Band selection is musical: the Kick preset is a handful of adjacent bands, not
  0.4% of an axis.
- Aggregation dilution is largely gone — bands are narrow by construction, so
  the RMS-vs-mean distinction now matters much less than it did.
- With Balance Bands on, hi-hats drive a parameter as readily as a kick.
- Cost is one pass over the covered bins per frame regardless of rule count —
  cheaper than the previous per-rule bin scans once more than one rule exists.
- `freqScale.aggregateBand` is deleted; `FilterBank.aggregate` supersedes it and
  carries the display/signal-agreement invariant.
- Per-band followers are dropped on rebuild: band *k* means a different frequency
  at a different width, so a carried-over peak would mis-scale until relearned.
- Guarded by `debug/test-filterbank.mts`; `debug/test-audio-signal.mts` now
  drives the real engine path rather than a hand-rolled band array, so the
  display and signal cannot silently diverge again.

## Addendum (same day): four upgrades on this substrate

With the bank in place, four contained improvements landed on top of it. Each
depended on the previous one.

**Float magnitudes.** `getByteFrequencyData` quantised to 256 steps before we
saw the data. The float path also changes DOMAIN, not just precision: it returns
raw dBFS, and averaging dB values computes a geometric mean of amplitudes, which
is not a band level. Bins are now converted to power, averaged, and returned to
dB via the new `dbToUnit` — which applies the same window the byte path applied
internally, so no downstream threshold needed retuning. The unchanged follower
and AGC tests are the evidence.

**Hann kernels.** The rectangular bin-sum was a boxcar in the frequency domain,
leaking through sinc sidelobes and tiling without overlap so a tone crossed band
edges in one step. Replaced with Brown & Puckette (1992) kernels spanning
centre±one band, normalised to unit SUM (not unit energy — these weights average
power, and unit energy would rescale every level and shift the calibration).
This does NOT move `resolutionLimitHz`; it improves every band above it and
makes the region below degrade smoothly rather than in steps.

**PCEN.** Replaces the peak follower's unbounded divide, whose silence freeze
was a patch over that unboundedness. Two corrections were needed against the
spec as received: the `+ delta` inside the power is load-bearing (without it
silence evaluates to −1.414, a negative level), and the output needs scaling by
1/PCEN(1,1) because raw PCEN tops out near 0.318 for sustained content. The
`MIN_PEAK` floor is kept as `PCEN_FLOOR` — compression bounds ratcheting, not
amplification of room tone. Confirmed stable with no freeze; the follower and
its freeze remain only for A/B and go together.

**SuperFlux onsets.** Transient mode now max-filters the previous frame along
frequency before differencing (Böck & Widmer, DAFx-13), so a drifting or
vibrato'd tone stops reading as a continuous onset. Measured 100% suppression of
a 9-cent-per-frame drift while a genuine new tone still registers. The
previous-frame reference moved from per-rule into the bank, which also removed
the mode-switch spike hazard by construction. Filter width is 3 bands: at 6
bands/octave that spans half an octave, deliberately wider in octave terms than
the paper's 3-at-24 because our bands are coarser.
