/**
 * DropTarget — the ONE shared dropbox tile (P2-A). Every lit drop affordance renders
 * through this: a bottom-row well, a dropbox anchored over a mode tab (intermediate),
 * and a dropbox anchored over an in-mode destination (a Generator slot, the Stops
 * strip). One look, one set of states, styled in one place — so the whole system reads
 * uniformly and a new target needs no new visual.
 *
 * It is purely presentational + handler-forwarding: the caller (the engine
 * `DropTargetLayer` for finals/bottom, the host's intermediate-tab layer for tabs)
 * owns POSITIONING (inline in the bottom row, or fixed over a `getRect()`), and passes
 * the drag/click handlers. The tile only draws the box, the label badge, the armed
 * highlight, and the optional dwell-progress ring.
 *
 * States:
 *   - available — calm dashed ring + label (a gradient is selected / a drag is in flight).
 *   - armed     — the cursor is over THIS target (brighter, glow).
 *   - dwell      — 0..1 reveal progress for an intermediate (tab) being dwelled on.
 */

import React from 'react';

export interface DropTargetTileProps {
    label: string;
    /** Short affordance hint shown when armed, e.g. 'drop here' | 'open'. */
    hint?: string;
    /** The cursor is over this target (drag) or it is hovered (click). */
    armed?: boolean;
    /** 0..1 reveal progress for an intermediate target being dwelled on. */
    dwell?: number;
    /** Fill the positioned wrapper (used by anchored tiles); bottom-row tiles size themselves. */
    fill?: boolean;
    /** Hide the label text (intermediate tab dropboxes cover the tab, which already has its
     *  own label — overlaying text on text reads badly). */
    hideLabel?: boolean;
    /** Click affordance (select-path apply, or intermediate reveal). */
    onActivate?: () => void;
    /** Pointer-hover arming (select path). */
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    /** HTML5 drag handlers (the caller decides whether to attach them). */
    onDragEnter?: () => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: () => void;
    onDrop?: (e: React.DragEvent) => void;
}

export const DropTargetTile: React.FC<DropTargetTileProps> = ({
    label,
    hint,
    armed = false,
    dwell = 0,
    fill = false,
    hideLabel = false,
    onActivate,
    onMouseEnter,
    onMouseLeave,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
}) => {
    return (
        <div
            onClick={onActivate}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={[
                'pointer-events-auto relative select-none flex items-center justify-center',
                'rounded-lg border-2 border-dashed text-xs font-medium uppercase tracking-wide',
                'transition-[background-color,box-shadow,border-color] duration-150',
                fill ? 'h-full w-full' : 'h-24 w-40',
                onActivate ? 'cursor-pointer' : '',
                armed
                    ? 'border-white bg-white/20 text-white shadow-[0_0_0_2px_rgba(255,255,255,0.5),0_0_22px_rgba(255,255,255,0.22)]'
                    : 'border-white/45 bg-zinc-800/90 text-zinc-100',
            ].join(' ')}
            data-drop-target={label}
            data-gx-keepselect=""
        >
            {/* Dwell-progress fill for an intermediate (tab) being dwelled on. */}
            {dwell > 0 && dwell < 1 && (
                <div className="absolute inset-0 overflow-hidden rounded-md pointer-events-none" aria-hidden>
                    <div
                        className="absolute left-0 top-0 h-full bg-white/25"
                        style={{ width: `${Math.round(dwell * 100)}%`, transition: 'width 60ms linear' }}
                    />
                </div>
            )}
            {!hideLabel && (
                <span className="relative truncate px-1.5">
                    {label}
                    {armed && hint && <span className="ml-1 opacity-75 normal-case">· {hint}</span>}
                </span>
            )}
        </div>
    );
};

export default DropTargetTile;
