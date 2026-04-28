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
import { useEngineStore } from '../store/engineStore';
import { useAnimationStore } from '../store/animationStore';
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
            // TSAA accumulation reporter — pushes engine.tsaaSampleIndex
            // into the store's `accumulationCount` so the topbar Pause
            // popover reads "<count>/<sampleCap>" correctly. Throttled
            // to ~10 Hz to avoid one store mutation per frame.
            let lastReportT = 0;
            let lastReportedCount = -1;
            // Track isPlaying transitions so deterministic playback can wipe
            // the dye + accumulator on the first frame of a play-from-start.
            // Without this the preview opens on whatever crud the live sim
            // had on the canvas; with it, "play" gives a clean baseline that
            // matches a fresh export from frame 0.
            let prevIsPlaying = false;
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
                    // Deterministic-playback path: when the user toggled
                    // "Deterministic playback" in the timeline menu and the
                    // timeline is playing, drive the engine clock from the
                    // current timeline frame instead of wall-clock t. The
                    // engine computes its own dt from successive timeMs, so
                    // a steady `currentFrame * 1000/fps` makes sim dt =
                    // exactly 1/fps — matches what the video exporter feeds
                    // it. Live preview reproduces the export, frame-for-frame.
                    const animSt = useAnimationStore.getState();
                    const det = animSt.deterministicPlayback && animSt.isPlaying;
                    // Play-from-start in deterministic mode → reset the fluid
                    // so the preview rolls forward from a known clean state.
                    // Threshold (< 1 frame) catches both Stop→Play and the
                    // "near zero" case where playback wraps via loop.
                    if (det && !prevIsPlaying && animSt.currentFrame < 1) {
                        engineRef.current.resetFluid();
                        engineRef.current.resetAccumulation();
                    }
                    prevIsPlaying = animSt.isPlaying;
                    const engineT = det ? (animSt.currentFrame * 1000 / Math.max(1, animSt.fps)) : t;
                    engineRef.current.frame(engineT);
                    if (t - lastReportT > 100) {
                        const count = engineRef.current.getAccumulationCount();
                        if (count !== lastReportedCount) {
                            useEngineStore.getState().reportAccumulation(count);
                            lastReportedCount = count;
                        }
                        lastReportT = t;
                    }
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
