/**
 * ViewportModeControls — the top-left chrome for viewport size mode.
 *
 * When mode is 'Fixed': renders FixedResolutionControls with its
 * drag-to-resize label, aspect-ratio preset menu, and "Fill" button
 * (which switches back to Full mode).
 *
 * When mode is 'Full': renders a compact pill button that switches
 * INTO Fixed mode at a sensible default resolution (uses the current
 * viewport size if available, else the stored fixedResolution).
 *
 * Consumed by ViewportFrame by default. Apps can render it directly
 * in a custom layout, or disable via ViewportFrame's showModeControls
 * prop. GMT hides it during broadcast mode; toy-fluid might hide it
 * when the user toggles a clean-feed mode.
 */

import React from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { FixedResolutionControls } from './FixedResolutionControls';

export interface ViewportModeControlsProps {
    /** Position of the controls container (absolute px from the
     *  viewport's top/left edge). Default: top-12px, left-12px. */
    top?: number;
    left?: number;
    /** The viewport container's current dimensions, used by the
     *  Fixed-mode aspect-ratio presets to compute "fit to window"
     *  dimensions. If omitted, presets fall back to the current
     *  fixedResolution. */
    availableWidth?: number;
    availableHeight?: number;
}

export const ViewportModeControls: React.FC<ViewportModeControlsProps> = ({
    top = 12,
    left = 12,
    availableWidth,
    availableHeight,
}) => {
    const mode = useEngineStore((s) => s.resolutionMode);
    const fixedResolution = useEngineStore((s) => s.fixedResolution);
    const setMode = useEngineStore((s) => s.setResolutionMode);
    const setFixedResolution = useEngineStore((s) => s.setFixedResolution);

    if (mode === 'Fixed') {
        const [w, h] = fixedResolution;
        return (
            <FixedResolutionControls
                width={w}
                height={h}
                top={top}
                left={left}
                maxAvailableWidth={availableWidth ?? w * 2}
                maxAvailableHeight={availableHeight ?? h * 2}
                onSetResolution={setFixedResolution}
                onSetMode={setMode}
            />
        );
    }

    return (
        <button
            onClick={(e) => { e.stopPropagation(); setMode('Fixed'); }}
            style={{ top, left }}
            className="absolute z-50 flex items-center gap-1.5 text-[9px] font-bold text-gray-300 bg-black/80 px-2 py-1 rounded border border-white/10 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-900/30 transition-all shadow-sm backdrop-blur-md group"
            title="Switch to Fixed Resolution Mode"
        >
            <span className="w-2 h-2 border border-current rounded-sm group-hover:scale-110 transition-transform" />
            Fixed
        </button>
    );
};
