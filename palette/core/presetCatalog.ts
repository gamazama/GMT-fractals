/**
 * presetCatalog — a gradient catalog the Picker browses. Starts from GMT's existing
 * 24 GRADIENT_PRESETS (no Python bake needed yet); each entry carries its computed
 * facets so the quality-filter pads can carve the wall via passesFilters. The full
 * 11k sprite+facet bake is a later data step that produces the same CatalogEntry shape.
 */

import { GRADIENT_PRESETS } from '../../data/gradientPresets';
import type { GradientStop } from '../../types';
import { renderStopsToRamp, renderStopsToBuffer } from './gmtGradient';
import { computeFacets, type Facets } from './facets';
import { oklabToRgb, type RGB } from './oklab';
import type { Channels } from './generatorPipeline';

export interface CatalogEntry {
  id: string;
  name: string;
  /** Source bundle id (loaded catalog) — undefined for the built-in presets. */
  bundle?: string;
  /** Semantic theme (loaded catalog). */
  theme?: string;
  /** Stops, when the gradient came from a stop-based source (presets). Loaded
   *  catalog entries carry only `ramp`; derive stops via stopFit when needed. */
  stops?: GradientStop[];
  facets: Facets;
  /** 256×1 RGBA pixels for the swatch (the wall blits this — gamut-clamped display). */
  ramp: Uint8Array;
  /**
   * Un-clipped OKLCh channels, when this source was baked from a transform (slot bake).
   * The pipeline reads these directly instead of decomposing `ramp`, so out-of-gamut /
   * extreme bakes stay faithful; `ramp` is only the clamped display swatch.
   */
  channels?: Channels;
  /** Stable index into the full catalog = this gradient's row in the shared sprite. */
  row: number;
}

let _cache: CatalogEntry[] | null = null;

/** Build (and memoise) the catalog from GMT's built-in presets. */
export const buildPresetCatalog = (): CatalogEntry[] => {
  if (_cache) return _cache;
  _cache = GRADIENT_PRESETS.map((p, i) => ({
    id: `preset-${i}`,
    name: p.name,
    stops: p.stops,
    facets: computeFacets(renderStopsToRamp(p.stops, 'oklab', 'srgb')),
    ramp: renderStopsToBuffer(p.stops, 'oklab', 'srgb'),
    row: i,
  }));
  return _cache;
};

let _adhocSeq = 0;
/** Content signature → catalog index, so identical ramps dedupe to one entry. */
const _adhocBySig = new Map<string, number>();

/** FNV-1a hash of the RGBA buffer — a stable content key for ad-hoc ramps. */
const rampSig = (buf: Uint8Array): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < buf.length; i++) {
    h ^= buf[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
};

/**
 * Register an arbitrary 256-step RGB ramp as an ad-hoc catalog entry and return its
 * index. This is the "slot-custom-RGB" seam: slots are normally catalog indices, but
 * an extracted (img2grad) or generated gradient isn't in the catalog — so we append
 * it here as a first-class CatalogEntry (no `stops`, only a `ramp`), making it
 * visible to both the source picker and `presetRamp()` via the returned index.
 *
 * Deduped by CONTENT (not name): an identical ramp reuses its existing index (a true
 * no-op — nothing changed), but any different ramp gets a NEW index even if the name
 * collides (e.g. two "Image · distill" extractions). Keying on content is essential —
 * the generator memoises its source ramp on the slot INDEX, so replacing a ramp in
 * place under the same index would leave the slot showing the stale gradient (the
 * "drop/apply only works once" bug). Distinct contents the user actually sends are
 * modest, so growth is bounded in practice.
 */
export const registerCustomRamp = (ramp: RGB[], name: string): number => {
  const cat = buildPresetCatalog(); // ensure _cache exists (returns it)
  const buf = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    buf[i * 4] = Math.max(0, Math.min(255, Math.round(ramp[i].r)));
    buf[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(ramp[i].g)));
    buf[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(ramp[i].b)));
    buf[i * 4 + 3] = 255;
  }
  const sig = rampSig(buf);
  const hit = _adhocBySig.get(sig);
  if (hit !== undefined && cat[hit]) {
    // Same colours already registered — reuse the slot (refresh the display name).
    cat[hit] = { ...cat[hit], name };
    return hit;
  }
  const row = cat.length;
  cat.push({ id: `adhoc-${_adhocSeq++}`, name, facets: computeFacets(ramp), ramp: buf, row });
  _adhocBySig.set(sig, row);
  return row;
};

/** FNV-1a over quantised channel samples — a content key for un-clipped channel sources. */
const channelsSig = (ch: Channels): string => {
  let h = 0x811c9dc5;
  const mix = (v: number) => { h ^= Math.round(v * 1000) & 0xffff; h = Math.imul(h, 0x01000193); };
  for (let i = 0; i < 256; i += 4) { mix(ch.L[i]); mix(ch.C[i]); mix(ch.h[i]); }
  return 'ch' + (h >>> 0).toString(36);
};

/**
 * Register un-clipped OKLCh channels as an ad-hoc source (the slot-bake seam). Unlike
 * registerCustomRamp this keeps the full-precision transform in `channels`; the stored
 * `ramp` is only a gamut-clamped swatch for display. The pipeline's slot read uses
 * `channels` when present, so a baked slot preserves extremes (L past [0,1], out-of-gamut
 * chroma) the same way the curve bake does. Deduped by channel content.
 */
export const registerCustomChannels = (ch: Channels, name: string): number => {
  const cat = buildPresetCatalog();
  const disp: RGB[] = new Array(256);
  const buf = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const c = Math.max(0, ch.C[i]);
    const l = Math.max(0, Math.min(1, ch.L[i]));
    const rgb = oklabToRgb({ L: l, a: c * Math.cos(ch.h[i]), b: c * Math.sin(ch.h[i]) });
    disp[i] = rgb;
    buf[i * 4] = Math.max(0, Math.min(255, Math.round(rgb.r)));
    buf[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(rgb.g)));
    buf[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(rgb.b)));
    buf[i * 4 + 3] = 255;
  }
  const channels: Channels = { L: ch.L.slice(), C: ch.C.slice(), h: ch.h.slice() };
  const sig = channelsSig(ch);
  const hit = _adhocBySig.get(sig);
  if (hit !== undefined && cat[hit]) {
    cat[hit] = { ...cat[hit], name, ramp: buf, channels };
    return hit;
  }
  const row = cat.length;
  cat.push({ id: `adhoc-${_adhocSeq++}`, name, facets: computeFacets(disp), ramp: buf, channels, row });
  _adhocBySig.set(sig, row);
  return row;
};
