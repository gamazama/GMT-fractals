/**
 * useGroundSource — the v2 shell's binding of "one ground, many sets" (Phase D, 2026-09-08;
 * plans/ge-v2-unified-shell-plan.md §4 Phase D, the DECIDED block).
 *
 *   • `useGroundSets()` — the rail's chips: All · Recent's dated bins · Kept · named groups,
 *     from the shared shelf (`favientsStore`) and the catalogue's count, through the pure
 *     `listGroundSets`.
 *   • `useGroundSource(setId, sets)` — the `GroundSource` `usePickerModel` shows instead of
 *     the catalogue: the set's favourites as wall entries with their own sprite rows, and
 *     `itemOf` handing back the favourite a tile stands for (config · name · source ·
 *     favId, so a pick is a shelf pick and a drop elsewhere MOVES it). `null` for All.
 *
 * A stored set id whose set no longer exists (a bin that aged out, a group that emptied)
 * falls back to All and writes that back, so the rail never lights a chip that is not there.
 *
 * @see palette/core/groundSets.ts (the pure half)
 * @see palette/store/groundSet.ts (which set is on the ground)
 */

import { useEffect, useMemo } from 'react';
import { useFavientsStore } from '../../palette/store/favientsStore';
import { usePickerStore } from '../../palette/store/pickerStore';
import { setGroundSetId } from '../../palette/store/groundSet';
import { ALL_SET_ID, favientsToEntries, listGroundSets, membersOf, type GroundSetDesc } from '../../palette/core/groundSets';
import type { GroundSource } from '../../palette/components/usePickerModel';

export const useGroundSets = (): GroundSetDesc[] => {
  const favients = useFavientsStore((s) => s.favients);
  const groupLabels = useFavientsStore((s) => s.groupLabels);
  const catalogTotal = usePickerStore((s) => s.catalog.length);
  // Bins are cut against `now` at compute time; a session that crosses midnight re-bins on
  // the next shelf change, which is soon enough.
  return useMemo(() => listGroundSets({ favients, groupLabels, catalogTotal }), [favients, groupLabels, catalogTotal]);
};

export const useGroundSource = (setId: string, sets: GroundSetDesc[]): GroundSource | null => {
  const favients = useFavientsStore((s) => s.favients);
  const exists = setId === ALL_SET_ID || sets.some((s) => s.id === setId);
  useEffect(() => {
    if (!exists) setGroundSetId(ALL_SET_ID);
  }, [exists]);
  return useMemo<GroundSource | null>(() => {
    if (!exists || setId === ALL_SET_ID) return null;
    const favs = membersOf(setId, favients);
    const byId = new Map(favs.map((f) => [f.id, f] as const));
    return {
      id: setId,
      entries: favientsToEntries(favs),
      itemOf: (e) => {
        const f = byId.get(e.id)!;
        return { config: f.config, name: f.name, source: f.source, favId: f.id };
      },
    };
  }, [exists, setId, favients]);
};
