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
import { watchPersisted } from './watchPersisted';

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
 *  used by the picker link and the overlay header. Editor stars prefer
 *  `revealFavientsPanel` (which respects an existing dock rather than force-floating). */
export const openFavientsPanel = (): void => {
  const st = useEngineStore.getState() as unknown as StoreActions;
  st.movePanel?.(PANEL_ID, 'float');
  st.togglePanel?.(PANEL_ID, true);
};

/** Shape of the dock/panel state this module reads to decide visibility. */
type DockState = {
  panels?: Record<string, PanelEntry>;
  activeLeftTab?: string | null;
  activeRightTab?: string | null;
  isLeftDockCollapsed?: boolean;
  isRightDockCollapsed?: boolean;
};

/** Is the Favients shelf actually ON SCREEN? Floating + open is shown; a docked shelf
 *  is shown only while its dock is expanded AND it's that dock's active tab. A
 *  docked-but-collapsed (or background-tab) shelf is NOT shown — it needs revealing.
 *  app-gmt's shelf has no centre-stage mirror, so dock-expanded is required (unlike the
 *  Gradient Explorer's mode panels). */
const computeShown = (s: DockState): boolean => {
  const panel = s.panels?.[PANEL_ID];
  if (!panel?.isOpen) return false;
  const loc = panel.location ?? 'float';
  if (loc === 'float') return true;
  if (loc === 'left') return s.activeLeftTab === PANEL_ID && !s.isLeftDockCollapsed;
  return s.activeRightTab === PANEL_ID && !s.isRightDockCollapsed;
};

/** Reactive: is the Favients panel currently open? */
export const useFavientsPanelOpen = (): boolean =>
  useEngineStore(
    (s) => !!(s as unknown as { panels?: Record<string, { isOpen?: boolean }> }).panels?.[PANEL_ID]?.isOpen,
  );

/** Reactive: is the Favients shelf currently visible to the user (see computeShown)?
 *  The editor's Favients star uses this to switch between "reveal the shelf" and "add
 *  the current gradient to the already-visible shelf". */
export const useFavientsPanelShown = (): boolean =>
  useEngineStore((s) => computeShown(s as unknown as DockState));

/** Bring the Favients shelf into view, RESPECTING where it already lives: a docked
 *  shelf is revealed in its own dock (un-collapse that side + make it the active tab);
 *  only a floating (or not-yet-placed) shelf is brought up as a floating window. This is
 *  what the editor star calls — pressing it should never yank a docked shelf out into a
 *  float. */
export const revealFavientsPanel = (): void => {
  const st = useEngineStore.getState() as unknown as StoreActions & DockState;
  const loc = st.panels?.[PANEL_ID]?.location ?? 'float';
  if (loc === 'left' || loc === 'right') {
    st.setDockCollapsed?.(loc, false);
    st.togglePanel?.(PANEL_ID, true);
  } else {
    st.movePanel?.(PANEL_ID, 'float');
    st.togglePanel?.(PANEL_ID, true);
  }
};

/** Hide the Favients shelf where it lives: collapse its dock if docked, else close the
 *  floating window. The inverse of revealFavientsPanel. */
export const hideFavientsPanel = (): void => {
  const st = useEngineStore.getState() as unknown as StoreActions & DockState;
  const loc = st.panels?.[PANEL_ID]?.location ?? 'float';
  if (loc === 'left' || loc === 'right') st.setDockCollapsed?.(loc, true);
  else st.togglePanel?.(PANEL_ID, false);
};

/** Toggle shelf visibility (dock-aware): reveal it if hidden, hide it if shown. The
 *  single entry point every host's topbar Favients button uses. */
export const toggleFavientsPanel = (): void => {
  if (computeShown(useEngineStore.getState() as unknown as DockState)) hideFavientsPanel();
  else revealFavientsPanel();
};

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
  // First run (nothing saved): on mobile the shelf defaults DOCKED rather than
  // floating — a floating shelf on a phone is awkward and easily lost off the
  // small screen. The left dock is hidden on mobile, so dock it right. Uses a
  // direct media query (reliable at boot, before store mobile-flags settle).
  const isMobileBoot = typeof window !== 'undefined'
    && (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768);
  const location = saved?.location ?? (isMobileBoot ? 'right' : (defaults.location ?? 'float'));

  // Always remember the float spot/size so a later undock returns the panel to
  // its last floating position, regardless of where it starts.
  st.setFloatPosition?.(PANEL_ID, x, y);
  st.setFloatSize?.(PANEL_ID, w, h);
  if (location === 'float') st.movePanel?.(PANEL_ID, 'float');
  else st.movePanel?.(PANEL_ID, location, saved?.order ?? defaults.order ?? 0);
  st.togglePanel?.(PANEL_ID, open);
};

/** Mirror later open/move/resize/dock back to storage (debounced). Call once. The
 *  reference gate (PanelState is only replaced when a panel action runs) lives in
 *  watchPersisted, so the every-change subscription stays cheap. */
export const watchFavientsPanel = (opts?: FavientsPersistOptions): void => {
  const key = opts?.storageKey ?? DEFAULT_LS;
  activeStorageKey = key; // keep the viewMode key in lockstep with the window writer

  watchPersisted<PanelEntry>({
    select: (s) => (s as { panels?: Record<string, PanelEntry> }).panels?.[PANEL_ID],
    // Preserve any persisted viewMode — this writer owns only the window fields, so
    // re-read the blob at flush time and carry the panel's layout pref through (else
    // toggling open/dock would wipe the saved grid/list choice).
    write: (ps) => {
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
