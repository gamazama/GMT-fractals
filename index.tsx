
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerUI } from './features/ui';

// Dev mode: unregister any stale service workers left behind by `npm run preview`.
// Dev and preview share port 3000, so a SW registered in preview keeps hijacking
// dev requests until it's unregistered — causing stale code with no way to refresh.
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

// Initialize UI Registry (Connects Components to the System)
registerUI();

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
