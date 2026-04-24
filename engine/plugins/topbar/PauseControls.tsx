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
    const isPaused  = useEngineStore((s) => s.isPaused);
    const sampleCap = useEngineStore((s) => s.sampleCap);
    const setIsPaused  = useEngineStore((s) => s.setIsPaused);
    const setSampleCap = useEngineStore((s) => s.setSampleCap);

    // "Effectively paused" — paused AND nothing else is driving the view.
    // Camera drags and timeline scrubbing implicitly unpause because they
    // need the render loop to show their effect.
    const isGlobalInteraction = useEngineStore(selectIsGlobalInteraction);
    const isCameraInteracting = useAnimationStore((s) => s.isCameraInteracting);
    const isScrubbing         = useAnimationStore((s) => s.isScrubbing);
    const isEffectivePaused   = isPaused && !isCameraInteracting && !isGlobalInteraction && !isScrubbing;

    const [showPauseMenu, setShowPauseMenu] = useState(false);
    const pauseMenuRef = useRef<HTMLDivElement>(null);
    const hoverTimeout = useRef<number | null>(null);

    const handleMouseEnter = () => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setShowPauseMenu(true);
    };
    const handleMouseLeave = () => {
        hoverTimeout.current = window.setTimeout(() => setShowPauseMenu(false), 150);
    };

    return (
        <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            ref={pauseMenuRef}
        >
            <button
                onClick={() => setIsPaused(!isPaused)}
                className={`p-0.5 rounded transition-colors ${
                    isEffectivePaused
                        ? 'text-amber-400 bg-amber-900/30 border border-amber-500/30'
                        : 'text-gray-600 hover:text-gray-400'
                }`}
                title={isPaused ? 'Resume Rendering' : 'Pause Rendering (Battery Saver)'}
            >
                {isEffectivePaused ? <PlayIcon /> : <PauseIcon />}
            </button>

            {showPauseMenu && (
                <Popover width="w-40">
                    <div className="mb-1">
                        <Slider
                            label="Auto-Stop (Samples)"
                            value={sampleCap}
                            min={0} max={4096} step={32}
                            onChange={setSampleCap}
                            overrideInputText={sampleCap === 0 ? 'Infinite' : sampleCap.toFixed(0)}
                        />
                        <div className="text-[8px] text-gray-500 text-center mt-1">
                            0 = Never Stop
                        </div>
                    </div>
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
