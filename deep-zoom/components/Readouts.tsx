/**
 * deep-zoom/components/Readouts.tsx - two one-line readouts of what the renderer is doing now.
 *
 *   `dz-iteration-readout`  the live iteration count beside the Iterations slider. With auto
 *                           iterations on, the slider is the floor and the renderer raises the
 *                           count with depth; this is the number actually in use.
 *   `dz-frame-readout`      the size the renderer is drawing at, against the long edge asked for
 *                           (the deep path caps the size it draws).
 *
 * Both read the telemetry store (8 samples a second), one primitive per selector, and show
 * nothing before the first sample. Registered in registerFeatures.ts; panels.ts places them.
 */
import React from 'react';
import { useEngineStore } from '../../store/engineStore';
import { useDzTelemetry } from '../host/telemetry';

const ROW = 'flex items-center justify-between px-3 py-1 text-[10px] text-fg-tertiary';
const VALUE = 'font-mono tabular-nums text-fg-secondary';

export const IterationReadout: React.FC = () => {
    const live = useDzTelemetry((t) => t.live);
    const iters = useDzTelemetry((t) => t.iters);
    const auto = useEngineStore((s) => s.dzFormula?.autoIterations);
    if (!live) return null;
    return (
        <div data-dz-iteration-readout className={ROW}>
            <span>In use now{auto ? ' (auto)' : ''}</span>
            <span className={VALUE}>{iters}</span>
        </div>
    );
};

export const FrameReadout: React.FC = () => {
    const live = useDzTelemetry((t) => t.live);
    const w = useDzTelemetry((t) => t.frameW);
    const h = useDzTelemetry((t) => t.frameH);
    const asked = useEngineStore((s) => s.dzQuality?.frameSize);
    if (!live) return null;
    return (
        <div data-dz-frame-readout className={ROW}>
            <span>Drawn</span>
            <span className={VALUE}>{w} x {h}{asked ? ` of ${asked} asked` : ''}</span>
        </div>
    );
};
