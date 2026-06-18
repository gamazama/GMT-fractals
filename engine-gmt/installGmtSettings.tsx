import React from 'react';
import { registerSetting } from '../store/settingsRegistry';
import { useEngineStore } from '../store/engineStore';
import { HardwarePrefsControls } from './components/panels/HardwarePreferences';

let registered = false;

const UI_MODE_OPTIONS = [
    { value: 'auto', label: 'Auto (detect by device)' },
    { value: 'mobile', label: 'Force Mobile' },
    { value: 'desktop', label: 'Force Desktop' },
] as const;

/**
 * registerGmtSettings — registers GMT-specific preferences into the settingsRegistry
 * so they appear in the unified Settings panel. Idempotent; called once at app boot.
 *
 * Hardware caps register as a `custom` section (not immediate-write descriptors)
 * because they're staged-until-Apply — each change forces a shader recompile.
 * The interface/camera prefs migrated here from the System menu.
 */
export const registerGmtSettings = (): void => {
    if (registered) return;
    registered = true;

    registerSetting({
        id: 'ui-mode',
        section: 'Interface',
        label: 'Layout',
        description: 'Force mobile/desktop layout, or auto-detect by device.',
        control: { kind: 'enum', options: UI_MODE_OPTIONS },
        get: () => useEngineStore.getState().uiModePreference,
        set: (v) => useEngineStore.getState().setUiModePreference(v as 'auto' | 'mobile' | 'desktop'),
        subscribe: (cb) => useEngineStore.subscribe(cb),
        order: 0,
    });

    registerSetting({
        id: 'invert-y',
        section: 'Camera',
        label: 'Invert look Y',
        description: 'Invert vertical mouse-look direction in Fly camera mode.',
        control: { kind: 'boolean' },
        get: () => useEngineStore.getState().invertY,
        set: (v) => useEngineStore.getState().setInvertY(!!v),
        subscribe: (cb) => useEngineStore.subscribe(cb),
        order: 0,
    });

    registerSetting({
        id: 'hardware',
        section: 'Hardware',
        label: '',
        control: { kind: 'custom', render: () => <HardwarePrefsControls /> },
        order: 0,
    });
};
