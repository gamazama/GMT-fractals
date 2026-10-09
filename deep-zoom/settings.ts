/**
 * deep-zoom/settings.ts - this app's rows in the engine's Settings panel.
 *
 * The panel (`components/SettingsAccess.tsx`, opened by the gear in the top bar) lists whatever is
 * registered in `store/settingsRegistry.ts`. `registerCoreSettings` gives every app the theme rows;
 * these two are the engine-store preferences this shell reads and had no switch for:
 *
 *   Advanced mode    `store.advancedMode`. A feature param marked `isAdvanced` is drawn only while
 *                    it is on (grep `config.isAdvanced` in components/AutoFeaturePanel.tsx). GMT
 *                    switches it from its System menu and with the backtick key; this shell has no
 *                    System menu, and until 2026-10-08 had neither - the advanced rows of the
 *                    Quality tab could not be reached at all. The key is in hotkeys.ts.
 *   Invert look Y    `store.invertY`, read by the navigation (deep-zoom/DeepZoomNavigation.tsx).
 *
 * And the two numbers of the fly speed's rule (deep-zoom/flyPace.ts), which the owner sets in
 * flight; they live in deep-zoom/navigationState.ts, not in the engine store:
 *
 *   Speed follows the view   on (the default): the speed follows what is in the middle of the
 *                    picture and what lies ahead of the move. Off: the estimate at the camera, the
 *                    rule until 2026-10-09 - there to compare the two in flight.
 *   Speed rise limit         how fast the pace may grow, in decades a second.
 *
 * All are per device (localStorage), not per scene. Call once at boot, after `registerCoreSettings`.
 */
import { registerSetting } from '../store/settingsRegistry';
import { useEngineStore } from '../store/engineStore';
import { DZ_PACE_RISE_RANGE } from './flyPace';
import { setFollowView, setPaceRise, useDzNavigation } from './navigationState';

let registered = false;

export function registerDeepZoomSettings(): void {
    if (registered) return;
    registered = true;

    registerSetting({
        id: 'deep-zoom.advanced-mode',
        tab: 'Interface',
        section: 'General',
        label: 'Advanced mode',
        description: 'Shows the advanced rows of each tab (precision, BLA, the resolution cap). The backtick key switches it too.',
        control: { kind: 'boolean' },
        get: () => useEngineStore.getState().advancedMode,
        set: (v) => useEngineStore.getState().setAdvancedMode(!!v),
        subscribe: (cb) => useEngineStore.subscribe(cb),
        order: 0,
    });

    registerSetting({
        id: 'deep-zoom.invert-y',
        tab: 'Interface',
        section: 'Camera',
        label: 'Invert look Y',
        description: 'Inverts the vertical direction of a look drag on the picture.',
        control: { kind: 'boolean' },
        get: () => useEngineStore.getState().invertY,
        set: (v) => useEngineStore.getState().setInvertY(!!v),
        subscribe: (cb) => useEngineStore.subscribe(cb),
        order: 0,
    });

    registerSetting({
        id: 'deep-zoom.speed-follows-view',
        tab: 'Interface',
        section: 'Camera',
        label: 'Speed follows the view',
        description: 'The fly speed follows the distance to what is in the middle of the picture, and to what lies ahead of the move. Off: it follows the nearest surface in any direction, as it did before.',
        control: { kind: 'boolean' },
        get: () => useDzNavigation.getState().followView,
        set: (v) => setFollowView(!!v),
        subscribe: (cb) => useDzNavigation.subscribe(cb),
        order: 1,
    });

    registerSetting({
        id: 'deep-zoom.speed-rise-limit',
        tab: 'Interface',
        section: 'Camera',
        label: 'Speed rise limit',
        description: 'How fast the fly speed may grow when the view opens onto something farther away, in decades a second. Shift multiplies it by four. It always falls at once.',
        control: { kind: 'number', min: DZ_PACE_RISE_RANGE[0], max: DZ_PACE_RISE_RANGE[1], step: 0.5, unit: 'decades/s' },
        get: () => useDzNavigation.getState().paceRise,
        set: (v) => setPaceRise(Number(v)),
        subscribe: (cb) => useDzNavigation.subscribe(cb),
        order: 2,
        when: () => useDzNavigation.getState().followView,
    });
}
