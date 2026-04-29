/**
 * Post-mount setup for Fluid Toy.
 *
 * Applies the app's panel manifest — the engine reads PanelRouter and
 * Dock from the registered manifest at render time.
 *
 * Also opens the left dock by default. The shared uiSlice default is
 * `isLeftDockCollapsed: true` (intentional — most apps want users to
 * see the canvas first). Fluid-toy's authoring panels (View, Palette,
 * Brush) are useful enough at first run that we override that default
 * here per-app.
 */

import { applyPanelManifest } from '../engine/PanelManifest';
import { useEngineStore } from '../store/engineStore';
import { FluidToyPanels } from './panels';

export const setupFluidToy = () => {
    applyPanelManifest(FluidToyPanels);
    useEngineStore.getState().setDockCollapsed('left', false);
};
