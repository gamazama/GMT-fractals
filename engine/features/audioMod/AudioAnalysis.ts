/**
 * AudioAnalysis — spectrum tap, dB window, global auto-gain.
 *
 * Split out of `AudioAnalysisEngine` (ADR-0110). This half turns whatever is
 * on the transport's `analysisBus` into band values. It owns no decks, no
 * capture and no AudioContext — it attaches to a node it is handed.
 *
 * That separation is what makes the worklet migration possible: everything
 * here is a candidate to move onto the audio thread, and nothing here holds a
 * `<audio>` element that would block the move.
 *
 * @invariant Analysis is pulled once per RENDER FRAME, and that is a known
 *   defect this class is staged to fix. `AnalyserNode.smoothingTimeConstant`
 *   is applied per `getFloatFrequencyData` CALL with no time compensation, so
 *   the effective smoothing time is set by the frame rate: ~74ms at 60fps,
 *   ~297ms at 15fps. Audio reactivity therefore gets sluggish in proportion to
 *   how heavy the scene is. The per-band followers and the AGC below do NOT
 *   share the bug — they take `deltaSec` and use `exp(-k·dt)` — which is
 *   exactly why the test suite cannot see it.
 *
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */
import { filterBank } from './filterBank';
import { dbToUnit } from './bandMath';

export class AudioAnalysis {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private dataArray: Float32Array<ArrayBuffer> | null = null;

    // ── Analysis window + dynamic range ─────────────────────────────────────
    private desiredFftSize = 4096;
    private dbFloor = -90;
    private dbCeiling = -10;
    private smoothing = 0.8;

    public get sampleRate(): number {
        return this.audioContext?.sampleRate ?? 48000;
    }

    /** Attach to the transport's tap. Idempotent per context. */
    public attach(ctx: AudioContext, tap: AudioNode) {
        if (this.analyser) return;
        this.audioContext = ctx;
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = this.desiredFftSize;
        this.analyser.smoothingTimeConstant = this.smoothing;
        this.applyDecibelRange();
        this.dataArray = new Float32Array(this.analyser.frequencyBinCount);
        tap.connect(this.analyser);
    }

    public setSmoothing(val: number) {
        // Clamp to avoid errors (WebAudio max is < 1)
        this.smoothing = Math.max(0, Math.min(0.99, val));
        if (this.analyser) this.analyser.smoothingTimeConstant = this.smoothing;
    }

    /**
     * FFT size — the frequency-vs-time resolution trade, and the single biggest
     * lever on how well a kick can be isolated.
     *
     * Bin width is `sampleRate / fftSize`, and the analysis window is
     * `fftSize / sampleRate`. At 48kHz:
     *   2048 → 23.4 Hz/bin,  43ms window — a 40-120Hz kick band is ~3 bins
     *   4096 → 11.7 Hz/bin,  85ms window — ~7 bins   (default)
     *   8192 →  5.9 Hz/bin, 171ms window — ~14 bins
     *
     * @invariant Changing this never invalidates existing rules or saved
     *   scenes: rule bands are stored in real Hz (ADR-0106), which is
     *   independent of the FFT geometry entirely. It DOES change how finely a
     *   band can be resolved — see `FilterBank.resolutionLimitHz`.
     *
     * The window is the cost: a longer one smears attacks across more frames,
     * which blunts transient mode. 4096 is the default because 2048 could not
     * resolve a kick from its own harmonics, and 8192's 171ms window is too
     * slow to punch on a beat.
     */
    public setFftSize(size: number) {
        const clamped = Math.max(32, Math.min(32768, 2 ** Math.round(Math.log2(size))));
        if (clamped === this.desiredFftSize && this.analyser?.fftSize === clamped) return;
        this.desiredFftSize = clamped;
        if (this.analyser) {
            this.analyser.fftSize = clamped;
            // frequencyBinCount changed — the read buffer must be resized or
            // getFloatFrequencyData writes a truncated / stale-tailed frame.
            this.dataArray = new Float32Array(this.analyser.frequencyBinCount);
        }
    }

    /**
     * Dynamic range of the spectrum, in dBFS.
     *
     * WebAudio's defaults (-100 .. -30 dB) are wrong for a music feed: anything
     * above -30 dBFS pins at full scale, so a loud snare's broadband energy
     * saturates into a solid wall and the whole spectrum reads flat. Widening
     * the ceiling gives loud material somewhere to go, and lifting the floor
     * keeps room noise out of the bottom of the display.
     *
     * @invariant The window is applied by `dbToUnit`, NOT by the analyser.
     *   `min/maxDecibels` only ever affected `getByteFrequencyData`'s internal
     *   0-255 conversion, and nothing reads bytes any more. They are still set
     *   below so the node stays self-consistent for anything that inspects it,
     *   but changing them alone would do nothing — `dbToUnit` is the one place
     *   the scale is defined, and every downstream threshold is calibrated
     *   against it.
     */
    public setDecibelRange(floor: number, ceiling: number) {
        // WebAudio throws if min >= max.
        this.dbFloor = Math.min(floor, ceiling - 10);
        this.dbCeiling = ceiling;
        this.applyDecibelRange();
    }

    private applyDecibelRange() {
        if (!this.analyser) return;
        this.analyser.minDecibels = this.dbFloor;
        this.analyser.maxDecibels = this.dbCeiling;
    }

    /** Hz covered by one FFT bin — the finest band the current settings can
     *  resolve. Shown in the panel so the trade is visible, not implicit. */
    public get binWidthHz(): number {
        return this.sampleRate / this.desiredFftSize;
    }

    // ── Auto gain (AGC) ─────────────────────────────────────────────────────
    /** Slow-release peak follower over the whole spectrum, 0..1. */
    private agcPeak = 0;
    /** Gain the rule pipeline multiplies its band average by. 1 when AGC is off. */
    private agcGain = 1;

    /** Below this the input is treated as silence and the gain is FROZEN rather
     *  than climbing — otherwise a quiet passage between tracks would ramp the
     *  boost up and detonate on the next downbeat. */
    private static readonly AGC_FLOOR = 0.04;
    /** Ceiling on the boost. Past this you are amplifying noise, not signal. */
    private static readonly AGC_MAX_BOOST = 8;
    /** Where AGC aims to put the running peak. Short of 1.0 so genuine peaks
     *  keep some headroom instead of sitting pinned at the gate ceiling. */
    private static readonly AGC_TARGET = 0.8;
    /** Per-second release rate of the peak follower. Attack is instantaneous
     *  (a peak is a peak); release is what sets how fast the rig adapts to a
     *  quieter track — ~2.5 s to fall an order of magnitude. */
    private static readonly AGC_RELEASE = 0.4;

    /**
     * Pull the current FFT frame and drive the filterbank.
     *
     * `agcEnabled` is passed per call (rather than latched via a setter) so the
     * flag can only ever be the store's live value — a rig whose panel is
     * closed, or one restored by a scene load, still behaves as configured.
     */
    public update(
        agcEnabled = false,
        deltaSec = 1 / 60,
        bandsPerOctave = 6,
        normalizeBands = false,
        /** dB/octave, 0 = raw. Defaults to no tilt so a caller that does not
         *  know about it gets the untouched spectrum; the user-facing default
         *  is 3, set on the `spectralTilt` param. */
        spectralTilt = 0,
    ) {
        if (!this.analyser || !this.dataArray) return;
        // FLOAT, not byte. getByteFrequencyData quantises to 256 steps across
        // the dB window before we ever see it, which throws away precision
        // exactly where it is scarcest — quiet bands near the floor. The float
        // path hands us raw dBFS and we apply the window ourselves in
        // `dbToUnit`, so the 0..1 scale is unchanged.
        this.analyser.getFloatFrequencyData(this.dataArray);

        // Refresh the filterbank shape only when a setting actually changed —
        // rebuild reallocates and drops the per-band followers.
        const bankOpts = {
            sampleRate: this.sampleRate,
            fftSize: this.desiredFftSize,
            bandsPerOctave,
        };
        if (!filterBank.matches(bankOpts)) filterBank.rebuild(bankOpts);
        filterBank.analyse(this.dataArray, {
            dbFloor: this.dbFloor,
            dbCeiling: this.dbCeiling,
            normalize: normalizeBands,
            tiltDbPerOct: spectralTilt,
            deltaSec,
        });

        if (!agcEnabled) { this.agcGain = 1; this.agcPeak = 0; return; }

        const peak = this.getPeakLevel();

        // Silence gate FIRST. Gating on the released peak instead of the live
        // input is the trap: through a gap between tracks the follower keeps
        // decaying, the gain is recomputed against an ever-smaller peak, and it
        // ratchets to the ×8 ceiling before the peak finally drops under the
        // floor — so the next downbeat arrives at maximum boost and detonates.
        // While the input is silent, hold BOTH the follower and the gain.
        if (peak < AudioAnalysis.AGC_FLOOR) return;

        if (peak > this.agcPeak) {
            this.agcPeak = peak;
        } else {
            const k = Math.exp(-AudioAnalysis.AGC_RELEASE * Math.max(0, deltaSec) * 10);
            this.agcPeak = peak + (this.agcPeak - peak) * k;
        }

        this.agcGain = Math.min(
            AudioAnalysis.AGC_MAX_BOOST,
            AudioAnalysis.AGC_TARGET / Math.max(AudioAnalysis.AGC_FLOOR, this.agcPeak),
        );
    }

    public getRawData() {
        return this.dataArray;
    }

    /** Multiplier the rule pipeline applies to a band average. 1 when AGC is
     *  off, so the non-AGC path is bit-identical to before. */
    public getSignalGain(): number {
        return this.agcGain;
    }

    /** Loudest bin this frame, 0..1. Drives the panel's level/clip meter —
     *  the one readout that tells you at a glance whether the input is too
     *  quiet to gate or hot enough to pin.
     *
     *  Peaks in dB, then maps ONCE through the same `dbToUnit` window the bands
     *  use. (dB is monotonic in magnitude, so the loudest bin is the same bin
     *  either way — mapping after the scan keeps this to one conversion.)
     *  Identical 0..1 scale to the byte path, so `AGC_FLOOR` and the meter's
     *  amber/red points keep their calibration. */
    public getPeakLevel(): number {
        if (!this.dataArray) return 0;
        let peakDb = -Infinity;
        for (let i = 0; i < this.dataArray.length; i++) {
            if (this.dataArray[i] > peakDb) peakDb = this.dataArray[i];
        }
        return dbToUnit(peakDb, this.dbFloor, this.dbCeiling);
    }
}
