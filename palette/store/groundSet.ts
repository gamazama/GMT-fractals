/**
 * groundSet — WHICH set the v2 ground is showing (GE v2 Phase D, 2026-09-08), held as a
 * transient module-level slot like `pickerSearch`, but PERSISTED: a returning user wants
 * yesterday's picks on the ground, not the wall (the "returner" scenario in the Phase D
 * decision). Ids are the strings `palette/core/groundSets.ts` defines; a stored id whose set
 * no longer exists (a bin that aged out, a group that emptied) is the caller's problem —
 * `useGroundSource` falls back to All and writes that back.
 *
 * NOT DDFS: which set is on the ground is navigation, not a document property, and it must
 * not land on the undo stack or in a preset.
 *
 * @see palette/store/pickerSearch.ts (the transient-store precedent)
 * @see palette/core/groundSets.ts
 */

import { useSyncExternalStore } from 'react';
import { createSingleSlot } from '../../store/createSingleSlot';
import { lsGet, lsSet } from '../core/storage';
import { ALL_SET_ID } from '../core/groundSets';

const LS_KEY = 'gmt.ge.groundSet';

const slot = createSingleSlot<string>(lsGet(LS_KEY) || ALL_SET_ID);
const getSnapshot = (): string => slot.get() ?? ALL_SET_ID;

/** Put this set on the ground (and remember it across reloads). */
export const setGroundSetId = (id: string): void => {
  slot.set(id || ALL_SET_ID);
  lsSet(LS_KEY, id || ALL_SET_ID);
};

export const getGroundSetId = getSnapshot;

/** Subscribe a component to the set on the ground. */
export const useGroundSetId = (): string => useSyncExternalStore(slot.subscribe, getSnapshot, getSnapshot);
