/**
 * exportActions — what an Export DOES, apart from where it is shown (added 2026-09-07 with
 * the hero's hover flyout; plans/ge-v2-figma/hero-spec.md §7f).
 *
 * One `ExportAction` is a copy or a download of one registry format (`palette/core/
 * exportFormats.ts`), the GMT gradient PNG, or the swatch sheet. `runExport` performs it and
 * toasts (except a Copy whose surface ticks its own row, `confirmsCopy`); it also notes it as a RECENT, which is what the hero's Export icon shows on hover and
 * the Export window shows as Again — the last three things this person exported, one click each.
 * `ExportMenu` (the full floating window) runs the same function, so the two surfaces cannot drift.
 *
 * RECENTS HOLD NO REPEATS (owner, 2026-09-14: Again showed "Download .css" twice). Two causes, both
 * fixed here rather than in either surface: the label named only the EXTENSION, so CSS
 * linear-gradient and CSS variables (both .css) read as one export twice — `exportActionParts` now
 * names the FORMAT; and nothing held the stored list to one entry per action — `exportActionId`
 * (kind + format key + subject) is the identity, `noteRecentExport` replaces by it, and `load`
 * dedupes by it, newest first, writing the cleaned list back.
 *
 * Recents persist in localStorage (`gx.v2.recentExports`); an entry that no longer names a live
 * action is dropped on load, never shown: an unknown format key (a renamed registry entry), and
 * since 2026-09-14 the removed kinds — a GMT gradient `.json`, and the ramp's PNG strip.
 *
 * THE EXPORTED NAME is formed here and only here (owner, 2026-09-13): an UNMODIFIED catalogue
 * gradient exports as "Name (cpt-city/gacruxa, CC BY 3.0)" — the name is the one field every
 * format carries, so the credit goes in it, kept small — and anything modified exports exactly as
 * before. `exportNameFor` (`palette/core/catalogOrigin.ts`) decides; `runExport` applies it to the
 * working gradient (`opts.origin` + `opts.config`) and `runSetExport` / `runSetImage` to each
 * member of a set by the favourite's own `origin`. The RAMP subject only: a swatch palette is
 * sampled at positions the user laid out, so it is a derivative, not the gradient as published.
 * The filename follows the name, so a .map or a PNG strip (no name field) still carries it.
 *
 * THE GMT GRADIENT FILE (ADR-0123 Decision 5, 2026-09-14) is the Explorer's SAVE, and it is not a
 * registry format: `runGradientFile` / `runSetGradientFile` write `palette/core/gradientFile.ts`'s
 * PNG (or its JSON) carrying the REAL config — either ADR-0122 form, never the ramp — with the
 * plain name, the catalogue origin and the source beside it, so nothing is baked into the name:
 * the credit rides `origin` and comes back as the credit. Only the FILENAME carries the credited
 * name, so a copy whose metadata was stripped (the PNG's pixels still import) keeps the credit
 * in the one place it has left. A set carries each member's group and the labels of those groups.
 * A GMT file download IS a recent (`kind: 'gmt'`), since it is one click the hero's flyout can
 * repeat; the registry formats keep their own kinds. Every UI offers the PNG only (ADR-0123
 * Update 2026-09-14); `runGradientFile(…, 'json')` stays for code and tests. One gradient's PNG
 * honours the window's size (`opts.pngW` × `opts.pngH`, width snapped to a multiple of 256 by the
 * writer); a set's keeps the automatic band layout. Guard: `npm run smoke:ge-gradientfile` [a0] [a] [e] [f]
 * (falsified by dropping each stop's bias and interpolation from the written config).
 *
 * `runSetExport` is the same registry pointed at a SET of gradients rather than one
 * (§8b item 4, the 2026-09-08 migration audit's M1): a collection format bundles the set
 * into one file, everything else becomes a .zip of one file per gradient, and the swatch
 * sheet is a PNG of every member's palette. (The set's ramp contact sheet left the window on
 * 2026-09-14 — the set's GMT gradient PNG draws every member too.) The building is
 * `palette/core/favientsExport.ts`, unchanged — what moved is WHAT it is pointed at.
 * Before this it existed only inside the My Gradients kebab and always meant the whole
 * collection; the set is the noun Phase D created. A set export is NOT noted as a recent:
 * the hero's flyout offers one-click repeats of the WORKING gradient, and a set is a
 * different subject.
 *
 * THE TEXT PREVIEW (parity row O4, owner-approved 2026-09-23) reads from here too: `exportText`
 * is what one gradient's Copy writes and its Download saves, `setExportText` is the one file a
 * set bundles into. The Export window shows those strings on hover; it builds nothing of its own,
 * which is the whole guarantee that the preview is what lands.
 */

import { useSyncExternalStore } from 'react';
import { getExportFormat, grdStopCount, aiLossyGradients, stopBudgetOf, exportFileName, AI_LOSSY_DELTA, type ExportFormatDef, type ExportSubject } from '../../palette/core/exportFormats';
import { downloadBlob } from '../../utils/SceneFormat';
import { showToast } from '../../engine/store/toastStore';
import type { RGB } from '../../palette/core/oklab';
import {
  buildCollectionFile,
  buildCollectionZip,
  buildSwatchCollectionFile,
  buildSwatchSheet,
  buildSwatchZip,
  collectionQualityWarnings,
  setSwatches,
} from '../../palette/core/favientsExport';
import type { Favient } from '../../palette/store/favientsStore';
import { exportNameFor, withExportName } from '../../palette/core/catalogOrigin';
import { buildGradientFile, gradientFileStem, MAX_FILE_STEM, type GradientFileKind, type BuiltGradientFile } from '../../palette/core/gradientFile';
import { GRADIENT_PNG_DEFAULT_SIZE, clampGradientPngHeight, snapGradientPngWidth } from '../../palette/core/gradientPng';
import { useFavientsStore } from '../../palette/store/favientsStore';
import { safeLocalGet, safeLocalSet } from '../../store/safeLocalStorage';
import type { GradientConfig } from '../../types';

/**
 * THE EXPORT SETTINGS, remembered (`gx.v2.exportSettings`). Here rather than in `ExportMenu` so
 * the hero's hover flyout repeats an export with the SAME settings the window would use — a GMT
 * gradient PNG from the flyout at the size the window shows. `budget` is the stop override (null =
 * each format's own); `pngW` × `pngH` size one gradient's GMT gradient PNG, the width always held
 * snapped to a multiple of 256 (`snapGradientPngWidth`).
 *
 * The strip this size used to belong to defaulted to 1024 × 64 and was saved whole whenever any
 * setting changed, so that exact pair is read as "never touched" and becomes the GMT PNG's
 * default, 1024 × 128. Any other stored size is someone's choice and is kept (snapped).
 */
export const EXPORT_SETTINGS_KEY = 'gx.v2.exportSettings';
export interface ExportSettings { budget: number | null; pngW: number; pngH: number }
export const DEFAULT_EXPORT_SETTINGS: ExportSettings = { budget: null, pngW: GRADIENT_PNG_DEFAULT_SIZE.width, pngH: GRADIENT_PNG_DEFAULT_SIZE.height };
export const readExportSettings = (): ExportSettings => {
  try {
    const v = JSON.parse(safeLocalGet(EXPORT_SETTINGS_KEY) ?? 'null') as Partial<ExportSettings> | null;
    if (!v || typeof v !== 'object') return DEFAULT_EXPORT_SETTINGS;
    const oldStripDefault = v.pngW === 1024 && v.pngH === 64;
    return {
      budget: typeof v.budget === 'number' && Number.isFinite(v.budget) ? Math.max(2, Math.min(256, Math.round(v.budget))) : null,
      pngW: oldStripDefault ? DEFAULT_EXPORT_SETTINGS.pngW : snapGradientPngWidth(v.pngW),
      pngH: oldStripDefault ? DEFAULT_EXPORT_SETTINGS.pngH : clampGradientPngHeight(v.pngH),
    };
  } catch {
    return DEFAULT_EXPORT_SETTINGS;
  }
};
export const writeExportSettings = (s: ExportSettings): void => {
  safeLocalSet(EXPORT_SETTINGS_KEY, JSON.stringify(s));
};

/** The Settings category's values, carried to whatever does the writing. `budget` is the
 *  stop override (undefined = each format's own); `pngW`/`pngH` size one gradient's GMT
 *  gradient PNG (snapped by the writer; absent → 1024 × 128). */
export interface ExportRunOpts {
  budget?: number;
  pngW?: number;
  pngH?: number;
  /** The working gradient's catalogue origin and the config it must still match for the name to
   *  carry the credit (`useWorkingDerived().origin` / `.config`). Absent → the name as given. */
  origin?: unknown;
  config?: GradientConfig | null;
  /** The working gradient's provenance line ("Browse", "Mix", "Edited" …) — what a GMT file
   *  carries as `source`, the same string a Recent favourite of it holds. */
  source?: string;
  /** The surface confirms a COPY on the row that did it — the colour picker's tick, for a
   *  second (plans/ge-v2-unified-shell-plan.md §10, 2026-09-09 second pass) — so the "Copied"
   *  toast is not shown as well. The Export window sets it; the hero's flyout, which closes on
   *  the click, does not. */
  confirmsCopy?: boolean;
}


/**
 * One export. `subject` is WHICH FACE of the gradient it takes (§8b item 5): 'ramp' is the
 * continuous 256-step gradient, 'swatches' is the palette the user composed on the hero.
 * Optional on a format, and absent means 'ramp' — recents written before 2026-09-09 have no
 * subject and must keep meaning what they meant.
 */
export type ExportAction =
  | { kind: 'copy' | 'download'; key: string; subject?: ExportSubject }
  /** The swatch sheet — the palette as labelled chips. Swatches only: the ramp's PNG strip it used
   *  to share this kind with was removed on 2026-09-14 (the GMT gradient PNG replaces it). */
  | { kind: 'png'; subject: 'swatches' }
  /** The GMT gradient file (ADR-0123) — the gradient itself, so it has no subject. PNG only in any
   *  UI; the JSON is `runGradientFile(…, 'json')` for code. */
  | { kind: 'gmt'; file: 'png' };

const subjectOf = (a: ExportAction): ExportSubject => (a.kind === 'gmt' ? 'ramp' : a.subject ?? 'ramp');

const STORAGE_KEY = 'gx.v2.recentExports';
const MAX_RECENT = 3;

const isAction = (a: unknown): a is ExportAction => {
  if (!a || typeof a !== 'object') return false;
  const o = a as { kind?: unknown; key?: unknown; subject?: unknown };
  if (o.subject !== undefined && o.subject !== 'ramp' && o.subject !== 'swatches') return false;
  // The ramp's PNG strip (a `png` with no subject, or 'ramp') and the GMT gradient .json are no
  // longer offered: dropped, never shown as a row that does something the window no longer does.
  if (o.kind === 'png') return o.subject === 'swatches';
  if (o.kind === 'gmt') return (a as { file?: unknown }).file === 'png';
  if (o.kind !== 'copy' && o.kind !== 'download') return false;
  if (typeof o.key !== 'string') return false;
  const f = getExportFormat(o.key);
  // A swatches recent whose format has since lost its swatches builder is as dead as an
  // unknown key: dropped on load rather than offered as a click that would do nothing.
  return !!f && (o.subject !== 'swatches' || !!f.swatches);
};

/**
 * An action's IDENTITY — what makes two recents the same export: its kind, its format key and its
 * subject. A Copy and a Download of one format are two actions (two different things land); CSS
 * linear-gradient and CSS variables are two (two keys, one extension); the same format from the
 * ramp and from the swatches is two. The recents list holds each identity once.
 */
export const exportActionId = (a: ExportAction): string => {
  if (a.kind === 'gmt') return `gmt:${a.file}`;
  if (a.kind === 'png') return `png::${subjectOf(a)}`;
  return `${a.kind}:${a.key}:${subjectOf(a)}`;
};

/** Newest first, one entry per identity, at most `MAX_RECENT`. */
const dedupeRecents = (list: ExportAction[]): ExportAction[] => {
  const seen = new Set<string>();
  const out: ExportAction[] = [];
  for (const a of list) {
    const id = exportActionId(a);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(a);
  }
  return out.slice(0, MAX_RECENT);
};

const load = (): ExportAction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const v: unknown = JSON.parse(raw ?? '[]');
    const list = Array.isArray(v) ? dedupeRecents(v.filter(isAction)) : [];
    // Storage holds what is shown: a list that had a removed kind or a repeat is written back clean.
    if (raw !== null && JSON.stringify(list) !== raw) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {
        /* private mode */
      }
    }
    return list;
  } catch {
    return [];
  }
};

let recents: ExportAction[] = load();
const subscribers = new Set<() => void>();

export const noteRecentExport = (a: ExportAction): void => {
  recents = dedupeRecents([a, ...recents]);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
  } catch {
    /* private mode — recents live for the session only */
  }
  subscribers.forEach((f) => f());
};

/** The last few exports, newest first. */
export const useRecentExports = (): ExportAction[] =>
  useSyncExternalStore(
    (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    () => recents,
  );

/** The label with its extension REMOVED, for a surface that shows the extension in a column of its
 *  own: the registry writes "Adobe swatches .ase" and "Fractint .map" for hosts that show a bare
 *  list (the old shell's Extras `<select>`, where "Fractint" alone would be worse), so this is a
 *  display decision rather than a rename in `exportFormats.ts`. Labels that never carried one —
 *  "CSS variables", "Hex list (256)", "Paint.NET" — pass through. */
export const labelWithoutExt = (label: string, ext: string): string => {
  const needle = `.${ext}`.toLowerCase();
  const i = label.toLowerCase().indexOf(needle);
  if (i < 0) return label;
  // Only when it stands on its own: ".ai" inside a hypothetical ".aiff" is not this label's
  // extension. Written with indexOf rather than a RegExp built from a TEMPLATE LITERAL: the
  // first cut was, and an escape like the one for whitespace collapses in the template
  // before the RegExp ever sees it, so the pattern matched nothing and every design-app row
  // kept saying its extension twice. It read correctly and did nothing.
  const after = label[i + needle.length];
  if (after && /[a-z0-9]/i.test(after)) return label;
  return `${label.slice(0, i).trimEnd()} ${label.slice(i + needle.length).trimStart()}`.trim() || label;
};

/**
 * What a recent IS, in words: the verb, the FORMAT's name ("CSS linear-gradient", "CSS variables",
 * "GMT gradient", "Swatch sheet", with " · swatches" for the swatches face of a format) and the
 * extension a download writes (null for a Copy). The format's name, never only its extension —
 * two formats share `.css`, and a row that said "Download .css" twice read as a repeat.
 */
export const exportActionParts = (a: ExportAction): { verb: 'Copy' | 'Download'; format: string; ext: string | null } => {
  if (a.kind === 'gmt') return { verb: 'Download', format: 'GMT gradient', ext: `.${a.file}` };
  if (a.kind === 'png') return { verb: 'Download', format: 'Swatch sheet', ext: '.png' };
  const sw = subjectOf(a) === 'swatches';
  const f = getExportFormat(a.key);
  const verb = a.kind === 'copy' ? 'Copy' : 'Download';
  if (!f) return { verb, format: a.key, ext: null };
  const format = `${labelWithoutExt((sw && f.swatchLabel) || f.label, f.ext)}${sw ? ' · swatches' : ''}`;
  return { verb, format, ext: a.kind === 'copy' ? null : `.${f.ext}` };
};

/** One line for a surface with no extension column (the hero's flyout): "Download CSS variables .css". */
export const exportActionLabel = (a: ExportAction): string => {
  const p = exportActionParts(a);
  return `${p.verb} ${p.format}${p.ext ? ` ${p.ext}` : ''}`;
};

/**
 * The file stem of a download: the name AS IT IS — spaces, case and non-ASCII kept, only what a
 * filesystem refuses removed (`\ / : * ? " < > |` and control characters), at most
 * `MAX_FILE_STEM` code points. The GMT gradient file's rule (`gradientFileStem`), so every
 * download in the Explorer names its file one way (plans/gradient-file-format.md "Still open",
 * done 2026-09-16). It used to collapse everything outside `[A-Za-z0-9_-]` to `_`, so a format
 * with no name field of its own came back through the importer, which names such a file after
 * its filename, as "Stufe B nder". The export name is historical; nothing here slugs any more.
 */
export const slugName = (name: string): string => gradientFileStem(name, 'gradient');

/**
 * The file stem of a download whose name CARRIES A CREDIT: "Name (cpt-city-gacruxa, CC BY 3.0)" —
 * the credit's `/` becomes `-` as it does for the GMT file (`creditTitle`). The credit is kept
 * whole and the name gives way when the two pass `MAX_FILE_STEM`, because a cut would otherwise
 * take exactly the part that matters.
 */
export const creditedFileStem = (plainName: string, credited: string): string => {
  const whole = slugName(creditTitle(credited));
  const credit = gradientFileStem(creditTitle(credited.trim().slice(plainName.trim().length)), '');
  const name = Array.from(slugName(plainName));
  const credLen = Array.from(credit).length;
  if (!credit || name.length + 1 + credLen <= MAX_FILE_STEM) return whole;
  return `${name.slice(0, Math.max(12, MAX_FILE_STEM - credLen - 1)).join('').trimEnd()} ${credit}`;
};

/** The file stem of a download of `plainName` that exports as `name` (`exportNameFor`): the name
 *  as it is, or — when `name` carries a credit — the credited stem. One gradient's download and its
 *  member of a set .zip (`favientsExport.zipMemberName`) are both named by this. */
export const downloadStem = (plainName: string, name: string): string =>
  name === plainName ? slugName(name) : creditedFileStem(plainName, name);

/** The bytes for one format and one subject. `palette` non-null selects the SWATCHES
 *  subject; the caller has already checked the format has a swatches builder. */
const bytesFor = (f: ExportFormatDef, ramp: RGB[], name: string, palette: RGB[] | null, budget?: number): string | Uint8Array =>
  palette ? f.swatches!(palette, name) : f.build(ramp, name, budget);

/** One registry export of the working gradient, resolved: the format, the name it writes (credited
 *  while the gradient is an unmodified catalogue pick, ramp subject only), the download's stem, and
 *  the palette when the subject is Swatches. Null when there is nothing to build — an unknown key,
 *  a format with no swatches form under Swatches, or Swatches with no palette. */
interface ResolvedFormatExport {
  f: ExportFormatDef;
  name: string;
  stem: string;
  palette: RGB[] | null;
}
const resolveFormatExport = (a: ExportAction, plainName: string, palette: RGB[], opts: ExportRunOpts): ResolvedFormatExport | null => {
  if (a.kind !== 'copy' && a.kind !== 'download') return null;
  const swatches = subjectOf(a) === 'swatches';
  if (swatches && !palette.length) return null;
  const f = getExportFormat(a.key);
  if (!f || (swatches && !f.swatches)) return null;
  const name = swatches ? plainName : exportNameFor(plainName, opts.origin, opts.config);
  return { f, name, stem: downloadStem(plainName, name), palette: swatches ? palette : null };
};

/**
 * THE TEXT an export of the working gradient writes — what its Copy puts on the clipboard and
 * what its Download saves — or null when it writes bytes (a `binary` format, the GMT gradient
 * PNG, the swatch sheet) or has nothing to build. The Export window's hover PREVIEW shows exactly
 * this (parity row O4, owner-approved 2026-09-23), and `runExport`'s Copy writes exactly this, so
 * the preview cannot show one thing while the clipboard gets another: same resolution (name,
 * credit, subject), same builder, same `opts.budget`. A Copy and a Download of one format
 * resolve alike, so either action previews the same text.
 *
 * @invariant a format row's preview in the Export window is the text its Copy puts on the
 *   clipboard, byte for byte — with the credited name of a catalogue pick, and under a stop-budget
 *   override — proven by: `npm run smoke:ge-hero` ("[5d] the css (ramp) preview differs from what
 *   Copy put on the clipboard" and "[7c] under a 2-stop budget the CSS preview … is not what Copy
 *   wrote"). Falsified 2026-09-23 by building the preview without `opts.origin` (red at [5d]) and
 *   without `opts.budget` (red at [7c]); see the smoke's header.
 */
export const exportText = (a: ExportAction, ramp: RGB[], plainName: string, palette: RGB[] = [], opts: ExportRunOpts = {}): string | null => {
  const r = resolveFormatExport(a, plainName, palette, opts);
  if (!r || r.f.binary) return null;
  const out = bytesFor(r.f, ramp, r.name, r.palette, opts.budget);
  return typeof out === 'string' ? out : null;
};

/** Put one format on the clipboard. Resolves true once it is there, so a surface can confirm on
 *  its own row (`ExportRunOpts.confirmsCopy`); the "Copied" toast is for a surface that cannot.
 *  A failure always toasts. No clipboard at all resolves false and says nothing, as before.
 *  `text` is `exportText`'s — the one string the window's preview also shows. */
const copyText = (text: string, label: string, toast = true): Promise<boolean> => {
  const writing = navigator.clipboard?.writeText(text);
  if (!writing) return Promise.resolve(false);
  return writing.then(
    () => {
      if (toast) showToast(`Copied ${label}`);
      return true;
    },
    () => {
      showToast('Copy failed');
      return false;
    },
  );
};

const downloadFormat = (f: ExportFormatDef, ramp: RGB[], name: string, palette: RGB[] | null, budget?: number, stem = slugName(name)) => {
  const out = bytesFor(f, ramp, name, palette, budget);
  const blob = f.binary ? new Blob([out as unknown as BlobPart], { type: 'application/octet-stream' }) : new Blob([out as string], { type: 'text/plain' });
  downloadBlob(blob, exportFileName(f, stem, palette ? 'swatches' : 'ramp'));
  // The .grd stop count is a RAMP fact (it is what the reduction left); a swatch export
  // writes exactly the colours it was handed, so it says how many rather than implying a
  // reduction that did not happen.
  if (palette) showToast(`Downloaded .${f.ext} (${palette.length} swatches)`);
  else showToast(f.key === 'grd' ? `Downloaded .grd (${grdStopCount(ramp, budget)} stops)` : `Downloaded .${f.ext}`);
};

/** The working gradient's palette as a labelled swatch sheet (chips + hex) — the one image of a
 *  PALETTE the window makes. One entry, the same drawing the set uses. */
const downloadSwatchSheet = async (palette: RGB[], name: string): Promise<void> => {
  const blob = await buildSwatchSheet([{ name, colors: palette }], name);
  if (!blob) {
    showToast('Could not draw the swatch sheet');
    return;
  }
  downloadBlob(blob, `${slugName(name)}-swatches.png`);
  showToast('Swatch sheet saved (PNG)');
};

/** Hand a built GMT gradient file to the browser. */
const downloadGradientFile = (built: BuiltGradientFile): void => {
  const blob = built.kind === 'png' ? new Blob([built.bytes as unknown as BlobPart], { type: built.mime }) : new Blob([built.text], { type: built.mime });
  downloadBlob(blob, built.filename);
};

/** A filename stem that keeps a credit readable: `gradientFileStem` drops `/` (a path separator),
 *  which would weld "cpt-city/gacruxa" into one word. */
const creditTitle = (credited: string): string => credited.replace(/\s*\/\s*/g, '-');

/**
 * Save the WORKING gradient as the GMT gradient file (ADR-0123): its real config, its plain name,
 * its catalogue origin (`opts.origin` — the working pipeline's, already null once the output
 * changed) and its source. The filename carries the credit while the gradient is unmodified,
 * exactly as a registry download's does. The PNG is `opts.pngW` × `opts.pngH` (width snapped to a
 * multiple of 256 by the writer; either absent → the 1024 × 128 default).
 */
export const runGradientFile = (file: GradientFileKind, plainName: string, opts: ExportRunOpts = {}): boolean => {
  const config = opts.config;
  if (!config) {
    showToast('Pick or build a gradient first');
    return false;
  }
  const credited = exportNameFor(plainName, opts.origin, config);
  const built = buildGradientFile(
    [{ name: plainName, config, ...(opts.origin ? { origin: opts.origin } : {}), ...(opts.source ? { source: opts.source } : {}) }],
    undefined,
    file,
    credited === plainName ? plainName : creditTitle(credited),
    { width: opts.pngW, height: opts.pngH },
  );
  downloadGradientFile(built);
  showToast(`Downloaded GMT gradient (.${file})`);
  return true;
};

/**
 * Save a SET as ONE GMT gradient file: every member with its own config, name, origin, source and
 * group, and the labels of the groups they sit in — so loading it back puts each where it was.
 * Named after the set. Not a recent (a set is a different subject from the hero's flyout).
 */
export const runSetGradientFile = (file: GradientFileKind, favients: Favient[], setName: string): void => {
  if (!favients.length) {
    showToast('That set is empty');
    return;
  }
  const labels = useFavientsStore.getState().groupLabels;
  const groups: Record<string, string> = {};
  for (const f of favients) {
    const g = f.group;
    if (g && Object.prototype.hasOwnProperty.call(labels, g)) groups[g] = labels[g];
  }
  downloadGradientFile(buildGradientFile(favients, groups, file, setName));
  showToast(`Downloaded ${favients.length} gradient${favients.length === 1 ? '' : 's'} as a GMT gradient file (.${file})`);
};

/**
 * The ONE FILE a set becomes in a format that bundles, or null when the format does not bundle
 * (the set then goes out as a .zip). Ramp: a `collection` format (.ai/.idml/.ugr/.c4d.py/
 * .blender.py) over every member under its export name (credited while unmodified). Swatches:
 * a `collectionSwatches` format (.ase) over each member's `n`-swatch palette.
 */
const setBundle = (
  key: string,
  favients: Favient[],
  subject: ExportSubject,
  n: number,
  budget?: number,
): { data: string | Uint8Array; ext: string } | null => {
  // asked of the format first, so a format that zips does not sample every member for nothing
  const f = getExportFormat(key);
  if (subject === 'swatches') return f?.collectionSwatches ? buildSwatchCollectionFile(setSwatches(favients, n), key) : null;
  return f?.collection ? buildCollectionFile(favients.map(withExportName), key, budget) : null;
};

/**
 * The TEXT a set export writes — the bundled file of a text format that bundles (.ugr, .ai, the
 * two DCC scripts) — or null for a .zip or a binary bundle. The set counterpart of `exportText`,
 * and the same function `runSetExport` downloads through (`setBundle`), so the window's preview
 * of a set is the file that lands.
 */
export const setExportText = (key: string, favients: Favient[], subject: ExportSubject = 'ramp', n = 7, budget?: number): string | null => {
  if (!favients.length) return null;
  const f = getExportFormat(key);
  if (!f || f.binary) return null;
  const one = setBundle(key, favients, subject, n, budget);
  return one && typeof one.data === 'string' ? one.data : null;
};

/**
 * Export a whole SET. `key` is a registry format; `subject` is which face of every member
 * is taken.
 *
 *   ramp     — a collection format (.ai/.idml/.ugr/.ase) bundles every gradient into one
 *              file, anything else becomes a .zip of one file per gradient.
 *   swatches — each member's palette, `n` swatches placed by `rule` (there is no composed
 *              swatch row for a gradient nobody laid out by hand, so the caller says how
 *              many). .ase bundles, because grouping is part of that format; everything
 *              else zips.
 *
 * No copy variant either way — a set has no single text form to put on the clipboard.
 */
export const runSetExport = (
  key: string,
  favients: Favient[],
  setName: string,
  subject: ExportSubject = 'ramp',
  n = 7,
  budget?: number,
): void => {
  if (!favients.length) {
    showToast('That set is empty');
    return;
  }
  const stem = slugName(setName);
  // A zip of CSS variables must not land beside a zip of CSS under one name (`fileSuffix`).
  const zipStem = `${stem}${getExportFormat(key)?.fileSuffix ?? ''}`;
  // A format that BUNDLES writes one file — the same one `setExportText` previews.
  const one = setBundle(key, favients, subject, n, budget);
  if (one) {
    const data = typeof one.data === 'string' ? one.data : (one.data as unknown as BlobPart);
    downloadBlob(new Blob([data], { type: 'application/octet-stream' }), `${stem}.${one.ext}`);
    showToast(subject === 'swatches' ? `Exported ${favients.length} palettes → .${one.ext}` : `Exported ${favients.length} → .${one.ext}`);
    return;
  }
  if (subject === 'swatches') {
    const zip = buildSwatchZip(setSwatches(favients, n), key);
    if (!zip) {
      showToast('That format has no swatch form');
      return;
    }
    downloadBlob(new Blob([zip as unknown as BlobPart], { type: 'application/zip' }), `${zipStem}-swatches.zip`);
    showToast(`Exported ${favients.length} palettes as .zip`);
    return;
  }
  // Each .zip member is filed under the stem a single download of it would have (`downloadStem`),
  // taken from the plain name: a credited member keeps its credit whole.
  const memberStems = favients.map((f) => downloadStem(f.name, exportNameFor(f.name, f.origin, f.config)));
  const bytes = buildCollectionZip(favients.map(withExportName), key, budget, memberStems);
  downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/zip' }), `${zipStem}.zip`);
  showToast(`Exported ${favients.length} as .zip`);
};

/** The set's SWATCH SHEET: every member's palette (`n` swatches each) as labelled chips. The set's
 *  ramp contact sheet left the Export window on 2026-09-14 — the set's GMT gradient PNG draws every
 *  member (`favientsExport.buildContactSheet` stays for the collection menu's own export block). */
export const runSetSwatchSheet = async (favients: Favient[], setName: string, n = 7): Promise<void> => {
  if (!favients.length) {
    showToast('That set is empty');
    return;
  }
  const blob = await buildSwatchSheet(setSwatches(favients, n), setName);
  if (!blob) {
    showToast('Could not draw the sheet');
    return;
  }
  downloadBlob(blob, `${slugName(setName)}-swatches.png`);
  showToast('Swatch sheet saved (PNG)');
};

/**
 * How many of a set lose visible detail in `key`, or 0. Every format that reduces — each key
 * in `STOP_BUDGETS`, `.ugr` included since 2026-09-10 — is measured by
 * `collectionQualityWarnings` at its own stop budget, or at `budget` when the Settings category
 * overrides it; a format with no budget reduces nothing and never warns. The SWATCHES subject
 * reduces nothing either (the palette is already the colour list the format wants).
 */
export const setLossyCount = (favients: Favient[], key: string, subject: ExportSubject = 'ramp', budget?: number): number =>
  subject === 'swatches' ? 0 : collectionQualityWarnings(favients, key, undefined, budget).length;

/**
 * The same question for ONE gradient: 1 when `key` flattens this ramp visibly, else 0 — so
 * the window can say it with the set's own words (`lossyNote(1, …)`). Measured exactly the
 * way `collectionQualityWarnings` measures each member of a set — the format's own stop
 * budget (or the Settings override) and the same visibility threshold — so a gradient warns
 * alone if and only if it would warn inside a set. Every format with a budget reduces a
 * single download (`build` takes the budget), which is why this is not `.ai`/`.idml` only
 * as the old shell's Extras panels were. Swatches reduce nothing.
 */
export const gradientLossyCount = (ramp: RGB[], name: string, key: string, subject: ExportSubject = 'ramp', budget?: number): number => {
  if (subject === 'swatches' || !ramp.length) return 0;
  const cap = stopBudgetOf(key, budget);
  return cap === null ? 0 : aiLossyGradients([{ name, ramp }], AI_LOSSY_DELTA, cap).length;
};

/**
 * Perform an export of the working gradient and remember it as a recent. `palette` is the
 * swatch row as composed on the hero — the SWATCHES subject exports exactly that, with no
 * count of its own, because the row IS the control and it lives on the hero (L2).
 * A COPY returns the clipboard write (true once the text is there); anything else returns
 * nothing.
 */
export const runExport = (a: ExportAction, ramp: RGB[], plainName: string, palette: RGB[] = [], opts: ExportRunOpts = {}): Promise<boolean> | undefined => {
  if (a.kind === 'gmt') {
    if (runGradientFile(a.file, plainName, opts)) noteRecentExport(a);
    return undefined;
  }
  if (subjectOf(a) === 'swatches' && !palette.length) {
    showToast('No swatches to export');
    return undefined;
  }
  let copied: Promise<boolean> | undefined;
  if (a.kind === 'png') {
    // the swatch sheet: Swatches only, and a swatch palette is never credited (see the header)
    void downloadSwatchSheet(palette, plainName);
  } else {
    const r = resolveFormatExport(a, plainName, palette, opts);
    if (!r) return undefined;
    if (a.kind === 'copy') {
      // The preview's own function (`exportText`), so the window cannot show one text and copy another.
      const text = exportText(a, ramp, plainName, palette, opts);
      if (text === null) return undefined;
      copied = copyText(text, (r.palette && r.f.swatchLabel) || r.f.label, !opts.confirmsCopy);
    } else downloadFormat(r.f, ramp, r.name, r.palette, opts.budget, r.stem);
  }
  noteRecentExport(a);
  return copied;
};
