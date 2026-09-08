/**
 * groundSets — the pure half of "one ground, many sets" (GE v2 Phase D, 2026-09-08;
 * plans/ge-v2-unified-shell-plan.md §4 Phase D, the DECIDED block).
 *
 * The v2 shell's ground shows ONE set of gradients at a time and the bottom rail names the
 * sets. This module answers three questions without React, the DOM or a store:
 *
 *   1. `listGroundSets` — which sets exist, in the rail's FIXED order: All (the catalogue),
 *      Recent's dated bins newest first (Today · Yesterday · the date), Kept (the shelf's
 *      default group), every named group in shelf order, Snapshots last. The order never
 *      changes with use, so a set is a PLACE (the research's rule 1: "Mine is a place").
 *   2. `membersOf` — which favourites a set id resolves to, in shelf order.
 *   3. `favientsToEntries` / `rampToEntry` — a favourite (or a snapshot's ramp) as the
 *      `CatalogEntry` the wall draws. The wall blits every tile from ONE sprite by
 *      `entry.row`, so a set's entries are renumbered 0..n-1 for a sprite of their own
 *      (`usePickerModel` builds it from `entries[i].ramp`). Display ramps are rendered in
 *      sRGB, as `FavientSwatch` does — the stored colorSpace is a bake-for-shader concern.
 *
 * Plus `tileSizeFor`: the tile grows as the set shrinks, so five gradients are five large
 * bars and eleven thousand are the dense wall. Steps, not a curve, so the wall does not
 * re-layout on every pad drag.
 *
 * Set ids are strings so they persist: `all` · `bin:<YYYY-MM-DD>` · `group:<groupId>`
 * (`group:` with an empty id is the default group) · `snapshots`.
 *
 * @invariant `favientsToEntries` numbers rows 0..n-1 in input order and every entry's id is
 *   its favourite's id — proven by: `npx tsx debug/test-palette-groundsets.mts`
 *   ("entries: rows are 0..n-1 in order, ids are the favourites' ids").
 * @invariant `tileSizeFor` never returns a tile smaller than the base in either axis and is
 *   monotone: a larger count never gets a larger tile — proven by the same harness
 *   ("tile size: never below base, never grows with count").
 * @see palette/components/usePickerModel.ts (the hook that feeds a set to the wall)
 * @see gradient-explorer/v2/SetRail.tsx (the chips)
 */

import type { CatalogEntry } from './presetCatalog';
import { computeFacets } from './facets';
import { renderStopsToRamp } from './gmtGradient';
import type { RGB } from './oklab';
import { DEFAULT_GROUP, PRESETS_GROUP, favientSig, isRecentGroup, type Favient } from '../store/favientsStore';
import { buildBlocks, dayKey } from '../components/favientBlocks';

// --- ids ---------------------------------------------------------------------------

export const ALL_SET_ID = 'all';
export const SNAPSHOTS_SET_ID = 'snapshots';
/** The shelf's default (un-divided) group, as a chip. */
export const KEPT_LABEL = 'Kept';
export const binSetId = (day: string): string => `bin:${day}`;
export const groupSetId = (group: string): string => `group:${group}`;

export type GroundSetKind = 'catalog' | 'bin' | 'group' | 'snapshots';

export interface GroundSetDesc {
  id: string;
  kind: GroundSetKind;
  label: string;
  count: number;
  /** `group` sets: the favourites group id ('' = the default group, labelled Kept). */
  group?: string;
  /** `bin` sets: the local calendar day (`YYYY-MM-DD`). */
  day?: string;
}

/** Parse a set id back into its kind and key. Unknown shapes read as All. */
export const parseSetId = (id: string): { kind: GroundSetKind; key: string } => {
  if (id === SNAPSHOTS_SET_ID) return { kind: 'snapshots', key: '' };
  if (id.startsWith('bin:')) return { kind: 'bin', key: id.slice(4) };
  if (id.startsWith('group:')) return { kind: 'group', key: id.slice(6) };
  return { kind: 'catalog', key: '' };
};

// --- the set list ------------------------------------------------------------------

export interface ListGroundSetsInput {
  favients: Favient[];
  groupLabels: Record<string, string>;
  /** Entries in the loaded catalogue (the All chip's count). */
  catalogTotal: number;
  snapshotCount: number;
  now?: number;
}

/**
 * The rail, in order. Recent's bins come from `buildBlocks` (newest first, since a collect
 * promotes to the head of the run); a named group whose favourites sit in two runs is ONE
 * chip with the summed count. The seeded Presets group hides once Recent has anything —
 * the strip's rule, kept: it is a starter, not a place the user made.
 */
export const listGroundSets = ({ favients, groupLabels, catalogTotal, snapshotCount, now = Date.now() }: ListGroundSetsInput): GroundSetDesc[] => {
  const out: GroundSetDesc[] = [{ id: ALL_SET_ID, kind: 'catalog', label: 'All', count: catalogTotal }];
  const bins: GroundSetDesc[] = [];
  const groups = new Map<string, GroundSetDesc>();
  let hasRecent = false;
  for (const b of buildBlocks(favients, now)) {
    if (isRecentGroup(b.group)) {
      hasRecent = true;
      const day = b.key.slice(b.group.length + 1);
      bins.push({ id: binSetId(day), kind: 'bin', label: b.label ?? day, count: b.favs.length, day });
      continue;
    }
    const g = b.group;
    const cur = groups.get(g);
    if (cur) cur.count += b.favs.length;
    else groups.set(g, { id: groupSetId(g), kind: 'group', label: groupLabels[g] ?? (g === DEFAULT_GROUP ? KEPT_LABEL : g), count: b.favs.length, group: g });
  }
  out.push(...bins);
  for (const g of groups.values()) {
    if (g.group === PRESETS_GROUP && hasRecent) continue;
    out.push(g);
  }
  if (snapshotCount > 0) out.push({ id: SNAPSHOTS_SET_ID, kind: 'snapshots', label: 'Snapshots', count: snapshotCount });
  return out;
};

/** The favourites a bin or group set holds, in shelf order. Empty for All / Snapshots. */
export const membersOf = (setId: string, favients: Favient[]): Favient[] => {
  const { kind, key } = parseSetId(setId);
  if (kind === 'bin') return favients.filter((f) => isRecentGroup(f.group) && dayKey(f.createdAt) === key);
  if (kind === 'group') return favients.filter((f) => (f.group ?? DEFAULT_GROUP) === key);
  return [];
};

// --- favourites as wall entries ----------------------------------------------------

const packRamp = (ramp: RGB[]): Uint8Array => {
  const buf = new Uint8Array(ramp.length * 4);
  for (let i = 0; i < ramp.length; i++) {
    buf[i * 4] = Math.max(0, Math.min(255, Math.round(ramp[i].r)));
    buf[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(ramp[i].g)));
    buf[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(ramp[i].b)));
    buf[i * 4 + 3] = 255;
  }
  return buf;
};

type EntryBody = Omit<CatalogEntry, 'row' | 'name'>;
/** Rendered ramps + facets per favourite, keyed on id + content — a rename or a reorder
 *  costs nothing, a re-collect that changes the stops renders once. Bounded: cleared
 *  when it outgrows the shelf many times over (the cap is generous; a shelf holds ~60
 *  Recent plus whatever the user keeps). */
const bodyCache = new Map<string, EntryBody>();
const BODY_CACHE_CAP = 4000;

const bodyFor = (f: Favient): EntryBody => {
  const key = `${f.id}|${favientSig(f.config)}|${f.config.blendSpace ?? ''}`;
  const hit = bodyCache.get(key);
  if (hit) return hit;
  if (bodyCache.size > BODY_CACHE_CAP) bodyCache.clear();
  const rgb = renderStopsToRamp(f.config.stops, f.config.blendSpace ?? 'oklab', 'srgb');
  const body: EntryBody = { id: f.id, stops: f.config.stops, facets: computeFacets(rgb), ramp: packRamp(rgb) };
  bodyCache.set(key, body);
  return body;
};

/** The wall entries for a set of favourites: `row` = index, id = the favourite's id. */
export const favientsToEntries = (favs: Favient[]): CatalogEntry[] =>
  favs.map((f, i) => ({ ...bodyFor(f), name: f.name, row: i }));

/** One wall entry from a display ramp (a snapshot's). `row` is the caller's index. */
export const rampToEntry = (id: string, name: string, ramp: RGB[], row: number): CatalogEntry => ({
  id,
  name,
  facets: computeFacets(ramp),
  ramp: packRamp(ramp),
  row,
});

// --- tile size by count --------------------------------------------------------------

export interface TileSize { w: number; h: number }

/** Up to this many entries → this tile. Past the last step the base size stands. */
const TILE_STEPS: ReadonlyArray<readonly [maxCount: number, w: number, h: number]> = [
  [8, 192, 108],
  [24, 144, 81],
  [60, 112, 63],
  [160, 80, 45],
  [400, 64, 36],
  [1500, 44, 24],
];

/**
 * The tile for a set of `count` entries, never smaller than `base` (the wall's own
 * setting, 32×18 by default) in either axis. Five gradients read as five large bars;
 * the full catalogue keeps its density.
 */
export const tileSizeFor = (count: number, base: TileSize): TileSize => {
  for (const [max, w, h] of TILE_STEPS) {
    if (count <= max) return { w: Math.max(base.w, w), h: Math.max(base.h, h) };
  }
  return { w: base.w, h: base.h };
};
