/**
 * Post-install setup for Deep Zoom.
 *
 * Applies the app's panel manifest — the engine's PanelRouter and Dock read
 * the registered manifest at render time. Runs after every registration the
 * manifest refers to, and after the store exists (the installs before it in
 * main.tsx have built it): applied earlier, the entries are only parked and
 * the Feedback panel would have no open state to flip.
 *
 * Also opens the left dock by default. The shared uiSlice default is
 * `isLeftDockCollapsed: true`; this app's left dock holds where-am-I panels
 * (locations, formula, flight) that are worth seeing at first run. With no
 * left panel yet (stage 1) the call changes nothing on screen.
 */

import { applyPanelManifest } from '../engine/PanelManifest';
import { useEngineStore } from '../store/engineStore';
import { DeepZoomPanels } from './panels';
import { feedbackPanelEntry } from '../engine-gmt/feedback';

export const setupDeepZoom = () => {
    // Feedback panel is shared GMT plumbing (Help-menu "Send Feedback"); spread
    // it in rather than baking it into DeepZoomPanels so panels.ts stays free
    // of engine-gmt imports.
    applyPanelManifest([...DeepZoomPanels, feedbackPanelEntry()]);
    useEngineStore.getState().setDockCollapsed('left', false);
};
