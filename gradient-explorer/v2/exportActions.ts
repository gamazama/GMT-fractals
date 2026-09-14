/**
 * exportActions — what an Export DOES, apart from where it is shown (added 2026-09-07 with
 * the hero's hover flyout; plans/ge-v2-figma/hero-spec.md §7f).
 *
 * One `ExportAction` is a copy or a download of one registry format (`palette/core/
 * exportFormats.ts`), or the PNG strip. `runExport` performs it and toasts; it also notes
 * it as a RECENT, which is what the hero's Export icon shows on hover — the last three
 * things this person exported, one click each. `ExportMenu` (the full floating window)
 * runs the same function, so the two surfaces cannot drift.
 *
 * Recents persist in localStorage (`gx.v2.recentExports`); an unknown format key (a
 * renamed registry entry) is dropped on load, never shown.
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
 * repeat; the registry formats keep their own kinds. Guard: `npm run smoke:ge-gradientfile` [a0] [a] [e] [f]
 * (falsified by dropping each stop's bias and interpolation from the written config).
 *
 * `runSetExport` is the same registry pointed at a SET of gradients rather than one
 * (§8b item 4, the 2026-09-08 migration audit's M1): a collection format bundles the set
 * into one file, everything else becomes a .zip of one file per gradient, and the contact
 * sheet is a PNG grid of the whole set. The building is
 * `palette/core/favientsExport.ts`, unchanged — what moved is WHAT it is pointed at.
 * Before this it existed only inside the My Gradients kebab and always meant the whole
 * collection; the set is the noun Phase D created. A set export is NOT noted as a recent:
 * the hero's flyout offers one-click repeats of the WORKING gradient, and a set is a
 * different subject.
 */

import { useSyncExternalStore } from 'react';
import { getExportFormat, grdStopCount, aiLossyGradients, stopBudgetOf, exportFileName, AI_LOSSY_DELTA, type ExportFormatDef, type ExportSubject } from '../../palette/core/exportFormats';
import { downloadBlob } from '../../utils/SceneFormat';
import { showToast } from '../../engine/store/toastStore';
import type { RGB } from '../../palette/core/oklab';
import {
  buildCollectionFile,
  buildCollectionZip,
  buildContactSheet,
  buildSwatchCollectionFile,
  buildSwatchSheet,
  buildSwatchZip,
  collectionQualityWarnings,
  setSwatches,
} from '../../palette/core/favientsExport';
import type { Favient } from '../../palette/store/favientsStore';
import { exportNameFor, withExportName } from '../../palette/core/catalogOrigin';
import { buildGradientFile, type GradientFileKind, type BuiltGradientFile } from '../../palette/core/gradientFile';
import { useFavientsStore } from '../../palette/store/favientsStore';
import type { GradientConfig } from '../../types';

/**
 * One export. `subject` is WHICH FACE of the gradient it takes (§8b item 5): 'ramp' is the
 * continuous 256-step gradient, 'swatches' is the palette the user composed on the hero.
 * Optional, and absent means 'ramp' — recents written before 2026-09-09 have no subject
 * and must keep meaning what they meant.
 */
/** The Settings category's values, carried to whatever does the writing. `budget` is the
 *  stop override (undefined = each format's own); `pngW`/`pngH` size the PNG strip. */
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
}


export type ExportAction =
  | { kind: 'copy' | 'download'; key: string; subject?: ExportSubject }
  | { kind: 'png'; subject?: ExportSubject }
  /** The GMT gradient file (ADR-0123) — the gradient itself, so it has no subject. */
  | { kind: 'gmt'; file: GradientFileKind };

const subjectOf = (a: ExportAction): ExportSubject => (a.kind === 'gmt' ? 'ramp' : a.subject ?? 'ramp');

const STORAGE_KEY = 'gx.v2.recentExports';
const MAX_RECENT = 3;

const isAction = (a: unknown): a is ExportAction => {
  if (!a || typeof a !== 'object') return false;
  const o = a as { kind?: unknown; key?: unknown; subject?: unknown };
  if (o.subject !== undefined && o.subject !== 'ramp' && o.subject !== 'swatches') return false;
  if (o.kind === 'png') return true;
  if (o.kind === 'gmt') return (a as { file?: unknown }).file === 'png' || (a as { file?: unknown }).file === 'json';
  if (o.kind !== 'copy' && o.kind !== 'download') return false;
  if (typeof o.key !== 'string') return false;
  const f = getExportFormat(o.key);
  // A swatches recent whose format has since lost its swatches builder is as dead as an
  // unknown key: dropped on load rather than offered as a click that would do nothing.
  return !!f && (o.subject !== 'swatches' || !!f.swatches);
};
const same = (a: ExportAction, b: ExportAction): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'gmt') return a.file === (b as { file: GradientFileKind }).file;
  return subjectOf(a) === subjectOf(b) && (a.kind === 'png' || a.key === (b as { key: string }).key);
};

const load = (): ExportAction[] => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter(isAction).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
};

let recents: ExportAction[] = load();
const subscribers = new Set<() => void>();

export const noteRecentExport = (a: ExportAction): void => {
  recents = [a, ...recents.filter((r) => !same(r, a))].slice(0, MAX_RECENT);
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

export const exportActionLabel = (a: ExportAction): string => {
  if (a.kind === 'gmt') return `Download GMT gradient (.${a.file})`;
  const sw = subjectOf(a) === 'swatches';
  if (a.kind === 'png') return sw ? 'Download swatch sheet' : 'Download PNG strip';
  const f = getExportFormat(a.key);
  if (!f) return a.kind === 'copy' ? 'Copy' : 'Download';
  const label = (sw && f.swatchLabel) || f.label;
  const face = sw ? ' swatches' : '';
  return a.kind === 'copy' ? `Copy ${label}${face}` : `Download .${f.ext}${face}`;
};

export const slugName = (name: string): string => name.trim().replace(/[^\w-]+/g, '_').slice(0, 48) || 'gradient';

/**
 * The file stem of a download whose name CARRIES A CREDIT: the credit is kept whole and the
 * name gives way, because a 48-character slug would otherwise cut exactly the part that matters
 * ("A_long_gradient_name_cpt-city_jjg_ccolo_ev"). Only for a credited name — every other
 * download keeps `slugName`, so nothing that is not a catalogue gradient changes filename.
 */
export const creditedFileStem = (plainName: string, credited: string): string => {
  const credit = credited.trim().slice(plainName.trim().length).replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');
  if (!credit) return slugName(credited);
  return `${slugName(plainName).slice(0, Math.max(12, 48 - credit.length - 1))}_${credit}`;
};

/** The bytes for one format and one subject. `palette` non-null selects the SWATCHES
 *  subject; the caller has already checked the format has a swatches builder. */
const bytesFor = (f: ExportFormatDef, ramp: RGB[], name: string, palette: RGB[] | null, budget?: number): string | Uint8Array =>
  palette ? f.swatches!(palette, name) : f.build(ramp, name, budget);

const copyFormat = (f: ExportFormatDef, ramp: RGB[], name: string, palette: RGB[] | null, budget?: number) => {
  const out = bytesFor(f, ramp, name, palette, budget);
  navigator.clipboard?.writeText(out as string).then(
    () => showToast(`Copied ${(palette && f.swatchLabel) || f.label}`),
    () => showToast('Copy failed'),
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

const downloadPng = (ramp: RGB[], name: string, w = 1024, h = 64, stem = slugName(name)) => {
  const o = document.createElement('canvas');
  o.width = Math.max(1, Math.round(w));
  o.height = Math.max(1, Math.round(h));
  const x = o.getContext('2d');
  const r = document.createElement('canvas');
  r.width = 256;
  r.height = 1;
  const rc = r.getContext('2d');
  if (!x || !rc) return;
  const img = rc.createImageData(256, 1);
  for (let i = 0; i < 256; i++) {
    img.data[i * 4] = Math.round(ramp[i].r);
    img.data[i * 4 + 1] = Math.round(ramp[i].g);
    img.data[i * 4 + 2] = Math.round(ramp[i].b);
    img.data[i * 4 + 3] = 255;
  }
  rc.putImageData(img, 0, 0);
  x.imageSmoothingEnabled = true;
  x.drawImage(r, 0, 0, 256, 1, 0, 0, o.width, o.height);
  o.toBlob((bl) => {
    if (!bl) return;
    downloadBlob(bl, `${stem}.png`);
    showToast('Downloaded .png strip');
  });
};

/** The working gradient's palette as a labelled swatch sheet — the swatches subject's
 *  answer to the PNG strip. One entry, the same drawing the set uses. */
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
 * exactly as a registry download's does.
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
  if (subject !== 'swatches') favients = favients.map(withExportName);
  if (subject === 'swatches') {
    const items = setSwatches(favients, n);
    const one = buildSwatchCollectionFile(items, key);
    if (one) {
      const data = typeof one.data === 'string' ? one.data : (one.data as unknown as BlobPart);
      downloadBlob(new Blob([data], { type: 'application/octet-stream' }), `${stem}.${one.ext}`);
      showToast(`Exported ${favients.length} palettes → .${one.ext}`);
      return;
    }
    const zip = buildSwatchZip(items, key);
    if (!zip) {
      showToast('That format has no swatch form');
      return;
    }
    downloadBlob(new Blob([zip as unknown as BlobPart], { type: 'application/zip' }), `${zipStem}-swatches.zip`);
    showToast(`Exported ${favients.length} palettes as .zip`);
    return;
  }
  const file = buildCollectionFile(favients, key, budget);
  if (file) {
    const data = typeof file.data === 'string' ? file.data : (file.data as unknown as BlobPart);
    downloadBlob(new Blob([data], { type: 'application/octet-stream' }), `${stem}.${file.ext}`);
    showToast(`Exported ${favients.length} → .${file.ext}`);
    return;
  }
  const bytes = buildCollectionZip(favients, key, budget);
  downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/zip' }), `${zipStem}.zip`);
  showToast(`Exported ${favients.length} as .zip`);
};

/** The set's image: a contact sheet of the ramps (OD2), or a sheet of the palettes. */
export const runSetImage = async (favients: Favient[], setName: string, subject: ExportSubject = 'ramp', n = 7): Promise<void> => {
  if (!favients.length) {
    showToast('That set is empty');
    return;
  }
  const blob =
    subject === 'swatches' ? await buildSwatchSheet(setSwatches(favients, n), setName) : await buildContactSheet(favients.map(withExportName), setName);
  if (!blob) {
    showToast('Could not draw the sheet');
    return;
  }
  downloadBlob(blob, `${slugName(setName)}-${subject === 'swatches' ? 'swatches' : 'contact-sheet'}.png`);
  showToast(subject === 'swatches' ? 'Swatch sheet saved (PNG)' : 'Contact sheet saved (PNG)');
};

/**
 * How many of a set lose visible detail in `key`, or 0. `.ai`/`.idml` only — see
 * `collectionQualityWarnings`, whose `.ugr` exemption is an `@assumption` there. The
 * SWATCHES subject reduces nothing (the palette is already the colour list the format
 * wants), so it never warns.
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
 */
export const runExport = (a: ExportAction, ramp: RGB[], plainName: string, palette: RGB[] = [], opts: ExportRunOpts = {}): void => {
  if (a.kind === 'gmt') {
    if (runGradientFile(a.file, plainName, opts)) noteRecentExport(a);
    return;
  }
  const swatches = subjectOf(a) === 'swatches';
  const name = swatches ? plainName : exportNameFor(plainName, opts.origin, opts.config);
  const stem = name === plainName ? slugName(name) : creditedFileStem(plainName, name);
  if (swatches && !palette.length) {
    showToast('No swatches to export');
    return;
  }
  if (a.kind === 'png') {
    if (swatches) void downloadSwatchSheet(palette, name);
    else downloadPng(ramp, name, opts.pngW, opts.pngH, stem);
  } else {
    const f = getExportFormat(a.key);
    if (!f) return;
    if (swatches && !f.swatches) return;
    if (a.kind === 'copy') copyFormat(f, ramp, name, swatches ? palette : null, opts.budget);
    else downloadFormat(f, ramp, name, swatches ? palette : null, opts.budget, stem);
  }
  noteRecentExport(a);
};
