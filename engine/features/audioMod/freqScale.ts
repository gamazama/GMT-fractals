/**
 * freqScale — frequency labelling and quick-band presets.
 *
 * `ModulationRule.lowHz/highHz` are REAL Hz (ADR-0106), so this module no
 * longer converts a stored representation into frequency — that conversion
 * does not exist any more. What remains is presentation: compact Hz labels for
 * the 8-9px panel readouts, and the dancefloor band presets.
 *
 * @assumption Nothing here is on the analysis path. `filterBank.bandRangeForHz`
 *   maps a rule's Hz span onto bands directly; if you find yourself adding a
 *   normalised-position helper back into this file, the rule representation
 *   has probably regressed.
 */

/** Compact Hz label: `64 Hz`, `1.2k`, `16k`. Sized for the 8-9px readouts in
 *  the audio panel, where `12000 Hz` would not fit. */
export const formatHz = (hz: number): string => {
    if (hz >= 10000) return `${Math.round(hz / 1000)}k`;
    if (hz >= 1000) return `${(hz / 1000).toFixed(1)}k`;
    return `${Math.round(hz)}`;
};

/** `40–120 Hz` style range label for a rule's band. */
export const formatBand = (lowHz: number, highHz: number): string =>
    `${formatHz(lowHz)}–${formatHz(highHz)} Hz`;

/**
 * Quick-band presets, in Hz.
 *
 * Chosen to be useful on a dancefloor rather than to tile the axis evenly:
 * Kick isolates the fundamental so a four-to-the-floor pattern gates cleanly
 * without the bassline riding on top; Bass covers the sub/bass region; Mids is
 * the vocal/synth body; Highs is hats and air. `Full` stays for the
 * "just react to everything" case.
 *
 * @assumption `Full`'s top is FINITE (and above `BANK_MAX_HZ`, so it still
 *   selects every band). It used to be `Infinity`, which was fine while these
 *   were converted to a fraction before storage — but `JSON.stringify(Infinity)`
 *   is `null`, so storing it directly would have written a broken rule.
 */
export const QUICK_BANDS: { label: string; lowHz: number; highHz: number; title: string }[] = [
    { label: 'Kick',  lowHz: 40,   highHz: 120,   title: 'Kick fundamental, 40–120 Hz — the tightest band for four-to-the-floor' },
    { label: 'Bass',  lowHz: 30,   highHz: 250,   title: 'Sub + bass, 30–250 Hz — kick and bassline together' },
    { label: 'Mids',  lowHz: 250,  highHz: 2000,  title: 'Vocals, synths, guitar body, 250 Hz – 2 kHz' },
    { label: 'Highs', lowHz: 4000, highHz: 16000, title: 'Hats, cymbals and air, 4–16 kHz' },
    { label: 'Full',  lowHz: 0,    highHz: 20000, title: 'Whole spectrum — overall loudness' },
];
