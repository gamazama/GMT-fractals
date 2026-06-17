/**
 * @engine/render-loop — default RAF driver for the engine.
 *
 * Mounts a requestAnimationFrame loop that calls TickRegistry.runTicks(dt)
 * each frame. Apps with a custom render loop (worker-driven, synthetic-tick,
 * headless test harness) skip this plugin and call runTicks themselves —
 * see docs/01_Architecture.md § render-loop and docs/04_Core_Plugins.md §
 * @engine/render-loop.
 *
 * This is the engine's answer to audit finding F3-equivalent-for-ticks
 * (docs/20_Fragility_Audit.md F4): runTicks had no default caller, so an
 * app that forgot to wire one would get silently broken animations. Now the
 * default caller ships with the engine and TickRegistry itself warns in
 * dev when 3s pass after first registerTick() without any runTicks().
 */

import React, { useEffect, useRef } from 'react';
import { runTicks } from '../TickRegistry';

export interface RenderLoopDriverProps {
    /** Optional pause predicate. When it returns true, runTicks is skipped
     *  for that frame; the RAF loop itself keeps running (so play/pause has
     *  no re-subscription cost). */
    paused?: () => boolean;
}

export const RenderLoopDriver: React.FC<RenderLoopDriverProps> = ({ paused }) => {
    const rafRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const pausedRef = useRef(paused);

    // Keep a ref to the latest paused predicate so the loop doesn't re-subscribe.
    useEffect(() => { pausedRef.current = paused; }, [paused]);

    useEffect(() => {
        const loop = (t: number) => {
            if (lastTimeRef.current === null) lastTimeRef.current = t;
            const dtMs = t - lastTimeRef.current;
            lastTimeRef.current = t;
            // TickRegistry consumers use seconds (R3F useFrame convention).
            const dtSec = dtMs / 1000;

            const pausedNow = pausedRef.current?.();
            if (!pausedNow) runTicks(dtSec);

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return null;
};
