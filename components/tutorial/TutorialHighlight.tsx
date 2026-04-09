
import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';

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
    0%, 100% { opacity: 0.7; box-shadow: 0 0 8px rgba(255,255,255,0.2); }
    50% { opacity: 1; box-shadow: 0 0 16px rgba(255,255,255,0.4); }
}
@keyframes tutorial-flash {
    0% { opacity: 1; box-shadow: 0 0 24px rgba(103,232,249,0.8); border-color: rgba(103,232,249,1); }
    100% { opacity: 0.7; box-shadow: 0 0 8px rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.8); }
}
`;

const TutorialHighlight: React.FC<TutorialHighlightProps> = ({ targets, flash }) => {
    const [rects, setRects] = useState<HighlightRect[]>([]);

    const measure = useCallback(() => {
        const result: HighlightRect[] = [];
        for (const target of targets) {
            const el = document.querySelector(`[data-tut="${target}"]`);
            if (el) {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) {
                    result.push({ key: target, left: r.left, top: r.top, width: r.width, height: r.height });
                }
            }
        }
        setRects(result);
    }, [targets]);

    useEffect(() => {
        measure();
        const interval = setInterval(measure, 200);
        window.addEventListener('resize', measure);
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', measure);
        };
    }, [measure]);

    if (rects.length === 0) return null;

    return ReactDOM.createPortal(
        <>
            <style>{PULSE_STYLE}</style>
            {rects.map((rect) => (
                <div
                    key={rect.key}
                    style={{
                        position: 'fixed',
                        left: rect.left - 4,
                        top: rect.top - 4,
                        width: rect.width + 8,
                        height: rect.height + 8,
                        border: `2px solid ${flash ? 'rgba(103,232,249,1)' : 'rgba(255,255,255,0.8)'}`,
                        borderRadius: '4px',
                        pointerEvents: 'none',
                        zIndex: 9999,
                        animation: flash
                            ? 'tutorial-flash 0.6s ease-out forwards'
                            : 'tutorial-pulse 2s ease-in-out infinite',
                    }}
                />
            ))}
        </>,
        document.body
    );
};

export default TutorialHighlight;
