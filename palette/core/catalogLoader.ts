/**
 * catalogLoader — loads the baked palette library from the SEPARABLE bundle assets
 * produced by debug/bake-palette-catalog.mts. The library is split so a public build
 * can ship the clean core alone and fetch the licence-encumbered sources on demand:
 *   /palette/core.bin.gz / core.json.gz        — always-shipped, redistributable
 *   /palette/softology.bin.gz / softology.json.gz  — lazy (provenance-unverified)
 *   /palette/cptcity.bin.gz / cptcity.json.gz      — lazy (redistribution-bound)
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
export const loadGroup = async (groupId: string, base = '/palette/'): Promise<CatalogEntry[]> => {
  if (_groupCache[groupId]) return _groupCache[groupId];

  const [binBuf, jsonBuf] = await Promise.all([
    fetch(`${base}${groupId}.bin.gz`).then((r) => r.arrayBuffer()),
    fetch(`${base}${groupId}.json.gz`).then((r) => r.arrayBuffer()),
  ]);

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
