/**
 * deep-zoom/diveControl.ts - "dive to this depth", as the shell's one action for it.
 *
 * The host flies the dive (`host.diveTo`, straight ahead until the surface distance is about the
 * target). This file is what the readout's field, a click on the depth scale and, later, a
 * starter card and the tutorial all call, and the small store that says a dive is in flight so
 * the readout can show "Diving · from to target" and a Stop button.
 *
 * PITFALLS
 *   - No target below 1e-77 (the floor) is ever sent.
 *   - THE TOAST SAYS HOW IT ENDED, from the dive's own end (`DzDiveEnd`, host/dive.ts): "Arrived at"
 *     on arrival, otherwise "Stopped at" with the reason in a few words (`END_WORDS`); Stop and
 *     Escape need none. Until 2026-10-17 the host did not say, and "Arrived" was guessed from the
 *     depth: within a decade of the target.
 *   - The depth in the toast is read SETTLED, its unfinished rays asked on (`DZ_LOOK_ASKS`,
 *     `deep-zoom/depthNow.ts`). Read once at landing, the Surface card said "Stopped at 2.11e-5"
 *     where it had arrived at 1.07e-6.
 *   - A dive flies straight along the view, and closes on the nearest of the rays about the view
 *     axis (`aheadOf` in host/moduleHost.ts). The depth read here is the depth the app shows (the
 *     second nearest of the same rays), so "Arrived at" can read a little above the target. With
 *     nothing ahead at all the dive ends at once.
 *   - DIVE AGAIN TO GO ON. The time limit grows with the decades asked (5 s a decade, at least 45 s);
 *     a dive it stops is gone on with by the same target from where the camera is - the readout's
 *     field keeps its number. From a view that grazes the surface a dive closes slowly and can
 *     still end on the limit well short of the target.
 *   - The host can be replaced while a dive is in flight (a context loss): the result is read from
 *     whichever host is mounted when the promise resolves.
 *   - A dive moves the camera inside the host, where the navigation's own bookkeeping does not see
 *     it. The route is told here instead (`diveBegan` in deep-zoom/route.ts): at take-off the
 *     timeline stops and the route lets go of the camera, and on landing the direction flown is
 *     kept as the heading of a keyframe set next (what the route falls back on when the trail
 *     cannot say). The trail itself follows a dive from the navigation tick, frame by frame.
 */
import { create } from 'zustand';
import { getHost } from './host/current';
import type { DzDiveEnd } from './host/DeepZoomHost';
import { diveTimeLimitMs } from './host/dive';
import { showToast } from '../engine/store/toastStore';
import { FLOOR_DEPTH, formatDepth, validDepth } from './components/depthFormat';
import { DZ_LOOK_ASKS, depthNow } from './depthNow';
import { diveBegan } from './route';

export interface DiveInFlight {
    from: number;
    target: number;
}

/** null when no dive is in flight. */
export const useDive = create<{ dive: DiveInFlight | null }>(() => ({ dive: null }));

/** What "Stopped at <depth>" goes on with, by how the dive ended. */
const END_WORDS: Record<Exclude<DzDiveEnd, 'time'>, string> = { arrived: '', stopped: '', key: ': a fly key', nothing: ': nothing ahead' };

/** "45 s", "1.7 min". */
const limitText = (ms: number): string => (ms < 60_000 ? `${Math.round(ms / 1000)} s` : `${(ms / 60_000).toFixed(1).replace(/\.0$/, '')} min`);

/** Fly straight ahead to `target`. Resolves when the dive ends, however it ends. */
export async function diveTo(target: number): Promise<void> {
    const host = getHost();
    if (!host || !(target > 0)) return;
    const to = Math.max(FLOOR_DEPTH, target);
    const from = depthNow(host);
    if (!validDepth(from)) return;
    if (from <= to) {
        showToast(`Already at ${formatDepth(from)}`, 'info');
        return;
    }
    const mine: DiveInFlight = { from, target: to };
    useDive.setState({ dive: mine });
    host.focus();   // the fly keys that end a dive are heard on the picture
    // A dive is the hands' as a fly key is: the timeline stops, the route lets the camera go, and
    // what the dive flew along is the heading of a keyframe set next (deep-zoom/route.ts).
    const landed = diveBegan();
    let end: DzDiveEnd = 'stopped';
    try {
        end = await host.diveTo(to);
    } finally {
        landed();
        if (useDive.getState().dive === mine) useDive.setState({ dive: null });
        const depth = depthNow(getHost(), DZ_LOOK_ASKS);
        const why = end === 'time' ? `: the time limit (${limitText(diveTimeLimitMs(from, to))}). Dive again to go on` : END_WORDS[end];
        if (validDepth(depth)) showToast(`${end === 'arrived' ? 'Arrived at' : 'Stopped at'} ${formatDepth(depth)}${why}`, 'info', end === 'time' ? 6000 : undefined);
    }
}

export function stopDive(): void {
    getHost()?.cancel();
}
