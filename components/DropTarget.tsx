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
    /** Hide the label text (anchored dropboxes sit over an element that already reads —
     *  overlaying text on text is bad). */
    hideLabel?: boolean;
    /** Opaque fill (bottom-row wells, which have no element under them). Anchored tiles
     *  stay translucent so the tab / slot / strip underneath shows through. */
    opaque?: boolean;
    /** Visual affordance only: pointer-events-none, so the element underneath receives
     *  the interaction (used for a drag-passthrough target like the Favients shelf). */
    visualOnly?: boolean;
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
    opaque = false,
    visualOnly = false,
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
                visualOnly ? 'pointer-events-none' : 'pointer-events-auto',
                'relative select-none flex items-center justify-center',
                'rounded-lg border-2 border-dashed text-xs font-medium uppercase tracking-wide',
                'transition-[background-color,box-shadow,border-color] duration-150',
                fill ? 'h-full w-full' : 'h-24 w-40',
                onActivate ? 'cursor-pointer' : '',
                // Cyan dashed outline throughout; armed brightens + glows. Fill is opaque
                // only for bottom wells; anchored tiles stay translucent so the element
                // underneath (tab / slot / strip) reads through them.
                armed
                    ? 'border-accent-300 bg-accent-400/20 text-cyan-50 shadow-[0_0_0_2px_rgb(var(--accent-glow)/0.5),0_0_22px_rgb(var(--accent-glow)/0.28)]'
                    : opaque
                      ? 'border-accent-400/70 bg-surface-raised/95 text-fg-secondary'
                      : 'border-accent-400/70 bg-accent-400/[0.05] text-cyan-100',
            ].join(' ')}
            data-drop-target={label}
            data-gx-keepselect=""
        >
            {/* Dwell-progress fill for an intermediate (tab) being dwelled on. */}
            {dwell > 0 && dwell < 1 && (
                <div className="absolute inset-0 overflow-hidden rounded-md pointer-events-none" aria-hidden>
                    <div
                        className="absolute left-0 top-0 h-full bg-line/25"
                        style={{ width: `${Math.round(dwell * 100)}%`, transition: 'width 60ms linear' }}
                    />
                </div>
            )}
            {!hideLabel && (
                // pointer-events-none so dragging over the TEXT doesn't fire a child-boundary
                // dragleave / land the dragover on the span — that breaks the preventDefault
                // on the tile div and cancels the drop. All events must hit the tile itself.
                <span className="relative truncate px-1.5 pointer-events-none">
                    {label}
                    {armed && hint && <span className="ml-1 opacity-75 normal-case">· {hint}</span>}
                </span>
            )}
        </div>
    );
};

export default DropTargetTile;
