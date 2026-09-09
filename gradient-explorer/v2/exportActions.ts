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
 */

import { useSyncExternalStore } from 'react';
import { getExportFormat, grdStopCount, type ExportFormatDef } from '../../palette/core/exportFormats';
import { downloadBlob } from '../../utils/SceneFormat';
import { showToast } from '../../engine/store/toastStore';
import type { RGB } from '../../palette/core/oklab';

export type ExportAction = { kind: 'copy' | 'download'; key: string } | { kind: 'png' };

const STORAGE_KEY = 'gx.v2.recentExports';
const MAX_RECENT = 3;

const isAction = (a: unknown): a is ExportAction => {
  if (!a || typeof a !== 'object') return false;
  const o = a as { kind?: unknown; key?: unknown };
  if (o.kind === 'png') return true;
  return (o.kind === 'copy' || o.kind === 'download') && typeof o.key === 'string' && !!getExportFormat(o.key);
};
const same = (a: ExportAction, b: ExportAction): boolean => a.kind === b.kind && (a.kind === 'png' || a.key === (b as { key: string }).key);

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
  if (a.kind === 'png') return 'Download PNG strip';
  const f = getExportFormat(a.key);
  if (!f) return a.kind === 'copy' ? 'Copy' : 'Download';
  return a.kind === 'copy' ? `Copy ${f.label}` : `Download .${f.ext}`;
};

export const slugName = (name: string): string => name.trim().replace(/[^\w-]+/g, '_').slice(0, 48) || 'gradient';

const copyFormat = (f: ExportFormatDef, ramp: RGB[]) => {
  const out = f.build(ramp);
  navigator.clipboard?.writeText(out as string).then(
    () => showToast(`Copied ${f.label}`),
    () => showToast('Copy failed'),
  );
};

const downloadFormat = (f: ExportFormatDef, ramp: RGB[], name: string) => {
  const out = f.build(ramp);
  const blob = f.binary ? new Blob([out as unknown as BlobPart], { type: 'application/octet-stream' }) : new Blob([out as string], { type: 'text/plain' });
  downloadBlob(blob, `${slugName(name)}.${f.ext}`);
  showToast(f.key === 'grd' ? `Downloaded .grd (${grdStopCount(ramp)} stops)` : `Downloaded .${f.ext}`);
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

/** Perform an export of the working ramp and remember it as a recent. */
export const runExport = (a: ExportAction, ramp: RGB[], name: string): void => {
  if (a.kind === 'png') downloadPng(ramp, name);
  else {
    const f = getExportFormat(a.key);
    if (!f) return;
    if (a.kind === 'copy') copyFormat(f, ramp);
    else downloadFormat(f, ramp, name);
  }
  noteRecentExport(a);
};
