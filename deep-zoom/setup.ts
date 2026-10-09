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
 *
 * And it puts the store's `cameraMode` on 'Fly' (stage N5), so the timeline leaves Space to the
 * navigation.
 *
 * The palette suite's two panels (stage 5) are entries of the same manifest, and their mounts
 * come right after it: `mountFavientsPanel` and `mountGradientStudio` both act on panels the
 * manifest has to have registered first, and a call made too early does nothing and says
 * nothing (the `@assumption` in palette/installFavients.ts).
 */

import { applyPanelManifest } from '../engine/PanelManifest';
import { useEngineStore } from '../store/engineStore';
import { DeepZoomPanels } from './panels';
import { feedbackPanelEntry } from '../engine-gmt/feedback';
import { favientsPanelEntry, mountFavientsPanel } from '../palette/installFavients';
import { gradientStudioPanelEntry, mountGradientStudio } from '../palette/installGradientStudio';

/** This app's own key for where the My Gradients window sits. Without one it would read and
 *  write app-gmt's (the favourites themselves are shared across the apps on purpose). */
export const DZ_FAVIENTS_PANEL_KEY = 'deep-zoom.favients.panel';

export const setupDeepZoom = () => {
    // Feedback panel is shared GMT plumbing (Help-menu "Send Feedback"); spread
    // it in rather than baking it into DeepZoomPanels so panels.ts stays free
    // of engine-gmt imports.
    applyPanelManifest([
        ...DeepZoomPanels,
        feedbackPanelEntry(),
        // My Gradients: a floating window (it can be docked), and the Gradient Studio, which
        // only floats. Their components were registered by registerFeatures.ts.
        favientsPanelEntry({ dock: 'right', order: 90 }),
        gradientStudioPanelEntry(),
    ]);
    // Closed at first run: this app opens on the picture, and the top bar's My Gradients
    // button (main.tsx) and the star in the gradient editor both bring it up. No picker here,
    // so its filter prefs are not restored. It first opens at the picture's left edge, clear of
    // the left dock (320 px wide, measured 2026-10-09). Then the Studio's close watcher.
    mountFavientsPanel({ storageKey: DZ_FAVIENTS_PANEL_KEY, paletteFilters: false, open: false, float: { x: 336 } });
    mountGradientStudio();
    useEngineStore.getState().setDockCollapsed('left', false);
    // This app always flies. `cameraMode` is the field the timeline's Space binding tests so
    // that Space stays fly-up (grep `toggle-play` in components/TimelineHost.tsx); with the
    // pointer over the timeline Space still plays. The engine's store type does not declare the
    // field (GMT sets it the same way, grep `cameraMode` in app-gmt/main.tsx), hence the graft.
    useEngineStore.setState({ cameraMode: 'Fly' } as Partial<ReturnType<typeof useEngineStore.getState>>);
};
