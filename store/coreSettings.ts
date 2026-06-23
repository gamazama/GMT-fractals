/**
 * coreSettings — registers engine-core preferences into the settingsRegistry.
 *
 * Called once at app boot (before the Settings panel can open). App-specific prefs
 * register from their own install paths; this covers the engine-core ones whose
 * source of truth lives in engine-core stores.
 *
 * @invariant Engine-core (store/) — host-agnostic; idempotent.
 */
import { createElement } from 'react';
import { registerSetting } from './settingsRegistry';
import { useAutosaveSettings } from '../engine/store/autosaveStore';
import { useColorScheme, COLOR_SCHEMES, type ColorScheme } from '../engine/store/colorSchemeStore';
import { AccentHueControl, SecondaryHueControl } from '../components/HueControl';

let registered = false;

export const registerCoreSettings = (): void => {
    if (registered) return;
    registered = true;

    registerSetting({
        id: 'color-scheme',
        tab: 'Interface',
        section: 'Colour',
        label: 'Color scheme',
        description: 'Recolor the entire interface. Applies across all GMT apps; fractal output and gradients are unaffected.',
        control: { kind: 'enum', options: COLOR_SCHEMES.map((s) => ({ value: s.value, label: s.label })) },
        get: () => useColorScheme.getState().scheme,
        set: (v) => useColorScheme.getState().setScheme(v as ColorScheme),
        subscribe: (cb) => useColorScheme.subscribe(cb),
        order: 0,
    });

    registerSetting({
        id: 'accent-hue',
        tab: 'Interface',
        section: 'Colour',
        label: 'Accent colour',
        description: 'Hue of the primary interface accent. Applies on top of any colour scheme.',
        control: { kind: 'custom', render: () => createElement(AccentHueControl) },
        order: 1,
    });

    registerSetting({
        id: 'secondary-hue',
        tab: 'Interface',
        section: 'Colour',
        label: 'Secondary accent',
        description: 'Hue of the secondary accent (audio, modulation, Path Tracer).',
        control: { kind: 'custom', render: () => createElement(SecondaryHueControl) },
        order: 2,
    });

    registerSetting({
        id: 'autosave.enabled',
        tab: 'Files',
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
        tab: 'Files',
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
