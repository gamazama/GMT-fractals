/**
 * DemoOverlay — viewport overlay that visualises the demo feature's state.
 *
 * Reads each numeric param via `liveMod[target] ?? sliceState[param]` —
 * same pattern fluid-toy's syncJuliaToEngine uses. That makes the
 * square react to LFOs / audio rules / future modulation drivers
 * without DemoOverlay knowing they exist.
 *
 * Without this composition, an LFO from the Animation panel would
 * still be processed by the modulation tick (visible in the slider's
 * live-value indicator), but the square wouldn't move — it would
 * keep reading only the authored base values from the slice.
 */

import React from 'react';
import { useEngineStore } from '../store/engineStore';
import { useLiveModulations } from '../engine/typedSlices';
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
    // Subscribe to liveModulations so the overlay re-renders each tick
    // when a driver writes new values. The hook returns a stable empty
    // map when no mods exist — see engine/typedSlices.ts EMPTY_LIVE_MODS.
    const liveMod = useLiveModulations();
    // The DDFS demo slice is animatable but only color is excluded
    // (type: 'color' isn't in the modulatable set — see ParameterSelector
    // isModulatable()). Position uses the vec-axis convention
    // `demo.position_x` / `_y` that AnimationEngine's binders write.
    const liveOrBase = (target: string, base: number): number => {
        const v = liveMod[target];
        return typeof v === 'number' ? v : base;
    };
    if (!demo) return null;

    const size = liveOrBase('demo.size', demo.size);
    const opacity = liveOrBase('demo.opacity', demo.opacity);
    const posX = liveOrBase('demo.position_x', demo.position.x);
    const posY = liveOrBase('demo.position_y', demo.position.y);
    // position.x/y in [-1, 1] → percent offset from center
    const leftPct = 50 + posX * 40;
    const topPct = 50 - posY * 40;

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
                opacity,
                transition: 'background 0.12s ease-out',
            }}
        />
    );
};
