/**
 * GMT Gradient Explorer — panel manifest wiring. Runs after the store exists
 * (registerFeatures runs before, where the freeze happens).
 *
 * Three right-dock panels = the three explorer modes. The Dock renders them as a
 * tab strip; the centre stage (GradientExplorerApp) mirrors whichever tab is active
 * via `activeRightTab`. Picker is the default-open tab.
 */

import { useEngineStore } from '../store/engineStore';
import { applyPanelManifest } from '../engine/PanelManifest';
import { restoreFavientsPanel, watchFavientsPanel } from '../palette/store/favientsPanelPersist';
import { restorePaletteFilters, watchPaletteFilters } from '../palette/store/paletteFiltersPersist';
import { feedbackPanelEntry } from '../engine-gmt/feedback';

export const wireGradientExplorer = (): void => {
  applyPanelManifest([
    { id: 'Picker', dock: 'right', order: 0, active: true, features: ['paletteFilters'] },
    { id: 'Generator', dock: 'right', order: 1, features: ['paletteGenerator'] },
    { id: 'Image', dock: 'right', order: 2, features: ['paletteImage'] },
    // Favients shelf — docked into the left tab strip by default here.
    { id: 'Favients', dock: 'left', order: 0, component: 'panel-favients', isCore: false },
    // Feedback — shared GMT Help-menu plumbing ("Send Feedback"), floats on demand.
    feedbackPanelEntry(),
  ]);

  const store = useEngineStore.getState();
  store.movePanel('Picker', 'right', 0);
  store.movePanel('Generator', 'right', 1);
  store.movePanel('Image', 'right', 2);
  store.togglePanel('Picker', true); // default-active tab

  // Favients docks into the left tab strip by default in the standalone Explorer (in
  // app-gmt it floats — different host, different default). We persist under an
  // Explorer-specific key so the two apps don't inherit each other's docking state via
  // same-origin localStorage; open-state/location/position/size are remembered once the
  // user moves it. Float pos/size below are the fallback spot if it's ever undocked.
  const FAVIENTS_LS = 'gmt.gradientExplorer.favients.panel';
  const fh = typeof window !== 'undefined' ? window.innerHeight : 800;
  restoreFavientsPanel(
    { x: 20, y: Math.max(20, Math.round(fh / 2 - 150)), w: 296, h: 300, open: true, location: 'left', order: 0 },
    { storageKey: FAVIENTS_LS },
  );
  watchFavientsPanel({ storageKey: FAVIENTS_LS });

  // Remember the picker's swatch-size / padding / arrangement across sessions.
  restorePaletteFilters();
  watchPaletteFilters();
};
