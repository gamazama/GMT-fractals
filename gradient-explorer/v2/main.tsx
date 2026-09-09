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
import { useColorScheme, THEME_PRESETS } from '../../engine/store/colorSchemeStore';
import { safeLocalGet, safeLocalSet } from '../../store/safeLocalStorage';
import { restorePaletteFilters, watchPaletteFilters } from '../../palette/store/paletteFiltersPersist';
import { GradientExplorerV2App } from './GradientExplorerV2App';

registerUI();
installShortcuts();
// Ctrl+Z / Ctrl+Y — the topbar buttons are skipped because there is no TopBarHost here;
// the shell renders its own undo control against the store.
installUndo({ hideTopBarButtons: true });
registerCoreSettings();

// Light grey by default (owner, 2026-09-06), the switch kept: Settings ▸ Colour still offers
// every preset + the axes. The theme axes are SHARED across the GMT apps (gmt.brightness …,
// engine/store/colorSchemeStore.ts), so this seeds the light-grey preset ONCE per browser
// on the first v2 boot and never again — a user who switches back keeps their choice, and
// app-gmt sees the same theme either way, as it always has.
const THEME_SEED_KEY = 'gmt.ge.themeSeeded';
if (!safeLocalGet(THEME_SEED_KEY)) {
  const lightGrey = THEME_PRESETS.find((p) => p.id === 'light-grey');
  if (lightGrey) useColorScheme.getState().applyPreset(lightGrey);
  safeLocalSet(THEME_SEED_KEY, '1');
}

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
