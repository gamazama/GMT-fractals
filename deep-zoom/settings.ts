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
 * Both are per device (the store keeps them in localStorage under GMT's own keys), not per scene.
 * Call once at boot, after `registerCoreSettings`.
 */
import { registerSetting } from '../store/settingsRegistry';
import { useEngineStore } from '../store/engineStore';

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
}
