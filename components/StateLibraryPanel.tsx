/**
 * StateLibraryPanel — pure-UI primitive for "saved snapshots" libraries
 * (cameras, views, color palettes, brush presets, …). Composed by the
 * app-side panel shells (e.g. GMT's CameraManagerPanel) which provide
 * the snapshot data + handlers + optional toolbar / footer slots.
 *
 * Owned by the primitive:
 *   - List rendering with thumbnail + label + drag-to-reorder
 *   - Active highlighting + modified marker (`*Camera 1`, italic amber)
 *   - Inline rename (double-click label)
 *   - Save / Duplicate / Delete action buttons (hover-revealed)
 *   - Empty-state placeholder
 *   - Slot-shortcut hint (Ctrl+1..9) shown beside the first 9 entries
 *
 * NOT owned (provide via slot props or skip):
 *   - Cardinal-direction toolbar (GMT-specific)
 *   - Active-settings footer (GMT renders camera position + optics)
 *   - Composition overlays (separate concern entirely — viewport plugin)
 *   - "New" button — pass via toolbarBefore/After or render below the list
 *
 * Snapshot type is generic; the panel only touches `id`, `label`,
 * `thumbnail`, and passes the full snapshot back to handlers + `isModified`.
 */

import React, { useState } from 'react';
import { TrashIcon, DragHandleIcon, SaveIcon, CopyIcon } from './Icons';
import type { StateSnapshot } from '../engine/store/createStateLibrarySlice';

interface DragState {
    fromIndex: number;
    overIndex: number;
}

/** A quick-action button rendered in the top-of-panel preset grid.
 *  Each app prescribes its own list — GMT's are cardinal-direction
 *  views (FRONT / BACK / LEFT / …); fluid-toy's are 2D view shortcuts
 *  (RESET / HOME / ZOOM / kind toggles). The library doesn't know what
 *  "preset" means semantically — just renders the buttons and fires
 *  onSelect. */
export interface StateLibraryPreset {
    id: string;
    label: string;
    title?: string;
    onSelect: () => void;
}

export interface StateLibraryPanelProps<T> {
    snapshots: StateSnapshot<T>[];
    activeId: string | null;

    /** Select / load a snapshot. Pass null to deselect. */
    onSelect: (id: string | null) => void;
    /** Inline rename — fired with the new label. */
    onRename: (id: string, label: string) => void;
    /** Overwrite this snapshot with current live state (Save button). */
    onUpdate: (id: string) => void;
    /** Duplicate the snapshot. */
    onDuplicate: (id: string) => void;
    /** Delete the snapshot — immediate, no confirmation. */
    onDelete: (id: string) => void;
    /** Drag-reorder. */
    onReorder: (fromIndex: number, toIndex: number) => void;

    /** Optional dirty-check — when it returns true for the active
     *  snapshot, the label renders italic amber with a `*` prefix. */
    isModified?: (snap: StateSnapshot<T>) => boolean;

    /** Empty-state copy. Defaults to "No saved snapshots". */
    emptyState?: string;
    /** Slot-shortcut hint label, e.g. "Ctrl+". Set to null to hide. */
    slotHintPrefix?: string | null;

    /** Quick-action preset buttons rendered as a grid above any
     *  toolbarBefore content. Each app provides its own list — see
     *  StateLibraryPreset. Skipping this prop suppresses the grid. */
    presets?: StateLibraryPreset[];
    /** Number of columns in the preset grid. Default 4. */
    presetGridCols?: number;

    /** Optional content rendered above the list — typical home for a
     *  cardinal-direction toolbar or a "New" button row. */
    toolbarBefore?: React.ReactNode;
    /** Optional content rendered below the list. Default home for a
     *  "New" button. */
    toolbarAfter?: React.ReactNode;
    /** Optional footer rendered after the list. GMT's camera manager
     *  uses this for position / optics / composition overlays. */
    footer?: React.ReactNode;

    /** Wrapper className. Defaults to a black background; pass '' to
     *  drop it. */
    className?: string;
}

/**
 * @invariant Only the drag-handle child is draggable; the row itself is
 *   NOT. Without this split, row click would race against the HTML5
 *   drag-start and frequently swallow the click. Drag handlers
 *   `stopPropagation` on `dragStart`.
 * @invariant A row claims a drag (`preventDefault`) ONLY when `drag` is
 *   non-null — i.e. only for a drag this list started. Foreign drags (OS
 *   file drags above all) must fall through unclaimed, because window-level
 *   handlers defer to any inner target that already called
 *   `preventDefault()` — see `engine/components/SceneFileDropZone.tsx`
 *   (`if (e.defaultPrevented) return`). Guarded by
 *   `npm run smoke:statelibrary-drop`, which asserts reorder AND
 *   file-drop passthrough so a fix for one can't silently break the other.
 * @invariant Slot-shortcut hint is hardcoded to the first 9 rows. Rows
 *   at index >= 9 render no `Ctrl+N` hint regardless of how many
 *   snapshots exist. Matches the slice's `count: 9` default.
 * @invariant `isModified` is consulted ONLY for the active row —
 *   non-active rows never render the modified marker even if dirty.
 *   The cyan highlight already identifies which row is "live"; the
 *   asterisk only adds value there.
 * @bug PRODUCTION: Delete fires immediately and is UNRECOVERABLE — no
 *   confirmation dialog, and nothing behind `onDelete` restores the row.
 *   The invariant here used to claim "UX safety is offloaded to the slice's
 *   undo hooks"; there are no such hooks. `createStateLibrarySlice`'s
 *   `[actions.delete]` is a bare `arr.filter(...)`, its only hook
 *   (`onApplied`) fires on apply — never on delete — and its module JSDoc
 *   states outright that "persistence and undo are deliberately app-side".
 *   Neither consumer opts in: `deleteCamera` (engine-gmt/store/cameraSlice.ts)
 *   and `deleteView` (fluid-toy/viewLibrary.ts) are the raw slice actions,
 *   unwrapped. One mis-click on the hover-revealed trash icon destroys a
 *   saved camera permanently. Fixing it is a product call (confirm-on-delete
 *   vs. undo vs. accept) — see PROPOSALS.md (overnight audit, cycle 4).
 * @invariant Rename submits on Enter or blur; Escape clears `editId`
 *   without firing `onRename` — cancel semantics are key-driven, not
 *   button-driven.
 */
export function StateLibraryPanel<T>({
    snapshots,
    activeId,
    onSelect,
    onRename,
    onUpdate,
    onDuplicate,
    onDelete,
    onReorder,
    isModified,
    emptyState = 'No saved snapshots',
    slotHintPrefix = 'Ctrl+',
    presets,
    presetGridCols = 4,
    toolbarBefore,
    toolbarAfter,
    footer,
    className = 'flex flex-col bg-surface-dock',
}: StateLibraryPanelProps<T>) {
    const [editId, setEditId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [drag, setDrag] = useState<DragState | null>(null);

    const handleRenameStart = (snap: StateSnapshot<T>) => {
        setEditId(snap.id);
        setEditName(snap.label);
    };

    const handleRenameSubmit = () => {
        if (editId) {
            onRename(editId, editName);
            setEditId(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleRenameSubmit();
        if (e.key === 'Escape') setEditId(null);
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        setDrag({ fromIndex: index, overIndex: index });
    };

    // Both handlers bail BEFORE preventDefault when `drag` is null — i.e.
    // when this drag did not start in this list. `preventDefault()` is how a
    // drop target claims an event, and window-level handlers defer to any
    // inner target that already claimed it (`SceneFileDropZone` does exactly
    // that: `if (e.defaultPrevented) return`). Claiming unconditionally made
    // a row silently eat OS scene-file drops that landed on it — no load, no
    // warning toast, which reads to the user as "the drop broke".
    const handleDragOver = (e: React.DragEvent, index: number) => {
        if (!drag) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (drag.overIndex !== index) {
            setDrag({ ...drag, overIndex: index });
        }
    };

    const handleDrop = (e: React.DragEvent, toIndex: number) => {
        if (!drag) return;
        e.preventDefault();
        if (drag.fromIndex !== toIndex) {
            onReorder(drag.fromIndex, toIndex);
        }
        setDrag(null);
    };

    const handleDragEnd = () => setDrag(null);

    return (
        <div className={className}>
            {presets && presets.length > 0 && (
                <div
                    className="p-2 border-b border-line/10 bg-surface-section grid gap-1"
                    // Dynamic column count — Tailwind's JIT can't statically
                    // extract a class built from a prop, so an inline style
                    // is the right tool here.
                    // eslint-disable-next-line react/forbid-dom-props
                    style={{ gridTemplateColumns: `repeat(${presetGridCols}, minmax(0, 1fr))` }}
                >
                    {presets.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={p.onSelect}
                            title={p.title ?? p.label}
                            className="bg-line/5 hover:bg-line/10 text-[9px] text-fg-muted hover:text-fg-secondary rounded py-1 transition-colors"
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            )}
            {toolbarBefore}

            <div className="p-2 space-y-1">
                {snapshots.length === 0 && (
                    <div className="text-center text-fg-faint text-[10px] italic py-4 px-2 break-words">
                        {emptyState}
                    </div>
                )}

                {snapshots.map((snap, index) => {
                    const isActive = activeId === snap.id;
                    const modified = isActive && (isModified?.(snap) ?? false);
                    const isDragOver = drag && drag.overIndex === index && drag.fromIndex !== index;
                    return (
                        <div
                            key={snap.id}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onClick={() => onSelect(snap.id)}
                            className={`flex items-center gap-1.5 p-1.5 rounded border transition-all group ${
                                isActive
                                    ? 'bg-accent-900/20 border-accent-500/50'
                                    : 'bg-line/5 border-transparent hover:border-line/10'
                            } ${isDragOver ? 'border-accent-400/70 border-dashed' : ''}`}
                        >
                            {/* Drag handle — only this child is draggable */}
                            <div
                                draggable
                                onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, index); }}
                                onDragEnd={handleDragEnd}
                                className="cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity flex-shrink-0"
                                title="Drag to reorder"
                            >
                                <DragHandleIcon />
                            </div>

                            {/* Thumbnail */}
                            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-surface-section border border-line/5">
                                {snap.thumbnail ? (
                                    <img src={snap.thumbnail} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-fg-ghost text-[7px]">
                                        {index + 1}
                                    </div>
                                )}
                            </div>

                            {/* Label + slot-shortcut hint */}
                            <div className="flex-1 min-w-0">
                                {editId === snap.id ? (
                                    <input
                                        type="text"
                                        aria-label="Rename snapshot"
                                        title="Rename snapshot"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={handleRenameSubmit}
                                        onKeyDown={handleKeyDown}
                                        autoFocus
                                        className="bg-surface border border-line/20 text-xs text-fg px-1 py-0.5 rounded w-full outline-none"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span
                                        className={`text-xs font-bold truncate block cursor-text ${
                                            modified
                                                ? 'text-warn italic'
                                                : isActive
                                                    ? 'text-fg'
                                                    : 'text-fg-muted group-hover:text-fg-tertiary'
                                        }`}
                                        onDoubleClick={(e) => { e.stopPropagation(); handleRenameStart(snap); }}
                                        title="Double-click to rename"
                                    >
                                        {/* The `|| 'Untitled'` is load-bearing, not cosmetic. This span is
                                            `display: block`, so an empty one generates no line box and
                                            collapses to height 0 — measured rect {w:149,h:0}, with
                                            elementFromPoint at its centre returning the PARENT div. Since
                                            onDoubleClick lives on this span, a blank label made the row
                                            permanently un-renameable: an exhaustive 2px sweep of the whole
                                            row found no re-entry point, and the `*` modified-marker escape
                                            hatch self-destructs (the row's onClick re-applies the snapshot,
                                            clearing `modified` on the first click of the double-click).
                                            Blanks are reachable — handleRenameSubmit accepts an empty value
                                            from both Enter and onBlur — and they persist into saved scenes
                                            via the `savedCameras` preset field. Guarding at render fixes
                                            existing data and every producer at once; `[actions.add]` uses
                                            `??`, which does not catch `''`. See PROPOSALS.md (cycle 4) for
                                            the input-side guard, which is a separate product call. */}
                                        {modified ? `*${snap.label || 'Untitled'}` : (snap.label || 'Untitled')}
                                    </span>
                                )}
                                {slotHintPrefix !== null && index < 9 && (
                                    <span className="text-[7px] text-fg-faint">
                                        {slotHintPrefix}{index + 1}
                                    </span>
                                )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                {isActive && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onUpdate(snap.id); }}
                                        className={`p-1 transition-colors ${
                                            modified
                                                ? 'text-warn hover:text-warn'
                                                : 'text-fg-faint hover:text-fg-muted opacity-0 group-hover:opacity-100'
                                        }`}
                                        title={modified ? 'Modified — click to save current state' : 'Update snapshot to current state'}
                                    >
                                        <SaveIcon />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDuplicate(snap.id); }}
                                    className="p-1 text-fg-faint hover:text-accent-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Duplicate"
                                >
                                    <CopyIcon />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDelete(snap.id); }}
                                    className="p-1 text-fg-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {toolbarAfter}
            {footer}
        </div>
    );
}

export default StateLibraryPanel;
