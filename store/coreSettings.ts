/**
 * coreSettings — registers engine-core preferences into the settingsRegistry.
 *
 * Called once at app boot (before the Settings panel can open). App-specific prefs
 * register from their own install paths; this covers the engine-core ones whose
 * source of truth lives in engine-core stores.
 *
 * @assumption Engine-core (store/) — host-agnostic; idempotent.
 */
import { createElement } from 'react';
import { registerSetting } from './settingsRegistry';
import { useAutosaveSettings, registerAutosaveSettings, type AutosaveSettingsStore, type AutosaveSettingsText } from '../engine/store/autosaveStore';
import { useColorScheme } from '../engine/store/colorSchemeStore';
import { AccentHueControl, SecondaryHueControl, SurfaceHueControl } from '../components/HueControl';
import { ThemePresetPicker, BrightnessControl } from '../components/ThemeControls';

let registered = false;

export interface CoreSettingsOptions {
    /** Which app's autosave the Files ▸ Autosave rows read and write. Default: app-gmt's
     *  (`useAutosaveSettings`, keys `gmt-autosave-*`). `null` registers no autosave rows. */
    autosave?: ({ store: AutosaveSettingsStore } & AutosaveSettingsText) | null;
    /** Interface ▸ Colour ▸ Secondary accent's description — WHAT wears the second accent is
     *  the app's to say (app-gmt: audio, modulation, Path Tracer; GX: Wallpaper's controls),
     *  so engine-core names no app's features. Default: "Hue of the second interface accent." */
    secondaryAccentDescription?: string;
}

export const registerCoreSettings = (opts: CoreSettingsOptions = {}): void => {
    if (registered) return;
    registered = true;

    // The theme is composed from axes (brightness + tint + contrast + hues), applied
    // across all GMT apps; fractal output and gradients are unaffected. The presets are
    // quick-picks that set the axes. Order groups: presets → brightness → toggles → hues.
    registerSetting({
        id: 'theme-presets',
        tab: 'Interface',
        section: 'Colour',
        label: 'Preset',
        control: { kind: 'custom', render: () => createElement(ThemePresetPicker) },
        order: 0,
    });

    registerSetting({
        id: 'brightness',
        tab: 'Interface',
        section: 'Colour',
        label: 'Brightness',
        description: 'Overall interface lightness, from near-black to near-white. Text inverts automatically for legibility.',
        control: { kind: 'custom', render: () => createElement(BrightnessControl) },
        order: 1,
    });

    registerSetting({
        id: 'surface-tint',
        tab: 'Interface',
        section: 'Colour',
        label: 'Surface tint',
        description: 'Give panel headers and sunken inputs a subtle colour tint.',
        control: { kind: 'boolean' },
        get: () => useColorScheme.getState().surfaceTint,
        set: (v) => useColorScheme.getState().setSurfaceTint(!!v),
        subscribe: (cb) => useColorScheme.subscribe(cb),
        order: 2,
    });

    registerSetting({
        id: 'surface-hue',
        tab: 'Interface',
        section: 'Colour',
        label: 'Tint hue',
        description: 'Hue of the surface tint.',
        control: { kind: 'custom', render: () => createElement(SurfaceHueControl) },
        // Only meaningful when the surface tint is on.
        when: () => useColorScheme.getState().surfaceTint,
        subscribe: (cb) => useColorScheme.subscribe(cb),
        order: 3,
    });

    registerSetting({
        id: 'high-contrast',
        tab: 'Interface',
        section: 'Colour',
        label: 'High contrast',
        description: 'Push surfaces to the extremes with a higher-contrast text ladder.',
        control: { kind: 'boolean' },
        get: () => useColorScheme.getState().highContrast,
        set: (v) => useColorScheme.getState().setHighContrast(!!v),
        subscribe: (cb) => useColorScheme.subscribe(cb),
        order: 4,
    });

    registerSetting({
        id: 'accent-hue',
        tab: 'Interface',
        section: 'Colour',
        label: 'Accent colour',
        description: 'Hue of the primary interface accent.',
        control: { kind: 'custom', render: () => createElement(AccentHueControl) },
        order: 5,
    });

    registerSetting({
        id: 'secondary-hue',
        tab: 'Interface',
        section: 'Colour',
        label: 'Secondary accent',
        description: opts.secondaryAccentDescription ?? 'Hue of the second interface accent.',
        control: { kind: 'custom', render: () => createElement(SecondaryHueControl) },
        order: 6,
    });

    // Files ▸ Autosave, for THIS app's store (keys are per app — engine/store/autosaveStore.ts).
    // `null` = the app has no autosave, so no rows that would do nothing.
    if (opts.autosave !== null) {
        const a = opts.autosave ?? { store: useAutosaveSettings };
        registerAutosaveSettings(a.store, a);
    }
};
