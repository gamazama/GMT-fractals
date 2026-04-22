/**
 * HistorySlice — generic undo/redo for feature state and camera gestures.
 *
 * Two independent stacks:
 *   - paramUndoStack / paramRedoStack — parameter snapshots (driven by
 *     featureRegistry iteration so any registered feature automatically
 *     participates; zero maintenance when features are added/removed)
 *   - undoStack / redoStack — camera pose snapshots (CameraState) with
 *     gesture debouncing so a single orbit drag produces one undo entry
 *
 * Nothing here assumes a particular render pipeline, graph structure, or
 * pipeline-revision concept. App-layer code (e.g. a graph-editor plugin)
 * that needs custom snapshot handling for its own structured state adds
 * a separate snapshot hook; this slice stays minimal.
 */

import { StateCreator } from 'zustand';
import { FractalStoreState, FractalActions, CameraState } from '../../types';
import { FractalEvents } from '../../engine/FractalEvents';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { featureRegistry } from '../../engine/FeatureSystem';

export interface HistorySliceState {
    paramUndoStack: Partial<FractalStoreState>[];
    paramRedoStack: Partial<FractalStoreState>[];
    interactionSnapshot: Partial<FractalStoreState> | null;
    undoStack: CameraState[];
    redoStack: CameraState[];
}

export interface HistorySliceActions {
    undoParam: () => void;
    redoParam: () => void;
    resetParamHistory: () => void;
    undoCamera: () => void;
    redoCamera: () => void;
    handleInteractionStart: (mode?: 'camera' | 'param' | CameraState) => void;
    handleInteractionEnd: () => void;
}

export type HistorySlice = HistorySliceState & HistorySliceActions;

/**
 * Snapshots every registered feature's slice state. Generic: iterates the
 * feature registry so new features are captured automatically without
 * editing this file.
 */
const getParamSnapshot = (s: FractalStoreState): Partial<FractalStoreState> => {
    const snap: Partial<FractalStoreState> = {
        renderRegion: s.renderRegion ? { ...s.renderRegion } : null,
    };
    for (const feat of featureRegistry.getAll()) {
        const featureState = (s as any)[feat.id];
        if (featureState) {
            (snap as any)[feat.id] = JSON.parse(JSON.stringify(featureState));
        }
    }
    return snap;
};

/** Captures a fresh snapshot of the keys present in `template` for redo. */
const captureStateForKeys = (keys: string[], current: FractalStoreState): Partial<FractalStoreState> => {
    const snap: Partial<FractalStoreState> = {};
    for (const k of keys) {
        (snap as any)[k] = (current as any)[k];
    }
    return snap;
};

/**
 * Applies a stored snapshot back into the store. Walks keys and invokes the
 * matching DDFS setter (`set<Key>`) so feature-level uniform sync and compile
 * triggers fire naturally. Falls back to raw `set()` if no setter exists.
 */
const applyStateRestore = (data: Partial<FractalStoreState>, set: any, get: any) => {
    const actions = get();

    set(data);

    for (const k of Object.keys(data)) {
        const val = (data as any)[k];
        if (k === 'formula') {
            FractalEvents.emit('config', { formula: val });
            continue;
        }
        const setterName = 'set' + k.charAt(0).toUpperCase() + k.slice(1);
        if (typeof actions[setterName] === 'function') {
            actions[setterName](val);
        }
    }

    engine.resetAccumulation();
};

// Debounce window so a single orbit/fly gesture doesn't create multiple
// undo entries from micro-pauses mid-drag.
const CAMERA_UNDO_DEBOUNCE_MS = 1500;
let lastCameraUndoPush = 0;

export const createHistorySlice: StateCreator<
    FractalStoreState & FractalActions & HistorySlice,
    [["zustand/subscribeWithSelector", never]],
    [],
    HistorySlice
> = (set, get) => ({
    paramUndoStack: [],
    paramRedoStack: [],
    interactionSnapshot: null,
    undoStack: [],
    redoStack: [],

    handleInteractionStart: (mode) => {
        set({ isUserInteracting: true });

        // Case 1: Camera snapshot (gesture start)
        if (mode && typeof mode === 'object' && (mode as any).position) {
            const camState = mode as unknown as CameraState;
            const now = Date.now();
            const elapsed = now - lastCameraUndoPush;

            if (elapsed < CAMERA_UNDO_DEBOUNCE_MS && get().undoStack.length > 0) {
                // Within debounce — keep existing top-of-stack
            } else {
                set((state: any) => {
                    const newStack = [...state.undoStack, camState];
                    return {
                        undoStack: newStack.length > 50 ? newStack.slice(-50) : newStack,
                        redoStack: [],
                    };
                });
                lastCameraUndoPush = now;
            }
            return;
        }

        // Case 2: Parameter snapshot
        const snap = getParamSnapshot(get());
        set({ interactionSnapshot: snap });
    },

    handleInteractionEnd: () => {
        set({ isUserInteracting: false });

        const { interactionSnapshot, aaMode, aaLevel, msaaSamples, dpr } = get();

        const targetDpr = (aaMode === 'Auto' || aaMode === 'Always') ? aaLevel : 1.0;
        if (Math.abs(dpr - targetDpr) > 0.0001) {
            set({ dpr: targetDpr });
            FractalEvents.emit('config', { msaaSamples: (aaMode === 'Auto' || aaMode === 'Always') ? msaaSamples : 1 });
            FractalEvents.emit('reset_accum', undefined);
        }

        if (!interactionSnapshot) return;

        const current = get();
        const diff: Partial<FractalStoreState> = {};
        let hasChanges = false;

        for (const k of Object.keys(interactionSnapshot)) {
            const prev = (interactionSnapshot as any)[k];
            const curr = (current as any)[k];
            if (JSON.stringify(prev) !== JSON.stringify(curr)) {
                (diff as any)[k] = prev;
                hasChanges = true;
            }
        }

        if (hasChanges) {
            set((state: any) => {
                const newStack = [...state.paramUndoStack, diff];
                return {
                    paramUndoStack: newStack.length > 50 ? newStack.slice(-50) : newStack,
                    paramRedoStack: [],
                    interactionSnapshot: null,
                };
            });
        } else {
            set({ interactionSnapshot: null });
        }
    },

    undoParam: () => {
        const { paramUndoStack, paramRedoStack } = get();
        if (paramUndoStack.length === 0) return;

        const undoItem = paramUndoStack[paramUndoStack.length - 1];
        const newUndo = paramUndoStack.slice(0, -1);
        const redoItem = captureStateForKeys(Object.keys(undoItem), get());

        applyStateRestore(undoItem, set, get);

        set({
            paramUndoStack: newUndo,
            paramRedoStack: [...paramRedoStack, redoItem],
        });
    },

    redoParam: () => {
        const { paramUndoStack, paramRedoStack } = get();
        if (paramRedoStack.length === 0) return;

        const redoItem = paramRedoStack[paramRedoStack.length - 1];
        const newRedo = paramRedoStack.slice(0, -1);
        const undoItem = captureStateForKeys(Object.keys(redoItem), get());

        applyStateRestore(redoItem, set, get);

        set({
            paramUndoStack: [...paramUndoStack, undoItem],
            paramRedoStack: newRedo,
        });
    },

    resetParamHistory: () => {
        set({ paramUndoStack: [], paramRedoStack: [], interactionSnapshot: null });
    },

    undoCamera: () => {
        const { undoStack, redoStack } = get();
        if (undoStack.length === 0) return;
        const prev = undoStack[undoStack.length - 1];
        const newUndo = undoStack.slice(0, -1);
        // Redo captures current camera pose via the store shape directly.
        const curr = { position: { x: 0, y: 0, z: 0 }, rotation: get().cameraRot } as CameraState;
        set({
            undoStack: newUndo,
            redoStack: [...redoStack, curr],
            cameraRot: prev.rotation,
        });
        FractalEvents.emit('reset_accum', undefined);
    },

    redoCamera: () => {
        const { undoStack, redoStack } = get();
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        const newRedo = redoStack.slice(0, -1);
        const curr = { position: { x: 0, y: 0, z: 0 }, rotation: get().cameraRot } as CameraState;
        set({
            undoStack: [...undoStack, curr],
            redoStack: newRedo,
            cameraRot: next.rotation,
        });
        FractalEvents.emit('reset_accum', undefined);
    },
});
