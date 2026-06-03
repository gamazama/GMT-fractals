/**
 * pickerStore — shared loaded-catalog state for the Picker. The center stage AND the
 * dock controls (theme chips, bundle toggles) all read the same catalog from here, so
 * the loaded data lives in one place (the per-control SELECTION state lives in the
 * paletteFilters DDFS slice instead — see paletteFilters.ts).
 *
 * The library is split into separable bundle GROUPS (catalogLoader.PALETTE_GROUPS): the
 * clean `core` loads on start; the licence-encumbered `softology` / `cptcity` groups are
 * lazy — fetched when their source toggle is switched on, dropped when switched off.
 * Each merge/unmerge rebuilds `catalog` (concatenated in group order) and REASSIGNS
 * every entry's `row` to its index in the merged set, so the shared sprite stays packed
 * (PickerStage rebuilds the sprite from `row` whenever `catalog` changes).
 */

import { create } from 'zustand';
import {
  loadGroup,
  getCatalogBundles,
  getBundleCounts,
  PALETTE_GROUPS,
  type BundleInfo,
} from '../core/catalogLoader';
import { buildPresetCatalog, type CatalogEntry } from '../core/presetCatalog';

interface PickerStore {
  catalog: CatalogEntry[];
  /** Core groups have loaded (the wall can render). */
  loaded: boolean;
  usingFallback: boolean;
  themes: { theme: string; count: number }[];
  /** Representative mid-colour per theme [r,g,b] for chip tints. */
  themeColors: Record<string, [number, number, number]>;
  /** Full bundle manifest (all sources, even ones whose group isn't loaded yet). */
  bundles: Record<string, BundleInfo>;
  /** Baked survivor count per source bundle (all bundles) — for the toggle UI. */
  bundleCounts: Record<string, number>;
  /** Currently-merged group ids. */
  loadedGroups: string[];
  /** Group ids with a fetch in flight (for the toggle spinner). */
  loadingGroups: string[];
  load: () => void;
  /** Lazy load / unload a licensed group when its source toggle flips. */
  setGroupLoaded: (groupId: string, on: boolean) => void;
}

/** Themes whose chip should read as a full rainbow rather than one colour. */
export const MULTI_HUE_THEMES = new Set(['rainbow', 'spectral', 'kaleidoscope', 'prismatic']);

let _started = false;
// Entries per loaded group; the merged `catalog` is rebuilt from these in group order.
const _groups: Record<string, CatalogEntry[]> = {};

const deriveThemes = (cat: CatalogEntry[]) => {
  const themeCount: Record<string, number> = {};
  const colSum: Record<string, [number, number, number]> = {};
  for (const e of cat) {
    if (e.theme) {
      themeCount[e.theme] = (themeCount[e.theme] ?? 0) + 1;
      const s = (colSum[e.theme] ??= [0, 0, 0]);
      s[0] += e.ramp[128 * 4]; // mid-colour
      s[1] += e.ramp[128 * 4 + 1];
      s[2] += e.ramp[128 * 4 + 2];
    }
  }
  const themes = Object.entries(themeCount)
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count);
  const themeColors: Record<string, [number, number, number]> = {};
  for (const [theme, n] of Object.entries(themeCount)) {
    const s = colSum[theme];
    themeColors[theme] = [Math.round(s[0] / n), Math.round(s[1] / n), Math.round(s[2] / n)];
  }
  return { themes, themeColors };
};

/** Concatenate loaded groups (in registry order), repack `row`, re-derive theme chips. */
const rebuild = () => {
  const order = PALETTE_GROUPS.map((g) => g.id).filter((id) => _groups[id]);
  const catalog: CatalogEntry[] = [];
  for (const id of order) for (const e of _groups[id]) catalog.push(e);
  catalog.forEach((e, i) => { e.row = i; });
  return {
    catalog,
    loadedGroups: order,
    bundles: getCatalogBundles(),
    bundleCounts: getBundleCounts(),
    ...deriveThemes(catalog),
  };
};

export const usePickerStore = create<PickerStore>((set, get) => ({
  catalog: [],
  loaded: false,
  usingFallback: false,
  themes: [],
  themeColors: {},
  bundles: {},
  bundleCounts: {},
  loadedGroups: [],
  loadingGroups: [],

  load: () => {
    if (_started) return;
    _started = true;
    const coreIds = PALETTE_GROUPS.filter((g) => g.core).map((g) => g.id);
    Promise.all(coreIds.map((id) => loadGroup(id).then((cat) => { _groups[id] = cat; })))
      .then(() => set({ loaded: true, ...rebuild() }))
      .catch((err) => {
        console.warn('[pickerStore] core catalog load failed, using built-in presets', err);
        const cat = buildPresetCatalog();
        const { themes, themeColors } = deriveThemes(cat);
        set({ catalog: cat, loaded: true, usingFallback: true, themes, themeColors });
      });
  },

  setGroupLoaded: (groupId, on) => {
    if (on) {
      if (_groups[groupId] || get().loadingGroups.includes(groupId)) return;
      set((s) => ({ loadingGroups: [...s.loadingGroups, groupId] }));
      loadGroup(groupId)
        .then((cat) => {
          _groups[groupId] = cat;
          set((s) => ({ loadingGroups: s.loadingGroups.filter((g) => g !== groupId), ...rebuild() }));
        })
        .catch((err) => {
          console.warn(`[pickerStore] group "${groupId}" load failed`, err);
          set((s) => ({ loadingGroups: s.loadingGroups.filter((g) => g !== groupId) }));
        });
    } else {
      if (!_groups[groupId]) return;
      delete _groups[groupId];
      set(rebuild());
    }
  },
}));
