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
    toolbarBefore,
    toolbarAfter,
    footer,
    className = 'flex flex-col bg-[#080808]',
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

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (drag && drag.overIndex !== index) {
            setDrag({ ...drag, overIndex: index });
        }
    };

    const handleDrop = (e: React.DragEvent, toIndex: number) => {
        e.preventDefault();
        if (drag && drag.fromIndex !== toIndex) {
            onReorder(drag.fromIndex, toIndex);
        }
        setDrag(null);
    };

    const handleDragEnd = () => setDrag(null);

    return (
        <div className={className}>
            {toolbarBefore}

            <div className="p-2 space-y-1">
                {snapshots.length === 0 && (
                    <div className="text-center text-gray-600 text-[10px] italic py-4">
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
                                    ? 'bg-cyan-900/20 border-cyan-500/50'
                                    : 'bg-white/5 border-transparent hover:border-white/10'
                            } ${isDragOver ? 'border-cyan-400/70 border-dashed' : ''}`}
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
                            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-black/50 border border-white/5">
                                {snap.thumbnail ? (
                                    <img src={snap.thumbnail} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700 text-[7px]">
                                        {index + 1}
                                    </div>
                                )}
                            </div>

                            {/* Label + slot-shortcut hint */}
                            <div className="flex-1 min-w-0">
                                {editId === snap.id ? (
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={handleRenameSubmit}
                                        onKeyDown={handleKeyDown}
                                        autoFocus
                                        className="bg-black border border-white/20 text-xs text-white px-1 py-0.5 rounded w-full outline-none"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span
                                        className={`text-xs font-bold truncate block cursor-text ${
                                            modified
                                                ? 'text-amber-300 italic'
                                                : isActive
                                                    ? 'text-white'
                                                    : 'text-gray-400 group-hover:text-gray-300'
                                        }`}
                                        onDoubleClick={(e) => { e.stopPropagation(); handleRenameStart(snap); }}
                                        title="Double-click to rename"
                                    >
                                        {modified ? `*${snap.label}` : snap.label}
                                    </span>
                                )}
                                {slotHintPrefix !== null && index < 9 && (
                                    <span className="text-[7px] text-gray-600">
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
                                                ? 'text-amber-400 hover:text-amber-200'
                                                : 'text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100'
                                        }`}
                                        title={modified ? 'Modified — click to save current state' : 'Update snapshot to current state'}
                                    >
                                        <SaveIcon />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDuplicate(snap.id); }}
                                    className="p-1 text-gray-600 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Duplicate"
                                >
                                    <CopyIcon />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDelete(snap.id); }}
                                    className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
