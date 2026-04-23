/**
 * Fractal Toy — entry point.
 *
 * Minimal raymarched-fractal add-on built on the engine. The nucleus
 * of the eventual full GMT port and the second live consumer of the
 * engine's plugin surface (alongside the Demo add-on and the future
 * toy-fluid port). See docs/01_Architecture.md and HANDOFF.md.
 *
 * The three-file add-on contract (see docs/03_Plugin_Contract.md):
 *   1. `fractal-toy/registerFeatures.ts` — side-effect: registers
 *      DDFS features + viewport overlay with the engine's registries.
 *      Imported FIRST so registrations land before createEngineStore.
 *   2. Engine store is constructed on first touch (via FractalToyApp's
 *      store usage) — feature registry is frozen here.
 *   3. `fractal-toy/setup.ts` — seeds panel state after React mounts.
 */

// Step 1: side-effect registrations — features + plugin preset fields.
// MUST come before anything that touches the store (which freezes the
// registries). Plugins with preset fields are imported here purely
// for their module-level side effects.
import './registerFeatures';
import '../engine/plugins/camera/presetField';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { FractalToyApp } from './FractalToyApp';
import { registerUI } from '../features/ui';
import { setupFractalToy } from './setup';
import { installViewport } from '../engine/plugins/Viewport';
import { installTopBar } from '../engine/plugins/TopBar';
import { installSceneIO } from '../engine/plugins/SceneIO';
import { installShortcuts } from '../engine/plugins/Shortcuts';
import { installUndo } from '../engine/plugins/Undo';
import { installCamera, camera } from '../engine/plugins/Camera';
import { useFractalStore } from '../store/fractalStore';
import { registerCameraKeyTracks } from '../engine/animation/cameraKeyRegistry';

// Dev mode: unregister any stale service workers left behind by `npm run preview`.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length === 0) return;
    regs.forEach((r) => r.unregister());
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    }
    console.info('[dev] Cleared stale service worker + caches. Reload to see fresh code.');
  });
}

// Initialize the engine's built-in UI registry (AutoFeaturePanel etc.)
registerUI();

// Install @engine/viewport. Raymarching is per-pixel-expensive so we
// target 30 FPS and let the adaptive loop drop to 35% on pressure.
// interactionDownsample of 0.55 keeps drags responsive without
// looking unrecognisable.
// Fractal-toy = GMT-style: mouse-on-canvas idle → full-res (user is
// looking at the result). alwaysActive=false (default).
installViewport({
    enabled: true,
    targetFps: 30,
    minQuality: 0.35,
    interactionDownsample: 0.55,
    activityGraceMs: 100,
});

// @engine/topbar — slot host + default items (project name, FPS,
// adaptive badge).
installTopBar();

// @engine/scene-io — Save + Load buttons.
installSceneIO({
    getCanvas: () => document.querySelector('canvas'),
});

// @engine/shortcuts — window-level keyboard dispatcher. Fractal-toy
// registers camera reset + any app-specific hotkeys inside its App
// component where it has access to feature state.
installShortcuts();

// @engine/undo — unified transaction stack.
installUndo();

// @engine/camera — adapter-based slot system. Fractal-toy's 3D orbit
// camera registers with the plugin so Ctrl+1..9 save + 1..9 recall
// work on the orbit params.
installCamera();
camera.register({
    featureId: 'camera',
    captureState: () => {
        const s = useFractalStore.getState() as any;
        const c = s.camera;
        return {
            orbitTheta: c?.orbitTheta,
            orbitPhi: c?.orbitPhi,
            distance: c?.distance,
            fov: c?.fov,
            target: { ...c?.target },
        };
    },
    applyState: (state) => {
        (useFractalStore.getState() as any).setCamera({
            orbitTheta: state.orbitTheta,
            orbitPhi: state.orbitPhi,
            distance: state.distance,
            fov: state.fov,
            target: state.target,
        });
    },
});

// Tell the shared <TimelineToolbar> which tracks make up "the camera"
// for this app — it uses these for the Key Cam button's capture +
// dirty-detection logic. Fractal-toy uses a 4-DOF orbit camera.
// Scalar paths — vec2/vec3 params split into .x/.y/.z components so
// captureCameraKeyFrame can path-resolve each to a number.
registerCameraKeyTracks([
    'camera.orbitTheta',
    'camera.orbitPhi',
    'camera.distance',
    'camera.fov',
    'camera.target.x',
    'camera.target.y',
    'camera.target.z',
]);

// Seed panel state after mount.
setupFractalToy();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <FractalToyApp />
  </React.StrictMode>
);
