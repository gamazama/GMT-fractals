/**
 * favientsPanelPersist — remembers the Favients floating panel's open-state, position,
 * and size across sessions (and across GMT apps; same-origin `localStorage`). The panel
 * itself lives in the engine store's PanelState, which isn't persisted by default, so
 * each host calls `restoreFavientsPanel()` after its manifest is applied and
 * `watchFavientsPanel()` once to mirror later changes back to storage.
 */

import { useEngineStore } from '../../store/engineStore';
import { lsGetJson, lsSetJson } from '../core/storage';

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

type PanelEntry = { isOpen?: boolean; floatPos?: { x: number; y: number }; floatSize?: { width: number; height: number } };
type StoreActions = Record<string, (...a: unknown[]) => void>;

/** Float + open the Favients panel (bring it up if docked/closed). Shared entrance
 *  used by the picker link, the overlay header, and the gradient editor. */
export const openFavientsPanel = (): void => {
  const st = useEngineStore.getState() as unknown as StoreActions;
  st.movePanel?.(PANEL_ID, 'float');
  st.togglePanel?.(PANEL_ID, true);
};

/** Float the panel at its remembered (or default) spot + open-state. Call after the
 *  host's applyPanelManifest registered the `Favients` panel. */
export const restoreFavientsPanel = (defaults: FavientsPanelDefaults): void => {
  const st = useEngineStore.getState() as unknown as StoreActions;
  const saved = lsGetJson<Stored | null>(LS, null);
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
      () => lsSetJson(LS, { open: !!ps.isOpen, x: ps.floatPos?.x ?? 0, y: ps.floatPos?.y ?? 0, w: ps.floatSize?.width ?? 296, h: ps.floatSize?.height ?? 300 }),
      300,
    );
  });
};
