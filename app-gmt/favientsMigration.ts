/**
 * favientsMigration — one-time import of the legacy app-gmt "saved gradients" library
 * (`gmt.savedGradients.v1`, the StateLibrary-based gradientLibrary) into the unified
 * cross-app Favients shelf (`gmt.favients`). Favients superseded the bespoke library,
 * but users may already have saved gradients — migrate them so nothing is lost.
 *
 * Runs once (guarded by a flag); idempotent and safe in apps that never had the old key.
 */

import { useFavientsStore } from '../palette/store/favientsStore';
import type { GradientConfig } from '../types';

const OLD_KEY = 'gmt.savedGradients.v1';
const FLAG = 'gmt.favients.migratedFromLibrary';

interface LegacySnapshot {
  label?: string;
  state?: GradientConfig;
}

export const migrateSavedGradientsToFavients = (): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(FLAG)) return;
    localStorage.setItem(FLAG, '1'); // set first — never retry, even on partial failure

    const raw = localStorage.getItem(OLD_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw) as LegacySnapshot[];
    if (!Array.isArray(arr) || !arr.length) return;

    const store = useFavientsStore.getState();
    // Preserve the original order (the library prepends newest-first; add() also
    // prepends, so iterate oldest-first to end up with the same visible order).
    for (let i = arr.length - 1; i >= 0; i--) {
      const cfg = arr[i]?.state;
      if (cfg && Array.isArray(cfg.stops) && cfg.stops.length && !store.isFav(cfg)) {
        store.add(cfg, arr[i].label || 'Saved gradient', 'Library');
      }
    }
  } catch {
    /* malformed / disabled storage — skip silently */
  }
};
