/**
 * GMT camera slice — savedCameras library + undo/redo + high-level
 * orchestration (addCamera, deleteCamera, resetCamera, selectCamera,
 * duplicateCamera, saveToSlot). Ported from
 * `h:/GMT/gmt-0.8.5/store/slices/cameraSlice.ts` with imports rewritten.
 *
 * Not a Zustand StateCreator — engine-gmt can't inject a slice into the
 * engine-core engineStore construction. Instead `installGmtCameraSlice()`
 * runs once at app boot and patches the slice's actions into the store
 * via `useEngineStore.setState(...)`. Zustand merges partials, so the
 * engine-core fields (UI, renderer, features) are preserved; this patch
 * just adds the missing camera actions + initializes savedCameras /
 * undoStack / redoStack that were declared in types but never populated.
 *
 * Until this runs, CameraManagerPanel crashes on `savedCameras.length`
 * (which is undefined). The `app-gmt/main.tsx` boot calls this right
 * after `registerGmtUi()`.
 */

import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { getProxy } from '../engine/worker/WorkerProxy';
import { registry } from '../engine/FractalRegistry';
import { VirtualSpace } from '../engine/PrecisionMath';
import { CameraUtils } from '../utils/CameraUtils';
import { nanoid } from 'nanoid';
import { useEngineStore } from '../../store/engineStore';
import type { PreciseVector3, CameraState, SavedCamera } from '../../types';

const engine = getProxy();

const getSetOptics = (s: any): ((update: any) => void) | null => {
    return typeof s.setOptics === 'function' ? s.setOptics : null;
};

export const installGmtCameraSlice = (): void => {
    const set = useEngineStore.setState as (partial: any) => void;
    const get = useEngineStore.getState as () => any;

    set({
        // Initial state for the saved-camera library. engine-core owns
        // `undoStack` / `redoStack` (unified Transaction-based history),
        // so we don't seed them here — overwriting would wipe any
        // transactions already captured before this runs.
        savedCameras: [] as SavedCamera[],
        activeCameraId: null as string | null,

        // --- Primitive setters ----------------------------------------
        setSceneOffset: (v: any) => {
            const precise: PreciseVector3 = {
                x: v.x, y: v.y, z: v.z,
                xL: (v as PreciseVector3).xL || 0,
                yL: (v as PreciseVector3).yL || 0,
                zL: (v as PreciseVector3).zL || 0,
            };
            const e = engine as any;
            if (e.virtualSpace) {
                e.virtualSpace.state = precise;
                set({ sceneOffset: e.virtualSpace.state });
                FractalEvents.emit(FRACTAL_EVENTS.OFFSET_SET, e.virtualSpace.state);
            } else {
                set({ sceneOffset: precise });
                FractalEvents.emit(FRACTAL_EVENTS.OFFSET_SET, precise);
            }
        },

        setCameraMode: (v: string) => set({ cameraMode: v }),

        // --- Saved-camera library -------------------------------------
        updateCamera: (id: string, updates: Partial<SavedCamera>) => {
            set((state: any) => ({
                savedCameras: state.savedCameras.map((c: SavedCamera) =>
                    c.id === id ? { ...c, ...updates } : c
                ),
            }));
        },

        deleteCamera: (id: string) => {
            set((state: any) => ({
                savedCameras: state.savedCameras.filter((c: SavedCamera) => c.id !== id),
                activeCameraId: state.activeCameraId === id ? null : state.activeCameraId,
            }));
        },

        reorderCameras: (fromIndex: number, toIndex: number) => {
            set((state: any) => {
                const cams = [...state.savedCameras];
                const [moved] = cams.splice(fromIndex, 1);
                cams.splice(toIndex, 0, moved);
                return { savedCameras: cams };
            });
        },

        addCamera: (nameOverride?: string) => {
            const s = get();

            const unifiedPos = CameraUtils.getUnifiedFromEngine();
            const rot = CameraUtils.getRotationFromEngine();
            const e = engine as any;
            const dist = e.lastMeasuredDistance > 0 && e.lastMeasuredDistance < 1000
                ? e.lastMeasuredDistance : s.targetDistance;

            const sX = VirtualSpace.split(unifiedPos.x);
            const sY = VirtualSpace.split(unifiedPos.y);
            const sZ = VirtualSpace.split(unifiedPos.z);

            const optics = { ...(s.optics || {}) };
            const name = nameOverride || `Camera ${s.savedCameras.length + 1}`;
            const newCam: SavedCamera = {
                id: nanoid(),
                label: name,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
                sceneOffset: { x: sX.high, y: sY.high, z: sZ.high, xL: sX.low, yL: sY.low, zL: sZ.low },
                targetDistance: dist,
                optics: optics as any,
            };
            set((state: any) => ({
                savedCameras: [...state.savedCameras, newCam],
                activeCameraId: newCam.id,
            }));
        },

        saveToSlot: (slotIndex: number) => {
            const s = get();
            const existing = s.savedCameras[slotIndex];

            const unifiedPos = CameraUtils.getUnifiedFromEngine();
            const rot = CameraUtils.getRotationFromEngine();
            const e = engine as any;
            const dist = e.lastMeasuredDistance > 0 && e.lastMeasuredDistance < 1000
                ? e.lastMeasuredDistance : s.targetDistance;
            const sX = VirtualSpace.split(unifiedPos.x);
            const sY = VirtualSpace.split(unifiedPos.y);
            const sZ = VirtualSpace.split(unifiedPos.z);
            const cameraState: CameraState = {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
                sceneOffset: { x: sX.high, y: sY.high, z: sZ.high, xL: sX.low, yL: sY.low, zL: sZ.low },
                targetDistance: dist,
            };
            const optics = { ...(s.optics || {}) };

            if (existing) {
                set((state: any) => ({
                    savedCameras: state.savedCameras.map((c: SavedCamera, i: number) =>
                        i === slotIndex ? { ...c, ...cameraState, optics: optics as any } : c
                    ),
                    activeCameraId: existing.id,
                }));
                FractalEvents.emit(FRACTAL_EVENTS.CAMERA_SLOT_SAVED, { slot: slotIndex + 1, label: existing.label });
            } else {
                const label = `Camera ${slotIndex + 1}`;
                const newCam: SavedCamera = {
                    id: nanoid(),
                    label,
                    position: cameraState.position,
                    rotation: cameraState.rotation,
                    sceneOffset: cameraState.sceneOffset,
                    targetDistance: cameraState.targetDistance,
                    optics: optics as any,
                };
                set((state: any) => ({
                    savedCameras: [...state.savedCameras, newCam],
                    activeCameraId: newCam.id,
                }));
                FractalEvents.emit(FRACTAL_EVENTS.CAMERA_SLOT_SAVED, { slot: slotIndex + 1, label });
            }
        },

        selectCamera: (id: string | null) => {
            if (id === null) {
                set({ activeCameraId: null });
                return;
            }
            const cam = get().savedCameras.find((c: SavedCamera) => c.id === id);
            if (!cam) return;

            FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TRANSITION, cam as any);

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
            (engine as any).resetAccumulation?.();
        },

        duplicateCamera: (id: string) => {
            const s = get();
            const cam = s.savedCameras.find((c: SavedCamera) => c.id === id);
            if (!cam) return;
            const newCam: SavedCamera = {
                ...JSON.parse(JSON.stringify(cam)),
                id: nanoid(),
                label: cam.label + ' (copy)',
            };
            const idx = s.savedCameras.indexOf(cam);
            const newCams = [...s.savedCameras];
            newCams.splice(idx + 1, 0, newCam);
            set({ savedCameras: newCams, activeCameraId: newCam.id });
            FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, newCam as any);
            set({
                cameraRot: newCam.rotation,
                sceneOffset: newCam.sceneOffset,
                targetDistance: newCam.targetDistance || 3.5,
            });
            if (newCam.optics) {
                const setOptics = getSetOptics(get());
                if (setOptics) setOptics(newCam.optics);
            }
            (engine as any).resetAccumulation?.();
        },

        // --- Reset + undo / redo --------------------------------------

        resetCamera: () => {
            set({ activeCameraId: null });

            const activeFormula = get().formula;
            const def = registry.get(activeFormula as any);
            const preset: any = def?.defaultPreset;

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
                xL: sX.low, yL: sY.low, zL: sZ.low,
            };

            get().setSceneOffset(newOffset);
            set({ cameraRot: defRot, targetDistance: defDist });

            const resetState: CameraState = {
                position: { x: 0, y: 0, z: 0 },
                rotation: defRot,
                sceneOffset: newOffset,
                targetDistance: defDist,
            };

            FractalEvents.emit(FRACTAL_EVENTS.RESET_ACCUM, undefined);
            FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, resetState as any);
        },

        // undoCamera / redoCamera: engine-core's historySlice already
        // provides these as `undo('camera')` / `redo('camera')` on the
        // unified Transaction stack. We don't override here — the
        // Camera menu's Undo Move / Redo Move items call
        // `state.undoCamera()` / `state.redoCamera()` directly, which
        // resolve to engine-core's implementations. Engine-core's
        // camera Transaction now captures full state (sceneOffset +
        // cameraRot + targetDistance), so the diff applies cleanly on
        // undo — no custom logic needed.
        //
        // After an engine-core undo applies the diff (sceneOffset +
        // cameraRot + targetDistance), still emit CAMERA_TELEPORT so
        // Navigation warps the R3F camera. Wrap the unified actions
        // with a thin emitter layer.
        _applyCameraTeleport: () => {
            const s = get();
            FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, {
                position: { x: 0, y: 0, z: 0 },
                rotation: s.cameraRot,
                sceneOffset: s.sceneOffset,
                targetDistance: s.targetDistance,
            } as any);
            FractalEvents.emit(FRACTAL_EVENTS.RESET_ACCUM, undefined);
        },
    });

    // Wrap engine-core's undoCamera / redoCamera to also fire the
    // CAMERA_TELEPORT so the R3F camera warps to the restored pose
    // instead of continuing to interpolate from the pre-undo position.
    const prev = useEngineStore.getState() as any;
    const origUndoCamera = prev.undoCamera;
    const origRedoCamera = prev.redoCamera;
    set({
        undoCamera: () => {
            origUndoCamera?.();
            (useEngineStore.getState() as any)._applyCameraTeleport?.();
        },
        redoCamera: () => {
            origRedoCamera?.();
            (useEngineStore.getState() as any)._applyCameraTeleport?.();
        },
    });
};
