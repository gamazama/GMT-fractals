/**
 * coreSettings — registers engine-core preferences into the settingsRegistry.
 *
 * Called once at app boot (before the Settings panel can open). App-specific prefs
 * register from their own install paths; this covers the engine-core ones whose
 * source of truth lives in engine-core stores.
 *
 * @invariant Engine-core (store/) — host-agnostic; idempotent.
 */
import { registerSetting } from './settingsRegistry';
import { useAutosaveSettings } from '../engine/store/autosaveStore';

let registered = false;

export const registerCoreSettings = (): void => {
    if (registered) return;
    registered = true;

    registerSetting({
        id: 'autosave.enabled',
        section: 'Autosave',
        label: 'Autosave to browser',
        description: 'Periodically stash the current scene to local storage as a crash backstop.',
        control: { kind: 'boolean' },
        get: () => useAutosaveSettings.getState().enabled,
        set: (v) => useAutosaveSettings.getState().setEnabled(!!v),
        subscribe: (cb) => useAutosaveSettings.subscribe(cb),
        order: 0,
    });

    registerSetting({
        id: 'autosave.interval',
        section: 'Autosave',
        label: 'Autosave interval',
        description: 'How often to stash the scene, in seconds.',
        control: { kind: 'number', min: 5, max: 600, step: 5, unit: 'sec' },
        get: () => useAutosaveSettings.getState().intervalSec,
        set: (v) => useAutosaveSettings.getState().setIntervalSec(Number(v)),
        subscribe: (cb) => useAutosaveSettings.subscribe(cb),
        order: 1,
    });
};
