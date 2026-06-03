/**
 * Palette Studio — panel manifest wiring. Runs after the store exists
 * (registerFeatures runs before, where the freeze happens).
 *
 * Three right-dock panels = the three studio modes. The Dock renders them as a
 * tab strip; the centre stage (PaletteStudioApp) mirrors whichever tab is active
 * via `activeRightTab`. Generator is the default-open tab.
 */

import { useEngineStore } from '../store/engineStore';
import { applyPanelManifest } from '../engine/PanelManifest';
import { restoreFavientsPanel, watchFavientsPanel } from '../palette/store/favientsPanelPersist';

export const wirePaletteStudio = (): void => {
  applyPanelManifest([
    { id: 'Generator', dock: 'right', order: 0, active: true, features: ['paletteGenerator'] },
    { id: 'Picker', dock: 'right', order: 1, features: ['paletteFilters'] },
    { id: 'Image', dock: 'right', order: 2, features: ['paletteImage'] },
    // Favients shelf — floats by default (a persistent always-on gradient shelf).
    { id: 'Favients', dock: 'right', order: 3, component: 'panel-favients', isCore: false },
  ]);

  const store = useEngineStore.getState();
  store.movePanel('Generator', 'right', 0);
  store.movePanel('Picker', 'right', 1);
  store.movePanel('Image', 'right', 2);
  store.togglePanel('Generator', true); // default-active tab

  // Favients floats, parked MIDDLE-LEFT by default ("leave it on screen") — but its
  // open-state/position/size are remembered across sessions once the user moves it.
  const fh = typeof window !== 'undefined' ? window.innerHeight : 800;
  restoreFavientsPanel({ x: 20, y: Math.max(20, Math.round(fh / 2 - 150)), w: 296, h: 300, open: true });
  watchFavientsPanel();
};
