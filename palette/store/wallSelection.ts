/**
 * wallSelection — WHICH tiles on the gradient wall are selected, held as a transient
 * module-level slot like `pickerSearch` and `pickerSimilarity`.
 *
 * The wall's carve tools (Box · Lasso · Paint) have always computed an exact set of ids
 * over the on-screen tiles; on the CATALOGUE that set narrows the wall (isolate / cut) and
 * on a user's own SET it was thrown away — `onSelectionCommit` began with `if (source)
 * return`. It lands here instead (2026-09-09), which turns the same gesture into "these
 * six", so a batch can be moved into a group or removed in one step. Nothing else about
 * the carve changes; the catalogue keeps its filter.
 *
 * NOT DDFS and NOT persisted — the same stance `pickerSimilarity` and `groundSet` take for
 * their own reasons: a selection on the undo stack would make Ctrl+Z toggle highlights, and
 * one that outlived a reload would name ids that may not exist next session.
 *
 * THE SNAPSHOT MUST BE A STABLE REFERENCE. `PickerWall`'s tile paint is a per-swatch
 * `drawImage` loop and its band rows are `React.memo`; the selection is in that effect's
 * dependency array, so a freshly built Set per render would repaint every mounted chunk on
 * every render. The slot therefore holds ONE frozen Set and swaps it only on a real change.
 *
 * @invariant `useWallSelection`'s snapshot is reference-stable across reads with no
 *   intervening write, and every write publishes a NEW reference — proven by:
 *   `npm run test:palette-shelf` ("selection: the snapshot is reference-stable between
 *   reads" and "selection: a real change publishes a new reference").
 * @see palette/store/pickerSearch.ts (the transient-store precedent)
 * @see palette/store/pickerSimilarity.ts (the same not-persisted argument)
 */

import { useSyncExternalStore } from 'react';
import { createSingleSlot } from '../../store/createSingleSlot';

const EMPTY: ReadonlySet<string> = Object.freeze(new Set<string>()) as ReadonlySet<string>;

const slot = createSingleSlot<ReadonlySet<string>>(EMPTY);
const getSnapshot = (): ReadonlySet<string> => slot.get() ?? EMPTY;

/** How a new set of ids meets the one already selected. */
export type SelectionMode = 'replace' | 'add' | 'subtract';

const publish = (next: Set<string>): void => {
  const cur = getSnapshot();
  // No-op writes must not publish: a new reference repaints the whole wall.
  if (next.size === cur.size && [...next].every((id) => cur.has(id))) return;
  slot.set(next.size ? (Object.freeze(next) as ReadonlySet<string>) : EMPTY);
};

/** Replace, union or subtract — the three things a marquee can mean. */
export const setWallSelection = (ids: Iterable<string>, mode: SelectionMode = 'replace'): void => {
  const incoming = ids instanceof Set ? ids : new Set(ids);
  if (mode === 'replace') return publish(new Set(incoming));
  const next = new Set(getSnapshot());
  for (const id of incoming) {
    if (mode === 'add') next.add(id);
    else next.delete(id);
  }
  publish(next);
};

/** Add one id if it is out, remove it if it is in (a modifier-click on a tile). */
export const toggleWallSelected = (id: string): void => {
  const next = new Set(getSnapshot());
  if (next.has(id)) next.delete(id);
  else next.add(id);
  publish(next);
};

export const clearWallSelection = (): void => {
  if (getSnapshot().size) slot.set(EMPTY);
};

export const getWallSelection = (): ReadonlySet<string> => getSnapshot();

/** Subscribe to the selected tiles. The snapshot is reference-stable between writes. */
export const useWallSelection = (): ReadonlySet<string> =>
  useSyncExternalStore(slot.subscribe, getSnapshot, getSnapshot);
