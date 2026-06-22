import React from 'react';
import { useEngineStore } from '../../store/engineStore';
import { AdaptiveIcon } from '../../components/Icons2';
import { isMouseOverCanvas } from '../engine/worker/ViewportRefs';
import { getProxy } from '../engine/worker/WorkerProxy';

const engine = getProxy();

export const AdaptiveResolution: React.FC = () => {
    const quality = useEngineStore(s => (s as any).quality);
    const setQuality = useEngineStore(s => (s as any).setQuality);
    const adaptiveSuppressed = useEngineStore(s => (s as any).adaptiveSuppressed);

    if (!quality || !setQuality) return null;

    // "UI Responsiveness" > 0 is the single source of truth (the slider can be set
    // directly, so don't also require the dynamicScaling field — it may lag).
    const isActive = (quality.adaptiveTarget ?? 0) > 0 && !adaptiveSuppressed;

    const handleToggle = () => {
        if (isActive) {
            // Off ⇒ also zero the "UI Responsiveness" slider so the toggle and the
            // quality-panel slider stay in sync (slider reads 0 when off).
            setQuality({ dynamicScaling: false, adaptiveTarget: 0 });
        } else {
            setQuality({ dynamicScaling: true, adaptiveTarget: 30 });
        }
    };

    const onCanvas = isMouseOverCanvas();
    const accumCount = engine.accumulationCount;
    const isGuarded = isActive && accumCount >= 8;

    let colorClass = 'text-fg-faint hover:text-fg-muted';
    let stateLabel = 'Off';
    if (isActive) {
        if (isGuarded) {
            colorClass = 'text-ok bg-ok/15 border border-ok/30';
            stateLabel = 'Locked';
        } else if (onCanvas) {
            colorClass = 'text-accent-400 bg-accent-900/30 border border-accent-500/30';
            stateLabel = 'Auto';
        } else {
            colorClass = 'text-warn bg-warn/15 border border-warn/30';
            stateLabel = 'Always';
        }
    }

    return (
        <button
            onClick={handleToggle}
            className={`flex items-center justify-center p-1 rounded transition-colors ${colorClass}`}
            title={`Adaptive Resolution: ${stateLabel}`}
        >
            <AdaptiveIcon />
        </button>
    );
};
