/**
 * useGroundSource — the v2 shell's binding of "one ground, many sets" (Phase D, 2026-09-08;
 * plans/ge-v2-unified-shell-plan.md §4 Phase D, the DECIDED block).
 *
 *   • `useGroundSets()` — the rail's chips: All · Recent's dated bins · Kept · named groups
 *     · Snapshots, from the shared shelf (`favientsStore`), the catalogue's count and the
 *     variants store, through the pure `listGroundSets`.
 *   • `useGroundSource(setId, sets, opts)` — the `GroundSource` `usePickerModel` shows
 *     instead of the catalogue. For a bin or a group: the set's favourites as wall entries
 *     with their own sprite rows, `itemOf` handing back the favourite a tile stands for
 *     (config · name · source · favId, so a pick is a shelf pick and a drop elsewhere MOVES
 *     it). For Snapshots (D.3): every variant with a thumbnail ramp as a tile, the click
 *     routed to `opts.onSnapshotPick` (the host restores, or arms a tween on shift), the
 *     active variant wearing the selected enlarge, and `itemOf` fitting the ramp to stops
 *     lazily so a snapshot can still be dragged onto a group or ranked against. `null`
 *     for All.
 *
 * A stored set id whose set no longer exists (a bin that aged out, a group that emptied,
 * the Snapshots chip with no snapshots) falls back to All and writes that back, so the rail
 * never lights a chip that is not there.
 *
 * @see palette/core/groundSets.ts (the pure half)
 * @see palette/store/groundSet.ts (which set is on the ground)
 */

import { useEffect, useMemo } from 'react';
import type React from 'react';
import { useFavientsStore } from '../../palette/store/favientsStore';
import { useVariantsStore } from '../../palette/store/variantsStore';
import { rampFromInts } from '../../palette/core/variantsCore';
import { fitRampToStops } from '../../palette/core/stopFit';
import { usePickerStore } from '../../palette/store/pickerStore';
import { setGroundSetId } from '../../palette/store/groundSet';
import { ALL_SET_ID, favientsToEntries, listGroundSets, membersOf, parseSetId, rampToEntry, type GroundSetDesc } from '../../palette/core/groundSets';
import type { GroundSource, GroundItem } from '../../palette/components/usePickerModel';
import type { GradientConfig } from '../../types';

/** The stop fit a snapshot's thumbnail ramp gets when it has to be a gradient (a drag, a
 *  rank, a tween bake) — the same numbers the old Variants popover used for its bake. */
export const SNAPSHOT_FIT = { targetDE: 0.006, maxStops: 48 } as const;

export const useGroundSets = (): GroundSetDesc[] => {
  const favients = useFavientsStore((s) => s.favients);
  const groupLabels = useFavientsStore((s) => s.groupLabels);
  const variants = useVariantsStore((s) => s.variants);
  const catalogTotal = usePickerStore((s) => s.catalog.length);
  // Only a snapshot with a thumbnail ramp can be a tile (every v2 capture has one).
  const snapshotCount = useMemo(() => variants.filter((v) => v.ramp).length, [variants]);
  // Bins are cut against `now` at compute time; a session that crosses midnight re-bins on
  // the next shelf change, which is soon enough.
  return useMemo(
    () => listGroundSets({ favients, groupLabels, catalogTotal, snapshotCount }),
    [favients, groupLabels, catalogTotal, snapshotCount],
  );
};

export interface GroundSourceOpts {
  /** A snapshot tile was clicked (the host restores it, or arms a tween on shift-click). */
  onSnapshotPick?: (id: string, e?: React.MouseEvent) => void;
  /** The variant wearing the selected enlarge on the Snapshots set. */
  snapshotSelectedId?: string | null;
}

export const useGroundSource = (setId: string, sets: GroundSetDesc[], opts: GroundSourceOpts = {}): GroundSource | null => {
  const favients = useFavientsStore((s) => s.favients);
  const variants = useVariantsStore((s) => s.variants);
  const exists = setId === ALL_SET_ID || sets.some((s) => s.id === setId);
  useEffect(() => {
    if (!exists) setGroundSetId(ALL_SET_ID);
  }, [exists]);
  const kind = parseSetId(setId).kind;
  const { onSnapshotPick, snapshotSelectedId } = opts;
  return useMemo<GroundSource | null>(() => {
    if (!exists || setId === ALL_SET_ID) return null;
    if (kind === 'snapshots') {
      const drawable = variants.filter((v) => v.ramp);
      const entries = drawable.map((v, i) => rampToEntry(v.id, v.name, rampFromInts(v.ramp)!, i));
      const fitted = new Map<string, GradientConfig>();
      return {
        id: setId,
        entries,
        selectedId: snapshotSelectedId ?? null,
        itemOf: (e): GroundItem => {
          const v = drawable.find((x) => x.id === e.id)!;
          let config = fitted.get(v.id);
          if (!config) {
            config = fitRampToStops(rampFromInts(v.ramp)!, SNAPSHOT_FIT);
            fitted.set(v.id, config);
          }
          return { config, name: v.name, source: 'Snapshots' };
        },
        onPick: (e, ev) => onSnapshotPick?.(e.id, ev),
      };
    }
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
  }, [exists, setId, kind, favients, variants, onSnapshotPick, snapshotSelectedId]);
};
