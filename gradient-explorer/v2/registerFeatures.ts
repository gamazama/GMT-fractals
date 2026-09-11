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
 *   • setFullscreenLiveSource() — the Wallpaper follows the WORKING gradient here, not the
 *     old shell's hero selection. Without it the split preview tracked the wall pick (or
 *     froze on the open-time snapshot) and never followed the hero being edited.
 */

import { usePickerStore } from '../../palette/store/pickerStore';
import { isMobileViewport } from '../../engine/HardwareDetection';
import { registerPaletteUI } from '../../palette/registerPaletteUI';
import { installWorking } from '../../palette/installWorking';
import { useFavientsStore } from '../../palette/store/favientsStore';
import { setFavientSelectMode } from '../../palette/core/favientTargets';
import { setFullscreenLiveSource } from '../../palette/store/fullscreenStore';
import { useWorkingDerived } from '../../palette/store/workingStore';

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
// PHONES START WITHOUT THEM. Measured on the owner's iPhone 6 (1 GB of RAM), 2026-09-11:
// with the packs the tab is killed by Safari a second after the wall first paints — the
// moment they arrive and the wall is rebuilt at 11,131 rows — and with `?lite` the same
// phone runs the whole Explorer, fractal wallpaper included. Chromium on a Pixel 5 sits at
// ~20 MB of heap either way, so this is the phone's memory ceiling, not the page's size;
// a 6 GB Android handled 11,131 fine. Core only (3,076) is the phone default; Filters ▸
// Sources still loads a pack on demand. `?lite` forces the phone default anywhere and
// `?packs` forces the desktop default on a phone — both for testing a specific device.
const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
const PACKS_OFF = q?.has('lite') || (isMobileViewport() && !q?.has('packs'));
if (!PACKS_OFF) {
  usePickerStore.getState().setGroupLoaded('softology', true);
  usePickerStore.getState().setGroupLoaded('cptcity', true);
}

// The Wallpaper's live source. The overlay calls this as a HOOK during its own render, so the
// fullscreen preview re-resolves whenever the Working pipeline emits — a stop dragged, a Curves
// or Adjust dial moved, a Mix blended, an image swapped. `empty` inputs (Extract with no image
// yet) resolve to null, which leaves the overlay on its open-time snapshot rather than blanking
// the screen. Registering it here also keeps v2 off the old shell's `useGeneratorDerived`, whose
// pipeline it ran on every overlay render and threw away.
setFullscreenLiveSource(() => {
  const d = useWorkingDerived();
  // `ramp` is the pipeline's real output and is what the wallpaper renders; `config` rides
  // along for the export filename and for the snapshot taken when split is switched off. The
  // two disagree whenever the pipeline is doing anything — `config` is a stop refit of the
  // ramp — which is exactly why the ramp is passed rather than left to be re-derived.
  return d.config && !d.empty
    ? { config: d.config, name: d.name, ramp: d.ramp ?? undefined }
    : null;
});
