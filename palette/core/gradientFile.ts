/**
 * gradientFile — the Explorer's SAVE (ADR-0123 Decision 5): one call that turns gradients into the
 * GMT gradient file a person downloads, as a PNG (the one form a UI offers) or the same payload as
 * JSON (code, tests, backups). Pure;
 * the download itself is the caller's (the UI's `downloadBlob`).
 *
 * The filename keeps the REAL name — spaces, case and non-ASCII survive — and loses only what a
 * filesystem refuses (`\ / : * ? " < > |` and control characters). That is the opposite of
 * `exportActions.slugName`, whose `_`-collapsing was half of "no import keeps the name" (ADR-0123
 * Context). The name also rides inside the file, so the filename is only ever a fallback.
 *
 * @see palette/core/gradientPng.ts (the PNG)
 * @see palette/core/gradientDocument.ts (the payload)
 */

import { encodeGradientDocument, gradientDocumentText, type GradientDocumentInput } from './gradientDocument';
import { writeGradientPng, type GradientPngSize } from './gradientPng';

export const GRADIENT_JSON_SUFFIX = '.gmt-gradients.json';

export type GradientFileKind = 'png' | 'json';

export type BuiltGradientFile =
  | { kind: 'png'; bytes: Uint8Array; filename: string; mime: 'image/png' }
  | { kind: 'json'; text: string; filename: string; mime: 'application/json' };

// eslint-disable-next-line no-control-regex
const ILLEGAL = /[\\/:*?"<>|\x00-\x1f\x7f]/g;
const MAX_STEM = 120;

/** A filename stem that keeps the name: illegal characters removed, trimmed, never empty. */
export const gradientFileStem = (name: string): string => {
  const stem = String(name ?? '').replace(ILLEGAL, '').trim();
  // Slice by code point so a cut never leaves half a surrogate pair.
  return Array.from(stem).slice(0, MAX_STEM).join('').trim() || 'gradients';
};

/** The name a file is saved under when the caller gives none: the gradient's own name for one,
 *  the set's label when every entry sits in one labelled set, else "gradients". */
const defaultTitle = (entries: ReadonlyArray<GradientDocumentInput>, groups?: Readonly<Record<string, string>>): string => {
  if (entries.length === 1) return entries[0].name;
  const sets = new Set(entries.map((e) => e.group ?? ''));
  if (sets.size === 1) {
    const only = [...sets][0];
    const label = only && groups && Object.prototype.hasOwnProperty.call(groups, only) ? groups[only] : '';
    if (label) return label;
  }
  return 'gradients';
};

/**
 * Build the GMT gradient file for `entries` (a `Favient` is one). `groups` labels the sets they
 * name — pass the shelf's `groupLabels`, or just the one set's. `title` overrides the filename's
 * stem (a set export passes the set's label). `size` sizes a ONE-gradient PNG (width snapped to a
 * multiple of 256, see `gradientPng.ts`); a set and the JSON ignore it.
 *
 * Every UI offers the PNG only (ADR-0123 Update 2026-09-14). `'json'` stays for code, tests and
 * backups — the loader still reads it.
 */
export const buildGradientFile = (
  entries: ReadonlyArray<GradientDocumentInput>,
  groups: Readonly<Record<string, string>> | undefined,
  kind: GradientFileKind,
  title?: string,
  size?: GradientPngSize,
): BuiltGradientFile => {
  const stem = gradientFileStem(title ?? defaultTitle(entries, groups));
  if (kind === 'png') return { kind, bytes: writeGradientPng(entries, groups, size), filename: `${stem}.png`, mime: 'image/png' };
  return { kind, text: gradientDocumentText(encodeGradientDocument(entries, groups)), filename: `${stem}${GRADIENT_JSON_SUFFIX}`, mime: 'application/json' };
};
