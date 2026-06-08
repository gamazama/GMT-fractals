/**
 * GradientLandingLayer — the reverse of the drag avatar's take-off morph. When a gradient is
 * APPLIED to a target (drop or click), a fading copy of it flies from where it was (the
 * avatar's last spot near the cursor) INTO the destination's rect, so the placement reads as
 * the gradient settling into the slot rather than just vanishing.
 *
 * Decoupled from GradientDropLayer (which unmounts the moment the drag ends) via the
 * `dragVisual` landing transient — this layer is always mounted and renders nothing until a
 * landing fires. Mounted once in GradientExplorerApp.
 *
 * @see palette/store/dragVisual.ts (triggerLanding / useLanding) · GradientDropLayer.tsx
 */

import React, { useEffect, useReducer, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanding, clearLanding, type Landing } from '../palette/store/dragVisual';

const LANDING_MS = 240;
// Matches the drag avatar's z (above the Picker hover preview) for a seamless hand-off.
const LANDING_Z = 9600;

const LandingAvatar: React.FC<{ landing: Landing }> = ({ landing }) => {
    const { from, to, ramp, id } = landing;
    const ref = useRef<HTMLCanvasElement>(null);
    const start = useRef(performance.now());
    const [, force] = useReducer((n: number) => n + 1, 0);

    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        cv.width = 256;
        cv.height = 1;
        cv.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(ramp), 256, 1), 0, 0);
    }, [ramp]);

    useEffect(() => {
        let raf = 0;
        const loop = (): void => {
            if (performance.now() - start.current >= LANDING_MS) {
                clearLanding(id);
                return;
            }
            force();
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [id]);

    const t = Math.min(1, (performance.now() - start.current) / LANDING_MS);
    const e = 1 - (1 - t) * (1 - t); // ease-out
    const lerp = (a: number, b: number): number => a + (b - a) * e;
    return createPortal(
        <div
            className="fixed pointer-events-none overflow-hidden rounded-md border border-white/20"
            style={{
                left: lerp(from.left, to.left),
                top: lerp(from.top, to.top),
                width: lerp(from.width, to.width),
                height: lerp(from.height, to.height),
                opacity: 1 - e,
                zIndex: LANDING_Z,
                boxShadow: '0 6px 18px -6px rgba(0,0,0,0.5)',
                background: '#0a0a0b',
            }}
        >
            <canvas ref={ref} className="block h-full w-full" />
        </div>,
        document.body,
    );
};

export const GradientLandingLayer: React.FC = () => {
    const landing = useLanding();
    // key by id so each landing remounts the animation from t=0.
    return landing ? <LandingAvatar key={landing.id} landing={landing} /> : null;
};

export default GradientLandingLayer;
