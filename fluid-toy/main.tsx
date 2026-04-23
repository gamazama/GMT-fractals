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

import './registerFeatures';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluidToyApp } from './FluidToyApp';
import { registerUI } from '../features/ui';
import { setupFluidToy } from './setup';
import { installViewport } from '../engine/plugins/Viewport';
import { installTopBar } from '../engine/plugins/TopBar';
import { installSceneIO } from '../engine/plugins/SceneIO';
import { registerCameraKeyTracks } from '../engine/animation/cameraKeyRegistry';
import { installModulation } from '../engine/animation/modulationTick';
import { installShortcuts } from '../engine/plugins/Shortcuts';
import { installOrbitSync } from './orbitTick';

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length === 0) return;
    regs.forEach((r) => r.unregister());
    if ('caches' in window) caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    console.info('[dev] Cleared stale service worker + caches. Reload to see fresh code.');
  });
}

registerUI();

// Install @engine/viewport. Fluid sims are sensitive to resolution —
// the user DOES notice when simResolution drops — so we ramp gradually
// with a longer cooldown. Target 45 fps because fluid sim can usually
// sustain that on modest hardware at reasonable resolutions.
// Fluid sim has no idle state (simulation always runs), so alwaysActive=true
// keeps adaptive engaged rather than letting it settle to full-res after
// "activity" stops. Smart mode converges to targetFps via GMT's sqrt-based
// scale math — see viewportSlice.ts reportFps.
installViewport({
    enabled: true,
    alwaysActive: true,
    targetFps: 45,
    minQuality: 0.4,
    interactionDownsample: 0.5,  // manual-mode fallback when targetFps=0
    activityGraceMs: 100,
});

// @engine/topbar — registers default items (project name, FPS, adaptive
// badge). Save/load etc. slot-register from other plugins when those land.
installTopBar();

// @engine/scene-io — Save + Load buttons into the topbar. PNG save
// reads from the single canvas the app mounts (query by tag since
// fluid-toy has one top-level canvas).
installSceneIO({
    getCanvas: () => document.querySelector('canvas'),
});

// Camera tracks for the shared TimelineToolbar's Key Cam button.
registerCameraKeyTracks(['sceneCamera.center', 'sceneCamera.zoom']);

// Canonical modulation tick — processes the store's `animations` array
// each frame into liveModulations (base + offset for every target).
// Any app with continuous-driver features (LFO, audio-reactive, etc.)
// installs this once.
installModulation();

// @engine/shortcuts — window-level keyboard listener, scope-aware
// dispatcher. Hotkey registrations happen inside FluidToyApp so they
// can close over engineRef for FluidEngine.resetFluid().
installShortcuts();

// Orbit → animations array sync. When orbit DDFS params change, we
// rewrite the two sine LFOs on julia.juliaC.x/.y that drive the orbit.
// No per-frame work here; modulationTick does the oscillator math.
installOrbitSync();

setupFluidToy();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <FluidToyApp />
  </React.StrictMode>
);
