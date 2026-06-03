/**
 * PaletteGeneratorFeature — the Generator dock tab's DIALS, as real DDFS params.
 *
 * Every dial is a native DDFS param so AutoFeaturePanel renders it with the
 * proper GMT components (ScalarInput sliders, ToggleSwitch for booleans) inside
 * the tabbed panel — and they ride undo / preset / animation for free. Grouped
 * into collapsible sections (Slot A/B modifiers, Mix, Modify, Noise).
 *
 * What is NOT here (by design):
 *   • Source gradient SELECTION → a searchable picker on the canvas (11k-scale,
 *     can't be a 24-option dropdown), state in generatorStore.
 *   • Channel-curve editor + its fit controls → the canvas (curves are a visual
 *     editing surface), Track[] state in generatorStore.
 *   • Reset-all / reseed / export → the `palette-generator-extras` custom-UI
 *     (buttons + a GMT Dropdown), pinned at the bottom of the panel.
 *
 * The pipeline reads these params from the feature slice (useGeneratorDerived).
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

// Per-slot mods are HIDDEN params: they ride undo/preset like any DDFS param,
// but render on the CANVAS next to each source gradient (GeneratorSlotMods), not
// in this panel.
const slotMods = (which: 'A' | 'B') => {
  const p = which.toLowerCase();
  return {
    [`${p}HueRotate`]: { type: 'float' as const, default: 0, min: -180, max: 180, step: 1, hidden: true, label: `Slot ${which} hue rotate` },
    [`${p}Chroma`]: { type: 'float' as const, default: 1, min: 0, max: 2.5, step: 0.01, hidden: true, label: `Slot ${which} chroma` },
    [`${p}Contrast`]: { type: 'float' as const, default: 1, min: 0.2, max: 2.5, step: 0.01, hidden: true, label: `Slot ${which} contrast` },
    [`${p}Reverse`]: { type: 'boolean' as const, default: false, hidden: true, label: `Slot ${which} reverse` },
    [`${p}Repeats`]: { type: 'int' as const, default: 1, min: 1, max: 8, step: 1, hidden: true, label: `Slot ${which} repeats` },
    [`${p}Phase`]: { type: 'float' as const, default: 0, min: 0, max: 1, step: 0.01, hidden: true, label: `Slot ${which} phase` },
    [`${p}Mirror`]: { type: 'boolean' as const, default: false, hidden: true, label: `Slot ${which} mirror` },
  };
};

export const PaletteGeneratorFeature: FeatureDefinition = {
  id: 'paletteGenerator',
  name: 'Generator',
  category: 'Palette',
  tabConfig: { label: 'Generator' },

  groups: {
    Mix: { label: 'Mix A ↔ B', collapsible: true, description: 'Per-channel blend: take lightness from one source, hue from another.' },
    Modify: { label: 'Modify', collapsible: true, description: 'Global modifier chain applied to the mixed result.' },
    Noise: { label: 'Noise', collapsible: true, description: 'High-frequency grain added to the result.' },
  },

  params: {
    ...slotMods('A'),
    ...slotMods('B'),

    // Mix A ↔ B (0 = all A, 1 = all B)
    mixL: { type: 'float', default: 0, min: 0, max: 1, step: 0.01, group: 'Mix', label: 'Lightness (L)', description: 'Blend the light/dark structure A↔B.' },
    mixC: { type: 'float', default: 0, min: 0, max: 1, step: 0.01, group: 'Mix', label: 'Chroma (C)', description: 'Blend the vividness A↔B.' },
    mixH: { type: 'float', default: 0, min: 0, max: 1, step: 0.01, group: 'Mix', label: 'Hue (h)', description: 'Blend the colours A↔B.' },

    // Global modifiers
    hueRotate: { type: 'float', default: 0, min: -180, max: 180, step: 1, group: 'Modify', label: 'Hue rotate', description: 'Rotate the whole gradient hue (degrees).' },
    chroma: { type: 'float', default: 1, min: 0, max: 2.5, step: 0.01, group: 'Modify', label: 'Chroma ×', description: 'Scale colourfulness (0 = greyscale).' },
    contrast: { type: 'float', default: 1, min: 0.2, max: 2.5, step: 0.01, group: 'Modify', label: 'Contrast', description: 'Contrast lightness around mid.' },
    bands: { type: 'int', default: 0, min: 0, max: 16, step: 1, group: 'Modify', label: 'Posterize bands', description: 'Quantize into N colour bands (0 = off).' },
    repeats: { type: 'int', default: 1, min: 1, max: 8, step: 1, group: 'Modify', label: 'Repeats', description: 'Tile the gradient N times.' },
    phase: { type: 'float', default: 0, min: 0, max: 1, step: 0.01, group: 'Modify', label: 'Phase', description: 'Offset the gradient along t.' },
    // mirror/reverse are hidden — shown as one inline toggle pair (ModifyTogglesControl) nested under Phase.
    mirror: { type: 'boolean', default: false, hidden: true, label: 'Mirror', description: 'Ping-pong the gradient (seamless tile).' },
    reverse: { type: 'boolean', default: false, hidden: true, label: 'Reverse output', description: 'Flip the mixed result.' },

    // Noise
    noise: { type: 'float', default: 0, min: 0, max: 1, step: 0.01, group: 'Noise', label: 'Amount', description: 'Grain strength.' },
    noiseFreq: { type: 'int', default: 32, min: 1, max: 128, step: 1, group: 'Noise', label: 'Frequency', description: 'Grain coarseness (smaller = coarser).' },
    // Targets are hidden — rendered inline (NoiseTargetsControl) nested under
    // Frequency via the customUI parentId below, instead of 3 full toggle rows.
    noiseL: { type: 'boolean', default: true, hidden: true, label: 'Noise → lightness' },
    noiseC: { type: 'boolean', default: false, hidden: true, label: 'Noise → chroma' },
    noiseH: { type: 'boolean', default: false, hidden: true, label: 'Noise → hue' },
  },

  customUI: [
    // Inline mirror/reverse toggles, nested in the Modify group under Phase.
    { componentId: 'palette-modify-toggles', group: 'Modify', parentId: 'phase' },
    // Inline lightness/chroma/hue toggles, nested in the Noise group under Frequency.
    { componentId: 'palette-noise-targets', group: 'Noise', parentId: 'noiseFreq' },
    // Bottom block: Reset all / Reseed / Export.
    { componentId: 'palette-generator-extras' },
  ],
};

/** The param defaults, for resetAll (mirrors the values above). */
export const GENERATOR_PARAM_DEFAULTS: Record<string, number | boolean> = {
  aHueRotate: 0, aChroma: 1, aContrast: 1, aReverse: false, aRepeats: 1, aPhase: 0, aMirror: false,
  bHueRotate: 0, bChroma: 1, bContrast: 1, bReverse: false, bRepeats: 1, bPhase: 0, bMirror: false,
  mixL: 0, mixC: 0, mixH: 0,
  hueRotate: 0, chroma: 1, contrast: 1, bands: 0, repeats: 1, phase: 0, mirror: false, reverse: false,
  noise: 0, noiseFreq: 32, noiseL: true, noiseC: false, noiseH: false,
};
