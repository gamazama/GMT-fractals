/**
 * HistogramProbe — drives histogram readbacks from the worker into the
 * store's `histogramData` / `sceneHistogramData`. Ported verbatim from
 * `h:/GMT/gmt-0.8.5/components/HistogramProbe.tsx` with the import path
 * rewritten to engine-gmt's WorkerProxy.
 *
 * Renders no DOM. Lives in the React tree so it can subscribe via hooks
 * and cancel its RAF loop on unmount.
 *
 * Typically mounted as two instances: `source='geometry'` for the
 * ColoringHistogram (drives main colour-map), `source='color'` for the
 * Scene panel's color-grading histogram.
 */

import React, { useEffect, useRef } from 'react';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();

interface HistogramProbeProps {
    onUpdate: (data: Float32Array) => void;
    onLoadingChange?: (loading: boolean) => void;
    autoUpdate: boolean;
    trigger: number;
    source: 'geometry' | 'color';
}

const HistogramProbe: React.FC<HistogramProbeProps> = ({
    onUpdate, onLoadingChange, autoUpdate, trigger, source,
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
                onLoadingChange?.(true);
                engine.requestHistogramReadback(source).then((data) => {
                    if (data.length > 0) onUpdate(data);
                    onLoadingChange?.(false);
                });
            }

            frameId = requestAnimationFrame(loop);
        };

        loop();
        return () => cancelAnimationFrame(frameId);
    }, [autoUpdate, trigger, source, onUpdate, onLoadingChange]);

    return null;
};

export default HistogramProbe;
