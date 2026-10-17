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
 *   - (What came later, each in its own file: the palette suite in stage 5, registerFeatures.ts
 *     and setup.ts. The render dialog in stage R6a, for PNG frames into a folder, and video files
 *     in R6b: routeRender.tsx. The session - the scene kept across a reload while Settings >
 *     Files > Autosave is on - on 2026-10-12: session.ts. Help's own topics, What's New and the
 *     first-run guide the same day: help/installDeepZoomHelp.tsx and tutorial/firstDive.ts, the
 *     last call of the chain below.)
 *   - The File menu's two autosave rows ("Autosave", "Restore Last Session"): they are app-gmt's,
 *     reading and writing app-gmt's keys, and are taken off this app's menu below.
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
import { ViewportModeControls } from '../engine/plugins/viewport/ViewportModeControls';
import { installTopBar, topbar } from '../engine/plugins/TopBar';
import { registerCoreSettings } from '../store/coreSettings';
import { registerDeepZoomSettings } from './settings';
import { SettingsButton } from '../components/SettingsAccess';
import { installPwaUpdate } from '../engine/plugins/PwaUpdate';
import { installShortcuts } from '../engine/plugins/Shortcuts';
import { installUndo } from '../engine/plugins/Undo';
import { installMenu, menu } from '../engine/plugins/Menu';
import { installHud } from '../engine/plugins/Hud';
import { installDeepZoomHelp } from './help/installDeepZoomHelp';
import { installFirstDive } from './tutorial/firstDive';
import { StatusChip } from './components/StatusChip';
import { DepthReadout } from './components/DepthReadout';
import { hud } from '../engine/plugins/Hud';
import { installModulation } from '../engine/animation/modulationTick';
import { startMilestones } from './milestones';
import { installLocations, startAtStartView } from './locations';
import { installBoxScaleRule } from './boxScale';
import { registerDeepZoomHotkeys } from './hotkeys';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { LocationsPanel } from './components/LocationsPanel';
import { RoutePanel } from './components/RoutePanel';
import { installRoute } from './route';
import { installRouteRender } from './routeRender';
import { openRenderPopup } from '../engine/animation/renderPopupRegistry';
import { BoxStarters, KaliStarters, KeptPlaces, StarterDives } from './components/StarterDives';
import { LocationText } from './components/LocationText';
import { JuliaHere } from './components/JuliaHere';
import { installSceneIO } from '../engine/plugins/SceneIO';
import { installShare, loadShareFromUrl, sceneCanvas } from './share';
import { installLocationsFileClaim } from './claims';
import { DZ_AUTOSAVE_TEXT, dzAutosaveSettings, installDzSession } from './session';
import { Diagnostics } from './components/Diagnostics';
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

/** GMT's canvas control as a HUD item (registered below, under the depth box). */
const CanvasControl: React.FC = () => <ViewportModeControls inline />;
try {
    // Registers the engine's own panel components (`auto-feature-panel`, …)
    // in the component registry. Before any panel renders.
    registerUI();

    // @engine/viewport, with the adaptive loop OFF. The renderer sizes its own
    // frame (its long-edge setting and a depth-dependent cap that keeps one
    // deep draw under the GPU watchdog), so nothing here reads qualityFraction
    // or renderScale. `enabled: false` pins qualityFraction at 1 so no readout
    // shows a scale the renderer is not using. The viewport's Full / Fixed mode
    // IS this app's (GMT's canvas control, 2026-10-17: the HUD item below, and
    // DeepZoomApp.tsx for what the renderer reads in Fixed mode).
    installViewport({ enabled: false });

    // @engine/topbar — the defaults: project name (left), FPS (right), adaptive
    // badge (right). The badge goes: clicked while off it turns the adaptive
    // loop ON, a control the renderer would ignore. The FPS counter stays and
    // shows the renderer's own rate (DeepZoomSurface reports it).
    installTopBar();
    topbar.unregister('adaptive');

    // Settings — colour scheme + accent hues (shared across all GMT apps). The
    // gear opens the floating Settings panel (SettingsHost is mounted in
    // DeepZoomApp). The two Files > Autosave rows are given THIS app's autosave
    // store (its own keys, off until switched on): the same store the session
    // reads at the end of this chain (deep-zoom/session.ts). Without one the
    // rows would write app-gmt's keys and do nothing here. THIS FUNCTION RUNS
    // ONCE (a second call is ignored).
    registerCoreSettings({ autosave: { store: dzAutosaveSettings, ...DZ_AUTOSAVE_TEXT } });
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

    // @engine/scene-io — File menu: Open scene, Save scene, Save picture (a PNG with the scene in
    // it; Alt+S). The canvas getter must be passed at this first call or the PNG rows never
    // appear; `sceneCanvas` reads the picture back at save time. The menu's words are this app's
    // (STREAMLINE.md stage 5): the File menu is Open scene..., Save scene..., Save picture and
    // Render route... (below), and nothing else.
    installSceneIO({ getCanvas: sceneCanvas, labels: { load: 'Open scene…', saveScene: 'Save scene…', savePng: 'Save picture' } });
    // One door to a still, not three (F15): the menu row and Alt+S stay, the top bar's picture icon
    // goes, and so does Save Image (JPG), a PNG without the scene in it.
    topbar.unregister('scene-snapshot');
    menu.unregisterItem('file', 'save-jpg');
    // Its two autosave rows are app-gmt's mechanism: the "Autosave" switch writes app-gmt's
    // preference (`gmt-autosave-enabled`) and nothing in this app reads it, and "Restore Last
    // Session" would load whatever scene app-gmt left in its recovery slot. This app's autosave
    // is the Settings row above and restores by itself (deep-zoom/session.ts).
    menu.unregisterItem('file', 'autosave-settings');
    menu.unregisterItem('file', 'restore-autosave');
    menu.unregisterItem('file', 'file-sep-autosave');

    // @engine/hud — slot-based overlay host. <HudHost /> is mounted inside
    // DeepZoomApp's ViewportFrame. The depth readout is the instrument on the
    // picture; it takes the pointer (its Dive field), the rest of the HUD does not.
    installHud();
    hud.register({ id: 'deep-zoom.depth', slot: 'top-left', component: DepthReadout, className: 'pointer-events-auto' });
    // GMT's canvas control (the owner, 2026-10-17: "we still need to appropriate the resolution/canvas control from
    // gmt too"): the engine's ViewportModeControls - Full / Fixed, the Fixed size dragged or typed, its shape from the
    // menu, Fill back. UNDER the depth box: the box holds the picture's top-left corner, where GMT puts the control.
    // Inline, in the slot's flow, so it follows the box's height; no render-scale pill (Frame size is the renderer's
    // own resolution, in Quality).
    hud.register({ id: 'deep-zoom.canvas', slot: 'top-left', order: 1, component: CanvasControl, className: 'pointer-events-auto ml-2' });   // ml-2: the depth box's own margin

    // The engine's animation tick (`engine.animation`, ANIMATE phase). This call is its
    // only registration: without it the timeline does not play. The modulation UI (LFO
    // panels) is not installed - an LFO on power or phase would rebuild the reference
    // orbit every frame.
    installModulation();

    // One line the first time a depth is passed (the telemetry store drives it).
    startMilestones();

    // @engine/help, on this app's own topics: the "?" menu with Getting Started,
    // Keyboard Shortcuts (a page written from the shortcuts registry when it is
    // read), Show Hints and its H key, Send Feedback, What's New with its dot,
    // "Show the intro again" and Support GMT. The topics are a lazy chunk; the
    // loader set here also keeps GMT's fractal-renderer help - the default
    // source - out of this app's context menus. The `/` key that opens Help is
    // registered with the app's other keys (hotkeys.ts).
    installDeepZoomHelp();

    // The top bar's centre: "still 37 / 64" while the picture gathers, and the programs
    // being built. Store-free (it reads the telemetry store beside the host), registered
    // here with the other top-bar items.
    topbar.register({ id: 'deep-zoom.status', slot: 'center', order: 0, component: StatusChip });

    // Saved places on the engine's state library (list, thumbnails, slots 1-9; no top-bar
    // menu since F15), the jump undo provider, and this app's keys. The two widgets read
    // the store, so they are registered here and not in registerFeatures.ts.
    installLocations();
    // The Mandelbox's Scale never rests inside the band the renderer cannot draw (deep-zoom/boxScale.ts).
    installBoxScaleRule();
    // The route: the camera move on the timeline. Its track is registered here, before
    // anything below can load a sequence (a key written while the track is unregistered is
    // not swept afterwards), and so are Key Cam's capture and the hook that sets the camera
    // for a scrubbed frame (deep-zoom/route.ts).
    installRoute();
    // The render dialog: the route (or the timeline as it is) as PNG frames into a folder. It
    // registers the timeline toolbar's Render button; the Route tab has one too.
    installRouteRender();
    // ... and the File menu's last row opens that dialog too (the Route tab's Render button does the same).
    menu.registerItem('file', { id: 'file-sep-render', type: 'separator', order: 23 });
    menu.registerItem('file', { id: 'render-route', type: 'button', label: 'Render route…', title: 'Render the route as PNG frames or a video file', order: 24, onSelect: openRenderPopup });
    registerDeepZoomHotkeys();
    componentRegistry.register('dz-locations', LocationsPanel);
    componentRegistry.register('dz-route', RoutePanel);
    componentRegistry.register('dz-starters', StarterDives);
    componentRegistry.register('dz-box-starters', BoxStarters);
    componentRegistry.register('dz-kali-starters', KaliStarters);
    componentRegistry.register('dz-places', KeptPlaces);
    componentRegistry.register('dz-location-text', LocationText);
    componentRegistry.register('dz-julia-here', JuliaHere);
    // The Diagnostics tab's one widget: the renderer's developer levers, host calls only, no
    // store state. The tab itself shows in Advanced mode only (panels.ts).
    componentRegistry.register('dz-diagnostics', Diagnostics);

    // Scenes carry the saved places as a document; a share link carries the look and the view.
    installShare();
    // A FILE of places dropped on the app or picked in File > Open scene is added to My
    // places instead of being read as a scene (deep-zoom/claims.ts).
    installLocationsFileClaim();

    // My Gradients in the top bar (the panel itself is an entry of the manifest, setup.ts), and
    // a gradient FILE dropped on the app or picked in File > Load Scene goes to My Gradients
    // instead of failing as a scene (palette/installGradientFileClaim.ts).
    topbar.register({ id: 'favients-toggle', slot: 'left', order: 40, component: FavientsToggleButton });
    installGradientFileClaim();

    // The panel manifest. After every registration it refers to, and after the
    // store exists (the installs above built it).
    setupDeepZoom();

    // A `#s=` link opens as a scene. Its view is parked until the renderer is mounted and ready.
    const linkOpened = loadShareFromUrl();
    // The session, last: with Settings > Files > Autosave on, the scene as it was left comes
    // back here - unless a link just opened, which is what was asked for on this load - and is
    // kept from here on. Off (the default) this restores nothing and writes nothing.
    const session = installDzSession({ preempted: linkOpened });
    // Neither: a fresh start opens on the formula's Start view (deep-zoom/locations.ts, F7).
    if (!linkOpened && session !== 'restore') startAtStartView();
    // The first-run guide: the engine's tutorial card, lesson 1, "The first dive". On a first
    // visit it starts by itself when the deep renderer is ready - not on a visit that opened a
    // link, whose place is what was asked for. <TutorialRunner /> and <TutorialOverlay /> are
    // mounted in DeepZoomApp.
    installFirstDive({ preempted: linkOpened });
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
