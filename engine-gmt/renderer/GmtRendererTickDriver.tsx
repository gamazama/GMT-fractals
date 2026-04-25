/**
 * <GmtRendererTickDriver /> — direct port of GMT's `WorkerTickScene.tsx`.
 *
 * R3F component that drives the render worker via useFrame. Mounts INSIDE
 * the app's <Canvas> (from @react-three/fiber) and sends RENDER_TICK every
 * frame with camera + scene-offset + renderState.
 *
 * Phase ordering each frame:
 *   Priority 0: App's navigation / camera physics
 *   Priority 1: This driver — runs TickRegistry phases, then dispatches
 *
 * TickRegistry phases (runs in order each frame):
 *   SNAPSHOT → ANIMATE → OVERLAY → UI → [DISPATCH RENDER_TICK inline]
 *
 * NOTE: Phase C shell — the tick registrations below are commented out
 * because they live in `engine-gmt/features/*` which is still a Phase E
 * port. The component compiles + the per-frame dispatch works, but
 * animation and gizmo ticks won't fire until features land. GMT's FPS
 * counter / performance monitor ticks also defer to Phase E.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { getProxy } from '../engine/worker/WorkerProxy';
import { useEngineStore } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import type { SerializedCamera, SerializedOffset } from '../engine/worker/WorkerProtocol';
import {
    setViewportCamera,
    setViewportCanvas,
    snapshotDisplayCamera,
    getViewportCamera,
    isMouseOverCanvas,
} from '../engine/worker/ViewportRefs';
import { registerTick, runTicks, TICK_PHASE } from '../engine/TickRegistry';

// ── Tick Registration — SNAPSHOT phase ──────────────────────────────────
// Capture the display camera for overlay components (light gizmos, drawing
// tools) that need the same camera state the worker is about to receive.

registerTick('snapshotDisplayCamera', TICK_PHASE.SNAPSHOT, () => {
    const cam = getViewportCamera();
    if (cam) snapshotDisplayCamera(cam);
});

// ── Feature-provided ticks — registered by features themselves at
//    module load (Phase E). Examples from GMT:
//      - 'animationTick'         ANIMATE   (features/animation/AnimationSystem)
//      - 'lightGizmoTick'        OVERLAY   (features/lighting/LightGizmo)
//      - 'drawingOverlayTick'    OVERLAY   (features/drawing/DrawingOverlay)
//      - 'fpsCounterTick'        UI        (features/debug/FpsCounter)
//      - 'performanceMonitorTick' UI       (features/debug/PerformanceMonitor)
//      - 'trackRowTick'          UI        (features/animation/TrackRow)

// ── Component ────────────────────────────────────────────────────────

interface GmtRendererTickDriverProps {
    onLoaded?: () => void;
}

export const GmtRendererTickDriver: React.FC<GmtRendererTickDriverProps> = ({ onLoaded }) => {
    const { camera, size, gl } = useThree();
    const [isReady, setIsReady] = useState(false);
    const proxy = getProxy();
    const dpr = useEngineStore((s: any) => s.dpr);

    // Track latest viewport size in a ref so post-compile resize uses
    // current values, not stale closure captures from mount.
    const sizeRef = useRef({ width: size.width, height: size.height, dpr });
    sizeRef.current = { width: size.width, height: size.height, dpr };

    // Register R3F camera + canvas for DOM overlays (light gizmos, etc.)
    useEffect(() => {
        setViewportCamera(camera);
        setViewportCanvas(gl.domElement);
    }, [camera, gl]);

    // Wait for worker boot + compile.
    useEffect(() => {
        let isMounted = true;

        const checkReady = async () => {
            let attempts = 0;
            while (!proxy.isBooted) {
                if (!isMounted) return;
                if (++attempts >= 300) {
                    console.error('[GmtRendererTickDriver] Worker boot timeout after 30s');
                    return;
                }
                await new Promise(r => setTimeout(r, 100));
            }
            while (proxy.isCompiling) {
                if (!isMounted) return;
                await new Promise(r => setTimeout(r, 100));
            }

            if (isMounted) {
                // Re-push current viewport size after boot+compile to ensure
                // correct dimensions. Layout may have changed during compile.
                const s = sizeRef.current;
                proxy.resizeWorker(s.width, s.height, s.dpr);

                // Consume stashed teleport from applyPresetState — the exact
                // payload computed during loadScene, not a re-read from the
                // store (which may have drifted if orbit/physics ticks ran
                // between mount and boot-ready).
                const stashed = proxy.pendingTeleport;
                if (stashed) {
                    proxy.pendingTeleport = null;
                    FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, stashed);
                }

                setIsReady(true);
                if (onLoaded) onLoaded();
            }
        };

        checkReady();
        return () => { isMounted = false; };
    }, []);

    // Handle resize (reacts to viewport size AND DPR changes).
    useEffect(() => {
        proxy.resizeWorker(size.width, size.height, dpr);
    }, [size.width, size.height, dpr]);

    // Bridge FractalEvents → worker. Before boot, CONFIG/UNIFORM/RESET are
    // suppressed — they'd queue on the worker and trigger a redundant
    // second compile after BOOT delivers the full config.
    useEffect(() => {
        const unsubs = [
            FractalEvents.on(FRACTAL_EVENTS.CONFIG, (config) => {
                // Same ShaderConfig cast as GmtRendererCanvas — generic
                // store type → GMT proxy's narrower type.
                if (proxy.isBooted) proxy.sendConfig(config as any);
            }),
            FractalEvents.on(FRACTAL_EVENTS.CONFIG_DONE, () => {
                // Main-thread flushes accumulated CONFIG diffs with this
                // signal — worker fires its own fireCompile() in response,
                // skipping the 200ms scheduleCompile debounce.
                if (proxy.isBooted) proxy.post({ type: 'CONFIG_DONE' });
            }),
            FractalEvents.on(FRACTAL_EVENTS.UNIFORM, ({ key, value, noReset }) => {
                if (proxy.isBooted) proxy.setUniform(key, value, noReset);
            }),
            FractalEvents.on(FRACTAL_EVENTS.RESET_ACCUM, () => {
                if (proxy.isBooted) proxy.resetAccumulation();
            }),
            FractalEvents.on(FRACTAL_EVENTS.OFFSET_SET, (v: any) => {
                const offset = { x: v.x, y: v.y, z: v.z, xL: v.xL ?? 0, yL: v.yL ?? 0, zL: v.zL ?? 0 };
                proxy.setShadowOffset(offset);
                if (proxy.isBooted) proxy.post({ type: 'OFFSET_SET', offset });
            }),
            FractalEvents.on(FRACTAL_EVENTS.OFFSET_SHIFT, ({ x, y, z }) => {
                proxy.applyOffsetShift(x, y, z);
                if (proxy.isBooted) proxy.post({ type: 'OFFSET_SHIFT', x, y, z });
            }),
            FractalEvents.on(FRACTAL_EVENTS.CAMERA_SNAP, () => {
                proxy.shouldSnapCamera = true;
            }),
            FractalEvents.on(FRACTAL_EVENTS.TEXTURE, ({ textureType, dataUrl }) => {
                if (proxy.isBooted) proxy.updateTexture(textureType, dataUrl);
            }),
            FractalEvents.on(FRACTAL_EVENTS.REGISTER_FORMULA, ({ id, shader }: any) => {
                proxy.registerFormula(id, shader);
            }),
        ];

        return () => { unsubs.forEach((u) => u()); };
    }, []);

    // Performance throttle: when FPS < 20, yield 1 frame/sec to let React
    // render UI (keeps the app responsive during heavy compile/bucket-render).
    const throttleRef = React.useRef({ lastYield: 0, fps: 60, frames: 0, lastSample: 0 });

    useFrame((_state, delta) => {
        if (!isReady) return;

        // Clamp delta — prevents tab-switch / debugger-pause from feeding a
        // huge delta into VirtualSpace smoothing (would trigger a spurious
        // accumulation reset).
        const clampedDelta = Math.min(delta, 0.1);

        // Track FPS + yield frames when struggling.
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
            runTicks(clampedDelta);
            return;
        }

        // Run all registered ticks: SNAPSHOT → ANIMATE → OVERLAY → UI.
        runTicks(clampedDelta);

        // Sync R3F camera FOV with optics — raycaster/gizmo projections
        // must match the rendered image's FOV.
        const cam = camera as THREE.PerspectiveCamera;
        const storeFov = (useEngineStore.getState() as any).optics?.camFov ?? 60;
        if (cam.fov !== storeFov) {
            cam.fov = storeFov;
            cam.updateProjectionMatrix();
        }

        // DISPATCH — serialize camera + state and send to render worker.
        const serializedCamera: SerializedCamera = {
            position: [cam.position.x, cam.position.y, cam.position.z],
            quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
            fov: cam.fov || 60,
            aspect: cam.aspect || (size.width / size.height),
        };

        const storeState = useEngineStore.getState() as any;
        const offset = storeState.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
        const serializedOffset: SerializedOffset = {
            x: offset.x, y: offset.y, z: offset.z,
            xL: offset.xL ?? 0, yL: offset.yL ?? 0, zL: offset.zL ?? 0,
        };

        const renderState = {
            cameraMode: storeState.cameraMode,
            isCameraInteracting: useAnimationStore.getState().isCameraInteracting,
            isGizmoInteracting: proxy.isGizmoInteracting,
            mouseOverCanvas: isMouseOverCanvas(),
            optics:   storeState.optics   ?? null,
            lighting: storeState.lighting ?? null,
            quality:  storeState.quality  ?? null,
            geometry: storeState.geometry ?? null,
        };

        proxy.sendRenderTick(serializedCamera, serializedOffset, clampedDelta, renderState);
    }, 1);

    return null;
};
