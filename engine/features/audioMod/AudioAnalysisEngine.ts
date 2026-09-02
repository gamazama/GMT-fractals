/**
 * AudioAnalysisEngine — facade over `AudioTransport` + `WorkletAnalysis`.
 *
 * One class did both jobs until ADR-0110. They were split because analysis
 * moved onto the audio thread and transport could not follow — you cannot put
 * a `<audio>` deck there. Everything that makes sound reach a node lives in
 * `AudioTransport`; everything that turns that node into band values lives in
 * `WorkletAnalysis`, which is a receiver for the worklet doing the real work.
 *
 * This facade exists so the split cost zero call-site churn. ~30 call sites
 * across `AudioPanel`, `AudioSpectrum`, `AudioStrip`, `audioClipSync`,
 * `audioTick` and the debug suites keep the surface they had.
 *
 * @assumption Delegation only. If logic accumulates here it belongs in one of
 *   the two halves.
 * @assumption There is no main-thread analysis fallback, deliberately. The
 *   AnalyserNode implementation existed as an A/B arm (ADR-0110), the A/B was
 *   concluded in the owner's favour, and it was deleted rather than kept as a
 *   safety net. A silent fallback to a worse implementation HIDES the bug that
 *   triggered it; `analysisFailed` makes the failure visible in the panel
 *   instead. AudioWorklet has been universally supported since well before
 *   this shipped, so the realistic failure is our own code, which is exactly
 *   the case a fallback would have masked.
 * @assumption `init()` wires analysis to the transport's `analysisBus` via the
 *   constructor hook, so transport entry points that self-init (`loadTrack`,
 *   `connectMicrophone`, `connectSystemAudio`) bring analysis up with them.
 *
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */
import { AudioTransport } from './AudioTransport';
import { WorkletAnalysis } from './WorkletAnalysis';

export class AudioAnalysisEngine {
    private analysis = new WorkletAnalysis();
    private ctx: AudioContext | null = null;

    private transport = new AudioTransport((ctx, tap) => {
        this.ctx = ctx;
        this.analysis.attach(ctx, tap);
    });

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
     * Rule bands are stored in real Hz (ADR-0106), so this no longer decodes
     * them — it only bounds them. Returns 48000 before `init()`.
     */
    public get sampleRate() { return this.transport.sampleRate; }
    public get binWidthHz() { return this.analysis.binWidthHz; }
    public setSmoothing(val: number) { this.analysis.setSmoothing(val); }
    public setFftSize(size: number) { this.analysis.setFftSize(size); }
    public setDecibelRange(floor: number, ceiling: number) { this.analysis.setDecibelRange(floor, ceiling); }
    public getPeakLevel() { return this.analysis.getPeakLevel(); }
    public getSignalGain() { return this.analysis.getSignalGain(); }

    /** True once analysis has produced at least one frame. Consumers gate on
     *  this rather than inspecting buffers — the old `getRawData()` returned a
     *  bin array nobody read, only null-checked. */
    public hasSignal() { return this.analysis.hasSignal(); }
    /** The worklet module could not be loaded. Surfaced in the panel; there is
     *  no fallback by design — see the class @invariant. */
    public get analysisFailed() { return this.analysis.hasFailed; }

    /** AudioContext clock, for aligning recorded frames to snapshots. */
    public get contextTime(): number { return this.ctx?.currentTime ?? 0; }
    /** Rewind `filterBank` to the snapshot nearest `t`. False when the ring
     *  does not reach back that far. @see WorkletAnalysis.applySnapshotAt */
    public applySnapshotAt(t: number, maxAgeSec: number) {
        return this.analysis.applySnapshotAt(t, maxAgeSec);
    }

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
