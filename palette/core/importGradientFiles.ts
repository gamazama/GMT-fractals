/**
 * importGradientFiles — THE ONE LOADER for gradient files (ADR-0123 Decision 3). Every entrance —
 * the file picker, a drop anywhere, the collection menu — hands its files here, and this module
 * decides what each one IS by its CONTENT, not by its extension or by which menu was used:
 *
 *   PNG  → the `gmt-gradients` metadata → the document (exact: stops, bias, interpolation, blend,
 *          colour space, name, set, credit); no metadata but our band layout → exact colours as
 *          ramp gradients; a scene PNG → reported as a scene; anything else → reported as an
 *          IMAGE for the caller's image extraction (`gradientPng.ts`).
 *   .zip → every entry through this same router (one level deep).
 *   JSON → the GMT gradients document / the legacy Favients collection → the payload; a GX
 *          session envelope → reported as a SESSION for the session loader; a GX Global wire; a
 *          bare config or the editor's `{stops}` copy → exact stops (`gradientDocument.ts`);
 *          anything else → the colour-list parsers below.
 *   text (.map .gpl .ggr .cpt .css .json …) → `importFormats.parseGradientText`: the `config` it
 *          returns verbatim when it has one, else `rampToGradientConfig` (ADR-0122: stops when
 *          cheap and faithful, else the ramp); the `name` the file carries when it carries one.
 *
 * A SCENE entrance (app-gmt's scene drop, File ▸ Load Scene) asks `takeFromSceneLoader` first, a
 * narrower rule than the router's — a scene must never be taken, and the scene loader reads any
 * JSON as a preset (2026-09-16).
 *
 * NAMES: the file's own name wins. The FILENAME is only a fallback, un-slugged (`_` → space,
 * trimmed, extension dropped — `.gmt-gradients.json` / `.gxsession.json` as one extension), and
 * numbered when one file yields several nameless gradients.
 *
 * WHERE AN IMPORT LANDS (ADR-0123 Decision 4), per file, in `importGradientsInto`:
 *   1. a document naming MORE THAN ONE set (Kept and Recent count as sets) is a COLLECTION: it
 *      merges (`favientsStore.importEntries`, never a replace), every gradient back in its set,
 *      deduped against the whole shelf;
 *   2. else `group`, when the caller passes one the user owns (anything but Recent; Kept is
 *      DEFAULT_GROUP) — deduped within that set;
 *   3. else a document naming exactly ONE set lands in the user's set with that LABEL, created when
 *      missing;
 *   4. else Kept.
 * The outcome carries the destination group id (or null when files landed in several places or a
 * collection merged) so the UI can reveal it (ADR-0119).
 *
 * Callers own the undo bracket: wrap `importGradientsInto` in `paramEdit` so a batch is ONE
 * entry. Read the files FIRST (`readGradientFiles` is async) and keep the bracket synchronous —
 * holding a param transaction open across an await risks another gesture's
 * `beginParamTransaction` clobbering the engine's single interaction snapshot.
 *
 * Not pure — `readGradientFiles` touches `File` and `importGradientsInto` writes the store. The
 * routing (`routeGradientFile`, `parseGradientImports`) is pure and never throws.
 *
 * @invariant `parseGradientImports` never throws on arbitrary file content, and every
 *   item it returns carries a non-empty name — proven by:
 *   `npm run test:palette-shelf` (`debug/test-palette-shelf-manage.mts`)
 *   ("parse: hostile and malformed input is skipped, never thrown",
 *    "parse: every imported item has a non-empty name").
 * @invariant A dense 256-entry `.map` imports as a RAMP gradient carrying its texels exactly, and
 *   a simple one as stops — proven by: `npx tsx debug/test-palette-importformats.mts`
 *   ("import: a dense .map is a ramp gradient", "import: its texels are the file's",
 *   "import: a simple .map is stops").
 * @invariant a session JSON routes as a session, a scene PNG as a scene, a foreign PNG as an image,
 *   a zip imports every entry in order, and the destination rule above holds — proven by:
 *   `npm run test:gradient-file` ("[4] a session JSON is routed as a session", "[4] a scene PNG is
 *   routed as a scene", "[4] a foreign PNG is routed as an image", "[4] zip entries import in
 *   order", "[5] a group the user owns wins", "[5] no group: a one-set document lands in a NEW
 *   set", "[5] a document naming several sets merges as a collection", "[5] no group, no set
 *   named: Kept"). Falsified 2026-09-14, see the harness header.
 * @invariant `takeFromSceneLoader` (the SCENE entrance — app-gmt's scene drop and File ▸ Load Scene)
 *   never takes a PNG carrying a scene key, a JSON that is not a gradients document, a `.gmf` or a
 *   nameless file, even where the router alone would import it — proven by: `npm run
 *   test:gradient-file` ("[9] a PNG carrying a scene key stays the scene loader's, …", "[9] a bare
 *   {stops} JSON the router would import stays the scene loader's", "[9] a .gmf is never looked at,
 *   whatever it holds"). Falsified 2026-09-16 three ways, see the harness header.
 * @see palette/installGradientFileClaim.ts (the scene entrance's claim)
 * @see palette/core/gradientDocument.ts (the payload and its gate)
 * @see palette/core/gradientPng.ts (the PNG)
 * @see palette/core/importFormats.ts (the text parsers)
 * @see docs/adr/0123-the-gradient-file-is-a-png.md
 */

import type { GradientConfig } from '../../types';
import { unzipSync } from 'fflate';
import { parseGradientText, IMPORT_EXTENSIONS, type ImportResult } from './importFormats';
import { rampToGradientConfig } from './stopFit';
import { decodeGradientDocument, type GradientDocumentEntry } from './gradientDocument';
import { readGradientPng, SCENE_PNG_KEYWORDS } from './gradientPng';
import type { CatalogOrigin } from './catalogOrigin';
import { KEPT_LABEL } from './groundSets';
import { isPng, listPngTextKeywords } from '../../utils/pngCodec';
import { isStopGradient, isRampGradient } from '../../utils/gradientRamp';
import { DEFAULT_GROUP, RECENT_GROUP, isRecentGroup, newGroupId, useFavientsStore } from '../store/favientsStore';

/** Every extension a gradient-file picker offers: the text formats, the GMT PNG and a .zip of
 *  any of them. `.gmt-gradients.json` is `.json`. */
export const GRADIENT_FILE_EXTENSIONS: readonly string[] = [...IMPORT_EXTENSIONS, 'png', 'zip'];

/** `accept` attribute for a gradient-file picker. */
export const GRADIENT_FILE_ACCEPT: string = GRADIENT_FILE_EXTENSIONS.map((e) => '.' + e).join(',');

/** Does this filename look like a gradient file? (A hint for a picker or a drop filter only — the
 *  router itself decides by content.) */
export const isGradientFileName = (name: string): boolean => GRADIENT_FILE_EXTENSIONS.includes(extOf(name));

const extOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
};

const DOUBLE_EXTENSIONS = /\.(gmt-gradients|gxsession)$/i;

/**
 * The fallback name from a filename: directory and extension dropped, `_` read as a space (our own
 * older downloads were slugged), trimmed. `imported` when nothing is left.
 */
export const gradientNameFromFile = (name: string): string => {
  const cut = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
  const file = cut >= 0 ? name.slice(cut + 1) : name;
  const dot = file.lastIndexOf('.');
  const stem = (dot > 0 ? file.slice(0, dot) : file).replace(DOUBLE_EXTENSIONS, '');
  return stem.replace(/_/g, ' ').trim() || 'imported';
};

/** A file already read. `text` is its UTF-8 text ('' for a binary file); `bytes`, when present,
 *  is what the router reads — callers that only have text may omit it. */
export interface ReadGradientFile {
  name: string;
  text: string;
  bytes?: Uint8Array;
}

export interface ParsedGradientImport {
  config: GradientConfig;
  name: string;
  /** Provenance line shown under the name, e.g. `Import · .ggr`, or the document's own. */
  source: string;
  /** The set the file put it in (documents only; ids are the file's). */
  group?: string;
  origin?: CatalogOrigin;
  createdAt?: number;
}

/** One file (or one zip entry) after routing. */
export type RoutedGradientFile =
  | {
      kind: 'gradients';
      name: string;
      items: ParsedGradientImport[];
      /** Group id → label the file carries. */
      groups: Record<string, string>;
      /** A GMT gradients document or legacy collection — its sets MEAN something (the destination rule). */
      document: boolean;
      /** Entries the gate refused inside a readable file. */
      skipped: number;
    }
  /** A GX session envelope. Hand `text` to the session loader (`applySessionText`). */
  | { kind: 'session'; name: string; text: string }
  /** A GMT scene PNG. */
  | { kind: 'scene'; name: string }
  /** An image that is not a gradient file — for image extraction, if the caller does that. */
  | { kind: 'image'; name: string; bytes: Uint8Array }
  | { kind: 'unreadable'; name: string };

export interface ParsedGradientImports {
  /** Every gradient, flattened, in file order. */
  items: ParsedGradientImport[];
  /** Unreadable files plus refused entries inside readable ones. */
  skipped: number;
  files: RoutedGradientFile[];
  sessions: { name: string; text: string }[];
  scenes: string[];
  images: { name: string; bytes: Uint8Array }[];
}

export interface ImportOutcome {
  imported: number;
  /** Everything not imported: unreadable files, refused entries AND duplicates (so it stays
   *  comparable with what it counted before ADR-0123). `duplicates` is the part that was already there. */
  skipped: number;
  /** Of `skipped`: gradients already in their destination (or, for a collection merge, on the shelf). */
  duplicates?: number;
  /** The group every imported / duplicate gradient landed in; null when several, or a collection
   *  merged; undefined when nothing landed. DEFAULT_GROUP is Kept. */
  destination?: string | null;
  /** The destination's label for the summary (`Kept` for the default group). */
  destinationLabel?: string;
  /** A multi-set document was merged as a collection. */
  collection?: boolean;
  /** Session files — not imported; the UI hands each `text` to the session loader. */
  sessions?: { name: string; text: string }[];
  /** Scene PNGs — not imported. */
  scenes?: string[];
  /** Images that carry no gradient file — not imported; the drop path may extract from them. */
  images?: { name: string; bytes: Uint8Array }[];
}

const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 2000;
const MAX_ZIP_ENTRY_BYTES = 32 * 1024 * 1024;

const utf8 = new TextDecoder();

const isZip = (b: Uint8Array): boolean =>
  b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && ((b[2] === 3 && b[3] === 4) || (b[2] === 5 && b[3] === 6));

/** Name the nameless: the filename, numbered when the file yields several. */
const nameAll = <T extends { name: string }>(items: T[], fileName: string): T[] => {
  const base = gradientNameFromFile(fileName);
  const nameless = items.filter((i) => !i.name.trim()).length;
  let n = 0;
  return items.map((i) => (i.name.trim() ? i : { ...i, name: nameless > 1 ? `${base} ${++n}` : base }));
};

const fromEntries = (entries: GradientDocumentEntry[], fileName: string, fallbackSource: string): ParsedGradientImport[] =>
  nameAll(
    entries.map((e) => ({
      config: e.config,
      name: e.name,
      source: e.source ?? fallbackSource,
      ...(e.group ? { group: e.group } : {}),
      ...(e.origin ? { origin: e.origin } : {}),
      ...(typeof e.createdAt === 'number' ? { createdAt: e.createdAt } : {}),
    })),
    fileName,
  );

/** A text parser result as a config: its own `config` verbatim when it is a real gradient, else
 *  the automatic fit (ADR-0122). */
const configOf = (res: ImportResult): GradientConfig => {
  const own = (res as ImportResult & { config?: unknown }).config;
  if (isStopGradient(own) || isRampGradient(own)) return own as GradientConfig;
  // parseGradientText guarantees a 256-length ramp, so the fit won't throw.
  return rampToGradientConfig(res.ramp, { targetDE: 0.02, maxStops: 32 });
};

const routeText = (name: string, text: string): RoutedGradientFile => {
  const head = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lead = head.trimStart()[0];
  if (lead === '{' || lead === '[') {
    const read = decodeGradientDocument(head);
    if (read.kind === 'session') return { kind: 'session', name, text };
    if (read.kind === 'gradients') {
      const document = read.format === 'document' || read.format === 'collection';
      if (read.gradients.length || document) {
        return {
          kind: 'gradients',
          name,
          items: fromEntries(read.gradients, name, `Import · .${document ? 'json' : extOf(name) || 'json'}`),
          groups: read.groups,
          document,
          skipped: read.skipped,
        };
      }
    }
    // A gradients document of another version is not a colour list — do not sniff it as one.
    if (read.kind === 'refused' && read.reason === 'version') return { kind: 'unreadable', name };
  }
  const res = parseGradientText(head, extOf(name));
  if (!res) return { kind: 'unreadable', name };
  const own = (res as ImportResult & { name?: unknown }).name;
  const item: ParsedGradientImport = {
    config: configOf(res),
    name: typeof own === 'string' && own.trim() ? own : '',
    source: `Import · .${res.format}`,
  };
  return { kind: 'gradients', name, items: nameAll([item], name), groups: {}, document: false, skipped: 0 };
};

/**
 * Route ONE file by its content. A zip yields one routed file per entry; everything else yields
 * one. Pure; never throws.
 */
export const routeGradientFile = (read: ReadGradientFile, depth = 0): RoutedGradientFile[] => {
  const name = read.name;
  try {
    const bytes = read.bytes;
    if (bytes && bytes.length > MAX_FILE_BYTES) return [{ kind: 'unreadable', name }];
    if (bytes && isPng(bytes)) {
      const png = readGradientPng(bytes);
      if (png.kind === 'document') {
        const document = png.format === 'document' || png.format === 'collection';
        return [{ kind: 'gradients', name, items: fromEntries(png.gradients, name, 'Import · .png'), groups: png.groups, document, skipped: png.skipped }];
      }
      if (png.kind === 'bands') {
        const items = png.configs.map((config) => ({ config, name: '', source: 'Import · .png' }));
        return [{ kind: 'gradients', name, items: nameAll(items, name), groups: {}, document: false, skipped: 0 }];
      }
      if (png.kind === 'scene') return [{ kind: 'scene', name }];
      return [{ kind: 'image', name, bytes }];
    }
    if (bytes && isZip(bytes)) {
      if (depth > 0) return [{ kind: 'unreadable', name }];
      let count = 0;
      const entries = unzipSync(bytes, {
        filter: (f) => {
          const base = f.name.slice(f.name.lastIndexOf('/') + 1);
          const keep = !!base && !base.startsWith('.') && !f.name.startsWith('__MACOSX/') && f.originalSize <= MAX_ZIP_ENTRY_BYTES && count < MAX_ZIP_ENTRIES;
          if (keep) count++;
          return keep;
        },
      });
      const out: RoutedGradientFile[] = [];
      for (const entryName of Object.keys(entries)) {
        const b = entries[entryName];
        const binary = isPng(b) || isZip(b);
        out.push(...routeGradientFile({ name: entryName, text: binary ? '' : utf8.decode(b), bytes: b }, depth + 1));
      }
      return out.length ? out : [{ kind: 'unreadable', name }];
    }
    const text = bytes ? utf8.decode(bytes) : read.text;
    if (typeof text !== 'string' || !text.length) return [{ kind: 'unreadable', name }];
    return [routeText(name, text)];
  } catch {
    return [{ kind: 'unreadable', name }];
  }
};

/**
 * Route read files into shelf-ready gradients and everything that is not one. Pure. A file that
 * cannot be read as a gradient — unparseable, truncated, hostile, or a failed read (`null`) — is
 * counted in `skipped` and never aborts the rest of the batch.
 */
export const parseGradientImports = (reads: ReadonlyArray<ReadGradientFile | null>): ParsedGradientImports => {
  const out: ParsedGradientImports = { items: [], skipped: 0, files: [], sessions: [], scenes: [], images: [] };
  for (const r of reads) {
    if (!r) {
      out.skipped++;
      continue;
    }
    for (const f of routeGradientFile(r)) {
      out.files.push(f);
      if (f.kind === 'gradients') {
        out.items.push(...f.items);
        out.skipped += f.skipped;
        if (!f.items.length && !f.skipped) out.skipped++;
      } else if (f.kind === 'session') out.sessions.push({ name: f.name, text: f.text });
      else if (f.kind === 'scene') out.scenes.push(f.name);
      else if (f.kind === 'image') out.images.push({ name: f.name, bytes: f.bytes });
      else out.skipped++;
    }
  }
  return out;
};

/**
 * What the collection menu's LOAD reads (Load & merge / Replace from file): every gradient in the
 * files, whatever they are — a GMT gradients document as PNG or JSON, the legacy collection, a
 * zip of either — routed by content like every other entrance, with their sets. `document` says
 * whether any of it came from a document (the only thing a REPLACE may take: a lone .ggr must not
 * wipe a shelf). A file with no gradients says why. Pure; never throws.
 */
export type CollectionFileRead =
  | { kind: 'collection'; entries: GradientDocumentEntry[]; groups: Record<string, string>; document: boolean; skipped: number }
  | { kind: 'refused'; reason: 'session' | 'scene' | 'image' | 'unreadable' };

export const readCollectionFiles = (reads: ReadonlyArray<ReadGradientFile | null>): CollectionFileRead => {
  const parsed = parseGradientImports(reads);
  const entries: GradientDocumentEntry[] = [];
  const groups: Record<string, string> = {};
  let document = false;
  for (const f of parsed.files) {
    if (f.kind !== 'gradients' || !f.items.length) continue;
    document = document || f.document;
    Object.assign(groups, f.groups);
    entries.push(...f.items);
  }
  if (entries.length) return { kind: 'collection', entries, groups, document, skipped: parsed.skipped };
  if (parsed.sessions.length) return { kind: 'refused', reason: 'session' };
  if (parsed.scenes.length) return { kind: 'refused', reason: 'scene' };
  if (parsed.images.length) return { kind: 'refused', reason: 'image' };
  return { kind: 'refused', reason: 'unreadable' };
};

/**
 * Should a file offered to a SCENE loader come to this loader instead? The decision behind app-gmt's
 * scene drop and File ▸ Load Scene (`palette/installGradientFileClaim.ts`, through
 * `engine/plugins/SceneFileClaims.ts`). It must never take a scene, so it is narrower than the
 * router:
 *   - only a gradient-file NAME (`isGradientFileName`) is looked at — a `.gmf`, or a file with no
 *     extension, stays the scene loader's whatever it holds;
 *   - a PNG carrying a scene key (`SCENE_PNG_KEYWORDS`) stays the scene loader's, even when it also
 *     carries `gmt-gradients` metadata;
 *   - JSON text is taken only as a GMT gradients document or the legacy collection (the router's
 *     `document`). The scene loader reads ANY JSON as a preset, so a bare `{stops}`, a colour list,
 *     design tokens, a GX Global wire or a session — shapes a scene file could resemble — are left
 *     where they were;
 *   - anything else is taken when the router finds at least one gradient in it: a gradient PNG
 *     (by its metadata or its band layout), a .zip, .map .gpl .ggr .cpt .css.
 * Pure; never throws.
 */
export const takeFromSceneLoader = (read: ReadGradientFile | null): boolean => {
  try {
    if (!read || !isGradientFileName(read.name)) return false;
    const bytes = read.bytes;
    const binary = !!bytes && (isPng(bytes) || isZip(bytes));
    if (bytes && isPng(bytes) && listPngTextKeywords(bytes).some((k) => SCENE_PNG_KEYWORDS.includes(k))) return false;
    let json = false;
    if (!binary) {
      const text = bytes ? utf8.decode(bytes) : read.text;
      const lead = text.trimStart()[0]; // trimStart drops a BOM too (U+FEFF is whitespace to JS)
      json = lead === '{' || lead === '[';
    }
    return routeGradientFile(read).some((f) => f.kind === 'gradients' && f.items.length > 0 && (!json || f.document));
  } catch {
    return false;
  }
};

/** Read every file as bytes (and text, for a text file). A file that will not read, or is larger
 *  than any gradient file, comes back `null`; never throws. */
export const readGradientFiles = async (files: ArrayLike<File>): Promise<(ReadGradientFile | null)[]> =>
  Promise.all(
    Array.from(files).map(async (f) => {
      try {
        if (f.size > MAX_FILE_BYTES) return null;
        const bytes = new Uint8Array(await f.arrayBuffer());
        const binary = isPng(bytes) || isZip(bytes);
        return { name: f.name, text: binary ? '' : utf8.decode(bytes), bytes };
      } catch {
        return null; // read failure on this file — never aborts the rest
      }
    }),
  );

const sameLabel = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Route and add, by the destination rule in the file header. `group` is the set the user is
 * looking at when it is theirs (DEFAULT_GROUP for Kept); omit it when they are looking at
 * something that is not (the catalogue, a dated bin, GX Global). Synchronous, so the caller can
 * wrap it in one `paramEdit` bracket.
 */
export const importGradientsInto = (reads: ReadonlyArray<ReadGradientFile | null>, group?: string): ImportOutcome => {
  const parsed = parseGradientImports(reads);
  const st = () => useFavientsStore.getState();
  let imported = 0;
  let duplicates = 0;
  let collection = false;
  const landed = new Set<string | null>();
  const owned = group !== undefined && !isRecentGroup(group) ? group : undefined;

  // Decide every file's destination FIRST, gathering the items per destination in file order, and
  // write once per destination: `insertMany` puts what it is given at the head of the set's run,
  // so one call per file would land a multi-file drop in reverse; and two files naming the same
  // new set must find ONE set, not mint two.
  const plan = new Map<string, { label?: string; items: ParsedGradientImport[] }>();
  const merges: RoutedGradientFile[] = [];
  const minted = new Map<string, string>(); // lower-cased label → a group id minted in this call
  for (const f of parsed.files) {
    if (f.kind !== 'gradients' || !f.items.length) continue;
    const sets = new Set(f.items.map((i) => i.group ?? DEFAULT_GROUP));
    if (f.document && sets.size >= 2) {
      merges.push(f);
      continue;
    }
    let dest = owned;
    let label: string | undefined;
    if (dest === undefined) {
      const only = [...sets][0];
      if (f.document && sets.size === 1 && only !== DEFAULT_GROUP && only !== RECENT_GROUP) {
        label = (Object.prototype.hasOwnProperty.call(f.groups, only) ? f.groups[only] : '').trim() || 'Imported';
        const labels = st().groupLabels;
        const key = label.toLowerCase();
        dest =
          Object.keys(labels).find((id) => !isRecentGroup(id) && sameLabel(labels[id], label!)) ??
          minted.get(key) ??
          newGroupId();
        minted.set(key, dest);
      } else dest = DEFAULT_GROUP;
    }
    const slot = plan.get(dest);
    if (slot) slot.items.push(...f.items);
    else plan.set(dest, { label, items: [...f.items] });
  }
  for (const [dest, { label, items }] of plan) {
    const ids = st().insertMany(
      items.map((i) => ({ config: i.config, name: i.name, source: i.source, origin: i.origin })),
      dest,
      label,
    );
    imported += ids.length;
    duplicates += items.length - ids.length;
    landed.add(dest);
  }
  for (const f of merges) {
    if (f.kind !== 'gradients') continue;
    const n = st().importEntries(f.items, f.groups, 'merge');
    imported += n;
    duplicates += f.items.length - n;
    collection = true;
    landed.add(null);
  }

  const outcome: ImportOutcome = { imported, skipped: parsed.skipped + duplicates };
  if (duplicates) outcome.duplicates = duplicates;
  if (collection) outcome.collection = true;
  if (landed.size) {
    const dest = landed.size === 1 ? [...landed][0] : null;
    outcome.destination = dest;
    if (dest === DEFAULT_GROUP) outcome.destinationLabel = KEPT_LABEL;
    else if (dest) {
      const l = st().groupLabels[dest];
      if (l) outcome.destinationLabel = l;
    }
  }
  if (parsed.sessions.length) outcome.sessions = parsed.sessions;
  if (parsed.scenes.length) outcome.scenes = parsed.scenes;
  if (parsed.images.length) outcome.images = parsed.images;
  return outcome;
};

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/**
 * The sentence an import reports, whichever surface asked for it. It says what happened to
 * EVERYTHING dropped — imported (and where), already there, a session, a scene, an image, unreadable
 * — rather than one dead end.
 */
export const importSummary = (o: ImportOutcome): string => {
  const dup = o.duplicates ?? 0;
  const unread = Math.max(0, o.skipped - dup);
  const sessions = o.sessions?.length ?? 0;
  const scenes = o.scenes?.length ?? 0;
  const images = o.images?.length ?? 0;
  const where = o.collection && o.destination === null ? 'your gradients' : o.destinationLabel ?? 'this set';
  const parts: string[] = [];
  if (o.imported) {
    parts.push(`Imported ${o.imported} gradient${o.imported > 1 ? 's' : ''}${o.destinationLabel && !o.collection ? ` into ${o.destinationLabel}` : ''}`);
  }
  if (dup) {
    parts.push(o.imported ? `${dup} already in ${where}` : `${plural(dup, 'That gradient is', `${dup} gradients are`)} already in ${where}`);
  }
  if (sessions) parts.push(plural(sessions, 'That is a session file, not a gradient file', `${sessions} session files`));
  if (scenes) parts.push(plural(scenes, 'That is a GMT scene, not a gradient file', `${scenes} GMT scenes`));
  if (images) parts.push(plural(images, 'That image carries no gradient file', `${images} images with no gradient file`));
  if (!parts.length) return 'No gradient could be read from that file';
  if (unread) parts.push(`${unread} skipped`);
  return parts.join(' · ');
};
