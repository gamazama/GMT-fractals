
import React from 'react';

// Minimal TimelineToolbar stub. GMT's original had a rich toolbar with export
// controls, mode switcher, scrub navigator, and the RenderPopup entry point —
// those components were fractal-specific and stripped during engine
// extraction. Apps can replace this with their own toolbar.

interface TimelineToolbarProps {
    mode: 'DopeSheet' | 'Graph';
    setMode: (m: 'DopeSheet' | 'Graph') => void;
    totalContentWidth: number;
    viewportWidth: number;
    scrollLeft: number;
    onScroll: (px: number) => void;
    onZoom: (val: number, type?: 'factor' | 'absolute') => void;
    onClose: () => void;
    containerRef?: React.RefObject<HTMLDivElement>;
    frameWidth: number;
    durationFrames: number;
    inspectorVisible: boolean;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
    mode,
    setMode,
    onClose,
}) => {
    return (
        <div className="flex items-center gap-2 px-2 py-1 border-b border-white/5 bg-[#0a0a0a] text-[10px] text-gray-400">
            <button
                type="button"
                onClick={() => setMode(mode === 'DopeSheet' ? 'Graph' : 'DopeSheet')}
                className="px-2 py-0.5 rounded border border-white/10 hover:bg-white/5"
            >
                {mode === 'DopeSheet' ? 'Graph' : 'Dope Sheet'}
            </button>
            <div className="flex-1" />
            <button
                type="button"
                onClick={onClose}
                className="px-2 py-0.5 rounded hover:bg-white/5 text-gray-500 hover:text-white"
                title="Close Timeline"
            >
                ✕
            </button>
        </div>
    );
};
