/**
 * @engine/topbar/PauseControls — pause button + hover popover with
 * accumulation sample cap.
 *
 * Ported from GMT's `components/topbar/RenderTools.tsx` pause fragment —
 * but generic: reads `isPaused`, `sampleCap`, `setIsPaused`, `setSampleCap`
 * from `renderControlSlice` (engine-core) and interaction state from
 * `selectIsGlobalInteraction` + `useAnimationStore`. Zero GMT imports.
 *
 * Mount via `installPauseControls()` — registers a right-slot topbar
 * item. Apps that don't want it simply don't call the installer.
 *
 * Visual behaviour matches GMT:
 *   - Play icon when effectively paused (paused AND not interacting).
 *   - Pause icon otherwise.
 *   - Amber highlight when effectively paused — signals "rendering is
 *     off, you're saving battery".
 *   - Hover shows a popover with the accumulation sample cap slider.
 *     `0 = Never Stop` — infinite accumulation.
 */

import React, { useRef, useState } from 'react';
import { useEngineStore, selectIsGlobalInteraction } from '../../../store/engineStore';
import { useAnimationStore } from '../../../store/animationStore';
import { PlayIcon, PauseIcon } from '../../../components/Icons';
import { Popover } from '../../../components/Popover';
import Slider from '../../../components/Slider';
import { topbar } from '../TopBar';

export const PauseControls: React.FC = () => {
    const isPaused       = useEngineStore((s) => s.isPaused);
    const sampleCap      = useEngineStore((s) => s.sampleCap);
    const accumCount     = useEngineStore((s) => s.accumulationCount);
    const setIsPaused    = useEngineStore((s) => s.setIsPaused);
    const setSampleCap   = useEngineStore((s) => s.setSampleCap);

    const isGlobalInteraction = useEngineStore(selectIsGlobalInteraction);
    const isCameraInteracting = useAnimationStore((s) => s.isCameraInteracting);
    const isScrubbing         = useAnimationStore((s) => s.isScrubbing);
    const isEffectivePaused   = isPaused && !isCameraInteracting && !isGlobalInteraction && !isScrubbing;

    const progress = sampleCap > 0 ? Math.min(1, accumCount / sampleCap) : 0;
    const isDone   = sampleCap > 0 && accumCount >= sampleCap;

    const [showMenu, setShowMenu] = useState(false);
    const hoverTimeout = useRef<number | null>(null);
    const handleMouseEnter = () => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); setShowMenu(true); };
    const handleMouseLeave = () => { hoverTimeout.current = window.setTimeout(() => setShowMenu(false), 150); };

    let borderText: string;
    if (isEffectivePaused)  borderText = 'border-amber-500/40 text-amber-400';
    else if (isDone)        borderText = 'border-green-500/40 text-green-400';
    else                    borderText = 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20';

    const fillColor = isDone ? 'bg-green-500/20' : isEffectivePaused ? 'bg-amber-500/20' : 'bg-cyan-500/15';

    return (
        <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <button
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? 'Resume Rendering' : isDone ? `Done — ${accumCount} samples` : 'Pause Rendering'}
                className={`relative overflow-hidden p-0.5 rounded border transition-colors ${borderText}`}
            >
                {/* Progress fill — grows left→right as frames accumulate */}
                {progress > 0 && (
                    <span
                        className={`absolute inset-0 ${fillColor}`}
                        style={{ width: `${progress * 100}%` }}
                    />
                )}
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

// ── Install ─────────────────────────────────────────────────────────────

let _installed = false;

/**
 * Register the pause button as a topbar right-slot item. Idempotent.
 * Default order puts it just left of the FPS counter (order=-10) —
 * override with the `order` option if a different layout is needed.
 */
export const installPauseControls = (options: { order?: number } = {}): void => {
    if (_installed) return;
    _installed = true;
    topbar.register({
        id: 'pause-controls',
        slot: 'right',
        order: options.order ?? -20,
        component: PauseControls,
    });
};
