/**
 * PickerStage — the Picker mode's centre stage. Loads the baked 11k gradient library
 * (pickerStore; presets fallback), reads the Picker dock controls from the
 * paletteFilters slice, and renders the carved catalog as GROUPED rows in the wall.
 *
 * Group and Sort are INDEPENDENT: rows are partitioned by the Group axis (Category /
 * Source / none) and each group is sorted within by the Sort axis (column-major in the
 * wall) — so grouping never blocks in-category sorting.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEngineStore } from '../store/engineStore';
import { usePickerStore } from '../palette/store/pickerStore';
import { passesFilters, type FilterWindows } from '../palette/core/facets';
import { applyEntryToColoring } from '../palette/core/gradientSeam';
import { GROUP_BY, ROWS_BY, SORT_BY } from '../palette/features/paletteFilters';
import type { CatalogEntry } from '../palette/core/presetCatalog';
import { PickerWall, type PickerGroup } from '../palette/components/PickerWall';

const win = (v: { x?: number; y?: number } | undefined): [number, number] => [v?.x ?? 0, v?.y ?? 1];

const sortValue = (axis: string, e: CatalogEntry): number | string => {
  switch (axis) {
    case 'lightness': return e.facets.lightness;
    case 'vividness': return e.facets.chroma;
    case 'complexity': return e.facets.complexity;
    case 'rainbow': return e.facets.rainbow;
    case 'warmth': return e.facets.warmth;
    case 'hue': return e.facets.raw.meanHue;
    case 'name': return e.name.toLowerCase();
    default: return 0;
  }
};

// Facet axes usable for the "Rows by" bucketing (Y). Category/Source handled separately.
const FACET_OF: Record<string, (e: CatalogEntry) => number> = {
  lightness: (e) => e.facets.lightness,
  vividness: (e) => e.facets.chroma,
  complexity: (e) => e.facets.complexity,
  rainbow: (e) => e.facets.rainbow,
  warmth: (e) => e.facets.warmth,
  hue: (e) => e.facets.raw.meanHue / 360, // 0..1 for bucketing
};
const ROW_BUCKETS = 10;

export const PickerStage: React.FC = () => {
  const pf = useEngineStore((s) => (s as Record<string, any>).paletteFilters) as Record<string, any> | undefined;

  const catalog = usePickerStore((s) => s.catalog);
  const loaded = usePickerStore((s) => s.loaded);
  const bundles = usePickerStore((s) => s.bundles);
  const load = usePickerStore((s) => s.load);
  useEffect(() => { load(); }, [load]);

  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  // Pick → preview + (when a fractal is present, e.g. in app-gmt) colour it via the seam.
  const onPick = useCallback((e: CatalogEntry) => {
    setSelected(e);
    applyEntryToColoring(e);
  }, []);

  // Shared 256×N sprite — each entry's `row` is its sprite row. Built once per catalog.
  const sprite = useMemo(() => {
    if (!catalog.length || typeof document === 'undefined') return null;
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = catalog.length;
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    const img = ctx.createImageData(256, catalog.length);
    for (const e of catalog) img.data.set(e.ramp, e.row * 256 * 4);
    ctx.putImageData(img, 0, 0);
    return cv;
  }, [catalog]);

  const windows: FilterWindows = {
    qL: win(pf?.qL), qC: win(pf?.qC), qCov: win(pf?.qCov), qRb: win(pf?.qRb), qWarm: win(pf?.qWarm),
  };
  const activeThemes: string[] = pf?.activeThemes ?? [];
  const hiddenBundles: string[] = pf?.hiddenBundles ?? [];
  const groupAxis = GROUP_BY[pf?.groupBy ?? 0] ?? 'none';
  const rowsAxis = ROWS_BY[pf?.rowsBy ?? 0] ?? 'none';
  const sortAxis = SORT_BY[pf?.sortBy ?? 0] ?? 'lightness';
  const reverse = !!pf?.reverse;

  const key = JSON.stringify([windows, activeThemes, hiddenBundles, groupAxis, rowsAxis, sortAxis, reverse]);
  const { groups, count } = useMemo(() => {
    const themeSet = activeThemes.length ? new Set(activeThemes) : null;
    const hiddenSet = new Set(hiddenBundles);
    const list = catalog.filter(
      (e) =>
        (!hiddenSet.size || !e.bundle || !hiddenSet.has(e.bundle)) &&
        (!themeSet || (e.theme != null && themeSet.has(e.theme))) &&
        passesFilters(e.facets, windows),
    );

    const cmp = (a: CatalogEntry, b: CatalogEntry) => {
      const sa = sortValue(sortAxis, a), sb = sortValue(sortAxis, b);
      if (typeof sa === 'string' && typeof sb === 'string') return sa.localeCompare(sb);
      return (sa as number) - (sb as number);
    };
    const finish = (arr: CatalogEntry[]) => { arr.sort(cmp); if (reverse) arr.reverse(); return arr; };

    // Within one (optional) category group, bucket into facet sub-rows. The category
    // label shows once (first sub-row); each sub-row carries its bucket sublabel.
    const buildBands = (entries: CatalogEntry[], catLabel: string, catKey: string): PickerGroup[] => {
      const fv = FACET_OF[rowsAxis];
      if (!fv) return [{ key: catKey, label: catLabel, entries: finish(entries) }];
      const map = new Map<number, CatalogEntry[]>();
      for (const e of entries) {
        const b = Math.min(ROW_BUCKETS - 1, Math.max(0, Math.floor(fv(e) * ROW_BUCKETS)));
        (map.get(b) ?? map.set(b, []).get(b)!).push(e);
      }
      const order = [...map.keys()].sort((a, b) => b - a); // most on top
      return order.map((b, i) => {
        const lo = (b / ROW_BUCKETS).toFixed(1), hi = ((b + 1) / ROW_BUCKETS).toFixed(1);
        const tail = b === ROW_BUCKETS - 1 ? ' (most)' : b === 0 ? ' (least)' : '';
        return {
          key: `${catKey}-b${b}`,
          label: i === 0 ? catLabel : '',
          // Axis word omitted — the global "Rows by" control already names the axis;
          // the gutter stays a single short line (range · count) so it fits the swatch row.
          sublabel: `${lo}–${hi}${tail}`,
          entries: finish(map.get(b)!),
        };
      });
    };

    let result: PickerGroup[];
    if (groupAxis === 'theme' || groupAxis === 'bundle') {
      const map = new Map<string, CatalogEntry[]>();
      for (const e of list) {
        const k = (groupAxis === 'theme' ? e.theme : e.bundle) ?? '—';
        (map.get(k) ?? map.set(k, []).get(k)!).push(e);
      }
      const order = [...map.keys()].sort((a, b) => map.get(b)!.length - map.get(a)!.length);
      result = order.flatMap((k) => buildBands(map.get(k)!, groupAxis === 'bundle' ? (bundles[k]?.label ?? k) : k, k));
    } else {
      result = buildBands(list, '', 'all');
    }
    return { groups: result, count: list.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, key]);

  const swatchW = Math.round(pf?.swatchSize?.x ?? 32);
  const swatchH = Math.round(pf?.swatchSize?.y ?? 18);
  const gap = Math.max(0, Math.round(pf?.paddingSize ?? 1));

  // Crisp hero: upscale the 256-px ramp to the bar's real resolution with HIGH-quality
  // bilinear smoothing (drawImage), rather than letting CSS stretch a 256×1 canvas.
  const heroRef = useRef<HTMLCanvasElement>(null);
  const heroSrcRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = heroRef.current;
    if (!cv || !selected) return;
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.max(1, Math.round((cv.clientWidth || 600) * dpr));
    const bh = Math.max(1, Math.round(40 * dpr));
    if (cv.width !== bw) cv.width = bw;
    if (cv.height !== bh) cv.height = bh;
    let src = heroSrcRef.current;
    if (!src) { src = document.createElement('canvas'); src.width = 256; src.height = 1; heroSrcRef.current = src; }
    src.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(selected.ramp), 256, 1), 0, 0);
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, bw, bh);
    ctx.drawImage(src, 0, 0, 256, 1, 0, 0, bw, bh);
  }, [selected]);

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-zinc-950">
      <div className="px-4 pt-3 pb-2 border-b border-zinc-800 shrink-0">
        {selected ? (
          <canvas ref={heroRef} className="h-10 w-full rounded-md border border-zinc-700 block" />
        ) : (
          <div className="h-10 w-full rounded-md border border-zinc-700" style={{ background: 'linear-gradient(90deg,#222,#444)' }} />
        )}
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="text-zinc-300 font-medium">
            {selected ? selected.name : 'Pick a gradient'}
            {selected?.bundle && <span className="ml-2 text-zinc-600">{selected.bundle}</span>}
          </span>
          <span className="text-zinc-500 tabular-nums">{!loaded ? 'loading…' : `${count} of ${catalog.length}`}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {!loaded ? (
          <div className="h-full flex items-center justify-center text-sm text-zinc-600">Loading gradient library…</div>
        ) : count > 0 ? (
          <PickerWall groups={groups} sprite={sprite} onPick={onPick} selectedId={selected?.id} swatchW={swatchW} swatchH={swatchH} gap={gap} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-zinc-600">
            No gradients match — widen the Quality Filters or clear theme/source toggles.
          </div>
        )}
      </div>
    </div>
  );
};

export default PickerStage;
