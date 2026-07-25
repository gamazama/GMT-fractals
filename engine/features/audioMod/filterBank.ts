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
 *   uncertainty. The analysis window is still `fftSize` samples, so
 *   `resolutionLimitHz` — below which a band is narrower than one bin — is
 *   unchanged by any amount of kernel shaping. At 48kHz:
 *     1/6 octave @ 2048 → limited below 203Hz
 *     1/6 octave @ 4096 → limited below 101Hz
 *     1/6 octave @ 8192 → limited below  51Hz
 *   It is why `fftSize` still matters, and it is exposed rather than hidden —
 *   callers render that region distinctly.
 *
 *   What the Hann kernels DO change is the quality of every band above that
 *   limit (correct, leak-free readings instead of boxcar sidelobes) and the
 *   MANNER of failure below it: overlapping windows degrade smoothly into each
 *   other rather than snapping between shared bin sets in discrete steps. The
 *   limit itself does not move.
 *
 *   Genuinely beating it needs a dual-resolution FFT (long window for lows,
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
    /** FFT bin range the KERNEL touches, half-open. Always at least one bin.
     *  Wider than [lowHz, highHz] would imply: the kernel spans neighbouring
     *  centres so adjacent bands overlap (see `rebuild`). */
    binLo: number;
    binHi: number;
    /** Offset into the flat `kernel` array, and how many weights. */
    kernelOffset: number;
    kernelLength: number;
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
    /** Which adaptive-gain implementation. Defaults to PCEN. */
    normalizeMode?: NormalizeMode;
    deltaSec: number;
}

/**
 * Per-band adaptive gain, LEGACY peak-follower mode ("every band
 * self-calibrates"). Superseded by PCEN below; retained only so the two can be
 * A/B'd on real material. @deprecated Delete with `applyPeakFollower` and the
 * `normalizeMode` param once PCEN is confirmed in the field.
 *
 * Each band divides by its own slow-release running peak, so a band that is
 * quiet in absolute terms — hi-hats are always far below a kick — still uses
 * the full 0..1 range.
 *
 * @invariant Silence FREEZES the follower. Releasing through a gap would let
 *   the peak decay toward zero, the divisor shrink, and the gain ratchet up —
 *   so the next downbeat arrives at maximum boost and detonates. (The global
 *   AGC shipped with exactly this bug; same fix, same reason.) This freeze is
 *   the structural weakness PCEN removes: it is a patch over an unbounded
 *   divide, where PCEN's compression bounds the output by construction and so
 *   needs no gate at all. The freeze stays only as long as this mode does —
 *   `debug/test-filterbank.mts` [11d] holds PCEN to the no-freeze standard.
 * @invariant A band whose peak never clears `MIN_PEAK` is normalised against
 *   MIN_PEAK rather than its own peak, so near-silent bands stay near-silent
 *   instead of amplifying their own noise floor to full scale. PCEN keeps this
 *   guard (as `PCEN_FLOOR`) — it addresses amplification, not ratcheting, and
 *   compression does not subsume it.
 */
const NORMALIZE_RELEASE_PER_SEC = 0.35;
const NORMALIZE_SILENCE_FLOOR = 0.02;
const NORMALIZE_MIN_PEAK = 0.15;

/**
 * PCEN — per-channel energy normalisation (Wang et al. 2017).
 *
 *   M[k] ← (1-s)·M[k] + s·E[k]                       one-pole, per band
 *   out  = (E[k] / (eps + M[k])^alpha + delta)^r − delta^r
 *
 * Structurally the same job as the peak follower — divide each band by its own
 * running average — but the compression exponent bounds the output by
 * construction, so the "divisor shrinks, gain ratchets" failure mode the
 * follower needs an explicit silence freeze to avoid cannot arise.
 *
 * @invariant The `+ delta` INSIDE the power is load-bearing and easy to drop.
 *   Without it the expression is `(E/(eps+M)^alpha)^r − delta^r`, which
 *   evaluates to −delta^r at silence — i.e. −1.414 at these settings, a
 *   negative level. With it, E=0 maps to exactly 0.
 * @invariant `M` is floored at `PCEN_FLOOR` before the divide. PCEN's own eps
 *   guards division by zero, not amplification: a band sitting just above the
 *   dB floor (room tone) would otherwise divide by its own tiny average and be
 *   lifted to ~0.6. The floor is the same value as `NORMALIZE_MIN_PEAK` so the
 *   "near-silent bands stay quiet" behaviour is identical across both modes.
 * @invariant Output is scaled by `PCEN_SCALE` so a band at full scale sitting
 *   at its own average reads 1.0. Raw PCEN tops out near 0.318 for sustained
 *   content, which would silently shift every calibrated threshold — see
 *   `dbToUnit`. Genuine transients exceed 1 and clamp, which is correct.
 */
const PCEN_ALPHA = 0.8;
const PCEN_R = 0.5;
const PCEN_DELTA = 2;
const PCEN_EPS = 1e-6;
/** Smoother time constant, matched to the peak follower's ~0.29s release so
 *  the two modes adapt at a comparable rate and A/B fairly. */
const PCEN_TAU_SEC = 0.3;
const PCEN_FLOOR = NORMALIZE_MIN_PEAK;
const PCEN_SCALE = 1 / (
    Math.pow(1 / Math.pow(PCEN_EPS + 1, PCEN_ALPHA) + PCEN_DELTA, PCEN_R)
    - Math.pow(PCEN_DELTA, PCEN_R)
);

export type NormalizeMode = 'peak' | 'pcen';

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
    /** PCEN one-pole smoother state, per band. */
    private pcenM: Float32Array = new Float32Array(0);
    /** Per-bin linear power scratch, reused across frames. */
    private power: Float32Array = new Float32Array(0);
    /** All band kernels concatenated; index via `band.kernelOffset`. */
    private kernel: Float32Array = new Float32Array(0);

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
        const kernel: number[] = [];

        // WINDOWED KERNELS (Brown & Puckette 1992). Each band is a Hann window
        // over its log-frequency span rather than a hard bin range.
        //
        // Why: a rectangular bin-sum is a boxcar in the frequency domain, whose
        // transform is a sinc — it leaks energy from well outside the band, and
        // a tone crossing a band edge jumps between neighbours in one step. A
        // Hann kernel rolls off smoothly, so a tone crossfades between adjacent
        // bands and the analysis stops depending on where the edges happen to
        // fall relative to the bins.
        //
        // The window spans centre_{k-1}..centre_{k+1} (peaking at centre_k), so
        // neighbours overlap by 50% and every frequency is covered by exactly
        // two bands. Edge bands extend by one band-width so they are not
        // half-windows.
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

            // Normalise to UNIT SUM, not unit energy. These weights average
            // POWER, so sum(w)=1 makes the result a weighted mean of power and
            // keeps the 0..1 scale identical to the rectangular mean it
            // replaces. A unit-ENERGY kernel (sum(w²)=1) would scale the level
            // by the window's shape factor and shift every calibrated
            // threshold — see `dbToUnit`'s @invariant.
            if (weightSum > 0) {
                for (let j = kernelOffset; j < kernel.length; j++) kernel[j] /= weightSum;
            } else {
                // Degenerate support (band far below bin resolution): fall back
                // to a flat kernel over whatever bins it touches, so the band
                // still reports its neighbourhood rather than zero.
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

        this.bands = bands;
        // Flat array with per-band offsets: the inner loop runs every frame
        // over every band, so it stays in one contiguous buffer rather than
        // chasing a pointer per band.
        this.kernel = new Float32Array(kernel);
        this.levels = new Float32Array(bands.length);
        this.normalized = new Float32Array(bands.length);
        // Adaptive-gain state is NOT carried across a rebuild: band k means a
        // different frequency at a different bandsPerOctave, so stale state
        // would mis-scale the new band until it re-learned.
        this.peaks = new Float32Array(bands.length);
        this.pcenM = new Float32Array(bands.length);
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

        const kernel = this.kernel;
        for (let k = 0; k < n; k++) {
            const b = this.bands[k];
            // Weighted mean of power. Weights sum to 1, so this is already the
            // band's mean power — no divide.
            let acc = 0;
            const off = b.kernelOffset;
            const end = Math.min(b.binHi, data.length);
            for (let i = b.binLo, j = off; i < end; i++, j++) {
                acc += kernel[j] * power[i];
            }
            if (acc <= 0) { this.levels[k] = 0; continue; }
            const rms = Math.sqrt(acc);                         // linear amplitude
            this.levels[k] = dbToUnit(20 * Math.log10(rms), dbFloor, dbCeiling);
        }

        if (!normalize) {
            this.normalized.set(this.levels);
            // Decay the followers toward the live signal while disabled so that
            // re-enabling doesn't apply state learned minutes ago.
            this.peaks.set(this.levels);
            this.pcenM.set(this.levels);
            return;
        }

        if ((opts.normalizeMode ?? 'pcen') === 'pcen') {
            this.applyPcen(deltaSec);
        } else {
            this.applyPeakFollower(deltaSec);
        }
    }

    /** Legacy adaptive gain: divide by a slow-release running peak. Retained
     *  for A/B against PCEN; slated for removal once PCEN is confirmed. */
    private applyPeakFollower(deltaSec: number): void {
        const n = this.bands.length;
        const k = Math.exp(-NORMALIZE_RELEASE_PER_SEC * Math.max(0, deltaSec) * 10);
        for (let i = 0; i < n; i++) {
            const level = this.levels[i];
            // Silence gate FIRST — reading the LIVE level (not the released
            // peak) is what stops the gap-between-tracks ratchet.
            if (level >= NORMALIZE_SILENCE_FLOOR) {
                this.peaks[i] = level > this.peaks[i]
                    ? level                                   // instant attack
                    : level + (this.peaks[i] - level) * k;    // slow release
            }
            const divisor = Math.max(NORMALIZE_MIN_PEAK, this.peaks[i]);
            this.normalized[i] = Math.min(1, level / divisor);
        }
    }

    /** PCEN — see the constant block above for the formula and its invariants. */
    private applyPcen(deltaSec: number): void {
        const n = this.bands.length;
        const s = 1 - Math.exp(-Math.max(0, deltaSec) / PCEN_TAU_SEC);
        const deltaR = Math.pow(PCEN_DELTA, PCEN_R);
        for (let i = 0; i < n; i++) {
            const level = this.levels[i];
            // One-pole smoother. NO silence gate: the compression bounds the
            // output, so a decaying M cannot ratchet the gain the way a
            // shrinking peak divisor could.
            this.pcenM[i] += s * (level - this.pcenM[i]);
            const m = Math.max(PCEN_FLOOR, this.pcenM[i]);
            const compressed = level / Math.pow(PCEN_EPS + m, PCEN_ALPHA);
            const out = Math.pow(compressed + PCEN_DELTA, PCEN_R) - deltaR;
            this.normalized[i] = Math.min(1, Math.max(0, out * PCEN_SCALE));
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
