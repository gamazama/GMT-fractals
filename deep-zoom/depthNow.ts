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

export interface DepthReading {
    /** What is looked at; the nearest surface when nothing is. 0 when neither is known. */
    depth: number;
    /** True when `depth` is what is looked at. */
    isLook: boolean;
    /** The bundle about the view axis the answer came from. */
    sense: DzSense;
}

export function readDepth(host: DeepZoomHost): DepthReading {
    const sense = host.sense(null, { slot: DZ_LOOK_SLOT });
    const look = lookDistance(sense);
    if (look > 0) return { depth: look, isLook: true, sense };
    const nearest = host.telemetry().depth;
    return { depth: nearest > 0 && Number.isFinite(nearest) ? nearest : 0, isLook: false, sense };
}

/** The depth the app shows, now. 0 when no renderer is mounted or nothing is known. */
export function depthNow(host: DeepZoomHost | null = getHost()): number {
    return host ? readDepth(host).depth : 0;
}
