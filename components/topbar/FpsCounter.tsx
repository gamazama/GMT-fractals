
import React, { useEffect, useRef } from 'react';
import { useFractalStore, selectIsGlobalInteraction } from '../../store/fractalStore';
import { useAnimationStore } from '../../store/animationStore';

// Global refs to track FPS across ticks
const fpsState = {
    frameCount: 0,
    lastTime: performance.now(),
    ref: null as HTMLSpanElement | null
};

// Export tick function for orchestrated updates
export const tick = () => {
    const now = performance.now();
    fpsState.frameCount++;
    
    if (now - fpsState.lastTime >= 1000) {
        if (fpsState.ref) {
            fpsState.ref.innerText = `${fpsState.frameCount} FPS`;
        }
        fpsState.frameCount = 0;
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
