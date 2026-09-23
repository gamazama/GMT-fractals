/**
 * GMT Gradient Explorer v2 — entry point (gradient-explorer.html, and its alias
 * gradient-explorer-next.html — the preview address, kept for links shared from it).
 *
 * The streamlined shell (plans/ge-v2-design.md §6b): no Dock, no TopBarHost, no Hud /
 * SceneIO / timeline. What is installed is exactly what the pieces the shell
 * mounts need — the engine UI registry for AutoFeaturePanel, keyboard shortcuts + undo,
 * the core settings for the Settings panel, and (since 2026-09-13) the Menu + Help plugins,
 * whose registered Help menu the shell opens from its own top-bar buttons rather than a
 * TopBarHost. Toasts need only their host component.
 *
 * Built beside the first shell until parity, then swapped onto its page on 2026-09-16; the
 * first shell is retired.
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
import { registerPaletteSettings } from '../../palette/installPaletteSettings';
import { installMenu } from '../../engine/plugins/Menu';
import { applyPanelManifest } from '../../engine/PanelManifest';
import { feedbackPanelEntry } from '../../engine-gmt/feedback';
import { installGxHelp } from './help/installGxHelp';
import { useColorScheme, THEME_PRESETS } from '../../engine/store/colorSchemeStore';
import { safeLocalGet, safeLocalSet } from '../../store/safeLocalStorage';
import { restorePaletteFilters, watchPaletteFilters } from '../../palette/store/paletteFiltersPersist';
import { loadGlobalSetOnce } from '../../palette/store/globalSetStore';
import { installGxSession, gxAutosaveSettings, GX_AUTOSAVE_TEXT } from './session';
import { GradientExplorerV2App } from './GradientExplorerV2App';
import { FirstRunBrightness } from './FirstRunBrightness';
import { decideFirstRun } from './firstRunDecision';
import { startBootTrace, BootDiag, diagWanted } from './bootTrace';
import { NumberDragFeelProvider } from '../../components/inputs/dragFeel';

const GX_NUMBER_DRAG = { minSlowdown: 2, maxSlowdown: 2.5 };

// First thing after the imports: a phone that dies mid-boot leaves its last mark behind
// (`?diag` shows the previous run's trail — see bootTrace.ts).
startBootTrace();

registerUI();
installShortcuts();
// Ctrl+Z / Ctrl+Y — the topbar buttons are skipped because there is no TopBarHost here;
// the shell renders its own undo control against the store.
installUndo({ hideTopBarButtons: true });
// Files ▸ Autosave governs THIS app's autosave (its own keys, ./session), never app-gmt's.
registerCoreSettings({ autosave: { store: gxAutosaveSettings, ...GX_AUTOSAVE_TEXT } });
registerPaletteSettings();

// The Help menu — GX's own topics, About, What's New, Support and Send Feedback, all through
// the engine's seams (./help/installGxHelp). No TopBarHost renders the menu here: the shell
// opens it from its own top-bar buttons (./ShellMenu). installMenu() first — it is what re-renders
// the rows (a `when`, a badge) when the store changes. The 'Feedback' panel entry gives openFeedback() an open
// state to flip; there is no panel router, so ShellMenu's FeedbackWindow draws it. That apply
// needs the LIVE store (it defers otherwise, see applyPanelManifest) — installMenu's store
// subscription has materialised it by this line.
installMenu();
installGxHelp();
applyPanelManifest([feedbackPanelEntry()]);

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

// The working session: restored from the autosave BEFORE the first render (so the hero's
// first paint is yesterday's gradient, with no undo entry), kept current while you work, and
// saved / loaded as a file from Settings ▸ Files ▸ Session. A share link wins. See ./session.
installGxSession();

// The GX GLOBAL set — gradients shared with everyone using the app. Fetched once per tab,
// never persisted, never merged into the shelf. Failure is quiet: the chip simply does not
// appear (`globalSetStore`), exactly as a licensed catalogue pack that will not load does.
loadGlobalSetOnce();


const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

/** The shell, plus the first-run ask when this browser has never chosen a brightness. */
const Root: React.FC = () => {
  const [asking, setAsking] = React.useState(askBrightness);
  return (
    // GX's number fields drag 2–2.5× slower than their track (owner, 2026-09-13); GMT keeps the
    // default 2–10× for its 1e-6 params. @see components/inputs/numberDragRate.ts
    <NumberDragFeelProvider feel={GX_NUMBER_DRAG}>
      <GradientExplorerV2App />
      {asking && <FirstRunBrightness onDone={() => setAsking(false)} />}
      {diagWanted && <BootDiag />}
    </NumberDragFeelProvider>
  );
};

ReactDOM.createRoot(rootElement).render(
  <AppErrorBoundary>
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  </AppErrorBoundary>,
);
