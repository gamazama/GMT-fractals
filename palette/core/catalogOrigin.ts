/**
 * catalogOrigin — where a catalogue gradient came from, carried for as long as it is
 * UNMODIFIED, and the two places that provenance is shown: category names and export names.
 *
 * Owner decisions, 2026-09-13 (`plans/palette-catalogue-licensing.md`, "What was done"):
 *   • provenance goes IN THE CATEGORY NAMES — "cpt-city · gacruxa (CC BY 3.0)" — not in any
 *     per-tile or hero UI. `categoryName` is that one formatter; the Sources toggles, the
 *     wall's group-by-source / by-collection bands and the search index all call it.
 *   • exports carry the source ONLY when the gradient is unmodified, IN THE NAME ("the only
 *     widely supported field … it should be small where possible"): "Name (cpt-city/gacruxa,
 *     CC BY 3.0)". `exportNameFor` is that one formatter; `gradient-explorer/v2/exportActions.ts`
 *     is the one place it is applied, for a single export and for each member of a set.
 *
 * WHAT "UNMODIFIED" MEANS, mechanically. A pick stamps a `CatalogOrigin` whose `key` is the
 * content key (`originKey`) of the config the pick produced. The origin then rides the drag
 * payload, the working input and the favourite, untouched — and at export time it counts
 * only if the gradient in hand still has that key. So an edit, an Adjust dial, a Curves pass
 * or an in-place Recent refresh drops the credit without anybody having to clear anything,
 * and an origin that reached the wrong config by some future path is simply ignored.
 *
 * Old data: favourites saved before 2026-09-13 have no `origin` (they stored `'Picker'` and
 * dropped the bundle), so they export exactly as they always did. Old baked bundles have no
 * collections, so a pick from them gets a bundle-level credit (the label alone).
 *
 * @invariant `exportNameFor(name, origin, config)` appends the credit iff `origin` is
 *   well-formed and `originKey(config) === origin.key`; otherwise it returns `name`
 *   unchanged — proven by: `npx tsx debug/test-palette-catalog-licensing.mts` ("export
 *   name: unmodified gets the credit", "export name: one stop moved exports as today").
 *   Falsified 2026-09-13 by dropping the key comparison.
 * @invariant a RAMP gradient's key is its ramp: an unmodified ramp pick keeps its credit, one
 *   texel changed drops it, and a different ramp never inherits it — proven by:
 *   `npx tsx debug/test-palette-catalog-licensing.mts` ("a ramp pick keeps its credit while
 *   unmodified", "one texel changed drops a ramp's credit", "another ramp does not inherit
 *   the credit"). Falsified 2026-09-14 by removing the ramp branch, see the harness header.
 * @see docs/adr/0122-the-ramp-is-the-gradient.md
 */

import type { GradientConfig } from '../../types';
import { isRampGradient } from '../../utils/gradientRamp';

export interface CatalogOrigin {
  /** `<bundle>:<collection>` (or `<bundle>` for an old bundle without collections). */
  ref: string;
  /** The short credit an export name carries, e.g. "cpt-city/gacruxa, CC BY 3.0". */
  credit: string;
  /** `originKey` of the config the pick produced. */
  key: string;
}

/**
 * Content key, by the gradient's FORM (ADR-0122):
 *   • a STOP gradient — every stop field an edit can change, plus the blend space. Byte-identical
 *     to the key before ADR-0122, so origins stamped then still match.
 *   • a RAMP gradient (`stops: []` + a well-formed `ramp`) — `ramp:` + the ramp string. Every
 *     texel is in it, so any edit that reaches the texels changes the key; the blend space is
 *     left out because it is inert on a ramp. Without this branch every ramp gradient would
 *     share the key of an empty stop list (`oklab|`) and one catalogue ramp's credit would ride
 *     any other ramp.
 * The two cannot collide: a stop key contains `|`, which base64 does not.
 */
export const originKey = (c: GradientConfig | null | undefined): string => {
  if (isRampGradient(c)) return `ramp:${c.ramp}`;
  const stops = Array.isArray(c?.stops) ? c!.stops : [];
  const parts = stops.map(
    (s) =>
      `${Math.round((Number(s?.position) || 0) * 10000)}:${String(s?.color ?? '').toUpperCase()}:${s?.interpolation ?? 'linear'}:${Number.isFinite(s?.bias) ? Math.round((s!.bias as number) * 1000) : ''}`,
  );
  return `${c?.blendSpace ?? ''}|${parts.join(',')}`;
};

const MAX_CREDIT = 80;

/** Validate an untrusted origin (localStorage, a scene file, a drag payload). Never throws. */
export const coerceOrigin = (v: unknown): CatalogOrigin | null => {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.ref !== 'string' || typeof o.credit !== 'string' || typeof o.key !== 'string') return null;
  const credit = o.credit.trim();
  if (!o.ref || !credit || credit.length > MAX_CREDIT) return null;
  return { ref: o.ref, credit, key: o.key };
};

/** The origin when `config` is still the gradient it was stamped on, else null. */
export const unmodifiedOrigin = (origin: unknown, config: GradientConfig | null | undefined): CatalogOrigin | null => {
  const o = coerceOrigin(origin);
  return o && config && originKey(config) === o.key ? o : null;
};

/** Stamp an origin on a config a catalogue pick just produced. */
export const stampOrigin = (ref: string, credit: string, config: GradientConfig): CatalogOrigin => ({ ref, credit, key: originKey(config) });

/**
 * The name an export carries: `Name (credit)` for an unmodified catalogue gradient, the name
 * untouched otherwise. A name that already ends with this exact credit is not suffixed twice
 * (a user who re-exports a file named by an earlier export).
 */
export const exportNameFor = (name: string, origin: unknown, config: GradientConfig | null | undefined): string => {
  const o = unmodifiedOrigin(origin, config);
  if (!o) return name;
  const suffix = `(${o.credit})`;
  const base = name.trim();
  return base.endsWith(suffix) ? base : `${base} ${suffix}`;
};

/** A set member as it exports (`runSetExport` / `runSetImage`): the credit appended to its name
 *  iff it is an unmodified catalogue gradient — its own `origin` still matches its own config.
 *  The same object otherwise, so a set with no catalogue members exports byte-identically. */
export const withExportName = <T extends { name: string; config: GradientConfig; origin?: unknown }>(f: T): T => {
  const name = exportNameFor(f.name, f.origin, f.config);
  return name === f.name ? f : { ...f, name };
};

/** What a source category is called: "uiGradients (MIT)", "cpt-city · gacruxa (CC BY 3.0)".
 *  An old bundle with no tag is just its label. */
export const categoryName = (label: string, tag?: string | null): string => (tag ? `${label} (${tag})` : label);

/**
 * The origin a pick of catalogue entry `e` stamps on `config` (the config the pick produced),
 * or null for anything that is not a catalogue entry (a built-in preset, an ad-hoc ramp, a
 * favourite). The collection's baked credit when the pack has collections (v2); the source's
 * own name and tag when it does not (a v1 pack still on the CDN).
 */
export const entryOrigin = (
  e: { bundle?: string; src?: string },
  config: GradientConfig,
  bundles: Record<string, { label: string; tag?: string; userMade?: boolean }>,
  collections: Record<string, { credit: string }>,
): CatalogOrigin | null => {
  if (!e.bundle) return null;
  const ref = e.src ? `${e.bundle}:${e.src}` : e.bundle;
  const b = bundles[e.bundle];
  // A user-made live source (GX Global) has no licence to carry: nothing to credit.
  if (b?.userMade) return null;
  const credit = (e.src && collections[ref]?.credit) || (b ? (b.tag ? `${b.label}, ${b.tag}` : b.label) : '');
  return credit ? stampOrigin(ref, credit, config) : null;
};
