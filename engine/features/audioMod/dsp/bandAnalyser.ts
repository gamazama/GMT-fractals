/**
 * bandAnalyser — spectrum frame → per-band levels + onset flux.
 *
 * The stateful DSP that runs on the audio thread, kept OUT of the processor
 * file so it can be driven from node without an AudioWorklet global scope.
 * `analysisProcessor.ts` is then a thin shell: ring buffer, hop counter,
 * message port.
 *
 * @invariant Levels are SMOOTHED here, at hop rate, with a dt-correct
 *   one-pole. That replaces `AnalyserNode.smoothingTimeConstant`, which is
 *   applied per read CALL with no time compensation — so its effective time
 *   constant moved with the caller's rate. Here the rate is the audio thread's
 *   and the coefficient is derived from the actual hop duration, so the
 *   smoothing means the same thing regardless of what the main thread is doing.
 * @invariant Flux is a RATE (level change per SECOND), not a per-frame delta.
 *   A delta is only meaningful if the interval is fixed, and the whole point of
 *   moving here is that it no longer is. As a rate, one kick reads the same
 *   strength whether the consumer polls at 60Hz or once a second, and
 *   `maxFluxSince` can take a max over a gap and get a real answer.
 *   Calibration is preserved: TRANSIENT_FULL_SCALE 20 per frame at 60fps is
 *   1200 per second.
 *
 *   The honest limit, pinned by `test-band-analyser` [4b]: the rate is only
 *   hop-independent for attacks the hop can RESOLVE. An event faster than one
 *   hop has an unbounded true rate, and dividing by dt cannot recover
 *   information the window never had — so a 4x longer hop reports an
 *   instantaneous step as roughly 4x slower. In production the hop is fixed at
 *   256 samples, so this is a constant; the rate form still earns its keep by
 *   removing the 44.1k-vs-48k hop difference and by making the threshold mean
 *   "level per second" instead of "level per whatever interval elapsed".
 * @invariant The SuperFlux frequency max-filter happens HERE (it is per-band
 *   and rule-independent); aggregating over a rule's band range stays on the
 *   main thread, where the rules live.
 *
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */
import { SpectrumFrame } from './spectrumFrame';
import {
    buildBandTable, buildTilt, clampTilt, dbToUnit, SUPERFLUX_WIDTH,
    type Band,
} from '../bandMath';

export interface BandAnalyserConfig {
    sampleRate: number;
    fftSize: number;
    bandsPerOctave: number;
    dbFloor: number;
    dbCeiling: number;
    tiltDbPerOct: number;
    /** Level smoothing time constant, seconds. 0.074 reproduces the effective
     *  smoothing of `smoothingTimeConstant: 0.8` polled at 60fps, which is what
     *  the rig was tuned against. */
    smoothingTauSec: number;
}

export const DEFAULT_SMOOTHING_TAU_SEC = 0.074;

export class BandAnalyser {
    public bands: Band[] = [];
    /** Smoothed band levels, 0..1. */
    public levels: Float32Array = new Float32Array(0);
    /** Positive spectral flux per band, in level-units PER SECOND. */
    public flux: Float32Array = new Float32Array(0);
    public resolutionLimitHz = 0;
    /**
     * Loudest BIN this hop, on the 0..1 scale — what the global AGC follows.
     *
     * @invariant Computed over raw bins, NOT over bands, to match the
     *   main-thread path exactly. Bands are kernel-averaged, so a band peak
     *   sits below a bin peak and the AGC would boost harder on this backend
     *   than on the other. Keeping the two identical is what makes the A/B a
     *   test of the architecture rather than of the gain staging.
     */
    public peakLevel = 0;

    private cfg!: BandAnalyserConfig;
    private frame!: SpectrumFrame;
    private kernel: Float32Array = new Float32Array(0);
    private tiltDb: Float32Array = new Float32Array(0);
    private power: Float32Array = new Float32Array(0);
    /** Pre-smoothing raw levels, reused. */
    private raw: Float32Array = new Float32Array(0);
    /** Previous hop's smoothed levels — the SuperFlux reference. */
    private prev: Float32Array = new Float32Array(0);
    private hasPrev = false;

    constructor(cfg: BandAnalyserConfig) {
        this.reconfigure(cfg);
    }

    /** Rebuild everything geometry depends on. Cheap enough to call on any
     *  config change; the caller decides when that is. */
    public reconfigure(cfg: BandAnalyserConfig) {
        const prevCfg = this.cfg;
        this.cfg = { ...cfg, tiltDbPerOct: clampTilt(cfg.tiltDbPerOct) };

        const geometryChanged = !prevCfg
            || prevCfg.sampleRate !== cfg.sampleRate
            || prevCfg.fftSize !== cfg.fftSize
            || prevCfg.bandsPerOctave !== cfg.bandsPerOctave;

        if (geometryChanged) {
            const table = buildBandTable(cfg.sampleRate, cfg.fftSize, cfg.bandsPerOctave);
            this.bands = table.bands;
            this.kernel = table.kernel;
            this.resolutionLimitHz = table.resolutionLimitHz;

            const n = table.bands.length;
            this.levels = new Float32Array(n);
            this.flux = new Float32Array(n);
            this.raw = new Float32Array(n);
            this.prev = new Float32Array(n);
            // A reshape invalidates the reference frame — without this the
            // first hop after a change reads as one giant onset in every band.
            this.hasPrev = false;

            this.frame = new SpectrumFrame(cfg.fftSize);
            this.power = new Float32Array(this.frame.binCount);
        }

        // Tilt is per-band but not geometry — recompute whenever it moves, and
        // never as part of a rebuild, so dragging the slider does not drop the
        // smoothing state or the flux reference.
        this.tiltDb = buildTilt(this.bands, this.cfg.tiltDbPerOct);
    }

    public get config(): Readonly<BandAnalyserConfig> { return this.cfg; }

    /**
     * Analyse one frame of `fftSize` samples covering `hopSec` of new audio.
     *
     * `hopSec` is the elapsed time since the previous call — it drives both the
     * smoothing coefficient and the flux rate, which is what makes both
     * independent of how often this is called.
     */
    public analyse(samples: Float32Array, hopSec: number): void {
        const { dbFloor, dbCeiling, smoothingTauSec } = this.cfg;
        const n = this.bands.length;

        this.frame.analyse(samples);
        const db = this.frame.db;

        // Per-bin linear power, computed ONCE — bands overlap, so converting
        // inside the band loop would redo this for every band touching a bin.
        const power = this.power;
        let peakDb = -Infinity;
        for (let i = 0; i < db.length; i++) {
            const v = db[i];
            power[i] = Number.isFinite(v) ? Math.pow(10, v * 0.1) : 0;
            if (v > peakDb) peakDb = v;
        }
        this.peakLevel = dbToUnit(peakDb, dbFloor, dbCeiling);

        const kernel = this.kernel;
        const tilt = this.tiltDb;
        const raw = this.raw;
        for (let k = 0; k < n; k++) {
            const b = this.bands[k];
            let acc = 0;
            const end = Math.min(b.binHi, db.length);
            for (let i = b.binLo, j = b.kernelOffset; i < end; i++, j++) {
                acc += kernel[j] * power[i];
            }
            if (acc <= 0) { raw[k] = 0; continue; }
            // Weights sum to 1, so acc is already the band's mean power.
            raw[k] = dbToUnit(20 * Math.log10(Math.sqrt(acc)) + tilt[k], dbFloor, dbCeiling);
        }

        // Snapshot the flux reference BEFORE the smoothing overwrites levels.
        // Unconditional: on the very first hop these are zeros, and
        // `computeFlux` refuses to difference against a frame that never
        // existed — which is what stops hop one reading as a full-scale onset
        // in every band.
        this.prev.set(this.levels);

        // dt-correct one-pole. See the class @invariant.
        const dt = Math.max(1e-6, hopSec);
        const a = 1 - Math.exp(-dt / Math.max(1e-4, smoothingTauSec));
        const levels = this.levels;
        for (let k = 0; k < n; k++) levels[k] += a * (raw[k] - levels[k]);

        this.computeFlux(dt);
        this.hasPrev = true;
    }

    /**
     * SuperFlux (Böck & Widmer, DAFx-13): max-filter the PREVIOUS frame along
     * the FREQUENCY axis before differencing.
     *
     * A tone that merely MOVES — vibrato, a bend, a filter sweep — leaves one
     * band and enters another, and the entering band shows a rise that plain
     * flux cannot tell from an onset. Because the tone was already loud in a
     * NEIGHBOURING band last frame, `prevMax` is high there and the difference
     * vanishes. A real onset appears where nothing was loud nearby, and lives.
     */
    private computeFlux(dtSec: number): void {
        const n = this.bands.length;
        const half = Math.max(1, SUPERFLUX_WIDTH >> 1);
        const levels = this.levels;
        const prev = this.prev;
        const flux = this.flux;

        if (!this.hasPrev) { flux.fill(0); return; }

        for (let k = 0; k < n; k++) {
            let prevMax = 0;
            const lo = Math.max(0, k - half);
            const hi = Math.min(n - 1, k + half);
            for (let j = lo; j <= hi; j++) if (prev[j] > prevMax) prevMax = prev[j];
            const rise = levels[k] - prevMax;
            flux[k] = rise > 0 ? rise / dtSec : 0;
        }
    }
}
