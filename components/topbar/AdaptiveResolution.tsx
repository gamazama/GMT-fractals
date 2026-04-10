
import React from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { isMouseOverCanvas } from '../../engine/worker/ViewportRefs';
import type { QualityState } from '../../features/quality';

const AdaptiveIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        <polyline points="22 2 13 11 9 7" />
    </svg>
);

export const AdaptiveResolution: React.FC = () => {
    const quality = useFractalStore(s => (s as any).quality) as QualityState | undefined;
    const setQuality = useFractalStore(s => (s as any).setQuality) as ((q: Partial<QualityState>) => void) | undefined;

    if (!quality || !setQuality) return null;

    const isActive = quality.dynamicScaling && (quality.adaptiveTarget ?? 0) > 0;

    const handleToggle = () => {
        if (isActive) {
            setQuality({ dynamicScaling: false });
        } else {
            setQuality({ dynamicScaling: true, adaptiveTarget: 30 });
        }
    };

    // Icon color reflects current state:
    // - Off (gray): disabled
    // - Auto/canvas (cyan): active with grace period, will restore full res
    // - Always/UI (amber): active without grace period, continuously reduced
    const onCanvas = isMouseOverCanvas();
    let colorClass = 'text-gray-600 hover:text-gray-400';
    let stateLabel = 'Off';
    if (isActive) {
        if (onCanvas) {
            colorClass = 'text-cyan-400 bg-cyan-900/30 border border-cyan-500/30';
            stateLabel = 'Auto';
        } else {
            colorClass = 'text-amber-400 bg-amber-900/30 border border-amber-500/30';
            stateLabel = 'Always';
        }
    }

    return (
        <button
            onClick={handleToggle}
            className={`p-0.5 rounded transition-colors ${colorClass}`}
            title={`Adaptive Resolution: ${stateLabel}`}
        >
            <AdaptiveIcon />
        </button>
    );
};
