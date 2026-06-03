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
import type { RGB } from './oklab';

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
  /** 256×1 RGBA pixels for the swatch (the wall blits this). */
  ramp: Uint8Array;
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

/**
 * Register an arbitrary 256-step RGB ramp as an ad-hoc catalog entry and return its
 * index. This is the "slot-custom-RGB" seam: slots are normally catalog indices, but
 * an extracted (img2grad) or generated gradient isn't in the catalog — so we append
 * it here as a first-class CatalogEntry (no `stops`, only a `ramp`), making it
 * visible to both the source picker and `presetRamp()` via the returned index.
 *
 * Entries with the same `name` are REPLACED in place (one slot per repeated send,
 * so the catalog doesn't grow unbounded as the user re-sends from the Image tab).
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
  const facets = computeFacets(ramp);
  const existing = cat.findIndex((e) => e.id.startsWith('adhoc-') && e.name === name);
  if (existing >= 0) {
    cat[existing] = { ...cat[existing], facets, ramp: buf, stops: undefined };
    return existing;
  }
  const row = cat.length;
  cat.push({ id: `adhoc-${_adhocSeq++}`, name, facets, ramp: buf, row });
  return row;
};
