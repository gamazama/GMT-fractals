/**
 * filterBank — fractional-octave analysis bands with per-band adaptive gain.
 *
 * WHY THIS EXISTS
 * ---------------
 * A raw FFT is LINEAR in frequency, which is the wrong shape for music. At
 * 48kHz/4096 every bin is 11.7Hz wide, so the octave 40-80Hz (the whole kick
 * region) gets 3 bins while the octave 8-16kHz gets 683. Consequences, all of
 * which showed up in practice:
 *
 *   - Band SELECTION is unusable at the bottom. A kick band is under 0.5% of a
 *     linear axis, so it can only be placed by dragging a hairline.
 *   - Aggregating a wide band DILUTES a narrow source: a kick fundamental is a
 *     peak inside mostly-empty bins, and it gets worse as resolution rises.
 *   - Per-band normalisation is meaningless on bins, because a "band" has no
 *     stable identity across settings.
 *
 * Fractional-octave bands fix the shape: each band is the same musical width
 * (1/3 octave ≈ a major third, 1/12 ≈ a semitone), so the bass gets as many
 * bands as the treble and a band means the same thing at any frequency.
 *
 * WHAT THIS DOES NOT DO
 * ---------------------
 * @invariant The bank is built ON the FFT and cannot beat time-frequency
 *   uncertainty. Below `resolutionLimitHz` a band is narrower than one bin, so
 *   neighbouring bands read overlapping bins and report near-identical values.
 *   That degrades gracefully (similar numbers, not garbage) but it is REAL, it
 *   is why `fftSize` still matters, and it is exposed rather than hidden —
 *   callers render that region distinctly. At 48kHz:
 *     1/6 octave @ 2048 → limited below 203Hz
 *     1/6 octave @ 4096 → limited below 101Hz
 *     1/6 octave @ 8192 → limited below  51Hz
 *   Genuinely beating this needs a dual-resolution FFT (long window for lows,
 *   short for highs), which costs bass lagging treble by up to ~85ms. Not done.
 *
 * @see docs/adr/0104-fractional-octave-filterbank.md
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
    /** FFT bin range, half-open. Always at least one bin wide. */
    binLo: number;
    binHi: number;
    /** True when the band is narrower than one FFT bin — see the class
     *  @invariant. Such bands share bins with their neighbours. */
    resolutionLimited: boolean;
}

export interface FilterBankOptions {
    sampleRate: number;
    fftSize: number;
    bandsPerOctave: number;
}

export interface AnalyseOptions {
    /** dB window mapped onto 0..1 — see `dbToUnit`. */
    dbFloor: number;
    dbCeiling: number;
    /** Apply per-band adaptive gain. */
    normalize: boolean;
    deltaSec: number;
}

/**
 * Per-band adaptive gain ("every band self-calibrates").
 *
 * Each band divides by its own slow-release running peak, so a band that is
 * quiet in absolute terms — hi-hats are always far below a kick — still uses
 * the full 0..1 range. This is what lets one set of thresholds keep working
 * across tracks and venues, and it is the mechanism behind MilkDrop presets
 * reacting sensibly to material their author never heard.
 *
 * @invariant Silence FREEZES the follower. Releasing through a gap would let
 *   the peak decay toward zero, the divisor shrink, and the gain ratchet to the
 *   ceiling — so the next downbeat arrives at maximum boost and detonates.
 *   (The global AGC shipped with exactly this bug; same fix, same reason.)
 * @invariant A band whose peak never clears `MIN_PEAK` is normalised against
 *   MIN_PEAK rather than its own peak, so near-silent bands stay near-silent
 *   instead of amplifying their own noise floor to full scale.
 */
const NORMALIZE_RELEASE_PER_SEC = 0.35;
const NORMALIZE_SILENCE_FLOOR = 0.02;
const NORMALIZE_MIN_PEAK = 0.15;

export class FilterBank {
    public bands: Band[] = [];
    public sampleRate = 48000;
    public fftSize = 4096;
    public bandsPerOctave = 6;
    /** Frequency below which bands are narrower than one bin. */
    public resolutionLimitHz = 0;

    /** Raw band levels, 0..1, this frame. */
    public levels: Float32Array = new Float32Array(0);
    /** Levels after per-band adaptive gain (identical to `levels` when off). */
    public normalized: Float32Array = new Float32Array(0);
    private peaks: Float32Array = new Float32Array(0);
    /** Per-bin linear power scratch, reused across frames. */
    private power: Float32Array = new Float32Array(0);

    private ensurePowerScratch(binCount: number): void {
        if (this.power.length < binCount) this.power = new Float32Array(binCount);
    }

    constructor(opts?: Partial<FilterBankOptions>) {
        this.rebuild({
            sampleRate: opts?.sampleRate ?? 48000,
            fftSize: opts?.fftSize ?? 4096,
            bandsPerOctave: opts?.bandsPerOctave ?? 6,
        });
    }

    /** True when the bank already matches these settings — lets callers skip a
     *  rebuild without tracking the previous values themselves. */
    public matches(o: FilterBankOptions): boolean {
        return this.sampleRate === o.sampleRate
            && this.fftSize === o.fftSize
            && this.bandsPerOctave === o.bandsPerOctave;
    }

    public rebuild(o: FilterBankOptions): void {
        this.sampleRate = o.sampleRate;
        this.fftSize = o.fftSize;
        this.bandsPerOctave = Math.max(1, o.bandsPerOctave);

        const nyquist = o.sampleRate / 2;
        const binHz = o.sampleRate / o.fftSize;
        const binCount = o.fftSize / 2;
        const fMax = Math.min(BANK_MAX_HZ, nyquist * 0.95);
        const B = this.bandsPerOctave;

        // Half-band ratio in log space: a band spans centre / 2^(1/2B) .. centre * 2^(1/2B).
        const half = Math.pow(2, 1 / (2 * B));
        // Width-to-centre ratio, used to find where a band drops under one bin.
        const widthRatio = half - 1 / half;
        this.resolutionLimitHz = binHz / widthRatio;

        const count = Math.max(1, Math.ceil(B * Math.log2(fMax / BANK_MIN_HZ)));
        const bands: Band[] = [];
        for (let k = 0; k < count; k++) {
            const centerHz = BANK_MIN_HZ * Math.pow(2, k / B);
            if (centerHz > fMax) break;
            const lowHz = centerHz / half;
            const highHz = centerHz * half;
            const binLo = Math.max(0, Math.floor(lowHz / binHz));
            // At least one bin wide, and never past the array.
            const binHi = Math.min(binCount, Math.max(binLo + 1, Math.ceil(highHz / binHz)));
            bands.push({
                centerHz,
                lowHz,
                highHz,
                binLo,
                binHi,
                resolutionLimited: highHz - lowHz < binHz,
            });
        }

        this.bands = bands;
        this.levels = new Float32Array(bands.length);
        this.normalized = new Float32Array(bands.length);
        // Peaks are NOT carried across a rebuild: band k means a different
        // frequency at a different bandsPerOctave, so a stale peak would
        // mis-scale the new band until it re-learned.
        this.peaks = new Float32Array(bands.length);
    }

    /**
     * Read one FFT frame (dBFS magnitudes from `getFloatFrequencyData`) into
     * band levels.
     *
     * @invariant Band energy is averaged in the LINEAR domain, never in dB.
     *   `getFloatFrequencyData` returns 20·log10(magnitude); averaging those
     *   directly computes a geometric mean of amplitudes, which is not a band
     *   level and under-reads any band containing a peak. Each bin is converted
     *   to power (`10^(dB/10)`), averaged, and only then returned to dB and
     *   mapped through `dbToUnit`.
     *
     * The 0..1 output scale is deliberately identical to the byte path this
     * replaces — same dB window, same endpoints — so the AGC and the per-band
     * followers keep their calibration. What changes is precision: 256
     * quantisation steps become float, which matters most exactly where the
     * old path was worst, in quiet bands near the floor.
     *
     * Cost is one pass over the bins the bank covers, regardless of how many
     * rules are active — cheaper than the previous per-rule scans once more
     * than one rule exists.
     */
    public analyse(data: Float32Array, opts: AnalyseOptions): void {
        const { dbFloor, dbCeiling, normalize, deltaSec } = opts;
        const n = this.bands.length;

        // Per-bin power, computed ONCE per frame. Bands overlap (and will
        // overlap more once kernels land), so converting inside the band loop
        // would redo this for every band that touches a bin.
        this.ensurePowerScratch(data.length);
        const power = this.power;
        for (let i = 0; i < data.length; i++) {
            const db = data[i];
            power[i] = Number.isFinite(db) ? Math.pow(10, db * 0.1) : 0;
        }

        for (let k = 0; k < n; k++) {
            const b = this.bands[k];
            let sum = 0;
            let c = 0;
            for (let i = b.binLo; i < b.binHi && i < data.length; i++) {
                sum += power[i];
                c++;
            }
            if (c === 0) { this.levels[k] = 0; continue; }
            const rms = Math.sqrt(sum / c);                     // linear amplitude
            this.levels[k] = dbToUnit(20 * Math.log10(rms), dbFloor, dbCeiling);
        }

        if (!normalize) {
            this.normalized.set(this.levels);
            // Decay the followers toward the live signal while disabled so that
            // re-enabling doesn't apply a peak learned minutes ago.
            this.peaks.set(this.levels);
            return;
        }

        const k = Math.exp(-NORMALIZE_RELEASE_PER_SEC * Math.max(0, deltaSec) * 10);
        for (let i = 0; i < n; i++) {
            const level = this.levels[i];
            // Silence gate FIRST — see the @invariant above. Reading the LIVE
            // level (not the released peak) is what stops the gap-between-tracks
            // ratchet.
            if (level >= NORMALIZE_SILENCE_FLOOR) {
                this.peaks[i] = level > this.peaks[i]
                    ? level                                   // instant attack
                    : level + (this.peaks[i] - level) * k;    // slow release
            }
            const divisor = Math.max(NORMALIZE_MIN_PEAK, this.peaks[i]);
            this.normalized[i] = Math.min(1, level / divisor);
        }
    }

    /** Band index range covering a normalised bin position span (`freqStart` /
     *  `freqEnd` on a rule, which are fractions of nyquist). Half-open, and
     *  always at least one band so a hairline selection still reads something. */
    public bandRangeForNorm(startNorm: number, endNorm: number): [number, number] {
        const nyquist = this.sampleRate / 2;
        return this.bandRangeForHz(startNorm * nyquist, endNorm * nyquist);
    }

    public bandRangeForHz(lowHz: number, highHz: number): [number, number] {
        const n = this.bands.length;
        if (n === 0) return [0, 0];
        let lo = 0;
        while (lo < n - 1 && this.bands[lo].highHz < lowHz) lo++;
        let hi = lo;
        while (hi < n && this.bands[hi].lowHz < highHz) hi++;
        return [lo, Math.max(lo + 1, hi)];
    }

    /** RMS of the normalised levels across a band range — the ONE statistic the
     *  spectrum display and the modulation rules both read. */
    public aggregate(bandLo: number, bandHi: number): number {
        const lo = Math.max(0, bandLo);
        const hi = Math.min(this.bands.length, bandHi);
        if (hi <= lo) return 0;
        let sumSq = 0;
        for (let i = lo; i < hi; i++) sumSq += this.normalized[i] * this.normalized[i];
        return Math.sqrt(sumSq / (hi - lo));
    }
}

export const filterBank = new FilterBank();
