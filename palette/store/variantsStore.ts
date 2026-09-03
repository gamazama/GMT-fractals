/**
 * variantsStore — global named snapshots of the palette studio state (A, B, C…)
 * that the Gradient Explorer's "Variants" strip switches between.
 *
 * A variant is three things: the three palette feature slices, the registered
 * scene documents (minus the shared Favients shelf), and the ramp that was on
 * screen when it was captured. Switching to one writes all three back inside a
 * SINGLE param-undo bracket, so a switch costs the user exactly one Ctrl+Z.
 *
 * ── What this deliberately does NOT do ────────────────────────────────────
 * It never calls `loadPreset`. The reasons are enumerated in
 * `palette/core/variantsCore.ts`'s header (undo wipe, in-place migration of the
 * stored object, `projectSettings` clobber, a 50 ms setTimeout tail, and the
 * Favients merge). It never calls `resetParamHistory` either — a variant switch
 * is an EDIT, not a document load, and the user's undo history has to survive it.
 *
 * Cloning is on BOTH sides: `capture` clones out of the store, `restore` clones
 * back in. A stored variant therefore shares no structure with live state in
 * either direction, so neither a later edit nor a later restore can rewrite it.
 *
 * Persistence is localStorage under `gmt.ge.variants`, capped at
 * `MAX_VARIANTS`; the load gate (`isWellFormedVariant`) drops malformed entries
 * rather than repairing them. `activeId` is session-only by design — which
 * variant you were last looking at is not worth a reload's worth of surprise.
 *
 * @assumption The three feature slices are the whole of a variant's identity.
 *   The heavy authoring state (generator curves/slots, the image trace, the stop
 *   document) rides along inside `documents`, because those stores register
 *   document providers — grep `registerDocumentProvider` in
 *   `palette/registerPaletteUI.ts`. A future palette store that persists via
 *   plain localStorage instead of a provider would be INVISIBLE to variants.
 * ── Known gap: the `image` document restores ASYNCHRONOUSLY ───────────────
 * `paramEdit` closes the transaction the moment its callback returns, so a
 * provider that finishes later lands OUTSIDE the undo entry. The `stops` and
 * `generator` providers write their stores inline and are fine.
 * `restoreImageDocument` is not: it calls `decodeAndIngest(src).then(…)` (grep
 * `_restoreToken` in `palette/store/imageDocument.ts`), so switching to a
 * variant that carries an image gives you the image a frame or two late, and
 * undoing that switch will not put the PREVIOUS image back — the bracket never
 * saw either one. Wiring the Variants UI has to either exclude `image` from a
 * variant or give the image store a history provider of its own.
 *
 * @assumption localStorage can hold `MAX_VARIANTS` of these. It is not obviously
 *   true: `serializeImageDocument` embeds a JPEG data URL of the thumbnail (grep
 *   `toDataURL` in `palette/store/imageDocument.ts`), so twelve image-mode
 *   variants can be megabytes. `lsSet` swallows a quota error SILENTLY, so the
 *   failure mode is a capture that appears to work and is gone after reload.
 *
 * @assumption The DDFS auto-setter MERGES a patch (`{...current, ...sanitized}`
 *   in `store/createFeatureSlice.ts`) rather than replacing the slice. A variant
 *   captured before a new param existed therefore leaves that param at its
 *   CURRENT value on restore, not at its default. Harmless while variants are
 *   session-scoped; it becomes a real drift once they persist across releases.
 *
 * @see palette/core/variantsCore.ts (the pure half — validation, clone, naming, cap)
 * @see palette/store/paramUndoBracket.ts (the one-entry undo bracket)
 * @see store/documentRegistry.ts (serializeDocuments / restoreDocuments)
 * @see docs/adr/0112-variants-bypass-the-scene-loader.md
 */

import { create } from 'zustand';
import { useEngineStore } from '../../store/engineStore';
import { serializeDocuments, restoreDocuments } from '../../store/documentRegistry';
import { lsGet, lsSet } from '../core/storage';
import { paramEdit } from './paramUndoBracket';
import {
  VARIANTS_STORAGE_KEY,
  VARIANT_FEATURES,
  capVariants,
  deepClone,
  featureSetterName,
  newVariantId,
  nextVariantName,
  parseVariants,
  roundRamp,
  serializeVariants,
  stripFavients,
  type Variant,
} from '../core/variantsCore';
import type { RGB } from '../core/oklab';

export type { Variant };
export { VARIANT_FEATURES, MAX_VARIANTS } from '../core/variantsCore';

interface VariantsState {
  variants: Variant[];
  activeId: string | null;
  /** Snapshot the studio into a new variant. `ramp` is the working output on screen. */
  capture: (name?: string, ramp?: RGB[]) => Variant;
  /** Write a variant back into the store + documents as ONE undo entry. */
  restore: (id: string) => void;
  /** Re-capture into an existing slot, keeping its id, name and creation time. */
  update: (id: string, ramp?: RGB[]) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => Variant | null;
}

const persist = (variants: readonly Variant[]): void => {
  // lsSet is already try/catch-wrapped (quota, private mode, SSR) — see
  // store/safeLocalStorage.ts. serializeVariants swallows a cyclic value.
  lsSet(VARIANTS_STORAGE_KEY, serializeVariants(variants));
};

const loadPersisted = (): Variant[] => {
  try {
    return parseVariants(lsGet(VARIANTS_STORAGE_KEY));
  } catch {
    return [];
  }
};

/** Deep-clone the three palette feature slices out of the engine store. */
const captureFeatures = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const engine = useEngineStore.getState() as unknown as Record<string, unknown>;
  for (const id of VARIANT_FEATURES) {
    const slice = engine[id];
    if (slice === undefined || slice === null) continue;
    const cloned = deepClone(slice);
    if (cloned !== undefined) out[id] = cloned;
  }
  return out;
};

/** Everything a capture reads, in one place, so `capture` and `update` cannot drift. */
const snapshotBody = (ramp?: RGB[]): Pick<Variant, 'features' | 'documents' | 'ramp'> => ({
  features: captureFeatures(),
  documents: stripFavients(serializeDocuments()),
  ramp: roundRamp(ramp),
});

export const useVariantsStore = create<VariantsState>((set, get) => ({
  variants: loadPersisted(),
  activeId: null,

  capture: (name, ramp) => {
    const existing = get().variants;
    const variant: Variant = {
      id: newVariantId(),
      name: (name ?? '').trim() || nextVariantName(existing.map((v) => v.name)),
      createdAt: Date.now(),
      ...snapshotBody(ramp),
    };
    const variants = capVariants([...existing, variant]);
    set({ variants, activeId: variant.id });
    persist(variants);
    return variant;
  },

  restore: (id) => {
    const variant = get().variants.find((v) => v.id === id);
    if (!variant) return;

    // ONE bracket around the whole switch: begin snapshots every registered
    // history provider AND the param slices, end diffs and pushes a single
    // entry. Writing the features and the documents inside the same bracket is
    // what makes a switch one Ctrl+Z instead of five.
    paramEdit(() => {
      const engine = useEngineStore.getState() as unknown as Record<string, unknown>;
      for (const featureId of VARIANT_FEATURES) {
        const patch = variant.features[featureId];
        if (!patch || typeof patch !== 'object' || Array.isArray(patch)) continue;
        const setter = engine[featureSetterName(featureId)];
        if (typeof setter !== 'function') continue;
        // Clone on the way IN as well: the setter merges the patch object's
        // values into the slice by reference, so handing it the stored object
        // would let a later slider drag mutate the variant.
        (setter as (p: unknown) => void)(deepClone(patch));
      }
      // `documents` was stripped of `favients` at capture, so this can only
      // reach the stops / generator / image providers.
      restoreDocuments(deepClone(variant.documents));
    });

    set({ activeId: id });
  },

  update: (id, ramp) => {
    const variants = get().variants.map((v) => {
      if (v.id !== id) return v;
      const body = snapshotBody(ramp);
      // No ramp supplied → keep the thumbnail the slot already has rather than
      // blanking it (an `update` from a context menu has no ramp to hand).
      return { ...v, ...body, ramp: body.ramp ?? v.ramp };
    });
    set({ variants, activeId: id });
    persist(variants);
  },

  rename: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const variants = get().variants.map((v) => (v.id === id ? { ...v, name: trimmed } : v));
    set({ variants });
    persist(variants);
  },

  remove: (id) => {
    const variants = get().variants.filter((v) => v.id !== id);
    set({ variants, activeId: get().activeId === id ? null : get().activeId });
    persist(variants);
  },

  duplicate: (id) => {
    const source = get().variants.find((v) => v.id === id);
    if (!source) return null;
    const existing = get().variants;
    const copy: Variant = {
      ...deepClone(source),
      id: newVariantId(),
      name: nextVariantName(existing.map((v) => v.name)),
      createdAt: Date.now(),
    };
    const variants = capVariants([...existing, copy]);
    set({ variants, activeId: copy.id });
    persist(variants);
    return copy;
  },
}));

/** Imperative read for non-React callers (event handlers, the blend slider). */
export const getVariants = (): Variant[] => useVariantsStore.getState().variants;
