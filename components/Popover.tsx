
import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { mergeRefs, useTutorAnchor } from '../engine/plugins/Tutorial';
import { Layer } from './ui';

type PopoverAlign = 'center' | 'start' | 'end';

interface PopoverProps {
    children: React.ReactNode;
    align?: PopoverAlign;
    width?: string; // e.g. 'w-52', 'w-72'
    className?: string;
    onClose?: () => void;
    /** Set false to hide the pointer arrow. Default true. */
    arrow?: boolean;
    /** Tutorial anchor id — registers the popover root with the tutorial
     *  anchor registry so lessons can position cards / highlights on it. */
    tutAnchor?: string;
    /** Horizontal padding. 'default' = p-3 (matches the original baked-in
     *  spacing). 'none' = p-0 — for popovers whose inner rows want flush
     *  alignment with the popover edge. */
    padding?: 'default' | 'none';
    /** Forwarded to the portalled panel. REQUIRED for hover-driven triggers:
     *  the panel is a body portal, not a DOM descendant of the trigger wrapper,
     *  so the wrapper's `onMouseLeave` fires when the cursor reaches the panel.
     *  Pass the trigger's enter/leave handlers here so hovering the panel keeps
     *  it open (cancels the close timer). */
    onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
    onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}

const alignArrow: Record<PopoverAlign, string> = {
    center: 'left-1/2 -translate-x-1/2',
    start: 'left-4',
    end: 'right-4',
};

const GAP = 12; // mt-3

/**
 * Popover — dropdown panel anchored below its trigger.
 *
 * **Portalled** (ADR-0081 / the z-index layer system): the visible panel mounts
 * to the layer host at the `popover` tier, so it floats ABOVE the floating-panel
 * band — fixing the long-standing "topbar dropdowns render under panels" trap
 * (the panel was previously an inline `absolute top-full` child, confined to the
 * shell's stacking context). An inline 0-size marker stays in place to measure
 * the trigger rect; the panel is positioned `fixed` below it, preserving the
 * original `top-full` + align (center/start/end) + arrow geometry exactly.
 *
 * Call sites are unchanged — the trigger wrapper may still be `relative`
 * (now harmless), and the panel keeps appearing right below the trigger:
 * ```tsx
 * <div className="relative">
 *   <button onClick={() => setOpen(!open)}>Settings</button>
 *   {open && <Popover width="w-52" onClose={() => setOpen(false)}>{content}</Popover>}
 * </div>
 * ```
 *
 * @see plans/z-index-system-design.md (§2 — the portal-vs-trap rule)
 */
export const Popover: React.FC<PopoverProps> = ({
    children,
    align = 'center',
    width = 'w-52',
    className = '',
    onClose,
    arrow = true,
    tutAnchor,
    padding = 'default',
    onMouseEnter,
    onMouseLeave,
}) => {
    const markerRef = useRef<HTMLSpanElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    const anchorRef = useTutorAnchor(tutAnchor);
    const [rect, setRect] = useState<DOMRect | null>(null);

    // Measure the trigger (the marker's parent — the wrapper that held the
    // popover in flow) before paint, and keep it in sync on resize / scroll.
    useLayoutEffect(() => {
        const parent = markerRef.current?.parentElement;
        if (!parent) return;
        triggerRef.current = parent;
        const measure = () => setRect(parent.getBoundingClientRect());
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true); // capture: catch any scrolling ancestor
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, []);

    // Outside-click closes. Deferred a tick so the opening click doesn't close it.
    // The panel is a body PORTAL — not a DOM descendant of the trigger wrapper —
    // so a click is "inside" when it lands in EITHER the portalled panel OR the
    // trigger wrapper (the latter lets the trigger button toggle without the
    // outside-click racing it closed/reopened).
    useEffect(() => {
        if (!onClose) return;
        const handler = (e: MouseEvent) => {
            const t = e.target as Node;
            if (contentRef.current?.contains(t)) return;
            if (triggerRef.current?.contains(t)) return;
            onClose();
        };
        const id = setTimeout(() => document.addEventListener('mousedown', handler), 0);
        return () => {
            clearTimeout(id);
            document.removeEventListener('mousedown', handler);
        };
    }, [onClose]);

    const posStyle: React.CSSProperties = rect
        ? {
              top: rect.bottom + GAP,
              ...(align === 'center'
                  ? { left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }
                  : align === 'start'
                    ? { left: rect.left }
                    : { left: rect.right, transform: 'translateX(-100%)' }),
          }
        : {};

    return (
        <>
            {/* In-flow marker: anchors the measurement to the original location. */}
            <span ref={markerRef} className="hidden" aria-hidden />
            {rect && (
                <Layer
                    tier="popover"
                    ref={mergeRefs(contentRef, tutAnchor ? anchorRef : null)}
                    // Generic marker so a trigger's own outside-click handler can
                    // treat clicks inside the (portalled) panel as "inside" via
                    // `target.closest('[data-popover]')` — the panel is no longer a
                    // DOM descendant of the trigger wrapper (ADR-0082).
                    data-popover=""
                    style={posStyle}
                    // max-h:80dvh + overflow scroll keeps content inside the viewport on
                    // mobile (the Light Studio popup has unbounded internal layout).
                    className={`${width} max-h-[80dvh] overflow-y-auto mobile-scroll bg-surface border border-line/20 rounded-xl ${
                        padding === 'none' ? 'py-3' : 'p-3'
                    } shadow-2xl animate-fade-in ${className}`}
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                >
                    {arrow && (
                        <div
                            className={`absolute -top-1.5 ${alignArrow[align]} w-3 h-3 bg-surface border-t border-l border-line/20 transform rotate-45`}
                        />
                    )}
                    {children}
                </Layer>
            )}
        </>
    );
};

export default Popover;
