/**
 * Host-agnostic registration seam for the palette tools.
 *
 * Call this from a host app's side-effect `registerFeatures.ts` (the standalone
 * Palette Studio OR an app-gmt panel) BEFORE the engine store is constructed —
 * the feature + component registries freeze on first store access.
 *
 * Keeping registration in one exported function (rather than module side-effects)
 * lets each host control timing while sharing the exact same feature defs +
 * custom-UI components. This is the "both in lockstep" seam: one definition,
 * two hosts.
 */

import { featureRegistry } from '../engine/FeatureSystem';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { PaletteFiltersFeature } from './features/paletteFilters';
import { PaletteGeneratorFeature } from './features/paletteGenerator';
import { PaletteImageFeature } from './features/paletteImage';
import { QualityRangePadConnected } from './components/QualityRangePadConnected';
import { PickerThemeChips, PickerBundleToggles } from './components/PickerControls';
import { GeneratorExtrasPanel } from './components/GeneratorExtrasPanel';
import { NoiseTargetsControl } from './components/NoiseTargetsControl';
import { ModifyTogglesControl } from './components/ModifyTogglesControl';
import { ImageExtrasPanel } from './components/ImageExtrasPanel';
import { FavientsPanel } from './components/FavientsPanel';
import { useFavientsStore } from './store/favientsStore';
import { GRADIENT_PRESETS } from '../data/gradientPresets';
import type { GradientConfig } from '../types';

export const registerPaletteUI = (): void => {
  // Custom-UI components must be registered before the registries freeze, and
  // QualityRangePadConnected does not touch useEngineStore at module scope, so
  // it is safe to register here (pre-store).
  componentRegistry.register('palette-quality-pad', QualityRangePadConnected);
  // Picker dock tab: theme chips + source (bundle) toggles (read pickerStore).
  componentRegistry.register('palette-theme-chips', PickerThemeChips);
  componentRegistry.register('palette-bundle-toggles', PickerBundleToggles);
  // Generator dock tab: the dials are native DDFS params; this is the bottom
  // actions + export block (uses the shared generatorStore, not the slice).
  componentRegistry.register('palette-generator-extras', GeneratorExtrasPanel);
  componentRegistry.register('palette-noise-targets', NoiseTargetsControl);
  componentRegistry.register('palette-modify-toggles', ModifyTogglesControl);
  // Image dock tab: export suite (the dials are native DDFS params).
  componentRegistry.register('palette-image-extras', ImageExtrasPanel);
  // Favients — the persistent gradient-favourites shelf (floating panel). The
  // component is host-agnostic; each host registers its own apply targets.
  componentRegistry.register('panel-favients', FavientsPanel);

  // One feature per studio mode — each owns a dock tab; the centre stage mirrors
  // whichever tab is active (see PaletteStudioApp).
  featureRegistry.register(PaletteGeneratorFeature);
  featureRegistry.register(PaletteFiltersFeature);
  featureRegistry.register(PaletteImageFeature);

  // Seed the Favients shelf with the built-in presets (a "Presets" group) on first
  // run, so a new user has starter gradients. One-time — never re-seeds after edits.
  useFavientsStore.getState().seedPresets(
    GRADIENT_PRESETS.map((p): { name: string; config: GradientConfig } => ({
      name: p.name,
      config: { stops: p.stops, colorSpace: 'srgb', blendSpace: 'oklab' },
    })),
    'g-presets',
    'Presets',
  );
};
