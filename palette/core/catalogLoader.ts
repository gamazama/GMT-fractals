/**
 * catalogLoader — loads the baked palette library from the SEPARABLE pack assets produced by
 * debug/bake-palette-catalog.mts (which gradient lands in which pack: debug/palette-packs.mts).
 *   core.*           — always loaded, shipped locally (/palette/), tracked in the repo. Mixed
 *                      licences (MIT, Apache-2.0, GPL-2/3, CC0, CC BY/BY-SA 4.0) — its credits
 *                      file (credits.core.txt) ships beside it and is what About links to.
 *   softology.*      — lazy, from the CDN (origins unverified)
 *   cptcity.*        — lazy, from the CDN (per-archive licences)
 *   elvensword.*     — lazy, from the CDN (ElvenSword under its own name)
 *   noncommercial.*  — the OPTIONAL pack (owner, 2026-09-13): published on the CDN, but never
 *                      loaded at boot by any host — reachable only by ticking it in Filters ▸
 *                      Sources, under "Optional packs".
 * WHICH packs are registered is DERIVED from `palette/core/catalogPacks.ts` `PACK_PUBLISH` — the
 * one switch the bake also reads — so a pack withdrawn there (publish false, e.g. `unpublished`)
 * is simply not in `PALETTE_GROUPS` and nothing in the app can request it.
 *
 * LIVE SOURCES (2026-09-13). A source that is not a baked pack — GX Global, fetched from the
 * network — registers here with `registerLiveSource` and then behaves like a lazy pack: a
 * Sources toggle loads it into the All wall and unloads it. It carries its own `BundleInfo`, is
 * never credited in an export name (`userMade`), and a load that yields nothing marks it FAILED
 * (`pickerStore.failedGroups`), which disables its toggle for the session.
 *
 * FORMAT v2 (2026-09-13) is additive over v1: per-bundle `tag` (the short licence tag a category
 * name carries), per-entry `src` (the archive / package / family), a `collections` table
 * (label, tag, export credit) and a `credits` file name. A v1 file still loads — its entries
 * just have no collection. Because every file carries the whole manifest and the CDN may keep
 * serving v1 files after the repo's core is v2, manifests MERGE BY VERSION: an older file never
 * overwrites a newer file's labels or counts, it only fills bundles the newer one did not name.
 *
 * The licensed groups are gitignored out of the public deploy, so they lazy-load from the
 * R2 CDN (cdn.gmt-fractals.com/palette/) first, falling back to a local copy (which is
 * present in dev) if the CDN 404s — so a toggle works whether or not the bundle is published.
 *
 * Each .bin is Sub-filtered RGB ramps, gzipped; each .json is metadata + facets.
 * Decompresses with pako (already a dep), undoes the Sub filter (cumulative sum),
 * and yields CatalogEntry[] — the same shape the PickerWall already renders. `row` is
 * left at the file-local index; pickerStore reassigns it across the merged catalog.
 */

import pako from 'pako';
import { PACK_BUNDLES, PACK_IDS, PACK_PUBLISH, type PackId, type PackPublish } from './catalogPacks';
import type { CatalogEntry } from './presetCatalog';
import type { Facets } from './facets';

export interface BundleInfo {
  label: string;
  license: string;
  attribution: string;
  url: string;
  /** Short licence tag for the category name, e.g. "MIT", "CC BY-NC-SA 3.0" (v2 files). For a
   *  live user source this is a description instead ("shared by users"). */
  tag?: string;
  /** The gradients are user-made (GX Global): no licence to carry, so an export name never
   *  gets a credit for them (`catalogOrigin.entryOrigin` returns null). */
  userMade?: boolean;
}

/** One collection within a bundle — a cpt-city archive, a PyPalettes package, a Matplotlib
 *  family (v2 files). Keyed `<bundle>:<src>`. */
export interface CollectionInfo {
  label: string;
  tag: string;
  /** The short credit an unmodified export's name carries (`palette/core/catalogOrigin.ts`). */
  credit: string;
}

/** A loadable bundle file (a .bin.gz + .json.gz pair). `core` groups load on start. */
export interface PaletteGroup {
  id: string;
  /** Source-bundle ids that live in this file (for the toggle UI's load/unload mapping). */
  bundles: string[];
  /** Always loaded on start (the core pack shipped in the repo). */
  core: boolean;
  /** An OPTIONAL pack: no host loads it at boot; the user ticks it in Filters ▸ Sources. */
  optional?: boolean;
}

/**
 * Group registry, derived from `PACK_PUBLISH` (palette/core/catalogPacks.ts): every pack whose
 * publish value is not false, in the table's order. `repo` → core; `optional` → optional. The
 * `unpublished` pack is absent BY CONSTRUCTION: nothing in the app can request it.
 */
export const paletteGroupsFrom = (publish: Record<PackId, PackPublish>): PaletteGroup[] =>
  PACK_IDS
    .filter((id) => publish[id] !== false)
    .map((id) => ({
      id,
      bundles: [...PACK_BUNDLES[id]],
      core: publish[id] === 'repo',
      ...(publish[id] === 'optional' ? { optional: true } : {}),
    }));
export const PALETTE_GROUPS: PaletteGroup[] = paletteGroupsFrom(PACK_PUBLISH);

/** A catalogue source that is not a baked pack (GX Global). */
export interface LiveSource {
  /** Group id AND bundle id — one source, one toggle. */
  id: string;
  info: BundleInfo;
  /** The entries, with `bundle === id`. An empty result means the source did not load. */
  load: () => Promise<CatalogEntry[]>;
  /** Called with a listener that must fire when the source's content changes (a new
   *  contribution); returns the unsubscribe. Optional. */
  subscribe?: (onChange: () => void) => () => void;
}

const _liveSources: LiveSource[] = [];
/** Register a live source (once per id; a re-registration replaces it). */
export const registerLiveSource = (src: LiveSource): void => {
  const at = _liveSources.findIndex((s) => s.id === src.id);
  if (at >= 0) _liveSources[at] = src;
  else _liveSources.push(src);
};
export const getLiveSources = (): readonly LiveSource[] => _liveSources;
export const liveSourceOf = (id: string): LiveSource | undefined => _liveSources.find((s) => s.id === id);

/** Map a source-bundle id → its group id (e.g. 'softology' → 'softology', 'matplotlib' → 'core'),
 *  including a live source (its bundle IS its group). */
export const groupOfBundle = (bundleId: string): string | undefined =>
  PALETTE_GROUPS.find((g) => g.bundles.includes(bundleId))?.id ?? liveSourceOf(bundleId)?.id;

/** Vite's configured base — '/' at the domain root, './' for subpath deploys (e.g.
 *  GitHub Pages at /GMT-fractals/dev/). Guarded for the node/tsx harness, where
 *  `import.meta.env` is absent, so it falls back to the root. */
const VITE_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
/** Local base — the always-shipped core lives here; in dev the licensed bundles are here
 *  too. BASE-RELATIVE (not an absolute `/palette/`) so the packs resolve under a subpath
 *  deploy. An absolute path would hit the origin root (e.g. github.io/palette/ → 404). */
export const PALETTE_LOCAL_BASE = `${VITE_BASE}palette/`;
/** Canonical CDN base for the licence-encumbered / long-tail bundles (Cloudflare R2). */
export const PALETTE_CDN_BASE = 'https://cdn.gmt-fractals.com/palette/';

// Overridable at runtime (e.g. a self-hosted mirror) without rebuilding.
let _cdnBase = PALETTE_CDN_BASE;
const withSlash = (b: string): string => (b.endsWith('/') ? b : b + '/');
export const setPaletteCdnBase = (base: string): void => { _cdnBase = withSlash(base); };

/**
 * Bases to try, in order, for a group: `core` ships locally; the lazy and optional groups
 * come from the CDN first, falling back to a local copy (present in dev)
 * on a 404 / network error — so the toggle works whether or not the bundle is published.
 */
const basesForGroup = (groupId: string): string[] => {
  const g = PALETTE_GROUPS.find((x) => x.id === groupId);
  return g && !g.core ? [_cdnBase, PALETTE_LOCAL_BASE] : [PALETTE_LOCAL_BASE];
};

interface RawCatalog {
  /** Format version: absent = v1, 2 = collections + credits (2026-09-13). */
  v?: number;
  group: string;
  count: number;
  stride: number;
  bundles: Record<string, BundleInfo>;
  /** Survivor counts per source bundle, across ALL groups (baked into every file). */
  counts: Record<string, number>;
  entries: { id: string; name: string; bundle: string; theme: string; f: number[]; hue: number; mh: number; src?: string }[];
  /** v2: this pack's collections, keyed `<bundle>:<src>`. */
  collections?: Record<string, CollectionInfo>;
  /** v2: the credits file name, resolved against the base the pack loaded from. */
  credits?: string;
}

// Full bundle manifest + per-bundle counts, accumulated as groups load (every file
// carries the complete manifest + counts, so the first loaded group fills these).
let _bundles: Record<string, BundleInfo> = {};
let _counts: Record<string, number> = {};
/** The format version the current manifest + counts came from. */
let _manifestVersion = -1;
let _collections: Record<string, CollectionInfo> = {};
const _groupCache: Record<string, CatalogEntry[]> = {};
/** Where each loaded group's credits file is (base it loaded from + its `credits` name). */
const _creditsUrl: Record<string, string> = {};

export const getCatalogBundles = (): Record<string, BundleInfo> => _bundles;
export const getBundleCounts = (): Record<string, number> => _counts;
export const getCatalogCollections = (): Record<string, CollectionInfo> => _collections;
/** The credits file of a loaded group, or undefined (not loaded, or a v1 file without one). */
export const getGroupCreditsUrl = (groupId: string): string | undefined => _creditsUrl[groupId];

/**
 * Merge one file's manifest + counts into what is known. A file NEWER than the current
 * manifest replaces the count table outright (a v2 table is complete; a v1 table describes a
 * catalogue that no longer exists) and overrides the labels it names; a file of the SAME
 * version merges over; an OLDER file only fills bundles nobody has named yet, so a v1 file
 * still on the CDN cannot put back the labels v2 corrected. Exported for the harness.
 *
 * @invariant a v1 file loaded after a v2 file changes no label and no count the v2 file set
 *   — proven by: `npx tsx debug/test-palette-catalog-licensing.mts` ("an old v1 file cannot
 *   overwrite a v2 manifest"). Falsified 2026-09-13 by merging every file over (`{...cur, ...meta}`).
 */
export const mergeManifest = (
  cur: { bundles: Record<string, BundleInfo>; counts: Record<string, number>; version: number },
  meta: { v?: number; bundles?: Record<string, BundleInfo>; counts?: Record<string, number> },
): { bundles: Record<string, BundleInfo>; counts: Record<string, number>; version: number } => {
  const v = meta.v ?? 1;
  if (v >= cur.version) {
    const counts = v > cur.version ? { ...(meta.counts ?? {}) } : { ...cur.counts, ...(meta.counts ?? {}) };
    return { bundles: { ...cur.bundles, ...(meta.bundles ?? {}) }, counts, version: v };
  }
  const bundles = { ...cur.bundles };
  const counts = { ...cur.counts };
  for (const [k, b] of Object.entries(meta.bundles ?? {})) if (!bundles[k]) bundles[k] = b;
  for (const [k, n] of Object.entries(meta.counts ?? {})) if (counts[k] == null) counts[k] = n;
  return { bundles, counts, version: cur.version };
};

/** Fetch a URL, treating a non-2xx (e.g. CDN 404) as an error so the caller can fall back. */
const fetchOk = async (url: string): Promise<ArrayBuffer> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r.arrayBuffer();
};

/** Inflate a fetched buffer; tolerate the transport having already gunzipped it. */
const inflate = (buf: ArrayBuffer): Uint8Array => {
  const u8 = new Uint8Array(buf);
  return u8[0] === 0x1f && u8[1] === 0x8b ? pako.ungzip(u8) : u8;
};

const facetsFrom = (f: number[], hueSpreadDeg: number, meanHue: number): Facets => ({
  lightness: f[0],
  chroma: f[1],
  complexity: f[2],
  rainbow: f[3],
  warmth: f[4],
  raw: { meanL: 0, meanC: 0, hf: 0, hueSpreadDeg, meanHue, meanA: 0, hueOrder: 0 },
});

/**
 * Load one bundle group (e.g. 'core', 'softology', 'cptcity'). Cached per group, so
 * unloading then re-toggling a source re-fetches nothing. `row` is the file-local
 * index here — pickerStore reassigns rows across the merged catalog.
 */
export const loadGroup = async (groupId: string, base?: string): Promise<CatalogEntry[]> => {
  if (_groupCache[groupId]) return _groupCache[groupId];

  // An explicit base overrides the chain (one source, no fallback); otherwise try the
  // group's bases in order (CDN → local for licensed groups).
  const bases = base ? [withSlash(base)] : basesForGroup(groupId);
  let binBuf: ArrayBuffer | undefined;
  let jsonBuf: ArrayBuffer | undefined;
  let lastErr: unknown;
  let loadedFrom = '';
  for (const b of bases) {
    try {
      [binBuf, jsonBuf] = await Promise.all([
        fetchOk(`${b}${groupId}.bin.gz`),
        fetchOk(`${b}${groupId}.json.gz`),
      ]);
      loadedFrom = b;
      break;
    } catch (err) {
      lastErr = err;
      // Graceful: a CDN 404 just means this bundle isn't published there yet — fall
      // through to the next base (the local dev copy). Only warn while alternatives remain.
      if (b !== bases[bases.length - 1])
        console.warn(`[catalogLoader] "${groupId}" not at ${b} (${(err as Error).message}); trying next source`);
    }
  }
  if (!binBuf || !jsonBuf)
    throw new Error(`[catalogLoader] could not load group "${groupId}" from any source: ${String(lastErr)}`);

  const filtered = inflate(binBuf);
  const meta: RawCatalog = JSON.parse(new TextDecoder().decode(inflate(jsonBuf)));
  // Every file carries the full manifest + counts; merge (by version — see mergeManifest) so
  // the UI knows about all bundles even before their group loads.
  const merged = mergeManifest({ bundles: _bundles, counts: _counts, version: _manifestVersion }, meta);
  _bundles = merged.bundles;
  _counts = merged.counts;
  _manifestVersion = merged.version;
  if (meta.collections) _collections = { ..._collections, ...meta.collections };
  if (typeof meta.credits === 'string' && meta.credits) _creditsUrl[groupId] = `${loadedFrom}${meta.credits}`;
  const stride = meta.stride; // 768 = 256×3

  const out: CatalogEntry[] = new Array(meta.entries.length);
  for (let i = 0; i < meta.entries.length; i++) {
    const e = meta.entries[i];
    const off = i * stride;
    // Undo the Sub filter → RGBA ramp.
    const ramp = new Uint8Array(256 * 4);
    let r = filtered[off], g = filtered[off + 1], b = filtered[off + 2];
    ramp[0] = r; ramp[1] = g; ramp[2] = b; ramp[3] = 255;
    for (let k = 1; k < 256; k++) {
      r = (r + filtered[off + k * 3]) & 255;
      g = (g + filtered[off + k * 3 + 1]) & 255;
      b = (b + filtered[off + k * 3 + 2]) & 255;
      const o = k * 4;
      ramp[o] = r; ramp[o + 1] = g; ramp[o + 2] = b; ramp[o + 3] = 255;
    }
    out[i] = { id: e.id, name: e.name, bundle: e.bundle, theme: e.theme, facets: facetsFrom(e.f, e.hue, e.mh), ramp, row: i };
    if (typeof e.src === 'string' && e.src) out[i].src = e.src;
  }

  _groupCache[groupId] = out;
  return out;
};

/** A CSS linear-gradient sampled from a 256×4 RGBA ramp (for previews/hero bars). */
export const rampToCssGradient = (ramp: Uint8Array, samples = 24): string => {
  const parts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const idx = Math.round((i / samples) * 255);
    const o = idx * 4;
    parts.push(`rgb(${ramp[o]},${ramp[o + 1]},${ramp[o + 2]}) ${((i / samples) * 100).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${parts.join(',')})`;
};
