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
 * @invariant Analysis is pulled once per MAIN-THREAD TICK, which makes the
 *   analysis rate a property of main-thread health rather than of the audio.
 *
 *   Note what this is NOT: a heavy fractal does not slow it down. Rendering
 *   runs in a worker, and `GmtRendererTickDriver` documents that "the main
 *   thread runs at 60 while the worker may render far slower". Owner-confirmed
 *   in the field — no audio degradation under GPU load. An earlier version of
 *   this comment claimed otherwise and was wrong.
 *
 *   The real exposure is main-thread BLOCKING. When UI fps drops under 20,
 *   `GmtRendererTickDriver` throttles `runTicks` to once per SECOND — so
 *   analysis collapses to 1 Hz, the spectrum freezes, and every transient in
 *   that second is lost rather than merely late. That is the "uncomfortable to
 *   work on when strained" case, and it is what moving analysis onto the audio
 *   thread actually fixes: the worklet keeps running and accumulating, and a
 *   late tick reads a current value instead of a stale one.
 *
 *   Secondary, and smaller than it sounds: `AnalyserNode.smoothingTimeConstant`
 *   is applied per `getFloatFrequencyData` CALL with no time compensation, so
 *   its effective time constant scales with the gap between calls (~74ms at
 *   60fps). At a steady 60 that is simply the tuning; it only misbehaves when
 *   the call rate moves. The per-band followers and the AGC below do NOT share
 *   the bug — they take `deltaSec` and use `exp(-k·dt)`.
 *
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */
import { filterBank } from './filterBank';
import { dbToUnit } from './bandMath';
import { AutoGain } from './dsp/autoGain';
import type { AnalysisBackend } from './analysisBackend';

export class AudioAnalysis implements AnalysisBackend {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private dataArray: Float32Array<ArrayBuffer> | null = null;
    private tap: AudioNode | null = null;
    private agc = new AutoGain();

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
        this.tap = tap;
        tap.connect(this.analyser);
    }

    public detach(): void {
        if (this.tap && this.analyser) {
            try { this.tap.disconnect(this.analyser); } catch { /* already gone */ }
        }
        this.analyser = null;
        this.dataArray = null;
        this.tap = null;
        this.audioContext = null;
        this.agc.reset();
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

        this.agc.update(agcEnabled, this.getPeakLevel(), deltaSec);
    }

    public getRawData() {
        return this.dataArray;
    }

    /** Multiplier the rule pipeline applies to a band average. 1 when AGC is
     *  off, so the non-AGC path is bit-identical to before. */
    public getSignalGain(): number {
        return this.agc.value;
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
