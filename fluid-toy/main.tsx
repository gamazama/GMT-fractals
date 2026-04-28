/**
 * Fluid Toy — entry point (ported onto the engine from `toy-fluid/`).
 *
 * The original toy-fluid prototype at `toy-fluid/` stays untouched as
 * a reference — served at /toy-fluid.html using its own useState +
 * bespoke RAF loop + private savedState.ts etc. The fluid-toy here is
 * the engine-native port: DDFS features, viewport plugin, SceneFormat
 * save/load, AnimationEngine keyframes, AdvancedGradientEditor.
 *
 * Per the "GMT-better generic refactor" filter: features that GMT or
 * the engine already does better get reused (viewport adaptive loop,
 * gradient editor, SceneFormat, handleInteractionStart/End). Features
 * unique to fluid-toy (FluidEngine sim, particle emitter, brush, c-picker)
 * stay app-local.
 */

// Side-effect registrations — features + plugin preset fields. MUST
// come before anything that touches the store (which freezes the
// registries). Plugins with preset fields are imported here purely
// for their module-level side effects.
import './registerFeatures';
// storeTypes.ts is a type-only declaration file — no runtime import
// needed; its declare-module augments AppFeatureSlices wherever
// typedSlices is imported.
import './migrations';                         // registers fluid-toy slice migrations
import '../engine/plugins/camera/presetField';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluidToyApp } from './FluidToyApp';
import { registerUI } from '../engine/features/ui';
import { setupFluidToy } from './setup';
import { installViewport } from '../engine/plugins/Viewport';
import { installTopBar } from '../engine/plugins/TopBar';
import { installPauseControls } from '../engine/plugins/topbar/PauseControls';
import { installSceneIO } from '../engine/plugins/SceneIO';
import { registerCameraKeyTracks } from '../engine/animation/cameraKeyRegistry';
import { installModulation } from '../engine/animation/modulationTick';
import { installModulationUI } from '../engine/components/modulation';
import { installShortcuts } from '../engine/plugins/Shortcuts';
import { installUndo } from '../engine/plugins/Undo';
import { installCamera, camera } from '../engine/plugins/Camera';
import { installMenu } from '../engine/plugins/Menu';
import { installHelp, help } from '../engine/plugins/Help';
import { installHud, hud } from '../engine/plugins/Hud';
import { QualityBadge } from './components/QualityBadge';
import { HotkeysCheatsheet } from './components/HotkeysCheatsheet';
import { useEngineStore } from '../store/engineStore';
import { installFluidToyViewLibrary } from './viewLibrary';
import { ViewLibraryPanel } from './components/ViewLibraryPanel';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { registerRenderPopup } from '../engine/animation/renderPopupRegistry';
import { RenderDialog } from './components/RenderDialog';

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length === 0) return;
    regs.forEach((r) => r.unregister());
    if ('caches' in window) caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    console.info('[dev] Cleared stale service worker + caches. Reload to see fresh code.');
  });
}

registerUI();

// Override the default sampleCap (256, sized for GMT's path tracer).
// Fluid-toy's TSAA only needs a fraction of that to look clean —
// 64 samples ≈ 1s of accumulation at 60fps. The deep-accum gate
// in viewportSlice fires at sampleCap/2 = 32, so adaptive stops
// kicking in well before the fractal fully settles, keeping unrelated
// slider drags from flipping resolution.
useEngineStore.getState().setSampleCap(64);

// Install @engine/viewport. Adaptive scales ONLY the fractal/canvas
// render target (FluidToyApp wires `quality` into engine.resize()).
// The fluid sim grid runs at the user's chosen resolution full-time —
// adaptive does not touch it.
//
// engageOnAccumOnly: adaptive fires ONLY while the fractal's
// accumulator is being reset (camera pan, Julia param scrub). Dragging
// unrelated UI sliders or moving the mouse off the canvas does not
// drop quality. The deep-accum gate (sampleCap/2) closes the loop —
// once the fractal has settled, adaptive can't re-engage until the
// next genuine fractal-invalidating change.
installViewport({
    enabled: true,
    targetFps: 45,
    minQuality: 0.4,
    interactionDownsample: 0.5,  // manual-mode fallback when targetFps=0
    activityGraceMs: 100,
    engageOnAccumOnly: true,
});

// @engine/topbar — registers default items (project name, FPS, adaptive
// badge). Save/load etc. slot-register from other plugins when those land.
installTopBar();

// @engine/topbar/PauseControls — GMT-style pause button + accumulation
// sample-cap popover. Reads renderControlSlice (isPaused, sampleCap)
// which fluid-toy also consumes for TSAA gating, so one click toggles
// both render-loop pause AND TSAA accumulation.
installPauseControls();

// @engine/scene-io — Save + Load buttons into the topbar. PNG save
// reads from the single canvas the app mounts (query by tag since
// fluid-toy has one top-level canvas).
installSceneIO({
    getCanvas: () => document.querySelector('canvas'),
});

// Camera tracks for the shared TimelineToolbar's Key Cam button.
// Vec components use UNDERSCORE form (GMT convention) — matches
// AutoFeaturePanel's vec2 trackKeys so live-value and Key-Cam
// keyframes index into the same tracks. Pan/zoom live on the julia
// slice (moved out of the retired SceneCamera feature to match the
// reference toy-fluid's Fractal-tab layout).
// `centerLow_*` carries the sub-f64 lo word of the DD pan accumulator.
// Skipping it would lose deep-zoom keyframes to f64 ulp grid quantization
// on every interpolated frame between two deep-zoom views (zoom <1e-15).
registerCameraKeyTracks([
    'julia.center_x',
    'julia.center_y',
    'julia.centerLow_x',
    'julia.centerLow_y',
    'julia.zoom',
]);

// Canonical modulation tick — processes the store's `animations` array
// each frame into liveModulations (base + offset for every target).
// Any app with continuous-driver features (LFO, audio-reactive, etc.)
// installs this once.
installModulation();

// Register the LFO list widget under id 'lfo-list' for the Modulation
// panel to reference. The widget owns its own "Add LFO" / per-LFO knobs
// UI — replaces the bespoke Auto-orbit-c block that used to live on the
// Coupling tab. Targeting julia.juliaC_x / _y at 90° phase reproduces
// the classic auto-orbit, with full waveform + smoothing control.
installModulationUI();

// @engine/shortcuts — window-level keyboard listener, scope-aware
// dispatcher. Hotkey registrations happen inside FluidToyApp so they
// can close over engineRef for FluidEngine.resetFluid().
installShortcuts();

// @engine/undo — unified transaction stack. Ctrl+Z / Ctrl+Y via
// @engine/shortcuts; Undo/Redo buttons in topbar's right slot.
installUndo();

// @engine/camera — adapter-based slot system (Ctrl+1..9 save, 1..9 recall)
// + preset round-trip for saved camera state.
//
// Slot shortcuts are skipped here (`hideShortcuts: true`) — the
// state-library install below registers the same key bindings, but
// drives the named/thumbnailed `savedViews` library instead of the
// legacy anonymous-numbered cameraSlots[]. The camera plugin's
// preset-field round-trip stays active for scene save/load.
installCamera({ hideShortcuts: true });

// Register fluid-toy's 2D camera with the plugin. captureState +
// applyState work on an opaque JSON blob — the plugin doesn't need
// to know it's 2D (center + zoom) vs 3D. Pan/zoom live on the julia
// slice after the Fractal-tab consolidation pass.
camera.register({
    featureId: 'julia',
    captureState: () => {
        const s = useEngineStore.getState();
        return { center: { ...s.julia.center }, zoom: s.julia.zoom };
    },
    applyState: (state) => {
        useEngineStore.getState().setJulia({
            center: state.center,
            zoom: state.zoom,
        });
    },
});

// @engine/menu — generic dropdown-menu host. Plugins register their own
// menus (help, system, …) into topbar slots; each menu can be extended
// with items by other plugins. No auto-registered menus; installing is
// purely "make the API ready."
installMenu();

// @engine/help — the "?" menu in the topbar right slot with Getting
// Started, Keyboard Shortcuts, and the "Show Hints" toggle. Also
// registers the H shortcut and provides <HelpOverlay /> (mounted in
// FluidToyApp) which renders the lazy HelpBrowser when opened.
installHelp();

// @engine/hud — generic slot-based overlay host. <HudHost /> is mounted
// inside FluidToyApp's ViewportFrame. Apps register whatever widgets
// they want; the engine only prescribes the layout slots.
installHud();

// Bottom-left HUD stack (reference matches this layout):
//   - Hotkeys cheatsheet (via help.registerHudHint, gated on showHints)
//   - Adaptive-quality q##% badge (always on)

help.registerHudHint({
    id: 'fluid-toy-controls',
    slot: 'bottom-left',
    order: 0,
    // Custom component — matches the reference toy-fluid's hotkeys
    // panel with a collapsible "? hotkeys" pill state. The engine's
    // default pill-row hud hint is kept for simpler apps.
    component: HotkeysCheatsheet,
});

hud.register({
    id: 'fluid-toy.quality',
    slot: 'bottom-left',
    order: 10,  // below the cheatsheet
    component: QualityBadge,
});

// Saved-views library — one call wires everything: slice CRUD, slot
// shortcuts (Ctrl+1..9 save, 1..9 recall), and topbar Camera menu.
// Must run AFTER installMenu / installShortcuts so their registries
// exist, and BEFORE setupFluidToy so the Views panel finds the slice.
installFluidToyViewLibrary();

// `panel-views` is referenced from the manifest by `component:`. It's
// registered here (after the store + slice install) rather than in
// registerFeatures.ts because importing the panel pulls useEngineStore
// into the module graph, which would freeze the registry before
// feature registrations complete.
componentRegistry.register('panel-views', ViewLibraryPanel);

// Register the video-export dialog so the shared TimelineToolbar's
// "Render" button surfaces it. Without this the button stays hidden.
registerRenderPopup(RenderDialog);

setupFluidToy();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <FluidToyApp />
  </React.StrictMode>
);
