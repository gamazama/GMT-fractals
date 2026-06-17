/**
 * FavientsPanel — the persistent gradient-favourites shelf. Registered as the
 * `panel-favients` component and dropped into a host's panel manifest.
 *
 * Drag-and-drop:
 *   • drag a swatch → a LIVE placeholder shows where it will land; drop reorders it.
 *   • drag a gradient IN from the Picker → same placeholder; drop inserts it at that spot
 *     (or moves the existing favourite if it's already one).
 *   • drop in the lower half of the empty tail → a NEW group (editable divider).
 *   • a Trash zone appears while dragging — drop a favourite there to remove it.
 *
 * Host-agnostic: reads its own store (favientsStore) + the shared send-target registry
 * (host-group destinations) + favientTargets' host-capability flags (select-mode / browse
 * / studio). The header's "Palettes" button calls a host-registered browse action.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { GenericDropdown } from '../../components/GenericDropdown';
import { Hint } from '../../components/Hint';
import { clampToViewport } from '../../components/ui/viewportClamp';
import {
  useFavientsStore,
  favientSig,
  newGroupId,
  DEFAULT_GROUP,
  type Favient,
} from '../store/favientsStore';
import {
  subscribeFavientHost,
  getFavientBrowseAction,
  getFavientStudioAction,
  getFavientSelectMode,
} from '../core/favientTargets';
import { getSendTargets, subscribeSendTargets, type SendTarget } from '../../store/sendTargetRegistry';
import { setFavientDrag, beginCustomAvatarDrag, readFavientDrag, FAVIENT_DND_MIME, type FavientDragPayload } from '../core/favientDnd';
import { useHeroPick, useActiveHeroMode, setHeroDrag, setHeroPick } from '../store/heroSelection';
import { setDragOrigin, markPickLanded } from '../store/dragVisual';
import { renderStopsToRamp } from '../core/gmtGradient';
import { configToName } from '../core/facetName';
import { GradientHoverPreview, type GradientHover } from './GradientHoverPreview';
import { FavientsIcon } from './FavientsIcon';
import type { RGB } from '../core/oklab';
import { useEngineStore } from '../../store/engineStore';
import { useDismiss } from '../../hooks/useDismiss';
import { useDragEndSafetyNet } from '../../hooks/useDragEndSafetyNet';
import { downloadBlob } from '../../utils/SceneFormat';
import { EXPORT_FORMATS, getExportFormat, AI_STOP_LIMIT } from '../core/exportFormats';
import { buildCollectionZip, buildCollectionFile, buildContactSheet, collectionQualityWarnings } from '../core/favientsExport';
import { parseGradientText, IMPORT_EXTENSIONS } from '../core/importFormats';
import { fitRampToStops } from '../core/stopFit';
import {
  getFavientsViewMode,
  setFavientsViewMode,
  type FavientsViewMode,
} from '../store/favientsPanelPersist';
// Favourite mutations ride the engine's PARAM undo stack via a history PROVIDER
// (captureFavientsHistory, registered in registerPaletteUI). Bracketing happens HERE
// at the panel gesture boundary — not in favientsStore, which stays engine-store-
// agnostic. The shared paramUndoBracket helper is the same one the generator uses.
// Discrete gestures use favEdit(); the group-rename input coalesces a keystroke burst
// via focus/blur.
import { paramEditStart as favEditStart, paramEditEnd as favEditEnd, paramEdit as favEdit } from '../store/paramUndoBracket';

/**
 * Host apply-targets for the "Destination" dropdown (dropdown hosts like app-gmt). They
 * live in the shared send-target registry now (group 'host'); the Explorer's 'mode'
 * targets are driven by the dock, not this dropdown, so we filter to the host group.
 * Re-render on registry changes (useSyncExternalStore) AND on host-capability changes
 * (select-mode / browse / studio), so a late host registration still surfaces.
 */
const useHostTargets = (): SendTarget<FavientDragPayload>[] => {
  const all = useSyncExternalStore(subscribeSendTargets, getSendTargets, getSendTargets);
  const [, force] = useState(0);
  useEffect(() => subscribeFavientHost(() => force((n) => n + 1)), []);
  return useMemo(() => all.filter((t) => t.group === 'host') as SendTarget<FavientDragPayload>[], [all]);
};

const KebabIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);

const menuItemCls =
  'w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left rounded text-xs text-gray-300 hover:text-white hover:bg-white/10 transition-colors';

/** `accept` attribute for the gradient-file import picker (the text formats we parse). */
const GRADIENT_FILE_ACCEPT = IMPORT_EXTENSIONS.map((e) => '.' + e).join(',');

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

/**
 * The name a dragged-in gradient gets when added. Drag-to-Favients is the sole add-path
 * now (starring is gone), so a payload with no explicit name auto-derives a perceptual
 * label (e.g. "Warm Vivid Rainbow") via the shared `configToName` instead of landing
 * blank — the same fallback the `favients` send-target uses, so the panel's own insert
 * (an actual drag onto the shelf, which the passthrough dropbox hands off) names exactly
 * like the click-through flat-add.
 */
const addName = (p: FavientDragPayload): string => p.name?.trim() || configToName(p.config);

/**
 * FavientsSystemMenu — collection-management popover in the panel header. Saves the
 * collection to a re-importable JSON, loads (merge) / replaces it from a file, clears
 * it, and exports the gradients as a per-format .zip or a PNG contact sheet. Styled to
 * match the engine's system-menu popovers.
 */
const FavientsSystemMenu: React.FC<{ onFlash: (m: string) => void }> = ({ onFlash }) => {
  const favients = useFavientsStore((s) => s.favients);
  const exportCollection = useFavientsStore((s) => s.exportCollection);
  const importCollection = useFavientsStore((s) => s.importCollection);
  const add = useFavientsStore((s) => s.add);
  const isFav = useFavientsStore((s) => s.isFav);
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
  // Favients *collection*). The File read lives here; parsing is the pure core. Each
  // gradient is fitted to stops and added to the shelf (content-deduped via isFav).
  const onGradientFiles = async (files: FileList) => {
    // Read every file FIRST (async), so the undo bracket below stays fully
    // SYNCHRONOUS. Holding a param transaction open across awaits risks another
    // gesture's beginParamTransaction clobbering the engine's single
    // interactionSnapshot mid-import — which would drop the import's undo entry.
    const reads = await Promise.all(
      Array.from(files).map(async (f) => {
        try {
          return { name: f.name, text: await f.text() };
        } catch {
          return null; // read failure on this file — never aborts the rest
        }
      }),
    );
    let imported = 0;
    let skipped = 0;
    // Bracket the whole batch as ONE undo entry (empty diff → no entry if nothing added).
    favEdit(() => {
      for (const r of reads) {
        if (!r) {
          skipped++;
          continue;
        }
        try {
          const res = parseGradientText(r.text, extOf(r.name));
          // parseGradientText guarantees a 256-length ramp, so fitRampToStops won't throw.
          const config = res && fitRampToStops(res.ramp, { targetDE: 0.02, maxStops: 32 });
          if (config && !isFav(config)) {
            add(config, gradientName(r.name), `Import · .${res!.format}`);
            imported++;
          } else skipped++; // unreadable, or a duplicate of an existing favourite
        } catch {
          skipped++; // parse failure on this file
        }
      }
    });
    onFlash(
      imported
        ? `Imported ${imported} gradient${imported > 1 ? 's' : ''}${skipped ? ` · ${skipped} skipped` : ''}`
        : 'No gradient could be read from that file',
    );
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
        className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${open ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
      >
        <KebabIcon />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-52 bg-black/95 border border-white/15 rounded-lg shadow-2xl z-50 p-1"
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
          <button className={`${menuItemCls} hover:!text-red-300`} onClick={doClear}>Clear collection</button>

          <div className="h-px bg-white/10 my-1" />
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1">Export</div>
          <div className="flex items-center gap-1 px-2 py-1" onClick={(e) => e.stopPropagation()}>
            <select
              value={zipFmt}
              onChange={(e) => setZipFmt(e.target.value)}
              title={isCollection ? 'Bundles every favourite into one file' : 'Per-gradient file format for the .zip'}
              className="flex-1 min-w-0 bg-gray-900 border border-white/10 rounded text-[11px] text-gray-200 px-1 py-0.5 outline-none focus:border-cyan-500"
            >
              {EXPORT_FORMATS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
            <button
              onClick={exportFmt}
              title={isCollection ? `Export all ${favients.length} as one .${selFmt!.ext}` : `Export ${favients.length} files in a .zip`}
              className="shrink-0 text-[11px] px-2 py-0.5 rounded bg-white/[0.06] text-gray-200 hover:bg-white/10 transition-colors"
            >
              {isCollection ? `.${selFmt!.ext}` : '.zip'}
            </button>
          </div>
          {lossy.length > 0 && (
            <div className="px-2 pb-1 text-[10px] leading-snug text-gray-400">
              {lossy.length} of {favients.length} use more than {AI_STOP_LIMIT} colour stops, so they export simplified to .{selFmt!.ext}. Most apps cap stops similarly.
            </div>
          )}
          <button className={menuItemCls} onClick={exportSheet}>Contact sheet (PNG)</button>
        </div>
      )}
    </div>
  );
};

// Swatch size + gap follow the picker's `paletteFilters` controls; fall back to these.
const DEFAULT_SWATCH_W = 32;
const DEFAULT_SWATCH_H = 18;

/** A 256×1 canvas of an RGB ramp — the source the swatch + hover zoom both blit from. */
const ramp256Canvas = (ramp: RGB[]): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 1;
  const ctx = c.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(256, 1);
    for (let i = 0; i < 256; i++) {
      img.data[i * 4] = Math.round(ramp[i].r);
      img.data[i * 4 + 1] = Math.round(ramp[i].g);
      img.data[i * 4 + 2] = Math.round(ramp[i].b);
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  return c;
};

/** Insertion index within a group container from the pointer (reading order). */
const insertIndexFromPointer = (container: HTMLElement, x: number, y: number): number => {
  const slots = container.querySelectorAll('[data-slot]');
  for (let i = 0; i < slots.length; i++) {
    const r = slots[i].getBoundingClientRect();
    if (y < r.top) return i; // pointer is above this row
    if (y <= r.bottom && x < r.left + r.width / 2) return i; // same row, left half
  }
  return slots.length;
};

/** List-row strip width (px) for the `list` view; height tracks the swatch height. */
const LIST_STRIP_W = 56;

const FavientSwatch: React.FC<{
  fav: Favient;
  /** Swatch click: SELECT (select-mode hosts) or APPLY (dropdown hosts) — the parent decides. */
  onActivate: (fav: Favient) => void;
  onHover: (h: GradientHover | null) => void;
  onDragBegin: (id: string) => void;
  swatchW: number;
  swatchH: number;
  /** Shelf layout: a compact swatch (grid) or a detail row (list). */
  view: FavientsViewMode;
  /** Group divider label for the list-row caption (grid ignores it). */
  groupLabel?: string;
  /** Whether this swatch can start a reorder drag (false while a filter is active). */
  canDrag: boolean;
  /** Rename this favourite (list view only). Live edit, bracketed for undo by the input. */
  onRename: (id: string, name: string) => void;
  /** Called when a reorder drag is attempted while disabled (filter active) — surfaces the cue. */
  onDragBlocked: () => void;
  /** This swatch is the current pick (select-mode hosts only) → enlarge + cyan ring. */
  selected?: boolean;
  /** Host flips click apply→select + enables the enlarge/selectable treatment. */
  selectMode?: boolean;
}> = ({ fav, onActivate, onHover, onDragBegin, swatchW, swatchH, view, groupLabel, canDrag, onRename, onDragBlocked, selected, selectMode }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [editing, setEditing] = useState(false);
  const list = view === 'list';
  // Canvas footprint: the compact grid swatch, or a short fixed strip in list rows.
  const cw = list ? LIST_STRIP_W : swatchW;
  const ch = list ? Math.max(14, swatchH) : swatchH;
  // Render in DISPLAY sRGB (the stored colorSpace is a bake-for-shader concern; honouring
  // it here — often 'linear' — would look dull). The picker wall renders the same way.
  const ramp = useMemo(() => renderStopsToRamp(fav.config.stops, fav.config.blendSpace ?? 'oklab', 'srgb'), [fav.config]);
  // Build the 256×1 source once per ramp — reused by both the inline draw and the
  // hover zoom (rebuilding it per hover was wasted work).
  const rampCanvas = useMemo(() => ramp256Canvas(ramp), [ramp]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(cw * dpr);
    cv.height = Math.round(ch * dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(rampCanvas, 0, 0, 256, 1, 0, 0, cv.width, cv.height);
  }, [rampCanvas, cw, ch]);

  const showHover = () => {
    const cv = ref.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const ew = cw * 3,
      eh = ch * 2;
    onHover({
      ex: r.left + r.width / 2 - ew / 2,
      ey: r.top + r.height / 2 - eh / 2,
      ew,
      eh,
      paint: (ctx, w, h) => {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(rampCanvas, 0, 0, 256, 1, 0, 0, w, h);
      },
      name: fav.name,
      sub: fav.source ? `· ${fav.source}` : undefined,
    });
  };

  // The row stays `draggable` even while a filter disables reordering, so a drag
  // ATTEMPT is detectable (dragstart fires) — we cancel it and surface the cue,
  // rather than persistently nagging. Editing suppresses drag so the input works.
  const dragProps = {
    draggable: !editing,
    onDragStart: (e: React.DragEvent) => {
      if (!canDrag) {
        e.preventDefault(); // reorder disabled while filtered — show the cue instead
        onDragBlocked();
        return;
      }
      onHover(null);
      const payload = { config: fav.config, name: fav.name, source: fav.source, favId: fav.id };
      setFavientDrag(e.dataTransfer, payload);
      beginCustomAvatarDrag(e.dataTransfer); // register the drag + suppress the native image
      setDragOrigin(e.currentTarget.getBoundingClientRect()); // morph the avatar out of the swatch
      // Drag mirrors select — gives the avatar its ramp + lets the favourite be sent to
      // a dropbox (its own internal reorder still works via the FAVIENT_INTERNAL_MIME).
      setHeroDrag({ mode: 'favients', key: fav.id, payload });
      onDragBegin(fav.id);
    },
    // Hover-enlarge is GRID-only: in list mode the popover would obscure the name and
    // fight double-click-to-rename, so list rows stay a stable size with no enlarge.
    ...(list ? {} : { onMouseEnter: showHover, onMouseLeave: () => onHover(null) }),
    title: `${fav.name}${fav.source ? ` · ${fav.source}` : ''}\nClick to ${selectMode ? 'select' : 'apply'}${canDrag ? ' · drag to reorder / onto a target' : ''}`,
  };

  if (list) {
    // Muted caption: provenance + group label (whichever exist).
    const caption = [fav.source, groupLabel].filter(Boolean).join(' · ');
    return (
      <div
        data-slot
        {...(selectMode ? { 'data-gx-selectable': '' } : {})}
        {...dragProps}
        className={`group flex items-center gap-2 px-1 py-1 rounded transition ${selected ? 'bg-cyan-500/10 ring-1 ring-cyan-400/40' : 'hover:bg-white/[0.06]'} ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      >
        {/* Strip selects/applies; name double-click renames (separate targets so renaming
            doesn't fire it). */}
        <canvas
          ref={ref}
          onClick={(e) => { setDragOrigin(e.currentTarget.getBoundingClientRect()); onActivate(fav); }}
          style={{ width: cw, height: ch }}
          className="block shrink-0 rounded-[2px] ring-1 ring-white/10 overflow-hidden cursor-pointer"
        />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={fav.name}
              // Live edit bracketed via focus/blur → ONE undo entry (mirrors group rename).
              onFocus={favEditStart}
              onBlur={() => { favEditEnd(); setEditing(false); }}
              onChange={(e) => onRename(fav.id, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur(); }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Name"
              className="w-full bg-transparent text-[11px] text-gray-100 outline-none border-b border-white/25"
            />
          ) : (
            <div
              className="text-[11px] text-gray-200 truncate cursor-text"
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              title="Click to rename"
            >
              {fav.name}
            </div>
          )}
          {caption && <div className="text-[9px] text-gray-500 truncate">{caption}</div>}
        </div>
      </div>
    );
  }

  return (
    // The wrapper (data-slot) keeps its NATURAL size — the enlarge transform lives on the
    // inner button, not here, so insertIndexFromPointer's getBoundingClientRect reads the
    // unscaled slot rect (a scaled wrapper threw off the reorder drop index). z-10 lifts the
    // selected swatch above its neighbours without changing its layout box.
    <div
      data-slot
      {...(selectMode ? { 'data-gx-selectable': '' } : {})}
      className={`group relative shrink-0 ${selected ? 'z-10' : ''}`}
      {...dragProps}
    >
      <button
        onClick={(e) => { setDragOrigin(e.currentTarget.getBoundingClientRect()); onActivate(fav); }}
        className={`block rounded-[2px] origin-center transition-transform cursor-grab active:cursor-grabbing overflow-hidden ${
          selected ? 'scale-[1.4] ring-2 ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.45)]' : 'ring-1 ring-white/10 hover:ring-amber-300/80'
        }`}
      >
        <canvas ref={ref} style={{ width: cw, height: ch }} className="block" />
      </button>
    </div>
  );
};

const Placeholder: React.FC<{ w: number; h: number; list?: boolean }> = ({ w, h, list }) =>
  list ? (
    <div className="h-0.5 my-0.5 rounded-full bg-cyan-300/70" />
  ) : (
    <div className="shrink-0 rounded-[2px] border border-dashed border-cyan-300/70 bg-cyan-300/10" style={{ width: w, height: h }} />
  );

const GroupDivider: React.FC<{ label: string; onRename: (v: string) => void; autoFocus: boolean }> = ({ label, onRename, autoFocus }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <div className="flex items-center gap-2 mt-2.5 mb-1 px-0.5">
      <input
        ref={ref}
        value={label}
        // Coalesce a rename into ONE undo entry: open the bracket on focus, close it
        // on blur, so the keystroke burst between collapses to a single transaction.
        onFocus={favEditStart}
        onBlur={favEditEnd}
        onChange={(e) => onRename(e.target.value)}
        placeholder="Group name"
        className="bg-transparent text-[10px] uppercase tracking-wide text-gray-300 placeholder-gray-600 outline-none border-b border-transparent focus:border-white/25 w-28"
      />
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
};

const PaletteIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18" />
  </svg>
);

const SearchIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

/** Toggle icon: shows the layout you'd switch TO (grid swatches ⇄ list rows). */
const GridIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const ListIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path d="M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

const StudioIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
  </svg>
);

interface Block {
  group: string;
  start: number;
  favs: Favient[];
}
const buildBlocks = (favients: Favient[]): Block[] => {
  const blocks: Block[] = [];
  favients.forEach((f, i) => {
    const g = f.group ?? DEFAULT_GROUP;
    const last = blocks[blocks.length - 1];
    if (last && last.group === g) last.favs.push(f);
    else blocks.push({ group: g, start: i, favs: [f] });
  });
  return blocks;
};

type DropTarget = { kind: 'group'; group: string; index: number } | { kind: 'newgroup' } | { kind: 'trash' } | null;

export const FavientsPanel: React.FC = () => {
  const favients = useFavientsStore((s) => s.favients);
  const groupLabels = useFavientsStore((s) => s.groupLabels);
  const remove = useFavientsStore((s) => s.remove);
  const rename = useFavientsStore((s) => s.rename);
  const moveFavient = useFavientsStore((s) => s.moveFavient);
  const insertFavient = useFavientsStore((s) => s.insertFavient);
  const renameGroup = useFavientsStore((s) => s.renameGroup);
  const selectedTargetId = useFavientsStore((s) => s.selectedTargetId);
  const setSelectedTarget = useFavientsStore((s) => s.setSelectedTarget);
  const targets = useHostTargets();
  const browse = getFavientBrowseAction();
  const studio = getFavientStudioAction();

  const [hover, setHover] = useState<GradientHover | null>(null);
  const [dragging, setDragging] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [focusGroup, setFocusGroup] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const depth = useRef(0);

  // Shelf layout (grid|list) — persisted per-host (favientsPanelPersist). Search is
  // TRANSIENT (local only, never persisted): a collapsible header filter on
  // name+source+group. While a filter is active, drag-reorder is disabled (the drop
  // indices are computed against the FULL array, so reordering a filtered subset would
  // corrupt order) — the panel surfaces a "clear filter to reorder" note instead.
  const [viewMode, setViewMode] = useState<FavientsViewMode>(() => getFavientsViewMode());
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const toggleViewMode = () => {
    const next: FavientsViewMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(next);
    setFavientsViewMode(next);
  };
  const toggleSearch = () => {
    if (searchOpen) {
      setSearchOpen(false);
      setSearch(''); // closing clears the (transient) filter
    } else {
      setSearchOpen(true);
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
  };

  const query = search.trim().toLowerCase();
  const filterActive = query.length > 0;

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 1300);
  };

  const pf = useEngineStore((s) => (s as Record<string, any>).paletteFilters) as Record<string, any> | undefined;
  const swatchW = Math.max(8, Math.round(pf?.swatchSize?.x ?? DEFAULT_SWATCH_W));
  const swatchH = Math.max(6, Math.round(pf?.swatchSize?.y ?? DEFAULT_SWATCH_H));
  const gap = Math.max(0, Math.round(pf?.paddingSize ?? 1));

  // Search filter (transient): match name + source + group LABEL (what the user sees),
  // case-insensitive. Feeds the filtered list into buildBlocks so the grouped layout
  // collapses to just the hits. Drag is disabled while filtered, so the index math
  // below (which assumes the full array) is never exercised against the subset.
  const filtered = useMemo(() => {
    if (!filterActive) return favients;
    return favients.filter((f) => {
      const label = (groupLabels[f.group ?? DEFAULT_GROUP] ?? '').toLowerCase();
      return (
        f.name.toLowerCase().includes(query) ||
        (f.source ?? '').toLowerCase().includes(query) ||
        label.includes(query)
      );
    });
  }, [favients, groupLabels, filterActive, query]);

  // While an internal drag is in flight, hide the dragged swatch so it doesn't appear
  // twice (it + the placeholder). The drop indices are computed against this VISIBLE
  // list, and moveFavient inserts into the with-item-removed array — so they line up.
  const visibleFavients = useMemo(
    () => (draggingId ? filtered.filter((f) => f.id !== draggingId) : filtered),
    [filtered, draggingId],
  );
  const blocks = useMemo(() => buildBlocks(visibleFavients), [visibleFavients]);
  const lastBlock = blocks[blocks.length - 1];

  // Host capability: select-mode hosts (the Gradient Explorer, which owns the dock) flip
  // click apply→select; dropdown hosts (app-gmt) apply straight to the chosen target.
  const selectMode = getFavientSelectMode();
  const favPick = useHeroPick('favients');
  // The favourite enlarge shows only while Favients is the ACTIVE surface, so deselect
  // (Esc) clears it (favourites have no persistent hero strip of their own).
  const favActive = useActiveHeroMode() === 'favients';
  const activeTarget = targets.find((t) => t.id === selectedTargetId) ?? targets[0];

  const onApply = (fav: Favient) => {
    if (!activeTarget) {
      flash('No apply target available here');
      return;
    }
    activeTarget.apply({ config: fav.config, name: fav.name, source: fav.source });
    flash(`${fav.name} → ${activeTarget.label}`);
  };

  // Select-mode click: PICK the favourite (→ enlarge + the shared dock of destinations).
  // Same payload shape the drag sets, so the (mode,key) identity guard stays consistent.
  const onSelect = (fav: Favient) => {
    setHeroPick({
      mode: 'favients',
      key: fav.id,
      payload: { config: fav.config, name: fav.name, source: fav.source, favId: fav.id },
    });
  };

  // --- drag lifecycle ---
  const beginTimer = useRef<number | undefined>(undefined);
  const endDrag = () => {
    if (beginTimer.current) {
      clearTimeout(beginTimer.current); // cancel a pending hide if the drag ended first
      beginTimer.current = undefined;
    }
    depth.current = 0;
    setDragging(false);
    setDraggingId(null);
    setDropTarget(null);
  };
  // Hide the dragged swatch on the NEXT tick — removing it synchronously inside
  // dragstart can cancel the drag in some browsers.
  const beginDrag = (id: string) => {
    beginTimer.current = window.setTimeout(() => {
      beginTimer.current = undefined;
      setDragging(true);
      setDraggingId(id);
    }, 0);
  };

  /** Move an existing favourite to a position expressed against the VISIBLE list. */
  const place = (id: string, toIndexVisible: number, group: string) => {
    const fromVisible = visibleFavients.findIndex((f) => f.id === id);
    // If the item is shown in the visible list (external re-favourite) and sits before
    // the target, account for its removal; if hidden (internal drag) it's already gone.
    const idx = fromVisible >= 0 && fromVisible < toIndexVisible ? toIndexVisible - 1 : toIndexVisible;
    moveFavient(id, idx, group);
  };
  useEffect(() => {
    const onEnd = () => endDrag();
    window.addEventListener('dragend', onEnd);
    window.addEventListener('drop', onEnd);
    return () => {
      window.removeEventListener('dragend', onEnd);
      window.removeEventListener('drop', onEnd);
    };
  }, []);
  // A favourite drag hides its source by UNMOUNTING it, so dragend/drop may never reach the
  // window — recover via the shared mousemove net (else the swatch stays hidden + avatar stuck).
  useDragEndSafetyNet(dragging, endDrag);

  // Put a dragged payload into `group` at flat index `flat`: move the existing
  // favourite (internal drag, or an external gradient that's already a favourite) or
  // insert a new one. Shared by the group + new-group drops.
  const putAt = (p: FavientDragPayload, flat: number, group: string) => {
    if (p.favId) {
      place(p.favId, flat, group);
      return;
    }
    const existing = favients.find((f) => favientSig(f.config) === favientSig(p.config));
    if (existing) place(existing.id, flat, group);
    else insertFavient(p.config, addName(p), p.source, flat, group);
  };

  // Apply a drop described by `t`, given the drag payload. The mutation is bracketed
  // as one undo entry (remove / reorder / insert / new-group all ride the favients
  // history provider). A drop that changes nothing yields an empty diff → no entry.
  const doDrop = (p: FavientDragPayload | null, t: DropTarget) => {
    if (!p || !t) return;
    // The shelf is consuming this drag itself (insert / reorder / group / trash) — tell the
    // drop layer the in-hand pick LANDED, so its teardown skips the cancel wipe. The shelf's
    // drop `stopPropagation`s, so it never reaches the dock's apply path that would mark this.
    markPickLanded();
    favEdit(() => {
      if (t.kind === 'trash') {
        if (p.favId) {
          remove(p.favId);
          flash(`Removed ${p.name}`);
        }
        return;
      }
      if (t.kind === 'newgroup') {
        const gid = newGroupId();
        putAt(p, visibleFavients.length, gid);
        setFocusGroup(gid);
        return;
      }
      // group
      const block = blocks.find((b) => b.group === t.group);
      putAt(p, (block ? block.start : visibleFavients.length) + t.index, t.group);
    });
  };

  const swatchProps = {
    onActivate: selectMode ? onSelect : onApply,
    onHover: setHover,
    onDragBegin: beginDrag,
    swatchW,
    swatchH,
    view: viewMode,
    canDrag: !filterActive,
    onRename: rename,
    onDragBlocked: () => flash('Clear the filter to reorder'),
    selectMode,
  };

  return (
    <div
      className="flex flex-col h-full min-h-0 bg-zinc-900/95 text-gray-200 relative"
      onDragEnter={(e) => {
        if (filterActive || !e.dataTransfer.types.includes(FAVIENT_DND_MIME)) return;
        depth.current++;
        setDragging(true);
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) {
          setDragging(false);
          setDropTarget(null);
        }
      }}
    >
      <div className="px-2.5 py-2 border-b border-white/10 shrink-0 flex items-center gap-1.5">
        {/* Destination dropdown — only for dropdown hosts (app-gmt). Select-mode hosts
            route applies through the dock instead, so the dropdown is hidden there. */}
        {!selectMode &&
          (targets.length ? (
            <>
              <span className="text-[10px] uppercase tracking-wide text-gray-500 shrink-0">Destination</span>
              <GenericDropdown
                value={activeTarget?.id ?? ''}
                options={targets.map((t) => ({ label: t.label, value: t.id }))}
                onChange={(v) => setSelectedTarget(v as string)}
                fullWidth
              />
            </>
          ) : (
            <span className="text-[10px] text-gray-600 italic">no targets in this app</span>
          ))}
        {/* Select-mode hosts (the Explorer) have no Destination dropdown to fill the row, so
            push the header tools to the right edge. app-gmt's full-width dropdown already
            does this, so the spacer is select-mode only. */}
        {selectMode && <div className="flex-1" />}
        {browse && (
          <button
            onClick={() => browse()}
            title="Browse the gradient library (Palettes)"
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <PaletteIcon />
          </button>
        )}
        {studio && (
          <button
            onClick={() => studio()}
            title="Open GMT Gradient Explorer (new tab)"
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <StudioIcon />
          </button>
        )}
        <button
          onClick={toggleSearch}
          title="Filter favourites by name, source, or group"
          className={`shrink-0 flex items-center justify-center w-6 h-6 rounded transition-colors ${
            searchOpen ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <SearchIcon />
        </button>
        <button
          onClick={toggleViewMode}
          title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          className="shrink-0 flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {viewMode === 'grid' ? <ListIcon /> : <GridIcon />}
        </button>
        <span
          className="text-[10px] text-gray-500 tabular-nums shrink-0"
          title={`${favients.length} saved gradient${favients.length === 1 ? '' : 's'}`}
        >
          {filterActive ? `${filtered.length}/${favients.length}` : favients.length}
        </span>
        <FavientsSystemMenu onFlash={flash} />
      </div>

      {/* Collapsible transient search filter. Not persisted (each open starts blank).
          While a query is active, drag-reorder is disabled — the cue surfaces only on a
          drag ATTEMPT (FavientSwatch onDragBlocked → flash), not persistently here. */}
      {searchOpen && (
        <div className="px-2.5 py-1.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-1.5">
            <SearchIcon />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') toggleSearch();
              }}
              placeholder="Filter by name, source, group…"
              className="flex-1 min-w-0 bg-transparent text-[11px] text-gray-200 placeholder-gray-600 outline-none"
            />
            {filterActive && (
              <button
                onClick={() => setSearch('')}
                title="Clear filter"
                className="shrink-0 text-[10px] text-gray-500 hover:text-white px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toggle-gated intro hint (shares the panel Hint chip styling). Suppressed when
          the shelf is empty — the empty-state below already carries the same guidance. */}
      {favients.length > 0 && (
        <Hint text="Where your favourite gradients go to die — kept here, and shared with the main GMT studio." />
      )}

      <div data-gx-target="favients" className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col">
        {favients.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center px-4">
            <div className="text-[11px] text-gray-500 leading-relaxed">
              <FavientsIcon className="text-2xl mb-2 opacity-60 block mx-auto" />
              Drag a gradient here from the Picker, Generator, Image, or Stops to save it.
              <div className="mt-1 text-gray-600">Click a swatch to {selectMode ? 'select' : 'apply'} · drag to reorder · drag onto a target.</div>
              <div className="mt-1.5 text-gray-600">Saved gradients are shared with the main GMT studio.</div>
            </div>
          </div>
        ) : filterActive && filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center px-4">
            <div className="text-[11px] text-gray-500">No favourites match “{search.trim()}”.</div>
          </div>
        ) : (
          <>
            {blocks.map((block) => {
              const phIndex = dropTarget?.kind === 'group' && dropTarget.group === block.group ? dropTarget.index : -1;
              const groupLabel = groupLabels[block.group] ?? '';
              return (
                <div key={block.group}>
                  {block.group !== DEFAULT_GROUP && (
                    <GroupDivider
                      label={groupLabel}
                      onRename={(v) => renameGroup(block.group, v)}
                      autoFocus={focusGroup === block.group}
                    />
                  )}
                  <div
                    className={viewMode === 'list' ? 'flex flex-col' : 'flex flex-wrap content-start'}
                    style={viewMode === 'list' ? undefined : { gap }}
                    onDragOver={(e) => {
                      if (filterActive || !e.dataTransfer.types.includes(FAVIENT_DND_MIME)) return;
                      e.preventDefault();
                      setDropTarget({ kind: 'group', group: block.group, index: insertIndexFromPointer(e.currentTarget, e.clientX, e.clientY) });
                    }}
                    onDrop={(e) => {
                      if (filterActive) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const idx = insertIndexFromPointer(e.currentTarget, e.clientX, e.clientY);
                      doDrop(readFavientDrag(e.dataTransfer), { kind: 'group', group: block.group, index: idx });
                      endDrag();
                    }}
                  >
                    {block.favs.map((f, i) => (
                      <React.Fragment key={f.id}>
                        {phIndex === i && <Placeholder w={swatchW} h={swatchH} list={viewMode === 'list'} />}
                        <FavientSwatch
                          fav={f}
                          {...swatchProps}
                          groupLabel={groupLabel}
                          selected={selectMode && favActive && favPick?.key === f.id}
                        />
                      </React.Fragment>
                    ))}
                    {phIndex === block.favs.length && <Placeholder w={swatchW} h={swatchH} list={viewMode === 'list'} />}
                  </div>
                </div>
              );
            })}

            {/* Empty tail: lower half = new group, upper half = append to the last group.
                Suppressed while filtering (drag-reorder disabled — the indices are against
                the full array). */}
            {!filterActive && (
              <div
                className={`flex-1 min-h-[44px] mt-1 rounded-md transition-colors ${
                  dropTarget?.kind === 'newgroup' ? 'border border-dashed border-cyan-300/70 bg-cyan-300/5' : dragging ? 'border border-dashed border-white/10' : ''
                }`}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(FAVIENT_DND_MIME)) return;
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  const lower = e.clientY > r.top + r.height / 2;
                  if (lower || !lastBlock) setDropTarget({ kind: 'newgroup' });
                  else setDropTarget({ kind: 'group', group: lastBlock.group, index: lastBlock.favs.length });
                }}
                onDrop={(e) => {
                  if (!e.dataTransfer.types.includes(FAVIENT_DND_MIME)) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const r = e.currentTarget.getBoundingClientRect();
                  const lower = e.clientY > r.top + r.height / 2;
                  const p = readFavientDrag(e.dataTransfer);
                  if (lower || !lastBlock) doDrop(p, { kind: 'newgroup' });
                  else doDrop(p, { kind: 'group', group: lastBlock.group, index: lastBlock.favs.length });
                  endDrag();
                }}
              >
                {dragging && (
                  <div className="h-full flex items-center justify-center text-[10px] text-cyan-300/80 pointer-events-none">
                    {dropTarget?.kind === 'newgroup' ? 'New group' : 'Drop in the lower area for a new group'}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Trash zone — appears while dragging; drop a favourite to remove it. */}
      {dragging && (
        <div
          className={`absolute top-9 right-2 z-40 flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition-colors ${
            dropTarget?.kind === 'trash' ? 'border-red-400 bg-red-500/30 text-white' : 'border-white/15 bg-black/70 text-gray-300'
          }`}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes(FAVIENT_DND_MIME)) return;
            e.preventDefault();
            setDropTarget({ kind: 'trash' });
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            doDrop(readFavientDrag(e.dataTransfer), { kind: 'trash' });
            endDrag();
          }}
        >
          🗑 <span>Remove</span>
        </div>
      )}

      {toast && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/85 text-gray-100 text-[11px] px-3 py-1.5 rounded-full border border-white/10 shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      <GradientHoverPreview hover={hover} />
    </div>
  );
};

export default FavientsPanel;
