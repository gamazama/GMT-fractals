/**
 * deep-zoom/components/StarterDives.tsx - six ready dives: a start view and a depth to fly to.
 *
 * A card jumps to its start view (one undo step, through `jumpTo`) and then dives straight ahead
 * to its target depth. The data is `data/starters.ts`. Names and numbers only on the cards; the
 * longer line is the card's tooltip.
 *
 * A dive flies straight along the view, so a start view has to face the surface. These six do
 * (frames of a recorded dive); a card whose dive ends early says "Stopped at ..." through the
 * usual toast, and pressing it again continues from where it stopped only if the view is kept -
 * a second press starts over from the card's own start view.
 *
 * Registered as `dz-starters` in main.tsx; panels.ts places it at the top of Locations.
 */
import React from 'react';
import { STARTERS } from '../data/starters';
import { PLACES } from '../data/places';
import { BOX_STARTERS } from '../data/boxStarters';
import type { Starter } from '../data/starters';
import { jumpTo } from '../locations';
import { diveTo, useDive } from '../diveControl';
import { getHost } from '../host/current';

/** Frames to let the renderer draw the start view before the dive reads its distance. */
const SETTLE_FRAMES = 6;

async function runStarter(starter: Starter): Promise<void> {
    const target = starter.look ? { view: starter.view, look: starter.look, depth: String(starter.startDepth) }
        : starter.formula ? { view: starter.view, formula: starter.formula, depth: String(starter.startDepth) }
        : starter.view;
    if (!jumpTo(target)) return;
    if (!(starter.depth < starter.startDepth)) return;   // a place, not a dive
    const host = getHost();
    if (!host) return;
    await host.ready.catch(() => undefined);
    const from = host.frameCount();
    await new Promise<void>((resolve) => {
        const started = performance.now();
        const wait = (): void => {
            const h = getHost();
            if (!h || h.frameCount() - from >= SETTLE_FRAMES || performance.now() - started > 3000) resolve();
            else setTimeout(wait, 30);
        };
        wait();
    });
    await diveTo(starter.depth);
}

export const StarterDives: React.FC = () => {
    const diving = useDive((s) => s.dive !== null);
    return (
        <div data-dz-starters className="grid grid-cols-2 gap-1 px-2 pb-2">
            {STARTERS.map((starter) => (
                <button
                    key={starter.name}
                    type="button"
                    data-dz-starter={starter.depth.toExponential(0)}
                    disabled={diving}
                    title={starter.blurb}
                    onClick={() => { void runStarter(starter); }}
                    className="text-left px-2 py-1.5 rounded border border-line/15 bg-line/[0.04] hover:bg-line/10 hover:border-line/30 disabled:opacity-40 text-[10px] leading-tight text-fg-secondary"
                >
                    {starter.name}
                </button>
            ))}
        </div>
    );
};

/**
 * The Mandelbox's starter places (deep-zoom/data/boxStarters.ts): a card is a jump to a place of
 * that formula, which switches the formula in the same undo step. Registered as `dz-box-starters`;
 * panels.ts puts it on the Locations tab under its own heading. Its cards carry `data-dz-box-starter`,
 * not `data-dz-starter`: the six cards above are counted by the stage smoke.
 */
export const BoxStarters: React.FC = () => {
    const diving = useDive((s) => s.dive !== null);
    return (
        <div data-dz-box-starters className="grid grid-cols-2 gap-1 px-2 pb-2">
            {BOX_STARTERS.map((starter) => (
                <button
                    key={starter.name}
                    type="button"
                    data-dz-box-starter={starter.name}
                    disabled={diving}
                    title={starter.blurb}
                    onClick={() => { void runStarter(starter); }}
                    className="text-left px-2 py-1.5 rounded border border-line/15 bg-line/[0.04] hover:bg-line/10 hover:border-line/30 disabled:opacity-40 text-[10px] leading-tight text-fg-secondary"
                >
                    {starter.name}
                </button>
            ))}
        </div>
    );
};

/**
 * The kept places (deep-zoom/data/places.ts): the owner's own, which are also the quality tooling's
 * hard cases. A card is a jump - view, look and the march settings the place needs - never a dive.
 * Registered as `dz-places`; panels.ts puts it on the Locations tab.
 */
export const KeptPlaces: React.FC = () => {
    const diving = useDive((s) => s.dive !== null);
    return (
        <div data-dz-places className="grid grid-cols-2 gap-1 px-2 pb-2">
            {PLACES.map((place) => (
                <button
                    key={place.name}
                    type="button"
                    data-dz-place={place.name}
                    disabled={diving}
                    title={place.note}
                    onClick={() => { jumpTo(place.state); }}
                    className="text-left px-2 py-1.5 rounded border border-line/15 bg-line/[0.04] hover:bg-line/10 hover:border-line/30 disabled:opacity-40 text-[10px] leading-tight text-fg-secondary"
                >
                    {place.name}
                </button>
            ))}
        </div>
    );
};
