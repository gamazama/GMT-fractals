/**
 * favientsMigration — one-time import of the legacy app-gmt "saved gradients" library
 * (`gmt.savedGradients.v1`, the StateLibrary-based gradientLibrary) into the unified
 * cross-app Favients shelf (`gmt.favients`). Favients superseded the bespoke library,
 * but users may already have saved gradients — migrate them so nothing is lost.
 *
 * Runs once (guarded by a flag); idempotent and safe in apps that never had the old key.
 */

import { useFavientsStore } from '../palette/store/favientsStore';
import { safeLocalGet, safeLocalSet } from '../store/safeLocalStorage';
import type { GradientConfig } from '../types';
import { isRampGradient, isStopGradient } from '../utils/gradientRamp';

const OLD_KEY = 'gmt.savedGradients.v1';
const FLAG = 'gmt.favients.migratedFromLibrary';

interface LegacySnapshot {
  label?: string;
  state?: GradientConfig;
}

export const migrateSavedGradientsToFavients = (): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    if (safeLocalGet(FLAG)) return;
    safeLocalSet(FLAG, '1'); // set first — never retry, even on partial failure

    const raw = safeLocalGet(OLD_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw) as LegacySnapshot[];
    if (!Array.isArray(arr) || !arr.length) return;

    const store = useFavientsStore.getState();
    // Preserve the original order (the library prepends newest-first; add() also
    // prepends, so iterate oldest-first to end up with the same visible order).
    for (let i = arr.length - 1; i >= 0; i--) {
      const cfg = arr[i]?.state;
      // Either gradient form (ADR-0122). The legacy library predates ramps and nothing writes
      // it any more, so a ramp entry cannot really be there — but the gate should not be the
      // thing that decides that. `add` normalises the config.
      if ((isStopGradient(cfg) || isRampGradient(cfg)) && !store.isFav(cfg)) {
        store.add(cfg, arr[i].label || 'Saved gradient', 'Library');
      }
    }
  } catch {
    /* malformed / disabled storage — skip silently */
  }
};
