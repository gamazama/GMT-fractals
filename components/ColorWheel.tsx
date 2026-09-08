/**
 * ColorWheel — an HSV colour wheel carrying one or more draggable HANDLES, the way a
 * studio colour chooser does it (the owner's reference: Cinema 4D's Color Chooser, whose
 * wheel is the heart of that dialog). Hue is the angle, saturation the radius, and value
 * lives on the strip beside it. Every handle is a colour; the ACTIVE one is the colour the
 * host is editing, and the rest are its harmony.
 *
 * Pure and store-free by design: it takes handles and reports gestures, so the host owns
 * both the harmony rule and the undo bracket. That keeps one wheel usable from the v2 stop
 * inspector and, later, from app-gmt's picker without a second copy.
 *
 * Gestures (Cinema 4D's, as far as they make sense here):
 *   • drag anywhere in the disc          — move the active handle to that hue / saturation
 *   • click a handle                     — make it the active colour
 *   • Ctrl/Cmd + click                   — add a handle there (host decides if it may)
 *   • Escape mid-drag                    — cancel back to where the drag started
 *   • the strip on the right             — the active colour's value
 *
 * @assumption The wheel is redrawn only when `value` or `size` changes (a 150 px disc is
 *   ~18k pixels of ImageData): handle motion repaints the overlay canvas alone.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { hsvToRgb } from '../utils/colorUtils';

export interface WheelHandle {
    /** 0..360 */
    h: number;
    /** 0..1 */
    s: number;
    /** 0..100 */
    v: number;
}

interface Props {
    handles: WheelHandle[];
    activeIndex: number;
    /** Disc diameter in px. */
    size?: number;
    /** Modest rounding on the value strip (a control radius, not the gradient one). */
    soft?: boolean;
    onActivate: (index: number) => void;
    /** The active handle was dragged to this hue / saturation. */
    onMove: (h: number, s: number) => void;
    onValue: (v: number) => void;
    onDragStart: () => void;
    onDragEnd: () => void;
    /** Ctrl/Cmd + click on empty wheel. Omit to forbid adding. */
    onAdd?: (h: number, s: number) => void;
}

const TAU = Math.PI * 2;

/** Where a handle sits inside a `size` box. */
const handleXY = (h: WheelHandle, size: number): [number, number] => {
    const r = size / 2;
    const a = (h.h * Math.PI) / 180;
    return [r + Math.cos(a) * h.s * r, r + Math.sin(a) * h.s * r];
};

export const ColorWheel: React.FC<Props> = ({
    handles,
    activeIndex,
    size = 150,
    soft = true,
    onActivate,
    onMove,
    onValue,
    onDragStart,
    onDragEnd,
    onAdd,
}) => {
    const discRef = useRef<HTMLCanvasElement>(null);
    const active = handles[activeIndex] ?? handles[0];
    const value = active?.v ?? 100;

    // The disc: hue by angle, saturation by radius, at the active handle's value.
    useEffect(() => {
        const cv = discRef.current;
        const ctx = cv?.getContext('2d');
        if (!cv || !ctx) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const px = Math.round(size * dpr);
        cv.width = px;
        cv.height = px;
        const img = ctx.createImageData(px, px);
        const r = px / 2;
        for (let y = 0; y < px; y++) {
            for (let x = 0; x < px; x++) {
                const dx = x - r + 0.5;
                const dy = y - r + 0.5;
                const dist = Math.hypot(dx, dy);
                const i = (y * px + x) * 4;
                if (dist > r) {
                    img.data[i + 3] = 0;
                    continue;
                }
                const hue = ((Math.atan2(dy, dx) / TAU) * 360 + 360) % 360;
                const { r: cr, g: cg, b: cb } = hsvToRgb(hue, Math.min(1, dist / r) * 100, value);
                img.data[i] = cr;
                img.data[i + 1] = cg;
                img.data[i + 2] = cb;
                // feather the last pixel so the rim is not stair-stepped
                img.data[i + 3] = dist > r - dpr ? Math.round(255 * Math.max(0, r - dist) / dpr) : 255;
            }
        }
        ctx.putImageData(img, 0, 0);
    }, [size, value]);

    // --- gestures -------------------------------------------------------------------
    const boxRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ before: WheelHandle[] } | null>(null);

    /** Pointer → hue / saturation, clamped to the disc. */
    const at = useCallback((e: { clientX: number; clientY: number }): [number, number] => {
        const rect = boxRef.current?.getBoundingClientRect();
        if (!rect) return [0, 0];
        const r = rect.width / 2;
        const dx = e.clientX - rect.left - r;
        const dy = e.clientY - rect.top - r;
        const hue = ((Math.atan2(dy, dx) / TAU) * 360 + 360) % 360;
        return [hue, Math.min(1, Math.hypot(dx, dy) / r)];
    }, []);

    const hitHandle = useCallback((e: { clientX: number; clientY: number }): number => {
        const rect = boxRef.current?.getBoundingClientRect();
        if (!rect) return -1;
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        let best = -1;
        let bestD = 11; // grab radius
        handles.forEach((h, i) => {
            const [hx, hy] = handleXY(h, rect.width);
            const d = Math.hypot(hx - px, hy - py);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        });
        return best;
    }, [handles]);

    const onPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const [h, s] = at(e);
        if ((e.ctrlKey || e.metaKey) && onAdd) {
            onAdd(h, s);
            return;
        }
        const hit = hitHandle(e);
        if (hit >= 0 && hit !== activeIndex) {
            onActivate(hit);
            return;
        }
        (e.target as Element).setPointerCapture(e.pointerId);
        dragRef.current = { before: handles.map((x) => ({ ...x })) };
        onDragStart();
        onMove(h, s);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current) return;
        const [h, s] = at(e);
        onMove(h, s);
    };

    const endDrag = (e?: React.PointerEvent) => {
        if (!dragRef.current) return;
        dragRef.current = null;
        if (e) try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* already gone */ }
        onDragEnd();
    };

    // Escape mid-drag puts the colour back where the gesture started (the spec's "you can
    // press Esc to cancel the process and keep the original color").
    useEffect(() => {
        const onKey = (ev: KeyboardEvent) => {
            if (ev.key !== 'Escape' || !dragRef.current) return;
            const was = dragRef.current.before[activeIndex];
            dragRef.current = null;
            if (was) onMove(was.h, was.s);
            onDragEnd();
            ev.stopPropagation();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [activeIndex, onMove, onDragEnd]);

    // Arrow keys nudge the active handle once it has focus: hue on the horizontal, saturation
    // on the vertical, Shift for a coarse step, Alt to jump to the rim or the centre (the
    // reference spec's 1 % / 10 % / edge, mapped onto a wheel).
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!active) return;
        const fine = e.shiftKey ? 10 : 1;
        let h = active.h;
        let s = active.s;
        switch (e.key) {
            case 'ArrowLeft': h -= fine; break;
            case 'ArrowRight': h += fine; break;
            case 'ArrowUp': s = e.altKey ? 1 : s + fine / 100; break;
            case 'ArrowDown': s = e.altKey ? 0 : s - fine / 100; break;
            default: return;
        }
        e.preventDefault();
        e.stopPropagation();
        onDragStart();
        onMove(((h % 360) + 360) % 360, Math.max(0, Math.min(1, s)));
        onDragEnd();
    };

    // --- the value strip ------------------------------------------------------------
    const stripRef = useRef<HTMLDivElement>(null);
    const stripDrag = useRef(false);
    const stripAt = (e: { clientY: number }) => {
        const rect = stripRef.current?.getBoundingClientRect();
        if (!rect) return;
        const t = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        onValue(Math.round((1 - t) * 100));
    };
    const valueTrack = useMemo(() => {
        if (!active) return 'transparent';
        const top = hsvToRgb(active.h, active.s * 100, 100);
        return `linear-gradient(to bottom, rgb(${top.r},${top.g},${top.b}), #000)`;
    }, [active?.h, active?.s]);

    // a control, not a gradient bar: 6 px, never a pill (owner, 2026-09-08)
    const radius = soft ? 'rounded-md' : 'rounded';

    return (
        <div className="flex gap-1.5 items-start">
            <div
                ref={boxRef}
                tabIndex={0}
                role="application"
                aria-label="Colour wheel"
                className="relative shrink-0 cursor-crosshair touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 rounded-full"
                style={{ width: size, height: size }}
                onKeyDown={onKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onLostPointerCapture={() => endDrag()}
                title="Drag to pick hue and saturation; click a handle to make it the colour"
            >
                <canvas ref={discRef} className="w-full h-full rounded-full block" style={{ width: size, height: size }} />
                {handles.map((h, i) => {
                    const [x, y] = handleXY(h, size);
                    const on = i === activeIndex;
                    const { r, g, b } = hsvToRgb(h.h, h.s * 100, h.v);
                    return (
                        <span
                            key={i}
                            aria-hidden
                            className={`absolute rounded-full pointer-events-none ${on ? 'w-[13px] h-[13px] border-2 border-fg shadow-[0_0_0_1.5px_rgba(0,0,0,.5)]' : 'w-[11px] h-[11px] border-2 border-fg/70 shadow-[0_0_0_1px_rgba(0,0,0,.45)]'}`}
                            style={{ left: x, top: y, transform: 'translate(-50%, -50%)', backgroundColor: `rgb(${r},${g},${b})` }}
                        />
                    );
                })}
            </div>
            <div
                ref={stripRef}
                className={`relative w-4 shrink-0 cursor-ns-resize touch-none ${radius}`}
                style={{ height: size, background: valueTrack }}
                onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    (e.target as Element).setPointerCapture(e.pointerId);
                    stripDrag.current = true;
                    onDragStart();
                    stripAt(e);
                }}
                onPointerMove={(e) => { if (stripDrag.current) stripAt(e); }}
                onPointerUp={(e) => {
                    if (!stripDrag.current) return;
                    stripDrag.current = false;
                    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* already gone */ }
                    onDragEnd();
                }}
                title="Value"
            >
                <div
                    className="absolute left-0 w-full h-[3px] -mt-[1.5px] bg-fg rounded-full pointer-events-none shadow-[0_0_0_1px_rgba(0,0,0,.45)]"
                    style={{ top: `${100 - value}%` }}
                />
            </div>
        </div>
    );
};

export default ColorWheel;
