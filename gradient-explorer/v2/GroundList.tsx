/**
 * GroundList — the ground as ROWS instead of tiles (owner, 2026-09-09: "there is a list
 * view option as well — that's how you'll find names that can be renamed").
 *
 * The wall draws bars and nothing else: it is the right shape for choosing by colour, and
 * the wrong one for finding a gradient you named "warm rust, second try". The shelf panel
 * has always had a grid ⇄ list toggle for exactly that (grep `toggleViewMode` in
 * `FavientsPanel.tsx`) and the ground never did — so the only way to read your own names
 * was to open a floating panel over the very wall you were looking at.
 *
 * This is the panel's list ANATOMY, not its code: a 56 px ramp strip, the name, and a
 * muted `source · group` caption. It is a separate component rather than a mode inside
 * `PickerWall` because the wall is a canvas — one `drawImage` per tile out of a shared
 * sprite, virtualized by chunk — and rows are DOM. Sharing a component across those two
 * would mean a `if (list)` fork through every hit-test, and the wall's own header says to
 * treat its paint as a hot path. What IS shared is everything that matters: the same
 * entries, the same pick, the same drag payload, the same selection store, the same
 * context menu, the same filing rule.
 *
 * Set grounds only. On the catalogue a list of 11,131 rows would want virtualizing, and
 * the catalogue's entries carry no name of yours to look for.
 *
 * Because rows are real elements, the keyboard comes free: every row is a tab stop, so
 * Tab / Enter work without the cursor model `PickerWall` needs.
 *
 * @see palette/components/FavientsPanel.tsx (the list anatomy this follows)
 * @see palette/store/wallSelection.ts (the selection, shared with the wall)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogEntry } from '../../palette/core/presetCatalog';
import type { GroundItem } from '../../palette/components/usePickerModel';
import { renderStopsToRamp } from '../../palette/core/gmtGradient';
import { useWallSelection, toggleWallSelected, setWallSelection, clearWallSelection } from '../../palette/store/wallSelection';
import type { RGB } from '../../palette/core/oklab';

/** The row's ramp strip — the same 56 px the shelf panel's list rows use. */
const STRIP_W = 56;
const STRIP_H = 22;

const RowStrip: React.FC<{ ramp: RGB[] }> = ({ ramp }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(STRIP_W * dpr);
    cv.height = Math.round(STRIP_H * dpr);
    const src = document.createElement('canvas');
    src.width = 256;
    src.height = 1;
    const sctx = src.getContext('2d');
    if (!sctx) return;
    const img = sctx.createImageData(256, 1);
    for (let i = 0; i < 256; i++) {
      const c = ramp[i] ?? { r: 0, g: 0, b: 0 };
      img.data[i * 4] = Math.round(c.r);
      img.data[i * 4 + 1] = Math.round(c.g);
      img.data[i * 4 + 2] = Math.round(c.b);
      img.data[i * 4 + 3] = 255;
    }
    sctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(src, 0, 0, 256, 1, 0, 0, cv.width, cv.height);
  }, [ramp]);
  return <canvas ref={ref} style={{ width: STRIP_W, height: STRIP_H }} className="block shrink-0 rounded-[6px] ring-1 ring-line/20" />;
};

export interface GroundListProps {
  /** The bands the wall would draw — one per lit set, in rail order. */
  groups: { key: string; label: string; entries: CatalogEntry[] }[];
  /** What each entry stands for (config · name · source · favId). */
  itemOf: (entry: CatalogEntry) => GroundItem;
  selectedId?: string;
  onPick: (entry: CatalogEntry) => void;
  onEntryDragStart: (entry: CatalogEntry, dt: DataTransfer) => void;
  onEntryContextMenu?: (entry: CatalogEntry, e: React.MouseEvent) => void;
  /** Commit a rename (the caller brackets it for undo). */
  onRename: (favId: string, name: string) => void;
  /** Delete on a focused row — the host decides whether that means the row or the whole
   *  selection (it means the selection whenever there is one). */
  onEntryDelete?: (entry: CatalogEntry) => void;
  /** A row dropped onto this band, in front of `beforeId` (null = the end). */
  onBandDrop: (bandKey: string, dt: DataTransfer, beforeId: string | null) => void;
  canBandDrop: (bandKey: string, dt: DataTransfer) => boolean;
}

export const GroundList: React.FC<GroundListProps> = ({
  groups,
  itemOf,
  selectedId,
  onPick,
  onEntryDragStart,
  onEntryContextMenu,
  onRename,
  onEntryDelete,
  onBandDrop,
  canBandDrop,
}) => {
  const selected = useWallSelection();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [caret, setCaret] = useState<{ band: string; beforeId: string | null } | null>(null);

  // Flat reading order, for shift-click's range — the same order the rows are drawn in.
  const flat = useMemo(() => groups.flatMap((g) => g.entries.map((e) => e.id)), [groups]);
  const lastClicked = useRef<string | null>(null);

  /** Modifier-click selection, the file-manager idiom: ctrl toggles one, shift takes a run. */
  const clickSelect = useCallback(
    (id: string, e: React.MouseEvent): boolean => {
      if (e.ctrlKey || e.metaKey) {
        toggleWallSelected(id);
        lastClicked.current = id;
        return true;
      }
      if (e.shiftKey) {
        const a = flat.indexOf(lastClicked.current ?? id);
        const b = flat.indexOf(id);
        if (a >= 0 && b >= 0) setWallSelection(flat.slice(Math.min(a, b), Math.max(a, b) + 1), 'add');
        return true;
      }
      return false;
    },
    [flat],
  );

  return (
    <div className="h-full overflow-auto custom-scroll pt-3 pb-14 px-6" data-gx-ground-list="">
      {groups.map((g) => (
        <div
          key={g.key}
          data-gx-list-band={g.key}
          onDragOver={(e) => {
            if (!canBandDrop(g.key, e.dataTransfer)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            // Past the last row of this band, unless a row claims it below.
            if (!caret || caret.band !== g.key) setCaret({ band: g.key, beforeId: null });
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
            setCaret(null);
          }}
          onDrop={(e) => {
            if (!canBandDrop(g.key, e.dataTransfer)) return;
            e.preventDefault();
            e.stopPropagation();
            const before = caret?.band === g.key ? caret.beforeId : null;
            setCaret(null);
            onBandDrop(g.key, e.dataTransfer, before);
          }}
        >
          {g.label && (
            <div className="px-1 py-px text-[11px] leading-tight text-fg-secondary font-medium border-t border-line/10 truncate">
              {g.label}
            </div>
          )}
          {g.entries.map((entry) => {
            const it = itemOf(entry);
            const isSel = selected.has(entry.id);
            const caption = [it.source, g.label].filter(Boolean).join(' · ');
            return (
              <React.Fragment key={entry.id}>
                {caret?.band === g.key && caret.beforeId === entry.id && (
                  <div className="h-0.5 my-0.5 rounded-full bg-accent-300" data-gx-list-caret="" />
                )}
                <div
                  data-gx-list-row={entry.id}
                  tabIndex={0}
                  role="button"
                  draggable={!renaming}
                  onDragStart={(e) => onEntryDragStart(entry, e.dataTransfer)}
                  onDragOver={(e) => {
                    if (!canBandDrop(g.key, e.dataTransfer)) return;
                    // Top half = before this row, bottom half = after it.
                    const r = e.currentTarget.getBoundingClientRect();
                    const before = e.clientY < r.top + r.height / 2;
                    const idx = g.entries.findIndex((x) => x.id === entry.id);
                    const beforeId = before ? entry.id : (g.entries[idx + 1]?.id ?? null);
                    if (caret?.band !== g.key || caret.beforeId !== beforeId) setCaret({ band: g.key, beforeId });
                  }}
                  onClick={(e) => {
                    if (clickSelect(entry.id, e)) return;
                    clearWallSelection();
                    lastClicked.current = entry.id;
                    onPick(entry);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(entry); }
                    else if ((e.key === 'Delete' || e.key === 'Backspace') && onEntryDelete) {
                      e.preventDefault();
                      onEntryDelete(entry);
                    }
                  }}
                  onContextMenu={(e) => onEntryContextMenu?.(entry, e)}
                  className={`group flex items-center gap-2.5 px-1.5 py-1 rounded-lg transition-colors outline-none focus-visible:ring-1 focus-visible:ring-accent-400/60 cursor-pointer ${
                    isSel
                      ? 'bg-accent-400/15 ring-1 ring-accent-400/50'
                      : entry.id === selectedId
                        ? 'bg-accent-500/10 ring-1 ring-accent-400/40'
                        : 'hover:bg-line/[0.06]'
                  }`}
                >
                  <RowStrip ramp={renderStopsToRamp(it.config.stops, it.config.blendSpace ?? 'oklab', 'srgb')} />
                  <div className="min-w-0 flex-1">
                    {renaming === entry.id && it.favId ? (
                      <input
                        autoFocus
                        defaultValue={it.name}
                        aria-label="Rename gradient"
                        className="w-full bg-transparent text-[13px] text-fg outline-none border-b border-line/30"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); onRename(it.favId!, e.currentTarget.value); setRenaming(null); }
                          else if (e.key === 'Escape') { e.preventDefault(); setRenaming(null); }
                          e.stopPropagation();
                        }}
                        onBlur={(e) => { onRename(it.favId!, e.currentTarget.value); setRenaming(null); }}
                      />
                    ) : (
                      <div
                        className="text-[13px] text-fg truncate cursor-text"
                        title={it.favId ? 'Click to rename' : undefined}
                        onClick={(e) => { if (it.favId) { e.stopPropagation(); setRenaming(entry.id); } }}
                      >
                        {it.name}
                      </div>
                    )}
                    {caption && <div className="text-[11px] text-fg-dim truncate">{caption}</div>}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          {caret?.band === g.key && caret.beforeId === null && (
            <div className="h-0.5 my-0.5 rounded-full bg-accent-300" data-gx-list-caret="" />
          )}
        </div>
      ))}
    </div>
  );
};

export default GroundList;
