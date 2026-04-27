/**
 * GMT camera slice — composes the engine-level state-library factory.
 *
 * What this file owns:
 *   - GMT-specific capture/apply: sceneOffset (split-precision), camera
 *     rotation quaternion, targetDistance (raymarching surface probe),
 *     optics. Reads via CameraUtils + WorkerProxy; writes via Zustand
 *     setState + FractalEvents.CAMERA_TRANSITION + resetAccumulation.
 *   - Cardinal-axis label suggestion (`getDirectionName` recognises
 *     orthogonal views as "Front View" etc.).
 *   - Worker-snapshot thumbnail capture (engine.captureSnapshot()).
 *   - Modified-marker dirty-check against current live state.
 *   - resetCamera: walks the active formula's default preset.
 *   - undoCamera / redoCamera wrappers around engine-core's history slice.
 *
 * What the factory owns (engine-level):
 *   - The savedCameras array + activeCameraId + bookkeeping (add /
 *     delete / update / duplicate / reorder / saveToSlot / select).
 *
 * Until installGmtCameraSlice() runs, CameraManagerPanel crashes on
 * `savedCameras.length` (which is undefined). app-gmt/main.tsx calls
 * this right after registerGmtUi().
 */

import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { getProxy } from '../engine/worker/WorkerProxy';
import { registry } from '../engine/FractalRegistry';
import { VirtualSpace } from '../engine/PrecisionMath';
import { CameraUtils } from '../utils/CameraUtils';
import { useEngineStore } from '../../store/engineStore';
import { type StateSnapshot } from '../../engine/store/createStateLibrarySlice';
import { installStateLibrary } from '../../engine/store/installStateLibrary';
import { getDirectionName } from '../features/camera_manager/logic';
import type { PreciseVector3, CameraState } from '../../types';
import type { OpticsState } from '../features/optics';

const engine = getProxy();

/** State payload captured into each saved camera. CameraState (position,
 *  rotation, sceneOffset, targetDistance) plus GMT optics. */
export interface SavedCameraPayload extends CameraState {
    optics: OpticsState;
}

/** Public alias: a saved camera is a state-library snapshot whose
 *  payload is a SavedCameraPayload. */
export type SavedCamera = StateSnapshot<SavedCameraPayload>;

const getSetOptics = (s: any): ((update: Partial<OpticsState>) => void) | null => {
    return typeof s.setOptics === 'function' ? s.setOptics : null;
};

/** Capture: read GMT's live camera state into a snapshot payload. */
const captureCameraState = (): SavedCameraPayload => {
    const unifiedPos = CameraUtils.getUnifiedFromEngine();
    const rot = CameraUtils.getRotationFromEngine();
    const e = engine as any;
    const live = useEngineStore.getState() as any;

    const dist = e.lastMeasuredDistance > 0 && e.lastMeasuredDistance < 1000
        ? e.lastMeasuredDistance
        : live.targetDistance;
    const sX = VirtualSpace.split(unifiedPos.x);
    const sY = VirtualSpace.split(unifiedPos.y);
    const sZ = VirtualSpace.split(unifiedPos.z);

    return {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
        sceneOffset: { x: sX.high, y: sY.high, z: sZ.high, xL: sX.low, yL: sY.low, zL: sZ.low },
        targetDistance: dist,
        optics: { ...live.optics },
    };
};

/** Apply: push a saved snapshot into GMT's live camera state. */
const applyCameraState = (state: SavedCameraPayload): void => {
    FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TRANSITION, state as CameraState);
    useEngineStore.setState({
        cameraRot: state.rotation,
        sceneOffset: state.sceneOffset!,
        targetDistance: state.targetDistance ?? 3.5,
    } as any);
    const setOptics = getSetOptics(useEngineStore.getState());
    if (setOptics && state.optics) setOptics(state.optics);
    (engine as any).resetAccumulation?.();
};

/** Modified marker — compares live sceneOffset+rotation+optics to a
 *  snapshot. Tolerances mirror the original implementation in
 *  CameraManagerPanel.tsx. Exported so the panel can render an
 *  up-to-date dirty marker as the user navigates. */
export const isCameraModified = (snap: SavedCameraPayload): boolean => {
    const live = useEngineStore.getState() as any;
    const so = live.sceneOffset;
    const liveX = so.x + (so.xL ?? 0);
    const liveY = so.y + (so.yL ?? 0);
    const liveZ = so.z + (so.zL ?? 0);

    const camOff = snap.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
    const savedX = camOff.x + (camOff.xL ?? 0);
    const savedY = camOff.y + (camOff.yL ?? 0);
    const savedZ = camOff.z + (camOff.zL ?? 0);

    if (Math.abs(liveX - savedX) + Math.abs(liveY - savedY) + Math.abs(liveZ - savedZ) > 0.0001) return true;

    const lr = live.cameraRot;
    if (Math.abs(lr.x - snap.rotation.x) +
        Math.abs(lr.y - snap.rotation.y) +
        Math.abs(lr.z - snap.rotation.z) +
        Math.abs(lr.w - snap.rotation.w) > 0.001) return true;

    if (snap.optics && live.optics) {
        if (Math.abs((live.optics.camType ?? 0) - (snap.optics.camType ?? 0)) > 0.1) return true;
        if (Math.abs((live.optics.orthoScale ?? 2) - (snap.optics.orthoScale ?? 2)) > 0.01) return true;
        if (Math.abs((live.optics.camFov ?? 60) - (snap.optics.camFov ?? 60)) > 0.1) return true;
    }
    return false;
};

/** Cardinal-axis label suggestion. Returns "Front View" / "Top View"
 *  etc. only when the camera is in orthographic mode and roughly
 *  aligned with an axis. */
const suggestCameraLabel = (): string | undefined => {
    const live = useEngineStore.getState() as any;
    const opticsNow = live.optics;
    if (!opticsNow || Math.abs(opticsNow.camType - 1.0) > 0.1) return undefined;
    const rot = CameraUtils.getRotationFromEngine();
    const dirName = getDirectionName(rot);
    return dirName ?? undefined;
};

/** Worker-snapshot thumbnail. Captures, centre-crops, returns a
 *  128px JPEG data URL. */
const captureCameraThumbnail = async (): Promise<string | undefined> => {
    try {
        const blob = await (engine as any).captureSnapshot?.();
        if (!blob) return undefined;
        const img = await createImageBitmap(blob);
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const srcSize = Math.min(img.width, img.height);
        const sx = (img.width - srcSize) / 2;
        const sy = (img.height - srcSize) / 2;
        ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);
        return canvas.toDataURL('image/jpeg', 0.7);
    } catch {
        return undefined;
    }
};

/** Reset hook — walks the active formula's defaultPreset and pushes
 *  it into the live camera state (sceneOffset, rotation, distance).
 *  Equivalent to the old resetCamera body, minus the active-id clear
 *  (the factory does that). */
const resetToFormulaDefault = (): void => {
    const get = useEngineStore.getState as () => any;

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

    const newOffset: PreciseVector3 = {
        x: sX.high, y: sY.high, z: sZ.high,
        xL: sX.low, yL: sY.low, zL: sZ.low,
    };

    get().setSceneOffset(newOffset);
    useEngineStore.setState({ cameraRot: defRot, targetDistance: defDist } as any);

    const resetState: CameraState = {
        position: { x: 0, y: 0, z: 0 },
        rotation: defRot,
        sceneOffset: newOffset,
        targetDistance: defDist,
    };

    FractalEvents.emit(FRACTAL_EVENTS.RESET_ACCUM, undefined);
    FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, resetState as any);
};

export const installGmtCameraSlice = (): void => {
    const set = useEngineStore.setState as (partial: any) => void;
    const get = useEngineStore.getState as () => any;

    // Stash every CAMERA_TELEPORT into proxy.pendingTeleport so the
    // GmtRendererTickDriver can replay the most recent one once the worker
    // is boot-ready. Catches the early teleport from loadPreset (fires
    // before Navigation mounts) and any later one fired before the worker
    // finishes its first compile.
    FractalEvents.on(FRACTAL_EVENTS.CAMERA_TELEPORT, (state) => {
        engine.pendingTeleport = state as any;
    });

    // Patch GMT-only helpers that the panel + camera-utils call
    // alongside the saved-cameras library actions.
    set({
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

        // Internal helper used by the undo/redo wrappers below.
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

    // Install the generic state-library actions for saved cameras, plus
    // the Mod+1..9 / 1..9 slot shortcuts. `menu: null` opts out of the
    // bundle's auto-generated topbar menu — GMT's Camera menu is wired
    // by hand in engine-gmt/topbar.tsx alongside Undo Move / Redo Move /
    // Reset Position / View Manager. Slot items in that menu are wired
    // to the same savedCameras library actions, so menu clicks and
    // hotkeys agree.
    installStateLibrary<SavedCameraPayload>({
        panelId: 'Camera Manager',
        arrayKey: 'savedCameras',
        activeIdKey: 'activeCameraId',
        actions: {
            add: 'addCamera',
            update: 'updateCamera',
            delete: 'deleteCamera',
            duplicate: 'duplicateCamera',
            select: 'selectCamera',
            reorder: 'reorderCameras',
            saveToSlot: 'saveToSlot',
            reset: 'resetCamera',
        },
        defaultLabelPrefix: 'Camera',
        capture: captureCameraState,
        apply: applyCameraState,
        isModified: isCameraModified,
        suggestLabel: suggestCameraLabel,
        captureThumbnail: captureCameraThumbnail,
        onReset: resetToFormulaDefault,
        slotShortcuts: {
            category: 'Camera',
            savePrefix: 'Save camera to slot',
            recallPrefix: 'Recall camera slot',
        },
        menu: null,
        // Saved-toast + notify-dot are managed by the bundle (writes to
        // savedCameras_savedToast / savedCameras_notifyDot on the store).
        // We additionally emit FRACTAL_EVENTS.CAMERA_SLOT_SAVED so any
        // legacy listeners or animation hooks can react.
        onSavedToSlot: (slotIndex, label) => {
            FractalEvents.emit(FRACTAL_EVENTS.CAMERA_SLOT_SAVED, {
                slot: slotIndex + 1,
                label,
            });
        },
    });

    // Wrap engine-core's undoCamera / redoCamera so the R3F camera warps
    // to the restored pose after the diff applies. Engine-core's history
    // slice runs synchronously; we fire the teleport event after it.
    const prev = get();
    const origUndoCamera = prev.undoCamera;
    const origRedoCamera = prev.redoCamera;
    set({
        undoCamera: () => {
            origUndoCamera?.();
            (get() as any)._applyCameraTeleport?.();
        },
        redoCamera: () => {
            origRedoCamera?.();
            (get() as any)._applyCameraTeleport?.();
        },
    });

};
