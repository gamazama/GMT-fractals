/**
 * AudioAnalysisEngine — lazy WebAudio graph + 2-deck mixer + analyser tap.
 *
 * @invariant `init()` is idempotent — short-circuits on second call.
 *   Every public entry point (`connectMicrophone` / `connectSystemAudio` /
 *   `loadTrack`) calls it first.
 * @invariant Mic is connected to the analyser ONLY — NOT to
 *   `AudioContext.destination` — to prevent feedback. System-audio
 *   capture is connected to BOTH analyser and destination so the user
 *   hears it. Loading a track also disables an active mic; connecting
 *   the mic only PAUSES decks (asymmetric).
 * @invariant Live capture requests `echoCancellation`, `noiseSuppression`
 *   and `autoGainControl` explicitly OFF. Chrome/Edge default all three
 *   ON for `getUserMedia({audio: true})`; on a line feed from a mixer
 *   they duck the signal, notch the spectrum and pump the levels, which
 *   is indistinguishable from "the audio modulation is broken". Never
 *   fall back to a bare `{audio: true}`.
 * @invariant `inputGain` sits between the live source and the analyser —
 *   NOT on `masterGain`. masterGain feeds `destination`, so boosting a
 *   quiet line-in there would also boost monitoring volume; and the mic
 *   deliberately bypasses masterGain, so it had no gain stage at all
 *   before this node existed.
 * @invariant `getTrackInfo().duration` returns 0 (NOT 1) when metadata
 *   has not yet loaded. The `|| 1` fallback used to lock AudioStrip
 *   clips to 1-second slices; do not reintroduce it.
 */
import { ModulationRule } from '../modulation/index';
import { filterBank, dbToUnit } from './filterBank';
import type { NormalizeMode } from './filterBank';

class Deck {
    public element: HTMLAudioElement;
    public sourceNode: MediaElementAudioSourceNode | null = null;
    public gainNode: GainNode | null = null;
    public fileUrl: string | null = null;
    public fileName: string | null = null;
    public isActive: boolean = false;

    constructor(ctx: AudioContext) {
        this.element = new Audio();
        this.element.loop = true;
        this.element.crossOrigin = "anonymous";
        // Create nodes but don't connect yet
    }

    get isPlaying() { return !this.element.paused && !!this.sourceNode; }

    load(file: File, ctx: AudioContext, dest: AudioNode) {
        if (this.fileUrl) URL.revokeObjectURL(this.fileUrl);
        this.fileUrl = URL.createObjectURL(file);
        this.fileName = file.name;
        this.element.src = this.fileUrl;
        this.isActive = true;

        if (!this.sourceNode) {
            this.sourceNode = ctx.createMediaElementSource(this.element);
            this.gainNode = ctx.createGain();
            this.sourceNode.connect(this.gainNode);
            this.gainNode.connect(dest);
        }
    }
    
    play() { this.element.play().catch(e => console.warn("Deck play failed", e)); }
    pause() { this.element.pause(); }
    stop() { this.element.pause(); this.element.currentTime = 0; }
    seek(time: number) { this.element.currentTime = time; }
    setVolume(v: number) { if(this.gainNode) this.gainNode.gain.value = v; }
    
    get duration() { return this.element.duration || 0; }
    get currentTime() { return this.element.currentTime || 0; }
}

export class AudioAnalysisEngine {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    
    // Inputs
    private micSource: MediaStreamAudioSourceNode | null = null;
    private micStream: MediaStream | null = null;
    private decks: [Deck | null, Deck | null] = [null, null];
    private masterGain: GainNode | null = null;
    /** Live-capture trim, analyser-side only. @see the class @invariant. */
    private inputGain: GainNode | null = null;

    private dataArray: Float32Array<ArrayBuffer> | null = null;

    // State
    public isMicActive: boolean = false;
    public crossfade: number = 0.5; // 0.0 = A, 1.0 = B
    /** Which live input is running, for the panel's readout. */
    public inputKind: 'none' | 'mic' | 'system' = 'none';
    /** `deviceId` of the running capture device, so the picker can show it
     *  selected and a reconnect can target the same hardware. */
    public inputDeviceId: string | null = null;
    public inputDeviceLabel: string | null = null;

    /** Constraints for every live capture. The three processors are OFF by
     *  contract — see the class @invariant. `channelCount: 1` because the
     *  analyser sums to mono anyway and asking for 1 avoids a needless
     *  downmix on multi-channel interfaces. */
    private captureConstraints(deviceId?: string | null): MediaTrackConstraints {
        return {
            ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1,
        };
    }

    public init() {
        if (this.audioContext) return;
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.8; // Default volume
        this.masterGain.connect(this.audioContext.destination);
        
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.desiredFftSize;
        this.analyser.smoothingTimeConstant = 0.8; // Default smoothing
        this.applyDecibelRange();
        this.dataArray = new Float32Array(this.analyser.frequencyBinCount);

        // Live-capture trim → analyser. Decks reach the analyser via masterGain
        // (which also feeds destination); live sources route through here
        // instead so a quiet line-in can be boosted without raising monitoring.
        this.inputGain = this.audioContext.createGain();
        this.inputGain.gain.value = 1.0;
        this.inputGain.connect(this.analyser);

        // Connect Master to Analyser
        this.masterGain.connect(this.analyser);

        // Initialize Decks
        this.decks[0] = new Deck(this.audioContext);
        this.decks[1] = new Deck(this.audioContext);
        
        // Initial Mix
        this.setCrossfade(0.5);
    }
    
    public setSmoothing(val: number) {
        if (this.analyser) {
            // Clamp to avoid errors (WebAudio max is < 1)
            this.analyser.smoothingTimeConstant = Math.max(0, Math.min(0.99, val));
        }
    }

    // ── Analysis window + dynamic range ─────────────────────────────────────
    private desiredFftSize = 4096;
    private dbFloor = -90;
    private dbCeiling = -10;

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
     * @invariant Rule bands are stored as FRACTIONS of the bin array, and a
     *   fraction maps to `f × nyquist` at any fftSize — so changing this never
     *   invalidates existing rules or saved scenes.
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
            // getByteFrequencyData writes a truncated / stale-tailed frame.
            this.dataArray = new Float32Array(this.analyser.frequencyBinCount);
        }
    }

    /**
     * Dynamic range mapped onto the 0-255 byte spectrum.
     *
     * WebAudio's defaults (-100 .. -30 dB) are wrong for a music feed: anything
     * above -30 dBFS pins at 255, so a loud snare's broadband energy saturates
     * into a solid wall and the whole spectrum reads flat. Widening the ceiling
     * gives loud material somewhere to go, and lifting the floor keeps room
     * noise out of the bottom of the display.
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

    /** Tear down the running live capture — graph node AND the underlying
     *  device tracks. Stopping the tracks is what releases the hardware and
     *  clears the browser's recording indicator; without it, switching devices
     *  leaves the old one held open. */
    private releaseLiveInput() {
        if (this.micSource) { this.micSource.disconnect(); this.micSource = null; }
        if (this.micStream) {
            this.micStream.getTracks().forEach(t => t.stop());
            this.micStream = null;
        }
        this.isMicActive = false;
        this.inputKind = 'none';
    }

    /**
     * Audio input devices, for the panel's picker.
     *
     * Labels are empty strings until the origin holds mic permission — a
     * browser privacy rule, not a bug. Callers that need names should connect
     * once (or call this again after a successful `connectMicrophone`) rather
     * than trying to work around it.
     */
    public async listInputDevices(): Promise<MediaDeviceInfo[]> {
        if (!navigator.mediaDevices?.enumerateDevices) return [];
        try {
            const all = await navigator.mediaDevices.enumerateDevices();
            return all.filter(d => d.kind === 'audioinput');
        } catch (e) {
            console.warn('AudioEngine: device enumeration failed', e);
            return [];
        }
    }

    /** Fires whenever the live input changes (connect / disconnect / device
     *  switch) so the panel can refresh without polling. */
    private inputListeners = new Set<() => void>();
    public onInputChange(fn: () => void): () => void {
        this.inputListeners.add(fn);
        return () => { this.inputListeners.delete(fn); };
    }
    private emitInputChange() { this.inputListeners.forEach(fn => fn()); }

    /**
     * Connect a hardware input. `deviceId` targets a specific device (an
     * audio-interface line-in at a gig); omit it for the system default.
     *
     * Returns true on success. On failure the previous input is already
     * released — a failed switch leaves NO input rather than silently
     * continuing on the old device, which would misreport what is running.
     */
    public async connectMicrophone(deviceId?: string | null): Promise<boolean> {
        this.init();
        if (!this.audioContext || !this.masterGain) return false;

        // Stop Decks
        this.decks.forEach(d => d?.pause());
        this.releaseLiveInput();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: this.captureConstraints(deviceId),
            });

            this.micStream = stream;
            this.micSource = this.audioContext.createMediaStreamSource(stream);
            // Mic → inputGain → analyser. NOT to destination: monitoring a room
            // mic through the same speakers it hears is a feedback loop.
            this.micSource.connect(this.inputGain!);

            const track = stream.getAudioTracks()[0];
            this.inputDeviceId = track?.getSettings().deviceId ?? deviceId ?? null;
            this.inputDeviceLabel = track?.label || null;
            this.isMicActive = true;
            this.inputKind = 'mic';
            if (this.audioContext.state === 'suspended') this.audioContext.resume();
            this.emitInputChange();
            return true;
        } catch (e) {
            console.error('AudioEngine: mic access failed', e);
            this.emitInputChange();
            return false;
        }
    }

    public async connectSystemAudio(): Promise<boolean> {
        // Similar to Mic, but typically want to hear it too.
        this.init();
        if (!this.audioContext) return false;
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                // Same processor-off contract as the mic path: a shared tab's
                // music must reach the FFT unprocessed.
                audio: this.captureConstraints(),
            });
            stream.getVideoTracks().forEach(track => track.stop());

            if (stream.getAudioTracks().length === 0) {
                stream.getTracks().forEach(t => t.stop());
                console.warn('AudioEngine: share dialog returned no audio track — "Share system audio" was left unchecked');
                return false;
            }

            this.releaseLiveInput();
            this.micStream = stream;
            this.micSource = this.audioContext.createMediaStreamSource(stream);
            this.micSource.connect(this.inputGain!);              // Visualize
            this.micSource.connect(this.audioContext.destination); // Listen

            this.inputDeviceId = null;
            this.inputDeviceLabel = stream.getAudioTracks()[0]?.label || 'System audio';
            this.isMicActive = true;
            this.inputKind = 'system';
            if (this.audioContext.state === 'suspended') this.audioContext.resume();
            this.emitInputChange();
            return true;
        } catch (e) {
            console.error('AudioEngine: system audio capture failed', e);
            this.emitInputChange();
            return false;
        }
    }

    /** Disconnect the live input and release the device. */
    public disconnectLiveInput() {
        this.releaseLiveInput();
        this.inputDeviceLabel = null;
        this.emitInputChange();
    }

    /** Live-capture trim (analyser-side only — never affects monitoring). */
    public setInputGain(val: number) {
        if (this.inputGain && this.audioContext) {
            this.inputGain.gain.setTargetAtTime(val, this.audioContext.currentTime, 0.05);
        }
    }
    
    public loadTrack(deckIndex: 0 | 1, file: File) {
        this.init();
        if (!this.audioContext || !this.masterGain) return;
        
        // Disable live input — a deck and a mic on the same analyser would sum.
        if (this.micSource) {
            this.releaseLiveInput();
            this.inputDeviceLabel = null;
            this.emitInputChange();
        }

        this.decks[deckIndex]?.load(file, this.audioContext, this.masterGain);
        this.setCrossfade(this.crossfade); // Re-apply volume
        
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
    }
    
    public play(deckIndex: 0 | 1) { this.decks[deckIndex]?.play(); }
    public pause(deckIndex: 0 | 1) { this.decks[deckIndex]?.pause(); }
    public stop(deckIndex: 0 | 1) { this.decks[deckIndex]?.stop(); }
    public deactivateDeck(deckIndex: 0 | 1) {
        const d = this.decks[deckIndex];
        if (d) { d.stop(); d.isActive = false; }
    }
    public seek(deckIndex: 0 | 1, time: number) { this.decks[deckIndex]?.seek(time); }

    /** Current `<audio>.duration` for the deck. 0 if no deck or metadata
     *  hasn't loaded yet. Prefer over `getTrackInfo(idx).duration` when only
     *  the duration is needed — no allocation, no other-field reads. */
    public getElementDuration(deckIndex: 0 | 1): number {
        return this.decks[deckIndex]?.duration || 0;
    }

    /** Resolve with `<audio>.duration` once the deck's metadata has loaded
     *  (via the element's `loadedmetadata` / `durationchange` events). Resolves
     *  with `0` if no deck is loaded or the timeout elapses. Event-driven
     *  replacement for the previous 50ms-poll. */
    public waitForMetadata(deckIndex: 0 | 1, timeoutMs = 4000): Promise<number> {
        const d = this.decks[deckIndex];
        if (!d) return Promise.resolve(0);
        if (d.duration > 0 && Number.isFinite(d.duration)) return Promise.resolve(d.duration);
        return new Promise(resolve => {
            let settled = false;
            const el = d.element;
            const settle = (val: number) => {
                if (settled) return;
                settled = true;
                el.removeEventListener('loadedmetadata', onMeta);
                el.removeEventListener('durationchange', onMeta);
                clearTimeout(timer);
                resolve(val);
            };
            const onMeta = () => {
                const dur = d.duration;
                if (dur > 0 && Number.isFinite(dur)) settle(dur);
            };
            el.addEventListener('loadedmetadata', onMeta);
            el.addEventListener('durationchange', onMeta);
            const timer = setTimeout(() => settle(0), timeoutMs);
        });
    }

    public getTrackInfo(deckIndex: 0 | 1) {
        const d = this.decks[deckIndex];
        return {
            // 0 (not 1) when metadata hasn't loaded — `|| 1` here made
            // AudioStrip's waitForAudioMetadata false-resolve and lock
            // the clip to a 1-s slice.
            duration: d?.duration || 0,
            currentTime: d?.currentTime || 0,
            hasTrack: !!d?.sourceNode,
            fileName: d?.fileName || null,
            isPlaying: d?.isPlaying || false,
            isActive: d?.isActive || false
        };
    }

    public setCrossfade(val: number) {
        this.crossfade = val;
        // Equal Power Crossfade
        const gainA = Math.cos(val * 0.5 * Math.PI);
        const gainB = Math.cos((1.0 - val) * 0.5 * Math.PI);
        
        if (this.decks[0]) this.decks[0].setVolume(gainA);
        if (this.decks[1]) this.decks[1].setVolume(gainB);
    }
    
    public setMasterGain(val: number) {
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(val, this.audioContext!.currentTime, 0.1);
        }
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
     * Pull the current FFT frame.
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
        normalizeMode: NormalizeMode = 'pcen',
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
            normalizeMode,
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
        if (peak < AudioAnalysisEngine.AGC_FLOOR) return;

        // Instant attack, exponential release — the standard normaliser shape.
        if (peak > this.agcPeak) {
            this.agcPeak = peak;
        } else {
            const k = Math.exp(-AudioAnalysisEngine.AGC_RELEASE * Math.max(0, deltaSec) * 10);
            this.agcPeak = peak + (this.agcPeak - peak) * k;
        }

        this.agcGain = Math.min(
            AudioAnalysisEngine.AGC_MAX_BOOST,
            AudioAnalysisEngine.AGC_TARGET / Math.max(AudioAnalysisEngine.AGC_FLOOR, this.agcPeak),
        );
    }

    /** Multiplier the rule pipeline applies to a band average. 1 when AGC is
     *  off, so the non-AGC path is bit-identical to before. */
    public getSignalGain(): number {
        return this.agcGain;
    }

    public getRawData() {
        return this.dataArray;
    }

    /**
     * Device sample rate. The FFT's bins span 0..sampleRate/2, so this is what
     * turns a normalised bin position into real Hz — see `binNormToHz` in
     * `freqScale.ts`. Returns 48000 before `init()`: the common default, and
     * only used to label a spectrum that isn't running yet.
     */
    public get sampleRate(): number {
        return this.audioContext?.sampleRate ?? 48000;
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

export const audioAnalysisEngine = new AudioAnalysisEngine();
