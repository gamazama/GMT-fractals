/**
 * PaletteEditorFeature — the Stops mode's dock tab.
 *
 * Unlike the other palette modes, this feature has NO DDFS params: the authored
 * gradient is a structured document held in paletteEditorStore (a stop array,
 * not scalar dials), so the slice would be empty either way. The feature exists
 * only to (a) own the right-dock "Stops" tab and (b) host the document-level
 * inspector as its dock content (the `palette-editor-dock` custom UI) — which
 * keeps the tab from being a dead empty panel (polish T5).
 *
 * The per-stop inspector (colour / interpolation / position / bias) lives inside
 * the engine AdvancedGradientEditor on the centre stage (EditorStage); the
 * DOCUMENT-level controls (blend space, output colour space, count, favourite,
 * reset) are the dock content here. Clean split: per-stop on the canvas,
 * whole-gradient in the dock.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

export const PaletteEditorFeature: FeatureDefinition = {
    id: 'paletteEditor',
    name: 'Stops',
    category: 'Palette',
    tabConfig: { label: 'Stops' },

    // No scalar dials — the gradient document lives in paletteEditorStore.
    params: {},

    // Dock content = the document-level inspector (so the tab isn't empty).
    customUI: [{ componentId: 'palette-editor-dock' }],
};
