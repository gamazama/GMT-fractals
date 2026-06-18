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
import { favientsPanelEntry, mountFavientsPanel } from '../palette/installFavients';
import { feedbackPanelEntry } from '../engine-gmt/feedback';

export const wireGradientExplorer = (): void => {
  applyPanelManifest([
    // The three mode panels are NON-FLOATABLE: their content is the mode's docked controls,
    // and the centre stage mirrors the active right tab — floating one desyncs the controls
    // from the stage and breaks the layout. (Favients, a self-contained shelf, floats fine.)
    // Stops is no longer its own panel — it's the Generator's Stops sub-mode (its document
    // controls fold into the Generator tab), so paletteEditor isn't registered here.
    { id: 'Picker', dock: 'right', order: 0, active: true, features: ['paletteFilters'], floatable: false },
    { id: 'Generator', dock: 'right', order: 1, features: ['paletteGenerator'], floatable: false },
    { id: 'Image', dock: 'right', order: 2, features: ['paletteImage'], floatable: false },
    // Favients shelf — docked into the left tab strip by default here.
    favientsPanelEntry({ dock: 'left', order: 0 }),
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
  // user moves it. The float rect below is the fallback spot if it's ever undocked.
  // mountFavientsPanel also restores+watches the picker filter prefs (default on).
  const fh = typeof window !== 'undefined' ? window.innerHeight : 800;
  mountFavientsPanel({
    storageKey: 'gmt.gradientExplorer.favients.panel',
    location: 'left',
    order: 0,
    float: { y: Math.max(20, Math.round(fh / 2 - 150)), h: 300 },
  });
};
