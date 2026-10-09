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
 *   - `host.diveTo` does not say how it ended (arrival, a fly key, the time limit): the depth is
 *     read afterwards and the toast says "Arrived" only within a decade of the target.
 *   - A dive flies straight along the view, and closes on the nearest of the rays about the view
 *     axis (`aheadOf` in host/moduleHost.ts). The depth read here is the depth the app shows (the
 *     second nearest of the same rays, `deep-zoom/depthNow.ts`), so "Arrived at" can read a
 *     little above the target. With nothing ahead at all the dive ends at once.
 *   - From a view that grazes the surface it closes slowly and can end on the host's time limit
 *     well short of the target.
 *   - The host can be replaced while a dive is in flight (a context loss): the result is read from
 *     whichever host is mounted when the promise resolves.
 */
import { create } from 'zustand';
import { getHost } from './host/current';
import { showToast } from '../engine/store/toastStore';
import { FLOOR_DEPTH, formatDepth, validDepth } from './components/depthFormat';
import { depthNow } from './depthNow';

export interface DiveInFlight {
    from: number;
    target: number;
}

/** null when no dive is in flight. */
export const useDive = create<{ dive: DiveInFlight | null }>(() => ({ dive: null }));

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
    try {
        await host.diveTo(to);
    } finally {
        if (useDive.getState().dive === mine) useDive.setState({ dive: null });
        const depth = depthNow();
        if (validDepth(depth)) showToast(`${depth <= to * 10 ? 'Arrived at' : 'Stopped at'} ${formatDepth(depth)}`, 'info');
    }
}

export function stopDive(): void {
    getHost()?.cancel();
}
