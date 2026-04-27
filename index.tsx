// ── Add-on registration ──
// This import runs BEFORE App loads the store, so demo's feature is
// in the registry by the time createFeatureSlice iterates it. Any
// engine add-on follows the same pattern: a side-effect module that
// registers definitions + UI components before the store is created.
import './demo/registerFeatures';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerUI } from './engine/features/ui';
import { wireDemoPanel } from './demo/setup';

// Core plugin installs. Each is a one-liner that demonstrates
// "register a feature, get this for free":
//   topbar      — host slot for save/load + undo/redo + custom items
//   scene-io    — Save / Load buttons; demo state round-trips through
//                 SceneFormat without any per-feature plumbing
//   shortcuts   — keyboard registry; required by undo and the R-to-
//                 randomize binding registered in demo/setup.ts
//   undo        — Ctrl+Z / Ctrl+Y on every DDFS slice change for free,
//                 plus Undo/Redo topbar buttons
//   help        — "?" menu in the topbar + <HelpOverlay /> mounted in App
//   hud         — generic slot host so the cheatsheet pill has a home
//   modulation  — animation/LFO tick. Demo doesn't ship a track yet but
//                 the tick must exist for animationStore consumers (e.g.
//                 the timeline) to advance. Cheap test of generic
//                 behaviour: if the demo boots clean with this on,
//                 modulation has no app-specific assumptions.
import { installTopBar } from './engine/plugins/TopBar';
import { installSceneIO } from './engine/plugins/SceneIO';
import { installShortcuts } from './engine/plugins/Shortcuts';
import { installUndo } from './engine/plugins/Undo';
import { installHelp } from './engine/plugins/Help';
import { installHud } from './engine/plugins/Hud';
import { installModulation } from './engine/animation/modulationTick';
import { installModulationUI, setLfoListConfig } from './engine/components/modulation';

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

// Initialize the engine's UI registry (AutoFeaturePanel + built-in components)
registerUI();

// Install core plugins — order doesn't matter, they're independent.
installTopBar();
installSceneIO();
installShortcuts();
installUndo();
installHelp();
installHud();
installModulation();
installModulationUI();
// Default a fresh LFO to demo.position_x — vec axis path that exercises
// the seedBaseValue split, gives the user a visible wiggle right after
// "Add LFO". Smoke harness for the lift: if the dropdown / target /
// liveModulations chain has any GMT-coupling left, the square won't
// wiggle here.
setLfoListConfig({ defaultTarget: 'demo.position_x' });

// Add-on: wire the demo panel into the right dock + register the
// R-to-randomize shortcut + bottom-left hint pill. Requires the store
// to exist, so it runs after App has been imported.
wireDemoPanel();

// Dev-only: surface componentId typos at boot instead of silently
// rendering a black viewport. Lazy-imported so the validator code
// doesn't ship in prod.
if (import.meta.env.DEV) {
  Promise.all([
    import('./engine/FeatureSystem'),
    import('./components/registry/ComponentRegistry'),
  ]).then(([fs, cr]) => fs.validateComponentRefs(cr.componentRegistry));
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
