/**
 * variantsCore — the pure half of Gradient Explorer "Variants": named snapshots
 * of the studio state (A, B, C…) the user flips between.
 *
 * Everything here is engine-free and DOM-free — validation, cloning, naming,
 * capping and the ramp encoding — so `debug/test-palette-variants.mts` can
 * exercise it under plain node. The store half (`palette/store/variantsStore.ts`)
 * is the only piece that touches `useEngineStore`.
 *
 * ── Why a variant is NOT a preset ─────────────────────────────────────────
 * The obvious implementation is `getPreset()` / `loadPreset()`. It is wrong here,
 * and the reasons are all in `store/engineStore.ts`:
 *   • `loadPreset` calls `resetParamHistory()` — every switch would wipe undo;
 *   • `applyMigrations(p)` mutates the preset object IN PLACE, so a stored
 *     variant would be silently rewritten by the first load that migrates it;
 *   • it clobbers `projectSettings` (name / version / lastSavedHash), so
 *     switching variants would rename the user's document;
 *   • it carries a 50 ms `setTimeout` tail, so a switch is not synchronous;
 *   • its `restoreDocuments` reaches the `favients` document, which MERGES into
 *     the shared cross-app shelf and toasts (see `stripFavients` below).
 * So variants capture and write the three palette feature slices directly, deep
 * cloning on capture AND on restore, inside a single param-undo bracket.
 *
 * @see palette/store/variantsStore.ts (the store half)
 * @see palette/core/rampTween.ts (blending two variants' captured ramps)
 */

import type { JsonValue } from '../../types';
import type { RGB } from './oklab';

/**
 * The feature slices a variant captures. Deliberately only the three palette
 * AUTHORING features: `paletteEditor` is excluded because the stop document is
 * carried by the `stops` document provider instead, and capturing both would
 * restore it twice.
 */
export const VARIANT_FEATURES = ['paletteGenerator', 'paletteImage', 'paletteFilters'] as const;
export type VariantFeatureId = (typeof VARIANT_FEATURES)[number];

/** localStorage key for the persisted variant list. */
export const VARIANTS_STORAGE_KEY = 'gmt.ge.variants';

/** How many variants are kept. Beyond this the OLDEST (front of the list) is dropped. */
export const MAX_VARIANTS = 12;

/** Texel count of a stored variant ramp — matches `renderStopsToRamp`'s 256. */
export const VARIANT_RAMP_TEXELS = 256;

export interface Variant {
  id: string;
  name: string;
  createdAt: number;
  /** Deep-cloned `store[featureId]` for each of `VARIANT_FEATURES` present at capture. */
  features: Record<string, unknown>;
  /** `serializeDocuments()` MINUS the `favients` key — see `stripFavients`. */
  documents: Record<string, JsonValue>;
  /** 256×3 rounded 0..255 ints — the working output at capture, for tween + thumbnails. */
  ramp: number[] | null;
}

/**
 * JSON deep clone. Used on BOTH sides of a variant (capture and restore) so a
 * stored variant can never share structure with the live store — a shared array
 * would let a later edit rewrite history, which is the exact failure mode that
 * makes "switch back to A" quietly return something that is no longer A.
 *
 * @assumption Everything in a feature slice is JSON-round-trippable. True for
 *   the three palette features today (all scalars plus `paletteFilters`' vec2s
 *   and string arrays). A `THREE.Vector2` survives as `{x, y}` and is re-hydrated
 *   by the DDFS auto-setter's type sanitiser on restore — grep `instanceof
 *   THREE.Vector2` in `store/createFeatureSlice.ts`. A future param holding a
 *   function, a Map or a texture would be silently dropped here.
 */
export const deepClone = <T>(value: T): T => {
  if (value === undefined) return value;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
};

/** Keys that must never become own properties of a restored object. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const hasUnsafeKey = (v: Record<string, unknown>): boolean =>
  Object.keys(v).some((k) => UNSAFE_KEYS.has(k));

/**
 * Copy a `serializeDocuments()` bag with the `favients` document REMOVED.
 *
 * @invariant A stored variant never carries the `favients` document.
 *   `restoreDocuments({ favients })` does not replace the shelf — it MERGES via
 *   `importCollection(…, 'merge')` and raises a toast (grep `showToast` in
 *   `palette/store/favientsDocument.ts`). The shelf is shared across every app
 *   under `gmt.favients`, so a variant switch would re-add every favourite the
 *   user has pruned since the capture, once per switch, each time with a toast.
 *   Variants are a studio-state feature; they have no business writing the
 *   user's global library.
 *   — proven by: `npx tsx debug/test-palette-variants.mts`
 *     ("stripFavients drops the shared favients shelf")
 *     Falsified 2026-09-03 by deleting the `delete` line (returning the bag
 *     unstripped): 5 assertions go red, exit 1 — the three in [5] plus, at the
 *     store level, "the captured documents carry NO favients key" and "the
 *     favients provider is NEVER invoked by a variant switch" (a real provider
 *     that counts its own restores). Sections [1]-[4], [6]-[7] and the rest of
 *     [8]-[10] stay green, so the failure isolates this claim.
 */
export const stripFavients = (docs: Record<string, JsonValue>): Record<string, JsonValue> => {
  const out = deepClone(docs) ?? {};
  delete (out as Record<string, unknown>).favients;
  return out;
};

/**
 * The next unused single-letter name: A, B, C … Z, then A2, B2 … Z2, A3 …
 * Comparison is case-insensitive on the trimmed name, so a user-renamed "b"
 * still blocks "B" (two variants differing only in case read as duplicates).
 */
export const nextVariantName = (existing: readonly string[]): string => {
  const taken = new Set(existing.map((n) => String(n ?? '').trim().toUpperCase()));
  for (let round = 1; round < 1000; round++) {
    const suffix = round === 1 ? '' : String(round);
    for (let i = 0; i < 26; i++) {
      const candidate = String.fromCharCode(65 + i) + suffix;
      if (!taken.has(candidate)) return candidate;
    }
  }
  return `V${Date.now()}`;
};

/** Keep at most `max` variants, dropping from the FRONT (oldest capture first). */
export const capVariants = <T>(list: readonly T[], max: number = MAX_VARIANTS): T[] =>
  list.length <= max ? list.slice() : list.slice(list.length - max);

/** A collision-resistant id without a crypto dependency (harnesses run under plain node). */
export const newVariantId = (): string =>
  `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const clampByte = (v: unknown): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return Math.round(n < 0 ? 0 : n > 255 ? 255 : n);
};

/**
 * Encode a working ramp as `VARIANT_RAMP_TEXELS × 3` rounded 0..255 ints — the
 * on-disk form (a flat int array is ~4× smaller in JSON than 256 `{r,g,b}`
 * objects, and localStorage is the budget here). A ramp of a different length is
 * resampled by nearest texel; an empty/absent ramp stores `null`.
 */
export const roundRamp = (ramp: readonly RGB[] | null | undefined): number[] | null => {
  if (!ramp || ramp.length === 0) return null;
  const n = ramp.length;
  const out = new Array<number>(VARIANT_RAMP_TEXELS * 3);
  for (let i = 0; i < VARIANT_RAMP_TEXELS; i++) {
    const j =
      n === VARIANT_RAMP_TEXELS ? i : Math.round((i / (VARIANT_RAMP_TEXELS - 1)) * (n - 1));
    const c = ramp[j] as RGB | undefined;
    out[i * 3] = clampByte(c?.r);
    out[i * 3 + 1] = clampByte(c?.g);
    out[i * 3 + 2] = clampByte(c?.b);
  }
  return out;
};

/** Decode a stored ramp back to `RGB[]` for `tweenRamp` / thumbnail painting. */
export const rampFromInts = (flat: readonly number[] | null | undefined): RGB[] | null => {
  if (!flat || flat.length < 3) return null;
  const n = Math.floor(flat.length / 3);
  const out: RGB[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = { r: clampByte(flat[i * 3]), g: clampByte(flat[i * 3 + 1]), b: clampByte(flat[i * 3 + 2]) };
  }
  return out;
};

/**
 * The LOAD GATE. localStorage survives every reload, so one malformed entry
 * written by an older build (or hand-edited in devtools) would otherwise brick
 * the Variants strip on every boot from then on. Anything that fails here is
 * dropped, not repaired.
 *
 * @assumption Per-feature shape is NOT validated — `features.paletteGenerator`
 *   is only required to be a plain object. The DDFS auto-setter sanitises the
 *   values it recognises and ignores keys with no param config, so a stale key
 *   from an older build is inert rather than dangerous.
 */
export const isWellFormedVariant = (v: unknown): v is Variant => {
  if (!isPlainObject(v)) return false;
  if (typeof v.id !== 'string' || v.id.length === 0) return false;
  if (typeof v.name !== 'string' || v.name.length === 0) return false;
  if (typeof v.createdAt !== 'number' || !Number.isFinite(v.createdAt)) return false;
  if (!isPlainObject(v.features) || hasUnsafeKey(v.features)) return false;
  if (!isPlainObject(v.documents) || hasUnsafeKey(v.documents)) return false;
  if (v.ramp !== null) {
    if (!Array.isArray(v.ramp)) return false;
    if (!v.ramp.every((n) => typeof n === 'number' && Number.isFinite(n))) return false;
  }
  return true;
};

/**
 * Parse the persisted list: never throws, always returns an array. Malformed
 * entries are dropped individually (a single bad neighbour must not cost the
 * user the other eleven), and the cap is re-applied on read so a hand-grown
 * file cannot exceed it.
 */
export const parseVariants = (raw: string | null | undefined): Variant[] => {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return capVariants(parsed.filter(isWellFormedVariant));
};

/** Serialise for localStorage. Returns `'[]'` rather than throwing on a cyclic value. */
export const serializeVariants = (list: readonly Variant[]): string => {
  try {
    return JSON.stringify(list);
  } catch {
    return '[]';
  }
};

/**
 * The DDFS auto-setter name for a feature id.
 *
 * @assumption `set${FeatureId with capitalised first letter}` is a load-bearing
 *   STRING convention with no type enforcement, re-derived at ~20 sites across
 *   the tree. This is one more of them.
 *   @see docs/policy/ddfs-string-contract.md, store/createFeatureSlice.ts
 */
export const featureSetterName = (id: string): string =>
  `set${id.charAt(0).toUpperCase()}${id.slice(1)}`;
