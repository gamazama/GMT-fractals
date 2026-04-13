
import React from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { isMouseOverCanvas } from '../../engine/worker/ViewportRefs';
import { getProxy } from '../../engine/worker/WorkerProxy';
import type { QualityState } from '../../features/quality';

const engine = getProxy();

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

    const adaptiveSuppressed = useFractalStore(s => s.adaptiveSuppressed);
    const isActive = quality.dynamicScaling && (quality.adaptiveTarget ?? 0) > 0 && !adaptiveSuppressed;

    const handleToggle = () => {
        if (isActive) {
            setQuality({ dynamicScaling: false });
        } else {
            setQuality({ dynamicScaling: true, adaptiveTarget: 30 });
        }
    };

    // Icon color reflects current state:
    // - Off (gray): disabled
    // - Guarded (green): full-res accumulation locked, image protected
    // - Auto/canvas (cyan): active with grace period
    // - Always/UI (amber): active without grace period
    const onCanvas = isMouseOverCanvas();
    const accumCount = engine.accumulationCount;
    // Approximate the worker's threshold (same formula: ~1s of frames, clamped 8-50)
    const isGuarded = isActive && accumCount >= 8;

    let colorClass = 'text-gray-600 hover:text-gray-400';
    let stateLabel = 'Off';
    if (isActive) {
        if (isGuarded) {
            colorClass = 'text-green-400 bg-green-900/30 border border-green-500/30';
            stateLabel = 'Locked';
        } else if (onCanvas) {
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
