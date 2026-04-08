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

        const container = containerRef.current;

        // ── OffscreenCanvas support check ────────────────────────────────
        if (typeof HTMLCanvasElement.prototype.transferControlToOffscreen !== 'function') {
            const msg = document.createElement('div');
            msg.style.cssText =
                'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
                'background:#1a1a2e;color:#e0e0e0;font:16px/1.5 system-ui,sans-serif;padding:2rem;text-align:center';
            msg.innerHTML =
                '<div><h2 style="color:#ff6b6b;margin:0 0 .5rem">Browser Not Supported</h2>' +
                '<p>GMT requires <b>OffscreenCanvas</b> support.<br>' +
                'Please use a recent version of Chrome, Edge, or Firefox.</p></div>';
            container.appendChild(msg);
            return;
        }

        const dpr = window.devicePixelRatio || 1;

        // Measure the actual container size — the props may reflect a stale layout
        // (e.g. before dock panels finish CSS transitions). Fall back to props if
        // the container hasn't been laid out yet.
        const rect = container.getBoundingClientRect();
        const initW = rect.width > 0 ? rect.width : width;
        const initH = rect.height > 0 ? rect.height : height;

        // Create the canvas and insert it into the DOM BEFORE transferring control.
        // After transferControlToOffscreen() the browser auto-presents whatever
        // the worker renders — no transferToImageBitmap needed.
        const canvas = document.createElement('canvas');
        canvas.width = initW * dpr;
        canvas.height = initH * dpr;
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
        container.appendChild(canvas);

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
            initW,
            initH,
            dpr,
            isMobile,
            { position: [0, 0, 0], quaternion: [camRot.x, camRot.y, camRot.z, camRot.w], fov: camFov }
        );

        // Set initial canvas pixel size for UI estimates
        state.setCanvasPixelSize(Math.floor(initW * dpr), Math.floor(initH * dpr));

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

        // Watch container for post-init layout shifts (dock transitions, panel
        // opening, etc.) and push the corrected size to the worker so the very
        // first rendered frame has the right aspect ratio.
        const observer = new ResizeObserver(entries => {
            // Skip resize while bucket rendering to prevent corrupting the tiled render
            if (useFractalStore.getState().isBucketRendering) return;
            for (const entry of entries) {
                const w = Math.max(1, entry.contentRect.width);
                const h = Math.max(1, entry.contentRect.height);
                const currentDpr = window.devicePixelRatio || 1;
                proxy.resizeWorker(w, h, currentDpr);
                // Track actual physical pixel size in store for UI estimates
                useFractalStore.getState().setCanvasPixelSize(
                    Math.floor(w * currentDpr),
                    Math.floor(h * currentDpr)
                );
            }
        });
        observer.observe(container);

        // Cleanup — the canvas lives for the app lifetime so we only disconnect
        // the observer.
        return () => observer.disconnect();
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
