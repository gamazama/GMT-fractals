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
import { ALL_SET_ID, GLOBAL_SET_ID, favientsToEntries, listGroundSets, membersOf, membersOfMany, type GroundSetDesc } from '../../palette/core/groundSets';
import { useGlobalSet } from '../../palette/store/globalSetStore';
import type { GroundSource } from '../../palette/components/usePickerModel';

export const useGroundSets = (): GroundSetDesc[] => {
  const favients = useFavientsStore((s) => s.favients);
  const groupLabels = useFavientsStore((s) => s.groupLabels);
  const catalogTotal = usePickerStore((s) => s.catalog.length);
  const gx = useGlobalSet();
  // Bins are cut against `now` at compute time; a session that crosses midnight re-bins on
  // the next shelf change, which is soon enough.
  return useMemo(
    () => listGroundSets({ favients, groupLabels, catalogTotal, global: { count: gx.entries.length, loading: gx.status === 'loading' } }),
    [favients, groupLabels, catalogTotal, gx.entries, gx.status],
  );
};

export const useGroundSource = (setIds: readonly string[], sets: GroundSetDesc[]): GroundSource | null => {
  const favients = useFavientsStore((s) => s.favients);
  const gx = useGlobalSet();
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
    const favs = membersOfMany(live, favients, gx.entries);
    const byId = new Map(favs.map((f) => [f.id, f] as const));
    return {
      id: live.join('+'),
      entries: favientsToEntries(favs),
      itemOf: (e) => {
        const f = byId.get(e.id)!;
        // NO `favId` for a shared gradient, and that single omission is the whole safety
        // argument: a tile without one already reads as "not yours" everywhere — the rail's
        // trash refuses it, a drop FILES A COPY instead of moving it, Delete finds nothing
        // to remove, and the drag payload carries no shelf identity. The catalogue's own
        // contract, reused rather than re-guarded.
        const shared = f.source === 'GX global';
        return { config: f.config, name: f.name, source: f.source, favId: shared ? undefined : f.id };
      },
      // One band per lit set, keyed by SET ID — which is what lets a drop on the wall know
      // where it landed, and so is supplied even for a single set (a drop then REORDERS
      // within it: the shelf panel's own gesture, which the ground never had). The LABEL
      // is only drawn when there is more than one: with two sets the ground has to stay
      // two PLACES rather than one undivided run (owner, 2026-09-09), and with one the
      // header would just repeat the title above it.
      // Arranged by COLOUR when the shared set is the only thing on the ground: it has no
      // order of anyone's to hold (owner, 2026-09-09 — no curators, no names, so the
      // regular hue / lightness filters are the way through it). Mixed with a set of your
      // own, your order wins, because that one IS an order.
      arrangeable: live.length === 1 && live[0] === GLOBAL_SET_ID,
      bands: live.map((id) => ({
        key: id,
        label: live.length > 1 ? (sets.find((s) => s.id === id)?.label ?? id) : '',
        ids: new Set(membersOf(id, favients, gx.entries).map((f) => f.id)),
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.join('\u0000'), favients, sets]);
};
