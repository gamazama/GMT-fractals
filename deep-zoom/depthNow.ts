/**
 * deep-zoom/depthNow.ts - THE DEPTH THE APP SHOWS, read from the renderer now.
 *
 * PURPOSE
 *   "Depth" in this app is the distance to what is in the middle of the picture (the owner,
 *   2026-10-09: "we lead with the looked at readout"): the second nearest of the renderer's seven
 *   rays about the view axis (`host.sense`). Until then it was the estimate at the camera, which is
 *   the nearest surface in ANY direction - at his power-4 place 3.4e-76, a wall behind the camera,
 *   while everything in the picture is about 1e-54 away. That number is still what stands in when
 *   nothing is there to look at (open sky, or rays that have not reached a far surface yet).
 *
 * THE SEAM
 *   - `readDepth(host)` is what the navigation tick calls (`deep-zoom/DeepZoomNavigation.tsx`); it
 *     publishes the result to `deep-zoom/navigationState.ts`, 8 times a second, for the readouts.
 *   - `depthNow()` is for code that needs the number at this moment and not up to 125 ms late: a
 *     saved location, a copied one, a scene file, the dive's "from" and its closing toast.
 *   - `asks` (both): how often rays that ran out of steps are asked on, the camera standing, before
 *     the answer is read - as the dive's own reading does (`aheadOf` in host/moduleHost.ts). With
 *     more than one, the bundle is marched afresh from where the camera is (a kept one, shortened by
 *     a move, is not gone on with: asked 16 times it stays unfinished). The dive's closing toast
 *     asks up to `DZ_LOOK_ASKS` times: at the Surface card's landing one ask left a ray unfinished,
 *     and the nearest surface standing in read 2.11e-5 where the camera looked at 1.07e-6
 *     (2026-10-17).
 *   - One slot name for every such reading (`DZ_LOOK_SLOT`): the renderer keeps the bundle, so a
 *     second ask with the camera where it stood marches nothing.
 *
 * PITFALLS
 *   - A reading can cost a few milliseconds (seven rays on the CPU). Not for a render path.
 *   - With the camera 22 decades from what it looks at, the first ask ends short (a ray has a step
 *     budget) and the nearest surface is answered; asked again with the camera still, the rays go
 *     on, and after a few asks the looked-at distance is there. The readout settles within a second.
 */
import { getHost } from './host/current';
import type { DeepZoomHost, DzSense } from './host/DeepZoomHost';
import { lookDistance } from './flyPace';

/** The slot the view's bundle is kept under in the renderer. */
export const DZ_LOOK_SLOT = 'look';
/** Asks for a reading that must be settled: 64 steps an ask, as the dive's (16 carry a ray 1000 steps). */
export const DZ_LOOK_ASKS = 16;

export interface DepthReading {
    /** What is looked at; the nearest surface when nothing is. 0 when neither is known. */
    depth: number;
    /** True when `depth` is what is looked at. */
    isLook: boolean;
    /** The bundle about the view axis the answer came from. */
    sense: DzSense;
}

export function readDepth(host: DeepZoomHost, asks = 1): DepthReading {
    const opt = asks > 1 ? { slot: DZ_LOOK_SLOT, reuse: 1e-9 } : { slot: DZ_LOOK_SLOT };
    let sense = host.sense(null, opt);
    for (let i = 1; i < asks && sense.open > 0 && !sense.inside; i++) sense = host.sense(null, opt);
    const look = lookDistance(sense);
    if (look > 0) return { depth: look, isLook: true, sense };
    const nearest = host.telemetry().depth;
    return { depth: nearest > 0 && Number.isFinite(nearest) ? nearest : 0, isLook: false, sense };
}

/** The depth the app shows, now. 0 when no renderer is mounted or nothing is known. */
export function depthNow(host: DeepZoomHost | null = getHost(), asks = 1): number {
    return host ? readDepth(host, asks).depth : 0;
}
