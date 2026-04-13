
import { StateCreator } from 'zustand';
import { FractalStoreState, FractalActions, PreciseVector3, CameraState, SavedCamera } from '../../types';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { registry } from '../../engine/FractalRegistry';
import { VirtualSpace } from '../../engine/PrecisionMath';
import { CameraUtils } from '../../utils/CameraUtils';
import { nanoid } from 'nanoid';
import type { OpticsState } from '../../features/optics';

/** Safely retrieve the DDFS-generated setOptics action from the store */
const getSetOptics = (s: any): ((update: Partial<OpticsState>) => void) | null => {
    return typeof s.setOptics === 'function' ? s.setOptics : null;
};

// No pre-populated cameras — users save cameras explicitly via the Camera Manager panel.

export type CameraSlice = Pick<FractalStoreState,
    'cameraMode' | 'sceneOffset' | 'undoStack' | 'redoStack' | 'cameraRot' | 'targetDistance' |
    'savedCameras' | 'activeCameraId'
> & Pick<FractalActions,
    'setCameraMode' | 'setSceneOffset' | 'resetCamera' | 'undoCamera' | 'redoCamera' |
    'updateCamera' | 'deleteCamera' | 'reorderCameras' |
    'addCamera' | 'selectCamera' | 'duplicateCamera'
>;

export const createCameraSlice: StateCreator<FractalStoreState & FractalActions, [["zustand/subscribeWithSelector", never]], [], CameraSlice> = (set, get) => ({
    cameraMode: 'Orbit',
    sceneOffset: { x: 0, y: 0, z: 1, xL: 0, yL: 0, zL: -0.24751033974403658 },
    cameraRot: { x: 0, y: 0, z: 0, w: 1 },
    targetDistance: 3.5,
    undoStack: [], redoStack: [],

    savedCameras: [],
    activeCameraId: null,

    setCameraMode: (v) => set({ cameraMode: v }),

    setSceneOffset: (v) => {
        const precise: PreciseVector3 = {
            x: v.x, y: v.y, z: v.z,
            xL: (v as PreciseVector3).xL || 0,
            yL: (v as PreciseVector3).yL || 0,
            zL: (v as PreciseVector3).zL || 0
        };
        if (engine.virtualSpace) {
            engine.virtualSpace.state = precise;
            set({ sceneOffset: engine.virtualSpace.state });
            FractalEvents.emit('offset_set', engine.virtualSpace.state);
        } else {
            set({ sceneOffset: precise });
            FractalEvents.emit('offset_set', precise);
        }
    },

    updateCamera: (id, updates) => {
        set(state => ({
            savedCameras: state.savedCameras.map(c =>
                c.id === id ? { ...c, ...updates } : c
            )
        }));
    },

    deleteCamera: (id) => {
        set(state => ({
            savedCameras: state.savedCameras.filter(c => c.id !== id),
            activeCameraId: state.activeCameraId === id ? null : state.activeCameraId
        }));
    },

    reorderCameras: (fromIndex, toIndex) => {
        set(state => {
            const cams = [...state.savedCameras];
            const [moved] = cams.splice(fromIndex, 1);
            cams.splice(toIndex, 0, moved);
            return { savedCameras: cams };
        });
    },

    // --- CAMERA MANAGER ORCHESTRATION ---
    // High-level actions that compose primitives + events + optics.
    // Called by keyboard shortcuts, animation engine, and camera manager UI.

    addCamera: (nameOverride?: string) => {
        const s = get();

        // Always read live camera state — store values may lag behind teleports.
        const unifiedPos = CameraUtils.getUnifiedFromEngine();
        const rot = CameraUtils.getRotationFromEngine();
        const dist = engine.lastMeasuredDistance > 0 && engine.lastMeasuredDistance < 1000
            ? engine.lastMeasuredDistance : s.targetDistance;

        // getUnifiedFromEngine already combines offset + local, so just split that
        const sX = VirtualSpace.split(unifiedPos.x);
        const sY = VirtualSpace.split(unifiedPos.y);
        const sZ = VirtualSpace.split(unifiedPos.z);

        const unified: CameraState = {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
            sceneOffset: { x: sX.high, y: sY.high, z: sZ.high, xL: sX.low, yL: sY.low, zL: sZ.low },
            targetDistance: dist
        };

        const optics = { ...((s as FractalStoreState).optics) };
        const name = nameOverride || `Camera ${s.savedCameras.length + 1}`;
        const newCam: SavedCamera = {
            id: nanoid(),
            label: name,
            position: unified.position,
            rotation: unified.rotation,
            sceneOffset: unified.sceneOffset,
            targetDistance: unified.targetDistance,
            optics
        };
        set(state => ({
            savedCameras: [...state.savedCameras, newCam],
            activeCameraId: newCam.id
        }));
    },

    selectCamera: (id) => {
        if (id === null) {
            set({ activeCameraId: null });
            return;
        }
        const cam = get().savedCameras.find(c => c.id === id);
        if (!cam) return;

        FractalEvents.emit('camera_transition', cam);

        set({
            activeCameraId: id,
            cameraRot: cam.rotation,
            sceneOffset: cam.sceneOffset,
            targetDistance: cam.targetDistance || 3.5,
        });
        if (cam.optics) {
            const setOptics = getSetOptics(get());
            if (setOptics) setOptics(cam.optics);
        }
        engine.resetAccumulation();
    },

    duplicateCamera: (id) => {
        const s = get();
        const cam = s.savedCameras.find(c => c.id === id);
        if (!cam) return;
        const newCam: SavedCamera = {
            ...JSON.parse(JSON.stringify(cam)),
            id: nanoid(),
            label: cam.label + ' (copy)'
        };
        const idx = s.savedCameras.indexOf(cam);
        const newCams = [...s.savedCameras];
        newCams.splice(idx + 1, 0, newCam);
        set({ savedCameras: newCams, activeCameraId: newCam.id });
        FractalEvents.emit('camera_teleport', newCam);
        set({
            cameraRot: newCam.rotation,
            sceneOffset: newCam.sceneOffset,
            targetDistance: newCam.targetDistance || 3.5,
        });
        if (newCam.optics) {
            const setOptics = getSetOptics(get());
            if (setOptics) setOptics(newCam.optics);
        }
        engine.resetAccumulation();
    },

    // --- STANDARD ACTIONS ---

    resetCamera: () => {
        set({ activeCameraId: null });

        const activeFormula = get().formula;
        const def = registry.get(activeFormula);
        const preset = def?.defaultPreset;

        const defOffset = preset?.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
        const defPos = preset?.cameraPos || { x: 0, y: 0, z: 3.5 };
        const defRot = preset?.cameraRot || { x: 0, y: 0, z: 0, w: 1 };
        const defDist = preset?.targetDistance || 3.5;

        const totalX = defOffset.x + defOffset.xL + defPos.x;
        const totalY = defOffset.y + defOffset.yL + defPos.y;
        const totalZ = defOffset.z + defOffset.zL + defPos.z;

        const sX = VirtualSpace.split(totalX);
        const sY = VirtualSpace.split(totalY);
        const sZ = VirtualSpace.split(totalZ);

        const newOffset = {
            x: sX.high, y: sY.high, z: sZ.high,
            xL: sX.low, yL: sY.low, zL: sZ.low
        };

        get().setSceneOffset(newOffset);
        set({
            cameraRot: defRot,
            targetDistance: defDist
        });

        const resetState: CameraState = {
            position: { x: 0, y: 0, z: 0 },
            rotation: defRot,
            sceneOffset: newOffset,
            targetDistance: defDist
        };

        FractalEvents.emit('reset_accum', undefined);
        FractalEvents.emit('camera_teleport', resetState);
    },

    undoCamera: () => {
        const { undoStack, redoStack } = get();
        if (undoStack.length === 0) return;

        const prev = undoStack[undoStack.length - 1];

        let current: CameraState;
        if (engine.activeCamera && engine.virtualSpace) {
            current = engine.virtualSpace.getUnifiedCameraState(engine.activeCamera, get().targetDistance);
            engine.virtualSpace.applyCameraState(engine.activeCamera, prev);
        } else {
            const s = get();
            current = {
                position: { x: 0, y: 0, z: 0 },
                rotation: s.cameraRot,
                sceneOffset: s.sceneOffset,
                targetDistance: s.targetDistance
            };
        }

        if (prev.sceneOffset) {
            set({ sceneOffset: prev.sceneOffset });
        }

        set({
            cameraRot: prev.rotation,
            targetDistance: prev.targetDistance || 3.5,
            redoStack: [...redoStack, current],
            undoStack: undoStack.slice(0, -1)
        });

        FractalEvents.emit('reset_accum', undefined);
        FractalEvents.emit('camera_teleport', prev);
    },

    redoCamera: () => {
        const { undoStack, redoStack } = get();
        if (redoStack.length === 0) return;

        const next = redoStack[redoStack.length - 1];

        let current: CameraState;
        if (engine.activeCamera && engine.virtualSpace) {
            current = engine.virtualSpace.getUnifiedCameraState(engine.activeCamera, get().targetDistance);
            engine.virtualSpace.applyCameraState(engine.activeCamera, next);
        } else {
            const s = get();
            current = {
                position: { x: 0, y: 0, z: 0 },
                rotation: s.cameraRot,
                sceneOffset: s.sceneOffset,
                targetDistance: s.targetDistance
            };
        }

        if (next.sceneOffset) {
            set({ sceneOffset: next.sceneOffset });
        }

        set({
            cameraRot: next.rotation,
            targetDistance: next.targetDistance || 3.5,
            undoStack: [...undoStack, current],
            redoStack: redoStack.slice(0, -1)
        });

        FractalEvents.emit('reset_accum', undefined);
        FractalEvents.emit('camera_teleport', next);
    }
});
