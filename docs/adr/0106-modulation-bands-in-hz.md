# ADR-0106: Modulation rule bands are stored in real Hz

- **Status:** Accepted
- **Date:** 2026-07-25
- **Relates to:** ADR-0104 (fractional-octave filterbank), ADR-0103 (audio rig as live session state), ADR-0105 (per-band adaptive gain rejected)

## Context

`ModulationRule.freqStart` / `freqEnd` were fractions of nyquist (0..1), a
representation inherited from when rules indexed raw FFT bins directly. Three
problems, in increasing order of seriousness:

1. **Device-dependent.** The stored fraction resolves through the *loading*
   device's sample rate. A rule authored at 48 kHz selects a 9% lower band when
   loaded at 44.1 kHz. A share link could not mean one thing.
2. **Wrong shape for the domain.** The fraction is linear in frequency, and
   musical content lives in a sliver of it — a 40–100 Hz kick is
   `0.0017..0.0042`. `freqScale.ts` existed purely to hide this from the UI.
3. **Blocking.** It bakes a linear FFT axis into *persisted* data. Analysis
   already runs on the fractional-octave filterbank (ADR-0104), and every
   candidate future backend — multirate-octave, gammatone IIR, sparse sliding
   DFT — is non-linear by construction. Each would have had to keep emulating a
   linear bin axis that nothing computes any more.

Point 3 is why this was done before the AudioWorklet migration rather than
after: it is the only remaining piece of the audio overhaul that touches
persisted data, and every later change is easier once it is done.

## Decision

**Rules store `lowHz` / `highHz` in real Hz.** `freqStart`/`freqEnd` are
removed, not deprecated alongside.

`filterBank.bandRangeForNorm` is deleted; `bandRangeForHz` is the only entry
point. `freqScale.ts` drops `binNormToHz` / `hzToBinNorm` / `quickBandToNorm`
and becomes a labelling + presets module only — the conversion it existed to
perform no longer exists.

Migration `app-gmt.modulation-band-to-hz` (v7) converts on load, **assuming a
48 kHz authoring rate** rather than reading the loading device's rate. That is
the load-bearing choice, and it is deliberate:

- A share link must decode to the same frequencies on every machine. Using the
  local rate would make one link mean different things to different viewers,
  which is the exact defect being fixed.
- Reading the local rate would also *freeze* a 44.1 kHz reader's already-misread
  bands as though they had been intended, converting a display bug into
  permanent data.
- 48 kHz is the common Web Audio rate on desktop. Worst case, on a scene
  genuinely authored at 44.1 kHz, is an 8.8% shift — about 1.5 semitones on a
  band selection, not a catastrophe.

The migration is idempotent (a rule already carrying `lowHz` is skipped),
because the version tag is not persisted in GMF and a save/reload replays the
whole chain. Double-converting would drop a 120 Hz kick band to 0.005 Hz.

## Consequences

- `AudioSpectrum` works in Hz throughout. The axis was already built from the
  band table and converted norm→Hz on entry, so the round-trip simply
  disappears; the drag/resize/double-click paths got shorter.
- The minimum-selection guard changed from an absolute `0.001` of nyquist
  (= 24 Hz) to a **ratio** (`MIN_BAND_RATIO = 1.02`). On a log axis the old
  fixed floor was invisible at 10 kHz but wider than a whole 1/6-octave band at
  the kick — precisely where hairline selections matter. This is a small
  behavioural improvement that falls out of the representation change.
- `QUICK_BANDS.Full` gains a finite top (20 kHz, above `BANK_MAX_HZ`, so it
  still selects every band). It was `Infinity`, harmless while it was converted
  to a fraction before storage — but `JSON.stringify(Infinity)` is `null`, and
  storing Hz directly would have written a broken rule.
- The default new-rule band is `0–4800 Hz`, exactly what `0.0–0.2` meant at
  48 kHz. Preserved deliberately so the migration is a pure change of
  representation. Whether that default is *good* is a separate question — it is
  wide, and the quick-band presets exist — but it is not this ADR's to change.
- A rule's band is now readable in the saved file. `"lowHz": 40, "highHz": 120`
  says what it does; `"freqStart": 0.0017` did not.
