/**
 * WorkerTickScene — R3F component that drives the render worker via useFrame.
 *
 * Posts RENDER_TICK messages to the render worker with camera data.
 * Main-thread ticks run via the TickRegistry (see engine/TickRegistry.ts).
 *
 * Frame execution order (R3F useFrame priorities):
 *   Priority 0: Navigation.tsx — camera physics (Orbit/Fly controls)
 *   Priority 1: This component — tick registry + worker dispatch
 *
 * Tick registry phases (see TickRegistry.ts):
 *   SNAPSHOT → ANIMATE → OVERLAY → UI → [DISPATCH inline]
 */

import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { getProxy } from '../engine/worker/WorkerProxy';
import { useFractalStore } from '../store/fractalStore';
import { useAnimationStore } from '../store/animationStore';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import type { SerializedCamera, SerializedOffset } from '../engine/worker/WorkerProtocol';
import { setViewportCamera, setViewportCanvas, snapshotDisplayCamera, getViewportCamera } from '../engine/worker/ViewportRefs';
import { registerTick, runTicks, TICK_PHASE } from '../engine/TickRegistry';

// Tick implementations
import { tick as animationTick } from './AnimationSystem';
import { tick as lightGizmoTick } from '../features/lighting/LightGizmo';
import { tick as fpsCounterTick } from './topbar/FpsCounter';
import { tick as performanceMonitorTick } from './PerformanceMonitor';
import { tick as trackRowTick } from './timeline/TrackRow';

// ── Tick Registration ────────────────────────────────────────────────
// Phase order: SNAPSHOT → ANIMATE → OVERLAY → UI
// DISPATCH (sendRenderTick) stays inline — needs R3F camera serialization.

registerTick('snapshotDisplayCamera', TICK_PHASE.SNAPSHOT, () => {
    const cam = getViewportCamera();
    if (cam) snapshotDisplayCamera(cam);
});

registerTick('animationTick',        TICK_PHASE.ANIMATE, animationTick);
registerTick('lightGizmoTick',       TICK_PHASE.OVERLAY, lightGizmoTick);
registerTick('fpsCounterTick',       TICK_PHASE.UI,      fpsCounterTick);
registerTick('performanceMonitorTick', TICK_PHASE.UI,    performanceMonitorTick);
registerTick('trackRowTick',         TICK_PHASE.UI,      trackRowTick);

// ── Component ────────────────────────────────────────────────────────

interface WorkerTickSceneProps {
    onLoaded?: () => void;
}

const WorkerTickScene: React.FC<WorkerTickSceneProps> = ({ onLoaded }) => {
    const { camera, size, gl } = useThree();
    const [isReady, setIsReady] = useState(false);
    const proxy = getProxy();
    const dpr = useFractalStore(s => s.dpr);

    // Register R3F camera and canvas for DOM overlays (light gizmos, etc.)
    useEffect(() => {
        setViewportCamera(camera);
        setViewportCanvas(gl.domElement);
    }, [camera, gl]);

    // Wait for worker to boot and compile
    useEffect(() => {
        let isMounted = true;

        const checkReady = async () => {
            // Wait for worker to be booted (max 30s)
            let attempts = 0;
            while (!proxy.isBooted) {
                if (!isMounted) return;
                if (++attempts >= 300) {
                    console.error('[WorkerTickScene] Worker boot timeout after 30s');
                    return;
                }
                await new Promise(r => setTimeout(r, 100));
            }
            // Wait for compilation
            while (proxy.isCompiling) {
                if (!isMounted) return;
                await new Promise(r => setTimeout(r, 100));
            }

            if (isMounted) {
                // Re-push current viewport size after boot+compile to ensure correct
                // dimensions. The initial RESIZE may have used stale values if it arrived
                // before the engine existed or before layout was finalized.
                proxy.resizeWorker(size.width, size.height, dpr);
                setIsReady(true);
                if (onLoaded) onLoaded();
            }
        };

        checkReady();
        return () => { isMounted = false; };
    }, []);

    // Handle resize (reacts to viewport size AND internal scale / DPR changes)
    useEffect(() => {
        proxy.resizeWorker(size.width, size.height, dpr);
    }, [size.width, size.height, dpr]);

    // Bridge FractalEvents → worker
    useEffect(() => {
        const unsubs = [
            FractalEvents.on(FRACTAL_EVENTS.CONFIG, (config) => { proxy.sendConfig(config); }),
            FractalEvents.on(FRACTAL_EVENTS.UNIFORM, ({ key, value, noReset }) => { proxy.setUniform(key, value, noReset); }),
            FractalEvents.on(FRACTAL_EVENTS.RESET_ACCUM, () => { proxy.resetAccumulation(); }),
            FractalEvents.on(FRACTAL_EVENTS.OFFSET_SET, (v) => {
                const offset = { x: v.x, y: v.y, z: v.z, xL: v.xL ?? 0, yL: v.yL ?? 0, zL: v.zL ?? 0 };
                proxy.setShadowOffset(offset);
                proxy.post({ type: 'OFFSET_SET', offset });
            }),
            // OFFSET_SILENT removed — orbit absorb now uses atomic queueOffsetSync via RENDER_TICK
            FractalEvents.on(FRACTAL_EVENTS.OFFSET_SHIFT, ({ x, y, z }) => {
                proxy.applyOffsetShift(x, y, z);
                proxy.post({ type: 'OFFSET_SHIFT', x, y, z });
            }),
            FractalEvents.on(FRACTAL_EVENTS.CAMERA_SNAP, () => {
                proxy.shouldSnapCamera = true;
            }),
            FractalEvents.on(FRACTAL_EVENTS.TEXTURE, ({ textureType, dataUrl }) => {
                proxy.updateTexture(textureType, dataUrl);
            }),
            FractalEvents.on(FRACTAL_EVENTS.REGISTER_FORMULA, ({ id, shader }) => {
                proxy.registerFormula(id, shader);
            })
        ];

        return () => { unsubs.forEach(u => u()); };
    }, []);

    // ── Frame loop ───────────────────────────────────────────────────
    // Performance throttle: when FPS < 20, yield 1 frame/sec to let React render UI
    const throttleRef = React.useRef({ lastYield: 0, fps: 60, frames: 0, lastSample: 0 });

    useFrame((state, delta) => {
        if (!isReady) return;

        // Clamp delta to prevent large time jumps (e.g. tab switch, debugger pause)
        // from causing VirtualSpace smoothing drift that triggers accumulation resets.
        const clampedDelta = Math.min(delta, 0.1);

        // Track FPS and yield frames when struggling
        const now = performance.now();
        const t = throttleRef.current;
        t.frames++;
        if (now - t.lastSample >= 500) {
            t.fps = t.frames * 1000 / (now - t.lastSample);
            t.frames = 0;
            t.lastSample = now;
        }
        if (t.fps < 20 && now - t.lastYield >= 1000) {
            t.lastYield = now;
            runTicks(clampedDelta); // keep ticks alive (animation, UI counters)
            return; // skip worker dispatch this frame — yield to React
        }

        // Run all registered ticks: SNAPSHOT → ANIMATE → OVERLAY → UI
        runTicks(clampedDelta);

        // Sync R3F camera FOV with optics so raycaster/gizmo projections match rendered image
        const cam = camera as THREE.PerspectiveCamera;
        const storeFov = (useFractalStore.getState() as any).optics?.camFov ?? 60;
        if (cam.fov !== storeFov) {
            cam.fov = storeFov;
            cam.updateProjectionMatrix();
        }

        // DISPATCH — serialize camera + state and send to render worker
        const serializedCamera: SerializedCamera = {
            position: [cam.position.x, cam.position.y, cam.position.z],
            quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
            fov: cam.fov || 60,
            aspect: cam.aspect || (size.width / size.height)
        };

        const storeState = useFractalStore.getState();
        const offset = storeState.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
        const serializedOffset: SerializedOffset = {
            x: offset.x, y: offset.y, z: offset.z,
            xL: offset.xL ?? 0, yL: offset.yL ?? 0, zL: offset.zL ?? 0
        };

        const renderState = {
            cameraMode: storeState.cameraMode,
            isCameraInteracting: useAnimationStore.getState().isCameraInteracting,
            isGizmoInteracting: proxy.isGizmoInteracting,
            optics: (storeState as any).optics ?? null,
            lighting: (storeState as any).lighting ?? null,
            quality: (storeState as any).quality ?? null,
            geometry: (storeState as any).geometry ?? null,
        };

        proxy.sendRenderTick(serializedCamera, serializedOffset, clampedDelta, renderState);
    }, 1);

    return null;
};

export default WorkerTickScene;
