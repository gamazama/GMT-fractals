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
import { feedbackPanelEntry } from '../engine-gmt/feedback';

export const setupFluidToy = () => {
    // Feedback panel is shared GMT plumbing (Help-menu "Send Feedback"); spread
    // it in rather than baking it into FluidToyPanels so panels.ts stays free
    // of engine-gmt imports.
    applyPanelManifest([...FluidToyPanels, feedbackPanelEntry()]);
    useEngineStore.getState().setDockCollapsed('left', false);
};
