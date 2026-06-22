/**
 * IterationReadout — the "what iteration count is actually active right now"
 * line for the View panel's Iterations section.
 *
 * fluid-toy has several iteration knobs (auto on/off, the Iteration × multiplier,
 * the manual cap, the deep-zoom caps) and which one is live depends on mode —
 * historically there was no way to see the resolved number, so every knob felt
 * like it "did nothing". This mirrors FluidEngine.effectiveMaxIter via the shared
 * iterationPolicy (same source of truth the renderer uses) and shows the result,
 * so the active control is never a mystery.
 *
 * Display-pass count only (what you see). The fluid force/motion pass normalises
 * by julia.maxIter separately — out of scope for this readout.
 */

import React from 'react';
import { useSlice } from '../../engine/typedSlices';
import { autoShallowIter, deepBuildIter } from '../../engine/fractal/iterationPolicy';

export const IterationReadout: React.FC = () => {
    const julia = useSlice('julia');
    const deep = useSlice('deepZoom');

    const zoom = julia.zoom ?? 1.4;
    const mul = deep.iterMul ?? 1;
    const auto = deep.autoIter !== false;
    const deepOn = !!deep.enabled;

    let count: number;
    let mode: string;
    let approx = false;
    if (auto) {
        approx = true;
        count = deepOn ? deepBuildIter(zoom, mul) : autoShallowIter(zoom, mul);
        mode = deepOn ? 'auto · deep' : 'auto';
    } else {
        count = deepOn ? (deep.deepMaxIter ?? 2000) : (julia.maxIter ?? 310);
        mode = deepOn ? 'manual · deep' : 'manual';
    }

    return (
        <div className="flex items-baseline justify-between px-3 py-1 text-[11px]">
            <span className="text-fg-tertiary">Active iterations</span>
            <span className="font-mono text-fg">
                {approx ? '≈' : ''}{count.toLocaleString()}
                <span className="ml-1.5 text-fg-ghost">{mode}</span>
            </span>
        </div>
    );
};

export default IterationReadout;
