/**
 * spectrumFrame — windowed FFT → per-bin dBFS, matching AnalyserNode's scale.
 *
 * The half of the analysis that used to be `AnalyserNode.getFloatFrequencyData`.
 * Pure and node-testable; the worklet processor drives it.
 *
 * WHY THE CALIBRATION CONSTANT EXISTS
 * -----------------------------------
 * Web Audio's analyser applies a BLACKMAN window and normalises the magnitude
 * by `fftSize` before the dB conversion. We use HANN instead — Blackman's
 * -58dB sidelobes buy leakage suppression the band kernels already provide,
 * and its main lobe is ~1.5x wider, so Hann is strictly better separation for
 * the same window length.
 *
 * But the two windows have different COHERENT GAIN (Hann 0.5, Blackman 0.42),
 * so the same tone would read ~1.5dB louder through Hann at the same
 * normalisation. `dbToUnit`'s window and every threshold calibrated against it
 * (`AGC_FLOOR`, `NORMALIZE_MIN_PEAK`, every rule's `thresholdMin/Max`) assume
 * the Blackman reading.
 *
 * @assumption `WINDOW_CAL_DB` re-levels Hann onto Blackman's scale so a given
 *   tone reads the SAME dBFS as it did through the AnalyserNode. This makes
 *   the worklet A/B a test of the architecture rather than of levels — if the
 *   spectrum sits at a different height after the switch, something is wrong,
 *   not merely different. Changing the absolute scale is a separate, deliberate
 *   change; do not fold it in here.
 *
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */
import { FFT } from './fft';

/** Coherent gain of a periodic Hann window: mean of 0.5·(1−cos). */
const HANN_COHERENT_GAIN = 0.5;
/** Coherent gain of the Blackman window Web Audio applies: a0 = 0.42. */
const BLACKMAN_COHERENT_GAIN = 0.42;
/** dB offset that puts Hann readings on the AnalyserNode's scale. ≈ −1.51 dB. */
export const WINDOW_CAL_DB =
    20 * Math.log10(BLACKMAN_COHERENT_GAIN / HANN_COHERENT_GAIN);

/** The same calibration as a POWER ratio: 10^(WINDOW_CAL_DB / 10) = (0.42 / 0.5)². */
const WINDOW_CAL_POWER = (BLACKMAN_COHERENT_GAIN / HANN_COHERENT_GAIN) ** 2;

/** dBFS reported for a bin with no energy at all. Matches the `-Infinity`
 *  `getFloatFrequencyData` writes for silence, which `dbToUnit` maps to 0. */
const SILENT_DB = -Infinity;

export class SpectrumFrame {
    readonly fftSize: number;
    readonly binCount: number;
    private readonly fft: FFT;
    private readonly window: Float32Array;
    private readonly re: Float32Array;
    private readonly im: Float32Array;
    /** Per-bin dBFS, `binCount` long. Reused across frames — copy if retained.
     *  Filled by `analyse()` only. */
    readonly db: Float32Array;
    /** Per-bin linear POWER on the same calibrated scale (`10^(db/10)`),
     *  `binCount` long. Filled by `analysePower()` only. */
    readonly power: Float32Array;

    constructor(fftSize: number) {
        this.fftSize = fftSize;
        this.binCount = fftSize >> 1;
        this.fft = new FFT(fftSize);
        this.re = new Float32Array(fftSize);
        this.im = new Float32Array(fftSize);
        this.db = new Float32Array(this.binCount);
        this.power = new Float32Array(this.binCount);

        // PERIODIC Hann (denominator N, not N-1) — the correct choice for
        // spectral analysis, where the frame is treated as one period of a
        // repeating signal. The symmetric variant is for filter design.
        this.window = new Float32Array(fftSize);
        for (let i = 0; i < fftSize; i++) {
            this.window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / fftSize));
        }
    }

    /**
     * Transform `samples` (length `fftSize`) into `this.db`.
     *
     * `samples` is read-only here; the window is applied into scratch, so the
     * caller's ring buffer is never mutated.
     */
    analyse(samples: Float32Array): void {
        this.transformWindowed(samples);
        const re = this.re;
        const im = this.im;

        // Magnitude normalised by fftSize — the AnalyserNode convention — then
        // re-levelled onto Blackman's scale. See the class @invariant.
        const inv = 1 / this.fftSize;
        const db = this.db;
        for (let k = 0; k < this.binCount; k++) {
            const mag = Math.hypot(re[k], im[k]) * inv;
            db[k] = mag > 0 ? 20 * Math.log10(mag) + WINDOW_CAL_DB : SILENT_DB;
        }
    }

    /**
     * Transform `samples` into `this.power` — the same spectrum as `analyse()`
     * on the same scale, as linear power instead of dB — and return the
     * loudest bin's power.
     *
     * This is what the audio thread calls. The band stage averages POWER, so
     * going through dB meant a `hypot` + `log10` per bin here and a `pow` per
     * bin there to undo it: about a third of the whole hop, for a round trip
     * that changes nothing (measured 2026-10-04, `npm run bench:audio-dsp`:
     * 0.20 ms → 0.11 ms per hop at Detail 4096).
     *
     * @invariant `power[k]` equals `10^(db[k] / 10)` for the same input, to
     *   float32 rounding — the two outputs are one scale. A level that reads
     *   differently through one than the other would move every threshold
     *   calibrated against the dB window.
     *   — proven by: npm run test:fft ("analysePower agrees with analyse on
     *   every bin", "and a silent frame is zero power, not NaN").
     */
    analysePower(samples: Float32Array): number {
        this.transformWindowed(samples);
        const re = this.re;
        const im = this.im;
        const power = this.power;
        const inv = 1 / this.fftSize;
        const scale = inv * inv * WINDOW_CAL_POWER;
        let peak = 0;
        for (let k = 0; k < this.binCount; k++) {
            const p = (re[k] * re[k] + im[k] * im[k]) * scale;
            power[k] = p;
            if (p > peak) peak = p;
        }
        return peak;
    }

    /** Window into scratch and run the FFT. `samples` is never mutated. */
    private transformWindowed(samples: Float32Array): void {
        const n = this.fftSize;
        const re = this.re;
        const im = this.im;
        const w = this.window;
        for (let i = 0; i < n; i++) {
            re[i] = samples[i] * w[i];
            im[i] = 0;
        }
        this.fft.transform(re, im);
    }
}
