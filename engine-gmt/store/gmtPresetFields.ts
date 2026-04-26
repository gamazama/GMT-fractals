/**
 * GMT-specific preset field registrations — side-effect only.
 *
 * Must be imported in main.tsx BEFORE any import that triggers store
 * construction (i.e. before component / store imports), exactly like
 * engine/plugins/camera/presetField.ts.
 *
 * Registers the top-level `lights` field: old-format presets (all formula
 * defaultPresets) store the lights array at preset.lights rather than
 * preset.features.lighting.lights. Without this handler applyPresetState
 * ignores it and DEFAULT_LIGHTS are used instead.
 */

import { presetFieldRegistry } from '../../utils/PresetFieldRegistry';

presetFieldRegistry.register({
    key: 'lights',
    serialize: () => undefined,
    deserialize: (p: any, _set: any, getStore: any) => {
        if (!Array.isArray(p.lights) || p.lights.length === 0) return;
        const setter = getStore()?.setLighting;
        if (typeof setter === 'function') setter({ lights: p.lights });
    },
});
