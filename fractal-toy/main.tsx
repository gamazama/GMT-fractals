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

// Step 1: side-effect registration. MUST come before anything that
// touches the store.
import './registerFeatures';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { FractalToyApp } from './FractalToyApp';
import { registerUI } from '../features/ui';
import { setupFractalToy } from './setup';

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
