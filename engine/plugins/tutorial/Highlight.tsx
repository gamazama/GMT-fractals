/**
 * Pulsing rectangle drawn over an anchor element. Reads bounds from the
 * anchor registry (not document.querySelector), so highlight tracks
 * mounted-component lifecycle instead of DOM presence.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { tutorAnchors } from './anchors';

interface HighlightRect {
    key: string;
    left: number;
    top: number;
    width: number;
    height: number;
}

interface TutorialHighlightProps {
    targets: string[];
    flash?: boolean;
}

const PULSE_STYLE = `
@keyframes tutorial-pulse {
    0%, 100% { opacity: 0.85; box-shadow: 0 0 14px 2px rgba(103,232,249,0.45), inset 0 0 8px rgba(103,232,249,0.15); }
    50%      { opacity: 1;    box-shadow: 0 0 28px 4px rgba(103,232,249,0.75), inset 0 0 12px rgba(103,232,249,0.30); }
}
@keyframes tutorial-flash {
    0%   { opacity: 1;    box-shadow: 0 0 36px 6px rgba(103,232,249,0.95); border-color: rgba(103,232,249,1); }
    100% { opacity: 0.85; box-shadow: 0 0 14px 2px rgba(103,232,249,0.45); border-color: rgba(103,232,249,0.85); }
}
`;

export const TutorialHighlight: React.FC<TutorialHighlightProps> = ({ targets, flash }) => {
    const [rects, setRects] = useState<HighlightRect[]>([]);

    const measure = useCallback(() => {
        const out: HighlightRect[] = [];
        for (const id of targets) {
            for (const entry of tutorAnchors.getAll(id)) {
                const r = entry.el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) {
                    out.push({ key: `${id}:${out.length}`, left: r.left, top: r.top, width: r.width, height: r.height });
                }
            }
        }
        setRects(out);
    }, [targets]);

    // Observe each target element for size/position changes (ResizeObserver
    // covers most real cases — popovers opening, panels resizing, dock tabs
    // wrapping). Window resize + scroll catch viewport-level shifts.
    useEffect(() => {
        measure();
        const ro = new ResizeObserver(measure);
        for (const id of targets) {
            for (const entry of tutorAnchors.getAll(id)) ro.observe(entry.el);
        }
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, { passive: true, capture: true });
        const unsub = tutorAnchors.subscribe(measure);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
            unsub();
        };
    }, [measure, targets]);

    if (rects.length === 0) return null;

    return createPortal(
        <>
            <style>{PULSE_STYLE}</style>
            {rects.map((rect) => (
                <div
                    key={rect.key}
                    style={{
                        position: 'fixed',
                        left: rect.left - 6,
                        top: rect.top - 6,
                        width: rect.width + 12,
                        height: rect.height + 12,
                        border: `2.5px solid ${flash ? 'rgba(103,232,249,1)' : 'rgba(103,232,249,0.85)'}`,
                        borderRadius: '6px',
                        pointerEvents: 'none',
                        zIndex: 9999,
                        animation: flash
                            ? 'tutorial-flash 0.6s ease-out forwards'
                            : 'tutorial-pulse 2s ease-in-out infinite',
                    }}
                />
            ))}
        </>,
        document.body,
    );
};
