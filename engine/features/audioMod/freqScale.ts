/**
 * freqScale — the one place that converts between a modulation rule's
 * normalised band position and real frequency.
 *
 * `ModulationRule.freqStart/freqEnd` are fractions of the FFT's bin array, and
 * that array is LINEAR in frequency: with `fftSize: 2048` at 48 kHz there are
 * 1024 bins spanning 0..24 kHz, ~23.4 Hz apart. Two consequences the UI has to
 * work around, and which this module exists to make explicit:
 *
 *   1. Musical content lives in a sliver of the range. A kick fundamental
 *      (40-100 Hz) is bins 2-4 — normalised 0.0017..0.0042, under half a
 *      percent of the axis. That is why the spectrum widget draws on a LOG
 *      axis, and why a "% of spectrum" readout is useless to a performer.
 *   2. The quick-band presets were authored as round numbers on the normalised
 *      axis (Bass = 0..0.1) and so were wrong by an order of magnitude:
 *      0..0.1 is 0..2.4 kHz — kick, bass, vocals and most of the mids in one
 *      band. `QUICK_BANDS` below is specified in Hz instead and converted at
 *      use, so the presets mean what they say on any device sample rate.
 *
 * @invariant Nothing here changes the STORED representation. Rules keep their
 *   normalised `freqStart/freqEnd`, so existing scenes, share links and GMF
 *   files round-trip untouched — this is a labelling + preset-authoring layer,
 *   not a migration.
 */

/**
 * Reduce a range of FFT bins to a single 0..1 level — the ONE statistic both
 * the spectrum display and the modulation rules use.
 *
 * @invariant Display and signal MUST call this same function. They diverged
 *   before: the display max-pooled while rules took the mean, so on the log
 *   axis (where one bar spans hundreds of bins in the top octaves) broadband
 *   content drew as a solid wall while the band feeding a rule averaged out far
 *   weaker — "it looks strong but nothing moves".
 *
 * RMS rather than mean, because the mean actively fights frequency resolution.
 * A kick fundamental is a narrow peak inside a wide band, so raising fftSize
 * adds mostly-empty bins and DILUTES it: across 2048→8192 a kick's share of a
 * 40-120Hz band average falls from 25% to 7%. RMS weights the loud bins more
 * heavily, so finer analysis makes the kick clearer instead of quieter.
 *
 * Where a band's bins are all similar — broadband material like a snare — RMS
 * and mean agree, so this changes nothing for that content. The gain is
 * entirely on peaky, tonal bands. Peak-only was rejected: it discards how much
 * of the band is active, which is exactly what a "Full" or "Highs" band needs.
 *
 * Costs one multiply per bin over the mean — a single O(bins) pass either way.
 */
export const aggregateBand = (
    data: Uint8Array,
    startBin: number,
    endBin: number,
): number => {
    const lo = Math.max(0, startBin);
    const hi = Math.min(data.length, endBin);
    if (hi <= lo) return 0;
    let sumSq = 0;
    for (let i = lo; i < hi; i++) sumSq += data[i] * data[i];
    return Math.sqrt(sumSq / (hi - lo)) / 255;
};

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
