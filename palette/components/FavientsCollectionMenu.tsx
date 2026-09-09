/**
 * FavientsCollectionMenu — the kebab that manages the COLLECTION as a whole: import a
 * gradient file, save / merge / replace / clear the collection, export every gradient in
 * any of the 16 formats, and the contact sheet.
 *
 * Lifted out of `FavientsPanel` on 2026-09-09, unchanged. GE v2 retired the rest of that
 * panel — grouping, dividers, search, list view, rename, trash and drag-to-reorder all
 * moved onto the ground itself (the set rail, the wall's bands, `GroundList`) — and this
 * menu was the one thing with no equivalent there, because it is the only surface that acts
 * on the whole shelf at once rather than on a set or a gradient. Owner, 2026-09-09: "we can
 * retire almost the whole 'more section' except for its dropdown menu."
 *
 * Still mounted inside `FavientsPanel`'s toolbar for app-gmt, fluid-toy and the old shell,
 * which keep the full panel. One component, two hosts — not a fork.
 *
 * `onFlash` is the message sink: the panel passes its own inline flash, v2 passes the
 * global toast. Nothing here knows which host it is in.
 *
 * @see palette/core/importGradientFiles.ts (the import path, shared with the rail)
 * @see palette/core/favientsExport.ts (the collection zip / bundle / contact sheet)
 */

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { clampToViewport } from '../../components/ui/viewportClamp';
import { useFavientsStore } from '../store/favientsStore';
import { downloadBlob } from '../../utils/SceneFormat';
import { EXPORT_FORMATS, getExportFormat, AI_STOP_LIMIT } from '../core/exportFormats';
import { buildCollectionZip, buildCollectionFile, buildContactSheet, collectionQualityWarnings } from '../core/favientsExport';
import { GRADIENT_FILE_ACCEPT, readGradientFiles, importGradientsInto, importSummary } from '../core/importGradientFiles';
import { paramEdit as favEdit } from '../store/paramUndoBracket';
import { useDismiss } from '../../hooks/useDismiss';

const KebabIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);


const menuItemCls =
  'w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left rounded text-xs text-fg-tertiary hover:text-fg hover:bg-line/10 transition-colors';



/**
 * The popover itself. Saves the
 * collection to a re-importable JSON, loads (merge) / replaces it from a file, clears
 * it, and exports the gradients as a per-format .zip or a PNG contact sheet. Styled to
 * match the engine's system-menu popovers.
 */
export const FavientsCollectionMenu: React.FC<{ onFlash: (m: string) => void }> = ({ onFlash }) => {
  const favients = useFavientsStore((s) => s.favients);
  const exportCollection = useFavientsStore((s) => s.exportCollection);
  const importCollection = useFavientsStore((s) => s.importCollection);
  const clear = useFavientsStore((s) => s.clear);

  const [open, setOpen] = useState(false);
  const [zipFmt, setZipFmt] = useState(EXPORT_FORMATS[0].key);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const gradientFileRef = useRef<HTMLInputElement>(null);
  const importMode = useRef<'merge' | 'replace'>('merge');

  useDismiss(rootRef, { onClose: () => setOpen(false), enabled: open, escape: true });

  // N6: keep the popover on-screen. The Favients panel floats, so its header can sit near
  // the viewport's right/bottom edge — where the default `right-0 top-full` anchor would
  // clip the menu off. Measure once open, then translate it back inside via the shared
  // `clampToViewport` (flip off — it's already anchored, we only push it in-bounds). We
  // subtract the applied nudge to recover the un-transformed rect, so the calc is stable
  // and converges in one extra pass (the `!==` guard stops it). `placed` hides the menu
  // for the first paint so there's no visible jump from the raw anchor to the corrected one.
  const [nudge, setNudge] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [placed, setPlaced] = useState(false);
  useLayoutEffect(() => {
    if (!open) {
      if (placed) setPlaced(false);
      if (nudge.x !== 0 || nudge.y !== 0) setNudge({ x: 0, y: 0 });
      return;
    }
    const el = menuRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const natX = r.left - nudge.x, natY = r.top - nudge.y; // un-nudged top-left
    const { x, y } = clampToViewport(
      { x: natX, y: natY },
      { width: r.width, height: r.height },
      { width: window.innerWidth, height: window.innerHeight },
      { flip: false },
    );
    const dx = x - natX, dy = y - natY;
    if (dx !== nudge.x || dy !== nudge.y) setNudge({ x: dx, y: dy });
    if (!placed) setPlaced(true);
  }, [open, nudge, placed]);

  const close = () => setOpen(false);
  const empty = favients.length === 0;

  const saveCollection = () => {
    const blob = new Blob([exportCollection()], { type: 'application/json' });
    downloadBlob(blob, 'favients-collection.json');
    onFlash('Collection saved (.json)');
    close();
  };

  const pickFile = (mode: 'merge' | 'replace') => {
    if (mode === 'replace' && !empty && !window.confirm('Replace the current Favients collection with the loaded file?')) return;
    importMode.current = mode;
    fileRef.current?.click();
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    // Bracket the load as one undo entry (merge OR replace) — the provider snapshot
    // is taken before importCollection mutates the shelf, so Ctrl+Z restores it.
    let n: number | null = null;
    favEdit(() => { n = importCollection(text, importMode.current); });
    if (n == null) onFlash("That file isn't a Favients collection");
    else onFlash(importMode.current === 'replace' ? `Replaced — ${n} loaded` : n ? `Merged ${n} new` : 'Nothing new to merge');
    close();
  };

  // Import one or more GRADIENT files (.map/.gpl/.ggr/.cpt/.css/.json — distinct from a
  // Favients *collection*). The whole path — read, parse, name, fit, add — is the shared
  // `importGradientFiles`, which GE v2's rail menu and root drop call too. Naming no
  // destination, this menu keeps the shelf's last-used group and whole-collection dedupe
  // (see that module's header).
  const onGradientFiles = async (files: FileList) => {
    // Read every file FIRST (async), so the undo bracket below stays fully
    // SYNCHRONOUS. Holding a param transaction open across awaits risks another
    // gesture's beginParamTransaction clobbering the engine's single
    // interactionSnapshot mid-import — which would drop the import's undo entry.
    const reads = await readGradientFiles(files);
    let outcome = { imported: 0, skipped: 0 };
    // Bracket the whole batch as ONE undo entry (empty diff → no entry if nothing added).
    favEdit(() => { outcome = importGradientsInto(reads); });
    onFlash(importSummary(outcome));
    close();
  };

  const doClear = () => {
    if (empty) return;
    // Clear is undoable now (the history provider snapshots the shelf), so the
    // confirm no longer warns "cannot be undone" — keep it only as a guard rail.
    if (window.confirm(`Clear all ${favients.length} favourite${favients.length === 1 ? '' : 's'}? You can undo this.`)) {
      favEdit(() => clear());
      onFlash('Collection cleared');
    }
    close();
  };

  // Collection formats (e.g. Illustrator .ai) bundle every favourite into ONE
  // importable file; everything else exports one file per gradient inside a .zip.
  const selFmt = getExportFormat(zipFmt);
  const isCollection = !!selFmt?.collection;

  // Collection swatch formats (.ai/.idml) hold a limited number of colour stops, so the
  // most complex gradients are simplified on export. This is a normal format limitation,
  // not an error — surface it as an inline notice, never a blocking prompt.
  const lossy = useMemo(
    () => (isCollection ? collectionQualityWarnings(favients, zipFmt) : []),
    [isCollection, favients, zipFmt],
  );

  const exportFmt = () => {
    if (empty) { onFlash('Nothing to export'); return; }
    if (isCollection) {
      const file = buildCollectionFile(favients, zipFmt)!;
      const data = typeof file.data === 'string' ? file.data : (file.data as unknown as BlobPart);
      downloadBlob(new Blob([data], { type: 'application/octet-stream' }), `favients.${file.ext}`);
      onFlash(`Exported ${favients.length} → .${file.ext}`);
    } else {
      const bytes = buildCollectionZip(favients, zipFmt);
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/zip' }), 'favients.zip');
      onFlash(`Exported ${favients.length} as .zip`);
    }
    close();
  };

  const exportSheet = async () => {
    if (empty) { onFlash('Nothing to export'); return; }
    const blob = await buildContactSheet(favients);
    if (blob) {
      downloadBlob(blob, 'favients-contact-sheet.png');
      onFlash('Contact sheet saved (PNG)');
    }
    close();
  };

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        aria-label="Load Favients collection"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          if (fileRef.current) fileRef.current.value = '';
        }}
      />
      <input
        ref={gradientFileRef}
        type="file"
        accept={GRADIENT_FILE_ACCEPT}
        multiple
        aria-label="Import gradient files"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onGradientFiles(e.target.files);
          if (gradientFileRef.current) gradientFileRef.current.value = '';
        }}
      />
      <button
        onClick={() => setOpen((o) => !o)}
        title="Collection — save, load, export"
        className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${open ? 'text-fg bg-line/10' : 'text-fg-muted hover:text-fg hover:bg-line/10'}`}
      >
        <KebabIcon />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-52 bg-surface border border-line/15 rounded-lg shadow-2xl z-50 p-1"
          style={{
            opacity: placed ? 1 : 0,
            transform: nudge.x || nudge.y ? `translate(${nudge.x}px, ${nudge.y}px)` : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className={menuItemCls} onClick={() => gradientFileRef.current?.click()}>Import gradient file…</button>
          <button className={menuItemCls} onClick={saveCollection}>Save collection (.json)</button>
          <button className={menuItemCls} onClick={() => pickFile('merge')}>Load &amp; merge…</button>
          <button className={menuItemCls} onClick={() => pickFile('replace')}>Replace from file…</button>
          <button className={`${menuItemCls} hover:!text-danger`} onClick={doClear}>Clear collection</button>

          <div className="h-px bg-line/10 my-1" />
          <div className="text-[9px] font-bold text-fg-dim uppercase tracking-wider px-2 py-1">Export</div>
          <div className="flex items-center gap-1 px-2 py-1" onClick={(e) => e.stopPropagation()}>
            <select
              value={zipFmt}
              onChange={(e) => setZipFmt(e.target.value)}
              title={isCollection ? 'Bundles every favourite into one file' : 'Per-gradient file format for the .zip'}
              className="flex-1 min-w-0 bg-surface-sunken border border-line/10 rounded text-[11px] text-fg-secondary px-1 py-0.5 outline-none focus:border-accent-500"
            >
              {EXPORT_FORMATS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
            <button
              onClick={exportFmt}
              title={isCollection ? `Export all ${favients.length} as one .${selFmt!.ext}` : `Export ${favients.length} files in a .zip`}
              className="shrink-0 text-[11px] px-2 py-0.5 rounded bg-line/[0.06] text-fg-secondary hover:bg-line/10 transition-colors"
            >
              {isCollection ? `.${selFmt!.ext}` : '.zip'}
            </button>
          </div>
          {lossy.length > 0 && (
            <div className="px-2 pb-1 text-[10px] leading-snug text-fg-muted">
              {lossy.length} of {favients.length} use more than {AI_STOP_LIMIT} colour stops, so they export simplified to .{selFmt!.ext}. Most apps cap stops similarly.
            </div>
          )}
          <button className={menuItemCls} onClick={exportSheet}>Contact sheet (PNG)</button>
        </div>
      )}
    </div>
  );
};

export default FavientsCollectionMenu;
