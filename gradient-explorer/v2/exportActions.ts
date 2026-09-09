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
import { getExportFormat, grdStopCount, type ExportFormatDef, type ExportSubject } from '../../palette/core/exportFormats';
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

/**
 * One export. `subject` is WHICH FACE of the gradient it takes (§8b item 5): 'ramp' is the
 * continuous 256-step gradient, 'swatches' is the palette the user composed on the hero.
 * Optional, and absent means 'ramp' — recents written before 2026-09-09 have no subject
 * and must keep meaning what they meant.
 */
export type ExportAction =
  | { kind: 'copy' | 'download'; key: string; subject?: ExportSubject }
  | { kind: 'png'; subject?: ExportSubject };

const subjectOf = (a: ExportAction): ExportSubject => a.subject ?? 'ramp';

const STORAGE_KEY = 'gx.v2.recentExports';
const MAX_RECENT = 3;

const isAction = (a: unknown): a is ExportAction => {
  if (!a || typeof a !== 'object') return false;
  const o = a as { kind?: unknown; key?: unknown; subject?: unknown };
  if (o.subject !== undefined && o.subject !== 'ramp' && o.subject !== 'swatches') return false;
  if (o.kind === 'png') return true;
  if (o.kind !== 'copy' && o.kind !== 'download') return false;
  if (typeof o.key !== 'string') return false;
  const f = getExportFormat(o.key);
  // A swatches recent whose format has since lost its swatches builder is as dead as an
  // unknown key: dropped on load rather than offered as a click that would do nothing.
  return !!f && (o.subject !== 'swatches' || !!f.swatches);
};
const same = (a: ExportAction, b: ExportAction): boolean =>
  a.kind === b.kind && subjectOf(a) === subjectOf(b) && (a.kind === 'png' || a.key === (b as { key: string }).key);

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
  const sw = subjectOf(a) === 'swatches';
  if (a.kind === 'png') return sw ? 'Download swatch sheet' : 'Download PNG strip';
  const f = getExportFormat(a.key);
  if (!f) return a.kind === 'copy' ? 'Copy' : 'Download';
  const label = (sw && f.swatchLabel) || f.label;
  const face = sw ? ' swatches' : '';
  return a.kind === 'copy' ? `Copy ${label}${face}` : `Download .${f.ext}${face}`;
};

export const slugName = (name: string): string => name.trim().replace(/[^\w-]+/g, '_').slice(0, 48) || 'gradient';

/** The bytes for one format and one subject. `palette` non-null selects the SWATCHES
 *  subject; the caller has already checked the format has a swatches builder. */
const bytesFor = (f: ExportFormatDef, ramp: RGB[], name: string, palette: RGB[] | null): string | Uint8Array =>
  palette ? f.swatches!(palette, name) : f.build(ramp, name);

const copyFormat = (f: ExportFormatDef, ramp: RGB[], name: string, palette: RGB[] | null) => {
  const out = bytesFor(f, ramp, name, palette);
  navigator.clipboard?.writeText(out as string).then(
    () => showToast(`Copied ${(palette && f.swatchLabel) || f.label}`),
    () => showToast('Copy failed'),
  );
};

const downloadFormat = (f: ExportFormatDef, ramp: RGB[], name: string, palette: RGB[] | null) => {
  const out = bytesFor(f, ramp, name, palette);
  const blob = f.binary ? new Blob([out as unknown as BlobPart], { type: 'application/octet-stream' }) : new Blob([out as string], { type: 'text/plain' });
  downloadBlob(blob, `${slugName(name)}${palette ? '-swatches' : ''}.${f.ext}`);
  // The .grd stop count is a RAMP fact (it is what the reduction left); a swatch export
  // writes exactly the colours it was handed, so it says how many rather than implying a
  // reduction that did not happen.
  if (palette) showToast(`Downloaded .${f.ext} (${palette.length} swatches)`);
  else showToast(f.key === 'grd' ? `Downloaded .grd (${grdStopCount(ramp)} stops)` : `Downloaded .${f.ext}`);
};

const downloadPng = (ramp: RGB[], name: string) => {
  const o = document.createElement('canvas');
  o.width = 1024;
  o.height = 64;
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
    downloadBlob(bl, `${slugName(name)}.png`);
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
): void => {
  if (!favients.length) {
    showToast('That set is empty');
    return;
  }
  const stem = slugName(setName);
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
    downloadBlob(new Blob([zip as unknown as BlobPart], { type: 'application/zip' }), `${stem}-swatches.zip`);
    showToast(`Exported ${favients.length} palettes as .zip`);
    return;
  }
  const file = buildCollectionFile(favients, key);
  if (file) {
    const data = typeof file.data === 'string' ? file.data : (file.data as unknown as BlobPart);
    downloadBlob(new Blob([data], { type: 'application/octet-stream' }), `${stem}.${file.ext}`);
    showToast(`Exported ${favients.length} → .${file.ext}`);
    return;
  }
  const bytes = buildCollectionZip(favients, key);
  downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/zip' }), `${stem}.zip`);
  showToast(`Exported ${favients.length} as .zip`);
};

/** The set's image: a contact sheet of the ramps (OD2), or a sheet of the palettes. */
export const runSetImage = async (favients: Favient[], setName: string, subject: ExportSubject = 'ramp', n = 7): Promise<void> => {
  if (!favients.length) {
    showToast('That set is empty');
    return;
  }
  const blob =
    subject === 'swatches' ? await buildSwatchSheet(setSwatches(favients, n), setName) : await buildContactSheet(favients, setName);
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
export const setLossyCount = (favients: Favient[], key: string, subject: ExportSubject = 'ramp'): number =>
  subject === 'swatches' ? 0 : collectionQualityWarnings(favients, key).length;

/**
 * Perform an export of the working gradient and remember it as a recent. `palette` is the
 * swatch row as composed on the hero — the SWATCHES subject exports exactly that, with no
 * count of its own, because the row IS the control and it lives on the hero (L2).
 */
export const runExport = (a: ExportAction, ramp: RGB[], name: string, palette: RGB[] = []): void => {
  const swatches = subjectOf(a) === 'swatches';
  if (swatches && !palette.length) {
    showToast('No swatches to export');
    return;
  }
  if (a.kind === 'png') {
    if (swatches) void downloadSwatchSheet(palette, name);
    else downloadPng(ramp, name);
  } else {
    const f = getExportFormat(a.key);
    if (!f) return;
    if (swatches && !f.swatches) return;
    if (a.kind === 'copy') copyFormat(f, ramp, name, swatches ? palette : null);
    else downloadFormat(f, ramp, name, swatches ? palette : null);
  }
  noteRecentExport(a);
};
