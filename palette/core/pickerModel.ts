/**
 * pickerModel — the pure half of the gradient wall: catalog → filter → arrange → rows.
 *
 * Every host that shows the wall (the old Gradient Explorer's PickerStage, app-gmt's
 * palette overlay, the v2 Browse stage) runs THIS pipeline and differs only in chrome.
 * Nothing here touches React, the engine store, the DOM or `window`; the hook that binds
 * it to the stores is `palette/components/usePickerModel.ts`.
 *
 * The pipeline, in order:
 *   1. `buildSearchIndex` — one lowercased `name · theme · source-label` haystack per
 *      entry, built once per catalog so a keystroke is a `String.includes` per entry
 *      rather than 11k re-concatenations.
 *   2. `filterCatalog` — token-AND search · hidden sources · active themes · the carve
 *      id-set · the five quality windows. Cheapest rejecter first.
 *   3. `arrangeRows` — partition by the GROUP axis (category / source / none), bucket
 *      each group into ROW bands by a facet, sort each band by the SORT axis. Group and
 *      Sort are INDEPENDENT: grouping by category never blocks in-category sorting.
 *   4. `similarityRows` — the "More like this" mode: one ungrouped band, nearest first.
 *
 * Rows are consumed as `PickerGroup` by `palette/components/PickerWall.tsx`, which
 * re-exports `PickerRow` under that name — one definition, no drift.
 *
 * @invariant `arrangeRows` preserves the entry set exactly: the union of the returned
 *   rows' entries is a permutation of the input list (no entry dropped, none duplicated),
 *   for every combination of group / rows / sort axis — proven by:
 *   `npx tsx debug/test-palette-pickermodel.mts` ("arrange: every axis pair preserves the
 *   entry set").
 * @invariant `carveIds('cut', …)` and `carveIds('isolate', …)` partition the displayed
 *   ids: isolate keeps exactly the inside set (in display order) and cut keeps exactly its
 *   complement, so the two are disjoint and together cover the displayed wall — proven by:
 *   `npx tsx debug/test-palette-pickermodel.mts` ("carve: isolate ∪ cut === displayed, and
 *   they are disjoint").
 * @see plans/ge-v2-design.md §5.2
 */

import type { CatalogEntry } from './presetCatalog';
import { passesFilters, type FilterWindows } from './facets';
import { similarityProbe, SIM_SAMPLES } from './paletteSample';
import { renderStopsToRamp } from './gmtGradient';
import type { RGB } from './oklab';
import type { GradientConfig } from '../../types';

// --- row shape -------------------------------------------------------------------

/**
 * One band of the wall. `PickerWall` re-exports this as `PickerGroup`.
 *
 * `cat` + `lo`/`hi` let the wall merge adjacent facet buckets of the same category into
 * a single visual row (it unions the ranges for the gutter label).
 */
export interface PickerRow {
  key: string;
  /** Primary label (e.g. the category) — blank to continue the previous one. */
  label: string;
  /** Secondary label (e.g. the facet row bucket). */
  sublabel?: string;
  entries: CatalogEntry[];
  /** The wall fills a band COLUMN-major (a sort runs down each column); a RANKED band —
   *  "More like this" — reads ROW-major, nearest first left to right, top to bottom
   *  (owner, 2026-09-07 evening: "only the first column shows similar gradients"). */
  rowMajor?: boolean;
  /** Category id — adjacent rows sharing it (and a facet range) may merge into one row. */
  cat?: string;
  /** Facet bucket bounds (0..1) for a bucketed sub-row; absent = not row-mergeable. */
  lo?: number;
  hi?: number;
}

// --- search index ----------------------------------------------------------------

/**
 * Per-entry lowercased search haystack = name + theme + bundle LABEL (not the synthetic
 * `preset-N` id, not the bundle id). `bundleLabel` resolves a bundle id to its display
 * label; a host without a manifest can pass `() => undefined`.
 */
export const buildSearchIndex = (
  catalog: CatalogEntry[],
  bundleLabel: (bundleId: string) => string | undefined,
): Map<string, string> => {
  const m = new Map<string, string>();
  for (const e of catalog) {
    const label = e.bundle ? bundleLabel(e.bundle) : undefined;
    m.set(e.id, `${e.name} ${e.theme ?? ''} ${label ?? ''}`.toLowerCase());
  }
  return m;
};

// --- filtering -------------------------------------------------------------------

/** Everything that can shrink the wall. `query` is raw user text (trimmed here). */
export interface FilterCriteria {
  windows: FilterWindows;
  /** Selected themes; empty = all. */
  activeThemes: string[];
  /** Source bundles toggled off. */
  hiddenBundles: string[];
  /** Spatial carve survivors, or null for no carve. */
  keptIds: string[] | null;
  /** Free-text query over name · theme · source. */
  query: string;
}

export const EMPTY_CRITERIA: FilterCriteria = {
  windows: {},
  activeThemes: [],
  hiddenBundles: [],
  keptIds: null,
  query: '',
};

/** The six quality windows as `passesFilters` wants them, from a `{x,y}`-shaped slice. */
export const windowsFromSlice = (pf: Record<string, unknown> | undefined): FilterWindows => {
  const win = (v: unknown): [number, number] => {
    const o = v as { x?: number; y?: number } | undefined;
    return [o?.x ?? 0, o?.y ?? 1];
  };
  return { qL: win(pf?.qL), qC: win(pf?.qC), qCov: win(pf?.qCov), qRb: win(pf?.qRb), qWarm: win(pf?.qWarm), qHue: win(pf?.qHue) };
};

/** A window narrows only when it is not the full [0,1] range. */
export const isWindowActive = (w: [number, number] | undefined): boolean => !!w && (w[0] > 0 || w[1] < 1);

/** How many of the five quality axes are narrowed right now. */
export const activeWindowCount = (w: FilterWindows): number =>
  [w.qL, w.qC, w.qCov, w.qRb, w.qWarm, w.qHue].filter(isWindowActive).length;

export const filterCatalog = (
  catalog: CatalogEntry[],
  criteria: FilterCriteria,
  searchIndex: Map<string, string>,
): CatalogEntry[] => {
  const themeSet = criteria.activeThemes.length ? new Set(criteria.activeThemes) : null;
  const hiddenSet = new Set(criteria.hiddenBundles);
  const kept = criteria.keptIds ? new Set(criteria.keptIds) : null;
  const q = criteria.query.trim().toLowerCase();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : null;
  return catalog.filter(
    (e) =>
      // Token-AND search (cheapest rejecter first) over name · theme · source label.
      (!tokens || tokens.every((t) => (searchIndex.get(e.id) ?? '').includes(t))) &&
      (!hiddenSet.size || !e.bundle || !hiddenSet.has(e.bundle)) &&
      (!themeSet || (e.theme != null && themeSet.has(e.theme))) &&
      (!kept || kept.has(e.id)) &&
      passesFilters(e.facets, criteria.windows),
  );
};

// --- narrower bookkeeping --------------------------------------------------------

/**
 * Which narrowers are shrinking the wall, as user-facing words. `search` is included
 * here (the old Picker chrome lists it in its readout) but EXCLUDED from
 * `activeFilterCount`, which drives the v2 Filters badge — search has its own field.
 */
export const narrowerLabels = (criteria: FilterCriteria): string[] => {
  const out: string[] = [];
  if (criteria.query.trim()) out.push('search');
  if (criteria.keptIds) out.push('carved');
  if (activeWindowCount(criteria.windows) > 0) out.push('quality');
  if (criteria.activeThemes.length) out.push('themes');
  if (criteria.hiddenBundles.length) out.push('sources');
  return out;
};

/**
 * The Filters-button badge: one per narrowed quality axis, one for themes, one for
 * hidden sources, one for an active carve. Search is deliberately not counted.
 */
export const activeFilterCount = (criteria: FilterCriteria): number =>
  activeWindowCount(criteria.windows) +
  (criteria.activeThemes.length ? 1 : 0) +
  (criteria.hiddenBundles.length ? 1 : 0) +
  (criteria.keptIds ? 1 : 0);

// --- arranging -------------------------------------------------------------------

/** Sort key for one entry on a given axis. Strings compare with `localeCompare`. */
export const sortValue = (axis: string, e: CatalogEntry): number | string => {
  switch (axis) {
    case 'lightness': return e.facets.lightness;
    case 'vividness': return e.facets.chroma;
    case 'complexity': return e.facets.complexity;
    case 'rainbow': return e.facets.rainbow;
    case 'warmth': return e.facets.warmth;
    case 'hue': return e.facets.raw.meanHue;
    case 'name': return e.name.toLowerCase();
    // A set's OWN order (GE v2 Phase D): a user set's entries are numbered in shelf order,
    // so sorting by row keeps the order the user made. On the catalogue it is load order.
    case 'order': return e.row;
    default: return 0;
  }
};

/** Facet axes usable for the "Rows by" bucketing (Y). Category/Source handled separately. */
export const FACET_OF: Record<string, (e: CatalogEntry) => number> = {
  lightness: (e) => e.facets.lightness,
  vividness: (e) => e.facets.chroma,
  complexity: (e) => e.facets.complexity,
  rainbow: (e) => e.facets.rainbow,
  warmth: (e) => e.facets.warmth,
  hue: (e) => e.facets.raw.meanHue / 360, // 0..1 for bucketing
};
export const ROW_BUCKETS = 10;

export interface ArrangeAxes {
  /** 'none' | 'theme' (Category) | 'bundle' (Source). */
  groupAxis: string;
  /** A FACET_OF key, or 'none' for one band per group. */
  rowsAxis: string;
  /** A `sortValue` axis. */
  sortAxis: string;
  reverse: boolean;
}

export const DEFAULT_AXES: ArrangeAxes = { groupAxis: 'theme', rowsAxis: 'lightness', sortAxis: 'hue', reverse: false };

/**
 * Partition into group bands, bucket each into facet sub-rows, sort each sub-row.
 * `bundleLabel` names a source band; category bands use the theme string itself.
 */
export const arrangeRows = (
  list: CatalogEntry[],
  axes: ArrangeAxes,
  bundleLabel: (bundleId: string) => string | undefined = () => undefined,
): PickerRow[] => {
  const { groupAxis, rowsAxis, sortAxis, reverse } = axes;
  const cmp = (a: CatalogEntry, b: CatalogEntry) => {
    const sa = sortValue(sortAxis, a), sb = sortValue(sortAxis, b);
    if (typeof sa === 'string' && typeof sb === 'string') return sa.localeCompare(sb);
    return (sa as number) - (sb as number);
  };
  // Copy before sorting: `arrangeRows` must never reorder the caller's array. In the app
  // the input is always a fresh `filterCatalog` result, but the ungrouped/unbanded path
  // hands `list` straight through, and an in-place sort there would quietly shuffle the
  // catalog itself. (Caught by the harness, which passes its fixture catalog directly.)
  const finish = (arr: CatalogEntry[]) => { const out = [...arr]; out.sort(cmp); if (reverse) out.reverse(); return out; };

  // Within one (optional) category group, bucket into facet sub-rows. The category
  // label shows once (first sub-row); each sub-row carries its bucket sublabel.
  const buildBands = (entries: CatalogEntry[], catLabel: string, catKey: string): PickerRow[] => {
    const fv = FACET_OF[rowsAxis];
    if (!fv) return [{ key: catKey, label: catLabel, entries: finish(entries) }];
    const map = new Map<number, CatalogEntry[]>();
    for (const e of entries) {
      const b = Math.min(ROW_BUCKETS - 1, Math.max(0, Math.floor(fv(e) * ROW_BUCKETS)));
      (map.get(b) ?? map.set(b, []).get(b)!).push(e);
    }
    const order = [...map.keys()].sort((a, b) => b - a); // most on top
    // Category header carries the bucketing axis, e.g. "kaleidoscope (lightness)".
    const header = catLabel ? `${catLabel} (${rowsAxis})` : '';
    return order.map((b, i) => {
      const lo = b / ROW_BUCKETS, hi = (b + 1) / ROW_BUCKETS;
      return {
        key: `${catKey}-b${b}`,
        cat: catKey, // adjacent buckets in the same category may merge into one row
        lo, hi, // numeric bounds so the wall can union ranges when merging
        label: i === 0 ? header : '',
        // Range only — count is appended in the gutter as "0.8–0.9 (23)" (one line).
        sublabel: `${lo.toFixed(1)}–${hi.toFixed(1)}`,
        entries: finish(map.get(b)!),
      };
    });
  };

  if (groupAxis === 'theme' || groupAxis === 'bundle') {
    const map = new Map<string, CatalogEntry[]>();
    for (const e of list) {
      const k = (groupAxis === 'theme' ? e.theme : e.bundle) ?? '—';
      (map.get(k) ?? map.set(k, []).get(k)!).push(e);
    }
    const order = [...map.keys()].sort((a, b) => map.get(b)!.length - map.get(a)!.length);
    return order.flatMap((k) => buildBands(map.get(k)!, groupAxis === 'bundle' ? (bundleLabel(k) ?? k) : k, k));
  }
  return buildBands(list, '', 'all');
};

/** The closed Arrange state as a sentence: "by category · rows by lightness · sorted by hue". */
export const arrangeSentence = (axes: ArrangeAxes): string => {
  // No grouping says NOTHING (owner, 2026-09-09) — "ungrouped" named the absence of a thing
  // the reader had not been told about, in the one sentence meant to describe the wall.
  const group =
    axes.groupAxis === 'theme' ? 'by category' : axes.groupAxis === 'bundle' ? 'by source' : '';
  const parts = group ? [group] : [];
  if (FACET_OF[axes.rowsAxis]) parts.push(`rows by ${axes.rowsAxis}`);
  parts.push(`sorted by ${axes.sortAxis}${axes.reverse ? ', reversed' : ''}`);
  return parts.join(' · ');
};

// --- More like this --------------------------------------------------------------

/**
 * The `samples` texels `rampDistance` would read out of a full 256-step ramp, pulled
 * straight from the entry's packed RGBA buffer. 16 objects per entry instead of 256, and
 * `rampDistance(sampleRampBuffer(buf, k), fullRamp, k)` is bit-identical to
 * `rampDistance(bufferToRamp(buf), fullRamp, k)` because both index the same texels.
 */
export const sampleRampBuffer = (buf: Uint8Array, samples = 16, stride = 4): RGB[] => {
  const k = Math.max(2, samples | 0);
  const last = buf.length / stride - 1;
  const out: RGB[] = new Array(k);
  for (let s = 0; s < k; s++) {
    const i = Math.round((s / (k - 1)) * last) * stride;
    out[s] = { r: buf[i], g: buf[i + 1], b: buf[i + 2] };
  }
  return out;
};

/**
 * The ramp "More like this" compares AGAINST, from the anchor's own config: always rendered
 * in sRGB, whatever output profile the document carries. The catalog's texels are sRGB
 * thumbnails and "similar" is what the eye sees — measured 2026-09-07: a document on the
 * Linear profile rendered a near-black anchor, so the wall came back with the library's
 * darkest gradients while the metric itself ranked correctly.
 * @invariant the output profile never changes the ranking — proven by: npx tsx
 *   debug/test-palette-pickermodel.mts ("the output profile does not move the ranking")
 */
export const similarityAnchorRamp = (config: GradientConfig): RGB[] =>
  renderStopsToRamp(config.stops, config.blendSpace, 'srgb');

/**
 * Similarity of every catalog entry to one anchor ramp, keyed by entry id (paletteSample's
 * probe: shape with warp tolerance, against the reverse too; colour content by rank;
 * bandedness). O(n · samples · band) — compute ONCE per (catalog, anchor) and reuse it
 * while the user keeps filtering.
 */
export const similarityIndex = (
  catalog: CatalogEntry[],
  anchorRamp: RGB[],
  samples = SIM_SAMPLES,
): Map<string, number> => {
  const m = new Map<string, number>();
  const probe = similarityProbe(anchorRamp, samples);
  for (const e of catalog) m.set(e.id, probe.distance(sampleRampBuffer(e.ramp, samples)));
  return m;
};

/** Nearest-first by the precomputed index; ties keep catalog order (stable sort). */
export const rankBySimilarity = (list: CatalogEntry[], distance: Map<string, number>): CatalogEntry[] =>
  [...list].sort((a, b) => (distance.get(a.id) ?? Infinity) - (distance.get(b.id) ?? Infinity));

/** The wall in similarity mode: ONE ungrouped band, nearest first. */
export const similarityRows = (list: CatalogEntry[], distance: Map<string, number>): PickerRow[] => [
  { key: 'similar', label: '', entries: rankBySimilarity(list, distance), rowMajor: true },
];

// --- carve -----------------------------------------------------------------------

/**
 * The new `keptIds` after a carve. `isolate` keeps the drawn set; `cut` drops it from the
 * WHOLE displayed wall (not just the on-screen swatches), which is why the host has to
 * pass the full displayed id list rather than letting the wall answer.
 */
export const carveIds = (displayedIds: string[], insideIds: string[], op: 'isolate' | 'cut'): string[] => {
  if (op === 'isolate') {
    const inside = new Set(insideIds);
    return displayedIds.filter((id) => inside.has(id));
  }
  const drop = new Set(insideIds);
  return displayedIds.filter((id) => !drop.has(id));
};

/** The slice patch that clears every DDFS narrower at once (search + carve are separate). */
export const CLEAR_ALL_PATCH: Record<string, unknown> = {
  keptIds: null,
  activeThemes: [],
  hiddenBundles: [],
  qL: { x: 0, y: 1 },
  qC: { x: 0, y: 1 },
  qCov: { x: 0, y: 1 },
  qRb: { x: 0, y: 1 },
  qWarm: { x: 0, y: 1 },
};
