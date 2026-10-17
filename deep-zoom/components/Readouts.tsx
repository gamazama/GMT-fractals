/**
 * deep-zoom/components/Readouts.tsx - two live readings, each on the row it belongs to.
 *
 *   `dz-iteration-readout`  "in use 70" after the Iterations row's label: the count the renderer
 *                           draws with now. With auto iterations on, the slider is the floor and
 *                           the renderer raises the count with depth.
 *   `dz-frame-readout`      "drawn 624 x 640" after the Frame size row's label: the size the
 *                           renderer draws at (the deep path caps the size asked).
 *
 * Each is a label suffix (`labelSuffixes` on the feature item in panels.ts), not a row of its own
 * (STREAMLINE.md, stage 5). Both read the telemetry store (8 samples a second), one primitive per
 * selector, and show nothing before the first sample. Registered in registerFeatures.ts.
 */
import React from 'react';
import { useDzTelemetry } from '../host/telemetry';

const READING = 'font-normal tabular-nums text-fg-faint';

export const IterationReadout: React.FC = () => {
    const live = useDzTelemetry((t) => t.live);
    const iters = useDzTelemetry((t) => t.iters);
    if (!live) return null;
    return <span data-dz-iteration-readout className={READING} title="The count the picture is drawn with now">· in use {iters}</span>;
};

export const FrameReadout: React.FC = () => {
    const live = useDzTelemetry((t) => t.live);
    const size = useDzTelemetry((t) => `${t.frameW} x ${t.frameH}`);
    if (!live) return null;
    return <span data-dz-frame-readout className={READING} title="The size the picture is drawn at: the size asked, capped to the view and as the zoom deepens">drawn {size}</span>;
};
