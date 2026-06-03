/**
 * catalogLoader — loads the baked palette library from the SEPARABLE bundle assets
 * produced by debug/bake-palette-catalog.mts. The library is split so a public build
 * can ship the clean core alone and fetch the licence-encumbered sources on demand:
 *   core.bin.gz / core.json.gz        — always-shipped local (/palette/), redistributable
 *   softology.bin.gz / softology.json.gz  — lazy, from the CDN (provenance-unverified)
 *   cptcity.bin.gz / cptcity.json.gz      — lazy, from the CDN (redistribution-bound)
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
import type { CatalogEntry } from './presetCatalog';
import type { Facets } from './facets';

export interface BundleInfo {
  label: string;
  license: string;
  attribution: string;
  url: string;
}

/** A loadable bundle file (a .bin.gz + .json.gz pair). `core` groups load on start. */
export interface PaletteGroup {
  id: string;
  /** Source-bundle ids that live in this file (for the toggle UI's load/unload mapping). */
  bundles: string[];
  /** Always loaded on start (the clean, redistributable core). */
  core: boolean;
}

/** Group registry — must match the GROUP_OF / GROUPS split in bake-palette-catalog.mts. */
export const PALETTE_GROUPS: PaletteGroup[] = [
  { id: 'core', bundles: ['uigradients', 'colorbrewer', 'matplotlib', 'pypalettes'], core: true },
  { id: 'softology', bundles: ['softology'], core: false },
  { id: 'cptcity', bundles: ['cptcity'], core: false },
];

/** Map a source-bundle id → its group id (e.g. 'softology' → 'softology', 'matplotlib' → 'core'). */
export const groupOfBundle = (bundleId: string): string | undefined =>
  PALETTE_GROUPS.find((g) => g.bundles.includes(bundleId))?.id;

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
 * Bases to try, in order, for a group: the redistributable `core` ships locally; the
 * licensed groups come from the CDN first, falling back to a local copy (present in dev)
 * on a 404 / network error — so the toggle works whether or not the bundle is published.
 */
const basesForGroup = (groupId: string): string[] => {
  const g = PALETTE_GROUPS.find((x) => x.id === groupId);
  return g && !g.core ? [_cdnBase, PALETTE_LOCAL_BASE] : [PALETTE_LOCAL_BASE];
};

interface RawCatalog {
  group: string;
  count: number;
  stride: number;
  bundles: Record<string, BundleInfo>;
  /** Survivor counts per source bundle, across ALL groups (baked into every file). */
  counts: Record<string, number>;
  entries: { id: string; name: string; bundle: string; theme: string; f: number[]; hue: number; mh: number }[];
}

// Full bundle manifest + per-bundle counts, accumulated as groups load (every file
// carries the complete manifest + counts, so the first loaded group fills these).
let _bundles: Record<string, BundleInfo> = {};
let _counts: Record<string, number> = {};
const _groupCache: Record<string, CatalogEntry[]> = {};

export const getCatalogBundles = (): Record<string, BundleInfo> => _bundles;
export const getBundleCounts = (): Record<string, number> => _counts;

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
  for (const b of bases) {
    try {
      [binBuf, jsonBuf] = await Promise.all([
        fetchOk(`${b}${groupId}.bin.gz`),
        fetchOk(`${b}${groupId}.json.gz`),
      ]);
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
  // Every file carries the full manifest + counts; merge so the UI knows about all
  // bundles even before their group loads.
  _bundles = { ..._bundles, ...meta.bundles };
  _counts = { ..._counts, ...meta.counts };
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
