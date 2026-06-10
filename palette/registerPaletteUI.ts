/**
 * Host-agnostic registration seam for the palette tools.
 *
 * Call this from a host app's side-effect `registerFeatures.ts` (the standalone
 * GMT Gradient Explorer OR an app-gmt panel) BEFORE the engine store is constructed —
 * the feature + component registries freeze on first store access.
 *
 * Keeping registration in one exported function (rather than module side-effects)
 * lets each host control timing while sharing the exact same feature defs +
 * custom-UI components. This is the "both in lockstep" seam: one definition,
 * two hosts.
 */

import React from 'react';
import { featureRegistry } from '../engine/FeatureSystem';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { PaletteFiltersFeature } from './features/paletteFilters';
import { PaletteGeneratorFeature } from './features/paletteGenerator';
import { PaletteImageFeature } from './features/paletteImage';
import { PaletteEditorFeature } from './features/paletteEditor';
import { QualityRangePadConnected } from './components/QualityRangePadConnected';
import { PickerThemeChips, PickerBundleToggles } from './components/PickerControls';
import { GeneratorExtrasPanel } from './components/GeneratorExtrasPanel';
import { GeneratorModifierActions } from './components/GeneratorModifierActions';
import { NoiseTargetsControl } from './components/NoiseTargetsControl';
import { ModifyTogglesControl } from './components/ModifyTogglesControl';
import { ImageExtrasPanel } from './components/ImageExtrasPanel';
import { FavientsPanel } from './components/FavientsPanel';
import { FavientsEditorEntrance } from './components/FavientsEditorEntrance';
import { StopsDockPanel } from './components/StopsDockPanel';
import { useFavientsStore, captureFavientsHistory, restoreFavientsHistory } from './store/favientsStore';
import { captureGeneratorHistory, restoreGeneratorHistory } from './store/generatorStore';
import { captureEditorConfig, applyEditorConfig } from './store/paletteEditorStore';
import { serializeFavientsDocument, restoreFavientsDocument } from './store/favientsDocument';
import { serializeGeneratorDocument, restoreGeneratorDocument } from './store/generatorDocument';
import { serializeImageDocument, restoreImageDocument } from './store/imageDocument';
import { registerHistoryProvider } from '../store/slices/historySlice';
import { registerDocumentProvider } from '../store/documentRegistry';
import { setGradientEditorEntrance } from '../components/gradient/gradientEditorEntrance';
import { GRADIENT_PRESETS } from '../data/gradientPresets';
import type { GradientConfig } from '../types';

export const registerPaletteUI = (opts: { standaloneStopsMode?: boolean } = {}): void => {
  // standaloneStopsMode — register the standalone "Stops" MODE tab (PaletteEditorFeature).
  // The gradient-explorer studio folds Stops into the Generator's Stops sub-mode and opts
  // OUT; app-gmt keeps the separate tab (default true). Either way the engine stops store
  // (paletteEditorStore) + its 'paletteEditor' history / 'stops' document providers + the
  // 'palette-editor-dock' controls stay registered (the Generator hosts the dock when the
  // tab is off) — only the extra mode tab is conditional.
  const { standaloneStopsMode = true } = opts;
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
  componentRegistry.register('palette-modifier-actions', GeneratorModifierActions);
  componentRegistry.register('palette-noise-targets', NoiseTargetsControl);
  componentRegistry.register('palette-modify-toggles', ModifyTogglesControl);
  // Image dock tab: export suite (the dials are native DDFS params).
  componentRegistry.register('palette-image-extras', ImageExtrasPanel);
  // Favients — the persistent gradient-favourites shelf (floating panel). The
  // component is host-agnostic; each host registers its own apply targets.
  componentRegistry.register('panel-favients', FavientsPanel);
  // Stops mode dock content: the document-level inspector (blend / output space /
  // count / favourite / reset). The per-stop inspector is the engine editor on
  // the centre stage; this keeps the "Stops" tab from being a dead empty panel.
  componentRegistry.register('palette-editor-dock', StopsDockPanel);

  // The Stops editor's header Favients entrance (engine-core can't import palette,
  // so it renders whatever a host injects through this seam). Registering it here
  // means every host that mounts the palette suite gets the entrance, and hosts
  // that don't (fluid-toy) leave the slot empty — the old `hasFavients` behaviour.
  setGradientEditorEntrance({ id: 'favients', render: () => React.createElement(FavientsEditorEntrance) });

  // The generator's non-DDFS state (curve Track[], slot selection, fit dials) lives in
  // its own store, so register it as a PARAM-undo history provider — curves + slots now
  // ride Ctrl+Z alongside the DDFS dials. Idempotent (Map keyed by id).
  registerHistoryProvider('paletteGenerator', { capture: captureGeneratorHistory, restore: restoreGeneratorHistory });

  // The favients shelf is a plain zustand store + localStorage (no engine-store
  // mirror), so register it as a PARAM-undo history provider too — favourite
  // mutations bracketed at the panel gesture boundary (remove, drag reorder/insert,
  // group rename, Clear, collection load, gradient-file Import) ride Ctrl+Z. The
  // provider's restore writes through to localStorage so undo stays coherent with
  // disk. Additive + idempotent (Map keyed by id); SEPARATE from the favients
  // DOCUMENT provider below (different registry — scene save/load, not undo).
  registerHistoryProvider('favients', { capture: captureFavientsHistory, restore: restoreFavientsHistory });

  // The Stops mode's edited GradientConfig lives in paletteEditorStore (non-DDFS —
  // a stop document, not scalar dials). Register it as a PARAM-undo history
  // provider so stop edits ride Ctrl+Z: the engine editor brackets each gesture
  // via the (d) seam (onEditStart/onEditEnd/edit → paramUndoBracket), and the
  // bracket snapshots this provider's config. Additive + idempotent (Map keyed by
  // id). SEPARATE from the 'stops' DOCUMENT provider below (undo vs scene I/O).
  registerHistoryProvider('paletteEditor', { capture: captureEditorConfig, restore: applyEditorConfig });

  // The favients shelf rides Save/Load via the engine document-provider registry
  // (W8). serialize = the current collection; restore = prompt Replace/Append,
  // then merge-or-overwrite + write through to localStorage (gmt.favients) so a
  // loaded scene's palette is preserved. The reference consumer of the registry —
  // heavy authoring stores (generator/image/stops) register their own providers
  // in their Phase-1 streams. Idempotent (Map keyed by id).
  registerDocumentProvider('favients', { serialize: serializeFavientsDocument, restore: restoreFavientsDocument });

  // The Stops mode's gradient rides Save/Load via the document registry (W8).
  // serialize = the current config; restore validates an untrusted scene doc
  // (coerceGradientConfig — never throws, no-op on garbage) and applies it
  // silently (it's the scene's own authoring state, not a shared library, so no
  // Replace/Append prompt). Same capture/restore pair as the history provider
  // above. Idempotent (Map keyed by id).
  registerDocumentProvider('stops', { serialize: captureEditorConfig, restore: applyEditorConfig });

  // The Generator's non-DDFS authoring state (slot selection, channel-curve Track[],
  // curvesOn, detail/smooth, noiseSeed) rides Save/Load via the document registry (W8) —
  // the dials themselves are DDFS and round-trip through the preset. serialize reuses the
  // history capture; restore coerces the untrusted scene snapshot (R4). Idempotent.
  registerDocumentProvider('generator', { serialize: serializeGeneratorDocument, restore: restoreGeneratorDocument });

  // The Image mode's source image (thumbnail re-encoded as a compact data URL) + trace
  // path ride Save/Load via the document registry (W8); the img2grad dials are DDFS and
  // round-trip through the preset. restore re-ingests the image async (after the scene
  // loads) via the shared decodeAndIngest, then reapplies the saved trace (R4). Idempotent.
  registerDocumentProvider('image', { serialize: serializeImageDocument, restore: restoreImageDocument });

  // One feature per studio mode — each owns a dock tab; the centre stage mirrors
  // whichever tab is active (see GradientExplorerApp).
  featureRegistry.register(PaletteGeneratorFeature);
  featureRegistry.register(PaletteFiltersFeature);
  featureRegistry.register(PaletteImageFeature);
  // Standalone Stops MODE tab — host-gated (the Explorer folds it into Generator·Stops).
  if (standaloneStopsMode) featureRegistry.register(PaletteEditorFeature);

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
