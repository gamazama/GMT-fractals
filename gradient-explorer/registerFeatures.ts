/**
 * Palette Studio — side-effect feature/component registration.
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
import type { GradientConfig } from '../types';

registerPaletteUI();

// Favients header "Palettes" button → TOGGLE the studio's Picker tab.
setFavientBrowseAction(() => useEngineStore.getState().togglePanel('Picker'));

// Studio-specific Favients apply targets: a favourite click/drop loads into a
// generator source slot (the merge surface). app-gmt will register coloring layers.
const applyToSlot = (which: 'A' | 'B') => (config: GradientConfig, name: string) =>
  useGeneratorStore
    .getState()
    .sendRampToSlot(which, renderStopsToRamp(config.stops, config.blendSpace, config.colorSpace), name);

registerFavientTarget({ id: 'gen-a', label: 'Generator · Slot A', apply: applyToSlot('A') });
registerFavientTarget({ id: 'gen-b', label: 'Generator · Slot B', apply: applyToSlot('B') });
