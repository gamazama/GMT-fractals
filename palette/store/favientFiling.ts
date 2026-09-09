/**
 * favientFiling — the ONE rule for "put this gradient in that group".
 *
 * A gradient can be filed by dropping it on a chip on the GE v2 set rail, or (since
 * 2026-09-09) by dropping it on a BAND of the wall when several sets share the ground.
 * Both mean the same thing and must behave identically, so the rule lives here rather
 * than once per drop target:
 *
 *   • a gradient that is ALREADY a favourite MOVES — it does not get a second copy in a
 *     second group. It joins the head of the destination's run so the shelf's blocks stay
 *     contiguous (`buildBlocks` opens a block on every group change, so an insert in the
 *     middle would draw the group's divider twice).
 *   • a gradient that is not a favourite by id but IS one by CONTENT also moves — a
 *     catalogue tile, or the working hero (whose payload carries no `favId`), must not
 *     become a second copy of something already on the shelf.
 *   • anything else is INSERTED as a new favourite in that group, named the way every
 *     other add-path names it (`configToName` when the payload has no name).
 *   • a drop onto the group it is already in is a no-op, not a reorder-to-front.
 *
 * The caller owns the undo bracket (`paramEdit`), so one drop is one step.
 *
 * @see gradient-explorer/v2/SetRail.tsx (the chips)
 * @see gradient-explorer/v2/BrowseStage.tsx (the wall's bands)
 */

import { DEFAULT_GROUP, favientSig, useFavientsStore, type Favient } from './favientsStore';
import { configToName } from '../core/facetName';
import type { FavientDragPayload } from '../core/favientDnd';

const groupOf = (f: Favient): string => f.group ?? DEFAULT_GROUP;

/** File a dragged gradient into `group`: a favourite moves, anything else is inserted. */
export const fileFavientInto = (group: string, p: FavientDragPayload): void => {
  const st = useFavientsStore.getState();
  // Match by id first, then by CONTENT. The content match is what stops a catalogue tile —
  // or the working hero, whose payload carries no `favId` — from becoming a second copy of
  // a gradient already on the shelf: dropping it on another group MOVES the one you have.
  // `FavientsPanel`'s own drop has always done this (grep `putAt`); the rail's did not,
  // which is the divergence the 2026-09-09 re-audit found.
  const sig = favientSig(p.config);
  const existing = p.favId
    ? st.favients.find((f) => f.id === p.favId)
    : st.favients.find((f) => favientSig(f.config) === sig);
  if (existing) {
    if (groupOf(existing) === group) return;
    const rest = st.favients.filter((f) => f.id !== existing.id);
    const at = rest.findIndex((f) => groupOf(f) === group);
    st.moveFavient(existing.id, at < 0 ? rest.length : at, group);
    return;
  }
  const at = st.favients.findIndex((f) => groupOf(f) === group);
  // A payload with no name gets the same perceptual label the panel's drop gives it
  // ("Warm Vivid Rainbow"), rather than filing blank.
  st.insertFavient(p.config, p.name?.trim() || configToName(p.config), p.source, at < 0 ? st.favients.length : at, group);
};
