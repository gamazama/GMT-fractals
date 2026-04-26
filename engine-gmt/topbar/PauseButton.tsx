import React, { useEffect, useRef, useState } from 'react';
import { useEngineStore, selectIsGlobalInteraction } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';
import { PlayIcon, PauseIcon } from '../../components/Icons';
import { Popover } from '../../components/Popover';
import Slider from '../../components/Slider';
import { getProxy } from '../engine/worker/WorkerProxy';

const engine = getProxy();

export const PauseButton: React.FC = () => {
    const isPaused      = useEngineStore((s) => s.isPaused);
    const sampleCap     = useEngineStore((s) => s.sampleCap);
    const setIsPaused   = useEngineStore((s) => s.setIsPaused);
    const setSampleCap  = useEngineStore((s) => s.setSampleCap);

    const isGlobalInteraction = useEngineStore(selectIsGlobalInteraction);
    const isCameraInteracting = useAnimationStore((s) => s.isCameraInteracting);
    const isScrubbing         = useAnimationStore((s) => s.isScrubbing);
    const isEffectivePaused   = isPaused && !isCameraInteracting && !isGlobalInteraction && !isScrubbing;

    // Poll accumulationCount from the worker proxy each frame
    const [accumCount, setAccumCount] = useState(0);
    useEffect(() => {
        let rafId: number;
        const tick = () => {
            setAccumCount(engine.accumulationCount);
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, []);

    const progress   = sampleCap > 0 ? Math.min(1, accumCount / sampleCap) : 0;
    const isDone     = sampleCap > 0 && accumCount >= sampleCap;

    const [showMenu, setShowMenu] = useState(false);
    const hoverTimeout = useRef<number | null>(null);
    const handleMouseEnter = () => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setShowMenu(true);
    };
    const handleMouseLeave = () => {
        hoverTimeout.current = window.setTimeout(() => setShowMenu(false), 150);
    };

    // Border + text colour
    let colorClass: string;
    if (isEffectivePaused) {
        colorClass = 'border-amber-500/40 text-amber-400';
    } else if (isDone) {
        colorClass = 'border-green-500/40 text-green-400';
    } else {
        colorClass = 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20';
    }

    // Fill colour (renders behind the icon)
    let fillColor: string;
    if (isDone) {
        fillColor = 'bg-green-500/20';
    } else if (isEffectivePaused) {
        fillColor = 'bg-amber-500/20';
    } else {
        fillColor = 'bg-cyan-500/15';
    }

    return (
        <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? 'Resume Rendering' : isDone ? `Done — ${accumCount} samples` : 'Pause Rendering'}
                className={`relative overflow-hidden p-0.5 rounded border transition-colors ${colorClass}`}
                style={{ minWidth: 22 }}
            >
                {/* Progress fill — grows left→right */}
                {progress > 0 && (
                    <span
                        className={`absolute inset-0 ${fillColor} transition-none`}
                        style={{ width: `${progress * 100}%` }}
                    />
                )}
                {/* Icon sits above the fill */}
                <span className="relative">
                    {isEffectivePaused ? <PlayIcon /> : <PauseIcon />}
                </span>
            </button>

            {showMenu && (
                <Popover width="w-44">
                    <Slider
                        label="Auto-Stop (Samples)"
                        value={sampleCap}
                        min={0} max={4096} step={32}
                        onChange={setSampleCap}
                        overrideInputText={sampleCap === 0 ? 'Infinite' : sampleCap.toFixed(0)}
                    />
                    {sampleCap > 0 && (
                        <div className="text-[8px] text-gray-500 text-center mt-1.5">
                            {accumCount} / {sampleCap} samples
                            {isDone && <span className="text-green-400 ml-1">✓ done</span>}
                        </div>
                    )}
                    {sampleCap === 0 && (
                        <div className="text-[8px] text-gray-600 text-center mt-1">0 = never stop</div>
                    )}
                </Popover>
            )}
        </div>
    );
};
