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
 * The band GEOMETRY (table, kernels, tilt curve, dB window) lives in
 * `bandMath.ts` so the AudioWorklet can compute an identical table without
 * importing this file's singleton. This class is the main-thread stateful
 * layer on top: adaptive gain, the SuperFlux reference frame, aggregation.
 *
 * @see docs/adr/0104-fractional-octave-filterbank.md
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */

import {
    dbToUnit, buildBandTable, buildTilt, clampTilt,
    BANK_MIN_HZ, BANK_MAX_HZ, TILT_MAX_DB_PER_OCT, SUPERFLUX_WIDTH,
    type Band,
} from './bandMath';

// Re-exported so the ~15 existing importers of these names keep working; the
// definitions moved to bandMath, not the API.
export {
    dbToUnit, BANK_MIN_HZ, BANK_MAX_HZ, TILT_MAX_DB_PER_OCT, SUPERFLUX_WIDTH,
};
export type { Band };

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
    /**
     * Positive SuperFlux per band, in level-units PER SECOND.
     *
     * Filled by `analyse()` on the main-thread path, or written wholesale by
     * the worklet path — which is the point of storing it per band rather than
     * computing it inside the rule query. Both producers use the same units, so
     * `TRANSIENT_FULL_SCALE` is unchanged by the switch.
     */
    public fluxRate: Float32Array = new Float32Array(0);
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

        // Geometry + kernels come from bandMath so the worklet can build an
        // identical table from the same three numbers. @see ADR-0110.
        const table = buildBandTable(o.sampleRate, o.fftSize, this.bandsPerOctave);
        this.resolutionLimitHz = table.resolutionLimitHz;
        const bands = table.bands;
        this.kernel = table.kernel;

        this.bands = bands;
        this.levels = new Float32Array(bands.length);
        this.fluxRate = new Float32Array(bands.length);
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
        this.tiltDb = buildTilt(this.bands, slopeDbPerOct);
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
        const wantTilt = clampTilt(opts.tiltDbPerOct);
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
        // `normalized`. `computeFluxRate` differences the new frame against this, so
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

        // Per-band flux, stored rather than computed per rule query — so the
        // worklet path can write the same slot instead of duplicating the rule
        // aggregation. @see docs/adr/0110-audio-analysis-in-a-worklet.md
        this.computeFluxRate(deltaSec);

        this.framesAnalysed++;
    }

    /** Track the follower toward the live signal and pass levels through
     *  unchanged — the adaptive-gain-OFF path. Public because the worklet
     *  backend fills `levels` itself and still needs the follower kept warm,
     *  so re-enabling does not apply state learned minutes ago. */
    public syncFollowerToLevels(): void {
        this.normalized.set(this.levels);
        this.peaks.set(this.levels);
    }

    /** Per-band adaptive gain: divide by a slow-release running peak. See the
     *  `NORMALIZE_*` constant block for why this defaults OFF. Public for the
     *  same reason as `syncFollowerToLevels` — either backend can fill
     *  `levels` and then ask for the follower to run over them. */
    public applyPeakFollower(deltaSec: number): void {
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
    private computeFluxRate(deltaSec: number, width = SUPERFLUX_WIDTH): void {
        const n = this.bands.length;
        const flux = this.fluxRate;
        if (!this.hasPrevFrame) { flux.fill(0); return; }
        const half = Math.max(1, Math.floor(width / 2));
        const dt = Math.max(1e-4, deltaSec);
        for (let k = 0; k < n; k++) {
            let prevMax = 0;
            const from = Math.max(0, k - half);
            const to = Math.min(n - 1, k + half);
            for (let j = from; j <= to; j++) {
                if (this.prev[j] > prevMax) prevMax = this.prev[j];
            }
            const d = this.normalized[k] - prevMax;
            flux[k] = d > 0 ? d / dt : 0;
        }
    }

    /** Mean flux rate over a band range, in level-units per second. The one
     *  number a transient-mode rule reads. */
    public aggregateFlux(bandLo: number, bandHi: number): number {
        const n = this.bands.length;
        const lo = Math.max(0, bandLo);
        const hi = Math.min(n, bandHi);
        if (hi <= lo) return 0;
        let sum = 0;
        for (let k = lo; k < hi; k++) sum += this.fluxRate[k];
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
