/**
 * setSaveFlash — "it went in there", said with the gradient itself.
 *
 * Filing a gradient used to be a silent success: a drop on a chip, a count going up by one,
 * and (on the ♥) a toast in a corner nowhere near the thing you pressed. The owner's ask,
 * 2026-09-11: the gradient should appear in the background of the set's name chip on hover,
 * and on the save "ease out to a vertical scale down from the centre of the gradient to make
 * it disappear … the text should also light up so that saving is fun".
 *
 * So a save is drawn where it LANDS. The chip fills with the gradient you are giving it, then
 * the fill collapses to its own centre line and goes, and the chip's label lights through it.
 * Two speeds, because the two gestures feel different:
 *   • a DROP is already a physical act — you carried the thing there — so the flash is quick
 *     confirmation (`SAVE_MS`);
 *   • the ♥ is one click a long way from the rail, and the flash is the only thing that says
 *     where the gradient went, so it runs slower and brighter (`SAVE_SLOW_MS`) and has time
 *     to be noticed at the other end of the screen.
 *
 * The hover half needs no state of its own: what is in flight is already published by
 * `palette/store/dragVisual.ts` (`useDragPayload`), for the cursor avatar. This module is
 * only the ANNOUNCEMENT of a completed save.
 *
 * Same plain `useSyncExternalStore` shape as `components/gradient/eyedropperActive.ts`.
 * Transient: not DDFS, not persisted, no undo.
 *
 * @see docs/adr/0119-a-save-is-drawn-where-it-lands.md
 */
import { useSyncExternalStore } from 'react';
import type { GradientConfig } from '../../types';
import { configToCss } from '../../palette/core/gradientCss';
import { useFavientsStore } from '../../palette/store/favientsStore';
import { listGroundSets } from '../../palette/core/groundSets';

/** The quick flash: a drop, where the gesture already carried its own meaning. */
export const SAVE_MS = 460;
/** The slow one: the ♥, whose flash is the only thing naming where the gradient went. */
export const SAVE_SLOW_MS = 780;

export interface SetSaveFlash {
    /** The chip to play it on — a `GroundSetDesc` id (`bin:2026-09-11`, a group id, …). */
    setId: string;
    /** The gradient, as a ready CSS `linear-gradient(...)`. The rail paints, it does not render. */
    css: string;
    /** The ♥ path: slower and brighter. */
    slow: boolean;
    /** Bumped per flash, so the same set saved twice replays rather than doing nothing. */
    serial: number;
}

let current: SetSaveFlash | null = null;
let serial = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/**
 * Announce a save. Clears itself when the animation is over, so a chip never has to remember
 * to stop — the rail simply stops being told to draw.
 */
export const flashSetSave = (setId: string, css: string, opts: { slow?: boolean } = {}): void => {
    const slow = !!opts.slow;
    serial += 1;
    current = { setId, css, slow, serial };
    notify();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
        timer = null;
        current = null;
        notify();
    }, (slow ? SAVE_SLOW_MS : SAVE_MS) + 60);
};

const subscribe = (l: () => void): (() => void) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
};

/** The save being announced right now, or null. */
export const useSetSaveFlash = (): SetSaveFlash | null =>
    useSyncExternalStore(subscribe, () => current, () => null);

/** id → count for every set the rail would draw right now (the catalogue aside). */
const countsNow = (): Map<string, number> => {
    const st = useFavientsStore.getState();
    const out = new Map<string, number>();
    for (const d of listGroundSets({ favients: st.favients, groupLabels: st.groupLabels, catalogTotal: 0 })) {
        out.set(d.id, d.count);
    }
    return out;
};

/**
 * Run a write that FILES a gradient, then flash whichever chip took it.
 *
 * The ♥ does not name a set — it adds to Recent, which the rail renders as a dated bin whose
 * id depends on the day and on how the blocks fell. Reconstructing that id here would be a
 * second implementation of `listGroundSets`'s binning, and the kind of copy that is correct
 * until the day the binning changes. So it is OBSERVED instead: snapshot the counts, do the
 * write, and flash the set that grew. Nothing grew (a ♥ that removed, a no-op) means nothing
 * to announce, which is also right.
 */
export const flashSaveWhereItLanded = (
    config: GradientConfig,
    write: () => void,
    opts: { slow?: boolean } = {},
): void => {
    const before = countsNow();
    write();
    const after = countsNow();
    let target: string | null = null;
    for (const [id, n] of after) {
        if (n > (before.get(id) ?? 0)) { target = id; break; }
    }
    if (!target) return;
    const css = configToCss(config);
    if (css) flashSetSave(target, css, opts);
};
