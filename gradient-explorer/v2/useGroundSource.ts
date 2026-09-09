/**
 * useGroundSource — the v2 shell's binding of "one ground, many sets" (Phase D, 2026-09-08;
 * plans/ge-v2-unified-shell-plan.md §4 Phase D, the DECIDED block).
 *
 *   • `useGroundSets()` — the rail's chips: All · Recent's dated bins · Kept · named groups,
 *     from the shared shelf (`favientsStore`) and the catalogue's count, through the pure
 *     `listGroundSets`.
 *   • `useGroundSource(setIds, sets)` — the `GroundSource` `usePickerModel` shows instead
 *     of the catalogue: the selected sets' favourites as wall entries with their own sprite
 *     rows, and `itemOf` handing back the favourite a tile stands for (config · name ·
 *     source · favId, so a pick is a shelf pick and a drop elsewhere MOVES it). `null` for
 *     All. Several sets union into one ground (2026-09-09) — `membersOfMany` dedupes, so a
 *     gradient in both Today and a group draws once; the source's `id` is the joined
 *     selection, which is what tells the wall to re-sprite.
 *
 * A stored set id whose set no longer exists (a bin that aged out, a group that emptied) is
 * dropped from the selection, and a selection with nothing left in it falls back to All —
 * so the rail never lights a chip that is not there.
 *
 * @see palette/core/groundSets.ts (the pure half)
 * @see palette/store/groundSet.ts (which set is on the ground)
 */

import { useEffect, useMemo } from 'react';
import { useFavientsStore } from '../../palette/store/favientsStore';
import { usePickerStore } from '../../palette/store/pickerStore';
import { setGroundSetIds } from '../../palette/store/groundSet';
import { ALL_SET_ID, favientsToEntries, listGroundSets, membersOf, membersOfMany, type GroundSetDesc } from '../../palette/core/groundSets';
import type { GroundSource } from '../../palette/components/usePickerModel';

export const useGroundSets = (): GroundSetDesc[] => {
  const favients = useFavientsStore((s) => s.favients);
  const groupLabels = useFavientsStore((s) => s.groupLabels);
  const catalogTotal = usePickerStore((s) => s.catalog.length);
  // Bins are cut against `now` at compute time; a session that crosses midnight re-bins on
  // the next shelf change, which is soon enough.
  return useMemo(() => listGroundSets({ favients, groupLabels, catalogTotal }), [favients, groupLabels, catalogTotal]);
};

export const useGroundSource = (setIds: readonly string[], sets: GroundSetDesc[]): GroundSource | null => {
  const favients = useFavientsStore((s) => s.favients);
  // Sets can disappear under a selection (a bin ages out, a group is deleted). Keep only
  // the live ones; if that leaves nothing, the ground is the catalogue.
  const live = useMemo(
    () => setIds.filter((id) => id === ALL_SET_ID || sets.some((s) => s.id === id)),
    [setIds.join('\u0000'), sets],
  );
  const stale = live.length !== setIds.length || live.length === 0;
  useEffect(() => {
    if (stale) setGroundSetIds(live.length ? live : [ALL_SET_ID]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale, live.join('\u0000')]);
  return useMemo<GroundSource | null>(() => {
    if (!live.length || live.includes(ALL_SET_ID)) return null;
    const favs = membersOfMany(live, favients);
    const byId = new Map(favs.map((f) => [f.id, f] as const));
    return {
      id: live.join('+'),
      entries: favientsToEntries(favs),
      itemOf: (e) => {
        const f = byId.get(e.id)!;
        return { config: f.config, name: f.name, source: f.source, favId: f.id };
      },
      // With more than one set lit, the wall draws a labelled band each, in rail order, so
      // the ground stays two PLACES rather than becoming one undivided run — and each band
      // is a drop target, which is how a gradient moves between them (owner, 2026-09-09).
      // The band key is the SET id, so the drop knows where it landed.
      bands:
        live.length > 1
          ? live.map((id) => ({
              key: id,
              label: sets.find((s) => s.id === id)?.label ?? id,
              ids: new Set(membersOf(id, favients).map((f) => f.id)),
            }))
          : undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.join('\u0000'), favients, sets]);
};
