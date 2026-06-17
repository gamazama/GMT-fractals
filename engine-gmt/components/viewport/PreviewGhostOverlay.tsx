/**
 * PreviewGhostOverlay — dashed fuchsia rectangle that tracks the cursor
 * while `interactionMode === 'selecting_preview'`. The `usePreviewTarget`
 * hook computes `ghostRect` in normalised UV; this component renders
 * the visible marker. Purely presentational.
 *
 * Extracted from `h:/GMT/gmt-0.8.5/components/ViewportArea.tsx`
 * (inline helper, not a standalone file there).
 */

import React from 'react';
import { useEngineStore } from '../../../store/engineStore';

export const PreviewGhostOverlay: React.FC<{
    region: { minX: number; minY: number; maxX: number; maxY: number };
}> = ({ region }) => {
    const outputWidth = useEngineStore((s) => (s as any).outputWidth);
    const outputHeight = useEngineStore((s) => (s as any).outputHeight);
    const rectW = Math.round((region.maxX - region.minX) * outputWidth);
    const rectH = Math.round((region.maxY - region.minY) * outputHeight);
    return (
        <div
            className="absolute z-40 pointer-events-none border-2 border-dashed border-fuchsia-400/90"
            style={{
                left: `${region.minX * 100}%`,
                bottom: `${region.minY * 100}%`,
                right: `${(1 - region.maxX) * 100}%`,
                top: `${(1 - region.maxY) * 100}%`,
            }}
        >
            <div className="absolute -top-4 left-0 bg-fuchsia-500/70 text-white text-[9px] font-bold px-1 py-0.5 rounded-sm whitespace-nowrap">
                Click to preview · {rectW}×{rectH}px @ export
            </div>
        </div>
    );
};
