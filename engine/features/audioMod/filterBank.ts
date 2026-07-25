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
    /** Apply per-band adaptive gain. Defaults OFF — see `NORMALIZE_*` below. */
    normalize: boolean;
    /** Fixed spectral tilt in dB/octave, referenced at `BANK_MIN_HZ`. Boost
     *  only; 0 disables. See the `TILT_*` block. */
    tiltDbPerOct: number;
    deltaSec: number;
}

/**
 * Per-band adaptive gain ("every band self-calibrates") — the implementation
 * behind `normalizeBands`, which defaults OFF and should stay that way.
 *
 * Each band divides by its own slow-release running peak, so a band that is
 * quiet in absolute terms — hi-hats are always far below a kick — still uses
 * the full 0..1 range.
 *
 * @invariant OFF is the better setting; this mode is retained as an option,
 *   not because it is good. A field A/B (2026-07-25) found that
 *   per-band adaptive gain of ANY kind costs more fidelity than it buys.
 *   Dividing each band by its own recent level removes the spectrum's shape,
 *   and that shape IS the signal — a kick is louder than a hi-hat and the
 *   visual reacts to exactly that difference. PCEN was implemented, measured
 *   against this follower and rejected on the same grounds: it compresses
 *   within each frame rather than across minutes, so it flattens harder still.
 *   Do not make normalisation the default, and do not "fix" the flatness by
 *   adding compression. The real need behind this mode — highs reading weak —
 *   is answered by a FIXED spectral tilt, which corrects the average 1/f shape
 *   without touching dynamics at all.
 *   @see docs/adr/0105-per-band-adaptive-gain-rejected.md
 * @invariant Silence FREEZES the follower. Releasing through a gap would let
 *   the peak decay toward zero, the divisor shrink, and the gain ratchet up —
 *   so the next downbeat arrives at maximum boost and detonates. (The global
 *   AGC shipped with exactly this bug; same fix, same reason.)
 * @invariant A band whose peak never clears `MIN_PEAK` is normalised against
 *   MIN_PEAK rather than its own peak, so near-silent bands stay near-silent
 *   instead of amplifying their own noise floor to full scale.
 */
const NORMALIZE_RELEASE_PER_SEC = 0.35;
const NORMALIZE_SILENCE_FLOOR = 0.02;
const NORMALIZE_MIN_PEAK = 0.15;

/**
 * Spectral tilt — a FIXED per-band dB offset correcting music's average
 * spectral slope.
 *
 * This is the honest answer to "the highs read weak", and the reason per-band
 * adaptive gain is not (see the NORMALIZE_* block and ADR-0105). A tilt adds
 * the SAME number of dB to a given band on every frame, so relative dynamics
 * survive exactly — within a band and between bands. A kick still towers over
 * a hi-hat; the hi-hat just starts from a usable floor instead of the basement.
 *
 * Why +3 dB/octave is the principled default: `analyse` reports each band's
 * MEAN power per bin, not its total. A fractional-octave band's width grows
 * with frequency, so for pink noise — constant power per octave, and roughly
 * the long-term average of music — the total per band is flat but the MEAN
 * falls at 3 dB/octave. +3 cancels exactly that, making pink noise read flat.
 * Note the slope comes from the mean-vs-sum statistic, not from the source.
 *
 * @invariant Referenced at `BANK_MIN_HZ`, so the tilt only ever BOOSTS. A
 *   mid-referenced tilt (neutral at 1 kHz) would attenuate 25 Hz by ~16 dB at
 *   the default slope, gutting the kick — the single most important band for a
 *   VJ rig. Lows stay exactly where they are and the highs come up to meet
 *   them; the dB ceiling and the AGC handle overall level as they already did.
 */
const TILT_REF_HZ = BANK_MIN_HZ;
/** Slider bound. Past ~6 the top octaves just pin against the dB ceiling. */
export const TILT_MAX_DB_PER_OCT = 6;

/** Max-filter width in BANDS for SuperFlux — see `FilterBank.superflux`. */
export const SUPERFLUX_WIDTH = 3;

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
    /** Previous frame's normalised levels — the SuperFlux reference. Owned
     *  here rather than per-rule so every rule differences the same pair of
     *  frames, and so switching a rule to transient mode mid-set cannot fire a
     *  spike off a stale reference it never updated. */
    private prev: Float32Array = new Float32Array(0);
    private hasPrevFrame = false;
    private framesAnalysed = 0;
    /** Per-bin linear power scratch, reused across frames. */
    private power: Float32Array = new Float32Array(0);
    /** All band kernels concatenated; index via `band.kernelOffset`. */
    private kernel: Float32Array = new Float32Array(0);
    /** Per-band tilt offset in dB — see the `TILT_*` block. */
    private tiltDb: Float32Array = new Float32Array(0);
    private tiltDbPerOct = 0;

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
        this.prev = new Float32Array(bands.length);
        // No reference frame after a reshape — the first frame must not read as
        // one giant onset across every band.
        this.hasPrevFrame = false;
        this.framesAnalysed = 0;
        // Tilt is per-band, so a reshape invalidates the curve. The SLOPE is
        // carried over — it is a user setting, not learned state.
        this.rebuildTilt(this.tiltDbPerOct);
    }

    /**
     * Recompute the per-band tilt curve — see the `TILT_*` block.
     *
     * Deliberately NOT part of `rebuild`: the slope is a slider the user drags,
     * and a full rebuild would reset the adaptive-gain followers and drop the
     * SuperFlux reference frame on every pointermove. Cost is one pass over
     * ~56 bands, and only when the value actually changes.
     */
    private rebuildTilt(slopeDbPerOct: number): void {
        this.tiltDbPerOct = slopeDbPerOct;
        if (this.tiltDb.length !== this.bands.length) {
            this.tiltDb = new Float32Array(this.bands.length);
        }
        for (let k = 0; k < this.bands.length; k++) {
            this.tiltDb[k] = slopeDbPerOct * Math.log2(this.bands[k].centerHz / TILT_REF_HZ);
        }
    }

    /** Tilt applied to band `k`, in dB. Zero when the slope is zero. */
    public tiltDbAt(k: number): number {
        return this.tiltDb[k] ?? 0;
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

        // Cheap guard, not a rebuild — see `rebuildTilt`.
        const wantTilt = Math.max(0, Math.min(TILT_MAX_DB_PER_OCT, opts.tiltDbPerOct || 0));
        if (wantTilt !== this.tiltDbPerOct) this.rebuildTilt(wantTilt);

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
        const tilt = this.tiltDb;
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
            // Tilt is a dB offset applied BEFORE the window, so it shifts the
            // band up the same ramp every frame — dynamics untouched.
            this.levels[k] = dbToUnit(20 * Math.log10(rms) + tilt[k], dbFloor, dbCeiling);
        }

        // Snapshot the frame the RULES last saw, before overwriting
        // `normalized`. `superflux` differences the new frame against this, so
        // it has to be the previous frame's OUTPUT (post-normalisation), not
        // the raw levels — otherwise the adaptive gain's own movement would
        // read as onset energy.
        //
        // Guarded on having actually analysed a frame: on the first call
        // `normalized` is still zeros, and differencing against zeros would
        // make frame one read as a full-scale onset in every band.
        if (this.framesAnalysed > 0) {
            this.prev.set(this.normalized);
            this.hasPrevFrame = true;
        }

        if (!normalize) {
            this.normalized.set(this.levels);
            // Track the follower toward the live signal while disabled so that
            // re-enabling doesn't apply state learned minutes ago.
            this.peaks.set(this.levels);
        } else {
            this.applyPeakFollower(deltaSec);
        }

        this.framesAnalysed++;
    }

    /** Per-band adaptive gain: divide by a slow-release running peak. See the
     *  `NORMALIZE_*` constant block for why this defaults OFF. */
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

    /** Band index range covering an Hz span (`lowHz`/`highHz` on a rule).
     *  Half-open, and always at least one band so a hairline selection still
     *  reads something. */
    public bandRangeForHz(lowHz: number, highHz: number): [number, number] {
        const n = this.bands.length;
        if (n === 0) return [0, 0];
        let lo = 0;
        while (lo < n - 1 && this.bands[lo].highHz < lowHz) lo++;
        let hi = lo;
        while (hi < n && this.bands[hi].lowHz < highHz) hi++;
        return [lo, Math.max(lo + 1, hi)];
    }

    /**
     * SuperFlux onset strength over a band range (Böck & Widmer, DAFx-13).
     *
     * Plain spectral flux differences consecutive frames and keeps the positive
     * part. Its weakness is that a tone which merely MOVES — vibrato, a bent
     * note, a filter sweep, any pitch drift — leaves its old band and enters a
     * new one, and the entering band registers a rise indistinguishable from a
     * genuine onset. On sustained material that fires continuously.
     *
     * SuperFlux adds one step: max-filter the PREVIOUS frame along the
     * FREQUENCY axis before differencing.
     *
     *     prevMax[k] = max(prev[k-1], prev[k], prev[k+1])
     *     flux       = Σ max(0, cur[k] − prevMax[k])
     *
     * A tone drifting into band k was already loud in band k±1 last frame, so
     * prevMax[k] is high and the difference vanishes. A real onset appears
     * where nothing was loud in the neighbourhood, and survives.
     *
     * @invariant The filter width is in BANDS, so its frequency span depends on
     *   `bandsPerOctave`. The paper uses width 3 at 24 bands/octave (⅛ octave);
     *   at our default 6 b/o the same width spans ½ an octave — deliberately
     *   wider, because our bands are coarser and a drifting tone crosses fewer
     *   of them. Widening further would start suppressing genuine onsets whose
     *   neighbours are merely busy.
     *
     * Returns MEAN positive flux per band, not the paper's sum: rules span
     * different numbers of bands, and a sum would make a wide rule read
     * stronger than a narrow one on identical material.
     */
    public superflux(bandLo: number, bandHi: number, width = SUPERFLUX_WIDTH): number {
        const n = this.bands.length;
        const lo = Math.max(0, bandLo);
        const hi = Math.min(n, bandHi);
        if (hi <= lo || !this.hasPrevFrame) return 0;
        const half = Math.max(1, Math.floor(width / 2));
        let sum = 0;
        for (let k = lo; k < hi; k++) {
            let prevMax = 0;
            const from = Math.max(0, k - half);
            const to = Math.min(n - 1, k + half);
            for (let j = from; j <= to; j++) {
                if (this.prev[j] > prevMax) prevMax = this.prev[j];
            }
            const d = this.normalized[k] - prevMax;
            if (d > 0) sum += d;
        }
        return sum / (hi - lo);
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
