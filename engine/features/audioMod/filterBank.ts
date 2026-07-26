/**
 * filterBank — the main thread's view of the analysis bands.
 *
 * WHAT THIS IS
 * ------------
 * A holder plus three small pieces of state that only make sense on this side
 * of the thread boundary:
 *
 *   - the current band values (`levels` / `normalized` / `fluxRate`), written
 *     each tick by `WorkletAnalysis` from the worklet's snapshots
 *   - the per-band adaptive-gain follower, which is an OPTION defaulting off
 *     and therefore not worth carrying into the worklet
 *   - the range queries every consumer reads through (`aggregate`,
 *     `aggregateFlux`, `bandRangeForHz`)
 *
 * WHAT THIS IS NOT, ANY MORE
 * --------------------------
 * It no longer analyses anything. Until ADR-0110 it owned the whole
 * bins → bands pipeline; that moved to `dsp/bandAnalyser` on the audio thread,
 * and the copy here sat unused for a while with only tests exercising it — a
 * second implementation of the band-summing maths, the tilt application and
 * the SuperFlux max-filter, guaranteed to drift from the one that actually
 * runs. It has been deleted.
 *
 * @invariant No DSP lives here. If you find yourself adding a windowing,
 *   weighting or flux calculation to this file, it belongs in `dsp/` where the
 *   worklet can reach it — otherwise it will be a second implementation again,
 *   and the tests covering it will be testing code nothing executes.
 * @invariant Band GEOMETRY comes from `bandMath.buildBandTable`, the same
 *   function the worklet calls, from the same three numbers. That is what lets
 *   both sides agree without shipping the table across the wire.
 *
 * @see docs/adr/0104-fractional-octave-filterbank.md
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */

import { buildBandTable, type Band } from './bandMath';

export interface FilterBankOptions {
    sampleRate: number;
    fftSize: number;
    bandsPerOctave: number;
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
 *   not because it is good. A field A/B (2026-07-25) found that per-band
 *   adaptive gain of ANY kind costs more fidelity than it buys. Dividing each
 *   band by its own recent level removes the spectrum's shape, and that shape
 *   IS the signal — a kick is louder than a hi-hat and the visual reacts to
 *   exactly that difference. PCEN was implemented, measured against this
 *   follower and rejected on the same grounds: it compresses within each frame
 *   rather than across minutes, so it flattens harder still. Do not make
 *   normalisation the default, and do not "fix" the flatness by adding
 *   compression. The real need behind this mode — highs reading weak — is
 *   answered by a FIXED spectral tilt, which corrects the average 1/f shape
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
    /** Frequency below which bands are narrower than one FFT bin. Reported so
     *  callers can render that region distinctly rather than implying a
     *  resolution the window cannot deliver. */
    public resolutionLimitHz = 0;

    /** Band levels, 0..1, as of the newest snapshot. */
    public levels: Float32Array = new Float32Array(0);
    /** Levels after per-band adaptive gain (identical to `levels` when off). */
    public normalized: Float32Array = new Float32Array(0);
    /** Positive SuperFlux per band, in level-units PER SECOND. Computed on the
     *  audio thread; the main thread only aggregates it over a rule's range. */
    public fluxRate: Float32Array = new Float32Array(0);
    private peaks: Float32Array = new Float32Array(0);

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

        // Same function the worklet calls, from the same three numbers — see
        // the class @invariant.
        const table = buildBandTable(o.sampleRate, o.fftSize, this.bandsPerOctave);
        this.bands = table.bands;
        this.resolutionLimitHz = table.resolutionLimitHz;

        const n = table.bands.length;
        this.levels = new Float32Array(n);
        this.normalized = new Float32Array(n);
        this.fluxRate = new Float32Array(n);
        // Follower state is NOT carried across a rebuild: band k means a
        // different frequency at a different bandsPerOctave, so a stale peak
        // would mis-scale the new band until it re-learned.
        this.peaks = new Float32Array(n);
    }

    /** Track the follower toward the live signal and pass levels through
     *  unchanged — the adaptive-gain-OFF path. Keeping it warm while disabled
     *  is what stops re-enabling from applying state learned minutes ago. */
    public syncFollowerToLevels(): void {
        this.normalized.set(this.levels);
        this.peaks.set(this.levels);
    }

    /** Per-band adaptive gain: divide by a slow-release running peak. See the
     *  `NORMALIZE_*` constant block for why this defaults OFF. */
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
