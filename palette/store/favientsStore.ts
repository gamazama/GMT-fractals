/**
 * favientsStore — the "Favients" shelf: a persistent collection of favourite
 * gradients shared across every GMT app (same-origin localStorage key
 * `gmt.favients`) and across sessions.
 *
 * Each favourite is stored as a GMT `GradientConfig` (stops = the interchange
 * representation), so a click / drag applies cleanly to any target — a generator
 * slot (via a 256-ramp) or a fractal coloring layer (the config directly). Ramp-only
 * sources (img2grad) get `fitRampToStops`'d into a config at favourite-time by the
 * caller, so this store never has to know about raw ramps.
 *
 * Host-agnostic: no engine-store dependency. Apps register their apply targets in
 * the send-target registry; this store only holds the collection + the chosen target id.
 */

import { create } from 'zustand';
import type { GradientConfig } from '../../types';
import { lsGet, lsSet, lsRemove, lsGetJson, lsSetJson } from '../core/storage';

export interface Favient {
  id: string;
  name: string;
  /** Provenance label, e.g. "Generator", "Image · distill", "Picker · Turbo". */
  source?: string;
  config: GradientConfig;
  createdAt: number;
  /** Group id this favourite belongs to. '' / undefined = the default (top) group,
   *  which has no divider. Named groups get an editable divider (groupLabels). */
  group?: string;
}

/** The default (un-divided) group id. */
export const DEFAULT_GROUP = '';

const LS_KEY = 'gmt.favients';
const LS_TARGET = 'gmt.favients.target';
const LS_GROUPS = 'gmt.favients.groups';
const LS_SEEDED = 'gmt.favients.seeded';

/**
 * Strict well-formedness gate for a favourite. Beyond "has a stops array", it
 * requires every stop to carry a string `color` and finite numeric `position`.
 *
 * This is a deserialization defense, not mere schema-drift tolerance: favients
 * now arrive from untrusted shared scene files (W8 document restore → this
 * store's importCollection), and `favientSig` (the dedupe signature) assumes
 * `stop.color` is a string. A favourite with a malformed stop that slipped
 * through would make `favientSig` throw — and because that signature is computed
 * on every dedupe check and on load, one bad entry persisted to
 * localStorage would brick the shelf across sessions. Filtering here (used by
 * BOTH load and import) keeps malformed stops out of memory and disk entirely.
 */
const isWellFormedFavient = (f: unknown): f is Favient => {
  if (!f || typeof f !== 'object') return false;
  const fav = f as Favient;
  if (typeof fav.id !== 'string' || !fav.config || !Array.isArray(fav.config.stops)) return false;
  return fav.config.stops.every(
    (s) => !!s && typeof s === 'object' && typeof (s as { color?: unknown }).color === 'string' && Number.isFinite((s as { position?: unknown }).position),
  );
};

const loadFavients = (): Favient[] => {
  const arr = lsGetJson<unknown[]>(LS_KEY, []);
  if (!Array.isArray(arr)) return [];
  return arr.filter(isWellFormedFavient);
};

const saveFavients = (favients: Favient[]): void => lsSetJson(LS_KEY, favients);

const loadTarget = (): string | null => lsGet(LS_TARGET);

const saveTarget = (id: string | null): void => {
  if (id) lsSet(LS_TARGET, id);
  else lsRemove(LS_TARGET);
};

const loadGroupLabels = (): Record<string, string> => {
  const m = lsGetJson<Record<string, string>>(LS_GROUPS, {});
  return m && typeof m === 'object' ? m : {};
};

const saveGroupLabels = (m: Record<string, string>): void => lsSetJson(LS_GROUPS, m);

/** Keys that must never be written via bracket assignment — `out['__proto__'] = …`
 *  invokes the prototype setter rather than creating an own property. Group ids
 *  arrive from untrusted scene files (W8 import), so skip them defensively. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Drop labels for groups that no longer have any favourites. */
const pruneLabels = (favients: Favient[], labels: Record<string, string>): Record<string, string> => {
  const used = new Set(favients.map((f) => f.group ?? DEFAULT_GROUP));
  const out: Record<string, string> = {};
  for (const k of Object.keys(labels)) if (used.has(k) && !UNSAFE_KEYS.has(k)) out[k] = labels[k];
  return out;
};

const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);

/**
 * Content signature for dedupe: rounded stop positions + colours + interpolation.
 * Two gradients with the same stops are treated as the same favourite.
 */
export const favientSig = (c: GradientConfig): string =>
  (Array.isArray(c?.stops) ? c.stops : [])
    // Coerce defensively — favientSig runs on untrusted imported configs (W8
    // scene restore) and on every dedupe check, so it must never throw on a
    // malformed stop. A malformed stop just yields a non-matching signature.
    .map((s) => `${Math.round((Number(s?.position) || 0) * 1000)}:${String(s?.color).toUpperCase()}:${s?.interpolation ?? 'l'}`)
    .join('|');

let _seq = 0;
const newId = (): string => `fav-${Date.now().toString(36)}-${_seq++}`;
let _groupSeq = 0;
/** Generate a fresh group id (collision-safe across reloads via the timestamp). */
export const newGroupId = (): string => `grp-${Date.now().toString(36)}-${_groupSeq++}`;

interface FavientsState {
  favients: Favient[];
  /** Editable labels for named groups (id → label). */
  groupLabels: Record<string, string>;
  /** The currently selected apply target (id into the send-target registry). */
  selectedTargetId: string | null;

  add: (config: GradientConfig, name: string, source?: string) => string;
  remove: (id: string) => void;
  /** Content-presence query (used by the gradient-file import to skip duplicates). */
  isFav: (config: GradientConfig) => boolean;
  rename: (id: string, name: string) => void;
  /** Move an existing favourite so it lands at `toIndex` in the array WITH this item
   *  REMOVED (i.e. the insertion index in the list as rendered without the dragged
   *  swatch), and set its group. The caller keeps (toIndex, group) contiguous. */
  moveFavient: (id: string, toIndex: number, group: string) => void;
  /** Insert a NEW favourite (from an external drag) at flat index `toIndex` in `group`. */
  insertFavient: (config: GradientConfig, name: string, source: string | undefined, toIndex: number, group: string) => string;
  /** Rename a group's divider label. */
  renameGroup: (groupId: string, label: string) => void;
  /** One-time seed of starter favourites into a named group (e.g. the built-in
   *  presets). No-op after the first ever call (flagged in localStorage), so the
   *  user's edits/deletions are never overwritten. */
  seedPresets: (entries: { name: string; config: GradientConfig }[], group: string, label: string) => void;
  clear: () => void;
  setSelectedTarget: (id: string | null) => void;
  /** Serialize the whole collection (favourites + group labels) to a portable
   *  JSON string — the backup/share file written by the panel's "Save". */
  exportCollection: () => string;
  /** Load a collection JSON. 'replace' overwrites the current collection;
   *  'merge' appends entries whose gradient isn't already present (by content
   *  signature), keeping existing group labels on conflict. Returns how many
   *  favourites were added (merge) or set (replace), or null if the file was
   *  unreadable / not a collection. */
  importCollection: (json: string, mode: 'merge' | 'replace') => number | null;
}

/** On-disk shape of an exported collection. */
export interface FavientsCollection {
  version: 1;
  favients: Favient[];
  groupLabels: Record<string, string>;
}

const COLLECTION_VERSION = 1 as const;

/** Keep only well-formed favourites (shared strict guard — see isWellFormedFavient). */
const validFavients = (arr: unknown): Favient[] =>
  Array.isArray(arr) ? arr.filter(isWellFormedFavient) : [];

/**
 * Read the valid favourites out of a parsed collection object (the same gate
 * `importCollection` applies). Lets callers preview what an import WOULD admit
 * — e.g. the scene-restore prompt counting new-vs-duplicate gradients — without
 * mutating anything. Returns [] for any non-collection / malformed input.
 */
export const readCollectionFavients = (raw: unknown): Favient[] =>
  validFavients((raw as { favients?: unknown } | null)?.favients);

export const useFavientsStore = create<FavientsState>((set, get) => ({
  favients: loadFavients(),
  groupLabels: loadGroupLabels(),
  selectedTargetId: loadTarget(),

  add: (config, name, source) => {
    const fav: Favient = { id: newId(), name, source, config, createdAt: Date.now(), group: DEFAULT_GROUP };
    const favients = [fav, ...get().favients];
    saveFavients(favients);
    set({ favients });
    return fav.id;
  },

  remove: (id) => {
    const favients = get().favients.filter((f) => f.id !== id);
    const groupLabels = pruneLabels(favients, get().groupLabels);
    saveFavients(favients);
    saveGroupLabels(groupLabels);
    set({ favients, groupLabels });
  },

  isFav: (config) => {
    const sig = favientSig(config);
    return get().favients.some((f) => favientSig(f.config) === sig);
  },

  rename: (id, name) => {
    const favients = get().favients.map((f) => (f.id === id ? { ...f, name } : f));
    saveFavients(favients);
    set({ favients });
  },

  moveFavient: (id, toIndex, group) => {
    const arr = [...get().favients];
    const from = arr.findIndex((f) => f.id === id);
    if (from < 0) return;
    const [moved] = arr.splice(from, 1);
    // toIndex is already expressed against the array with `moved` removed.
    arr.splice(clamp(toIndex, 0, arr.length), 0, { ...moved, group });
    const groupLabels = pruneLabels(arr, get().groupLabels);
    saveFavients(arr);
    saveGroupLabels(groupLabels);
    set({ favients: arr, groupLabels });
  },

  insertFavient: (config, name, source, toIndex, group) => {
    const fav: Favient = { id: newId(), name, source, config, createdAt: Date.now(), group };
    const arr = [...get().favients];
    arr.splice(clamp(toIndex, 0, arr.length), 0, fav);
    saveFavients(arr);
    set({ favients: arr });
    return fav.id;
  },

  renameGroup: (groupId, label) => {
    const groupLabels = { ...get().groupLabels, [groupId]: label };
    saveGroupLabels(groupLabels);
    set({ groupLabels });
  },

  seedPresets: (entries, group, label) => {
    if (lsGet(LS_SEEDED)) return;
    const favs: Favient[] = entries.map((e) => ({
      id: newId(),
      name: e.name,
      source: 'Preset',
      config: e.config,
      createdAt: Date.now(),
      group,
    }));
    const favients = [...get().favients, ...favs];
    const groupLabels = { ...get().groupLabels, [group]: label };
    saveFavients(favients);
    saveGroupLabels(groupLabels);
    lsSet(LS_SEEDED, '1');
    set({ favients, groupLabels });
  },

  clear: () => {
    saveFavients([]);
    saveGroupLabels({});
    set({ favients: [], groupLabels: {} });
  },

  setSelectedTarget: (id) => {
    saveTarget(id);
    set({ selectedTargetId: id });
  },

  exportCollection: () => {
    const { favients, groupLabels } = get();
    const payload: FavientsCollection = { version: COLLECTION_VERSION, favients, groupLabels };
    return JSON.stringify(payload, null, 2);
  },

  importCollection: (json, mode) => {
    let parsed: Partial<FavientsCollection>;
    try {
      parsed = JSON.parse(json) as Partial<FavientsCollection>;
    } catch {
      return null;
    }
    // A collection file must carry a favients array (even if empty). Reject
    // anything that doesn't look like one so a stray JSON doesn't wipe the shelf.
    // Optional-chaining covers null/primitive parses (JSON "null", "5", etc.).
    if (!Array.isArray(parsed?.favients)) return null;
    const incoming = validFavients(parsed.favients);
    const incomingLabels = parsed.groupLabels && typeof parsed.groupLabels === 'object' ? parsed.groupLabels : {};

    if (mode === 'replace') {
      // Fresh ids so re-importing the same file twice can't collide with itself.
      const favients = incoming.map((f) => ({ ...f, id: newId() }));
      const groupLabels = pruneLabels(favients, { ...incomingLabels });
      saveFavients(favients);
      saveGroupLabels(groupLabels);
      set({ favients, groupLabels });
      return favients.length;
    }

    // merge: skip favourites already present by content signature; fresh ids for the rest.
    const have = new Set(get().favients.map((f) => favientSig(f.config)));
    const fresh = incoming.filter((f) => !have.has(favientSig(f.config))).map((f) => ({ ...f, id: newId() }));
    const favients = [...get().favients, ...fresh];
    // Existing labels win on conflict; imported labels fill in new groups.
    const groupLabels = pruneLabels(favients, { ...incomingLabels, ...get().groupLabels });
    saveFavients(favients);
    saveGroupLabels(groupLabels);
    set({ favients, groupLabels });
    return fresh.length;
  },
}));

/**
 * History-provider snapshot for the favients shelf (W5 undo). Registered in
 * registerPaletteUI as a PARAM-undo provider, so favourite mutations bracketed at
 * the panel gesture boundary (remove, drag reorder/insert, group rename, kebab
 * Clear, collection load, and the gradient-file Import) ride Ctrl+Z.
 *
 * `selectedTargetId` is intentionally EXCLUDED — it's a transient apply-target
 * preference, not collection content, and shouldn't be churned by undo. The boot
 * `seedPresets` effect is one-time and never snapshotted.
 */
export const captureFavientsHistory = (): { favients: Favient[]; groupLabels: Record<string, string> } => {
  const s = useFavientsStore.getState();
  return { favients: s.favients, groupLabels: s.groupLabels };
};

/**
 * Restore a favients snapshot. The collection lives ONLY in this store +
 * localStorage (no engine-store mirror), so an undo/redo must write THROUGH to
 * disk (saveFavients/saveGroupLabels) as well as the store — otherwise the next
 * reload would re-read the pre-undo collection from `gmt.favients` and the shelf
 * would diverge from what undo just showed.
 */
export const restoreFavientsHistory = (snap: unknown): void => {
  const s = snap as { favients?: unknown; groupLabels?: unknown } | null;
  if (!s || !Array.isArray(s.favients)) return;
  const favients = s.favients as Favient[];
  const groupLabels = s.groupLabels && typeof s.groupLabels === 'object' ? (s.groupLabels as Record<string, string>) : {};
  saveFavients(favients);
  saveGroupLabels(groupLabels);
  useFavientsStore.setState({ favients, groupLabels });
};
