/**
 * AudioAnalysisEngine — facade over `AudioTransport` + `AudioAnalysis`.
 *
 * The two halves were one class until ADR-0110. They were split because
 * analysis is moving onto an AudioWorklet and transport cannot follow — you
 * can't put a `<audio>` deck on the audio thread. Everything that makes sound
 * reach a node lives in `AudioTransport`; everything that turns that node into
 * band values lives in `AudioAnalysis`.
 *
 * This facade exists so the split cost zero call-site churn. ~30 call sites
 * across `AudioPanel`, `AudioSpectrum`, `AudioStrip`, `audioClipSync`,
 * `AnimationSystem` and the debug suites keep the exact surface they had.
 *
 * @invariant Delegation only. If you find logic accumulating here, it belongs
 *   in one of the two halves — the whole point of the split is that the
 *   worklet migration can replace `AudioAnalysis` wholesale without reading
 *   this file.
 * @invariant `init()` wires the analysis half to the transport's
 *   `analysisBus` via the constructor hook, so transport entry points that
 *   self-init (`loadTrack`, `connectMicrophone`, `connectSystemAudio`) bring
 *   analysis up with them. Attaching from here instead would leave a rig that
 *   was started by loading a track with a dead analyser.
 *
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */
import { AudioTransport } from './AudioTransport';
import { AudioAnalysis } from './AudioAnalysis';
import { WorkletAnalysis } from './WorkletAnalysis';
import type { AnalysisBackend } from './analysisBackend';

/** Which analysis backend is running. TEMPORARY A/B — see the @invariant. */
export type AnalysisBackendKind = 'analyser' | 'worklet';

export class AudioAnalysisEngine {
    private node = new AudioAnalysis();
    private worklet = new WorkletAnalysis();
    private kind: AnalysisBackendKind = 'analyser';
    private ctx: AudioContext | null = null;
    private tap: AudioNode | null = null;

    private get analysis(): AnalysisBackend {
        // Fall back while the worklet module is still loading, and permanently
        // if it failed — a rig mid-set must not go silent because addModule
        // rejected on some browser.
        if (this.kind === 'worklet' && this.worklet.isReady) return this.worklet;
        return this.node;
    }

    private transport = new AudioTransport((ctx, tap) => {
        this.ctx = ctx;
        this.tap = tap;
        this.node.attach(ctx, tap);
        if (this.kind === 'worklet') this.worklet.attach(ctx, tap);
    });

    /**
     * Switch analysis backend.
     *
     * @invariant BOTH backends stay attached while the worklet is selected.
     *   The AnalyserNode costs one FFT per tick and is what covers the load
     *   window and any addModule failure; detaching it would turn a recoverable
     *   fallback into a dead rig. This is a TEMPORARY A/B — when the worklet is
     *   confirmed in the field, delete `AudioAnalysis`, the `analysisBackend`
     *   param, and this method together.
     */
    public setBackend(kind: AnalysisBackendKind) {
        if (kind === this.kind) return;
        this.kind = kind;
        if (kind === 'worklet' && this.ctx && this.tap) {
            this.worklet.attach(this.ctx, this.tap);
        }
    }

    public getBackend(): AnalysisBackendKind { return this.kind; }
    /** True when the selected backend is actually the one running — the panel
     *  shows this so a silent fallback is visible rather than mysterious. */
    public get backendActive(): boolean {
        return this.kind === 'analyser' || this.worklet.isReady;
    }
    /** Snapshot nearest an AudioContext time — modulation recording's
     *  per-frame back-fill. Null on the AnalyserNode backend, which keeps no
     *  history. */
    public snapshotAt(t: number) {
        return this.kind === 'worklet' && this.worklet.isReady
            ? this.worklet.snapshotAt(t)
            : null;
    }
    public get contextTime(): number { return this.ctx?.currentTime ?? 0; }

    public init() { this.transport.init(); }

    // ── Transport: live capture ─────────────────────────────────────────────
    public get isMicActive() { return this.transport.isMicActive; }
    public get inputKind() { return this.transport.inputKind; }
    public get inputDeviceId() { return this.transport.inputDeviceId; }
    public get inputDeviceLabel() { return this.transport.inputDeviceLabel; }
    public listInputDevices() { return this.transport.listInputDevices(); }
    public onInputChange(fn: () => void) { return this.transport.onInputChange(fn); }
    public connectMicrophone(deviceId?: string | null) { return this.transport.connectMicrophone(deviceId); }
    public connectSystemAudio() { return this.transport.connectSystemAudio(); }
    public disconnectLiveInput() { this.transport.disconnectLiveInput(); }
    public setInputGain(val: number) { this.transport.setInputGain(val); }

    // ── Transport: decks ────────────────────────────────────────────────────
    public get crossfade() { return this.transport.crossfade; }
    public loadTrack(deckIndex: 0 | 1, file: File) { this.transport.loadTrack(deckIndex, file); }
    public play(deckIndex: 0 | 1) { this.transport.play(deckIndex); }
    public pause(deckIndex: 0 | 1) { this.transport.pause(deckIndex); }
    public stop(deckIndex: 0 | 1) { this.transport.stop(deckIndex); }
    public deactivateDeck(deckIndex: 0 | 1) { this.transport.deactivateDeck(deckIndex); }
    public seek(deckIndex: 0 | 1, time: number) { this.transport.seek(deckIndex, time); }
    public getElementDuration(deckIndex: 0 | 1) { return this.transport.getElementDuration(deckIndex); }
    public waitForMetadata(deckIndex: 0 | 1, timeoutMs?: number) { return this.transport.waitForMetadata(deckIndex, timeoutMs); }
    public getTrackInfo(deckIndex: 0 | 1) { return this.transport.getTrackInfo(deckIndex); }
    public setCrossfade(val: number) { this.transport.setCrossfade(val); }
    public setMasterGain(val: number) { this.transport.setMasterGain(val); }

    // ── Analysis ────────────────────────────────────────────────────────────
    /**
     * Device sample rate. The FFT's bins span 0..sampleRate/2, so this bounds
     * what the spectrum can display and how far a rule's band can reach.
     *
     * Note rule bands are stored in real Hz (ADR-0106), so this no longer
     * decodes them — it only bounds them. Returns 48000 before `init()`: the
     * common default, and only used to label a spectrum that isn't running yet.
     */
    public get sampleRate() { return this.transport.sampleRate; }
    public get binWidthHz() { return this.analysis.binWidthHz; }
    // Settings go to BOTH backends, not just the active one: the inactive arm
    // is the fallback, and a fallback configured differently from what the user
    // set would be worse than no fallback at all.
    public setSmoothing(val: number) { this.node.setSmoothing(val); this.worklet.setSmoothing(val); }
    public setFftSize(size: number) { this.node.setFftSize(size); this.worklet.setFftSize(size); }
    public setDecibelRange(floor: number, ceiling: number) {
        this.node.setDecibelRange(floor, ceiling);
        this.worklet.setDecibelRange(floor, ceiling);
    }
    public getRawData() { return this.analysis.getRawData(); }
    public getPeakLevel() { return this.analysis.getPeakLevel(); }
    public getSignalGain() { return this.analysis.getSignalGain(); }

    public update(
        agcEnabled = false,
        deltaSec = 1 / 60,
        bandsPerOctave = 6,
        normalizeBands = false,
        spectralTilt = 0,
    ) {
        this.analysis.update(agcEnabled, deltaSec, bandsPerOctave, normalizeBands, spectralTilt);
    }
}

export const audioAnalysisEngine = new AudioAnalysisEngine();
