/**
 * globalSetStore — the GX GLOBAL set, in memory, for the life of the tab.
 *
 * Modelled on `pickerStore`'s group loading: one `load()`, guarded so a re-render cannot
 * fetch twice, and a `status` the UI can read instead of a thrown error. Nothing here is
 * persisted — the point of a shared set is that it comes from somewhere else, and caching
 * it into localStorage would reintroduce exactly the "it is stored locally so it looks like
 * mine" confusion the design avoids.
 *
 * Deliberately NOT a history provider and NOT a scene-document provider: a fetched set has
 * nothing to undo and must never be written into a saved scene (see `favientsDocument`,
 * which serialises the shelf into every scene and restores by silent merge — anything that
 * reached `favients` would be embedded in every save this user ever made, on every machine,
 * permanently, because merge only ever adds).
 *
 * @see palette/core/globalSet.ts (the fetch and the safety argument)
 */

import { useSyncExternalStore } from 'react';
import { createSingleSlot } from '../../store/createSingleSlot';
import { loadGlobalSet } from '../core/globalSet';
import type { Favient } from './favientsStore';

export type GlobalSetStatus = 'idle' | 'loading' | 'ready' | 'error';

interface GlobalSetState {
  entries: Favient[];
  status: GlobalSetStatus;
}

const EMPTY: GlobalSetState = Object.freeze({ entries: Object.freeze([]) as unknown as Favient[], status: 'idle' as const });

const slot = createSingleSlot<GlobalSetState>(EMPTY);
const get = (): GlobalSetState => slot.get() ?? EMPTY;

let started = false;

/** Fetch it once per tab. Safe to call from every mount; never throws. */
export const loadGlobalSetOnce = (): void => {
  if (started) return;
  started = true;
  slot.set({ entries: [], status: 'loading' });
  void loadGlobalSet().then(
    (entries) => slot.set({ entries, status: entries.length ? 'ready' : 'error' }),
    // `loadGlobalSet` already swallows its own failures; this is the belt.
    () => slot.set({ entries: [], status: 'error' }),
  );
};

export const getGlobalSet = (): GlobalSetState => get();

export const useGlobalSet = (): GlobalSetState => useSyncExternalStore(slot.subscribe, get, get);
