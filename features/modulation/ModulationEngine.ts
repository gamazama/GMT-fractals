
import { ModulationRule } from './index';
import { audioAnalysisEngine } from '../audioMod/AudioAnalysisEngine';
import { AnimationParams } from '../../types';

class ModulationEngine {
    // Persistent state for envelope following (smooth transitions)
    private ruleValues: Record<string, number> = {};
    private lfoValues: Record<string, number> = {};
    private lfoStates: Record<string, number> = {}; // Tracks internal LFO state (like noise seed)
    
    // Secondary smoothing state (Post-Envelope)
    private outputValues: Record<string, number> = {};
    
    // Legacy support for smoothing LFOs
    private lfoPrevOffsets: Record<string, number> = {}; 

    // Output buffer
    public offsets: Record<string, number> = {};

    public getRuleValue(id: string): number {
        return this.ruleValues[id] || 0;
    }
    
    public updateOscillators(animations: AnimationParams[], time: number, delta: number) {
        for (let i = 0; i < animations.length; i++) {
            const anim = animations[i];
            if (!anim.enabled) continue;
            
            const t = ((time / anim.period) + anim.phase) % 1.0;
            let rawWave = 0;

            switch(anim.shape) {
                case 'Sine': rawWave = Math.sin(t * Math.PI * 2); break;
                case 'Triangle': rawWave = 1.0 - Math.abs((t * 2.0) - 1.0) * 2.0; break;
                case 'Sawtooth': rawWave = t * 2.0 - 1.0; break;
                case 'Pulse': rawWave = t < 0.5 ? 1.0 : -1.0; break;
                case 'Noise': 
                    const nKey = anim.id;
                    if (!this.lfoStates[nKey]) this.lfoStates[nKey] = Math.random();
                    this.lfoStates[nKey] += delta * 5;
                    rawWave = Math.sin(this.lfoStates[nKey]) * Math.cos(this.lfoStates[nKey] * 0.73); 
                    break;
            }
            
            // Register normalized value (0..1) for Modulation Rules
            const normalizedLfo = rawWave * 0.5 + 0.5;
            this.lfoValues[`lfo-${i+1}`] = normalizedLfo;

            // Legacy Direct Application Logic (with Smoothing)
            const targetOffset = rawWave * anim.amplitude;
            const prevVal = this.lfoPrevOffsets[anim.id] ?? targetOffset;
            
            let smoothOffset = targetOffset;
            if (anim.smoothing > 0.001) {
                const decay = 50.0 * Math.pow(1.0 - anim.smoothing, 2.0) + 0.1;
                const f = 1.0 - Math.exp(-decay * delta);
                smoothOffset = prevVal + (targetOffset - prevVal) * f;
            }
            this.lfoPrevOffsets[anim.id] = smoothOffset;
            
            // Inject directly into offsets buffer for legacy binding
            // Note: This accumulates if multiple things target the same param
            this.offsets[anim.target] = (this.offsets[anim.target] || 0) + smoothOffset;
        }
    }

    public update(rules: ModulationRule[], delta: number) {
        // Note: offsets buffer is cleared by AnimationSystem before calling this.
        
        const audioData = audioAnalysisEngine.getRawData();

        for (const rule of rules) {
            if (!rule.enabled) continue;

            let signal = 0;

            // 1. Get Source Signal
            if (rule.source === 'audio') {
                if (audioData) {
                    signal = this.processAudioSignal(rule, audioData);
                }
            } else if (rule.source.startsWith('lfo-')) {
                signal = this.lfoValues[rule.source] || 0;
            }

            // 2. Apply Envelope (Attack/Decay)
            const prevVal = this.ruleValues[rule.id] || 0;
            let envelope = prevVal;

            if (signal > prevVal) {
                // Rising (Attack)
                const coeff = 1.0 - Math.pow(rule.attack, 0.2); 
                envelope = prevVal + (signal - prevVal) * coeff;
            } else {
                // Falling (Decay)
                const coeff = 1.0 - Math.pow(rule.decay, 0.2);
                envelope = prevVal + (signal - prevVal) * coeff;
            }
            
            this.ruleValues[rule.id] = envelope;
            
            // 3. Apply Secondary Smoothing (Lerp)
            // This smooths the "steps" from the envelope follower or FFT jitter
            let finalSignal = envelope;
            if (rule.smoothing && rule.smoothing > 0.001) {
                const prevOut = this.outputValues[rule.id] || 0;
                // t approaches 0 as smoothing approaches 1.0
                const t = 1.0 - Math.pow(rule.smoothing, 0.5); 
                finalSignal = prevOut + (envelope - prevOut) * t;
            }
            this.outputValues[rule.id] = finalSignal;

            // 4. Map to Output Offset
            const finalOffset = (finalSignal * rule.gain) + rule.offset;
            
            // Accumulate
            this.offsets[rule.target] = (this.offsets[rule.target] || 0) + finalOffset;
        }
    }
    
    public resetOffsets() {
        this.offsets = {};
    }

    private processAudioSignal(rule: ModulationRule, data: Uint8Array): number {
        const binCount = data.length;
        const startBin = Math.floor(rule.freqStart * binCount);
        const endBin = Math.floor(rule.freqEnd * binCount);
        
        if (startBin >= binCount || endBin <= startBin) return 0;

        let sum = 0;
        let count = 0;

        for(let i = startBin; i < endBin; i++) {
            sum += data[i];
            count++;
        }

        if (count === 0) return 0;

        const rawAvg = (sum / count) / 255.0;

        if (rawAvg < rule.thresholdMin) return 0;
        
        const range = Math.max(0.001, rule.thresholdMax - rule.thresholdMin);
        const gated = (rawAvg - rule.thresholdMin) / range;
        
        return Math.min(1.0, gated);
    }
}

export const modulationEngine = new ModulationEngine();
