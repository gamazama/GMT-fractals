/**
 * Gradient Explorer v2 — side-effect feature / store registration.
 *
 * Imported at the very top of v2/main.tsx, BEFORE anything touches the engine store
 * (the feature + component registries freeze on first store access).
 *
 * Differences from the old shell's registerFeatures.ts, on purpose:
 *   • installWorking() — the v2 Working gradient (one pipeline input for every source)
 *     registers its undo + document providers here and wires Recent auto-collect to the
 *     shared favourites store. app-gmt / fluid-toy never call this.
 *   • registerGradientTargets() is NOT called — the dock-shaped "select → reveal → place"
 *     targets read the old shell's dock state. v2 routes gradients through the hero
 *     (Use / Mix / star) and will register its own target set in Phase 2.
 */

import { usePickerStore } from '../../palette/store/pickerStore';
import { registerPaletteUI } from '../../palette/registerPaletteUI';
import { installWorking } from '../../palette/installWorking';
import { useFavientsStore } from '../../palette/store/favientsStore';
import { setFavientSelectMode } from '../../palette/core/favientTargets';

// Stops is folded into the hero in v2 (there is no Stops mode tab anywhere).
registerPaletteUI({ standaloneStopsMode: false });

// The Working gradient: undo + Save/Load providers, and ONE Recent entry per working
// session in My Gradients — opened by the collector, refreshed in place by the updater as
// the user edits (see workingStore.syncRecent).
installWorking({
  collectRecent: (config, name, source, opts) => useFavientsStore.getState().collectRecent(config, name, source, opts),
  updateRecent: (id, config, name) => useFavientsStore.getState().updateRecent(id, config, name),
});

// A shelf swatch click SELECTS (the hero previews it) rather than applying somewhere.
setFavientSelectMode(true);

// Owner, 2026-09-06: the licensed packs (Softology, cpt-city) are on by default in the
// Explorer — fetched at boot alongside the core groups. app-gmt keeps them off until toggled.
usePickerStore.getState().setGroupLoaded('softology', true);
usePickerStore.getState().setGroupLoaded('cptcity', true);
