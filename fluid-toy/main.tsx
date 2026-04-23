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
import { registerCameraKeyTracks } from '../engine/animation/cameraKeyRegistry';

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

// Camera tracks for the shared TimelineToolbar's Key Cam button.
registerCameraKeyTracks(['sceneCamera.center', 'sceneCamera.zoom']);

setupFluidToy();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <FluidToyApp />
  </React.StrictMode>
);
