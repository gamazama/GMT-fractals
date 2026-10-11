/**
 * Deep Zoom — entry point (deep-zoom.html).
 *
 * A gmt-shell around the deep-zoom renderer (`deep-zoom/renderer`, the ported Mandelbulb
 * perturbation page): the engine's own top bar, docks, viewport frame, menus, shortcuts, undo
 * and settings, with the renderer mounted in the viewport and stepped by the engine's tick.
 * fluid-toy's full shell is the template; this file follows its order.
 *
 * What stage 1 installs is below, each call with its reason. What it does NOT install, and why:
 *   - The Camera plugin: numbered slots with no thumbnail, name or panel. Saved places get one
 *     mechanism, the state library (stage 3). The camera itself (three 256-bit numbers) stays
 *     in the renderer and is read through the host only when something is saved.
 *   - Modulation / LFOs: every push of power, phase or iterations rebuilds the reference orbit.
 *     NOTE for stage 2: `installModulation()` is also the only thing that registers the
 *     engine's animation tick (`engine.animation`, engine/animation/modulationTick.ts). The
 *     timeline does not play without it, LFO panel or not.
 *   - PauseControls, BucketRender: the renderer has no pause yet and keeps its own tiled export.
 *   - Session, tutorial, What's New and the render dialog: later stages, each when a renderer
 *     handle stands behind it. (The palette suite came in stage 5: registerFeatures.ts, setup.ts.)
 *   - `engine/plugins/camera/presetField`: not imported, with the Camera plugin.
 *
 * The prototype this replaces is still served at deep-zoom-prototype.html (dev only).
 */

// Side-effect registrations — the DDFS features. MUST come before anything
// that touches the store (the registries freeze when it is built).
import './registerFeatures';
// Preset fields (the view in a scene, the scene version). Before the store is first used:
// the preset-field registry freezes when the store is built.
import './presetFields';

// Global Tailwind styles (build-time).
import '../index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppErrorBoundary } from '../engine/components/AppErrorBoundary';
import { DeepZoomApp } from './DeepZoomApp';
import { registerUI } from '../engine/features/ui';
import { setupDeepZoom } from './setup';
import { installViewport } from '../engine/plugins/Viewport';
import { installTopBar, topbar } from '../engine/plugins/TopBar';
import { registerCoreSettings } from '../store/coreSettings';
import { registerDeepZoomSettings } from './settings';
import { SettingsButton } from '../components/SettingsAccess';
import { installPwaUpdate } from '../engine/plugins/PwaUpdate';
import { installShortcuts } from '../engine/plugins/Shortcuts';
import { installUndo } from '../engine/plugins/Undo';
import { installMenu } from '../engine/plugins/Menu';
import { installHud } from '../engine/plugins/Hud';
import { installHelp } from '../engine/plugins/Help';
import { setHelpTopicsLoader } from '../data/help/registry';
import { gmtSupportConfig } from '../engine-gmt/support';
import { feedbackMenuItem, registerFeedbackUI } from '../engine-gmt/feedback';
import { StatusChip } from './components/StatusChip';
import { DepthReadout } from './components/DepthReadout';
import { hud } from '../engine/plugins/Hud';
import { installModulation } from '../engine/animation/modulationTick';
import { startMilestones } from './milestones';
import { installLocations } from './locations';
import { installBoxScaleRule } from './boxScale';
import { registerDeepZoomHotkeys } from './hotkeys';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { LocationsPanel } from './components/LocationsPanel';
import { RoutePanel } from './components/RoutePanel';
import { installRoute } from './route';
import { BoxStarters, KeptPlaces, StarterDives } from './components/StarterDives';
import { LocationText } from './components/LocationText';
import { installSceneIO } from '../engine/plugins/SceneIO';
import { installShare, loadShareFromUrl, sceneCanvas } from './share';
import { dismissBootSplash } from './components/BootCard';
import { FavientsToggleButton } from '../palette/components/FavientsToggleButton';
import { installGradientFileClaim } from '../palette/installGradientFileClaim';

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length === 0) return;
    regs.forEach((r) => r.unregister());
    if ('caches' in window) caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    console.info('[dev] Cleared stale service worker + caches. Reload to see fresh code.');
  });
}

// The install chain runs before React exists, so the root error boundary cannot
// catch a throw in it (see AppErrorBoundary's header): it would be a blank page
// under the splash. It is caught here and handed to the boundary as
// `initialError`, which draws the same readable fallback on first paint.
let bootError: unknown = null;
try {
    // Registers the engine's own panel components (`auto-feature-panel`, …)
    // in the component registry. Before any panel renders.
    registerUI();

    // @engine/viewport, with the adaptive loop OFF. The renderer sizes its own
    // frame (its long-edge setting and a depth-dependent cap that keeps one
    // deep draw under the GPU watchdog), so nothing here reads qualityFraction,
    // renderScale or canvasPixelSize. `enabled: false` pins qualityFraction at 1
    // so no readout shows a scale the renderer is not using.
    installViewport({ enabled: false });

    // @engine/topbar — the defaults: project name (left), FPS (right), adaptive
    // badge (right). The badge goes: clicked while off it turns the adaptive
    // loop ON, a control the renderer would ignore. The FPS counter stays and
    // shows the renderer's own rate (DeepZoomSurface reports it).
    installTopBar();
    topbar.unregister('adaptive');

    // Settings — colour scheme + accent hues (shared across all GMT apps). The
    // gear opens the floating Settings panel (SettingsHost is mounted in
    // DeepZoomApp). No autosave rows yet: autosave is per app, and the default
    // rows would write app-gmt's keys and do nothing here. THIS FUNCTION RUNS
    // ONCE: stage 3 replaces this line with the call that passes the app's own
    // autosave store, it does not add a second call (a second call is ignored).
    registerCoreSettings({ autosave: null });
    // This app's own rows in the same panel: Advanced mode, Invert look Y.
    registerDeepZoomSettings();
    topbar.register({ id: 'settings', slot: 'right', order: 100, component: SettingsButton });

    // PWA update pill. Surfaces an amber "Update" button in the topbar when a
    // new service worker is detected. Early: the watch starts at install time.
    installPwaUpdate();

    // @engine/shortcuts — window-level keyboard listener, scope-aware
    // dispatcher. Bare: the renderer was created with its own single-key
    // shortcuts off, so the dispatcher owns every one-shot key. The fly keys
    // (W A S D, Q E, Space, C, Shift, Alt) are NOT shortcuts: the navigation
    // hears them on the window (DeepZoomNavigation.tsx), so nothing registered
    // here may bind them.
    installShortcuts();

    // @engine/undo — unified transaction stack. Ctrl+Z / Ctrl+Y via
    // @engine/shortcuts; Undo/Redo buttons in the topbar's right slot.
    installUndo();

    // @engine/menu — generic dropdown-menu host. Installing only makes the API
    // ready (and keeps toggle rows fresh); Help registers the one menu so far.
    installMenu();

    // @engine/scene-io — File menu: Save / Load scene, Save PNG (the scene is embedded in the
    // PNG), Alt+S. The canvas getter must be passed at this first call or the PNG rows never
    // appear; `sceneCanvas` draws a frame and copies it at save time.
    installSceneIO({ getCanvas: sceneCanvas });

    // @engine/hud — slot-based overlay host. <HudHost /> is mounted inside
    // DeepZoomApp's ViewportFrame. The depth readout is the instrument on the
    // picture; it takes the pointer (its Dive field), the rest of the HUD does not.
    installHud();
    hud.register({ id: 'deep-zoom.depth', slot: 'top-left', component: DepthReadout, className: 'pointer-events-auto' });

    // The engine's animation tick (`engine.animation`, ANIMATE phase). This call is its
    // only registration: without it the timeline does not play. The modulation UI (LFO
    // panels) is not installed - an LFO on power or phase would rebuild the reference
    // orbit every frame.
    installModulation();

    // One line the first time a depth is passed (the telemetry store drives it).
    startMilestones();

    // @engine/help, minimal: the "?" menu with Show Hints (and its H key),
    // Send Feedback and Support GMT. No topic links until this app has topics
    // (stage 4, deep-zoom/help/): `hideTopicLinks` drops Getting Started and
    // Keyboard Shortcuts, and the empty loader keeps GMT's fractal-renderer
    // help — the default source — out of this app's context menus.
    // installHelp is idempotent: stage 4 replaces this call, it does not add one.
    setHelpTopicsLoader(() => Promise.resolve({}));
    registerFeedbackUI();
    installHelp({
        hideTopicLinks: true,
        support: gmtSupportConfig(),
        extraItems: [feedbackMenuItem()],
    });

    // The renderer's state in the top bar's centre: engine badge + depth.
    // Store-free (it reads the telemetry store beside the host), registered
    // here with the other top-bar items.
    topbar.register({ id: 'deep-zoom.status', slot: 'center', order: 0, component: StatusChip });

    // Saved locations on the engine's state library (list, thumbnails, slots 1-9, the
    // Locations menu), the jump undo provider, and this app's keys. The two widgets read
    // the store, so they are registered here and not in registerFeatures.ts.
    installLocations();
    // The Mandelbox's Scale never rests inside the band the renderer cannot draw (deep-zoom/boxScale.ts).
    installBoxScaleRule();
    // The route: the camera move on the timeline. Its track is registered here, before
    // anything below can load a sequence (a key written while the track is unregistered is
    // not swept afterwards), and so are Key Cam's capture and the hook that sets the camera
    // for a scrubbed frame (deep-zoom/route.ts).
    installRoute();
    registerDeepZoomHotkeys();
    componentRegistry.register('dz-locations', LocationsPanel);
    componentRegistry.register('dz-route', RoutePanel);
    componentRegistry.register('dz-starters', StarterDives);
    componentRegistry.register('dz-box-starters', BoxStarters);
    componentRegistry.register('dz-places', KeptPlaces);
    componentRegistry.register('dz-location-text', LocationText);

    // Scenes carry the saved places as a document; a share link carries the look and the view.
    installShare();

    // My Gradients in the top bar (the panel itself is an entry of the manifest, setup.ts), and
    // a gradient FILE dropped on the app or picked in File > Load Scene goes to My Gradients
    // instead of failing as a scene (palette/installGradientFileClaim.ts).
    topbar.register({ id: 'favients-toggle', slot: 'left', order: 40, component: FavientsToggleButton });
    installGradientFileClaim();

    // The panel manifest. After every registration it refers to, and after the
    // store exists (the installs above built it).
    setupDeepZoom();

    // A `#s=` link opens as a scene. Its view is parked until the renderer is mounted and ready.
    loadShareFromUrl();
} catch (err) {
    console.error('[deep-zoom] The app failed to start, before the first render.', err);
    bootError = err;
    // The HTML splash sits above #root; without this it would cover the error page.
    dismissBootSplash();
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <AppErrorBoundary initialError={bootError ?? undefined}>
    <React.StrictMode>
      <DeepZoomApp />
    </React.StrictMode>
  </AppErrorBoundary>
);
