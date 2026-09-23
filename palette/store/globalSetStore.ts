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
import type { CatalogEntry } from '../core/presetCatalog';
import type { LiveSource } from '../core/catalogLoader';
import { favientsToEntries } from '../core/groundSets';

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

/**
 * Re-fetch after contributing one, so the chip's count and the wall show it at once
 * without a reload. Quiet on failure: the set on screen simply stays as it was, which is
 * still true — the gradient did land, the view is just a moment behind.
 */
export const refreshGlobalSet = (): void => {
  void loadGlobalSet().then(
    (entries) => { if (entries.length) slot.set({ entries, status: 'ready' }); },
    () => { /* keep what is on screen */ },
  );
};

export const getGlobalSet = (): GlobalSetState => get();

/** Resolve once the set has settled (ready or error), starting the load if nobody has. */
const settled = (): Promise<GlobalSetState> => {
  loadGlobalSetOnce();
  const now = get();
  if (now.status === 'ready' || now.status === 'error') return Promise.resolve(now);
  return new Promise((resolve) => {
    const off = slot.subscribe(() => {
      const s = get();
      if (s.status === 'ready' || s.status === 'error') { off(); resolve(s); }
    });
  });
};

/** The bundle / group id GX Global uses as a catalogue SOURCE (Filters ▸ Sources). */
export const GX_GLOBAL_SOURCE_ID = 'gx-global';

/**
 * GX Global as a LIVE CATALOGUE SOURCE (2026-09-13): the same set the rail's GX global chip
 * shows, offered in Filters ▸ Sources as a toggle that adds its gradients to the All wall.
 * Registered by `registerPaletteUI`, so every host that shows the wall gets it.
 *
 * NOT SHOWN TWICE: on All the catalogue is the ground and the global set is not (the rail's chip
 * is a DIFFERENT ground — `useGroundSource` — and All is exclusive), so the toggle is the only way
 * these gradients reach the All wall. Ids keep `GLOBAL_ID_PREFIX`, so they cannot collide with a
 * catalogue id. The name says what it is and carries no licence tag — the gradients are
 * user-made — and `userMade` keeps an export of one uncredited.
 */
export const GX_GLOBAL_SOURCE: LiveSource = {
  id: GX_GLOBAL_SOURCE_ID,
  info: {
    label: 'GX Global',
    tag: 'shared by users',
    license: 'Contributed anonymously by people using the Gradient Explorer; no licence is recorded',
    attribution: 'Gradients shared by the Gradient Explorer community',
    // The canonical page since the entry-point swap (2026-09-16). Only a link (Filters ▸
    // Sources, About): a build that still carries the old `gradient-explorer-next.html`
    // address reaches the same app through the alias.
    url: 'https://app.gmt-fractals.com/gradient-explorer.html',
    userMade: true,
  },
  load: async (): Promise<CatalogEntry[]> => {
    const s = await settled();
    return favientsToEntries(s.entries).map((e) => ({ ...e, bundle: GX_GLOBAL_SOURCE_ID, theme: undefined }));
  },
  subscribe: (onChange) => {
    let last = get().entries;
    return slot.subscribe(() => {
      const next = get().entries;
      if (next !== last && get().status === 'ready') { last = next; onChange(); }
    });
  },
};

export const useGlobalSet = (): GlobalSetState => useSyncExternalStore(slot.subscribe, get, get);
