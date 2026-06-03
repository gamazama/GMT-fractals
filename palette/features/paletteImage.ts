/**
 * PaletteImageFeature — the Image dock tab's DIALS, as real DDFS params.
 *
 * Mode (Distill / Tone / Trace) is an int param with `options`, so AutoFeaturePanel
 * renders it as the GMT GenericDropdown — and the canvas mode tabs (ImageStage) bind
 * the SAME slice param, so the two stay in sync. Per-mode params use `dynamicVisible`
 * to show only the controls relevant to the active mode; the shared shape controls
 * (golden hour, even↔dwell) hide in Trace (no-ops there), mirroring the standalone.
 *
 * Heavy/structured state (the ImageModel, the Trace path, the export format) lives in
 * the imageStore. Export + "Send to Generator A/B" are the bottom custom-UI block
 * (`palette-image-extras`).
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

const isDistill = (s: Record<string, any>) => (s.mode ?? 0) === 0;
const isTone = (s: Record<string, any>) => (s.mode ?? 0) === 1;
const notTrace = (s: Record<string, any>) => (s.mode ?? 0) !== 2;

export const PaletteImageFeature: FeatureDefinition = {
  id: 'paletteImage',
  name: 'Image',
  category: 'Palette',
  tabConfig: { label: 'Image' },

  params: {
    mode: {
      type: 'int',
      default: 0,
      label: 'Mode',
      description: 'Distill = dominant colours · Tone = colour-by-brightness · Trace = a line through the image.',
      options: [
        { label: 'Distill', value: 0, hint: 'Saliency-weighted dominant colours, ordered into a smooth ramp.' },
        { label: 'Tone', value: 1, hint: "The image's own colour at each brightness level. Unfakeably smooth." },
        { label: 'Trace', value: 2, hint: 'The colour journey along a line. Drag the handles on the image.' },
      ],
    },

    // Distill
    colours: {
      type: 'int', default: 8, min: 3, max: 16, step: 1, label: 'Colours',
      description: 'How many dominant colours to distill.',
      dynamicVisible: isDistill,
    },
    saliency: {
      type: 'float', default: 0.45, min: 0, max: 1, step: 0.01, label: 'Frequency ↔ saliency',
      description: '← common colours · standout colours →',
      dynamicVisible: isDistill,
    },

    // Tone
    tonalDetail: {
      type: 'int', default: 48, min: 8, max: 96, step: 1, label: 'Tonal detail',
      description: 'Number of brightness buckets along the spine.',
      dynamicVisible: isTone,
    },
    chromaBoost: {
      type: 'float', default: 1, min: 0.4, max: 2, step: 0.01, label: 'Chroma boost',
      description: 'Vividness of the tonal spine.',
      dynamicVisible: isTone,
    },

    // Trace
    bandWidth: {
      type: 'int', default: 8, min: 1, max: 30, step: 1, label: 'Band width',
      description: 'Width of the perpendicular sampling band.',
      dynamicVisible: (s) => (s.mode ?? 0) === 2,
    },
    smoothing: {
      type: 'int', default: 3, min: 0, max: 12, step: 1, label: 'Smoothing',
      description: 'Smooth the sampled colour journey along its length.',
      dynamicVisible: (s) => (s.mode ?? 0) === 2,
    },

    // Shared shape (golden hour + even↔dwell are no-ops in Trace → hidden there)
    goldenHour: {
      type: 'float', default: 0, min: -1, max: 1, step: 0.01, label: 'Golden hour',
      description: '← shadows · highlights →',
      dynamicVisible: notTrace,
    },
    spacing: {
      type: 'float', default: 0.35, min: 0, max: 1, step: 0.01, label: 'Even ↔ dwell',
      description: 'Even spacing ↔ linger on the dominant colours.',
      dynamicVisible: notTrace,
    },

    reverse: {
      type: 'boolean', default: false, label: 'Reverse',
      description: 'Flip the extracted gradient.',
    },
  },

  customUI: [
    // Bottom block: export suite + "Send to Generator A/B" (the img2grad → generator merge).
    { componentId: 'palette-image-extras' },
  ],
};

/** Param defaults (mirrors the values above) for any reset path. */
export const IMAGE_PARAM_DEFAULTS_FEATURE: Record<string, number | boolean> = {
  mode: 0, colours: 8, saliency: 0.45, tonalDetail: 48, chromaBoost: 1,
  bandWidth: 8, smoothing: 3, goldenHour: 0, spacing: 0.35, reverse: false,
};
