/**
 * <GmtRendererCanvas /> — direct port of GMT's `WorkerDisplay.tsx`.
 *
 * Physical canvas that the worker renders INTO via OffscreenCanvas auto-
 * presentation. Sits behind any R3F overlay (gizmos, drawing) so the
 * worker's composited output shows through. React never reads from the
 * canvas — the browser blits worker frames directly.
 *
 * Mount contract:
 *   - Place as a sibling (NOT a child) of the R3F <Canvas>.
 *   - Size via CSS `absolute inset:0 w:100% h:100%`.
 *   - Exactly one instance per page; StrictMode double-mount guarded.
 *
 * Lifecycle:
 *   - First mount: create <canvas>, transferControlToOffscreen, call
 *     `proxy.initWorkerMode(...)`. Worker boots on next tick.
 *   - On container resize: forward new size to worker via `resizeWorker`.
 *   - Cleanup: disconnect ResizeObserver. The worker persists for app
 *     lifetime (transferControlToOffscreen is one-shot, so tear-down
 *     would require proxy.restart() with a fresh canvas).
 *
 * See `docs/01_System_Architecture.md §4` in GMT for the auto-present
 * rationale — no transferToImageBitmap, no glFinish stall.
 */

import React, { useRef, useEffect } from 'react';
import { getProxy } from '../engine/worker/WorkerProxy';
import { getShaderConfigFromState, useEngineStore } from '../../store/engineStore';

interface GmtRendererCanvasProps {
    width: number;
    height: number;
}

export const GmtRendererCanvas: React.FC<GmtRendererCanvasProps> = ({ width, height }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const initRef = useRef(false);

    // Crash handler — install here so it covers the whole canvas lifetime.
    useEffect(() => {
        const proxy = getProxy();
        const prev = (proxy as any)._onCrash;
        proxy.onCrash = (reason: string) => {
            console.error(`[GmtRendererCanvas] Worker crashed: ${reason}.`);
        };
        return () => { proxy.onCrash = prev ?? null; };
    }, []);

    // One-time worker init — guarded so React StrictMode doesn't double-create.
    useEffect(() => {
        if (initRef.current || !containerRef.current) return;
        initRef.current = true;

        const container = containerRef.current;

        // OffscreenCanvas support check. Mobile Safari < 16.4 and older
        // Firefoxes lack it — show a blocking message rather than a black
        // canvas with no explanation.
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

        // Measure actual container size — props may reflect stale layout
        // (e.g. before dock panels finish CSS transitions). Fall back to
        // props if not laid out yet.
        const rect = container.getBoundingClientRect();
        const initW = rect.width > 0 ? rect.width : width;
        const initH = rect.height > 0 ? rect.height : height;

        // Create the DOM canvas and insert it BEFORE transferring control.
        // After transferControlToOffscreen the browser auto-presents
        // worker-rendered frames — no transferToImageBitmap needed.
        const canvas = document.createElement('canvas');
        canvas.width = initW * dpr;
        canvas.height = initH * dpr;
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
        container.appendChild(canvas);

        const state = useEngineStore.getState();
        // Cast: the shared getShaderConfigFromState returns the engine's
        // generic ShaderConfig shape (renderMode: string). GMT's worker
        // expects its own narrower ShaderConfig. Structurally compatible —
        // the registry iteration over GMT features produces the right
        // fields; only the type declarations diverge.
        const config = getShaderConfigFromState(state) as any;
        const isMobile = window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768;

        const proxy = getProxy();
        // Camera is always at origin; world position is in sceneOffset
        // (pushed separately right after bootWithConfig).
        const camRot = state.cameraRot || { x: 0, y: 0, z: 0, w: 1 };
        const camFov = (state as any).optics?.camFov ?? 60;
        proxy.initWorkerMode(
            canvas,
            config,
            initW,
            initH,
            dpr,
            isMobile,
            { position: [0, 0, 0], quaternion: [camRot.x, camRot.y, camRot.z, camRot.w], fov: camFov },
        );

        // Watch container for post-init layout shifts (dock transitions,
        // panel toggles, etc.) and push size to worker. Authoritative
        // `canvasPixelSize` in the store is driven by the viewport plugin's
        // ResizeObserver — this component only owns the worker's view.
        const observer = new ResizeObserver((entries) => {
            if ((useEngineStore.getState() as any).isBucketRendering) return;
            for (const entry of entries) {
                const w = Math.max(1, entry.contentRect.width);
                const h = Math.max(1, entry.contentRect.height);
                const currentDpr = window.devicePixelRatio || 1;
                proxy.resizeWorker(w, h, currentDpr);
            }
        });
        observer.observe(container);

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
                pointerEvents: 'none',
            }}
        />
    );
};
