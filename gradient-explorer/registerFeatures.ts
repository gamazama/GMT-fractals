/**
 * GMT Gradient Explorer — side-effect feature/component registration.
 *
 * Imported at the very top of main.tsx, BEFORE anything touches the engine store
 * (createFeatureSlice freezes the registries on first store access). registerPaletteUI()
 * registers the shared palette features + custom-UI components; none of them import
 * useEngineStore at module scope, so registering here (pre-freeze) is safe.
 */

import { registerPaletteUI } from '../palette/registerPaletteUI';
import { registerFavientTarget, setFavientBrowseAction } from '../palette/core/favientTargets';
import { useGeneratorStore } from '../palette/store/generatorStore';
import { useEngineStore } from '../store/engineStore';
import { renderStopsToRamp } from '../palette/core/gmtGradient';
import { registerGradientTargets } from './gradientTargets';
import type { GradientConfig } from '../types';

registerPaletteUI();

// The "select → reveal → place" drop targets — every gradient destination (Generator
// slots, Stops, Favients, Fullscreen, Export) registered into the engine (c) send-target
// registry. The dropbox topology (finals + derived intermediate tab steps) is computed
// from this set, not hardcoded. Side-effect, pre-store-freeze safe (apply reads getState
// at click/drop time; getRect queries the DOM at paint time).
registerGradientTargets();

// Favients header "Palettes" button → TOGGLE the studio's Picker tab.
setFavientBrowseAction(() => useEngineStore.getState().togglePanel('Picker'));

// Legacy Favients "Applying to ▾" targets (S2) — kept until P2-C migrates favientTargets
// onto the (c) registry. The new dropbox model is additive alongside this.
const applyToSlot = (which: 'A' | 'B') => (config: GradientConfig, name: string) =>
  useGeneratorStore
    .getState()
    .sendRampToSlot(which, renderStopsToRamp(config.stops, config.blendSpace, config.colorSpace), name);

registerFavientTarget({ id: 'gen-a', label: 'Generator · Slot A', apply: applyToSlot('A') });
registerFavientTarget({ id: 'gen-b', label: 'Generator · Slot B', apply: applyToSlot('B') });
