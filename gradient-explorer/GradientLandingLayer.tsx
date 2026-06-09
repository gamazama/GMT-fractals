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

import React, { useEffect, useReducer, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useLanding, clearLanding, useCancel, clearCancel, type Landing, type Cancel } from '../palette/store/dragVisual';
import { paintRampToCanvas } from '../palette/core/rampCanvas';

const LANDING_MS = 240;
// Matches the drag avatar's z (above the Picker hover preview) for a seamless hand-off.
const LANDING_Z = 9600;
// The cancel wipe runs longer than a land — a deliberate, heavily-eased dismissal.
const CANCEL_MS = 340;

/**
 * useRampOneShot — the shared mechanics for both one-shot avatars (land + cancel): paint the
 * ramp into a 256×1 canvas, then drive a rAF clock that re-renders each frame and calls
 * `onDone` once `durationMs` elapses. Returns the canvas ref + the raw 0..1 progress `t`; each
 * avatar applies its own easing/styling to `t`. The avatars are keyed by id at the parent, so
 * each fires fresh on mount.
 */
const useRampOneShot = (
    ramp: Uint8Array,
    durationMs: number,
    onDone: () => void,
): { ref: RefObject<HTMLCanvasElement>; t: number } => {
    const ref = useRef<HTMLCanvasElement>(null);
    const start = useRef(performance.now());
    const [, force] = useReducer((n: number) => n + 1, 0);

    useEffect(() => {
        if (ref.current) paintRampToCanvas(ref.current, ramp);
    }, [ramp]);

    useEffect(() => {
        let raf = 0;
        const loop = (): void => {
            if (performance.now() - start.current >= durationMs) {
                onDone();
                return;
            }
            force();
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
        // onDone is a fresh closure each render but always clears THIS instance's id (the
        // parent keys by id), so capturing the mount closure is correct; re-run only on duration.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [durationMs]);

    return { ref, t: Math.min(1, (performance.now() - start.current) / durationMs) };
};

const LandingAvatar: React.FC<{ landing: Landing }> = ({ landing }) => {
    const { from, to, ramp, id } = landing;
    const { ref, t } = useRampOneShot(ramp, LANDING_MS, () => clearLanding(id));
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

/**
 * CancelAvatar — the un-landing. An abandoned in-hand pick wipes off IN PLACE from where it
 * floated: the alpha mask eats the ramp left→right (`linear-gradient(to right, transparent
 * t%, black t%)`) while the whole box shrinks on X toward its right edge — both removing the
 * gradient in the same left→right direction so it reads as one swept-away gesture.
 */
const CancelAvatar: React.FC<{ cancel: Cancel }> = ({ cancel }) => {
    const { at, ramp, id } = cancel;
    const { ref, t } = useRampOneShot(ramp, CANCEL_MS, () => clearCancel(id));
    // Heavy ease-in-out (cubic): the wipe builds, sweeps, then settles into nothing.
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const wipe = (e * 100).toFixed(2);
    // transparent left of the front, opaque right of it → the ramp is erased left→right.
    const mask = `linear-gradient(to right, transparent ${wipe}%, #000 ${wipe}%)`;
    return createPortal(
        <div
            className="fixed pointer-events-none overflow-hidden rounded-md border border-white/15"
            style={{
                left: at.left,
                top: at.top,
                width: at.width,
                height: at.height,
                // Collapse toward the right edge so the shrink runs WITH the left→right wipe.
                transform: `scaleX(${1 - e})`,
                transformOrigin: 'right center',
                WebkitMaskImage: mask,
                maskImage: mask,
                opacity: 1 - e * e, // fade a touch faster toward the tail
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
    const cancel = useCancel();
    // key by id so each one-shot remounts the animation from t=0. Landing + cancel are
    // mutually exclusive in the store, so at most one renders at a time.
    return (
        <>
            {landing && <LandingAvatar key={`land:${landing.id}`} landing={landing} />}
            {cancel && <CancelAvatar key={`cancel:${cancel.id}`} cancel={cancel} />}
        </>
    );
};

export default GradientLandingLayer;
