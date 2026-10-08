/**
 * deep-zoom/hotkeys.ts - this app's one-shot keys, as engine shortcuts.
 *
 * Rule: a key is an engine shortcut that writes a store value or calls the shell's own action.
 * The renderer's own single-key shortcuts are off (it was created with `shortcuts: false`); only
 * its fly keys (W A S D Q E, Shift) and Escape reach it, and only while the picture has focus.
 * So none of those six letters is registered here.
 *
 * `B` and `Shift+B` are two registrations on purpose: Shift is held for speed while flying, and
 * to the dispatcher `Shift+B` is a different key from `B`.
 *
 * The table grows in stage 4 (detail, iterations, power, colour mode, overlays, record, help);
 * this file starts with the keys the Locations stage needs. Slot digits (1-9 recall, Ctrl+1-9
 * save) are the state library's own, installed in locations.ts.
 */
import { shortcuts } from '../engine/plugins/Shortcuts';
import { jumpBack, jumpHome, saveLocationHere } from './locations';

const CATEGORY = 'Locations';

/** Call once, after `installShortcuts()` and `installLocations()`. */
export function registerDeepZoomHotkeys(): void {
    const save = (): void => { void saveLocationHere(); };
    shortcuts.register({ id: 'deep-zoom.save-location', key: 'b', handler: save, description: 'Save this view to My locations', category: CATEGORY });
    shortcuts.register({ id: 'deep-zoom.save-location.shift', key: 'Shift+b', handler: save, description: 'Save this view to My locations (while holding Shift for speed)', category: CATEGORY });
    shortcuts.register({ id: 'deep-zoom.home', key: 'Home', handler: jumpHome, description: 'Jump to the start view', category: CATEGORY });
    shortcuts.register({ id: 'deep-zoom.back', key: 'Backspace', handler: jumpBack, description: 'Back to the view before the last jump', category: CATEGORY });
}
