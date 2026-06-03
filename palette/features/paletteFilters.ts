/**
 * PaletteFiltersFeature — the Picker dock panel. All controls are DDFS so they render
 * with native GMT chrome via AutoFeaturePanel:
 *   • five dual-range "quality" windows (hidden vec2 params → custom QualityRangePad).
 *   • Group by (Category/Source) + Sort within + Reverse — group and sort are
 *     INDEPENDENT (PickerStage applies a COMPOUND sort: primary = group, secondary =
 *     sort), so grouping by category never blocks in-category sorting.
 *   • Swatch size + Padding (wall zoom/spacing).
 *   • Theme chips + Source (bundle) load/unload — custom-UI components.
 *
 * Selection state (selected themes, hidden bundles) lives in this slice's `state`;
 * the loaded catalog itself lives in pickerStore.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import { defineEnumParam } from '../../engine/defineEnumParam';

/** Catalog quality axes — param key, lo/hi labels, track painter id, hint. Order = display order. */
export const QUALITY_AXES = [
  { axis: 'qL', loLabel: 'dark', hiLabel: 'light', track: 'lightness', hint: 'Overall lightness — keep dark moody ramps or bright airy ones.' },
  { axis: 'qC', loLabel: 'muted', hiLabel: 'vivid', track: 'chroma', hint: 'Colourfulness — greyish/muted through to vivid saturated.' },
  { axis: 'qCov', loLabel: 'simple', hiLabel: 'complex', track: 'complexity', hint: 'Complexity — smooth simple ramps through to busy multi-stop gradients.' },
  { axis: 'qRb', loLabel: 'single-hue', hiLabel: 'rainbow', track: 'rainbow', hint: 'Hue coverage — single-hue through to full rainbow spread.' },
  { axis: 'qWarm', loLabel: 'cool', hiLabel: 'warm', track: 'warmth', hint: 'Colour temperature — cool blues through to warm reds/oranges.' },
] as const;

// Three independent axes (see PickerStage):
//   • Group by — Category/Source → top-level bands.
//   • Rows by  — a facet bucketed into sub-rows WITHIN each group.
//   • Sort within — orders the columns within each row.
export const groupByParam = defineEnumParam(['none', 'theme', 'bundle'] as const, 'Group by', {
  defaultIndex: 1, // Category
  optionLabels: { none: 'None', theme: 'Category', bundle: 'Source' },
  optionHints: {
    none: 'No category grouping.',
    theme: 'Top-level bands by semantic theme (rainbow, fire, ocean…).',
    bundle: 'Top-level bands by source library.',
  },
});
export const GROUP_BY = groupByParam.values;
export const groupByFromIndex = groupByParam.fromIndex;

export const rowsByParam = defineEnumParam(
  ['none', 'lightness', 'vividness', 'complexity', 'rainbow', 'warmth', 'hue'] as const,
  'Rows by',
  {
    defaultIndex: 1, // Lightness
    optionLabels: { none: 'None', lightness: 'Lightness', vividness: 'Vividness', complexity: 'Complexity', rainbow: 'Rainbow', warmth: 'Warmth', hue: 'Hue' },
    optionHints: {
      none: 'One row band per group.',
      lightness: 'Sub-rows bucketed by lightness within each group; columns sorted independently.',
    },
  },
);
export const ROWS_BY = rowsByParam.values;
export const rowsByFromIndex = rowsByParam.fromIndex;

export const sortByParam = defineEnumParam(
  ['lightness', 'vividness', 'complexity', 'rainbow', 'warmth', 'hue', 'name'] as const,
  'Sort within',
  { defaultIndex: 5, // Hue
    optionLabels: { lightness: 'Lightness', vividness: 'Vividness', complexity: 'Complexity', rainbow: 'Rainbow', warmth: 'Warmth', hue: 'Hue', name: 'Name' } },
);
export const SORT_BY = sortByParam.values;
export const sortByFromIndex = sortByParam.fromIndex;

const fullRange = { x: 0, y: 1 };

const padParams = Object.fromEntries(
  QUALITY_AXES.map(({ axis, loLabel, hiLabel }) => [
    axis,
    {
      type: 'vec2' as const,
      default: { ...fullRange },
      min: 0,
      max: 1,
      step: 0.01,
      label: `${loLabel} ↔ ${hiLabel}`,
      hidden: true, // rendered by the custom pad, not the default vec2 input
    },
  ]),
);

export const PaletteFiltersFeature: FeatureDefinition = {
  id: 'paletteFilters',
  name: 'Quality filters',
  category: 'Palette',

  tabConfig: { label: 'Filters' },

  params: {
    groupBy: groupByParam.config,
    rowsBy: rowsByParam.config,
    sortBy: sortByParam.config,
    reverse: { type: 'boolean', default: false, label: 'Reverse order' },
    swatchSize: {
      type: 'vec2', default: { x: 32, y: 18 }, min: 8, max: 320, step: 2,
      label: 'Swatch size', description: 'Width × height of each gradient swatch (px).',
    },
    paddingSize: { type: 'float', default: 1, min: 0, max: 40, step: 1, label: 'Padding', description: 'Gap between swatches (px).' },
    ...padParams,
  },

  state: {
    /** Selected themes (empty = all). */
    activeThemes: [] as string[],
    /** Bundles toggled off (empty = all loaded). */
    hiddenBundles: [] as string[],
  },

  customUI: [
    ...QUALITY_AXES.map(({ axis, loLabel, hiLabel, track, hint }) => ({
      componentId: 'palette-quality-pad',
      props: { axis, loLabel, hiLabel, track, hint },
    })),
    { componentId: 'palette-theme-chips' },
    { componentId: 'palette-bundle-toggles' },
  ],
};
