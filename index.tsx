// ── Add-on registration ──
// This import runs BEFORE App loads the store, so demo's feature is
// in the registry by the time createFeatureSlice iterates it. Any
// engine add-on follows the same pattern: a side-effect module that
// registers definitions + UI components before the store is created.
import './demo/registerFeatures';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerUI } from './features/ui';
import { wireDemoPanel } from './demo/setup';

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

// Add-on: wire the demo panel into the right dock. Requires the store
// to exist, so it runs after App has been imported.
wireDemoPanel();

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
