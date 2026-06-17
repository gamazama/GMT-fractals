/**
 * QualityBadge — HUD widget that shows the adaptive viewport's current
 * quality fraction as "qNN%". Reads from @engine/viewport so it reflects
 * real-time adaptive scaling without any app-side plumbing.
 *
 * Registered into @engine/hud's bottom-left slot by fluid-toy's main.tsx.
 * This is an app-local widget — the engine doesn't prescribe its
 * contents, it just provides the slot.
 */

import React from 'react';
import { useQualityFraction } from '../../engine/plugins/Viewport';

export const QualityBadge: React.FC = () => {
    const quality = useQualityFraction();
    return (
        <span className="text-[10px] text-white/40 font-mono pointer-events-none">
            q{(quality * 100).toFixed(0)}%
        </span>
    );
};
