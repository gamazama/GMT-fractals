
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerUI } from './features/ui';

// Emergency SW Cleanup
if ('serviceWorker' in navigator) {
  try {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for(let registration of registrations) {
          registration.unregister().then(() => console.log('SW Unregistered'));
        }
      }).catch(() => {});
  } catch (e) {
      console.debug("SW cleanup skipped");
  }
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
