/**
 * deep-zoom/hotkeys.ts - this app's one-shot keys, as engine shortcuts.
 *
 * Rule: a key is an engine shortcut that writes a store value or calls the shell's own action.
 * The renderer's own keys are all off (`shortcuts: false`, and the shell's navigation owns the
 * input). THE FLY KEYS ARE NOT SHORTCUTS: W A S D, Q E, Space, C, Shift and Alt are heard on the
 * window by the navigation (deep-zoom/DeepZoomNavigation.tsx), whatever has focus. None of them
 * may be registered here - `C` was "next colouring" until stage N5 and is `V` now. Every look
 * key goes through the feature setter inside one param transaction, so it is one undo step and
 * the panels follow.
 *
 * `B` is registered twice (`b` and `Shift+b`): Shift is held for speed while flying, and to the
 * dispatcher `Shift+B` is a different key from `B`.
 *
 * Slot digits (1-9 recall, Ctrl+1-9 save) are the state library's own, installed in locations.ts.
 * Not here yet: record (M) and still export (X) arrive with the Flight tab; `/` with Help.
 */
import { shortcuts } from '../engine/plugins/Shortcuts';
import { useEngineStore } from '../store/engineStore';
import { jumpBack, jumpHome, saveLocationHere } from './locations';
import { stopDive, useDive } from './diveControl';
import { colourFromRenderer, colourToRenderer } from './features/colour';
import { LIGHT_TYPE_OPTIONS } from './features/light';
import { OVERLAYS_OPTIONS } from './features/inspect';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const store = () => useEngineStore.getState();

/**
 * One key press = one undo entry. A feature setter called on its own leaves no entry (the panels
 * bracket a drag themselves), so each look key is wrapped in the store's own param transaction.
 * Seen 2026-10-08: without it the smoke's "Ctrl+Z undoes the last key" was red.
 */
const undoable = (write: () => void) => (): void => {
    store().beginParamTransaction();
    try { write(); } finally { store().endParamTransaction(); }
};

// ── what each key does (ranges are the feature params' own) ──
const detail = (factor: number) => (): void => store().setDzQuality({ detail: clamp(store().dzQuality.detail * factor, 0.25, 32) });
const iterations = (step: number) => (): void => store().setDzFormula({ iterations: clamp(store().dzFormula.iterations + step, 4, 160) });
const power = (step: number) => (): void => store().setDzFormula({ power: clamp(store().dzFormula.power + step, 2, 16) });
const autoIterations = (): void => store().setDzFormula({ autoIterations: !store().dzFormula.autoIterations });
/** Plain -> Iterations -> Orbit trap -> Plain: the renderer's own order of its three colourings. */
const nextColour = (): void => {
    const s = store().dzColour;
    store().setDzColour(colourFromRenderer((colourToRenderer(s.plain, s.mode) + 1) % 3));
};
const nextLightType = (): void => store().setDzLight({ lightType: (store().dzLight.lightType + 1) % LIGHT_TYPE_OPTIONS.length });
const nextOverlays = (): void => store().setDzInspect({ overlays: (store().dzInspect.overlays + 1) % OVERLAYS_OPTIONS.length });
const focusDiveField = (): void => {
    const field = document.querySelector<HTMLInputElement>('[data-dz-dive-exponent]');
    field?.focus();
    field?.select();
};

/** Call once, after `installShortcuts()` and `installLocations()`. */
export function registerDeepZoomHotkeys(): void {
    const add = (id: string, key: string, handler: () => void, description: string, category: string, extra: { when?: () => boolean } = {}): void =>
        shortcuts.register({ id: `deep-zoom.${id}`, key, handler, description, category, ...extra });

    const save = (): void => { void saveLocationHere(); };
    add('save-location', 'b', save, 'Save this view to My locations', 'Locations');
    add('save-location.shift', 'Shift+b', save, 'Save this view to My locations (with Shift held for speed)', 'Locations');
    add('home', 'Home', jumpHome, 'Jump to the start view', 'Locations');
    add('back', 'Backspace', jumpBack, 'Back to the view before the last jump', 'Locations');
    add('dive', 'j', focusDiveField, 'Go to the "Dive to 1e-" field', 'Locations');
    add('cancel', 'Escape', stopDive, 'Stop the dive in flight', 'Locations', { when: () => useDive.getState().dive !== null });

    add('detail-down', 'f', undoable(detail(1 / 1.5)), 'Detail down (divide by 1.5)', 'Look');
    add('detail-up', 'g', undoable(detail(1.5)), 'Detail up (times 1.5)', 'Look');
    add('iters-down', '[', undoable(iterations(-1)), 'Iterations down by 1', 'Look');
    add('iters-up', ']', undoable(iterations(1)), 'Iterations up by 1', 'Look');
    add('auto-iters', 'i', undoable(autoIterations), 'Auto iterations on / off', 'Look');
    add('power-down', '-', undoable(power(-1)), 'Power down by 1', 'Look');
    add('power-up', '=', undoable(power(1)), 'Power up by 1', 'Look');
    add('colour-mode', 'v', undoable(nextColour), 'Next colouring: Plain, Iterations, Orbit trap', 'Look');
    add('light-type', 'l', undoable(nextLightType), 'Next light type: Direct, Lamp, Both', 'Look');
    add('overlays', 'o', undoable(nextOverlays), 'Overlays: All, Depth only, None', 'Look');
}
