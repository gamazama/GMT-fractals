// ─────────────────────────────────────────────────────────────────────────────
// This is the engine's SIMPLEST shell — UI chrome (TopBar + Dock + AutoFeaturePanel
// + timeline) with no raymarcher boot. STARTING A NEW STANDALONE SHELL APP whose
// centre is its own surface (a tool/editor/catalog, not a single fractal canvas)?
// Copy this file's boot, not fluid-toy/fractal-toy. Full step-by-step recipe +
// gotchas (boot freeze-order, EngineBridge+RenderLoopDriver for timeline playback,
// tabs-drive-the-centre, hints/keyframes/input reuse) is in:
//     demo/README.md  →  "Starting a NEW standalone shell app"
// Worked example built from that recipe: gradient-explorer/.
// ─────────────────────────────────────────────────────────────────────────────

// Side-effect import — registers DemoFeature with the engine BEFORE
// anything touches the store (createFeatureSlice freezes the registry
// on first store access).
import './demo/registerFeatures';

// Global Tailwind styles (build-time; replaces the cdn.tailwindcss.com Play CDN).
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerUI } from './engine/features/ui';
import { wireDemoPanel } from './demo/setup';
import { getDemoCanvas } from './demo/demoCanvasRef';
import { demoRenderRunner } from './demo/demoRenderRunner';

import { installTopBar } from './engine/plugins/TopBar';
import { installSceneIO } from './engine/plugins/SceneIO';
import { installShortcuts } from './engine/plugins/Shortcuts';
import { installUndo } from './engine/plugins/Undo';
import { installMenu } from './engine/plugins/Menu';
import { installHelp } from './engine/plugins/Help';
import { installHud } from './engine/plugins/Hud';
import { installModulation } from './engine/animation/modulationTick';
import { installModulationUI, setLfoListConfig } from './engine/components/modulation';
import { installRenderDialog } from './engine/plugins/RenderDialog';
import { installPwaUpdate } from './engine/plugins/PwaUpdate';

// Boots the engine's UI registry (AutoFeaturePanel + built-in widgets).
registerUI();

// Plugin installs. Order matters in two places:
//   - installMenu() before installHelp(); Help registers a dropdown
//     into the menu host.
//   - installTopBar() before plugins that put items in the topbar.
//
// Lines between SHOWCASE markers are sliced verbatim into the
// on-screen explainer panel via Vite `?raw` — keep them readable.
// __SHOWCASE_START__
installTopBar();
installSceneIO({ getCanvas: () => getDemoCanvas() });
installShortcuts();
installUndo();
installMenu();
installHelp();
installHud();
installModulation();
installModulationUI();
installRenderDialog({ runner: demoRenderRunner, showSamplesPerFrame: false, disableDiskMode: true });
// __SHOWCASE_END__

// PWA update pill — same Update banner the sibling apps mount so users
// don't get stranded on stale bundles. Not inside the SHOWCASE block
// because it's deployment plumbing, not a feature being showcased.
installPwaUpdate();

// A fresh LFO defaults to demo.position_x — gives the user a visible
// wiggle the moment they hit "Add LFO".
setLfoListConfig({ defaultTarget: 'demo.position_x' });

// Demo-flavoured wiring: panel manifest, custom shortcuts, hint pill.
wireDemoPanel();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
