/**
 * WaveformPreview — small canvas that draws an LFO's waveform shape
 * as a 5-second window. Used by LfoList rows. Pure: renders only
 * from its own props, no store reads.
 *
 * Shows shape only — amplitude scaling is intentionally NOT applied,
 * since the actual output range is determined by the LFO's min/max
 * strength sliders (which work relative to baseValue). The preview's
 * job is "what kind of signal is this", not "how big is it".
 *
 * Shape vocab (Sine / Triangle / Sawtooth / Pulse / Noise) matches
 * LfoShape in types/animation.ts. Noise uses three-stdlib's
 * ImprovedNoise (Perlin) sampled at time/period — same generator
 * class as ModulationEngine, with a per-mount seed offset so two
 * open Noise rows don't trace the same curve.
 */

import React, { useRef, useEffect } from 'react';
import { ImprovedNoise } from 'three-stdlib';

// Shared with ModulationEngine semantics (same Perlin generator class).
// Per-preview seed offset means two open LfoList rows showing 'Noise'
// don't trace the identical curve, matching the engine's per-LFO seed
// offset behaviour.
const previewNoise = new ImprovedNoise();

export interface WaveformPreviewProps {
    shape: string;
    period: number;
    phase: number;
    enabled: boolean;
}

export const WaveformPreview: React.FC<WaveformPreviewProps> = ({ shape, period, phase, enabled }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Stable seed per mounted preview so a re-render doesn't re-randomise
    // the noise curve. New mount → new seed.
    const seedRef = useRef<number>(Math.random() * 1000);

    // Re-runs whenever the visible-shape props change. `amplitude`
    // is intentionally NOT in the dep list — preview shows shape only.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
        ctx.stroke();

        if (!enabled) return;

        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const samples = 120;
        const windowSecs = 5.0;

        for (let i = 0; i <= samples; i++) {
            const x = (i / samples);
            const elapsedSec = x * windowSecs;
            const t = ((elapsedSec / period) + phase) % 1.0;
            let val = 0;

            if (shape === 'Sine') val = Math.sin(t * Math.PI * 2);
            else if (shape === 'Triangle') val = 1.0 - Math.abs((t * 2.0) - 1.0) * 2.0;
            else if (shape === 'Sawtooth') val = t * 2.0 - 1.0;
            else if (shape === 'Pulse') val = t < 0.5 ? 1.0 : -1.0;
            else if (shape === 'Noise') {
                // Match ModulationEngine: sample Perlin at time/period,
                // not the wrapped phase t. Larger period → smoother curve.
                const sampleT = (elapsedSec / Math.max(0.001, period)) + seedRef.current;
                val = previewNoise.noise(sampleT, 0, 0);
            }

            // Render the WAVEFORM SHAPE only (full range). Output
            // amplitude is determined by the LFO's min/max strength
            // sliders below; the preview's job is to show what kind of
            // signal you're getting, not its absolute scale.
            const py = h / 2 - (val * (h / 4));
            if (i === 0) ctx.moveTo(x * w, py);
            else ctx.lineTo(x * w, py);
        }
        ctx.stroke();
    }, [shape, period, phase, enabled]);

    return (
        <div className="relative h-12 bg-black/40 rounded border border-white/5 mb-3 overflow-hidden">
            <canvas ref={canvasRef} width={280} height={48} className="w-full h-full" />
            <div className="absolute top-1 left-2 text-[7px] font-bold text-purple-400/50 pointer-events-none">Signal (5 second window)</div>
        </div>
    );
};
