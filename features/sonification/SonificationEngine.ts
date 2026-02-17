
class SonificationEngine {
    private ctx: AudioContext | null = null;
    private masterGainNode: GainNode | null = null;
    private oscillators: OscillatorNode[] = [];
    private gains: GainNode[] = [];
    
    // Ratios: 1 (Fundamental), 19/9 (approx 2.11), 15/9 (approx 1.66)
    // Matches FHBT harmonic theory
    private harmonicRatios = [1.0, 19.0/9.0, 15.0/9.0];
    
    // Scheduler state
    private nextNoteTime: number = 0;
    private patternIndex: number = 0;
    
    public isInitialized = false;

    public init() {
        if (this.ctx) return;
        
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
        this.masterGainNode = this.ctx.createGain();
        this.masterGainNode.gain.value = 0.0;
        this.masterGainNode.connect(this.ctx.destination);

        // Create 3 Voices (Arms)
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            // Fundamental is Sine (Pure), Harmonics are Triangle (Rich)
            osc.type = i === 0 ? 'sine' : 'triangle'; 
            osc.frequency.value = 100;
            
            // Set initial gain to 0 (Silence until pattern triggers)
            gain.gain.value = 0;
            
            osc.connect(gain);
            gain.connect(this.masterGainNode);
            osc.start();
            
            this.oscillators.push(osc);
            this.gains.push(gain);
        }
        
        this.isInitialized = true;
        this.nextNoteTime = this.ctx.currentTime;
    }

    public resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public setMasterGain(val: number) {
        if (this.masterGainNode) {
            this.masterGainNode.gain.setTargetAtTime(val, this.ctx!.currentTime, 0.1);
        }
    }

    public update(D: number, baseFreq: number, patterns: number[][]) {
        if (!this.ctx || !this.isInitialized) return;

        const now = this.ctx.currentTime;
        
        // 1. UPDATE PITCH (The Dimension)
        // D scales the frequency. 
        // Safety clamp to prevent ear-piercing freqs if D explodes > 10
        const safeD = Math.max(0.1, Math.min(10.0, D));
        
        this.oscillators.forEach((osc, i) => {
            const ratio = this.harmonicRatios[i];
            const targetFreq = Math.min(12000, baseFreq * safeD * ratio);
            osc.frequency.setTargetAtTime(targetFreq, now, 0.1);
        });

        // 2. UPDATE RHYTHM (The Holographic Data Stream)
        // Schedule grains of sound based on the pattern array
        
        const stepDuration = 0.05; // 50ms per grain = 20hz data rate
        const lookahead = 0.1; // Schedule 100ms ahead
        
        // Reset scheduler if we fell too far behind (e.g. tab backgrounded)
        if (this.nextNoteTime < now) this.nextNoteTime = now;
        
        while (this.nextNoteTime < now + lookahead) {
            
            patterns.forEach((pattern, i) => {
                // Wrap index
                const val = pattern[this.patternIndex % pattern.length];
                const gainNode = this.gains[i];
                
                // Determine target volume for this grain
                // Filled point = Sound. Empty point = Silence.
                // Fundamental (Arm 0) is louder. Harmonics (Arms 1,2) are quieter.
                const activeVol = i === 0 ? 0.8 : 0.4;
                const targetGain = val === 1 ? activeVol : 0.0;
                
                // Schedule abrupt change for digital "data stream" feel
                gainNode.gain.setValueAtTime(targetGain, this.nextNoteTime);
                
                // If it's a hit (1), decay slightly to create a "pluck" or "blip" texture
                if (val === 1) {
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.nextNoteTime + stepDuration);
                }
            });
            
            this.nextNoteTime += stepDuration;
            this.patternIndex++;
        }
    }

    public stop() {
        if (this.masterGainNode) {
            this.masterGainNode.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.1);
        }
    }
}

export const sonificationEngine = new SonificationEngine();
