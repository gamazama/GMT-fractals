
import { StateCreator } from 'zustand';
import * as THREE from 'three';
import { FractalStoreState, FractalActions, CameraState } from '../../types';
import { FractalEvents } from '../../engine/FractalEvents';
import { engine } from '../../engine/FractalEngine';
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
    handleInteractionStart: (mode?: 'camera' | 'param' | CameraState | any) => void;
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
        // @ts-ignore - Accessing dynamic slice key
        const featureState = s[feat.id];
        if (featureState) {
            // Deep copy the feature state to prevent reference mutations in the stack
            // @ts-ignore
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

export const createHistorySlice: StateCreator<FractalStoreState & FractalActions & HistorySlice, [["zustand/subscribeWithSelector", never]], [], HistorySlice> = (set, get) => ({
    paramUndoStack: [],
    paramRedoStack: [],
    interactionSnapshot: null,

    handleInteractionStart: (mode) => {
        // Case 1: Camera Snapshot
        if (mode && typeof mode === 'object' && (mode as any).position) {
            const camState = mode as unknown as CameraState;
            set((state) => ({
                undoStack: [...state.undoStack, camState],
                redoStack: []
            }));
            return;
        }

        // Case 2: Parameter Snapshot
        const snap = getParamSnapshot(get());
        set({ interactionSnapshot: snap });
    },

    handleInteractionEnd: () => {
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
                // @ts-ignore
                diff[key] = prevVal; 
                hasChanges = true;
            }
        });

        if (hasChanges) {
            set(state => ({
                paramUndoStack: [...state.paramUndoStack, diff],
                paramRedoStack: [],
                interactionSnapshot: null
            }));
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
            // @ts-ignore
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
            // @ts-ignore
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
