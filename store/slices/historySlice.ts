
import { StateCreator } from 'zustand';
import * as THREE from 'three';
import { FractalStoreState, FractalActions, CameraState } from '../../types';
import { FractalEvents } from '../../engine/FractalEvents';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { featureRegistry } from '../../engine/FeatureSystem';

export interface HistorySliceState {
    paramUndoStack: Partial<FractalStoreState>[];
    paramRedoStack: Partial<FractalStoreState>[];
    interactionSnapshot: Partial<FractalStoreState> | null;
}

export interface HistorySliceActions {
    undoParam: () => void;
    redoParam: () => void;
    resetParamHistory: () => void;
    handleInteractionStart: (mode?: 'camera' | 'param' | CameraState) => void;
    handleInteractionEnd: () => void;
}

export type HistorySlice = HistorySliceState & HistorySliceActions;

const getParamSnapshot = (s: FractalStoreState): Partial<FractalStoreState> => {
    // 1. Snapshot Core Systems (Non-DDFS)
    const snap: Partial<FractalStoreState> = {
        formula: s.formula,
        pipeline: s.pipeline,
        // Legacy lights removal: lights are now handled via 'lighting' feature slice below
        renderRegion: s.renderRegion ? { ...s.renderRegion } : null
    };

    // 2. Dynamic Feature Snapshotting
    // Iterates registry to automatically capture all registered features (CoreMath, Fog, Materials, etc.)
    // This removes the need to manually update this file when adding new features.
    const features = featureRegistry.getAll();
    features.forEach(feat => {
        // @ts-expect-error — DDFS dynamic slice key access
        const featureState = s[feat.id];
        if (featureState) {
            // Deep copy the feature state to prevent reference mutations in the stack
            // @ts-expect-error — DDFS dynamic slice key assignment
            snap[feat.id] = JSON.parse(JSON.stringify(featureState));
        }
    });

    return snap;
};

const applyStateRestore = (data: Partial<FractalStoreState>, set: any, get: any) => {
    const actions = get();

    // 1. Bulk Update UI State
    set(data);
    
    // 2. Trigger Side-Effects via Actions
    Object.keys(data).forEach(k => {
        const key = k as keyof FractalStoreState;
        const val = data[key];

        // --- Special Handling ---
        if (key === 'formula') {
            FractalEvents.emit('config', { formula: val as any });
            return;
        }

        // --- Generic Feature Restoration ---
        // If the key corresponds to a feature, call its specific setter
        // This ensures 'uniform' events are emitted to the Engine
        const featureSetter = 'set' + key.charAt(0).toUpperCase() + key.slice(1);
        if (typeof actions[featureSetter] === 'function') {
            actions[featureSetter](val);
            return;
        }

        if (key === 'pipeline') { actions.setPipeline(val); return; }
        if (key === 'graph') { actions.setGraph(val); return; }

        // --- Generic Actions for remaining root props ---
        // This is fallback for things like setParamA etc.
        const setterName = 'set' + key.charAt(0).toUpperCase() + key.slice(1);
        if (typeof actions[setterName] === 'function' && !featureRegistry.get(key)) {
            actions[setterName](val);
        }
    });

    // 3. Force Render Reset
    engine.resetAccumulation();
};

// Minimum interval between camera undo pushes (ms).
// Prevents micro-pauses during a single orbit/fly gesture from creating
// multiple undo entries.  If a new snapshot arrives within this window,
// the previous entry is *replaced* rather than a new one pushed.
const CAMERA_UNDO_DEBOUNCE_MS = 1500;
let lastCameraUndoPush = 0;

export const createHistorySlice: StateCreator<FractalStoreState & FractalActions & HistorySlice, [["zustand/subscribeWithSelector", never]], [], HistorySlice> = (set, get) => ({
    paramUndoStack: [],
    paramRedoStack: [],
    interactionSnapshot: null,

    handleInteractionStart: (mode) => {
        // Set interaction flag
        set({ isUserInteracting: true });

        // Case 1: Camera Snapshot
        if (mode && typeof mode === 'object' && (mode as any).position) {
            const camState = mode as unknown as CameraState;
            const now = Date.now();
            const elapsed = now - lastCameraUndoPush;

            if (elapsed < CAMERA_UNDO_DEBOUNCE_MS && get().undoStack.length > 0) {
                // Within debounce window — replace the last entry instead of
                // pushing a new one.  The last entry already holds the "before"
                // state from the original gesture start; the user hasn't had
                // time to settle, so we keep that original snapshot.
                // (no-op: the existing top-of-stack is already correct)
            } else {
                // New gesture — push a fresh undo entry (capped at 50)
                set((state) => {
                    const newStack = [...state.undoStack, camState];
                    return {
                        undoStack: newStack.length > 50 ? newStack.slice(-50) : newStack,
                        redoStack: []
                    };
                });
                lastCameraUndoPush = now;
            }
            return;
        }

        // Case 2: Parameter Snapshot
        const snap = getParamSnapshot(get());
        set({ interactionSnapshot: snap });
    },

    handleInteractionEnd: () => {
        // Clear interaction flag
        set({ isUserInteracting: false });

        const { interactionSnapshot, aaMode, aaLevel, msaaSamples, dpr } = get();

        let targetDpr = (aaMode === 'Auto' || aaMode === 'Always') ? aaLevel : 1.0; 
        if (Math.abs(dpr - targetDpr) > 0.0001) { 
            set({ dpr: targetDpr }); 
            FractalEvents.emit('config', { msaaSamples: (aaMode === 'Auto' || aaMode === 'Always') ? msaaSamples : 1 }); 
            FractalEvents.emit('reset_accum', undefined); 
        }

        if (!interactionSnapshot) return;

        const current = get();
        const diff: Partial<FractalStoreState> = {};
        let hasChanges = false;
        
        Object.keys(interactionSnapshot).forEach(k => {
            const key = k as keyof FractalStoreState;
            const prevVal = interactionSnapshot[key];
            const currVal = current[key];
            
            if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
                // @ts-expect-error — DDFS dynamic diff key assignment
                diff[key] = prevVal; 
                hasChanges = true;
            }
        });

        if (hasChanges) {
            set(state => {
                const newStack = [...state.paramUndoStack, diff];
                return {
                    paramUndoStack: newStack.length > 50 ? newStack.slice(-50) : newStack,
                    paramRedoStack: [],
                    interactionSnapshot: null
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
        
        const current = get();
        const redoItem: Partial<FractalStoreState> = {};
        Object.keys(undoItem).forEach(k => {
            // @ts-expect-error — DDFS dynamic key access for redo snapshot
            redoItem[k] = current[k];
        });

        applyStateRestore(undoItem, set, get);

        set({
            paramUndoStack: newUndo,
            paramRedoStack: [...paramRedoStack, redoItem]
        });
    },

    redoParam: () => {
        const { paramUndoStack, paramRedoStack } = get();
        if (paramRedoStack.length === 0) return;

        const redoItem = paramRedoStack[paramRedoStack.length - 1];
        const newRedo = paramRedoStack.slice(0, -1);
        
        const current = get();
        const undoItem: Partial<FractalStoreState> = {};
        Object.keys(redoItem).forEach(k => {
            // @ts-expect-error — DDFS dynamic key access for undo snapshot
            undoItem[k] = current[k];
        });

        applyStateRestore(redoItem, set, get);

        set({
            paramUndoStack: [...paramUndoStack, undoItem],
            paramRedoStack: newRedo
        });
    },

    resetParamHistory: () => {
        set({ paramUndoStack: [], paramRedoStack: [], interactionSnapshot: null });
    }
});
