/**
 * WorkerDisplay — Canvas that auto-presents frames rendered by the worker.
 *
 * After transferControlToOffscreen(), the browser automatically displays whatever
 * the worker renders to the OffscreenCanvas — no bitmap transfer needed.
 * This avoids the glFinish() forced by transferToImageBitmap, preserving
 * GPU/CPU pipelining for full frame rate.
 *
 * Sits behind the R3F Canvas (which handles gizmos/overlays with alpha).
 */

import React, { useRef, useEffect } from 'react';
import { getProxy } from '../engine/worker/WorkerProxy';
import { getShaderConfigFromState } from '../store/fractalStore';
import { useFractalStore } from '../store/fractalStore';

interface WorkerDisplayProps {
    width: number;
    height: number;
}

export const WorkerDisplay: React.FC<WorkerDisplayProps> = ({ width, height }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const initRef = useRef(false);

    // Register crash handler
    useEffect(() => {
        const proxy = getProxy();
        proxy.onCrash = (reason: string) => {
            console.error(`[WorkerDisplay] Worker crashed: ${reason}.`);
        };
        return () => { proxy.onCrash = null; };
    }, []);

    // One-time worker initialization (guarded so StrictMode doesn't create two workers)
    useEffect(() => {
        if (initRef.current || !containerRef.current) return;
        initRef.current = true;

        const dpr = window.devicePixelRatio || 1;

        // Create the canvas and insert it into the DOM BEFORE transferring control.
        // After transferControlToOffscreen(), the browser auto-presents whatever
        // the worker renders — no transferToImageBitmap needed.
        const canvas = document.createElement('canvas');
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
        containerRef.current.appendChild(canvas);

        const state = useFractalStore.getState();
        const config = getShaderConfigFromState(state);
        const isMobile = window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768;

        const proxy = getProxy();
        // Camera is always at origin; world position is in sceneOffset (sent below).
        const camRot = state.cameraRot || { x: 0, y: 0, z: 0, w: 1 };
        const camFov = (state as any).optics?.camFov ?? 60;
        proxy.initWorkerMode(
            canvas,
            config,
            width,
            height,
            dpr,
            isMobile,
            { position: [0, 0, 0], quaternion: [camRot.x, camRot.y, camRot.z, camRot.w], fov: camFov }
        );

        // Send initial offset so the worker starts at the correct position
        const offset = state.sceneOffset;
        if (offset) {
            const precise = {
                x: offset.x, y: offset.y, z: offset.z,
                xL: offset.xL ?? 0, yL: offset.yL ?? 0, zL: offset.zL ?? 0
            };
            proxy.setShadowOffset(precise);
            proxy.post({ type: 'OFFSET_SET', offset: precise });
        }

    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
            }}
        />
    );
};
