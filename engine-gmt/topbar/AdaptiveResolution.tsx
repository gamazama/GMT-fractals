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

    const isActive = quality.dynamicScaling && (quality.adaptiveTarget ?? 0) > 0 && !adaptiveSuppressed;

    const handleToggle = () => {
        if (isActive) {
            setQuality({ dynamicScaling: false });
        } else {
            setQuality({ dynamicScaling: true, adaptiveTarget: 30 });
        }
    };

    const onCanvas = isMouseOverCanvas();
    const accumCount = engine.accumulationCount;
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
            className={`flex items-center justify-center p-1 rounded transition-colors ${colorClass}`}
            title={`Adaptive Resolution: ${stateLabel}`}
        >
            <AdaptiveIcon />
        </button>
    );
};
