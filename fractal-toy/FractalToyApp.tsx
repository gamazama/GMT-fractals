/**
 * FractalToyApp — root component.
 *
 * 1c: mounts canvas, iterates the feature registry to let every feature
 * inject into a ShaderBuilder, assembles the raymarching shader, then
 * subscribes to feature state and pushes uniforms to the FractalEngine.
 * For 1c there's only the Mandelbulb feature; camera and lighting are
 * hardcoded in the shader and land as features in 1d / 1e.
 */

import React, { useEffect, useRef } from 'react';
import { FractalEngine } from './FractalEngine';
import { ShaderBuilder } from '../engine/ShaderBuilder';
import { featureRegistry } from '../engine/FeatureSystem';
import { useFractalStore } from '../store/fractalStore';
import { AutoFeaturePanel } from '../components/AutoFeaturePanel';
import { assembleRayMarchShader } from './shaderAssembler';

export const FractalToyApp: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<FractalEngine | null>(null);

    // Subscribe to the Mandelbulb feature slice. Any change re-runs this
    // effect's uniform push block.
    const mandelbulb = useFractalStore((s: any) => s.mandelbulb);

    // Boot the engine once.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

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

            // Let every registered feature inject into the builder, then
            // hand the builder to our raymarching assembler.
            const builder = new ShaderBuilder('Main');
            for (const feat of featureRegistry.getAll()) {
                if (feat.inject) feat.inject(builder, {} as any, 'Main');
            }
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

    // Push feature uniforms whenever feature state changes. The engine
    // caches uniform locations so these setUniform calls are cheap.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !mandelbulb) return;
        engine.setUniformI('uIterations',       mandelbulb.iterations ?? 16);
        engine.setUniformF('uPower',            mandelbulb.power ?? 8.0);
        engine.setUniformF('uPhaseTheta',       mandelbulb.phaseTheta ?? 0.0);
        engine.setUniformF('uPhasePhi',         mandelbulb.phasePhi ?? 0.0);
        engine.setUniformF('uTwist',            mandelbulb.twist ?? 0.0);
        engine.setUniformF('uRadiolariaEnabled', mandelbulb.radiolariaEnabled ? 1.0 : 0.0);
        engine.setUniformF('uRadiolariaLimit',  mandelbulb.radiolariaLimit ?? 0.5);
    }, [mandelbulb]);

    return (
        <div className="fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

            {/* Mandelbulb panel — uses the engine's AutoFeaturePanel
                (rendered from the feature's params metadata). 1f will
                tidy the chrome. */}
            <div className="absolute right-3 top-3 w-72 bg-black/85 border border-white/10 rounded-md p-3 backdrop-blur-sm max-h-[90vh] overflow-y-auto">
                <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-2">Mandelbulb</div>
                <AutoFeaturePanel featureId="mandelbulb" />
            </div>

            <div className="absolute top-3 left-3 text-[10px] text-white/60 font-mono pointer-events-none">
                Fractal Toy — 1c · Mandelbulb (camera + lighting hardcoded)
            </div>
        </div>
    );
};
