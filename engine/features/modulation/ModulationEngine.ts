/**
 * ModulationEngine — LFO + rule-driven signal pipeline.
 *
 * @invariant LFO master switch (`lfosEnabled === false`) gates BOTH writes
 *   AND reads. `updateOscillators` returns early at line ~35 (no
 *   `lfoValues` refresh); the rule-side gate inside `update()` must also
 *   skip LFO-sourced rules, or they read stale cached `lfoValues` and
 *   hang at their final modulated value.
 * @invariant LFO phase is unit-period (0..1), NOT radians. See line ~40:
 *   `((time / period) + phase) % 1`. Noise samples at `time / period`
 *   (no phase added). Larger `period` = slower wiggle.
 * @invariant `offsets` buffer is APPENDED to inside `update()`, never
 *   cleared. Caller (AnimationSystem live path, `applyModulationsAt`
 *   export path) MUST call `resetOffsets()` before `update()`, or rules
 *   accumulate across frames.
 * @invariant Two rules targeting the same param ACCUMULATE into
 *   `offsets[target]`; `gain * signal + offset` is added to whatever
 *   was there.
 */
import { ModulationRule } from './index';
import { audioAnalysisEngine } from '../audioMod/AudioAnalysisEngine';
import { AnimationParams } from '../../../types';
import { ImprovedNoise } from 'three-stdlib';

// Single shared Perlin generator. Different LFOs avoid syncing because
// each gets its own seed offset (see lfoStates below).
const noiseGen = new ImprovedNoise();

/** Vec-axis suffixes in the DDFS target convention (`vec3A_x`). */
const AXES = ['x', 'y', 'z', 'w'] as const;

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

    /**
     * Offset currently applied to a DDFS target (`<featureId>.<paramKey>`, or
     * `..._x/_y/_z/_w` for a vec axis). 0 when the target is not modulated.
     *
     * Reads the buffer from the LAST tick — that is deliberate. The consumer is
     * the DDFS auto-setter, which runs on pointermove between ticks and needs
     * "is this param modulated right now", not a value recomputed mid-drag.
     */
    public getOffset(target: string): number {
        return this.offsets[target] ?? 0;
    }

    /**
     * Is any modulation currently driving this param — the scalar itself or any
     * vec axis of it?
     *
     * @invariant This is the guard against the DOUBLE-WRITER flicker. Both the
     *   DDFS auto-setter (on slider move) and AnimationSystem's tick (once per
     *   frame) write the same uniform. The setter wrote the RAW base while the
     *   tick wrote base+offset, so during a drag the uniform alternated between
     *   the two — a visible flicker at roughly half the frame rate. The setter
     *   must compose the offset in rather than emitting the bare base.
     */
    public hasOffsetFor(featureId: string, paramKey: string): boolean {
        const base = `${featureId}.${paramKey}`;
        if (base in this.offsets) return true;
        for (const a of AXES) if (`${base}_${a}` in this.offsets) return true;
        return false;
    }
    
    public updateOscillators(animations: AnimationParams[], time: number, delta: number, lfosEnabled: boolean = true) {
        // Global LFO master switch. When off, no LFO contributes to
        // offsets AND no lfoValues are refreshed — so audio rules that
        // happen to be sourced from an LFO see a stale value rather
        // than a free-running oscillator.
        if (!lfosEnabled) return;
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
                case 'Noise': {
                    // Perlin-noise LFO. Each LFO gets a stable per-id
                    // seed offset so two noise LFOs at the same period
                    // don't trace the same curve. Sampling at
                    // `time / period` makes the period knob meaningful:
                    // larger period = slower, smoother wiggle (the
                    // characteristic timescale of the noise).
                    const nKey = anim.id;
                    if (this.lfoStates[nKey] === undefined) {
                        this.lfoStates[nKey] = Math.random() * 1000;
                    }
                    const sampleT = (time / Math.max(0.001, anim.period)) + this.lfoStates[nKey];
                    rawWave = noiseGen.noise(sampleT, 0, 0);
                    break;
                }
            }

            // Register normalized value (0..1) for Modulation Rules
            const normalizedLfo = rawWave * 0.5 + 0.5;
            this.lfoValues[`lfo-${i+1}`] = normalizedLfo;

            // Map waveform → offset relative to baseValue.
            // AnimationSystem composes the final value as base + offset.
            //
            // New (min/max as RELATIVE strengths, with min/max usually
            // straddling 0 to swing both sides of base):
            //   offset = lerp(min, max, (rawWave + 1) / 2)
            //          = mid + halfRange * rawWave   where mid = (min+max)/2,
            //                                              halfRange = (max-min)/2
            //   so rawWave=−1 → baseValue + min, rawWave=+1 → baseValue + max.
            //
            // Legacy fallback (preserves old preset behaviour on load):
            //   offset = amplitude * rawWave    (symmetric ± amplitude)
            let targetOffset: number;
            if (typeof anim.min === 'number' && typeof anim.max === 'number') {
                const mid = (anim.min + anim.max) * 0.5;
                const halfRange = (anim.max - anim.min) * 0.5;
                targetOffset = mid + halfRange * rawWave;
            } else {
                targetOffset = rawWave * anim.amplitude;
            }
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

    public update(rules: ModulationRule[], delta: number, audioEnabled: boolean = true, lfosEnabled: boolean = true) {
        // Note: offsets buffer is cleared by AnimationSystem before calling this.

        const audioData = audioAnalysisEngine.getRawData();

        for (const rule of rules) {
            if (!rule.enabled) continue;
            // Without the global-source gates the rule reads the last
            // cached signal (stale FFT buffer / frozen lfoValues) and
            // the param hangs at its final modulated value instead of
            // returning to base.
            if (rule.source === 'audio' && !audioEnabled) continue;
            if (rule.source.startsWith('lfo-') && !lfosEnabled) continue;

            let signal = 0;

            // 1. Get Source Signal
            if (rule.source === 'audio') {
                if (audioData) {
                    signal = this.processAudioSignal(rule, audioData, delta);
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

    // ── Uniform ownership ───────────────────────────────────────────────────
    /** Uniform NAMES the modulation tick wrote this frame. */
    private ownedUniforms: string[] = [];
    /** Join of the above, so consumers can detect set changes without
     *  re-comparing arrays every frame. */
    private ownedKey = '';

    /**
     * Record which uniforms live modulation is currently driving.
     *
     * @invariant These uniforms have TWO writers — this engine (every frame,
     *   base+offset) and the worker's `syncConfigUniforms`, which rewrites every
     *   uniform-backed param from the RAW BASE config whenever any config
     *   update lands. A slider drag emits a config update per pointermove, so
     *   without a skip list the base write lands between ticks and the value
     *   alternates — the modulated-slider flicker. The worker consults this list
     *   and leaves these uniforms to the tick.
     *
     * Returns true when the SET changed, so the caller can avoid rebuilding the
     * transport array on every frame.
     */
    public setOwnedUniforms(names: Set<string>): boolean {
        const key = Array.from(names).sort().join('|');
        if (key === this.ownedKey) return false;
        this.ownedKey = key;
        this.ownedUniforms = Array.from(names);
        return true;
    }

    public getOwnedUniforms(): string[] {
        return this.ownedUniforms;
    }

    /** Previous frame's band average per rule — the reference for the flux
     *  measurement in `transient` mode. */
    private prevBandLevel: Record<string, number> = {};

    /** Flux (units per second) that maps to a full-scale transient signal.
     *  A kick attack moves a narrow band by roughly 0.3 in one 60 fps frame,
     *  i.e. ~18/s; 20 puts that near the top of the range while leaving room
     *  for a harder hit. Users trim from there with the rule's Gain knob. */
    private static readonly TRANSIENT_FULL_SCALE = 20;

    private processAudioSignal(rule: ModulationRule, data: Uint8Array, delta: number): number {
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

        // AGC multiplies the band average, so a quieter track drives the same
        // range without the user re-dialling every threshold. 1 when off.
        const level = Math.min(1, ((sum / count) / 255.0) * audioAnalysisEngine.getSignalGain());

        let raw: number;
        if (rule.mode === 'transient') {
            // Positive spectral flux — the standard onset measure. Rate per
            // SECOND, not per frame, so the response doesn't change with frame
            // rate (a 30 fps preview and a 60 fps one trigger identically).
            const prev = this.prevBandLevel[rule.id];
            this.prevBandLevel[rule.id] = level;
            if (prev === undefined) return 0;   // first frame has no reference
            const dt = Math.max(1e-4, delta);
            const rate = Math.max(0, level - prev) / dt;
            raw = Math.min(1, rate / ModulationEngine.TRANSIENT_FULL_SCALE);
        } else {
            // Keep the reference fresh even in level mode, so toggling to
            // transient mid-set doesn't fire a spurious spike off a stale value.
            this.prevBandLevel[rule.id] = level;
            raw = level;
        }

        if (raw < rule.thresholdMin) return 0;

        const range = Math.max(0.001, rule.thresholdMax - rule.thresholdMin);
        const gated = (raw - rule.thresholdMin) / range;

        return Math.min(1.0, gated);
    }
}

export const modulationEngine = new ModulationEngine();
