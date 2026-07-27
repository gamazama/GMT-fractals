/**
 * bandMath — the pure geometry of the fractional-octave filterbank.
 *
 * Extracted from `filterBank.ts` (ADR-0110) so BOTH threads can compute the
 * band table from the same source. No singleton, no state, no DOM: an
 * AudioWorklet global scope can import this file, and Vite inlines it into the
 * processor chunk.
 *
 * @invariant This module has NO module-scope side effects. `filterBank.ts`
 *   instantiates a singleton at import time; if the worklet imported from
 *   there it would construct a second, pointless FilterBank on the audio
 *   thread. Keep this file free of instances so that stays impossible.
 * @invariant The band table is a pure function of
 *   `(sampleRate, fftSize, bandsPerOctave)`. That is what lets the main thread
 *   and the worklet derive identical geometry independently, so only band
 *   VALUES need to cross the wire — ~60 floats instead of the table.
 *
 * @see docs/adr/0104-fractional-octave-filterbank.md
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */

/**
 * Map a magnitude in dBFS onto the 0..1 display/modulation scale.
 *
 * @invariant This is the ONLY place the dB window is applied, and it defines
 *   the scale every downstream threshold is calibrated against —
 *   `NORMALIZE_SILENCE_FLOOR`, `NORMALIZE_MIN_PEAK`, `AGC_FLOOR`, every rule's
 *   `thresholdMin/Max`, and the spectrum's bar heights. It replaced
 *   `getByteFrequencyData`'s identical [minDecibels, maxDecibels] → [0,255]
 *   ramp, which is why none of those constants needed retuning: same window,
 *   same endpoints, 256 quantisation levels traded for float.
 * @invariant It travels WITH the kernels. Splitting the window from the
 *   weighting across a thread boundary would silently shift every threshold.
 */
export const dbToUnit = (db: number, dbFloor: number, dbCeiling: number): number => {
    if (!Number.isFinite(db)) return 0;          // -Infinity = a silent bin
    const span = Math.max(1e-6, dbCeiling - dbFloor);
    return Math.max(0, Math.min(1, (db - dbFloor) / span));
};

/** Lowest band centre. Below a kick fundamental, above room rumble / DC. */
export const BANK_MIN_HZ = 25;
/** Highest band centre. Above hi-hat energy; clamped to below nyquist. */
export const BANK_MAX_HZ = 16000;

export interface Band {
    /** Geometric centre frequency (Hz). */
    centerHz: number;
    lowHz: number;
    highHz: number;
    /** FFT bin range the KERNEL touches, half-open. Always at least one bin.
     *  Wider than [lowHz, highHz] would imply: the kernel spans neighbouring
     *  centres so adjacent bands overlap. */
    binLo: number;
    binHi: number;
    /** Offset into the flat `kernel` array, and how many weights. */
    kernelOffset: number;
    kernelLength: number;
    /** True when the band is narrower than one FFT bin. Such bands share bins
     *  with their neighbours — see `FilterBank`'s @invariant. */
    resolutionLimited: boolean;
}

export interface BandTable {
    bands: Band[];
    /** All band kernels concatenated; index via `band.kernelOffset`. Flat and
     *  contiguous because the inner loop runs every frame over every band. */
    kernel: Float32Array;
    /** Frequency below which bands are narrower than one bin. */
    resolutionLimitHz: number;
}

/**
 * Build the band table and its windowed kernels.
 *
 * WINDOWED KERNELS (Brown & Puckette 1992). Each band is a Hann window over
 * its log-frequency span rather than a hard bin range.
 *
 * Why: a rectangular bin-sum is a boxcar in the frequency domain, whose
 * transform is a sinc — it leaks energy from well outside the band, and a tone
 * crossing a band edge jumps between neighbours in one step. A Hann kernel
 * rolls off smoothly, so a tone crossfades between adjacent bands and the
 * analysis stops depending on where the edges happen to fall relative to bins.
 *
 * The window spans centre_{k-1}..centre_{k+1} (peaking at centre_k), so
 * neighbours overlap by 50% and every frequency is covered by exactly two
 * bands. Edge bands extend by one band-width so they are not half-windows.
 *
 * @invariant Kernels are normalised to UNIT SUM, not unit energy. These
 *   weights average POWER, so sum(w)=1 makes the result a weighted mean of
 *   power and keeps the 0..1 scale identical to the rectangular mean it
 *   replaced. A unit-ENERGY kernel (sum(w²)=1) would scale every level by the
 *   window's shape factor and shift every calibrated threshold.
 */
export function buildBandTable(
    sampleRate: number,
    fftSize: number,
    bandsPerOctave: number,
): BandTable {
    const B = Math.max(1, bandsPerOctave);
    const nyquist = sampleRate / 2;
    const binHz = sampleRate / fftSize;
    const binCount = fftSize / 2;
    const fMax = Math.min(BANK_MAX_HZ, nyquist * 0.95);

    // Half-band ratio in log space: a band spans centre / 2^(1/2B) .. centre * 2^(1/2B).
    const half = Math.pow(2, 1 / (2 * B));
    // Width-to-centre ratio, used to find where a band drops under one bin.
    const widthRatio = half - 1 / half;
    const resolutionLimitHz = binHz / widthRatio;

    const count = Math.max(1, Math.ceil(B * Math.log2(fMax / BANK_MIN_HZ)));
    const bands: Band[] = [];
    const kernel: number[] = [];
    const octave = 1 / B;

    for (let k = 0; k < count; k++) {
        const centerHz = BANK_MIN_HZ * Math.pow(2, k / B);
        if (centerHz > fMax) break;
        const lowHz = centerHz / half;
        const highHz = centerHz * half;

        // Kernel support: one full band-width either side of centre.
        const kLoHz = centerHz * Math.pow(2, -octave);
        const kHiHz = centerHz * Math.pow(2, octave);
        const binLo = Math.max(0, Math.floor(kLoHz / binHz));
        const binHi = Math.min(binCount, Math.max(binLo + 1, Math.ceil(kHiHz / binHz)));

        const kernelOffset = kernel.length;
        const logLo = Math.log2(kLoHz);
        const logSpan = Math.log2(kHiHz) - logLo;
        let weightSum = 0;
        for (let i = binLo; i < binHi; i++) {
            // Bin CENTRE frequency; bin 0 is DC and has no log position.
            const f = (i + 0.5) * binHz;
            const p = logSpan > 0 ? (Math.log2(Math.max(1e-6, f)) - logLo) / logSpan : 0.5;
            // Hann over the support, zero at both ends, peak at centre.
            const w = p <= 0 || p >= 1 ? 0 : 0.5 * (1 - Math.cos(2 * Math.PI * p));
            kernel.push(w);
            weightSum += w;
        }

        if (weightSum > 0) {
            for (let j = kernelOffset; j < kernel.length; j++) kernel[j] /= weightSum;
        } else {
            // Degenerate support (band far below bin resolution): fall back to a
            // flat kernel over whatever bins it touches, so the band still
            // reports its neighbourhood rather than zero.
            const len = kernel.length - kernelOffset;
            for (let j = kernelOffset; j < kernel.length; j++) kernel[j] = 1 / len;
        }

        bands.push({
            centerHz,
            lowHz,
            highHz,
            binLo,
            binHi,
            kernelOffset,
            kernelLength: binHi - binLo,
            resolutionLimited: highHz - lowHz < binHz,
        });
    }

    return { bands, kernel: new Float32Array(kernel), resolutionLimitHz };
}

// ── Spectral tilt ───────────────────────────────────────────────────────────

/**
 * Spectral tilt — a FIXED per-band dB offset correcting music's average
 * spectral slope.
 *
 * This is the honest answer to "the highs read weak", and the reason per-band
 * adaptive gain is not (ADR-0105). A tilt adds the SAME number of dB to a given
 * band on every frame, so relative dynamics survive exactly — within a band and
 * between bands. A kick still towers over a hi-hat; the hi-hat just starts from
 * a usable floor instead of the basement.
 *
 * Why +3 dB/octave is the principled default: analysis reports each band's MEAN
 * power per bin, not its total. A fractional-octave band's width grows with
 * frequency, so for pink noise — constant power per octave, and roughly the
 * long-term average of music — the total per band is flat but the MEAN falls at
 * 3 dB/octave. +3 cancels exactly that, making pink noise read flat. Note the
 * slope comes from the mean-vs-sum statistic, not from the source.
 *
 * @invariant Referenced at `BANK_MIN_HZ`, so the tilt only ever BOOSTS. A
 *   mid-referenced tilt (neutral at 1 kHz) would attenuate 25 Hz by ~16 dB at
 *   the default slope, gutting the kick — the single most important band for a
 *   VJ rig. Lows stay exactly where they are and the highs come up to meet
 *   them; the dB ceiling and the AGC handle overall level as they already did.
 */
export const TILT_REF_HZ = BANK_MIN_HZ;
/** Slider bound. Past ~6 the top octaves just pin against the dB ceiling. */
export const TILT_MAX_DB_PER_OCT = 6;

export const clampTilt = (slopeDbPerOct: number): number =>
    Math.max(0, Math.min(TILT_MAX_DB_PER_OCT, slopeDbPerOct || 0));

/** Per-band tilt offsets in dB, for an already-clamped slope. */
export function buildTilt(bands: Band[], slopeDbPerOct: number): Float32Array {
    const out = new Float32Array(bands.length);
    for (let k = 0; k < bands.length; k++) {
        out[k] = slopeDbPerOct * Math.log2(bands[k].centerHz / TILT_REF_HZ);
    }
    return out;
}

/** Max-filter width in BANDS for SuperFlux — see `BandAnalyser.computeFlux`
 *  in `dsp/bandAnalyser.ts`, which runs on the audio thread. */
export const SUPERFLUX_WIDTH = 3;
