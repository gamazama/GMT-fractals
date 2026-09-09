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
 *
 * ── Groups, and the one auto-managed group ────────────────────────────────────
 * Group ORDER is implicit in the flat `favients` array: a group is a CONTIGUOUS
 * RUN, because FavientsPanel's `buildBlocks` starts a new block whenever `f.group`
 * changes. Two non-adjacent runs carrying the same group id therefore render as two
 * blocks with the same divider — which is why every insert here lands inside the
 * target group's existing run rather than at a convenient array end.
 *
 * All groups are user-made EXCEPT `RECENT_GROUP`, which the app fills for the user:
 * `collectRecent` is called when a gradient becomes the working gradient, is
 * exported / shared / sent to wallpaper, or is starred — never on a mere wall click.
 * It is deduped by `favientSig`, capped at `RECENT_CAP`, and it owns the front of
 * the array (index 0). Organising is optional: named groups sit beside Recent and
 * the user drags out of Recent into them. A gradient the user has already filed in
 * a named group is never re-collected, and a user `add()` never lands in Recent.
 * Its divider is not renamable (FavientsPanel renders a static label for it).
 *
 * ── The collection is SHARED ACROSS HOSTS ─────────────────────────────────────
 * `gmt.favients` is one same-origin key read and written by app-gmt, fluid-toy and
 * the Gradient Explorer alike (only the PANEL window state is split per host, by
 * `installFavients`' `storageKey`). So the Recent group is not an Explorer-local
 * convenience: whatever any host collects appears in EVERY host's shelf, live —
 * the `storage` listener at the bottom of this file propagates it without a reload.
 */

import { create } from 'zustand';
import type { GradientConfig } from '../../types';
import { lsGet, lsSet, lsRemove, lsGetJson, lsSetJson } from '../core/storage';
import { clamp } from '../../utils/stopOps';

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

/** The auto-collected group id. Not user-made: filled by `collectRecent`, capped at
 *  `RECENT_CAP`, pinned to the front of the array, and its divider is not renamable. */
export const RECENT_GROUP = 'g-recent';
/** Divider label for RECENT_GROUP. Re-asserted on every collect (pruneLabels drops it
 *  whenever the group empties out), and never routed through `uniqueGroupLabel`. */
export const RECENT_LABEL = 'Recent';
/** How many auto-collected favourites the Recent run keeps. Oldest fall off the tail. */
export const RECENT_CAP = 60;
/** The one-time seeded starter group (registerPaletteUI). The v2 strip hides it while
 *  Recent has anything in it; the full panel always shows it. */
export const PRESETS_GROUP = 'g-presets';

/** True for the auto-managed Recent group. Undefined / '' is the default group, not Recent. */
export const isRecentGroup = (id?: string): boolean => id === RECENT_GROUP;

const LS_KEY = 'gmt.favients';
const LS_TARGET = 'gmt.favients.target';
const LS_GROUPS = 'gmt.favients.groups';
const LS_SEEDED = 'gmt.favients.seeded';
const LS_LASTGROUP = 'gmt.favients.lastgroup';

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

/** The last group a favourite was created in / inserted/moved into — the landing group
 *  for a plain `add()` so a new favourite joins the group you were last working in
 *  (not always the default top group). Defaults to DEFAULT_GROUP. */
const loadLastGroup = (): string => lsGet(LS_LASTGROUP) ?? DEFAULT_GROUP;
const saveLastGroup = (id: string): void => lsSet(LS_LASTGROUP, id);

/** Keys that must never be written via bracket assignment — `out['__proto__'] = …`
 *  invokes the prototype setter rather than creating an own property. Group ids
 *  arrive from untrusted scene files (W8 import), so skip them defensively. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Index just past the LEADING Recent run — 0 when the array does not start with one.
 *  Recent owns the front of the array, so a default-group insert has to land after it
 *  (otherwise the first user save would push Recent off index 0 and the next collect
 *  would visibly shuffle that save back down under the divider). */
const recentRunEnd = (favients: Favient[]): number => {
  let i = 0;
  while (i < favients.length && isRecentGroup(favients[i].group)) i++;
  return i;
};

/** Drop labels for groups that no longer have any favourites. */
const pruneLabels = (favients: Favient[], labels: Record<string, string>): Record<string, string> => {
  const used = new Set(favients.map((f) => f.group ?? DEFAULT_GROUP));
  const out: Record<string, string> = {};
  for (const k of Object.keys(labels)) if (used.has(k) && !UNSAFE_KEYS.has(k)) out[k] = labels[k];
  return out;
};


/** Disambiguate a group label against the OTHER groups' labels (case-insensitive,
 *  trimmed) so two dividers can't read identically — appends " 2", " 3", … until
 *  free. An empty label (clears the divider name) is returned as-is. */
const uniqueGroupLabel = (label: string, selfId: string, labels: Record<string, string>): string => {
  const want = label.trim();
  if (!want) return want;
  const taken = new Set(
    Object.entries(labels)
      .filter(([id]) => id !== selfId)
      .map(([, l]) => l.trim().toLowerCase()),
  );
  if (!taken.has(want.toLowerCase())) return want;
  let n = 2;
  let candidate = `${want} ${n}`;
  while (taken.has(candidate.toLowerCase())) candidate = `${want} ${++n}`;
  return candidate;
};

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
  /** Last group a favourite was created in / inserted/moved into — the landing group
   *  for a plain `add()`. Transient landing preference (like selectedTargetId): persisted
   *  to localStorage but EXCLUDED from undo history. */
  lastGroupId: string;

  add: (config: GradientConfig, name: string, source?: string) => string;
  /**
   * Auto-collect a gradient into the Recent group — the "My Gradients fills itself"
   * path. Call it when a gradient BECOMES the working gradient, or is exported /
   * shared / sent to wallpaper / starred. Do NOT call it on a picker-wall click:
   * browsing is not keeping.
   *
   * Returns the Recent favourite's id, or `null` when the gradient is already filed
   * in a non-Recent group (the user has kept it deliberately; nothing changes).
   * Idempotent by `favientSig` — re-collecting promotes the existing entry to the
   * front of the run instead of duplicating it. Undo is NOT bracketed here; a caller
   * that wants the collect on the undo stack brackets it itself.
   */
  /** `fresh`: open a NEW Recent entry even if one with this signature exists (entering a
   *  source — the Image again, a Mix — is a new piece of work; owner, 2026-09-07: "bringing
   *  the image back as the source should also create a new item in the bin"). Without it the
   *  matching entry is promoted to the head, which is right for a re-pick. */
  collectRecent: (config: GradientConfig, name: string, source?: string, opts?: { fresh?: boolean }) => string | null;
  /**
   * Refresh a Recent entry IN PLACE — the v2 working session (owner, 2026-09-03: the bin
   * "should be updating the gradient whenever the user modifies it"). Returns false when
   * `id` is no longer a Recent entry (removed, or dragged into a user group — that IS
   * keeping it, so it is left alone), which tells the caller to start a new one. Same
   * content and name → true with no write. Any OTHER Recent entry already holding the new
   * content is dropped, so the run stays one-per-gradient.
   */
  updateRecent: (id: string, config: GradientConfig, name: string) => boolean;
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
  /**
   * File MANY gradients into a group in one write (GE v2 Phase D: "Keep these N" saves a
   * narrowed wall as a group). They join the START of the group's run in the given order,
   * or the tail of the shelf when the group is new; `label` names a new group (made unique
   * against the others, as `renameGroup` does) and is ignored for one that already has
   * one. Content already in that group is skipped. Returns the ids filed. Undo is NOT
   * bracketed here — the caller wraps it, as every panel gesture does.
   */
  insertMany: (items: { config: GradientConfig; name: string; source?: string }[], group: string, label?: string) => string[];
  /**
   * Replace the whole shelf array in ONE write, and set the landing group. The batched
   * primitive behind a multi-item move (`fileFavientsAt`): moving six favourites through
   * six `moveFavient` calls is six localStorage writes and six store notifications, and
   * each one resolves its index against the array the last one just changed. The caller is
   * responsible for the array being well-formed — it is expected to be a permutation of
   * the current one, with groups reassigned.
   */
  replaceAll: (favients: Favient[], lastGroupId?: string) => void;
  /** Rename a group's divider label. */
  renameGroup: (groupId: string, label: string) => void;
  /**
   * Remove a named group. Its favourites are NOT deleted — they move to the default
   * group (Kept), joining the head of its run, and the label goes. Deleting a container
   * must not silently delete what is in it: removing a gradient is its own gesture
   * (`remove`), and the rail's menu says how many will be re-homed before you agree.
   * No-op on the default group, on Recent and on an unknown id. Returns how many moved.
   */
  removeGroup: (groupId: string) => number;
  /** One-time seed of starter favourites into a named group (e.g. the built-in
   *  presets). No-op after the first ever call (flagged in localStorage), so the
   *  user's edits/deletions are never overwritten. */
  seedPresets: (entries: { name: string; config: GradientConfig }[], group: string, label: string) => void;
  clear: () => void;
  setSelectedTarget: (id: string | null) => void;
  /** Re-read the SHARED shelf content (favourites + group labels) from localStorage into
   *  memory. The collection is same-origin-shared across every GMT app (key `gmt.favients`),
   *  but each app reads it only at boot — so a favourite saved in another app/tab wouldn't
   *  show here without a reload. The cross-tab `storage` listener (below) and the panel's
   *  refresh-on-focus both call this so other apps' edits appear immediately. Only the
   *  collection syncs; transient per-app prefs (selectedTargetId, lastGroupId) stay local.
   *  No-ops when the on-disk content matches memory, so it never churns renders or clobbers
   *  an in-flight local edit with an identical reload. */
  reloadFromStorage: () => void;
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
  lastGroupId: loadLastGroup(),

  add: (config, name, source) => {
    // Land in the last-used group — but fall back to the default if it has since vanished
    // (group deleted / its only favourites removed) so we never resurrect an orphan group.
    const lg = get().lastGroupId;
    const present =
      lg === DEFAULT_GROUP ||
      !!get().groupLabels[lg] ||
      get().favients.some((f) => (f.group ?? DEFAULT_GROUP) === lg);
    // Never land a deliberate user save in Recent. lastGroupId can only BE Recent if the
    // user dragged a favourite into the Recent run (moveFavient writes lastGroupId), and
    // Recent is auto-managed churn — a save parked there would silently fall off the cap.
    const group = present && !isRecentGroup(lg) ? lg : DEFAULT_GROUP;
    const fav: Favient = { id: newId(), name, source, config, createdAt: Date.now(), group };
    const favients = [...get().favients];
    // Insert at the START of the target group's contiguous run so the new favourite
    // JOINS that group. Prepending to index 0 would split a mid-list group into two
    // separate blocks with the same divider (buildBlocks groups by contiguous runs) —
    // i.e. a visually "duplicated" group. For a not-yet-populated named group the end is
    // the natural spot; for an empty default group it is the front, EXCEPT that Recent
    // owns index 0, so skip past its run.
    const firstInGroup = favients.findIndex((f) => (f.group ?? DEFAULT_GROUP) === group);
    const at =
      firstInGroup >= 0 ? firstInGroup : group === DEFAULT_GROUP ? recentRunEnd(favients) : favients.length;
    favients.splice(at, 0, fav);
    saveFavients(favients);
    saveLastGroup(group);
    set({ favients, lastGroupId: group });
    return fav.id;
  },

  /**
   * @invariant After collectRecent, the Recent favourites form ONE contiguous run
   *   starting at array index 0 — so FavientsPanel's `buildBlocks` (which opens a new
   *   block on every `group` change) renders Recent as a single divider at the top,
   *   never as two blocks reading "Recent" twice.
   *   — proven by: `npx tsx debug/test-palette-favients.mts`
   *     ("the Recent run is one contiguous block at index 0")
   *   Falsified 2026-09-03 by emitting `[...rest, ...run]` instead of `[...run, ...rest]`.
   */
  collectRecent: (config, name, source, opts) => {
    const sig = favientSig(config);
    const cur = get().favients;

    // Already filed somewhere the user chose — that IS keeping it. Leave everything alone
    // rather than minting a Recent shadow copy of a gradient already on the shelf.
    if (cur.some((f) => !isRecentGroup(f.group) && favientSig(f.config) === sig)) return null;

    // Partition, don't splice: this also CONSOLIDATES any stray Recent entries that ended
    // up mid-array (an import, or a drag that landed a favourite back in), preserving their
    // relative order, so the run is contiguous at 0 by construction rather than by luck.
    const recent = cur.filter((f) => isRecentGroup(f.group));
    const rest = cur.filter((f) => !isRecentGroup(f.group));

    const at = opts?.fresh ? -1 : recent.findIndex((f) => favientSig(f.config) === sig);
    const head: Favient =
      at >= 0
        ? { ...recent[at], createdAt: Date.now() }
        : { id: newId(), name, source, config, createdAt: Date.now(), group: RECENT_GROUP };
    const tail = at >= 0 ? recent.filter((_, i) => i !== at) : recent;

    // Newest first, oldest off the tail.
    const run = [head, ...tail].slice(0, RECENT_CAP);
    const favients = [...run, ...rest];
    // Re-assert the label unconditionally: pruneLabels drops it the moment the run empties
    // (last item removed / dragged out), and nothing else would ever put it back.
    const groupLabels = { ...get().groupLabels, [RECENT_GROUP]: RECENT_LABEL };
    saveFavients(favients);
    saveGroupLabels(groupLabels);
    // lastGroupId is deliberately NOT written. It is the landing group for the user's next
    // `add()`, and an automatic collect must not steer where a deliberate save goes.
    set({ favients, groupLabels });
    return head.id;
  },

  updateRecent: (id, config, name) => {
    const cur = get().favients;
    const at = cur.findIndex((f) => f.id === id);
    if (at < 0 || !isRecentGroup(cur[at].group)) return false;
    const sig = favientSig(config);
    if (favientSig(cur[at].config) === sig && cur[at].name === name) return true;
    const favients = cur
      .filter((f) => f.id === id || !(isRecentGroup(f.group) && favientSig(f.config) === sig))
      .map((f) => (f.id === id ? { ...f, config, name } : f));
    saveFavients(favients);
    set({ favients });
    return true;
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
    saveLastGroup(group);
    set({ favients: arr, groupLabels, lastGroupId: group });
  },

  insertFavient: (config, name, source, toIndex, group) => {
    const fav: Favient = { id: newId(), name, source, config, createdAt: Date.now(), group };
    const arr = [...get().favients];
    arr.splice(clamp(toIndex, 0, arr.length), 0, fav);
    saveFavients(arr);
    saveLastGroup(group);
    set({ favients: arr, lastGroupId: group });
    return fav.id;
  },

  insertMany: (items, group, label) => {
    const arr = [...get().favients];
    const have = new Set(arr.filter((f) => (f.group ?? DEFAULT_GROUP) === group).map((f) => favientSig(f.config)));
    const now = Date.now();
    const fresh: Favient[] = [];
    for (const it of items) {
      const sig = favientSig(it.config);
      if (have.has(sig)) continue;
      have.add(sig);
      fresh.push({ id: newId(), name: it.name, source: it.source, config: it.config, createdAt: now, group });
    }
    if (!fresh.length) return [];
    const at = arr.findIndex((f) => (f.group ?? DEFAULT_GROUP) === group);
    arr.splice(at < 0 ? arr.length : at, 0, ...fresh);
    let groupLabels = get().groupLabels;
    if (label && group !== DEFAULT_GROUP && !groupLabels[group]) {
      groupLabels = { ...groupLabels, [group]: uniqueGroupLabel(label, group, groupLabels) };
      saveGroupLabels(groupLabels);
    }
    saveFavients(arr);
    saveLastGroup(group);
    set({ favients: arr, groupLabels, lastGroupId: group });
    return fresh.map((f) => f.id);
  },

  replaceAll: (favients, lastGroupId) => {
    saveFavients(favients);
    if (lastGroupId !== undefined) saveLastGroup(lastGroupId);
    set(lastGroupId !== undefined ? { favients, lastGroupId } : { favients });
  },

  renameGroup: (groupId, label) => {
    // Prevent two groups reading identically — disambiguate against the others' labels.
    const groupLabels = { ...get().groupLabels, [groupId]: uniqueGroupLabel(label, groupId, get().groupLabels) };
    saveGroupLabels(groupLabels);
    set({ groupLabels });
  },

  removeGroup: (groupId) => {
    // Safe by construction, not by accident: a shared set has no group id and no members,
    // so this would return 0 anyway — but an empty string or a stray id must not reach the
    // rebuild below either.
    if (!groupId || groupId === DEFAULT_GROUP || isRecentGroup(groupId)) return 0;
    const cur = get().favients;
    const members = cur.filter((f) => (f.group ?? DEFAULT_GROUP) === groupId);
    const labels = get().groupLabels;
    if (!members.length && !(groupId in labels)) return 0;
    // Rebuild rather than mutate in place: the survivors keep their order, and the
    // re-homed members are spliced into the Kept run as ONE block so `buildBlocks`
    // (which opens a block on every group change) still reads Kept as one divider.
    const rest = cur.filter((f) => (f.group ?? DEFAULT_GROUP) !== groupId);
    const rehomed = members.map((f) => ({ ...f, group: DEFAULT_GROUP }));
    const firstKept = rest.findIndex((f) => (f.group ?? DEFAULT_GROUP) === DEFAULT_GROUP);
    const at = firstKept >= 0 ? firstKept : recentRunEnd(rest);
    const favients = [...rest.slice(0, at), ...rehomed, ...rest.slice(at)];
    const groupLabels = { ...labels };
    delete groupLabels[groupId];
    saveFavients(favients);
    saveGroupLabels(groupLabels);
    // lastGroupId must not point at a group that no longer exists, or the next `add`
    // would resurrect it as an orphan.
    const lastGroupId = get().lastGroupId === groupId ? DEFAULT_GROUP : get().lastGroupId;
    if (lastGroupId !== get().lastGroupId) saveLastGroup(lastGroupId);
    set({ favients, groupLabels, lastGroupId });
    return rehomed.length;
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
    saveLastGroup(DEFAULT_GROUP);
    set({ favients: [], groupLabels: {}, lastGroupId: DEFAULT_GROUP });
  },

  setSelectedTarget: (id) => {
    saveTarget(id);
    set({ selectedTargetId: id });
  },

  reloadFromStorage: () => {
    const favients = loadFavients();
    const groupLabels = loadGroupLabels();
    const cur = get();
    // Cheap content equality — the lists are small (dozens), and our own writes always
    // saveFavients before set(), so a no-change focus/storage tick compares equal and
    // skips the set() (no re-render, no clobber of an identical in-flight edit).
    const same =
      JSON.stringify(favients) === JSON.stringify(cur.favients) &&
      JSON.stringify(groupLabels) === JSON.stringify(cur.groupLabels);
    if (!same) set({ favients, groupLabels });
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
 * Cross-tab / cross-app live sync. The shelf is same-origin-shared across every GMT app
 * (app-gmt, fluid-toy, the Gradient Explorer — separate pages, one `gmt.favients` key).
 * The browser fires `storage` in OTHER documents the instant one writes localStorage, so
 * a favourite saved in one app appears in every other already-open app/tab immediately —
 * no page reload. The writing document never receives its own event, so there's no loop,
 * and `reloadFromStorage` only re-reads (never writes back), so an undo's write-through
 * propagates here too without bouncing. We re-read on any change to a content key (or a
 * whole-storage clear, where `key` is null). Module-scope so it lives wherever the store
 * is imported — i.e. wherever the shelf is mounted.
 */
if (typeof window !== 'undefined') {
  const CONTENT_KEYS = new Set<string>([LS_KEY, LS_GROUPS]);
  window.addEventListener('storage', (e) => {
    if (e.key === null || CONTENT_KEYS.has(e.key)) useFavientsStore.getState().reloadFromStorage();
  });
}

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
