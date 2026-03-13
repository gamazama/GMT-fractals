
import React, { useEffect, useRef } from 'react';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();

interface HistogramProbeProps {
    onUpdate: (data: Float32Array) => void;
    autoUpdate: boolean;
    trigger: number;
    source: 'geometry' | 'color';
}

const HistogramProbe: React.FC<HistogramProbeProps> = ({
    onUpdate, autoUpdate, trigger, source
}) => {
    const prevTrigger = useRef(trigger);

    useEffect(() => {
        let frameId = 0;
        let frameCount = 0;

        const loop = () => {
            const triggerChanged = trigger !== prevTrigger.current;
            if (triggerChanged) prevTrigger.current = trigger;

            frameCount++;
            const shouldRender = (autoUpdate && frameCount % 60 === 0) || triggerChanged;

            if (shouldRender) {
                engine.requestHistogramReadback(source).then(data => {
                    if (data.length > 0) onUpdate(data);
                });
            }

            frameId = requestAnimationFrame(loop);
        };

        loop();
        return () => cancelAnimationFrame(frameId);
    }, [autoUpdate, trigger, source, onUpdate]);

    return null;
};

export default HistogramProbe;
