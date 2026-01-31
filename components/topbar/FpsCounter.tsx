
import React, { useEffect, useRef } from 'react';
import { useFractalStore, selectIsGlobalInteraction } from '../../store/fractalStore';
import { useAnimationStore } from '../../store/animationStore';

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
        let frameCount = 0;
        let lastTime = performance.now();
        let rafId = 0;

        const loop = () => {
            const now = performance.now();
            frameCount++;
            if (now - lastTime >= 1000) {
                if (ref.current) {
                    ref.current.innerText = `${frameCount} FPS`;
                }
                frameCount = 0;
                lastTime = now;
            }
            rafId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(rafId);
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
