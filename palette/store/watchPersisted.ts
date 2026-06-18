/**
 * watchPersisted — the shared "mirror a store slice to localStorage, debounced" seam.
 *
 * Both palette persisters (favientsPanelPersist, paletteFiltersPersist) had the identical
 * shape: subscribe to the engine store, reference-gate on a slice that only changes when its
 * own action runs (so the fires-on-every-change subscription stays cheap), then debounce a
 * write-back. This is that shape, once — the per-consumer parts (`select`, `write`) stay.
 *
 * `select` MUST return a reference-stable slice — the store replaces the object only when the
 * slice's action runs, and that reference gate is what keeps this from doing work on every
 * unrelated store change. `write` runs at flush time (AFTER the debounce), so it sees the
 * latest selected value and may re-read storage to merge sibling fields (favients carries its
 * `viewMode` through this way).
 *
 * This is the watch-shaped twin of the action-driven synchronous persisters (favientsStore,
 * uiSlice, autosaveStore) — those write inside their setters and don't belong here.
 *
 * @see palette/core/storage.ts (the localStorage read/write helpers `write` typically calls)
 */

import { useEngineStore } from '../../store/engineStore';

export interface WatchPersistedOptions<T> {
  /** Pull the reference-stable slice to persist. Return null/undefined to skip this change. */
  select: (state: unknown) => T | null | undefined;
  /** Persist the slice. Called debounced, at flush time — re-read storage here to merge
   *  fields owned by a sibling writer. */
  write: (value: T) => void;
  /** Debounce window in ms. Defaults to 300. */
  debounce?: number;
}

/** Subscribe once; debounce-mirror a reference-stable store slice to storage. Call at boot. */
export const watchPersisted = <T>({ select, write, debounce = 300 }: WatchPersistedOptions<T>): void => {
  let lastRef: T | null | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  useEngineStore.subscribe(() => {
    const sel = select(useEngineStore.getState());
    if (sel == null || sel === lastRef) return;
    lastRef = sel;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => write(sel), debounce);
  });
};
