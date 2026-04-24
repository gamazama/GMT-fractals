/**
 * PresetsFeature — the Presets tab.
 *
 * Carries no DDFS params of its own — the tab is a chip grid backed
 * by the 7 curated presets in `toy-fluid/presets.ts`. A customUI
 * component (`preset-grid`, registered in registerFeatures.ts) takes
 * the whole tab area. Applying a preset dispatches every affected
 * slice setter via `presets/apply.ts` and resets the fluid fields.
 *
 * Using a single no-op param is a workaround: AutoFeaturePanel only
 * renders a tab's customUI entries if the feature has at least one
 * param visible (or it skips the feature entirely). The `_anchor`
 * float is hidden, giving the customUI a parent to hang off.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

export const PresetsFeature: FeatureDefinition = {
    id: 'presets',
    name: 'Presets',
    category: 'Library',

    tabConfig: {
        label: 'Presets',
    },

    // Mounts PresetGrid as a top-level customUI (no parentId).
    customUI: [
        { componentId: 'preset-grid' },
    ],

    // Hidden anchor param — satisfies AutoFeaturePanel's "has at least
    // one param" assumption without showing any controls on the tab.
    params: {
        _anchor: {
            type: 'float',
            default: 0, min: 0, max: 1, step: 1,
            label: '',
            hidden: true,
        },
    },
};
