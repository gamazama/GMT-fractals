/**
 * geSmokeBoot — the browser state a GE v2 smoke needs before the shell boots.
 *
 * A smoke drives a FRESH browser profile, which by definition is a first-run user — so
 * since 2026-09-09 the shell opens the brightness dialogue over it (`FirstRunBrightness`,
 * §8b item 3). It is a modal: its backdrop covers the wall, every click a smoke aims at a
 * tile lands on the backdrop instead, and the failure reads as "no hero after a wall click"
 * — a product bug that is not one. Three smokes went red exactly that way.
 *
 * A smoke is not a person arriving for the first time, so it declares that rather than
 * dismissing a dialogue it never meant to open. Seeding the same key the shell writes is
 * the honest way to say it: the browser has been here before.
 *
 * Call it on the CONTEXT, before `newPage`/`goto` — an init script runs before any page
 * script, which is the only point at which the flag can be in place in time. Setting it
 * after the page loads is too late; the decision is made at module scope in main.tsx.
 *
 * Add anything else a smoke should not have to opt out of here, so there is one list of
 * "what a fresh profile would otherwise ask" rather than a copy in each file.
 */
import type { BrowserContext } from 'playwright';

/** localStorage keys a GE v2 smoke pre-seeds, with why. */
const SEED: Record<string, string> = {
    // "v2 has booted in this browser" — suppresses the first-run brightness dialogue.
    'gmt.ge.themeSeeded': '1',
};

/**
 * Make the context look like a returning visitor. MUST be called before the first
 * navigation; safe to call on a context that has not opened a page yet.
 */
export const seedGeSmokeState = async (ctx: BrowserContext): Promise<void> => {
    await ctx.addInitScript((seed: Record<string, string>) => {
        try {
            for (const k of Object.keys(seed)) window.localStorage.setItem(k, seed[k]);
        } catch { /* storage disabled — the smoke will fail loudly on its own assertions */ }
    }, SEED);
};
