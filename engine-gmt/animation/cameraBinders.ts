/**
 * GMT animation camera binders.
 *
 * AnimationEngine doesn't know what a camera is — it just calls into
 * registered binders frame by frame. GMT's camera is a split-precision
 * sceneOffset + Euler rotation that the worker reads via the
 * CAMERA_TELEPORT event, and animating it requires:
 *
 *   1. Reading the live camera state at the START of each frame so
 *      track interpolation has a fresh starting point (preScrub).
 *   2. Buffering the per-axis writes from the binders into a single
 *      pending vec/euler that captures whichever axes the timeline
 *      actually animated.
 *   3. Flushing the buffer at the END of the frame as one
 *      CAMERA_TELEPORT event, with split-precision math applied to
 *      the unified position (postScrub).
 *
 * This module owns all three steps and registers itself as a pair of
 * scrub hooks plus four binders (active_index + 3 unified axes + 3
 * rotation axes). Before this lived inside AnimationEngine — see F5
 * in docs/engine/20_Fragility_Audit.md for the migration history.
 */

import * as THREE from 'three';
import { animationEngine, type ScrubContext } from '../../engine/AnimationEngine';
import { binderRegistry } from '../../engine/animation/binderRegistry';
import { setCameraKeyCaptureFn } from '../../engine/animation/cameraKeyRegistry';
import { useEngineStore } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { getProxy } from '../engine/worker/WorkerProxy';
import { getViewportCamera } from '../engine/worker/ViewportRefs';
import { VirtualSpace } from '../engine/PrecisionMath';
import { CameraUtils } from '../utils/CameraUtils';

const engine = getProxy() as any;

/** Per-frame buffer that the binders write into and the postScrub
 *  hook drains. dirtyRot/dirtyUnified gate the CAMERA_TELEPORT emit
 *  so frames with no camera tracks don't spam the worker. */
interface PendingCameraState {
    rot: THREE.Euler;
    unified: THREE.Vector3;
    rotDirty: boolean;
    unifiedDirty: boolean;
}

const pending: PendingCameraState = {
    rot: new THREE.Euler(),
    unified: new THREE.Vector3(),
    rotDirty: false,
    unifiedDirty: false,
};

let lastCameraIndex = -1;

/** Read the live camera state into the pending buffer. Runs at the
 *  start of every scrub frame so the binders below see a fresh
 *  starting point (matches the syncBuffersFromEngine call site that
 *  used to live inline in AnimationEngine.scrub). */
const preScrub = (_ctx: ScrubContext) => {
    const cam = getViewportCamera() || engine.activeCamera;
    if (!cam) return;
    pending.rot.setFromQuaternion(cam.quaternion);
    const eo = engine.sceneOffset;
    pending.unified.set(
        eo.x + eo.xL + cam.position.x,
        eo.y + eo.yL + cam.position.y,
        eo.z + eo.zL + cam.position.z,
    );
    pending.rotDirty = false;
    pending.unifiedDirty = false;
};

/** Flush the pending buffer at the end of the frame. Emits ONE
 *  CAMERA_TELEPORT with split-precision math, only when the timeline
 *  actually wrote to a camera track this frame. */
const postScrub = (_ctx: ScrubContext) => {
    if (!pending.unifiedDirty && !pending.rotDirty) return;

    engine.shouldSnapCamera = true;

    const q = new THREE.Quaternion().setFromEuler(pending.rot);
    const rot = { x: q.x, y: q.y, z: q.z, w: q.w };

    const sX = VirtualSpace.split(pending.unified.x);
    const sY = VirtualSpace.split(pending.unified.y);
    const sZ = VirtualSpace.split(pending.unified.z);

    FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, {
        position: { x: 0, y: 0, z: 0 },
        rotation: rot,
        sceneOffset: {
            x: sX.high, y: sY.high, z: sZ.high,
            xL: sX.low, yL: sY.low, zL: sZ.low,
        },
    });

    useEngineStore.setState({ cameraRot: rot } as any);
};

/** Capture the live camera into `camera.unified.{x,y,z}` +
 *  `camera.rotation.{x,y,z}` keyframes. Used by the TimelineToolbar
 *  Key Cam button via setCameraKeyCaptureFn — the default capture in
 *  cameraKeyRegistry walks store paths, but GMT's camera lives in
 *  `cameraRot` (quaternion) + `sceneOffset` (split-precision vec3),
 *  not under a `camera.*` field, so the default no-ops. This path
 *  reads from the live R3F camera via CameraUtils, mirroring the
 *  legacy sequenceSlice.captureCameraFrame logic.
 *
 *  Auto-creates each track on first press so the user doesn't have to
 *  pre-add empty tracks. Idempotent for the existing-track case.
 */
const captureGmtCameraKeyFrame = (frame: number, _tracks: readonly string[]): void => {
    const cam = getViewportCamera() || engine.activeCamera;
    if (!cam) return;

    const unified = CameraUtils.getUnifiedFromEngine();
    const euler = new THREE.Euler().setFromQuaternion(cam.quaternion);

    const tracks = [
        { id: 'camera.unified.x',  val: unified.x, label: 'Position X' },
        { id: 'camera.unified.y',  val: unified.y, label: 'Position Y' },
        { id: 'camera.unified.z',  val: unified.z, label: 'Position Z' },
        { id: 'camera.rotation.x', val: euler.x,   label: 'Rotation X' },
        { id: 'camera.rotation.y', val: euler.y,   label: 'Rotation Y' },
        { id: 'camera.rotation.z', val: euler.z,   label: 'Rotation Z' },
    ];

    const animActions = useAnimationStore.getState();
    const seq = (animActions as any).sequence;

    for (const t of tracks) {
        if (!seq.tracks[t.id]) {
            (animActions as any).addTrack(t.id, t.label);
        }
        (animActions as any).addKeyframe(t.id, frame, t.val);
    }
};

/** Register all GMT camera-track binders + scrub hooks against the
 *  engine's animationEngine. Idempotent — re-registering a binder
 *  replaces the previous entry; the scrub-hook function references
 *  are captured and removed by the returned teardown. */
export const installGmtCameraBinders = (): (() => void) => {
    // Tell the cameraKeyRegistry how to capture GMT's live camera.
    // Without this, the default capture walks `state.camera.unified.x`
    // paths that don't exist in GMT's store (camera state lives in
    // cameraRot + sceneOffset) and the Key Cam button is a no-op.
    setCameraKeyCaptureFn(captureGmtCameraKeyFrame);
    // active_index: timeline can animate the saved-camera selector.
    // Calls selectCamera which fires CAMERA_TRANSITION (smooth), not
    // CAMERA_TELEPORT — same UX as clicking a saved camera.
    const offActiveIndex = binderRegistry.register({
        id: 'camera.active_index',
        label: 'Active Camera',
        category: 'Camera',
        write: (v) => {
            const index = Math.round(v);
            if (index === lastCameraIndex) return;
            const store = useEngineStore.getState() as any;
            const cameras = store.savedCameras as Array<{ id: string }> | undefined;
            if (cameras && cameras[index]) {
                store.selectCamera(cameras[index].id);
                lastCameraIndex = index;
            }
        },
    });

    const offUnifiedX = binderRegistry.register({
        id: 'camera.unified.x',
        category: 'Camera',
        write: (v) => { pending.unified.x = v; pending.unifiedDirty = true; },
    });
    const offUnifiedY = binderRegistry.register({
        id: 'camera.unified.y',
        category: 'Camera',
        write: (v) => { pending.unified.y = v; pending.unifiedDirty = true; },
    });
    const offUnifiedZ = binderRegistry.register({
        id: 'camera.unified.z',
        category: 'Camera',
        write: (v) => { pending.unified.z = v; pending.unifiedDirty = true; },
    });

    const offRotX = binderRegistry.register({
        id: 'camera.rotation.x',
        category: 'Camera',
        write: (v) => { pending.rot.x = v; pending.rotDirty = true; },
    });
    const offRotY = binderRegistry.register({
        id: 'camera.rotation.y',
        category: 'Camera',
        write: (v) => { pending.rot.y = v; pending.rotDirty = true; },
    });
    const offRotZ = binderRegistry.register({
        id: 'camera.rotation.z',
        category: 'Camera',
        write: (v) => { pending.rot.z = v; pending.rotDirty = true; },
    });

    const offPre = animationEngine.registerScrubHook('pre', preScrub);
    const offPost = animationEngine.registerScrubHook('post', postScrub);

    return () => {
        offActiveIndex();
        offUnifiedX(); offUnifiedY(); offUnifiedZ();
        offRotX(); offRotY(); offRotZ();
        offPre(); offPost();
    };
};
