
import { ModulationRule } from '../modulation/index';

class Deck {
    public element: HTMLAudioElement;
    public sourceNode: MediaElementAudioSourceNode | null = null;
    public gainNode: GainNode | null = null;
    public fileUrl: string | null = null;
    public fileName: string | null = null;

    constructor(ctx: AudioContext) {
        this.element = new Audio();
        this.element.loop = true;
        this.element.crossOrigin = "anonymous";
        // Create nodes but don't connect yet
    }

    load(file: File, ctx: AudioContext, dest: AudioNode) {
        if (this.fileUrl) URL.revokeObjectURL(this.fileUrl);
        this.fileUrl = URL.createObjectURL(file);
        this.fileName = file.name;
        this.element.src = this.fileUrl;
        
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
    private decks: [Deck | null, Deck | null] = [null, null];
    private masterGain: GainNode | null = null;

    private dataArray: Uint8Array | null = null;
    
    // State
    public isMicActive: boolean = false;
    public crossfade: number = 0.5; // 0.0 = A, 1.0 = B

    public init() {
        if (this.audioContext) return;
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048; 
        this.analyser.smoothingTimeConstant = 0.8; // Default smoothing
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
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

    public async connectMicrophone() {
        this.init();
        if (!this.audioContext || !this.masterGain) return;
        
        // Stop Decks
        this.decks.forEach(d => d?.pause());

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            if (this.micSource) this.micSource.disconnect();
            
            this.micSource = this.audioContext.createMediaStreamSource(stream);
            // Mic goes directly to analyzer, bypassing master gain (avoid feedback loop if speakers on)
            // Or connect to masterGain but mute local output? 
            // Better: Mic -> Analyser. NOT to Destination.
            this.micSource.connect(this.analyser!);
            
            this.isMicActive = true;
            if (this.audioContext.state === 'suspended') this.audioContext.resume();
        } catch (e) {
            console.error("AudioEngine: Mic access denied", e);
            alert("Microphone access denied.");
        }
    }

    public async connectSystemAudio() {
        // Similar to Mic, but typically want to hear it too.
        this.init();
        if (!this.audioContext) return;
        try {
            // @ts-ignore
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            stream.getVideoTracks().forEach(track => track.stop());
            
            if (stream.getAudioTracks().length === 0) return;

            if (this.micSource) this.micSource.disconnect();
            this.micSource = this.audioContext.createMediaStreamSource(stream);
            this.micSource.connect(this.analyser!); // Visualize
            this.micSource.connect(this.audioContext.destination); // Listen
            
            this.isMicActive = true;
            if (this.audioContext.state === 'suspended') this.audioContext.resume();
        } catch (e) {}
    }
    
    public loadTrack(deckIndex: 0 | 1, file: File) {
        this.init();
        if (!this.audioContext || !this.masterGain) return;
        
        // Disable Mic
        if (this.micSource) {
            this.micSource.disconnect();
            this.micSource = null;
            this.isMicActive = false;
        }

        this.decks[deckIndex]?.load(file, this.audioContext, this.masterGain);
        this.setCrossfade(this.crossfade); // Re-apply volume
        
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
    }
    
    public play(deckIndex: 0 | 1) { this.decks[deckIndex]?.play(); }
    public pause(deckIndex: 0 | 1) { this.decks[deckIndex]?.pause(); }
    public stop(deckIndex: 0 | 1) { this.decks[deckIndex]?.stop(); }
    public seek(deckIndex: 0 | 1, time: number) { this.decks[deckIndex]?.seek(time); }
    
    public getTrackInfo(deckIndex: 0 | 1) {
        const d = this.decks[deckIndex];
        return {
            duration: d?.duration || 1,
            currentTime: d?.currentTime || 0,
            hasTrack: !!d?.sourceNode,
            fileName: d?.fileName || null
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
    
    public update() {
        if (!this.analyser || !this.dataArray) return;
        this.analyser.getByteFrequencyData(this.dataArray);
    }

    public getRawData() {
        return this.dataArray;
    }
}

export const audioAnalysisEngine = new AudioAnalysisEngine();
