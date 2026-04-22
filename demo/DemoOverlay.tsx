/**
 * DemoOverlay — viewport overlay that visualises the demo feature's state.
 *
 * Rendered by ViewportArea via the feature's `viewportConfig`. Reads its
 * slice state from the store and renders a positioned, coloured square.
 * Any interaction (sliders, color picker, save/load) updates the state,
 * which triggers a re-render here.
 */

import React from 'react';
import type { FeatureComponentProps } from '../components/registry/ComponentRegistry';
import type { DemoState } from './DemoFeature';

// createFeatureSlice sanitises color params into THREE.Color instances
// on `setDemo`, so the slice value may be either the initial string or a
// Color object. Normalise to a CSS hex for the overlay's background.
const toCssColor = (c: DemoState['color'] | any): string => {
    if (typeof c === 'string') return c;
    if (c && typeof c === 'object' && 'getHexString' in c) return `#${c.getHexString()}`;
    if (c && typeof c === 'object' && 'r' in c) {
        const to255 = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
        return `rgb(${to255(c.r)}, ${to255(c.g)}, ${to255(c.b)})`;
    }
    return '#888';
};

export const DemoOverlay: React.FC<FeatureComponentProps> = ({ sliceState }) => {
    const demo = sliceState as DemoState | undefined;
    if (!demo) return null;

    const size = demo.size;
    // position.x/y in [-1, 1] → percent offset from center
    const leftPct = 50 + demo.position.x * 40;
    const topPct = 50 - demo.position.y * 40;

    return (
        <div
            className="absolute pointer-events-none rounded-lg border border-white/10 shadow-2xl"
            style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: size,
                height: size,
                transform: 'translate(-50%, -50%)',
                background: toCssColor(demo.color),
                opacity: demo.opacity,
                transition: 'background 0.12s ease-out',
            }}
        />
    );
};
