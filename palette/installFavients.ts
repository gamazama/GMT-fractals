/**
 * installFavients — the host-facing helpers that bring up the Favients shelf, so each
 * app stops copy-pasting the same manifest entry + restore/watch boilerplate.
 *
 * The shelf's SHARED registration (panel component, history/document providers, the
 * gradient-editor entrance + bridge, starter presets) already lives in
 * `registerPaletteUI`. What each app repeated by hand was:
 *   1. the `{ id:'Favients', component:'panel-favients' }` manifest entry, and
 *   2. the `restoreFavientsPanel` + `watchFavientsPanel` (+ picker-filters) bring-up.
 * Those are now `favientsPanelEntry()` (mirrors `feedbackPanelEntry()`) and
 * `mountFavientsPanel()`. What stays per-app is the genuinely host-specific bit: which
 * send TARGETS a favourite applies to, and the browse/studio header actions.
 *
 * Lives in `palette/` (imports only palette + engine, never an app) so all three hosts
 * (app-gmt, fluid-toy, the Gradient Explorer) share it.
 */

import type { PanelDefinition } from '../engine/PanelManifest';
import {
  restoreFavientsPanel,
  watchFavientsPanel,
  type FavientsLocation,
} from './store/favientsPanelPersist';
import { restorePaletteFilters, watchPaletteFilters } from './store/paletteFiltersPersist';

/** The Favients shelf's panel-manifest entry. Spread into a host's `applyPanelManifest`
 *  list (the same shape `feedbackPanelEntry()` returns). */
export const favientsPanelEntry = (opts: {
  dock: 'left' | 'right' | 'float';
  order?: number;
}): PanelDefinition => ({
  id: 'Favients',
  dock: opts.dock,
  order: opts.order ?? 90,
  component: 'panel-favients',
  isCore: false,
});

export interface FavientsMountConfig {
  /** localStorage key for THIS host's panel window-state. Keeps each app's docking /
   *  position independent (the favourite COLLECTION stays shared via its own key). */
  storageKey?: string;
  /** First-run location when nothing is saved. Defaults to 'float'. */
  location?: FavientsLocation;
  /** First-run tab order when docked. */
  order?: number;
  /** First-run open state. Defaults to true. */
  open?: boolean;
  /** Float-window fallback rect (used when floating, or after an undock). Sensible
   *  middle-left defaults fill any field left out. */
  float?: { x?: number; y?: number; w?: number; h?: number };
  /** Also restore+watch the picker's swatch-size / padding prefs. Hosts with a picker UI
   *  (app-gmt, the Explorer) want this; fluid-toy (no picker) passes `false`. Default true. */
  paletteFilters?: boolean;
}

/** Restore + watch the Favients panel (and, by default, the picker filters) for a host.
 *  Call AFTER `applyPanelManifest` registered the entry (`favientsPanelEntry`). */
export const mountFavientsPanel = (cfg: FavientsMountConfig = {}): void => {
  const fh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const opts = cfg.storageKey ? { storageKey: cfg.storageKey } : undefined;
  restoreFavientsPanel(
    {
      x: cfg.float?.x ?? 20,
      y: cfg.float?.y ?? Math.max(20, Math.round(fh / 2 - 160)),
      w: cfg.float?.w ?? 296,
      h: cfg.float?.h ?? 320,
      open: cfg.open ?? true,
      location: cfg.location,
      order: cfg.order,
    },
    opts,
  );
  watchFavientsPanel(opts);
  if (cfg.paletteFilters !== false) {
    restorePaletteFilters();
    watchPaletteFilters();
  }
};

/** The common Favients "studio" header action: open the standalone GMT Gradient Explorer
 *  in a new tab. app-gmt + fluid-toy share this; the Explorer itself leaves it unset. */
export const openGradientExplorer = (): void => {
  window.open('gradient-explorer.html', '_blank', 'noopener');
};
