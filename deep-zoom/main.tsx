/**
 * deep-zoom/main.tsx — boot for the deep-zoom tool (Vite entry: `deep-zoom.html`).
 *
 * Deliberately the lean boot (the mesh-export pattern): no engine store, no plugins. The tool is
 * a React shell around the standalone renderer; see `DeepZoomApp.tsx` and `bridge.ts`.
 * `window.__dzStore` is the smoke/debug handle onto the tool's own store (`smoke:deep-zoom`).
 */
import '../index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppErrorBoundary } from '../engine/components/AppErrorBoundary';
import { DeepZoomApp } from './DeepZoomApp';
import { useDeepZoom } from './store';

(window as unknown as { __dzStore: typeof useDeepZoom }).__dzStore = useDeepZoom;

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
    <AppErrorBoundary>
        <React.StrictMode>
            <DeepZoomApp />
        </React.StrictMode>
    </AppErrorBoundary>,
);
