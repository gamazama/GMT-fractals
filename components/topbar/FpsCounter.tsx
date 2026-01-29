
import React, { useEffect, useRef } from 'react';

const FpsCounter = () => {
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

    return <span ref={ref} className="text-[10px] font-mono text-cyan-500/80 w-12 text-right">-- FPS</span>;
};

export default FpsCounter;
