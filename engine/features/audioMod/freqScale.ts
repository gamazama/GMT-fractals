/**
 * freqScale — the one place that converts between a modulation rule's
 * normalised band position and real frequency.
 *
 * `ModulationRule.freqStart/freqEnd` are fractions of nyquist — a representation
 * inherited from when rules indexed raw FFT bins directly. Analysis now happens
 * on the fractional-octave `filterBank`, but the STORED form is unchanged, so
 * existing scenes, share links and GMF files round-trip untouched.
 *
 * Why a conversion layer is needed at all: that stored fraction is linear in
 * frequency, and musical content lives in a sliver of it. A kick fundamental
 * (40-100 Hz) is 0.0017..0.0042 — under half a percent of the range. So a
 * "% of spectrum" readout is useless to a performer, and the original
 * quick-band presets, authored as round numbers on that axis (Bass = 0..0.1 =
 * 0..2.4 kHz), were wrong by an order of magnitude. `QUICK_BANDS` is specified
 * in Hz and converted at use, so the presets mean what they say on any device.
 *
 * @invariant This module is a labelling + preset-authoring layer only. It never
 *   changes the stored representation.
 */

/** Normalised bin position (0..1) → Hz, for a given device sample rate. */
export const binNormToHz = (norm: number, sampleRate: number): number =>
    norm * (sampleRate / 2);

/** Hz → normalised bin position (0..1), clamped to the representable range. */
export const hzToBinNorm = (hz: number, sampleRate: number): number => {
    const nyquist = sampleRate / 2;
    if (nyquist <= 0) return 0;
    return Math.max(0, Math.min(1, hz / nyquist));
};

/** Compact Hz label: `64 Hz`, `1.2k`, `16k`. Sized for the 8-9px readouts in
 *  the audio panel, where `12000 Hz` would not fit. */
export const formatHz = (hz: number): string => {
    if (hz >= 10000) return `${Math.round(hz / 1000)}k`;
    if (hz >= 1000) return `${(hz / 1000).toFixed(1)}k`;
    if (hz >= 100) return `${Math.round(hz)}`;
    return `${Math.round(hz)}`;
};

/** `40 Hz – 120 Hz` style range label for a rule's band. */
export const formatBand = (
    freqStart: number,
    freqEnd: number,
    sampleRate: number,
): string =>
    `${formatHz(binNormToHz(freqStart, sampleRate))}–${formatHz(binNormToHz(freqEnd, sampleRate))} Hz`;

/**
 * Quick-band presets, in Hz.
 *
 * Chosen to be useful on a dancefloor rather than to tile the axis evenly:
 * Kick isolates the fundamental so a four-to-the-floor pattern gates cleanly
 * without the bassline riding on top; Bass covers the sub/bass region; Mids is
 * the vocal/synth body; Highs is hats and air. `Full` stays for the
 * "just react to everything" case.
 */
export const QUICK_BANDS: { label: string; lowHz: number; highHz: number; title: string }[] = [
    { label: 'Kick',  lowHz: 40,   highHz: 120,   title: 'Kick fundamental, 40–120 Hz — the tightest band for four-to-the-floor' },
    { label: 'Bass',  lowHz: 30,   highHz: 250,   title: 'Sub + bass, 30–250 Hz — kick and bassline together' },
    { label: 'Mids',  lowHz: 250,  highHz: 2000,  title: 'Vocals, synths, guitar body, 250 Hz – 2 kHz' },
    { label: 'Highs', lowHz: 4000, highHz: 16000, title: 'Hats, cymbals and air, 4–16 kHz' },
    { label: 'Full',  lowHz: 0,    highHz: Infinity, title: 'Whole spectrum — overall loudness' },
];

/** A quick band as normalised rule bounds for the current sample rate. */
export const quickBandToNorm = (
    band: { lowHz: number; highHz: number },
    sampleRate: number,
): { freqStart: number; freqEnd: number } => ({
    freqStart: hzToBinNorm(band.lowHz, sampleRate),
    freqEnd: Number.isFinite(band.highHz) ? hzToBinNorm(band.highHz, sampleRate) : 1,
});
