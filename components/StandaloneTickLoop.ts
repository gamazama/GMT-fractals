/**
 * StandaloneTickLoop — rAF-based tick + dispatch loop that works WITHOUT R3F.
 *
 * When the R3F Canvas is mounted, WorkerTickScene drives ticks via useFrame.
 * When the Canvas is dismounted (debugDisableOverlayCanvas), this loop takes over
 * so the worker keeps receiving RENDER_TICK messages and the display stays alive.
 *
 * Usage: call start() / stop() from ViewportArea based on the debug flag.
 * The camera is read from ViewportRefs (set by Navigation/WorkerTickScene when Canvas was active).
 */

import * as THREE from 'three';
import { getProxy } from '../engine/worker/WorkerProxy';
import { useFractalStore } from '../store/fractalStore';
import { useAnimationStore } from '../store/animationStore';
import { runTicks } from '../engine/TickRegistry';
import { getViewportCamera, snapshotDisplayCamera } from '../engine/worker/ViewportRefs';
import type { SerializedCamera, SerializedOffset } from '../engine/worker/WorkerProtocol';

let _rafId: number | null = null;
let _lastTime = 0;
let _running = false;

function tick(time: number) {
    if (!_running) return;
    _rafId = requestAnimationFrame(tick);

    const delta = _lastTime ? Math.min((time - _lastTime) / 1000, 0.1) : 1 / 60;
    _lastTime = time;

    const proxy = getProxy();
    if (!proxy.isBooted) return;

    // Snapshot camera for gizmo ticks
    const cam = getViewportCamera() as THREE.PerspectiveCamera | null;
    if (cam) snapshotDisplayCamera(cam);

    // Run tick registry (animation, UI, overlays)
    runTicks(delta);

    if (!cam) return;

    // Sync FOV from store
    const storeFov = (useFractalStore.getState() as any).optics?.camFov ?? 60;
    if (cam.fov !== storeFov) {
        cam.fov = storeFov;
        cam.updateProjectionMatrix();
    }

    // Dispatch to worker
    const serializedCamera: SerializedCamera = {
        position: [cam.position.x, cam.position.y, cam.position.z],
        quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
        fov: cam.fov || 60,
        aspect: cam.aspect || 1
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
        optics: (storeState as any).optics ?? null,
        lighting: (storeState as any).lighting ?? null,
        quality: (storeState as any).quality ?? null,
        geometry: (storeState as any).geometry ?? null,
    };

    proxy.sendRenderTick(serializedCamera, serializedOffset, delta, renderState);
}

export function startStandaloneLoop() {
    if (_running) return;
    _running = true;
    _lastTime = 0;
    _rafId = requestAnimationFrame(tick);
}

export function stopStandaloneLoop() {
    _running = false;
    if (_rafId !== null) {
        cancelAnimationFrame(_rafId);
        _rafId = null;
    }
}

export function isStandaloneLoopRunning() {
    return _running;
}
