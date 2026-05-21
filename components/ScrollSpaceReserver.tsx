import React, { useEffect, useRef, useState } from 'react';

function findScrollParent(el: Element | null): Element | null {
    let parent = el?.parentElement ?? null;
    while (parent) {
        const overflowY = getComputedStyle(parent).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') return parent;
        parent = parent.parentElement;
    }
    return null;
}

/**
 * Holds the maximum content height the wrapper has ever observed.
 * When inner content shrinks (a feature toggle collapses its options)
 * the wrapper keeps its old height; the freed area appears as an
 * empty bottom spacer instead of letting things below jump upward.
 *
 * The reservation is released only after the user has seen the
 * preserved spacer and scrolled it back out of view — a scroll
 * listener on the nearest scroll parent watches the spacer's
 * intersection and resets the held height on the visible→not-visible
 * transition.
 *
 * For short panels where the preserved spacer would otherwise always
 * stay at least partially in view (no room to scroll it away), an
 * additional invisible buffer is inserted between the content and
 * the preserved spacer. Sized so the preserved area sits below the
 * viewport at scrollTop=0, this lets the user actively scroll to
 * see it and then scroll back, triggering the same visibility GC.
 *
 * `min-height` on the wrapper holds the total reservation across
 * re-renders, so the spacer is present from the first paint after a
 * collapse — no flicker between the content shrinking and the
 * spacer being applied.
 *
 * Caveat: if the wrapped content has its own internal scroll
 * container, height changes inside that container are hidden from
 * this wrapper (its outer measurable height stays fixed). Such
 * panels need their own ScrollSpaceReserver inside their scroll
 * boundary, or none at all.
 */
export const ScrollSpaceReserver: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const preservedRef = useRef<HTMLDivElement>(null);
    const [maxHeight, setMaxHeight] = useState(0);
    const [contentHeight, setContentHeight] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const seenRef = useRef(false);

    // Track the scroll parent's clientHeight so the buffer can size
    // itself to match. ResizeObserver also catches dock resizes.
    useEffect(() => {
        const wrap = wrapperRef.current;
        if (!wrap) return;
        const sp = findScrollParent(wrap);
        if (!sp) return;
        const updateVH = () => setViewportHeight(sp.clientHeight);
        updateVH();
        const ro = new ResizeObserver(updateVH);
        ro.observe(sp);
        return () => ro.disconnect();
    }, []);

    // Track inner content height. Measure synchronously on setup so
    // the initial size lands in state before any user interaction —
    // RO's first callback is async and can lose the race when an
    // accordion's contents render lazily after first paint.
    useEffect(() => {
        const content = contentRef.current;
        if (!content) return;
        const initialH = content.offsetHeight;
        if (initialH > 0) {
            setContentHeight(initialH);
            setMaxHeight((prev) => Math.max(prev, initialH));
        }
        const ro = new ResizeObserver(([entry]) => {
            const h = entry.contentRect.height;
            setContentHeight(h);
            setMaxHeight((prev) => Math.max(prev, h));
        });
        ro.observe(content);
        return () => ro.disconnect();
    }, []);

    const preserved = Math.max(0, maxHeight - contentHeight);
    // Buffer pushes preserved area below the viewport at scrollTop=0
    // so it can be scrolled into view and back out — required for
    // visibility-based GC to fire on short panels.
    const buffer = preserved > 0 ? Math.max(0, viewportHeight - contentHeight) : 0;
    const total = contentHeight + buffer + preserved;

    // A fresh spacer hasn't been seen yet.
    useEffect(() => {
        if (preserved > 0) seenRef.current = false;
    }, [preserved]);

    // Visibility-based GC: when the preserved element transitions
    // from visible to not-visible during scroll, drop the reservation.
    useEffect(() => {
        const wrap = wrapperRef.current;
        if (!wrap) return;
        const sp = findScrollParent(wrap);
        if (!sp) return;
        const handleScroll = () => {
            const el = preservedRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const parentRect = sp.getBoundingClientRect();
            const visible = rect.bottom > parentRect.top && rect.top < parentRect.bottom;
            if (visible) {
                seenRef.current = true;
            } else if (seenRef.current) {
                seenRef.current = false;
                setMaxHeight(contentHeight);
            }
        };
        sp.addEventListener('scroll', handleScroll, { passive: true });
        return () => sp.removeEventListener('scroll', handleScroll);
    }, [contentHeight]);

    return (
        <div ref={wrapperRef} style={{ minHeight: total }}>
            <div ref={contentRef}>{children}</div>
            {buffer > 0 && <div style={{ height: buffer }} aria-hidden />}
            {preserved > 0 && <div ref={preservedRef} style={{ height: preserved }} aria-hidden />}
        </div>
    );
};
