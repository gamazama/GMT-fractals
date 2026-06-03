/**
 * favientsPanelPersist — remembers the Favients floating panel's open-state, position,
 * and size across sessions (and across GMT apps; same-origin `localStorage`). The panel
 * itself lives in the engine store's PanelState, which isn't persisted by default, so
 * each host calls `restoreFavientsPanel()` after its manifest is applied and
 * `watchFavientsPanel()` once to mirror later changes back to storage.
 */

import { useEngineStore } from '../../store/engineStore';

const LS = 'gmt.favients.panel';
const PANEL_ID = 'Favients';

export interface FavientsPanelDefaults {
  x: number;
  y: number;
  w: number;
  h: number;
  open: boolean;
}

interface Stored {
  open: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

const read = (): Stored | null => {
  try {
    const r = typeof localStorage !== 'undefined' ? localStorage.getItem(LS) : null;
    return r ? (JSON.parse(r) as Stored) : null;
  } catch {
    return null;
  }
};

const write = (s: Stored): void => {
  try {
    localStorage.setItem(LS, JSON.stringify(s));
  } catch {
    /* quota / disabled */
  }
};

/** Float the panel at its remembered (or default) spot + open-state. Call after the
 *  host's applyPanelManifest registered the `Favients` panel. */
export const restoreFavientsPanel = (defaults: FavientsPanelDefaults): void => {
  const st = useEngineStore.getState() as unknown as Record<string, (...a: unknown[]) => void>;
  const saved = read();
  const x = saved?.x ?? defaults.x;
  const y = saved?.y ?? defaults.y;
  const w = saved?.w ?? defaults.w;
  const h = saved?.h ?? defaults.h;
  const open = saved ? saved.open : defaults.open;
  st.movePanel?.(PANEL_ID, 'float');
  st.setFloatPosition?.(PANEL_ID, x, y);
  st.setFloatSize?.(PANEL_ID, w, h);
  st.togglePanel?.(PANEL_ID, open);
};

/** Mirror later open/move/resize back to storage (debounced). Call once. */
export const watchFavientsPanel = (): void => {
  let lo: boolean | undefined, lx: number | undefined, ly: number | undefined, lw: number | undefined, lh: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  useEngineStore.subscribe(() => {
    const ps = (useEngineStore.getState() as unknown as { panels?: Record<string, { isOpen?: boolean; floatPos?: { x: number; y: number }; floatSize?: { width: number; height: number } }> }).panels?.[PANEL_ID];
    if (!ps) return;
    const o = !!ps.isOpen,
      x = ps.floatPos?.x,
      y = ps.floatPos?.y,
      w = ps.floatSize?.width,
      h = ps.floatSize?.height;
    if (o === lo && x === lx && y === ly && w === lw && h === lh) return;
    lo = o; lx = x; ly = y; lw = w; lh = h;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => write({ open: o, x: x ?? 0, y: y ?? 0, w: w ?? 296, h: h ?? 300 }), 300);
  });
};
