/**
 * groundSet — WHICH sets the v2 ground is showing (GE v2 Phase D, 2026-09-08), held as a
 * transient module-level slot like `pickerSearch`, but PERSISTED: a returning user wants
 * yesterday's picks on the ground, not the wall (the "returner" scenario in the Phase D
 * decision). Ids are the strings `palette/core/groundSets.ts` defines; a stored id whose set
 * no longer exists (a bin that aged out, a group that emptied) is the caller's problem —
 * `useGroundSource` falls back to All and writes that back.
 *
 * A SELECTION, not one id, since 2026-09-09 (owner: "users should be able to select
 * multiple user Groups at a time"): several chips can be lit and the ground shows their
 * union, so two groups can be looked at together and dragged between. Two rules keep it
 * from becoming a mode:
 *   • ALL IS EXCLUSIVE. The catalogue is not a favourites set — it cannot be unioned with
 *     one, and picking it clears the rest.
 *   • THE SELECTION IS NEVER EMPTY. Toggling the last lit chip off falls back to All,
 *     rather than leaving a ground with nothing on it and no way to say what it is.
 *
 * NOT DDFS: which set is on the ground is navigation, not a document property, and it must
 * not land on the undo stack or in a preset.
 *
 * Persisted as a JSON array. A value written by an older build is a bare id string and
 * reads back as a one-element selection, so nobody's ground changes under them on upgrade.
 *
 * @see palette/store/pickerSearch.ts (the transient-store precedent)
 * @see palette/core/groundSets.ts
 */

import { useSyncExternalStore } from 'react';
import { createSingleSlot } from '../../store/createSingleSlot';
import { lsGet, lsSet } from '../core/storage';
import { ALL_SET_ID } from '../core/groundSets';

const LS_KEY = 'gmt.ge.groundSet';

/** Read the stored selection: a JSON array, or a bare id from before the list existed. */
const loadIds = (): string[] => {
  const raw = lsGet(LS_KEY);
  if (!raw) return [ALL_SET_ID];
  try {
    const v: unknown = JSON.parse(raw);
    if (Array.isArray(v)) {
      const ids = v.filter((x): x is string => typeof x === 'string' && !!x);
      return ids.length ? ids : [ALL_SET_ID];
    }
  } catch {
    /* not JSON — the pre-2026-09-09 bare id below */
  }
  return [raw];
};

const slot = createSingleSlot<string[]>(loadIds());
const getSnapshot = (): string[] => slot.get() ?? [ALL_SET_ID];

/** Normalise a selection: All is exclusive, order is stable, never empty. */
const normalise = (ids: readonly string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  if (!out.length) return [ALL_SET_ID];
  if (out.includes(ALL_SET_ID)) return [ALL_SET_ID];
  return out;
};

const commit = (ids: readonly string[]): void => {
  const next = normalise(ids);
  const cur = getSnapshot();
  if (next.length === cur.length && next.every((id, i) => id === cur[i])) return;
  slot.set(next);
  lsSet(LS_KEY, JSON.stringify(next));
};

/** Put exactly these sets on the ground (and remember them across reloads). */
export const setGroundSetIds = (ids: readonly string[]): void => commit(ids);

/** Put ONE set on the ground, replacing the selection. */
export const setGroundSetId = (id: string): void => commit([id || ALL_SET_ID]);

/** Add or remove a set. Removing the last one falls back to All; All replaces everything. */
export const toggleGroundSetId = (id: string): void => {
  if (!id || id === ALL_SET_ID) return commit([ALL_SET_ID]);
  const cur = getSnapshot().filter((x) => x !== ALL_SET_ID);
  commit(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
};

export const getGroundSetIds = getSnapshot;

/** The PRIMARY set — the first lit chip. For callers that can only mean one place. */
export const getGroundSetId = (): string => getSnapshot()[0] ?? ALL_SET_ID;

/** Subscribe a component to the sets on the ground. */
export const useGroundSetIds = (): string[] => useSyncExternalStore(slot.subscribe, getSnapshot, getSnapshot);
