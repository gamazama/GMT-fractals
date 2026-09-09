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
 *   • a drop onto the group it is already in, with no position asked for, is a no-op —
 *     not a reorder-to-front.
 *
 * `fileFavientAt` is the same rule with a PLACE: it puts the gradient in front of a named
 * one (`beforeId`), or at the end of the group when that is null. The shelf panel has
 * always placed to an exact index (grep `insertIndexFromPointer`); until 2026-09-09 the
 * ground could only append, which is why dropping on a chip felt like it did nothing.
 * The anchor is an ID rather than an index so a wall narrowed by search still means the
 * gradient you can see — the panel disables reordering while filtered for exactly the
 * reason this avoids.
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

/**
 * File SEVERAL favourites into `group` at one place, keeping their shelf order. One index
 * is computed once and the whole run is spliced, rather than calling `fileFavientAt` in a
 * loop: each call resolves `beforeId` against the array it just mutated, so a loop
 * interleaves or reverses them, and it would write localStorage once per item.
 *
 * Ids only — a multi-drag is always a drag of things already on the shelf. Unknown ids are
 * skipped. The caller owns the undo bracket, so a batch move is ONE step.
 */
export const fileFavientsAt = (group: string, favIds: readonly string[], beforeId: string | null): void => {
  const st = useFavientsStore.getState();
  const moving = favIds.map((id) => st.favients.find((f) => f.id === id)).filter((f): f is Favient => !!f);
  if (!moving.length) return;
  const movingIds = new Set(moving.map((f) => f.id));
  const rest = st.favients.filter((f) => !movingIds.has(f.id));
  const members = rest.map((f, i) => ({ f, i })).filter((x) => groupOf(x.f) === group);
  const beforeAt = beforeId != null && !movingIds.has(beforeId) ? rest.findIndex((f) => f.id === beforeId) : -1;
  const at =
    beforeAt >= 0
      ? beforeAt
      : members.length
        ? members[members.length - 1].i + 1
        : rest.length;
  const rehomed = moving.map((f) => ({ ...f, group }));
  st.replaceAll([...rest.slice(0, at), ...rehomed, ...rest.slice(at)], group);
};

/**
 * File a dragged gradient into `group`, IN FRONT OF the favourite `beforeId` — or at the
 * end of that group when it is null. Positions are resolved against the shelf array with
 * the dragged favourite already removed, which is the index `moveFavient` expects.
 */
export const fileFavientAt = (group: string, p: FavientDragPayload, beforeId: string | null): void => {
  const st = useFavientsStore.getState();
  const sig = favientSig(p.config);
  const existing = p.favId
    ? st.favients.find((f) => f.id === p.favId)
    : st.favients.find((f) => favientSig(f.config) === sig);
  // Dropping a gradient in front of ITSELF asks for nothing.
  if (existing && existing.id === beforeId) return;
  const rest = existing ? st.favients.filter((f) => f.id !== existing.id) : st.favients;
  const members = rest.map((f, i) => ({ f, i })).filter((x) => groupOf(x.f) === group);
  const at =
    beforeId != null
      ? (rest.findIndex((f) => f.id === beforeId) ?? -1)
      : // the end of the group's run — just past its last member, or the array's end when
        // the group is empty
        members.length
        ? members[members.length - 1].i + 1
        : rest.length;
  const index = at < 0 ? (members.length ? members[members.length - 1].i + 1 : rest.length) : at;
  if (existing) st.moveFavient(existing.id, index, group);
  else st.insertFavient(p.config, p.name?.trim() || configToName(p.config), p.source, index, group);
};
