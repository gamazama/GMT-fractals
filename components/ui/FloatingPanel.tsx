import React, { useRef, useState, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../../hooks/useDismiss';
import { CloseIcon, ResizeHandleIcon } from '../Icons';
import { Z } from './zIndex';

/**
 * Non-blocking floating panel: portalled, `position: fixed`, no backdrop — the
 * scene stays interactive underneath. Covers two shapes the app hand-rolled:
 *
 *  - free-floating, draggable/resizable windows (set `position`/`size` +
 *    `draggable`/`resizable`); position/size are controlled — feed and persist
 *    them via `onPositionChange`/`onSizeChange`, or use `initial*` for local
 *    uncontrolled state.
 *  - corner-anchored panels (omit `position`, place via `className`, e.g.
 *    `"top-12 right-4"`) that auto-dismiss (`dismissOnOutside`/`dismissOnEscape`).
 *
 * Drag/resize use pointer events with capture, so they track outside the
 * element and work for touch. Dragging only applies in coordinate mode (a
 * `position`/`initialPosition` was given) — there's nothing to move otherwise.
 */
type Coords = { x: number; y: number };
type Dimensions = { width: number; height: number };

export interface FloatingPanelProps {
    children: ReactNode;
    open?: boolean;
    z?: number;

    /** Controlled top-left. Omit to anchor via `className` instead. */
    position?: Coords;
    /** Uncontrolled initial top-left (ignored when `position` is set). */
    initialPosition?: Coords;
    onPositionChange?: (pos: Coords) => void;

    /** Controlled size. Omit to let content size the panel. */
    size?: Dimensions;
    /** Uncontrolled initial size (ignored when `size` is set). */
    initialSize?: Dimensions;
    onSizeChange?: (size: Dimensions) => void;

    /** Drag by the header. Requires coordinate mode. Default false. */
    draggable?: boolean;
    /** Show a bottom-right resize grip. Requires `size`/`initialSize`. Default false. */
    resizable?: boolean;
    minSize?: Dimensions;

    /** Auto-close on pointer-down outside the panel. Default false. */
    dismissOnOutside?: boolean;
    /** Auto-close on Escape. Default false. */
    dismissOnEscape?: boolean;
    onClose?: () => void;

    /** Optional header bar. Rendered when `title`, `headerLeft`, or close is set. */
    title?: ReactNode;
    /** Content placed before the title in the header (e.g. a dock-drag handle). */
    headerLeft?: ReactNode;
    /** Show a close button in the header (needs `onClose`). Default true when a header renders. */
    showClose?: boolean;

    /** Classes on the panel root — use for placement in anchored mode. */
    className?: string;
    /** Classes on the scrollable body wrapper. */
    bodyClassName?: string;
    headerClassName?: string;
}

const DEFAULT_MIN: Dimensions = { width: 200, height: 150 };

/**
 * One pointer-drag gesture with capture. `onBegin` returns the start snapshot
 * (or null to ignore the press); `onMove` runs per pointermove; `onEnd` commits.
 * Per the house convention, callers write to the DOM directly in `onMove` and
 * commit to React state only in `onEnd`, so a drag doesn't re-render per move.
 */
function usePointerDrag<S>(handlers: {
    onBegin: (e: React.PointerEvent) => S | null;
    onMove: (e: React.PointerEvent, start: S) => void;
    onEnd?: (e: React.PointerEvent, start: S) => void;
}) {
    const startRef = useRef<S | null>(null);
    const onPointerDown = (e: React.PointerEvent) => {
        const start = handlers.onBegin(e);
        if (start == null) return;
        startRef.current = start;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (startRef.current != null) handlers.onMove(e, startRef.current);
    };
    const end = (e: React.PointerEvent) => {
        if (startRef.current == null) return;
        handlers.onEnd?.(e, startRef.current);
        startRef.current = null;
    };
    return { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end };
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
    children,
    open = true,
    z = Z.panel,
    position,
    initialPosition,
    onPositionChange,
    size,
    initialSize,
    onSizeChange,
    draggable = false,
    resizable = false,
    minSize = DEFAULT_MIN,
    dismissOnOutside = false,
    dismissOnEscape = false,
    onClose,
    title,
    headerLeft,
    showClose = true,
    className = 'glass-panel flex flex-col overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]',
    bodyClassName = 'p-3 overflow-y-auto overflow-x-hidden custom-scroll flex-1 bg-surface/80 backdrop-blur-md',
    headerClassName = 'flex items-center justify-between px-2 py-1.5 bg-surface-header border-b border-line/10',
}) => {
    const panelRef = useRef<HTMLDivElement>(null);

    // Uncontrolled fallbacks. `position`/`size` (when passed) always win.
    const [internalPos, setInternalPos] = useState<Coords | undefined>(initialPosition);
    const [internalSize, setInternalSize] = useState<Dimensions | undefined>(initialSize);
    const effectivePos = position ?? internalPos;
    const effectiveSize = size ?? internalSize;

    useDismiss(panelRef, {
        onClose: onClose ?? (() => {}),
        enabled: open && !!onClose && (dismissOnOutside || dismissOnEscape),
        outside: dismissOnOutside,
        escape: dismissOnEscape,
    });

    const applyPos = (pos: Coords) => {
        if (onPositionChange) onPositionChange(pos);
        if (position === undefined) setInternalPos(pos);
    };
    const applySize = (s: Dimensions) => {
        if (onSizeChange) onSizeChange(s);
        if (size === undefined) setInternalSize(s);
    };

    // Keep the panel on-screen. A persisted/default float position can place the
    // window partly (or fully) off the viewport — e.g. a position saved on a
    // bigger screen, or a mobile rotate. Clamp the top-left into the viewport on
    // mount and on resize so the header stays reachable. Coordinate mode only
    // (anchored panels have no position to clamp). Idempotent: only writes when
    // actually out of bounds, so it can't fight a legitimate in-view position.
    useEffect(() => {
        if (!effectivePos) return;
        const clamp = () => {
            const el = panelRef.current;
            if (!el || typeof window === 'undefined') return;
            const margin = 8;
            const w = el.offsetWidth;
            const h = el.offsetHeight;
            const maxX = Math.max(margin, window.innerWidth - w - margin);
            const maxY = Math.max(margin, window.innerHeight - h - margin);
            const cx = Math.min(Math.max(effectivePos.x, margin), maxX);
            const cy = Math.min(Math.max(effectivePos.y, margin), maxY);
            if (cx !== effectivePos.x || cy !== effectivePos.y) applyPos({ x: cx, y: cy });
        };
        clamp();
        window.addEventListener('resize', clamp);
        return () => window.removeEventListener('resize', clamp);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectivePos?.x, effectivePos?.y, effectiveSize?.width, effectiveSize?.height]);

    type DragStart = { px: number; py: number; ox: number; oy: number };
    const drag = usePointerDrag<DragStart>({
        onBegin: (e) => {
            if (!draggable || !effectivePos) return null;
            if ((e.target as HTMLElement).closest('button')) return null; // let header buttons click
            e.preventDefault();
            return { px: e.clientX, py: e.clientY, ox: effectivePos.x, oy: effectivePos.y };
        },
        onMove: (e, s) => {
            const el = panelRef.current;
            if (el) {
                el.style.left = `${s.ox + (e.clientX - s.px)}px`;
                el.style.top = `${s.oy + (e.clientY - s.py)}px`;
            }
        },
        onEnd: (e, s) => applyPos({ x: s.ox + (e.clientX - s.px), y: s.oy + (e.clientY - s.py) }),
    });

    type ResizeStart = { px: number; py: number; ow: number; oh: number };
    const clampSize = (s: ResizeStart, e: React.PointerEvent): Dimensions => ({
        width: Math.max(minSize.width, s.ow + (e.clientX - s.px)),
        height: Math.max(minSize.height, s.oh + (e.clientY - s.py)),
    });
    const resize = usePointerDrag<ResizeStart>({
        onBegin: (e) => {
            if (!effectiveSize) return null;
            e.preventDefault();
            e.stopPropagation();
            return { px: e.clientX, py: e.clientY, ow: effectiveSize.width, oh: effectiveSize.height };
        },
        onMove: (e, s) => {
            const el = panelRef.current;
            if (!el) return;
            const { width, height } = clampSize(s, e);
            el.style.width = `${width}px`;
            el.style.height = `${height}px`;
        },
        onEnd: (e, s) => applySize(clampSize(s, e)),
    });

    if (!open) return null;

    const showHeader = title != null || headerLeft != null || (showClose && !!onClose);

    return createPortal(
        <div
            ref={panelRef}
            className={`fixed ${className}`}
            style={{
                zIndex: z,
                ...(effectivePos ? { left: effectivePos.x, top: effectivePos.y } : null),
                ...(effectiveSize ? { width: effectiveSize.width, height: effectiveSize.height } : null),
                maxHeight: '90vh',
            }}
        >
            {showHeader && (
                <div
                    className={`${headerClassName} ${draggable && effectivePos ? 'cursor-move' : ''}`}
                    {...(draggable && effectivePos ? drag : null)}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {headerLeft}
                        <span className="t-label text-fg-secondary truncate">{title}</span>
                    </div>
                    {showClose && onClose && (
                        <button onClick={onClose} className="icon-btn" title="Close" aria-label="Close">
                            <CloseIcon />
                        </button>
                    )}
                </div>
            )}

            <div className={bodyClassName}>{children}</div>

            {resizable && effectiveSize && (
                <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize touch-none text-fg-dim"
                    {...resize}
                >
                    <ResizeHandleIcon />
                </div>
            )}
        </div>,
        document.body,
    );
};

export default FloatingPanel;
