/**
 * favientsPanelPersist — remembers the Favients panel's open-state, location (float /
 * docked side), position, and size across sessions. The panel itself lives in the engine
 * store's PanelState, which isn't persisted by default, so each host calls
 * `restoreFavientsPanel()` after its manifest is applied and `watchFavientsPanel()` once
 * to mirror later changes back to storage.
 *
 * The storage key is per-host (`opts.storageKey`): app-gmt floats the shelf and persists
 * under the default `gmt.favients.panel`, while the standalone Gradient Explorer docks it
 * right by default and persists under its OWN key — so the two apps don't read each
 * other's docking state through same-origin `localStorage`.
 */

import { useEngineStore } from '../../store/engineStore';
import { lsGetJson, lsSetJson } from '../core/storage';

const DEFAULT_LS = 'gmt.favients.panel';
const PANEL_ID = 'Favients';

/** Where the panel lives: a free-floating window, or docked into a side tab strip. */
export type FavientsLocation = 'float' | 'left' | 'right';

/** Swatch shelf layout: a wrapping swatch grid, or a single-column detail list. */
export type FavientsViewMode = 'grid' | 'list';

export interface FavientsPanelDefaults {
  x: number;
  y: number;
  w: number;
  h: number;
  open: boolean;
  /** First-run location when nothing is saved yet. Defaults to 'float'. */
  location?: FavientsLocation;
  /** Tab order when `location` is a dock side. Defaults to 0. */
  order?: number;
}

/** Per-host persistence options. */
export interface FavientsPersistOptions {
  /** localStorage key. Defaults to the shared `gmt.favients.panel`. */
  storageKey?: string;
}

interface Stored {
  open: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  location?: FavientsLocation;
  order?: number;
  /** Shelf layout (W5). Optional + absent-means-'grid', so pre-W5 saved blobs
   *  (which never carried it) read back as the default — backward-compatible. */
  viewMode?: FavientsViewMode;
}

/** The per-host storage key in effect, captured from the last restoreFavientsPanel
 *  call (hosts pass it once at boot, before the panel mounts). The panel reads/writes
 *  its viewMode under THIS key so the two apps don't share layout through same-origin
 *  localStorage. Falls back to the shared default until a host registers. */
let activeStorageKey = DEFAULT_LS;

type PanelEntry = {
  isOpen?: boolean;
  location?: FavientsLocation;
  order?: number;
  floatPos?: { x: number; y: number };
  floatSize?: { width: number; height: number };
};
type StoreActions = Record<string, (...a: unknown[]) => void>;

/** Float + open the Favients panel (bring it up if docked/closed). Shared entrance
 *  used by the picker link, the overlay header, and the gradient editor. */
export const openFavientsPanel = (): void => {
  const st = useEngineStore.getState() as unknown as StoreActions;
  st.movePanel?.(PANEL_ID, 'float');
  st.togglePanel?.(PANEL_ID, true);
};

/** Reactive: is the Favients panel currently open? Lets a header affordance (the editor's
 *  Favients button) switch between "open the shelf" and "add the current gradient to the
 *  already-open shelf". Keeps the PANEL_ID contract in this module. */
export const useFavientsPanelOpen = (): boolean =>
  useEngineStore(
    (s) => !!(s as unknown as { panels?: Record<string, { isOpen?: boolean }> }).panels?.[PANEL_ID]?.isOpen,
  );

/** Restore the panel at its remembered (or default) location + open-state. Call after
 *  the host's applyPanelManifest registered the `Favients` panel. */
export const restoreFavientsPanel = (defaults: FavientsPanelDefaults, opts?: FavientsPersistOptions): void => {
  const st = useEngineStore.getState() as unknown as StoreActions;
  const key = opts?.storageKey ?? DEFAULT_LS;
  activeStorageKey = key; // remember it so the panel's viewMode persists per-host
  const saved = lsGetJson<Stored | null>(key, null);
  const x = saved?.x ?? defaults.x;
  const y = saved?.y ?? defaults.y;
  const w = saved?.w ?? defaults.w;
  const h = saved?.h ?? defaults.h;
  const open = saved ? saved.open : defaults.open;
  const location = saved?.location ?? defaults.location ?? 'float';

  // Always remember the float spot/size so a later undock returns the panel to
  // its last floating position, regardless of where it starts.
  st.setFloatPosition?.(PANEL_ID, x, y);
  st.setFloatSize?.(PANEL_ID, w, h);
  if (location === 'float') st.movePanel?.(PANEL_ID, 'float');
  else st.movePanel?.(PANEL_ID, location, saved?.order ?? defaults.order ?? 0);
  st.togglePanel?.(PANEL_ID, open);
};

/** Mirror later open/move/resize/dock back to storage (debounced). Call once. */
export const watchFavientsPanel = (opts?: FavientsPersistOptions): void => {
  const key = opts?.storageKey ?? DEFAULT_LS;
  activeStorageKey = key; // keep the viewMode key in lockstep with the window writer

  let lastPs: PanelEntry | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  useEngineStore.subscribe(() => {
    // The subscription fires on every store change; the PanelState object is only
    // replaced when a panel action runs, so a reference check skips all the rest cheaply.
    const ps = (useEngineStore.getState() as unknown as { panels?: Record<string, PanelEntry> }).panels?.[PANEL_ID];
    if (!ps || ps === lastPs) return;
    lastPs = ps;
    if (timer) clearTimeout(timer);
    timer = setTimeout(
      () => {
        // Preserve any persisted viewMode — this writer owns only the window
        // fields, so re-read the blob and carry the panel's layout pref through
        // (else toggling open/dock would wipe the saved grid/list choice).
        const prev = lsGetJson<Stored | null>(key, null);
        lsSetJson(key, {
          open: !!ps.isOpen,
          location: ps.location ?? 'float',
          order: ps.order ?? 0,
          x: ps.floatPos?.x ?? 0,
          y: ps.floatPos?.y ?? 0,
          w: ps.floatSize?.width ?? 296,
          h: ps.floatSize?.height ?? 300,
          ...(prev?.viewMode ? { viewMode: prev.viewMode } : {}),
        });
      },
      300,
    );
  });
};

/** Read the persisted shelf layout for the active host (default 'grid'). */
export const getFavientsViewMode = (): FavientsViewMode =>
  lsGetJson<Stored | null>(activeStorageKey, null)?.viewMode === 'list' ? 'list' : 'grid';

/** Persist the shelf layout under the active host key, merging into the existing
 *  window-state blob so the panel's open/dock/position fields survive. */
export const setFavientsViewMode = (mode: FavientsViewMode): void => {
  const prev = lsGetJson<Stored | null>(activeStorageKey, null);
  lsSetJson(activeStorageKey, { ...(prev ?? ({} as Stored)), viewMode: mode });
};
