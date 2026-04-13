
import React, { useEffect, useRef } from 'react';
import { useFractalStore, selectIsGlobalInteraction } from '../../store/fractalStore';
import { useAnimationStore } from '../../store/animationStore';
import { getProxy } from '../../engine/worker/WorkerProxy';

// Global refs to track FPS across ticks
const fpsState = {
    frameCount: 0,
    lastTime: performance.now(),
    ref: null as HTMLSpanElement | null,
    workerFrameCount: 0,  // Counts actual worker frames received
};

// Register frame counter with WorkerProxy
getProxy().registerFrameCounter(() => { fpsState.workerFrameCount++; });

// Export tick function for orchestrated updates
export const tick = () => {
    const now = performance.now();
    fpsState.frameCount++;

    if (now - fpsState.lastTime >= 1000) {
        if (fpsState.ref) {
            fpsState.ref.innerText = `${fpsState.workerFrameCount} FPS`;
        }
        fpsState.frameCount = 0;
        fpsState.workerFrameCount = 0;
        fpsState.lastTime = now;
    }
};

const FpsCounter = () => {
    // We check effective pause state to show active color during interaction
    const isPaused = useFractalStore(s => s.isPaused);
    const isGlobalInteraction = useFractalStore(selectIsGlobalInteraction);
    const isCameraInteracting = useAnimationStore(s => s.isCameraInteracting);
    const isScrubbing = useAnimationStore(s => s.isScrubbing);
    
    // Effectively paused if paused AND not doing anything
    // Note: isGizmoDragging is implicitly covered by isGlobalInteraction via isUserInteracting
    const isEffectivePaused = isPaused && !isGlobalInteraction && !isCameraInteracting && !isScrubbing;

    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        fpsState.ref = ref.current;
        return () => {
            if (fpsState.ref === ref.current) {
                fpsState.ref = null;
            }
        };
    }, []);

    return (
        <span 
            ref={ref} 
            className={`text-[10px] font-mono w-12 text-right transition-colors duration-300 ${
                isEffectivePaused ? 'text-gray-600' : 'text-cyan-500/80'
            }`}
            title={isPaused ? "Rendering Paused (Battery Saver)" : "Frames Per Second"}
        >
            -- FPS
        </span>
    );
};

export default FpsCounter;
