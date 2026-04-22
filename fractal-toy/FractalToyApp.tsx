/**
 * FractalToyApp — root component.
 *
 * Mounts a WebGL2 canvas and instantiates FractalEngine. For 1b the
 * assembler has no features registered, so the shader falls through to
 * a gradient pattern that proves the GL path. 1c adds the mandelbulb
 * feature, and the same shader becomes a raymarched fractal.
 */

import React, { useEffect, useRef } from 'react';
import { FractalEngine } from './FractalEngine';
import { ShaderBuilder } from '../engine/ShaderBuilder';
import { assembleRayMarchShader } from './shaderAssembler';

export const FractalToyApp: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<FractalEngine | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Size the canvas to its backing element's physical pixels.
        const sizeToParent = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            engineRef.current?.resize(
                Math.max(1, Math.floor(rect.width  * dpr)),
                Math.max(1, Math.floor(rect.height * dpr)),
            );
        };

        try {
            const engine = new FractalEngine(canvas);
            engineRef.current = engine;

            // 1b: assemble a shader with no features registered — the
            // assembler's gradient fallback proves the GL path.
            // 1c wires the feature registry: features inject into this
            // same ShaderBuilder via their inject() hook before assembly.
            const builder = new ShaderBuilder('Main');
            const fragSrc = assembleRayMarchShader(builder);
            engine.setShader(fragSrc);
            sizeToParent();
            engine.start();
        } catch (e) {
            console.error('[FractalToy] failed to start engine:', e);
        }

        const ro = new ResizeObserver(sizeToParent);
        ro.observe(canvas);

        return () => {
            ro.disconnect();
            engineRef.current?.dispose();
            engineRef.current = null;
        };
    }, []);

    return (
        <div className="fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
            <div className="absolute top-3 left-3 text-[10px] text-white/60 font-mono pointer-events-none">
                Fractal Toy — 1b · gradient test (no formula registered yet)
            </div>
        </div>
    );
};
