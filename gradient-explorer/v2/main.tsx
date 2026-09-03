/**
 * GMT Gradient Explorer v2 — entry point (gradient-explorer-next.html).
 *
 * The streamlined shell (plans/ge-v2-design.md §6b): no Dock, no TopBarHost, no Menu /
 * Help / Hud / SceneIO / timeline. What is installed is exactly what the pieces the shell
 * mounts need — the engine UI registry for AutoFeaturePanel, keyboard shortcuts + undo,
 * and the core settings for the Settings panel. Toasts need only their host component.
 *
 * Built beside the old shell (gradient-explorer/main.tsx) until parity; the old entry
 * page is untouched.
 */

// Side-effect: features + stores registered BEFORE the store is constructed.
import './registerFeatures';

import '../../index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppErrorBoundary } from '../../engine/components/AppErrorBoundary';
import { registerUI } from '../../engine/features/ui';
import { installShortcuts } from '../../engine/plugins/Shortcuts';
import { installUndo } from '../../engine/plugins/Undo';
import { registerCoreSettings } from '../../store/coreSettings';
import { restorePaletteFilters, watchPaletteFilters } from '../../palette/store/paletteFiltersPersist';
import { GradientExplorerV2App } from './GradientExplorerV2App';

registerUI();
installShortcuts();
// Ctrl+Z / Ctrl+Y — the topbar buttons are skipped because there is no TopBarHost here;
// the shell renders its own undo control against the store.
installUndo({ hideTopBarButtons: true });
registerCoreSettings();

// Browse filter prefs (shared `gmt.paletteFilters`) — restored + watched exactly as the
// old shell's mountFavientsPanel did, minus the dock-panel state it also managed.
restorePaletteFilters();
watchPaletteFilters();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

ReactDOM.createRoot(rootElement).render(
  <AppErrorBoundary>
    <React.StrictMode>
      <GradientExplorerV2App />
    </React.StrictMode>
  </AppErrorBoundary>,
);
