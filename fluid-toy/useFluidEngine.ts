/**
 * useFluidEngine — lifecycle hook that owns the FluidEngine instance,
 * its RAF loop, and the per-frame brush tick.
 *
 * Encapsulates: engine boot inside a try/catch, registering the
 * appEngine handle, advancing the brush runtime each frame, calling
 * engine.frame(), hotkey registration, and full teardown on unmount.
 *
 * Returns `engineRef` so the surrounding app can pass it to
 * FluidPointerLayer (which needs to call engine.brush() / .resetFluid()
 * on user input).
 */

import { useEffect, useRef } from 'react';
import { FluidEngine } from './fluid/FluidEngine';
import { viewport } from '../engine/plugins/Viewport';
import { appEngine, brushHandles, cursorHandles } from './engineHandles';
import { stepBrush } from './brush';
import { readBrushParams } from './brush/readParams';
import { registerFluidToyHotkeys } from './hotkeys';

export const useFluidEngine = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
): React.RefObject<FluidEngine | null> => {
    const engineRef = useRef<FluidEngine | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            const engine = new FluidEngine(canvas, {
                onFrameEnd: () => viewport.frameTick(),
            });
            engineRef.current = engine;
            appEngine.ref.current = engine;

            // BEFORE the engine frame we step the brush runtime: advances
            // the rainbow hue phase, spawns/steps particles, and paints
            // each one as a tiny splat via engine.brush(). Particles sit
            // in brushHandles.ref.current.runtime so FluidPointerLayer
            // (per-move emitter) and this per-frame step share one
            // instance.
            let prevT = -1;
            const loop = (t: number) => {
                const dtSec = prevT < 0 ? 0 : Math.min(0.1, (t - prevT) / 1000);
                prevT = t;
                if (engineRef.current) {
                    const cursor = cursorHandles.ref.current;
                    stepBrush(brushHandles.ref.current.runtime, {
                        dtSec,
                        wallClockMs: t,
                        dragging: cursor.dragging,
                        cursorUv: cursor.uv,
                        cursorVelUv: cursor.velUv,
                        params: readBrushParams(),
                        engine: engineRef.current,
                    });
                    engineRef.current.frame(t);
                }
                rafRef.current = requestAnimationFrame(loop);
            };
            rafRef.current = requestAnimationFrame(loop);
        } catch (e) {
            console.error('[FluidToy] failed to start engine:', e);
        }

        // Register hotkeys now that engineRef is live (R needs
        // engine.resetFluid).
        registerFluidToyHotkeys(engineRef);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            engineRef.current?.dispose();
            engineRef.current = null;
            appEngine.ref.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return engineRef;
};
