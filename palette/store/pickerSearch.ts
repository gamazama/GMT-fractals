/**
 * pickerSearch — the Picker's free-text query, held as a transient module-level store.
 *
 * NOT DDFS and NOT persisted — it mirrors the deliberate keptIds/quality-window stance
 * (only layout prefs survive a reload) so a stale query can never silently hide
 * gradients after a catalog reload. Resets to '' on a full page load.
 *
 * Why an external store rather than a `useState` in PickerStage: two sibling surfaces
 * drive the SAME query — the PickerStage hero search field AND the mobile Picker
 * controls (`MobilePickerControls`, a separate subtree below the stage). Local state
 * couldn't reach both; a tiny `useSyncExternalStore`-backed holder keeps them in sync
 * while staying session-only.
 */

import { useSyncExternalStore } from 'react';

let query = '';
const listeners = new Set<() => void>();

const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};
const getSnapshot = (): string => query;

/** Set the transient Picker query (session-only). No-ops on an unchanged value. */
export const setPickerSearch = (q: string): void => {
  if (q === query) return;
  query = q;
  listeners.forEach((l) => l());
};

/** Subscribe a component to the transient Picker search query. */
export const usePickerSearch = (): string =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
