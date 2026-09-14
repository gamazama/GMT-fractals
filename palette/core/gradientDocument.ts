/**
 * gradientDocument — THE payload of a GMT gradient file (ADR-0123 Decision 1), and the one reader
 * for every JSON shape a gradient can arrive in. Pure: no store, no DOM, no File.
 *
 *   { "format": "gmt-gradients", "version": 1,
 *     "gradients": [ { "name", "config", "group"?, "origin"?, "source"?, "createdAt"? } ],
 *     "groups"?: { "<group id>": "<label>" } }
 *
 * One gradient, one set and the whole shelf are the same document with more entries. The PNG file
 * carries it in an iTXt chunk (`gradientPng.ts`); `.gmt-gradients.json` is the same text.
 *
 * `decodeGradientDocument` reads, besides the document:
 *   - the LEGACY Favients collection `{version: 1, favients, groupLabels}` — what
 *     `favientsStore.exportCollection` wrote before ADR-0123 (scene files embed it too);
 *   - a GX Global wire `{items: [{name, config}]}` (`globalSet.parseGlobalSet`);
 *   - a bare config, or the editor's Copy shape `{stops, colorSpace, blendSpace}`
 *     (`AdvancedGradientEditor.handleCopy`), optionally with a `name`; `{name, config}`; a bare
 *     array of stop objects;
 *   - and it RECOGNISES a GX session envelope (`format: 'gmt-gx-session'`, `store/sessionEnvelope.ts`)
 *     so the router can hand the file to the session loader instead of calling it unreadable.
 * Anything else is `refused` with a reason; `not-gradients` tells the router to try the colour-list
 * text parsers (`importFormats.parseJson`) next.
 *
 * THE GATE: every config goes through `coerceGradientConfig` (both ADR-0122 forms, ≥ 2 valid stops,
 * stop ids minted where missing or repeated). One leniency, for the collection shapes only: a stop
 * list whose EVERY stop is well-formed but which has a single stop is kept (with ids ensured) —
 * that is what the store's import gate has always admitted, and a shelf restored from its own file
 * must not lose a favourite (ADR-0123 Consequences: "existing shelves lose nothing"). Origins go
 * through `coerceOrigin`; group ids and labels skip `__proto__` / `constructor` / `prototype`.
 *
 * Never throws; versioned — a `gmt-gradients` document of another version is refused as `version`,
 * never half-read.
 *
 * @invariant a document encodes and decodes back to the same stops, bias, interpolation, blend,
 *   colour space, ramp, name, group, origin, source and createdAt, and a legacy collection, a GX
 *   wire, a bare config and the editor copy all decode — proven by: `npm run test:gradient-file`
 *   ("[1] document round trip is exact", "[1] legacy collection reads", "[1] editor copy reads
 *   exactly"). Falsified 2026-09-14, see the harness header.
 * @see docs/adr/0123-the-gradient-file-is-a-png.md
 * @see palette/core/importGradientFiles.ts (the router that calls this)
 */

import type { GradientConfig } from '../../types';
import { coerceGradientConfig, ensureStopIds } from './editorConfig';
import { coerceOrigin, type CatalogOrigin } from './catalogOrigin';
import { parseGlobalSet } from './globalSet';
import { normalizeGradientConfig } from '../../utils/gradientRamp';

export const GRADIENT_DOCUMENT_FORMAT = 'gmt-gradients';
export const GRADIENT_DOCUMENT_VERSION = 1;
/** Mirror of `palette/store/workingSession.ts` `WORKING_SESSION_FORMAT` — that module pulls the
 *  engine store, and this one must stay pure. `npm run test:gradient-file` pins the two equal. */
export const GX_SESSION_FORMAT = 'gmt-gx-session';

export interface GradientDocumentEntry {
  /** The name as typed. */
  name: string;
  /** Either ADR-0122 form, verbatim (stop ids optional on the wire). */
  config: GradientConfig;
  group?: string;
  origin?: CatalogOrigin;
  source?: string;
  createdAt?: number;
}

export interface GradientDocument {
  format: typeof GRADIENT_DOCUMENT_FORMAT;
  version: typeof GRADIENT_DOCUMENT_VERSION;
  gradients: GradientDocumentEntry[];
  groups?: Record<string, string>;
}

/** What an encoder accepts — a `Favient` is one. */
export interface GradientDocumentInput {
  name: string;
  config: GradientConfig;
  group?: string;
  origin?: unknown;
  source?: string;
  createdAt?: number;
}

/** Which shape a decoded payload came in. `document` and `collection` carry sets; the rest don't. */
export type GradientPayloadFormat = 'document' | 'collection' | 'global' | 'config';

export type GradientPayloadRead =
  | {
      kind: 'gradients';
      format: GradientPayloadFormat;
      gradients: GradientDocumentEntry[];
      /** Group id → label, safe keys only. `{}` when the payload names none. */
      groups: Record<string, string>;
      /** Entries present but refused by the gate. */
      skipped: number;
    }
  /** A GX session envelope: hand the TEXT to the session loader (`applySessionText`). */
  | { kind: 'session'; format: string }
  | { kind: 'refused'; reason: 'not-json' | 'version' | 'not-gradients'; version?: number };

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_ENTRIES = 50_000;
const MAX_NAME = 200;
const MAX_ID = 200;
const MAX_SOURCE = 200;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

const safeId = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 && v.length <= MAX_ID && !UNSAFE_KEYS.has(v) ? v : undefined;

/** Group labels with safe keys and string values. The unsafe keys are skipped BEFORE the bracket
 *  write, so `out['__proto__'] = …` can never reach the prototype setter. */
const safeGroups = (v: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!isObj(v)) return out;
  for (const k of Object.keys(v)) {
    const id = safeId(k);
    const label = v[k];
    if (id && typeof label === 'string') out[id] = label.slice(0, MAX_NAME);
  }
  return out;
};

/** The one-stop leniency described in the header: every stop well-formed, at least one. */
const singleStopConfig = (c: unknown): GradientConfig | null => {
  if (!isObj(c) || !Array.isArray(c.stops) || c.stops.length !== 1) return null;
  const s = c.stops[0] as Record<string, unknown> | null;
  if (!isObj(s) || typeof s.color !== 'string' || !Number.isFinite(s.position)) return null;
  // Validate through THE gate rather than a second copy of its rules: the same stop twice is a
  // two-stop gradient `coerceGradientConfig` judges (hex, position, bias, interpolation, spaces),
  // and the first of its stops is the one this entry had.
  const twice = coerceGradientConfig({ ...c, stops: [s, { ...s, id: '' }] });
  return twice ? { ...twice, stops: ensureStopIds([twice.stops[0]]) } : null;
};

/** One entry through the gate, or null. `lenient` admits the one-stop legacy case. */
const readEntry = (raw: unknown, lenient: boolean): GradientDocumentEntry | null => {
  if (!isObj(raw)) return null;
  const config = coerceGradientConfig(raw.config) ?? (lenient ? singleStopConfig(raw.config) : null);
  if (!config) return null;
  const e: GradientDocumentEntry = { name: typeof raw.name === 'string' ? raw.name.slice(0, MAX_NAME) : '', config };
  const group = safeId(raw.group);
  if (group) e.group = group;
  const origin = coerceOrigin(raw.origin);
  if (origin) e.origin = origin;
  if (typeof raw.source === 'string' && raw.source) e.source = raw.source.slice(0, MAX_SOURCE);
  if (typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)) e.createdAt = raw.createdAt;
  return e;
};

const readEntries = (arr: unknown[], lenient: boolean): { gradients: GradientDocumentEntry[]; skipped: number } => {
  const gradients: GradientDocumentEntry[] = [];
  let skipped = Math.max(0, arr.length - MAX_ENTRIES);
  for (let i = 0; i < Math.min(arr.length, MAX_ENTRIES); i++) {
    const e = readEntry(arr[i], lenient);
    if (e) gradients.push(e);
    else skipped++;
  }
  return { gradients, skipped };
};

/** True for the GX session envelope shape (`store/sessionEnvelope.ts`) under its format tag. */
export const isGxSessionEnvelope = (v: unknown): boolean =>
  isObj(v) && v.format === GX_SESSION_FORMAT && typeof v.version === 'number' && isObj(v.body);

/**
 * Read an untrusted payload — a JSON string, or a value already parsed. Never throws.
 */
export const decodeGradientDocument = (json: unknown): GradientPayloadRead => {
  let v: unknown = json;
  if (typeof json === 'string') {
    try {
      v = JSON.parse(json.charCodeAt(0) === 0xfeff ? json.slice(1) : json);
    } catch {
      return { kind: 'refused', reason: 'not-json' };
    }
  }
  try {
    if (Array.isArray(v)) {
      // A bare stop list, as the editor's paste accepts. Only when EVERY item is a stop object;
      // a colour list is the text parser's.
      const allStops = v.length >= 2 && v.every((s) => isObj(s) && Number.isFinite(Number(s.position)) && typeof s.color === 'string');
      const config = allStops ? everyStopKept({ stops: v }) : null;
      return config
        ? { kind: 'gradients', format: 'config', gradients: [{ name: '', config }], groups: {}, skipped: 0 }
        : { kind: 'refused', reason: 'not-gradients' };
    }
    if (!isObj(v)) return { kind: 'refused', reason: 'not-gradients' };

    if (v.format === GRADIENT_DOCUMENT_FORMAT) {
      if (v.version !== GRADIENT_DOCUMENT_VERSION) {
        return { kind: 'refused', reason: 'version', ...(typeof v.version === 'number' ? { version: v.version } : {}) };
      }
      if (!Array.isArray(v.gradients)) return { kind: 'refused', reason: 'not-gradients' };
      const { gradients, skipped } = readEntries(v.gradients, true);
      return { kind: 'gradients', format: 'document', gradients, groups: safeGroups(v.groups), skipped };
    }

    if (isGxSessionEnvelope(v)) return { kind: 'session', format: GX_SESSION_FORMAT };

    if (Array.isArray(v.favients)) {
      // The legacy collection. It was always written as version 1; one written under another
      // number is a format this build has never seen.
      if (v.version !== undefined && v.version !== 1) {
        return { kind: 'refused', reason: 'version', ...(typeof v.version === 'number' ? { version: v.version } : {}) };
      }
      const { gradients, skipped } = readEntries(v.favients, true);
      return { kind: 'gradients', format: 'collection', gradients, groups: safeGroups(v.groupLabels), skipped };
    }

    if (Array.isArray(v.items)) {
      const favs = parseGlobalSet(v);
      if (!favs.length) return { kind: 'refused', reason: 'not-gradients' };
      return {
        kind: 'gradients',
        format: 'global',
        gradients: favs.map((f) => ({ name: f.name, config: f.config, source: f.source })),
        groups: {},
        skipped: Math.max(0, v.items.length - favs.length),
      };
    }

    const name = typeof v.name === 'string' ? v.name.slice(0, MAX_NAME) : '';
    if (Array.isArray(v.stops)) {
      const config = everyStopKept(v);
      return config
        ? { kind: 'gradients', format: 'config', gradients: [{ name, config }], groups: {}, skipped: 0 }
        : { kind: 'refused', reason: 'not-gradients' };
    }
    if (isObj(v.config)) {
      const config = everyStopKept(v.config);
      if (config) return { kind: 'gradients', format: 'config', gradients: [{ name, config }], groups: {}, skipped: 0 };
    }
    return { kind: 'refused', reason: 'not-gradients' };
  } catch {
    return { kind: 'refused', reason: 'not-gradients' };
  }
};

/**
 * A BARE config (a stop list, `{stops}`, `{config}` — not a document or collection entry, which
 * have their own lenient reader) is only a gradient we can reproduce when the gate keeps EVERY
 * stop. A list it thins (a stop with no position, an `rgb()` colour) is refused here so the
 * router hands the file to the colour reader — what `exactJsonConfig` in importFormats.ts does
 * with the same input. The two gates must agree, or the router imports a silently thinned
 * gradient (found by the round-trip guard's probe, 2026-09-14).
 */
const everyStopKept = (raw: unknown): GradientConfig | null => {
  const config = coerceGradientConfig(raw);
  const given = isObj(raw) && Array.isArray(raw.stops) ? raw.stops.length : -1;
  return config && config.stops.length === given ? config : null;
};

/** A deep copy of a config in one of the two forms (a stale `ramp` dropped), so the document
 *  never aliases a live store object. */
const cloneConfig = (c: GradientConfig): GradientConfig => JSON.parse(JSON.stringify(normalizeGradientConfig(c))) as GradientConfig;

/**
 * Build the document. Entries keep their order; `group`, `origin`, `source` and `createdAt` are
 * written only when present (an origin only when well-formed), so a plain gradient is
 * `{name, config}`. `groups` keeps every safe label it is given.
 */
export const encodeGradientDocument = (
  entries: ReadonlyArray<GradientDocumentInput>,
  groups?: Readonly<Record<string, string>>,
): GradientDocument => {
  const gradients = entries.map((f): GradientDocumentEntry => {
    const e: GradientDocumentEntry = { name: String(f.name ?? ''), config: cloneConfig(f.config) };
    const group = safeId(f.group);
    if (group) e.group = group;
    const origin = coerceOrigin(f.origin);
    if (origin) e.origin = origin;
    if (typeof f.source === 'string' && f.source) e.source = f.source;
    if (typeof f.createdAt === 'number' && Number.isFinite(f.createdAt)) e.createdAt = f.createdAt;
    return e;
  });
  const doc: GradientDocument = { format: GRADIENT_DOCUMENT_FORMAT, version: GRADIENT_DOCUMENT_VERSION, gradients };
  const g = safeGroups(groups);
  if (Object.keys(g).length) doc.groups = g;
  return doc;
};

/** The document as text: pretty for a `.gmt-gradients.json` a person may read, compact inside a PNG. */
export const gradientDocumentText = (doc: GradientDocument, pretty = true): string =>
  pretty ? JSON.stringify(doc, null, 2) : JSON.stringify(doc);

/** The distinct sets a decoded payload's entries sit in: '' for none (Kept). */
export const entrySets = (gradients: ReadonlyArray<GradientDocumentEntry>): Set<string> =>
  new Set(gradients.map((g) => g.group ?? ''));
