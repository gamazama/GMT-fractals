/**
 * importGradientFiles — the ONE path from a gradient FILE on disk to a favourite on the
 * shelf. `importFormats.ts` turns text into a 256-step ramp; this module is everything
 * around that: which extensions the file picker offers, reading the `File`s, naming each
 * gradient from its filename, fitting the ramp to stops, and the write to the shelf.
 *
 * It exists because the import used to live inside `FavientsPanel`'s kebab menu and
 * nowhere else (the 2026-09-08 migration audit, `plans/ge-v2-old-shell-migration-audit.md`
 * §3.3: "whole-shelf operations have exactly one home"). GE v2 now reaches it from three
 * places — the set rail's menu, a file dropped anywhere on the shell, and the panel's own
 * kebab — so the logic lives here rather than being copy-pasted per surface
 * (CLAUDE.md anti-pattern 2).
 *
 * WHERE AN IMPORT LANDS is the one thing the callers differ on, so it is a parameter:
 *   • `group` given — that set, deduped WITHIN it (`insertMany`). The v2 rail asks to
 *     import into the set you are looking at, so a gradient you already keep elsewhere
 *     must still be able to join this one.
 *   • `group` omitted — the shelf's last-used group, deduped across the WHOLE collection
 *     (`add` + `isFav`). That is the panel kebab's historical behaviour, kept: its menu
 *     names no destination, so a second copy of something you already have is noise.
 *
 * Not pure — `readGradientFiles` touches `File` and `importGradientsInto` writes the
 * store. The PARSING half is pure and lives in `importFormats.ts`, which holds to a
 * strict no-throw contract on untrusted input; nothing here re-implements it.
 *
 * Callers own the undo bracket: wrap `importGradientsInto` in `paramEdit` so a batch is
 * ONE entry. Read the files FIRST (`readGradientFiles` is async) and keep the bracket
 * synchronous — holding a param transaction open across an await risks another gesture's
 * `beginParamTransaction` clobbering the engine's single interaction snapshot.
 *
 * @invariant `parseGradientImports` never throws on arbitrary file content, and every
 *   item it returns carries a non-empty name — proven by:
 *   `npx tsx debug/test-palette-importfiles.mts`
 *   ("parse: hostile and malformed input is skipped, never thrown",
 *    "parse: every imported item has a non-empty name").
 * @see palette/core/importFormats.ts (the parsers)
 * @see palette/core/exportFormats.ts (the other direction)
 */

import type { GradientConfig } from '../../types';
import { parseGradientText, IMPORT_EXTENSIONS } from './importFormats';
import { fitRampToStops } from './stopFit';
import { useFavientsStore } from '../store/favientsStore';

/** `accept` attribute for a gradient-file picker (the text formats we parse). */
export const GRADIENT_FILE_ACCEPT: string = IMPORT_EXTENSIONS.map((e) => '.' + e).join(',');

/** Does this filename look like something `parseGradientText` could read? */
export const isGradientFileName = (name: string): boolean =>
  (IMPORT_EXTENSIONS as readonly string[]).includes(extOf(name));

const extOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
};

/** Filename without directory or extension — the favourite's display name. */
const gradientName = (name: string): string => {
  const cut = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
  const file = cut >= 0 ? name.slice(cut + 1) : name;
  const dot = file.lastIndexOf('.');
  return (dot > 0 ? file.slice(0, dot) : file).trim() || 'imported';
};

/** A file already read to text. `null` marks a file whose read failed. */
export interface ReadGradientFile {
  name: string;
  text: string;
}

export interface ParsedGradientImport {
  config: GradientConfig;
  name: string;
  /** Provenance line shown under the name, e.g. `Import · .ggr`. */
  source: string;
}

export interface ImportOutcome {
  imported: number;
  skipped: number;
}

/**
 * Parse read files into shelf-ready gradients. Pure. A file that cannot be read as a
 * gradient — unparseable, truncated, hostile, or a failed read (`null`) — is counted in
 * `skipped` and never aborts the rest of the batch.
 */
export const parseGradientImports = (
  reads: ReadonlyArray<ReadGradientFile | null>,
): { items: ParsedGradientImport[]; skipped: number } => {
  const items: ParsedGradientImport[] = [];
  let skipped = 0;
  for (const r of reads) {
    if (!r) {
      skipped++;
      continue;
    }
    try {
      const res = parseGradientText(r.text, extOf(r.name));
      // parseGradientText guarantees a 256-length ramp, so fitRampToStops won't throw.
      const config = res && fitRampToStops(res.ramp, { targetDE: 0.02, maxStops: 32 });
      if (config && res) items.push({ config, name: gradientName(r.name), source: `Import · .${res.format}` });
      else skipped++;
    } catch {
      skipped++; // parse failure on this file
    }
  }
  return { items, skipped };
};

/** Read every file to text. A file that will not read comes back `null`, never throws. */
export const readGradientFiles = async (files: ArrayLike<File>): Promise<(ReadGradientFile | null)[]> =>
  Promise.all(
    Array.from(files).map(async (f) => {
      try {
        return { name: f.name, text: await f.text() };
      } catch {
        return null; // read failure on this file — never aborts the rest
      }
    }),
  );

/**
 * Parse and add. `group` picks the destination and the dedupe scope — see the file
 * header. Synchronous, so the caller can wrap it in one `paramEdit` bracket.
 */
export const importGradientsInto = (
  reads: ReadonlyArray<ReadGradientFile | null>,
  group?: string,
): ImportOutcome => {
  const { items, skipped } = parseGradientImports(reads);
  const st = useFavientsStore.getState();
  if (group !== undefined) {
    const ids = st.insertMany(items, group);
    return { imported: ids.length, skipped: skipped + (items.length - ids.length) };
  }
  let imported = 0;
  let dropped = 0;
  for (const it of items) {
    if (st.isFav(it.config)) dropped++; // a duplicate of an existing favourite
    else {
      st.add(it.config, it.name, it.source);
      imported++;
    }
  }
  return { imported, skipped: skipped + dropped };
};

/** The one sentence an import reports, whichever surface asked for it. */
export const importSummary = ({ imported, skipped }: ImportOutcome): string =>
  imported
    ? `Imported ${imported} gradient${imported > 1 ? 's' : ''}${skipped ? ` · ${skipped} skipped` : ''}`
    : 'No gradient could be read from that file';
