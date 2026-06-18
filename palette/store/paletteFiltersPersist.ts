/**
 * paletteFiltersPersist — remembers the picker's DISPLAY/ARRANGEMENT controls across
 * sessions (same-origin localStorage, shared by every GMT app). The Favients shelf
 * follows the same swatch-size + padding, so these need to survive a reload too.
 *
 * Only layout fields are persisted (swatch size, padding, group/sort/rows, reverse) —
 * NOT the quality-filter windows or theme/bundle selections, so a reload doesn't
 * silently hide gradients. DDFS slices are session-only by default; we hydrate on
 * restore and mirror changes back (debounced).
 */

import { useEngineStore } from '../../store/engineStore';
import { lsGetJson, lsSet } from '../core/storage';
import { watchPersisted } from './watchPersisted';

const LS = 'gmt.paletteFilters';
const KEYS = ['swatchSize', 'paddingSize', 'groupBy', 'sortBy', 'rowsBy', 'reverse'] as const;

const pick = (src: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of KEYS) if (src[k] !== undefined) out[k] = src[k];
  return out;
};

/** Apply persisted layout params to the paletteFilters slice. Call once at boot. */
export const restorePaletteFilters = (): void => {
  const saved = lsGetJson<Record<string, unknown> | null>(LS, null);
  if (!saved) return;
  const set = (useEngineStore.getState() as unknown as { setPaletteFilters?: (p: Record<string, unknown>) => void }).setPaletteFilters;
  if (typeof set === 'function') set(pick(saved));
};

/** Mirror later layout changes back to storage (debounced). Call once. The
 *  reference gate lives in watchPersisted — paletteFilters is only replaced when
 *  setPaletteFilters runs, so the every-change subscription stays cheap. */
export const watchPaletteFilters = (): void => {
  watchPersisted<Record<string, unknown>>({
    select: (s) => (s as { paletteFilters?: Record<string, unknown> }).paletteFilters,
    write: (pf) => lsSet(LS, JSON.stringify(pick(pf))),
  });
};
