/**
 * deep-zoom/components/StarterDives.tsx - the ready-made cards of the Places tab: four widgets, one
 * look, and every card a JUMP (F6, the owner, 2026-10-17: "all jump (2-3 s) rather than some diving
 * (13-16 s)"; the Dive field and the first lesson teach diving).
 *
 *   `dz-starters`       the Mandelbulb's six (data/starters.ts). Five of them are dives in the data -
 *                       a start view and a depth - and the card jumps to where that dive arrives
 *                       (`place`, recorded on the GPU); the sixth is a place already.
 *   `dz-box-starters`   the Mandelbox's (data/boxStarters.ts): a jump that also switches the formula.
 *   `dz-kali-starters`  KaliBox's (data/kaliStarters.ts), likewise.
 *   `dz-places`         the owner's kept places (data/places.ts), starred: his.
 * Each jump goes through `jumpTo` (one undo step; Backspace comes back), and a card pressed while
 * Julia mode is on switches it off in the same jump: every card is a place in Mandelbrot mode, but
 * for GMT's KaliBox preset, which carries its own.
 *
 * A card's title is its name with its depth, once ("Grain of sand · 1e-30"); a card whose second
 * part is not a depth - "scale -1.5", "Detail 1" - has it as a subtitle (`sub` in the data). The
 * longer line is the card's tooltip.
 *
 * The cards carry `data-dz-starter` (the Mandelbulb's, by target depth: the stage smoke counts six),
 * `data-dz-box-starter`, `data-dz-kali-starter` and `data-dz-place` (by name).
 *
 * `runStarter` is the first lesson's: its first card has a button that runs the "Surface" dive from
 * its start view (deep-zoom/tutorial/steps.tsx). The lesson's own dive stays (F6).
 *
 * @assumption Each recorded `place` is at the depth on its card. The 1e-30 card is checked by the stage-3
 *   smoke step "a Mandelbulb card jumps to its place ..." (the nearest ray ahead within a factor 2); the
 *   others were measured when recorded (1.06e-3, 1.08e-6, 1.03e-15, 1.04e-50) and the 1e-50 card again in
 *   the app on 2026-10-17, gathered in 0.7 s (debug/scratch/stage45/try-more.mjs, git-ignored).
 */
import React from 'react';
import { STARTERS } from '../data/starters';
import { PLACES } from '../data/places';
import { BOX_STARTERS } from '../data/boxStarters';
import { KALI_STARTERS } from '../data/kaliStarters';
import type { Starter } from '../data/starters';
import { jumpTo } from '../locations';
import type { DzLocationState } from '../locations';
import { diveTo, useDive } from '../diveControl';
import { getHost } from '../host/current';

/** Frames to let the renderer draw the start view before the dive reads its distance. */
const SETTLE_FRAMES = 6;

/** Where a card jumps: where its dive arrives when it has one recorded, else its own view. */
function starterPlace(starter: Starter): DzLocationState {
    const view = starter.place ?? starter.view;
    const depth = String(starter.place ? starter.depth : starter.startDepth);
    return starter.look ? { view, look: starter.look, depth } : starter.formula ? { view, formula: starter.formula, depth } : { view, depth };
}

/** The first lesson's dive: the jump to a starter's START view, then the dive to its depth. */
export async function runStarter(starter: Starter): Promise<void> {
    if (!jumpTo(starterPlace({ ...starter, place: undefined }))) return;
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

interface Card { key: string; data: Record<string, string>; title: string; sub?: string; tooltip: string; starred?: boolean; jump: () => void }

const CARD = 'text-left px-2 py-1.5 rounded border border-line/15 bg-line/[0.04] hover:bg-line/10 hover:border-line/30 disabled:opacity-40 text-[10px] leading-tight text-fg-secondary';

const Cards: React.FC<{ cards: Card[]; data: Record<string, string> }> = ({ cards, data }) => {
    const diving = useDive((s) => s.dive !== null);
    return (
        <div {...data} className="grid grid-cols-2 gap-1 px-2 pb-2">
            {cards.map((c) => (
                <button key={c.key} type="button" {...c.data} disabled={diving} title={c.tooltip} onClick={c.jump} className={CARD}>
                    {c.starred && <span className="text-accent-400 mr-1" aria-label="kept">★</span>}
                    {c.title}
                    {c.sub && <span className="block text-[9px] text-fg-faint">{c.sub}</span>}
                </button>
            ))}
        </div>
    );
};

const starterCard = (attr: string, value: (s: Starter) => string) => (s: Starter): Card => ({
    key: s.name, data: { [attr]: value(s) }, title: s.name, sub: s.sub, tooltip: s.blurb, jump: () => { jumpTo(starterPlace(s)); },
});

export const StarterDives: React.FC = () => <Cards data={{ 'data-dz-starters': '' }} cards={STARTERS.map(starterCard('data-dz-starter', (s) => s.depth.toExponential(0)))} />;
export const BoxStarters: React.FC = () => <Cards data={{ 'data-dz-box-starters': '' }} cards={BOX_STARTERS.map(starterCard('data-dz-box-starter', (s) => s.name))} />;
export const KaliStarters: React.FC = () => <Cards data={{ 'data-dz-kali-starters': '' }} cards={KALI_STARTERS.map(starterCard('data-dz-kali-starter', (s) => s.name))} />;
export const KeptPlaces: React.FC = () => (
    <Cards
        data={{ 'data-dz-places': '' }}
        cards={PLACES.map((p) => ({ key: p.name, data: { 'data-dz-place': p.name }, title: p.name, tooltip: p.note, starred: true, jump: () => { jumpTo(p.state); } }))}
    />
);
