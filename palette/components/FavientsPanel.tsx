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
 * Host-agnostic: reads its own stores (favientsStore + favientTargets). The header's
 * "Palettes" button calls a host-registered browse action (open the picker).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GenericDropdown } from '../../components/GenericDropdown';
import { Hint } from '../../components/Hint';
import {
  useFavientsStore,
  favientSig,
  newGroupId,
  DEFAULT_GROUP,
  type Favient,
} from '../store/favientsStore';
import {
  getFavientTargets,
  getFavientTarget,
  subscribeFavientTargets,
  getFavientBrowseAction,
  getFavientStudioAction,
} from '../core/favientTargets';
import { setFavientDrag, readFavientDrag, FAVIENT_DND_MIME, type FavientDragPayload } from '../core/favientDnd';
import { renderStopsToRamp } from '../core/gmtGradient';
import { GradientHoverPreview, type GradientHover } from './GradientHoverPreview';
import { FavientsIcon } from './FavientsIcon';
import type { RGB } from '../core/oklab';
import { useEngineStore } from '../../store/engineStore';
import { useDismiss } from '../../hooks/useDismiss';
import { downloadBlob } from '../../utils/SceneFormat';
import { EXPORT_FORMATS } from '../core/exportFormats';
import { buildCollectionZip, buildContactSheet } from '../core/favientsExport';

/** Re-render when hosts (re)register apply targets or the browse action. */
const useFavientTargets = () => {
  const [, force] = useState(0);
  useEffect(() => subscribeFavientTargets(() => force((n) => n + 1)), []);
  return getFavientTargets();
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
  const clear = useFavientsStore((s) => s.clear);

  const [open, setOpen] = useState(false);
  const [zipFmt, setZipFmt] = useState(EXPORT_FORMATS[0].key);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importMode = useRef<'merge' | 'replace'>('merge');

  useDismiss(rootRef, { onClose: () => setOpen(false), enabled: open, escape: true });

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
    const n = importCollection(text, importMode.current);
    if (n == null) onFlash("That file isn't a Favients collection");
    else onFlash(importMode.current === 'replace' ? `Replaced — ${n} loaded` : n ? `Merged ${n} new` : 'Nothing new to merge');
    close();
  };

  const doClear = () => {
    if (empty) return;
    if (window.confirm(`Clear all ${favients.length} favourite${favients.length === 1 ? '' : 's'}? This cannot be undone.`)) {
      clear();
      onFlash('Collection cleared');
    }
    close();
  };

  const exportZip = () => {
    if (empty) { onFlash('Nothing to export'); return; }
    const bytes = buildCollectionZip(favients, zipFmt);
    downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/zip' }), 'favients.zip');
    onFlash(`Exported ${favients.length} as .zip`);
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
      <button
        onClick={() => setOpen((o) => !o)}
        title="Collection — save, load, export"
        className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${open ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
      >
        <KebabIcon />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-52 bg-black/95 border border-white/15 rounded-lg shadow-2xl z-50 p-1"
          onClick={(e) => e.stopPropagation()}
        >
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
              title="Per-gradient file format for the .zip"
              className="flex-1 min-w-0 bg-gray-900 border border-white/10 rounded text-[11px] text-gray-200 px-1 py-0.5 outline-none focus:border-cyan-500"
            >
              {EXPORT_FORMATS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
            <button
              onClick={exportZip}
              className="shrink-0 text-[11px] px-2 py-0.5 rounded bg-white/[0.06] text-gray-200 hover:bg-white/10 transition-colors"
            >
              .zip
            </button>
          </div>
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

const FavientSwatch: React.FC<{
  fav: Favient;
  onApply: (fav: Favient) => void;
  onHover: (h: GradientHover | null) => void;
  onDragBegin: (id: string) => void;
  swatchW: number;
  swatchH: number;
}> = ({ fav, onApply, onHover, onDragBegin, swatchW, swatchH }) => {
  const ref = useRef<HTMLCanvasElement>(null);
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
    cv.width = Math.round(swatchW * dpr);
    cv.height = Math.round(swatchH * dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(rampCanvas, 0, 0, 256, 1, 0, 0, cv.width, cv.height);
  }, [rampCanvas, swatchW, swatchH]);

  const showHover = () => {
    const cv = ref.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const ew = swatchW * 3,
      eh = swatchH * 2;
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

  return (
    <div
      data-slot
      className="group relative shrink-0"
      draggable
      onDragStart={(e) => {
        onHover(null);
        setFavientDrag(e.dataTransfer, { config: fav.config, name: fav.name, source: fav.source, favId: fav.id });
        onDragBegin(fav.id);
      }}
      onMouseEnter={showHover}
      onMouseLeave={() => onHover(null)}
      title={`${fav.name}${fav.source ? ` · ${fav.source}` : ''}\nClick to apply · drag to reorder / onto a target`}
    >
      <button
        onClick={() => onApply(fav)}
        className="block rounded-[2px] ring-1 ring-white/10 hover:ring-amber-300/80 transition cursor-grab active:cursor-grabbing overflow-hidden"
      >
        <canvas ref={ref} style={{ width: swatchW, height: swatchH }} className="block" />
      </button>
    </div>
  );
};

const Placeholder: React.FC<{ w: number; h: number }> = ({ w, h }) => (
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
  const moveFavient = useFavientsStore((s) => s.moveFavient);
  const insertFavient = useFavientsStore((s) => s.insertFavient);
  const renameGroup = useFavientsStore((s) => s.renameGroup);
  const selectedTargetId = useFavientsStore((s) => s.selectedTargetId);
  const setSelectedTarget = useFavientsStore((s) => s.setSelectedTarget);
  const targets = useFavientTargets();
  const browse = getFavientBrowseAction();
  const studio = getFavientStudioAction();

  const [hover, setHover] = useState<GradientHover | null>(null);
  const [dragging, setDragging] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [focusGroup, setFocusGroup] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const depth = useRef(0);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 1300);
  };

  const pf = useEngineStore((s) => (s as Record<string, any>).paletteFilters) as Record<string, any> | undefined;
  const swatchW = Math.max(8, Math.round(pf?.swatchSize?.x ?? DEFAULT_SWATCH_W));
  const swatchH = Math.max(6, Math.round(pf?.swatchSize?.y ?? DEFAULT_SWATCH_H));
  const gap = Math.max(0, Math.round(pf?.paddingSize ?? 1));

  // While an internal drag is in flight, hide the dragged swatch so it doesn't appear
  // twice (it + the placeholder). The drop indices are computed against this VISIBLE
  // list, and moveFavient inserts into the with-item-removed array — so they line up.
  const visibleFavients = useMemo(
    () => (draggingId ? favients.filter((f) => f.id !== draggingId) : favients),
    [favients, draggingId],
  );
  const blocks = useMemo(() => buildBlocks(visibleFavients), [visibleFavients]);
  const lastBlock = blocks[blocks.length - 1];

  const activeTarget = getFavientTarget(selectedTargetId) ?? targets[0];

  const onApply = (fav: Favient) => {
    if (!activeTarget) {
      flash('No apply target available here');
      return;
    }
    activeTarget.apply(fav.config, fav.name);
    flash(`${fav.name} → ${activeTarget.label}`);
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
    else insertFavient(p.config, p.name, p.source, flat, group);
  };

  // Apply a drop described by `t`, given the drag payload.
  const doDrop = (p: FavientDragPayload | null, t: DropTarget) => {
    if (!p || !t) return;
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
  };

  const swatchProps = { onApply, onHover: setHover, onDragBegin: beginDrag, swatchW, swatchH };

  return (
    <div
      className="flex flex-col h-full min-h-0 bg-zinc-900/95 text-gray-200 relative"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes(FAVIENT_DND_MIME)) return;
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
        <span className="text-[10px] uppercase tracking-wide text-gray-500 shrink-0">Destination</span>
        {targets.length ? (
          <GenericDropdown
            value={activeTarget?.id ?? ''}
            options={targets.map((t) => ({ label: t.label, value: t.id }))}
            onChange={(v) => setSelectedTarget(v as string)}
            fullWidth
          />
        ) : (
          <span className="text-[10px] text-gray-600 italic">no targets in this app</span>
        )}
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
        <span
          className="text-[10px] text-gray-500 tabular-nums shrink-0"
          title={`${favients.length} saved gradient${favients.length === 1 ? '' : 's'}`}
        >
          {favients.length}
        </span>
        <FavientsSystemMenu onFlash={flash} />
      </div>

      {/* Toggle-gated intro hint (shares the panel Hint chip styling). Suppressed when
          the shelf is empty — the empty-state below already carries the same guidance. */}
      {favients.length > 0 && (
        <Hint text="Where your favourite gradients go to die — kept here, and shared with the main GMT studio." />
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col">
        {favients.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center px-4">
            <div className="text-[11px] text-gray-500 leading-relaxed">
              <FavientsIcon className="text-2xl mb-2 opacity-60 block mx-auto" />
              Star a gradient in the Generator or Image, or drag one in from the Picker.
              <div className="mt-1 text-gray-600">Click a swatch to apply · drag to reorder · drag onto a slot.</div>
              <div className="mt-1.5 text-gray-600">Saved gradients are shared with the main GMT studio.</div>
            </div>
          </div>
        ) : (
          <>
            {blocks.map((block) => {
              const phIndex = dropTarget?.kind === 'group' && dropTarget.group === block.group ? dropTarget.index : -1;
              return (
                <div key={block.group}>
                  {block.group !== DEFAULT_GROUP && (
                    <GroupDivider
                      label={groupLabels[block.group] ?? ''}
                      onRename={(v) => renameGroup(block.group, v)}
                      autoFocus={focusGroup === block.group}
                    />
                  )}
                  <div
                    className="flex flex-wrap content-start"
                    style={{ gap }}
                    onDragOver={(e) => {
                      if (!e.dataTransfer.types.includes(FAVIENT_DND_MIME)) return;
                      e.preventDefault();
                      setDropTarget({ kind: 'group', group: block.group, index: insertIndexFromPointer(e.currentTarget, e.clientX, e.clientY) });
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const idx = insertIndexFromPointer(e.currentTarget, e.clientX, e.clientY);
                      doDrop(readFavientDrag(e.dataTransfer), { kind: 'group', group: block.group, index: idx });
                      endDrag();
                    }}
                  >
                    {block.favs.map((f, i) => (
                      <React.Fragment key={f.id}>
                        {phIndex === i && <Placeholder w={swatchW} h={swatchH} />}
                        <FavientSwatch fav={f} {...swatchProps} />
                      </React.Fragment>
                    ))}
                    {phIndex === block.favs.length && <Placeholder w={swatchW} h={swatchH} />}
                  </div>
                </div>
              );
            })}

            {/* Empty tail: lower half = new group, upper half = append to the last group. */}
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
