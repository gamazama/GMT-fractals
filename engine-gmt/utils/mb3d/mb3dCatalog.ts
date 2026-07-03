/**
 * Browsable catalog of MB3D formulas GMT can load standalone (no scene file).
 *
 * = the 5 intern formulas (transpiled from MB3D source math) + every x87
 * [CODE] formula in {@link DECOMPILED_FORMULAS} that transpiles cleanly at its
 * authored defaults (filtered by a dry-run {@link transpileSlot} so the picker
 * never lists an entry that would fail on click). Grouped by a name-derived
 * category for the import modal.
 *
 * @see plans/mb3d/converter-design.md · loadDecompiledFormula / loadInternFormula
 */
import type { MB3DFormulaSlot } from './parseMB3D';
import { DECOMPILED_FORMULAS, DECOMPILED_DEFAULTS } from './decompiled-formulas';
import { transpileSlot } from './slotTranspiler';

export interface CatalogEntry {
  /** Display name. */
  label: string;
  /** Loader key: the decompiled formula name, or the intern formula. */
  kind: 'decompiled' | 'intern';
  /** decompiled: the [CODE] name; intern: the formula index 0..4. */
  ref: string | number;
  /** intern only: the default option values to seed. */
  internDefaults?: number[];
  category: string;
}

export interface CatalogGroup {
  category: string;
  entries: CatalogEntry[];
}

/** The 5 intern formulas (faithful MB3D source-math transpiles). */
const INTERN_CATALOG: CatalogEntry[] = [
  { label: 'Amazing Box (Mandelbox)', kind: 'intern', ref: 4, internDefaults: [2, 0.5, 1], category: 'Boxes & Folds' },
  { label: 'Integer Power (bulb)', kind: 'intern', ref: 0, internDefaults: [8, 1], category: 'Bulbs & Powers' },
  { label: 'Real Power (bulb)', kind: 'intern', ref: 1, internDefaults: [8, 1], category: 'Bulbs & Powers' },
  { label: 'Quaternion', kind: 'intern', ref: 2, internDefaults: [1, 0], category: 'Bulbs & Powers' },
  { label: 'Tricorn (Mandelbar)', kind: 'intern', ref: 3, internDefaults: [1, 1], category: 'Bulbs & Powers' },
];

/** Prettify a raw [CODE] name (`_sphereXinv` → `Sphere X Inv`). */
function prettify(name: string): string {
  return name
    .replace(/^_/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bIfs\b/gi, 'IFS')
    .trim();
}

/** Bucket a [CODE] name into a UI category. */
function categorize(name: string): string {
  const k = name.toLowerCase();
  if (/ifs|menger|sierpinski|koch|cantor|octa|octo|halfoct|cross/.test(k)) return 'IFS & Kaleidoscopic';
  if (/lorenz|rossler|vanderpol|rabinovich|dynamic|gnarl|hopalong/.test(k)) return 'Strange Attractors';
  if (/recipro|inv|sphere.*inv|cylindric|spherical|torical|torus|poincare|hyc3d|quadist/.test(k)) return 'Inversions & Mappings';
  if (/abs|flip|rotate|translat|scal|lincomb|conj|planefold|fold|sqr|updatec|quadray/.test(k)) return 'Transforms';
  if (/benesi|makin|quadray|dudley|rpow|square|sine|sinh|cos|martin|asdam|yplus/.test(k)) return 'Brots & Powers';
  return 'Other';
}

/**
 * Decompiled formulas that transpile + cross-check FAITHFULLY but render empty
 * as a standalone single-slot fractal at their authored defaults — they're
 * transform/IFS sub-formulas that only produce structure inside a hybrid weave.
 * Kept out of the standalone library so every listed entry renders (verified by
 * `debug/probe-mb3d-triage.mts`). They still weave normally inside scenes.
 */
const RENDER_EMPTY_STANDALONE = new Set<string>(['foldingoctIFS']);

/** Does this decompiled formula transpile cleanly at its defaults? */
function loadable(name: string): boolean {
  if (RENDER_EMPTY_STANDALONE.has(name)) return false;
  const d = DECOMPILED_DEFAULTS[name] ?? { optionTypes: [], optionValues: [], optionCount: 0 };
  const slot: MB3DFormulaSlot = {
    iterCount: 0, formulaIndex: 20, name,
    optionCount: d.optionCount, optionTypes: d.optionTypes, optionValues: d.optionValues,
  };
  try {
    return transpileSlot(slot, 0, 'probe', { parametric: true }).tier !== 'unsupported';
  } catch {
    return false;
  }
}

let cached: CatalogGroup[] | null = null;

/** Grouped catalog of all loadable MB3D formulas (memoized). */
export function getMB3DCatalog(): CatalogGroup[] {
  if (cached) return cached;
  const entries: CatalogEntry[] = [...INTERN_CATALOG];
  for (const name of Object.keys(DECOMPILED_FORMULAS).sort()) {
    if (!loadable(name)) continue;
    entries.push({ label: prettify(name), kind: 'decompiled', ref: name, category: categorize(name) });
  }
  const ORDER = ['Boxes & Folds', 'Bulbs & Powers', 'IFS & Kaleidoscopic', 'Brots & Powers', 'Inversions & Mappings', 'Strange Attractors', 'Transforms', 'Other'];
  const byCat = new Map<string, CatalogEntry[]>();
  for (const e of entries) (byCat.get(e.category) ?? byCat.set(e.category, []).get(e.category)!).push(e);
  cached = [...byCat.keys()]
    .sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99))
    .map((category) => ({ category, entries: byCat.get(category)!.sort((a, b) => a.label.localeCompare(b.label)) }));
  return cached;
}

/** Total count of loadable formulas (for UI copy). */
export function getMB3DCatalogCount(): number {
  return getMB3DCatalog().reduce((n, g) => n + g.entries.length, 0);
}
