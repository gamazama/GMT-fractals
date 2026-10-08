/**
 * deep-zoom/hotkeys.ts - this app's one-shot keys, as engine shortcuts.
 *
 * Rule: a key is an engine shortcut that writes a store value or calls the shell's own action.
 * The renderer's own single-key shortcuts are off (it was created with `shortcuts: false`); only
 * its fly keys (W A S D Q E, Shift) and Escape reach it, and only while the picture has focus.
 * So none of those six letters is registered here. Every look key goes through the feature
 * setter inside one param transaction, so it is one undo step and the panels follow.
 *
 * `B` is registered twice (`b` and `Shift+b`): Shift is held for speed while flying, and to the
 * dispatcher `Shift+B` is a different key from `B`.
 *
 * WHILE THE POINTER IS CAPTURED four keys keep the meaning a deep zoomer tunes while moving, and
 * nothing else on them fires: `9` / `0` step the colour scale and `T` / `Y` the lamp falloff
 * (a panel slider cannot be reached with the pointer locked). They are registered in the flying
 * scope (`DZ_FLYING_SCOPE`, deep-zoom/flyGuard.ts), which outranks the global bindings on the
 * same keys - the timeline's `T` and the state library's slot digits. Space is held to nothing
 * there (flyGuard.ts).
 *
 * Slot digits (1-9 recall, Ctrl+1-9 save) are the state library's own, installed in locations.ts.
 * Not here yet: record (M) and still export (X) arrive with the Flight tab; `/` with Help.
 */
import { shortcuts } from '../engine/plugins/Shortcuts';
import { useEngineStore } from '../store/engineStore';
import { jumpBack, jumpHome, saveLocationHere } from './locations';
import { stopDive, useDive } from './diveControl';
import { DZ_FLYING_SCOPE } from './flyGuard';
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
const colourScale = (factor: number) => (): void => store().setDzColour({ scale: clamp(store().dzColour.scale * factor, 0.1, 16) });
const lampFalloff = (step: number) => (): void => store().setDzLight({ lampFalloff: clamp(store().dzLight.lampFalloff + step, 0.5, 32) });
const focusDiveField = (): void => {
    const field = document.querySelector<HTMLInputElement>('[data-dz-dive-exponent]');
    field?.focus();
    field?.select();
};

/** Call once, after `installShortcuts()`, `installLocations()` and `installFlyGuard()`. */
export function registerDeepZoomHotkeys(): void {
    const add = (id: string, key: string, handler: () => void, description: string, category: string, extra: { scope?: string; when?: () => boolean } = {}): void =>
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
    add('colour-mode', 'c', undoable(nextColour), 'Next colouring: Plain, Iterations, Orbit trap', 'Look');
    add('light-type', 'l', undoable(nextLightType), 'Next light type: Direct, Lamp, Both', 'Look');
    add('overlays', 'o', undoable(nextOverlays), 'Overlays: All, Depth only, None', 'Look');

    // While flying (pointer captured): the two pairs a slider cannot give you.
    add('scale-down', '9', undoable(colourScale(1 / 1.25)), 'While flying: colour scale down (divide by 1.25)', 'Flying', { scope: DZ_FLYING_SCOPE });
    add('scale-up', '0', undoable(colourScale(1.25)), 'While flying: colour scale up (times 1.25)', 'Flying', { scope: DZ_FLYING_SCOPE });
    add('falloff-down', 't', undoable(lampFalloff(-0.5)), 'While flying: lamp falloff down by 0.5', 'Flying', { scope: DZ_FLYING_SCOPE });
    add('falloff-up', 'y', undoable(lampFalloff(0.5)), 'While flying: lamp falloff up by 0.5', 'Flying', { scope: DZ_FLYING_SCOPE });
}
