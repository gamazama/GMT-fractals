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
      vividness: 'Sub-rows bucketed by colourfulness — muted up top, vivid below.',
      complexity: 'Sub-rows bucketed by complexity — simple ramps to busy multi-stop.',
      rainbow: 'Sub-rows bucketed by hue coverage — single-hue to full rainbow.',
      warmth: 'Sub-rows bucketed by temperature — cool to warm.',
      hue: 'Sub-rows bucketed by mean hue, sweeping the colour wheel.',
    },
  },
);
export const ROWS_BY = rowsByParam.values;
export const rowsByFromIndex = rowsByParam.fromIndex;

export const sortByParam = defineEnumParam(
  ['lightness', 'vividness', 'complexity', 'rainbow', 'warmth', 'hue', 'name'] as const,
  'Sort within',
  { defaultIndex: 5, // Hue
    optionLabels: { lightness: 'Lightness', vividness: 'Vividness', complexity: 'Complexity', rainbow: 'Rainbow', warmth: 'Warmth', hue: 'Hue', name: 'Name' },
    optionHints: {
      lightness: 'Order each row dark → light.',
      vividness: 'Order each row muted → vivid.',
      complexity: 'Order each row simple → complex.',
      rainbow: 'Order each row single-hue → rainbow.',
      warmth: 'Order each row cool → warm.',
      hue: 'Order each row around the colour wheel.',
      name: 'Order each row alphabetically by name.',
    } },
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
      group: 'quality',
    },
  ]),
);

// Section groups (used by the mobile Picker controls to render three collapsible
// sections). No `groupConfigs` on the feature, so the desktop dock panel still
// renders flat — these tags only take effect when an AutoFeaturePanel passes a
// matching `groupFilter` (see GradientExplorerApp's MobilePickerControls).
const G_ARRANGE = 'arrange';
const G_SOURCES = 'sources';

export const PaletteFiltersFeature: FeatureDefinition = {
  id: 'paletteFilters',
  name: 'Quality filters',
  category: 'Palette',

  tabConfig: { label: 'Filters' },

  params: {
    groupBy: { ...groupByParam.config, group: G_ARRANGE },
    rowsBy: { ...rowsByParam.config, group: G_ARRANGE },
    sortBy: { ...sortByParam.config, group: G_ARRANGE },
    reverse: { type: 'boolean', default: false, label: 'Reverse order', group: G_ARRANGE },
    swatchSize: {
      type: 'vec2', default: { x: 32, y: 18 }, min: 8, max: 320, step: 2,
      label: 'Swatch size', description: 'Width × height of each gradient swatch (px).', group: G_ARRANGE,
    },
    paddingSize: { type: 'float', default: 0, min: 0, max: 40, step: 1, label: 'Padding', description: 'Gap between swatches (px). 0 = flush.', group: G_ARRANGE },
    ...padParams,
  },

  state: {
    /** Selected themes (empty = all). */
    activeThemes: [] as string[],
    /** Bundles toggled off (empty = all loaded). */
    hiddenBundles: [] as string[],
    /**
     * Spatial-selection carve: the surviving entry ids, or null for no carve filter.
     * Transient by design (NOT persisted — see paletteFiltersPersist) so a stale id-set
     * never silently hides gradients after a catalog reload. Set via the Picker wall's
     * Lasso/Rect/Paint tools; cleared from the hero "kept · clear" button.
     */
    keptIds: null as string[] | null,
  },

  customUI: [
    ...QUALITY_AXES.map(({ axis, loLabel, hiLabel, track, hint }) => ({
      componentId: 'palette-quality-pad',
      props: { axis, loLabel, hiLabel, track, hint },
      group: 'quality',
    })),
    // Sources (which libraries are loaded) is the panel's primary input, so
    // lift it above the params/quality pads to the top of the Filters panel.
    { componentId: 'palette-bundle-toggles', placement: 'top', group: G_SOURCES },
    { componentId: 'palette-theme-chips', group: G_SOURCES },
  ],
};
