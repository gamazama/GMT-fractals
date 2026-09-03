/**
 * AudioTransport — the WebAudio graph, the two decks, and live capture.
 *
 * Split out of `AudioAnalysisEngine` (ADR-0110). This half is everything that
 * makes sound reach a node: context ownership, deck playback, mic / system
 * capture, gain staging. It knows nothing about FFTs, bands or modulation.
 *
 * The split is forced rather than aesthetic: analysis is moving into an
 * AudioWorklet, and a `<audio>` element deck cannot follow it there. What CAN
 * follow is a node reference, which is why this class exposes exactly one —
 * `analysisBus`.
 *
 * @assumption `analysisBus` is the single tap point. Both signal paths
 *   (`masterGain` from the decks, `inputGain` from live capture) sum into it,
 *   and anything that wants to analyse the mix attaches THERE rather than to
 *   the two sources separately. It is a unity-gain node, so inserting it
 *   changed no levels — it exists to make "the thing being analysed" one
 *   object, so an AnalyserNode and a worklet can both hang off it during the
 *   A/B without duplicating the fan-in.
 * @assumption `init()` is idempotent — short-circuits on second call. Every
 *   public entry point that can be the first thing a user touches
 *   (`connectMicrophone` / `connectSystemAudio` / `loadTrack`) calls it first.
 * @assumption Mic is connected to the analysis path ONLY — NOT to
 *   `AudioContext.destination` — to prevent feedback. System-audio capture is
 *   connected to BOTH so the user hears it. Loading a track also disables an
 *   active mic; connecting the mic only PAUSES decks (asymmetric).
 * @bug PRODUCTION: with audio running, GMT renders at ~30fps while its
 *   window is focused and ~60fps while another window has focus
 *   (owner-observed 2026-07-25, still present 2026-09-02). A plain audio FILE
 *   on a deck shows it too (owner, 2026-09-02), so the screen-share surface
 *   of system-audio capture is at most an extra cost, not the cause. The
 *   owner's rule: nothing on the audio side may use or contend the GPU — it
 *   belongs to the render. What the audio path did to the GPU, and what
 *   changed on 2026-09-02:
 *     - every frame the modulation tick published a new liveModulations
 *       map into the store, and the panel router subscribes to the whole
 *       store, so every open panel re-rendered and repainted 60×/s — GPU
 *       raster + composite next to the worker's WebGL. app-gmt now publishes
 *       at 20 Hz for the UI (setLiveModulationPublishInterval in main.tsx);
 *       the render path reads getLiveModulationsNow() per frame, unchanged.
 *     - the spectrum canvas rasterised on the GPU 30×/s; it is CPU-raster
 *       now (willReadFrequently) and draws only while on screen.
 *     - the deck status poll re-rendered its row 10×/s on identical data.
 *   `b3e8b321` had already cut the spectrum redraw to 30Hz.
 *   OWNER VERDICT 2026-09-02, after testing: enabling audio still drops the
 *   GPU consistently. The mitigations above are not the whole story, and
 *   reasoning from the source has run out: the only honest next step is real
 *   profiling on the owner's machine — Chrome DevTools' Performance panel
 *   with the GPU track, or a purpose-built probe beyond `?perf` (which sees
 *   the main thread and the worker's delivered frames, not GPU time).
 *   Remaining suspects for that session: the pointer pre-pick readback
 *   (Navigation.tsx), the worklet→main message traffic, and whatever the
 *   compositor does with the audio panel while it repaints.
 *   Reproduce: connectSystemAudio, focus GMT, watch the fps counter; switch
 *   focus to another window and watch it recover. A fair test uses the
 *   mic path with a virtual audio device as the control: same analysis,
 *   no screen-share surface. If the control holds 60, the surface is it.
 *   Open the app with `?perf` first (engine-gmt/renderer/perfProbe.ts): it
 *   prints one line per second with the main-thread rAF rate, long tasks,
 *   ticks dispatched, frames delivered and hover picks, so the reading says
 *   WHICH half dropped — the main thread (raf 30) or the worker (raf 60,
 *   frames 30) — and whether the pointer was over the canvas at the time.
 *   Run the matrix: audio none / mic / system × focused / unfocused ×
 *   pointer over / off the canvas, `window.__perfProbe.copy()` after each.
 * @assumption System-audio capture COSTS GPU and cannot be made not to. The
 *   spec requires a video surface — audio-only `getDisplayMedia` is still an
 *   unimplemented request as of 2026 — so Chrome starts a screen-capture
 *   session, and stopping the video track does not fully tear it down while
 *   the audio track is live. `connectSystemAudio` asks for 1fps to keep that
 *   as cheap as it can be, but the honest answer for a performance rig is to
 *   route audio into a VIRTUAL INPUT DEVICE (VB-Cable / VoiceMeeter /
 *   BlackHole) or a hardware line-in and use `connectMicrophone` instead:
 *   same code path, no video surface, no GPU.
 * @assumption Live capture requests `echoCancellation`, `noiseSuppression` and
 *   `autoGainControl` explicitly OFF. Chrome/Edge default all three ON for
 *   `getUserMedia({audio: true})`; on a line feed from a mixer they duck the
 *   signal, notch the spectrum and pump the levels, which is indistinguishable
 *   from "the audio modulation is broken". Never fall back to a bare
 *   `{audio: true}`.
 * @assumption `inputGain` sits between the live source and `analysisBus` — NOT
 *   on `masterGain`. masterGain feeds `destination`, so boosting a quiet
 *   line-in there would also boost monitoring volume; and the mic deliberately
 *   bypasses masterGain, so it had no gain stage at all before this node.
 * @assumption `getTrackInfo().duration` returns 0 (NOT 1) when metadata has not
 *   yet loaded. The `|| 1` fallback used to lock AudioStrip clips to 1-second
 *   slices; do not reintroduce it.
 *
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */

class Deck {
    public element: HTMLAudioElement;
    public sourceNode: MediaElementAudioSourceNode | null = null;
    public gainNode: GainNode | null = null;
    public fileUrl: string | null = null;
    public fileName: string | null = null;
    public isActive: boolean = false;

    constructor(_ctx: AudioContext) {
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
    setVolume(v: number) { if (this.gainNode) this.gainNode.gain.value = v; }

    get duration() { return this.element.duration || 0; }
    get currentTime() { return this.element.currentTime || 0; }
}

export class AudioTransport {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    /** Live-capture trim, analysis-side only. @see the class @invariant. */
    private inputGain: GainNode | null = null;
    /** The one tap point. @see the class @invariant. */
    private _analysisBus: GainNode | null = null;

    private micSource: MediaStreamAudioSourceNode | null = null;
    private micStream: MediaStream | null = null;
    private decks: [Deck | null, Deck | null] = [null, null];

    public isMicActive: boolean = false;
    public crossfade: number = 0.5; // 0.0 = A, 1.0 = B
    /** Which live input is running, for the panel's readout. */
    public inputKind: 'none' | 'mic' | 'system' = 'none';
    /** `deviceId` of the running capture device, so the picker can show it
     *  selected and a reconnect can target the same hardware. */
    public inputDeviceId: string | null = null;
    public inputDeviceLabel: string | null = null;

    /** Called once, at the end of `init()`, with the live context and the tap
     *  node. The analysis half attaches here rather than reaching in — which
     *  is what keeps this class free of any FFT knowledge. */
    constructor(private onGraphReady?: (ctx: AudioContext, tap: AudioNode) => void) {}

    public get context(): AudioContext | null { return this.audioContext; }
    public get analysisBus(): AudioNode | null { return this._analysisBus; }
    public get sampleRate(): number { return this.audioContext?.sampleRate ?? 48000; }

    /** Constraints for every live capture. The three processors are OFF by
     *  contract — see the class @invariant. `channelCount: 1` because analysis
     *  sums to mono anyway and asking for 1 avoids a needless downmix on
     *  multi-channel interfaces. */
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

        // The single tap. Unity gain — see the class @invariant.
        this._analysisBus = this.audioContext.createGain();
        this._analysisBus.gain.value = 1.0;

        // Live-capture trim → bus. Decks reach the bus via masterGain (which
        // also feeds destination); live sources route through here instead so a
        // quiet line-in can be boosted without raising monitoring.
        this.inputGain = this.audioContext.createGain();
        this.inputGain.gain.value = 1.0;
        this.inputGain.connect(this._analysisBus);
        this.masterGain.connect(this._analysisBus);

        this.decks[0] = new Deck(this.audioContext);
        this.decks[1] = new Deck(this.audioContext);
        this.setCrossfade(0.5);

        this.onGraphReady?.(this.audioContext, this._analysisBus);
    }

    // ── Live capture ────────────────────────────────────────────────────────

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
            // Mic → inputGain → analysisBus. NOT to destination: monitoring a
            // room mic through the same speakers it hears is a feedback loop.
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
                // Video is MANDATORY and cannot be avoided — audio-only
                // getDisplayMedia is still an unimplemented spec request as of
                // 2026, so every browser rejects `video: false` here. We want
                // none of the frames, so ask for the cheapest stream that will
                // be granted and stop the track the moment it exists.
                //
                // @assumption Cap the FRAME RATE, not the resolution. Constraining
                //   width/height makes the compositor downscale every frame,
                //   which costs MORE GPU than leaving it native — the opposite
                //   of the intent. 1fps is the lever that actually helps.
                video: { frameRate: { max: 1 } },
                // Same processor-off contract as the mic path: a shared tab's
                // music must reach the analysis unprocessed.
                audio: this.captureConstraints(),
                // Offer audio alongside whole screens too, not just tabs — a
                // DJ app is usually not the browser. Chrome also offers the
                // system-audio checkbox for a WINDOW share, so the user can
                // pick a small window as the surface and keep the composite
                // cheap while still getting full system audio.
                systemAudio: 'include',
                monitorTypeSurfaces: 'include',
                // Hide GMT's own tab from the picker: capturing the tab you are
                // running in is never what you want here, and it invites a
                // render-feedback loop.
                selfBrowserSurface: 'exclude',
                // No mid-capture "switch surface" bar; the source is chosen once.
                surfaceSwitching: 'exclude',
            } as DisplayMediaStreamOptions);
            // Stop the video immediately — we only ever wanted the audio track.
            // Chrome keeps the capture SESSION alive for audio, so some
            // compositing cost may remain; a virtual audio device routed through
            // the mic path avoids it entirely. @see the class @invariant.
            stream.getVideoTracks().forEach(track => track.stop());

            if (stream.getAudioTracks().length === 0) {
                stream.getTracks().forEach(t => t.stop());
                console.warn('AudioEngine: share dialog returned no audio track — "Share system audio" was left unchecked');
                return false;
            }

            this.releaseLiveInput();
            this.micStream = stream;
            this.micSource = this.audioContext.createMediaStreamSource(stream);
            this.micSource.connect(this.inputGain!);               // Visualize
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

    /** Live-capture trim (analysis-side only — never affects monitoring). */
    public setInputGain(val: number) {
        if (this.inputGain && this.audioContext) {
            this.inputGain.gain.setTargetAtTime(val, this.audioContext.currentTime, 0.05);
        }
    }

    // ── Decks ───────────────────────────────────────────────────────────────

    public loadTrack(deckIndex: 0 | 1, file: File) {
        this.init();
        if (!this.audioContext || !this.masterGain) return;

        // Disable live input — a deck and a mic on the same bus would sum.
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
}
