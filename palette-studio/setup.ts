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

  // Favients floats, parked top-right, open by default ("leave it on screen").
  store.movePanel('Favients', 'float');
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  store.setFloatPosition('Favients', Math.max(20, w - 320), 64);
  store.setFloatSize('Favients', 296, 300);
  store.togglePanel('Favients', true);
};
