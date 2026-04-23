/**
 * FluidToyApp — engine-native Fluid Toy.
 *
 * 3b: FluidEngine mounted inside <ViewportFrame>. Canvas physical-pixel
 * size is driven by canvasPixelSize (authoritative writer: the frame's
 * ResizeObserver) × qualityFraction (driven by the adaptive loop).
 *
 * No bespoke ResizeObserver. No bespoke adaptive loop. Both live in
 * @engine/viewport. FluidEngine's own internal params are still its
 * defaults — DDFS features arrive in 3c-3e.
 */

import React, { useEffect, useRef } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { ViewportFrame } from '../engine/plugins/viewport/ViewportFrame';
import { viewport, useQualityFraction, useViewportFps } from '../engine/plugins/Viewport';
import { FluidEngine } from './fluid/FluidEngine';

export const FluidToyApp: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<FluidEngine | null>(null);
    const rafRef = useRef<number | null>(null);

    // Authoritative size (written by ViewportFrame's ResizeObserver) ×
    // adaptive quality fraction. FluidEngine.resize() takes CSS pixels
    // (not DPR-multiplied) for its WebGL buffer, matching toy-fluid's
    // original contract. So we divide DPR out and apply quality.
    const canvasPixelSize = useFractalStore((s) => s.canvasPixelSize);
    const quality = useQualityFraction();
    const { fpsSmoothed } = useViewportFps();

    // Boot the engine once.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            const engine = new FluidEngine(canvas, {
                onFrameEnd: () => viewport.frameTick(),
            });
            engineRef.current = engine;

            // RAF loop — engine.frame(timeMs) does the full sim + display pass.
            const loop = (t: number) => {
                engineRef.current?.frame(t);
                rafRef.current = requestAnimationFrame(loop);
            };
            rafRef.current = requestAnimationFrame(loop);
        } catch (e) {
            console.error('[FluidToy] failed to start engine:', e);
        }

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            engineRef.current?.dispose();
            engineRef.current = null;
        };
    }, []);

    // Resize whenever physical pixels or quality fraction change.
    useEffect(() => {
        const engine = engineRef.current;
        const [physW, physH] = canvasPixelSize;
        if (!engine || physW < 1 || physH < 1) return;
        const dpr = window.devicePixelRatio || 1;
        // Scale down physical px by DPR to get CSS-ish logical px, then
        // apply quality. FluidEngine.resize expects logical pixels —
        // matches the original toy-fluid contract.
        const logicalW = Math.max(1, Math.floor((physW / dpr) * quality));
        const logicalH = Math.max(1, Math.floor((physH / dpr) * quality));
        engine.resize(logicalW, logicalH);
    }, [canvasPixelSize, quality]);

    return (
        <div className="fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col">
            <div className="flex-1 flex overflow-hidden relative">
                <ViewportFrame className="flex-1">
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full block"
                    />
                    <div className="absolute top-3 left-3 text-[10px] text-white/60 font-mono pointer-events-none z-10">
                        Fluid Toy · 3b (FluidEngine default render)
                    </div>
                    <div className="absolute bottom-3 left-3 text-[10px] text-white/40 font-mono pointer-events-none z-10">
                        {fpsSmoothed.toFixed(0)} fps · q{(quality * 100).toFixed(0)}%
                    </div>
                </ViewportFrame>
            </div>
        </div>
    );
};
