# ADR-0105: Per-band adaptive gain is off by default; PCEN rejected

- **Status:** Accepted
- **Date:** 2026-07-25
- **Relates to:** ADR-0104 (fractional-octave filterbank — introduced the adaptive gain this walks back), ADR-0103 (audio rig as live session state)

## Context

ADR-0104 shipped fractional-octave bands with a per-band adaptive gain
("Balance Bands"): each band divides by its own slow-release running peak, so a
band that is quiet in absolute terms — hi-hats sit far below a kick — still
uses the full 0..1 range. The stated benefit was that one set of rule
thresholds keeps working across tracks and venues.

That follower needed an explicit silence freeze to avoid a ratchet: through a
gap between tracks the peak decays, the divisor shrinks, the gain climbs, and
the next downbeat arrives at maximum boost. The freeze is a patch over an
unbounded divide.

PCEN (per-channel energy normalisation, Wang et al. 2017) is the principled
version of the same idea — a one-pole smoother per band plus a compression
exponent that bounds the output by construction, so no freeze is needed. It was
implemented behind a temporary `normalizeMode` A/B param, scaled so a full-scale
band at its own average reads 1.0 (raw PCEN tops out near 0.318, which would
have silently shifted every calibrated threshold), floored at the same
`MIN_PEAK` value as the follower, and covered by tests pinning the
silence-maps-to-zero property, boundedness across a 30-second gap, and a full
silence-to-full-scale ramp.

## Decision

**Per-band adaptive gain stays off by default, PCEN is deleted, and the peak
follower is retained only for compatibility.**

A field A/B on real material (2026-07-25, owner-run) found:

- **Balance Bands OFF beats both modes** by a clear margin. Un-normalised
  reads with more fidelity and produces better-correlated visuals.
- **Peak follower beats PCEN.**

This is not a tuning miss, and no parameter recovers it. Per-band adaptive gain
divides each band by its own recent level, which is equivalent to declaring the
spectrum's shape to be noise and removing it. But that shape *is* the signal: a
kick is louder than a hi-hat, and the visual reacts to exactly that difference.
Normalise it away and every band converges toward the same reading, so the
spectrum stops describing the music and starts describing how each band
compares to itself.

The ordering follows from the mechanism. The peak follower divides by a *slow*
peak, so it leaves short-timescale relative dynamics largely intact and only
flattens across minutes. PCEN's compression acts within each frame, so it
flattens continuously. Peak follower placing second and both losing to off is
what the mechanism predicts.

GMT's spectrum rendering accepts a wide dynamic range, so there is no display
constraint pushing toward compression — the flattening is paid for and nothing
is bought.

## Consequences

- `normalizeMode` (param, panel select, `NormalizeMode` type, `applyPcen`, the
  PCEN constant block, tests [11b]–[11e]) is deleted.
- `normalizeBands` and `applyPeakFollower` **stay**, as an off-by-default
  option. Note there is no compatibility argument for this: neither
  `normalizeBands` (`nb`) nor `normalizeMode` (`nm`) was ever pushed, so no
  saved scene or shared `?s=` link in the wild can carry either. The mode is
  kept because it costs one boolean and ~15 lines, it is covered by tests
  [8]–[11] which document real failure modes (the ratchet, the near-silent
  amplification), and material with extreme level swings is a plausible case
  for it. If it turns out nobody ever turns it on, delete it and those tests
  together.
- The silence freeze and its `@invariant` **stay**, since the follower still
  needs them. The removal obligation recorded against them is cancelled.
- **Do not reintroduce per-band normalisation as a default, and do not address
  spectral flatness by adding compression anywhere in the chain.** The pipeline
  preserves dynamic range end to end.
- The genuine need behind Balance Bands — highs reading weak, thresholds
  drifting across tracks — is real and unaddressed by this ADR. The right tool
  is a **fixed spectral tilt** (pink / +3 dB-per-octave, or K-weighting), which
  corrects music's average 1/f falloff with a constant per-band coefficient and
  therefore does not touch dynamics at all. Cross-track threshold drift is
  separately better handled at the *rule* (an input-range mapping) than at the
  signal.
- Negative results are cheap to re-litigate. This ADR exists so that the next
  reader who notices Balance Bands looks flat and reaches for PCEN finds out it
  was already measured.
