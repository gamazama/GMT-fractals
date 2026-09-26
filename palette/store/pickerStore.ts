/**
 * pickerStore — shared loaded-catalog state for the Picker. The center stage AND the
 * dock controls (theme chips, bundle toggles) all read the same catalog from here, so
 * the loaded data lives in one place (the per-control SELECTION state lives in the
 * paletteFilters DDFS slice instead — see paletteFilters.ts).
 *
 * The library is split into separable bundle GROUPS (catalogLoader.PALETTE_GROUPS): `core`
 * loads on start; `softology` / `cptcity` / `elvensword` and the OPTIONAL pack (noncommercial)
 * are lazy — fetched when their source toggle is switched on, dropped when switched off. A host may turn the lazy ones on at boot; no host may turn on an optional one.
 *
 * LIVE SOURCES (catalogLoader.registerLiveSource — GX Global) load through the same
 * `setGroupLoaded`, after the packs in catalogue order. Their entries are COPIED before `row` is
 * reassigned, because the source may hand out objects another view also holds (GX Global's come
 * from `groundSets.favientsToEntries`, whose bodies are cached and drawn by the set ground with
 * their own rows). A live load that yields nothing lands in `failedGroups` and stays there for
 * the session; a loaded live source re-loads when it says its content changed.
 * Each merge/unmerge rebuilds `catalog` (concatenated in group order) and REASSIGNS
 * every entry's `row` to its index in the merged set, so the shared sprite stays packed
 * (the wall rebuilds the sprite from `row` whenever `catalog` changes).
 */

import { create } from 'zustand';
import {
  loadGroup,
  getCatalogBundles,
  getBundleCounts,
  getCatalogCollections,
  PALETTE_GROUPS,
  getLiveSources,
  liveSourceOf,
  type BundleInfo,
  type CollectionInfo,
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
  /** Collections (archive / package / family) of every LOADED v2 pack, keyed `<bundle>:<src>`. */
  collections: Record<string, CollectionInfo>;
  /** Currently-merged group ids. */
  loadedGroups: string[];
  /** Group ids with a fetch in flight (for the toggle spinner). */
  loadingGroups: string[];
  /** Live sources whose load yielded nothing this session (their toggle is disabled). */
  failedGroups: string[];
  load: () => void;
  /** Lazy load / unload a licensed group when its source toggle flips. */
  setGroupLoaded: (groupId: string, on: boolean) => void;
}

/** Themes whose chip should read as a full rainbow rather than one colour. */
export const MULTI_HUE_THEMES = new Set(['rainbow', 'spectral', 'kaleidoscope', 'prismatic']);

let _started = false;
// Entries per loaded group; the merged `catalog` is rebuilt from these in group order.
const _groups: Record<string, CatalogEntry[]> = {};
/** Entry counts of loaded live sources (baked packs carry theirs in the files). */
const _liveCounts: Record<string, number> = {};
const _liveUnsub: Record<string, () => void> = {};
const liveInfos = (): Record<string, BundleInfo> => Object.fromEntries(getLiveSources().map((s) => [s.id, s.info]));

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
  const order = [...PALETTE_GROUPS.map((g) => g.id), ...getLiveSources().map((s) => s.id)].filter((id) => _groups[id]);
  const catalog: CatalogEntry[] = [];
  for (const id of order) for (const e of _groups[id]) catalog.push(e);
  catalog.forEach((e, i) => { e.row = i; });
  return {
    catalog,
    loadedGroups: order,
    bundles: { ...getCatalogBundles(), ...liveInfos() },
    bundleCounts: { ...getBundleCounts(), ..._liveCounts },
    collections: getCatalogCollections(),
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
  collections: {},
  loadedGroups: [],
  loadingGroups: [],
  failedGroups: [],

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
    const live = liveSourceOf(groupId);
    if (live) {
      if (!on) {
        if (!_groups[groupId]) return;
        delete _groups[groupId];
        delete _liveCounts[groupId];
        _liveUnsub[groupId]?.();
        delete _liveUnsub[groupId];
        set(rebuild());
        return;
      }
      if (_groups[groupId] || get().loadingGroups.includes(groupId) || get().failedGroups.includes(groupId)) return;
      set((s) => ({ loadingGroups: [...s.loadingGroups, groupId] }));
      const take = (entries: CatalogEntry[]): boolean => {
        if (!entries.length) return false;
        _groups[groupId] = entries.map((e) => ({ ...e, bundle: groupId }));
        _liveCounts[groupId] = entries.length;
        return true;
      };
      live.load()
        .catch(() => [] as CatalogEntry[])
        .then((entries) => {
          if (!take(entries)) {
            set((s) => ({ loadingGroups: s.loadingGroups.filter((g) => g !== groupId), failedGroups: [...s.failedGroups, groupId] }));
            return;
          }
          if (live.subscribe && !_liveUnsub[groupId])
            _liveUnsub[groupId] = live.subscribe(() => {
              if (!_groups[groupId]) return;
              void live.load().catch(() => [] as CatalogEntry[]).then((next) => { if (_groups[groupId] && take(next)) set(rebuild()); });
            });
          set((s) => ({ loadingGroups: s.loadingGroups.filter((g) => g !== groupId), ...rebuild() }));
        });
      return;
    }
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
