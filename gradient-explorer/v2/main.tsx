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
import { setV2FavientsPanelKey } from '../../palette/store/favientsPanelPersist';
import { GradientExplorerV2App } from './GradientExplorerV2App';
import { FirstRunBrightness } from './FirstRunBrightness';
import { decideFirstRun } from './firstRunDecision';

registerUI();
installShortcuts();
// Ctrl+Z / Ctrl+Y — the topbar buttons are skipped because there is no TopBarHost here;
// the shell renders its own undo control against the store.
installUndo({ hideTopBarButtons: true });
registerCoreSettings();

/**
 * Light grey by default (owner, 2026-09-06), the switch kept: Settings ▸ Colour still offers
 * every preset + the axes. The theme axes are SHARED across the GMT apps (gmt.brightness …,
 * engine/store/colorSchemeStore.ts), so this runs ONCE per browser and never again.
 *
 * Until 2026-09-09 this applied Light Grey silently. It now applies the same preset and
 * ASKS (§8b item 3, `FirstRunBrightness`) — brightness is the one default that cannot be
 * right for everyone, because how bright the chrome is decides how the colours inside it
 * read. Returns whether to ask.
 *
 * The `gmt.brightness === null` test is the part that matters, and it is a fix as well as a
 * gate: the silent seed applied Light Grey whenever the SEED key was unset, which on a
 * user's first v2 boot OVERRODE a brightness they had already chosen in app-gmt. Someone
 * who has chosen keeps their choice and is not asked; only a genuinely new user is.
 */
const THEME_SEED_KEY = 'gmt.ge.themeSeeded';
const BRIGHTNESS_KEY = 'gmt.brightness';

const decideFirstRunBrightness = (): boolean => {
  const seeded = !!safeLocalGet(THEME_SEED_KEY);
  const verdict = decideFirstRun({ seeded, chosenBrightness: safeLocalGet(BRIGHTNESS_KEY) });
  // Written BEFORE the card can render, so a refresh mid-decision does not ask again.
  if (!seeded) safeLocalSet(THEME_SEED_KEY, '1');
  if (verdict === 'quiet') return false;
  const lightGrey = THEME_PRESETS.find((p) => p.id === 'light-grey');
  if (lightGrey) useColorScheme.getState().applyPreset(lightGrey);
  return true;
};

const askBrightness = decideFirstRunBrightness();

// Browse filter prefs (shared `gmt.paletteFilters`) — restored + watched exactly as the
// old shell's mountFavientsPanel did, minus the dock-panel state it also managed.
restorePaletteFilters();
watchPaletteFilters();

// v2 renders the My Gradients panel inside its own Floating and mounts no panel WINDOW,
// so it never called restoreFavientsPanel — which left the shelf's grid/list preference
// writing into app-gmt's blob and back (the 2026-09-08 migration audit §3.8b). Claim a key
// of our own; nothing else about the panel's window machinery is wanted here.
setV2FavientsPanelKey('gmt.ge.v2.favients.panel');

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

/** The shell, plus the first-run ask when this browser has never chosen a brightness. */
const Root: React.FC = () => {
  const [asking, setAsking] = React.useState(askBrightness);
  return (
    <>
      <GradientExplorerV2App />
      {asking && <FirstRunBrightness onDone={() => setAsking(false)} />}
    </>
  );
};

ReactDOM.createRoot(rootElement).render(
  <AppErrorBoundary>
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  </AppErrorBoundary>,
);
