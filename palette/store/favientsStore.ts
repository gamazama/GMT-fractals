/**
 * favientsStore — the "Favients" shelf: a persistent collection of favourite
 * gradients shared across every GMT app (same-origin localStorage key
 * `gmt.favients`) and across sessions.
 *
 * Each favourite is stored as a GMT `GradientConfig`, so a click / drag applies cleanly
 * to any target — a generator slot (via a 256-ramp) or a fractal coloring layer (the
 * config directly). Since ADR-0122 that config is one of TWO forms: a stop gradient, or a
 * RAMP gradient (`stops: []` + a 1,024-character `ramp`). The store knows the second
 * form only at its boundaries — the load / import gates, `healStopIds`, `favientSig` (a
 * ramp signs as `ramp:<ramp>`) and `cleanConfig` on every producer path — and otherwise
 * treats a config as opaque. A stop gradient's saved form is unchanged.
 * @see docs/adr/0122-the-ramp-is-the-gradient.md
 *
 * The collection FILE is the GMT gradients document since ADR-0123 (`exportCollection` writes
 * it; `importCollection` reads it and the legacy `{version, favients, groupLabels}`), and a
 * merge keeps Recent at the top and every group one run (`placeMerged`).
 * @see docs/adr/0123-the-gradient-file-is-a-png.md
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
 * All groups are user-made EXCEPT `RECENT_GROUP`, which the app fills for the user. Only
 * the Gradient Explorer writes it, through its working session (`workingStore.syncRecent`,
 * via `installWorking`): whatever becomes the working gradient — a wall or shelf pick
 * included, since a pick makes it the working gradient — is collected once it has stayed
 * Working for the shell's 400 ms debounce, and `updateRecent` then refreshes that entry in
 * place as it is edited — while it is TODAY's: an entry filed on an earlier local day is that
 * day's record and is never rewritten, so a session resumed on a later day files its change as a
 * new entry under today (owner, 2026-09-24). The ♥, Mix, Share and Wallpaper flush that write
 * first; Export does not. The ♥ itself files a separate copy with `add()`, never into Recent.
 * It is deduped by `favientSig`, capped at `RECENT_CAP`, and it owns the front of
 * the array (index 0). Organising is optional: named groups sit beside Recent and
 * the user drags out of Recent into them. A gradient the user has already filed in
 * a named group is never re-collected, and a user `add()` never lands in Recent.
 * Its divider is not renamable (FavientsPanel renders a static label for it).
 * @see docs/adr/0124-recent-follows-the-working-gradient.md
 *
 * ── The collection is SHARED ACROSS HOSTS ─────────────────────────────────────
 * `gmt.favients` is one same-origin key read and written by app-gmt, fluid-toy and
 * the Gradient Explorer alike (only the PANEL window state is split per host, by
 * `installFavients`' `storageKey`). So the Recent group is not an Explorer-local
 * convenience: whatever any host collects appears in EVERY host's shelf, live —
 * the `storage` listener at the bottom of this file propagates it without a reload.
 */

import { coerceOrigin, type CatalogOrigin } from '../core/catalogOrigin';
import { create } from 'zustand';
import type { GradientConfig } from '../../types';
import { ensureStopIds } from '../core/editorConfig';
import {
  decodeGradientDocument,
  encodeGradientDocument,
  gradientDocumentText,
  type GradientDocumentEntry,
} from '../core/gradientDocument';
import { isStopGradient, normalizeGradientConfig } from '../../utils/gradientRamp';
import { lsGet, lsSet, lsRemove, lsGetJson, lsSetJson } from '../core/storage';
import { clamp } from '../../utils/stopOps';

export interface Favient {
  id: string;
  name: string;
  /** Provenance label, e.g. "Generator", "Image · distill", "Picker · Turbo". */
  source?: string;
  /**
   * Catalogue provenance (2026-09-13, additive): which archive / package the gradient came
   * from and the credit an export carries, stamped with the content key of the config it was
   * picked as. Honoured ONLY while `config` still has that key (`catalogOrigin.unmodifiedOrigin`),
   * so an in-place Recent refresh or any edit silently retires it. Favourites saved before this
   * existed have none and export exactly as they did. Untrusted when loaded — read it through
   * `coerceOrigin`, never directly.
   */
  origin?: CatalogOrigin;
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

/** The local calendar day of a timestamp, as a sortable key (`YYYY-MM-DD`) — what a Recent BIN
 *  is: `buildBlocks` splits the Recent run at every change of it, and an import places Recent
 *  entries by it (`byDayNewestFirst`). Defined here, beside the placement, and re-exported by
 *  `palette/components/favientBlocks.ts`, so the view and the placement cannot disagree on a day. */
export const dayKey = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** The shelf's clock: every `createdAt` this store stamps, and the "today" `updateRecent` measures
 *  an entry's day against. A seam so a harness can move today without faking `Date` globally;
 *  `null` puts the real clock back. The view (`favientBlocks.dayLabel`) takes its own `now`. */
let clock: () => number = () => Date.now();
export const setFavientsClock = (now: (() => number) | null): void => {
  clock = now ?? (() => Date.now());
};

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
 * localStorage would brick the shelf across sessions. Filtering here keeps malformed stops
 * out of memory and disk entirely.
 *
 * This is the LOAD gate. Since ADR-0123 the IMPORT gate (a collection file, a scene's
 * favients document, a gradient file) is `decodeGradientDocument` in
 * `palette/core/gradientDocument.ts` — stricter: every config through
 * `coerceGradientConfig`, so a stop-less favourite is admitted there only when it is a real
 * ramp gradient. Nothing is lost by refusing one there — the file still holds it — whereas
 * this gate cannot refuse without deleting.
 */
const isWellFormedFavient = (f: unknown): f is Favient => {
  if (!f || typeof f !== 'object') return false;
  const fav = f as Favient;
  if (typeof fav.id !== 'string' || !fav.config || !Array.isArray(fav.config.stops)) return false;
  // A RAMP favourite (ADR-0122) has `stops: []`, which `every` passes — deliberately: the
  // LOAD gate keeps a stop-less entry even when it cannot read its ramp, because dropping it
  // here deletes it from disk on the next save (the failure ADR-0122 Decision 2 chose `[]`
  // to avoid). The IMPORT gate is stricter — see above.
  return fav.config.stops.every(
    (s) => !!s && typeof s === 'object' && typeof (s as { color?: unknown }).color === 'string' && Number.isFinite((s as { position?: unknown }).position),
  );
};

/**
 * One of the two forms on the way IN to the shelf (`normalizeGradientConfig`): a stop
 * gradient loses a stale `ramp` left by a spread, so its saved form stays byte-identical to
 * pre-ADR-0122. A stop-less config is left exactly as it is on LOAD (its ramp may be one
 * this build cannot read — see `isWellFormedFavient`); producer paths normalise fully.
 */
const normalizeLoaded = (f: Favient): Favient => {
  if (!isStopGradient(f.config)) return f;
  const config = normalizeGradientConfig(f.config);
  return config === f.config ? f : { ...f, config };
};

/**
 * HEAL a loaded entry's stop ids rather than only accepting or rejecting it. Entries
 * favourited before 2026-09-12 can carry stops with NO id — the GX global wire format does
 * not send them, and nothing minted any on the way in — and `isWellFormedFavient` above
 * checks colour and position but not id, so those entries are already on disk and would
 * stay there forever. An id-less stop is not cosmetic: `stopOps` keys selection, delete and
 * move by id, so one selected stop reads as all of them. Entries whose ids are already fine
 * come back as the same object, so this costs a walk and nothing else. A ramp favourite has
 * no stops to heal and comes back as the same object.
 */
const healStopIds = (f: Favient): Favient => {
  if (f.config.stops.length === 0) return f;
  const stops = ensureStopIds(f.config.stops);
  return stops === f.config.stops || stops.every((s, i) => s === f.config.stops[i])
    ? f
    : { ...f, config: { ...f.config, stops } };
};

const loadFavients = (): Favient[] => {
  const arr = lsGetJson<unknown[]>(LS_KEY, []);
  if (!Array.isArray(arr)) return [];
  return arr.filter(isWellFormedFavient).map(normalizeLoaded).map(healStopIds);
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
 * Content signature for dedupe, following the gradient's FORM (ADR-0122 Decision 5):
 *   - a STOP gradient: per stop its rounded position, colour, interpolation (absent reads as
 *     'linear', as the renderer reads it) and bias (absent reads as 0.5, rounded to 1/1000), then
 *     `@` and the blend space (absent reads as 'oklab'). A stale `ramp` on it is ignored.
 *   - a stop-less config: `ramp:` + its ramp string. The tag cannot collide with a stop
 *     signature (those start with a rounded position, a digit or `-`), and it is what keeps
 *     every ramp favourite from signing as `''` and deduping into one.
 *
 * Colour space stays OUT on purpose: the same stops in `linear` and `srgb` DISPLAY identically, so
 * they are one favourite (ADR-0123 Consequences). Blend, bias and interpolation came IN with
 * ADR-0123 — before it two gradients differing only in blend (ΔE 0.109) or bias (ΔE 0.135) deduped
 * into one and a merge silently dropped the second. That deliberately supersedes ADR-0122's pin
 * that a stop signature stay byte-identical: nothing persists a signature, so the only effect is
 * that more gradients are distinct from now on — no shelf loses anything.
 *
 * @invariant two different ramp gradients never share a signature, and a ramp gradient never
 *   signs like a stop gradient — proven by: `npm run test:palette-favients` ("[8] two
 *   different ramps do not dedupe into one", "[8] the ramp signature is tagged"). Falsified
 *   2026-09-14, see the harness header.
 * @invariant gradients that differ only in blend space, in one stop's bias or in one stop's
 *   interpolation sign differently, and the same stops in another colour space sign the same —
 *   proven by: `npm run test:gradient-file` ("[6] favientSig distinguishes blend", "… bias",
 *   "… interpolation", "[6] favientSig ignores colour space"). Falsified 2026-09-14, see the
 *   harness header.
 * @see docs/adr/0123-the-gradient-file-is-a-png.md
 */
export const favientSig = (c: GradientConfig): string => {
  const stops = Array.isArray(c?.stops) ? c.stops : [];
  if (stops.length === 0) {
    const ramp = (c as { ramp?: unknown } | null | undefined)?.ramp;
    return `ramp:${typeof ramp === 'string' ? ramp : ''}`;
  }
  const body = stops
    // Coerce defensively — favientSig runs on untrusted imported configs (W8
    // scene restore) and on every dedupe check, so it must never throw on a
    // malformed stop. A malformed stop just yields a non-matching signature.
    .map((s) => {
      const bias = s?.bias;
      const b = typeof bias === 'number' && Number.isFinite(bias) ? Math.round(bias * 1000) : 500;
      return `${Math.round((Number(s?.position) || 0) * 1000)}:${String(s?.color).toUpperCase()}:${s?.interpolation || 'linear'}:${b}`;
    })
    .join('|');
  return `${body}@${String(c?.blendSpace || 'oklab')}`;
};

let _seq = 0;
const newId = (): string => `fav-${Date.now().toString(36)}-${_seq++}`;
/** A producer's config, in one of the two forms before it reaches the shelf (a stale `ramp` off a
 *  stop gradient, a malformed one off a stop-less config). Tolerates a config with no stops array
 *  — the typed producers never hand one, and this must not be the place that throws. */
const cleanConfig = (c: GradientConfig): GradientConfig => (Array.isArray(c?.stops) ? normalizeGradientConfig(c) : c);
/** `{ origin }` for a well-formed origin, `{}` otherwise — so a favourite without one has no
 *  `origin` key at all and stays byte-identical to what was written before 2026-09-13. */
const withOrigin = (o: unknown): { origin?: CatalogOrigin } => {
  const c = coerceOrigin(o);
  return c ? { origin: c } : {};
};
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

  add: (config: GradientConfig, name: string, source?: string, origin?: CatalogOrigin) => string;
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
  collectRecent: (config: GradientConfig, name: string, source?: string, opts?: { fresh?: boolean; origin?: CatalogOrigin }) => string | null;
  /**
   * Refresh the v2 working session's Recent entry (owner, 2026-09-03: the bin "should be
   * updating the gradient whenever the user modifies it"). Returns the id of the entry that
   * holds the gradient now, which the caller writes to from then on:
   *   • `id` itself — refreshed IN PLACE; or unchanged content and name, with no write.
   *   • a NEW id — `id` was filed on an earlier local day. A day's bin is that day's record
   *     (owner, 2026-09-24: "a gradient you resume on a later day files a NEW entry under Today,
   *     instead of updating the entry filed under the earlier day"), so the change is filed as a
   *     fresh entry at the head of the run, dated now, carrying the old entry's source and credit
   *     as an in-place refresh would; the earlier entry is left exactly as it was.
   *   • null — `id` is no longer a Recent entry (removed, or dragged into a user group — that IS
   *     keeping it, so it is left alone), or the day's new entry was refused because the gradient
   *     is already filed in a group of yours (`collectRecent`'s rule). The caller collects.
   * Any OTHER Recent entry of today already holding the new content is dropped, so a day stays
   * one-entry-per-gradient; an earlier day's entry is never dropped, so an edit — or an undo —
   * that brings back what an earlier day filed leaves that day's record alone.
   */
  updateRecent: (id: string, config: GradientConfig, name: string) => string | null;
  remove: (id: string) => void;
  /** Content-presence query (used by the gradient-file import to skip duplicates). */
  isFav: (config: GradientConfig) => boolean;
  rename: (id: string, name: string) => void;
  /** Move an existing favourite so it lands at `toIndex` in the array WITH this item
   *  REMOVED (i.e. the insertion index in the list as rendered without the dragged
   *  swatch), and set its group. The caller keeps (toIndex, group) contiguous. */
  moveFavient: (id: string, toIndex: number, group: string) => void;
  /** Insert a NEW favourite (from an external drag) at flat index `toIndex` in `group`. */
  insertFavient: (config: GradientConfig, name: string, source: string | undefined, toIndex: number, group: string, origin?: CatalogOrigin) => string;
  /**
   * File MANY gradients into a group in one write (GE v2 Phase D: "Group these N" saves a
   * narrowed wall as a group). They join the START of the group's run in the given order,
   * or the tail of the shelf when the group is new; `label` names a new group (made unique
   * against the others, as `renameGroup` does) and is ignored for one that already has
   * one. Content already in that group is skipped. Returns the ids filed. Undo is NOT
   * bracketed here — the caller wraps it, as every panel gesture does.
   */
  insertMany: (items: { config: GradientConfig; name: string; source?: string; origin?: CatalogOrigin }[], group: string, label?: string) => string[];
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
   *  JSON string — the GMT gradients document (ADR-0123), the backup/share file written by
   *  the panel's "Save" and the favients document a scene embeds. */
  exportCollection: () => string;
  /** Load a collection JSON: the GMT gradients document, or the legacy
   *  `{version: 1, favients, groupLabels}` it replaced. 'replace' overwrites the current
   *  collection; 'merge' adds entries whose gradient isn't already present (by content
   *  signature), keeping existing group labels on conflict. Returns how many
   *  favourites were added (merge) or set (replace), or null if the file was
   *  unreadable / not a collection (a bare gradient, a session, another version). */
  importCollection: (json: string, mode: 'merge' | 'replace') => number | null;
  /**
   * The store half of `importCollection`, for callers that already DECODED the payload (the
   * gradient-file router, which reads PNGs and zips too). Entries must have passed
   * `decodeGradientDocument`'s gate. Same modes, same return; see `placeMerged` for where a
   * merge puts things.
   */
  importEntries: (entries: ReadonlyArray<GradientDocumentEntry>, groups: Readonly<Record<string, string>>, mode: 'merge' | 'replace') => number;
}

/**
 * Read the valid favourites out of a parsed collection object — the GMT gradients document or
 * the legacy collection — through the same gate `importCollection` applies
 * (`decodeGradientDocument`). Lets callers preview what an import WOULD admit — e.g. the scene
 * restore counting new-vs-duplicate gradients — without mutating anything. Returns [] for any
 * non-collection / malformed input. The ids are placeholders: an import mints its own.
 */
export const readCollectionFavients = (raw: unknown): Favient[] => {
  const read = decodeGradientDocument(raw);
  if (read.kind !== 'gradients' || (read.format !== 'document' && read.format !== 'collection')) return [];
  return read.gradients.map((e, i) => entryToFavient(e, `preview-${i}`));
};

/** A decoded document entry as a favourite (config normalised, origin re-validated). */
const entryToFavient = (e: GradientDocumentEntry, id: string): Favient => ({
  id,
  name: e.name,
  ...(e.source ? { source: e.source } : {}),
  ...withOrigin(e.origin),
  config: cleanConfig(e.config),
  createdAt: typeof e.createdAt === 'number' ? e.createdAt : clock(),
  group: e.group ?? DEFAULT_GROUP,
});

/**
 * The Recent run ordered newest DAY first — a stable sort by `dayKey`, so the entries of one day
 * keep their order (on a merge: the shelf's own first, then the file's, in file order).
 *
 * WHY: a Recent bin is not stored, it is a view — `buildBlocks` opens a new bin at every change
 * of day along the run — so the run must never come back to a day it has left. A collect and a
 * promote keep that by construction (they land at the head with `createdAt` now); an import
 * cannot, because it brings entries with their OWN dates. Until 2026-09-16 a merge appended the
 * file's Recent entries to the end of the run ("they are older than what you just collected"),
 * and a file entry newer than the run's last day — another device's today, or any entry with no
 * date, which the gate stamps now — drew that day twice: Today · 1, Yesterday · 1, Today · 1, as
 * two rail chips with one `bin:<day>` id.
 */
const byDayNewestFirst = (run: Favient[]): Favient[] =>
  run
    .map((f, i) => ({ f, i, day: dayKey(f.createdAt) }))
    .sort((a, b) => (a.day === b.day ? a.i - b.i : a.day < b.day ? 1 : -1))
    .map((x) => x.f);

/**
 * Where a MERGE puts what it adds, so the shelf's structural rules survive it:
 *   - Recent is ONE run at index 0 (`collectRecent`'s invariant): the file's Recent entries join
 *     the existing Recent run, and any stray Recent entry already mid-array is consolidated into
 *     that run. Within it they are placed by DAY (`byDayNewestFirst`): an entry of a day the run
 *     already shows joins the END of that day, in file order; one of a newer day goes above it.
 *   - a group is ONE contiguous run (`buildBlocks` opens a block on every group change): an
 *     entry for a group the shelf already has lands just past that group's last member; a group
 *     the shelf does not have is appended, in the file's order.
 * Before ADR-0123 a merge appended everything at the end, which split both.
 *
 * @invariant after a merge the Recent run is contiguous at index 0 and every group is one run —
 *   proven by: `npm run test:gradient-file` ("[7] merge keeps Recent one block at the top",
 *   "[7] merge keeps each group one run"). Falsified 2026-09-14, see the harness header.
 * @invariant after a merge or a replace, every day of the Recent run is ONE bin — the rail never
 *   shows a day twice — proven by: `npm run test:palette-favients` ("[9] a merge bringing a newer
 *   day …", "[9] a replace from a file whose Recent run is out of day order …"). Falsified
 *   2026-09-16, see that harness's header.
 */
const placeMerged = (cur: Favient[], fresh: Favient[]): Favient[] => {
  const g = (f: Favient): string => f.group ?? DEFAULT_GROUP;
  const recentCur = cur.filter((f) => isRecentGroup(f.group));
  const restCur = cur.filter((f) => !isRecentGroup(f.group));
  const recentFresh = fresh.filter((f) => isRecentGroup(f.group));
  const byGroup = new Map<string, Favient[]>();
  for (const f of fresh) {
    if (isRecentGroup(f.group)) continue;
    const list = byGroup.get(g(f));
    if (list) list.push(f);
    else byGroup.set(g(f), [f]);
  }
  const lastOf = new Map<string, number>();
  restCur.forEach((f, i) => lastOf.set(g(f), i));
  const out: Favient[] = byDayNewestFirst([...recentCur, ...recentFresh]);
  restCur.forEach((f, i) => {
    out.push(f);
    const key = g(f);
    if (lastOf.get(key) === i && byGroup.has(key)) {
      out.push(...byGroup.get(key)!);
      byGroup.delete(key);
    }
  });
  for (const list of byGroup.values()) out.push(...list);
  return out;
};

/** Recent first (one run, newest day first — a file written from a shelf a pre-2026-09-16 merge
 *  split would otherwise bring the split with it), everything else in its order — a replace's
 *  placement. */
const recentFirst = (favients: Favient[]): Favient[] => [
  ...byDayNewestFirst(favients.filter((f) => isRecentGroup(f.group))),
  ...favients.filter((f) => !isRecentGroup(f.group)),
];

export const useFavientsStore = create<FavientsState>((set, get) => ({
  favients: loadFavients(),
  groupLabels: loadGroupLabels(),
  selectedTargetId: loadTarget(),
  lastGroupId: loadLastGroup(),

  add: (rawConfig, name, source, origin) => {
    const config = cleanConfig(rawConfig);
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
    const fav: Favient = { id: newId(), name, source, ...withOrigin(origin), config, createdAt: clock(), group };
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
  collectRecent: (rawConfig, name, source, opts) => {
    const config = cleanConfig(rawConfig);
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
        ? { ...recent[at], ...(recent[at].origin ? {} : withOrigin(opts?.origin)), createdAt: clock() }
        : { id: newId(), name, source, ...withOrigin(opts?.origin), config, createdAt: clock(), group: RECENT_GROUP };
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

  /**
   * @invariant an entry filed on an earlier local day is never rewritten or dropped by the
   *   working session's sync: the first change files a NEW entry under today and the session
   *   writes to that one from then on; an edit, a rename or an undo that goes back across the
   *   split leaves both entries in place — proven by: `npx tsx debug/test-palette-working.mts`
   *   [16] ("resume on day D+1 → edit → sync: … day D's entry is exactly as it was", "… the
   *   earlier day's entry is still there, exactly as it was"). Falsified 2026-09-24 three ways, see
   *   that harness's header (D1–D3).
   */
  updateRecent: (id, rawConfig, name) => {
    const config = cleanConfig(rawConfig);
    const cur = get().favients;
    const at = cur.findIndex((f) => f.id === id);
    if (at < 0 || !isRecentGroup(cur[at].group)) return null;
    const sig = favientSig(config);
    if (favientSig(cur[at].config) === sig && cur[at].name === name) return id;
    // `YYYY-MM-DD` keys compare as dates. A day AFTER today (the clock went back) is not earlier.
    const today = dayKey(clock());
    const earlier = (f: Favient): boolean => dayKey(f.createdAt) < today;
    // Filed on an earlier day: that day keeps it as it was, and the change opens today's entry.
    if (earlier(cur[at])) return get().collectRecent(config, name, cur[at].source, { fresh: true, origin: cur[at].origin });
    const favients = cur
      .filter((f) => f.id === id || !(isRecentGroup(f.group) && favientSig(f.config) === sig && !earlier(f)))
      .map((f) => (f.id === id ? { ...f, config, name } : f));
    saveFavients(favients);
    set({ favients });
    return id;
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

  insertFavient: (rawConfig, name, source, toIndex, group, origin) => {
    const config = cleanConfig(rawConfig);
    const fav: Favient = { id: newId(), name, source, ...withOrigin(origin), config, createdAt: clock(), group };
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
    const now = clock();
    const fresh: Favient[] = [];
    for (const it of items) {
      const config = cleanConfig(it.config);
      const sig = favientSig(config);
      if (have.has(sig)) continue;
      have.add(sig);
      fresh.push({ id: newId(), name: it.name, source: it.source, ...withOrigin(it.origin), config, createdAt: now, group });
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
      config: cleanConfig(e.config),
      createdAt: clock(),
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
    return gradientDocumentText(encodeGradientDocument(favients, groupLabels));
  },

  importCollection: (json, mode) => {
    // THE gate for both shapes (and a refusal for everything else — a bare gradient, a session,
    // another version — so a stray JSON can never wipe the shelf through 'replace').
    const read = decodeGradientDocument(json);
    if (read.kind !== 'gradients' || (read.format !== 'document' && read.format !== 'collection')) return null;
    return get().importEntries(read.gradients, read.groups, mode);
  },

  importEntries: (entries, incomingLabels, mode) => {
    const labelsWithRecent = (favients: Favient[], labels: Record<string, string>): Record<string, string> => {
      const pruned = pruneLabels(favients, labels);
      return favients.some((f) => isRecentGroup(f.group)) ? { ...pruned, [RECENT_GROUP]: RECENT_LABEL } : pruned;
    };

    if (mode === 'replace') {
      // Fresh ids so re-importing the same file twice can't collide with itself.
      const favients = recentFirst(entries.map((e) => entryToFavient(e, newId())));
      const groupLabels = labelsWithRecent(favients, { ...incomingLabels });
      saveFavients(favients);
      saveGroupLabels(groupLabels);
      set({ favients, groupLabels });
      return favients.length;
    }

    // merge: skip favourites already present by content signature (in the shelf OR earlier in
    // the same file); fresh ids for the rest.
    const have = new Set(get().favients.map((f) => favientSig(f.config)));
    const fresh: Favient[] = [];
    for (const e of entries) {
      const fav = entryToFavient(e, newId());
      const sig = favientSig(fav.config);
      if (have.has(sig)) continue;
      have.add(sig);
      fresh.push(fav);
    }
    if (!fresh.length) return 0;
    const favients = placeMerged(get().favients, fresh);
    // Existing labels win on conflict; imported labels fill in new groups.
    const groupLabels = labelsWithRecent(favients, { ...incomingLabels, ...get().groupLabels });
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
