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
 * dispatcher `Shift+B` is a different key from `B`. `K` (set a keyframe of the route,
 * deep-zoom/route.ts) likewise: it is pressed in flight.
 *
 * `Tab` switches the camera mode, Fly and Orbit: GMT's key, writing GMT's store field
 * (`cameraMode`), which the navigation reads every frame and the timeline's Space binding tests.
 * ONLY WHILE THE PICTURE HAS FOCUS (`#dz-frame`, which a click on the picture and a dive focus;
 * STREAMLINE.md A10 / F10). Anywhere else Tab is the browser's: it moves the focus, and the
 * dispatcher leaves it alone because its `when` says no (engine/plugins/Shortcuts.ts: a key whose
 * `when` fails is not consumed). Until 2026-10-17 it was global, and after the Dive button every
 * Tab switched the mode and toasted. The depth box's mode pill switches it by a click
 * (`toggleCameraMode`, exported for it).
 * @assumption Tab with the focus on the page body, in the Dive field or on the Dive button leaves the
 *   mode alone and toasts nothing; with the picture focused it switches. Seen in the app on 2026-10-17
 *   (debug/scratch/stage45/try-more.mjs, git-ignored); the stage-N5 Orbit steps press Tab on the focused
 *   picture, and no step presses it elsewhere.
 *
 * WHAT IS REGISTERED HERE (`registerDeepZoomHotkeys`, the list a reader can check against the code):
 *   Places      B / Shift+B save this place; Home the place the app started with (NOT the readout's
 *               "Start view" button: `jumpStart` in locations.ts); Backspace back; J the Dive field;
 *               Escape stops a dive (only while one flies).
 *   Route       K / Shift+K add a keyframe (or give the one under the playhead this view).
 *   Look        F G detail; [ ] iterations; I auto iterations; - = power; V colouring; L light type;
 *               O overlays.
 *   View        ` Advanced mode; Tab Fly / Orbit (the picture focused).
 *   Help        / opens Help on its first topic, and closes it when it is open.
 * Help's own Keyboard Shortcuts page is WRITTEN FROM THIS REGISTRY when it is read
 * (deep-zoom/help/shortcutsPage.ts): a key added here is on it with its `description` and under
 * its `category`, and no list anywhere else has to follow. The topics name keys by hand, and
 * `npm run check:deep-zoom-help` fails for a key they name that is no longer registered here.
 * Keys that act in this app and are registered elsewhere: the slot digits (1-9 recall, Ctrl+1-9
 * save: the state library's own, installed in locations.ts), Alt+S (save a PNG: the engine's scene
 * plugin), Ctrl+Z / Ctrl+Y (the engine's undo), H (hints: the engine's help), T (the timeline) and,
 * with the pointer over the timeline or the Route tab, Space (play) and Ctrl+Z / Ctrl+Y on the route:
 * the timeline's own ('timeline-hover', which the Route tab pushes as the timeline does).
 *
 * DELIBERATELY NOT A KEY (each was one in the old page or in the plan, and the plan's "Flight tab"
 * they were to arrive with was never built - the Route tab took its place):
 *   M   the old recorder's key. There is no recorder: the trail remembers how the camera is flown
 *       by itself, and its one switch is on the Route tab (deep-zoom/trail.ts).
 *   X   the old still export. A still is File > Save Scene (PNG), Alt+S; frames are the render
 *       dialog (deep-zoom/routeRender.tsx). The renderer's own tiled export is not reachable.
 */
import { shortcuts } from '../engine/plugins/Shortcuts';
import { useEngineStore } from '../store/engineStore';
import { showToast } from '../engine/store/toastStore';
import { DZ_MODE_FLY, DZ_MODE_ORBIT, cameraModeOf } from './navigationState';
import { DZ_FRAME_ID } from './host/current';
import { jumpBack, jumpHome, saveLocationHere } from './locations';
import { setKeyframe } from './route';
import { stopDive, useDive } from './diveControl';
import { colourFromRenderer, colourToRenderer } from './features/colour';
import { LIGHT_TYPE_OPTIONS } from './features/light';
import { OVERLAYS_OPTIONS } from './features/inspect';
import { iterationCeiling } from './features/formula';
import { DZ_TOPIC } from './help/ids';

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
const iterations = (step: number) => (): void => store().setDzFormula({ iterations: clamp(store().dzFormula.iterations + step, 4, iterationCeiling(store().dzFormula.kind)) });
const power = (step: number) => (): void => store().setDzFormula({ power: clamp(store().dzFormula.power + step, 2, 16) });
const autoIterations = (): void => store().setDzFormula({ autoIterations: !store().dzFormula.autoIterations });
/** Plain -> Iterations -> Orbit trap -> Plain: the renderer's own order of its three colourings. */
const nextColour = (): void => {
    const s = store().dzColour;
    store().setDzColour(colourFromRenderer((colourToRenderer(s.plain, s.mode) + 1) % 3));
};
const nextLightType = (): void => store().setDzLight({ lightType: (store().dzLight.lightType + 1) % LIGHT_TYPE_OPTIONS.length });
const nextOverlays = (): void => store().setDzInspect({ overlays: (store().dzInspect.overlays + 1) % OVERLAYS_OPTIONS.length });
const toggleAdvancedMode = (): void => store().setAdvancedMode(!store().advancedMode);
/** Fly <-> Orbit: GMT's own key and its own store field (grep `gmt.toggleCameraMode` in
 *  app-gmt/main.tsx). What each mode's hands do is in the header of deep-zoom/DeepZoomNavigation.tsx.
 *  Also the depth box's mode pill (components/DepthReadout.tsx). */
export const toggleCameraMode = (): void => {
    const next = cameraModeOf(store()) === DZ_MODE_ORBIT ? DZ_MODE_FLY : DZ_MODE_ORBIT;
    useEngineStore.setState({ cameraMode: next } as Partial<ReturnType<typeof useEngineStore.getState>>);
    showToast(next === DZ_MODE_ORBIT
        ? 'Orbit: drag turns about the point under the pointer, the wheel or a middle drag flies to it, right drag moves it, Q E roll. Tab: Fly'
        : 'Fly: W A S D, Q E roll, drag to look, the wheel sets the speed. Tab: Orbit', 'info', 4000);
};
/** Help, on its first topic; pressed with Help open, it closes it. The topic is named by its id
 *  (a string): the topics themselves are a lazy chunk this file must not import. */
const toggleHelp = (): void => {
    if (store().helpWindow.visible) store().closeHelp();
    else store().openHelp(DZ_TOPIC.flying);
};
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
    add('save-location', 'b', save, 'Save this place to My places', 'Places');
    add('save-location.shift', 'Shift+b', save, 'Save this place to My places (with Shift held for speed)', 'Places');
    add('home', 'Home', jumpHome, 'Jump to the place the app started with', 'Places');
    add('back', 'Backspace', jumpBack, 'Back to the place before the last jump', 'Places');
    add('dive', 'j', focusDiveField, 'Go to the "Dive to 1e-" field', 'Places');
    add('cancel', 'Escape', stopDive, 'Stop the dive in flight', 'Places', { when: () => useDive.getState().dive !== null });

    const keyframe = (): void => { setKeyframe(); };
    add('keyframe', 'k', keyframe, 'Add a keyframe to the route, after the last one (with the playhead on an earlier keyframe: that one takes this view)', 'Route');
    add('keyframe.shift', 'Shift+k', keyframe, 'Add a keyframe to the route (with Shift held for speed)', 'Route');

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

    // GMT's own key for it (grep `gmt.toggleAdvancedMode` in app-gmt/main.tsx). The same flag has
    // a row in Settings (deep-zoom/settings.ts): a key alone is a switch nobody can find.
    add('advanced-mode', '`', toggleAdvancedMode, 'Advanced mode on / off (shows the advanced rows of each tab and the Diagnostics tab)', 'View');
    add('camera-mode', 'Tab', toggleCameraMode, 'Camera mode: Fly / Orbit (with the picture focused: click it first)', 'View',
        { when: () => document.activeElement?.id === DZ_FRAME_ID });

    add('help', '/', toggleHelp, 'Help: open it, or close it', 'Help');
}
