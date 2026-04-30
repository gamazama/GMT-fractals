/**
 * HistorySlice — per-scope undo/redo stacks.
 *
 * Each scope owns its own pair of stacks (param, camera). This replaces
 * an earlier "unified stack with scope tags" design that conflated
 * lanes whenever the public undo() was called without a scope: a
 * camera gesture sitting on top of the shared stack would get popped
 * by a parameter-undo keystroke (or a topbar Undo click) intended to
 * roll back a slider tweak.
 *
 * Public API surface:
 *
 *   beginParamTransaction()       — snapshot every feature slice + scene
 *                                    fields. Pair with endParamTransaction().
 *   endParamTransaction()         — diff against the snapshot, push if changed.
 *   pushCameraTransaction(state)  — typed entry point for camera gestures
 *                                    (debounced at CAMERA_UNDO_DEBOUNCE_MS).
 *
 *   undo(scope)                   — pop newest in that scope's undo stack.
 *   redo(scope)                   — symmetric.
 *   canUndo(scope) / canRedo(scope) / peekUndo(scope) / peekRedo(scope)
 *
 *   clearHistory()                — reset all four stacks.
 *
 * Backward-compat shims (kept for existing call sites):
 *   handleInteractionStart(mode?) — routes to beginParamTransaction.
 *                                    The CameraState overload is gone;
 *                                    callers that record camera moves must
 *                                    use pushCameraTransaction directly.
 *   handleInteractionEnd()         — routes to endParamTransaction.
 *   undoParam / redoParam          — undo('param') / redo('param').
 *   undoCamera / redoCamera        — undo('camera') / redo('camera').
 *
 * Animation history is intentionally separate (lives in animationStore;
 * the F2b unification never landed). Engine-core's Undo plugin routes
 * Mod+Z under the 'timeline-hover' shortcut scope to that store.
 */

import { StateCreator } from 'zustand';
import { EngineStoreState, EngineActions, CameraState } from '../../types';
import { FractalEvents } from '../../engine/FractalEvents';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { featureRegistry } from '../../engine/FeatureSystem';

export type UndoScope = 'param' | 'camera';

export interface Transaction {
    scope: UndoScope;
    label?: string;
    /** Diff snapshot: only keys that changed. Undo applies this; redo
     *  captures the current state of the same keys. */
    diff: Partial<EngineStoreState>;
    /** Origin timestamp (ms) for debug / debounce. */
    timestamp: number;
}

export interface HistorySliceState {
    paramUndoStack: Transaction[];
    paramRedoStack: Transaction[];
    cameraUndoStack: Transaction[];
    cameraRedoStack: Transaction[];
    /** Pre-interaction snapshot captured by beginParamTransaction. */
    interactionSnapshot: Partial<EngineStoreState> | null;
}

export interface HistorySliceActions {
    undo: (scope: UndoScope) => boolean;
    redo: (scope: UndoScope) => boolean;
    canUndo: (scope: UndoScope) => boolean;
    canRedo: (scope: UndoScope) => boolean;
    peekUndo: (scope: UndoScope) => Transaction | null;
    peekRedo: (scope: UndoScope) => Transaction | null;
    clearHistory: () => void;

    // Canonical entry points.
    beginParamTransaction: () => void;
    endParamTransaction: () => void;
    pushCameraTransaction: (state: CameraState) => void;

    // Backward-compat shims.
    handleInteractionStart: (mode?: 'camera' | 'param' | CameraState) => void;
    handleInteractionEnd: () => void;
    undoParam: () => void;
    redoParam: () => void;
    undoCamera: () => void;
    redoCamera: () => void;
    resetParamHistory: () => void;
}

export type HistorySlice = HistorySliceState & HistorySliceActions;

/** Snapshots every registered feature's slice state + any top-level
 *  preset-round-trippable fields. Generic: iterates the feature
 *  registry so new features are captured automatically. */
const getParamSnapshot = (s: EngineStoreState): Partial<EngineStoreState> => {
    const snap: Partial<EngineStoreState> = {
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

const captureStateForKeys = (keys: string[], current: EngineStoreState): Partial<EngineStoreState> => {
    const snap: Partial<EngineStoreState> = {};
    for (const k of keys) {
        (snap as any)[k] = (current as any)[k];
    }
    return snap;
};

const applyStateRestore = (data: Partial<EngineStoreState>, set: any, get: any) => {
    const actions = get();
    set(data);
    for (const k of Object.keys(data)) {
        const val = (data as any)[k];
        if (k === 'formula') { FractalEvents.emit('config', { formula: val }); continue; }
        const setterName = 'set' + k.charAt(0).toUpperCase() + k.slice(1);
        if (typeof actions[setterName] === 'function') actions[setterName](val);
    }
    engine.resetAccumulation();
};

const MAX_STACK = 50;
const CAMERA_UNDO_DEBOUNCE_MS = 1500;
let lastCameraUndoPush = 0;

const stackKeys = (scope: UndoScope) => scope === 'camera'
    ? { undo: 'cameraUndoStack' as const, redo: 'cameraRedoStack' as const }
    : { undo: 'paramUndoStack' as const, redo: 'paramRedoStack' as const };

const trim = (arr: Transaction[]): Transaction[] =>
    arr.length > MAX_STACK ? arr.slice(-MAX_STACK) : arr;

export const createHistorySlice: StateCreator<
    EngineStoreState & EngineActions & HistorySlice,
    [["zustand/subscribeWithSelector", never]],
    [],
    HistorySlice
> = (set, get) => ({
    paramUndoStack: [],
    paramRedoStack: [],
    cameraUndoStack: [],
    cameraRedoStack: [],
    interactionSnapshot: null,

    // ── Canonical entry points ──────────────────────────────────────────

    beginParamTransaction: () => {
        set({ isUserInteracting: true });
        set({ interactionSnapshot: getParamSnapshot(get()) });
    },

    endParamTransaction: () => {
        set({ isUserInteracting: false });

        const { interactionSnapshot, aaMode, aaLevel, msaaSamples, dpr } = get() as any;

        // Restore DPR to interactive baseline.
        const targetDpr = (aaMode === 'Auto' || aaMode === 'Always') ? aaLevel : 1.0;
        if (Math.abs(dpr - targetDpr) > 0.0001) {
            set({ dpr: targetDpr });
            FractalEvents.emit('config', { msaaSamples: (aaMode === 'Auto' || aaMode === 'Always') ? msaaSamples : 1 });
            FractalEvents.emit('reset_accum', undefined);
        }

        if (!interactionSnapshot) return;

        const current = get();
        const diff: Partial<EngineStoreState> = {};
        let hasChanges = false;
        for (const k of Object.keys(interactionSnapshot)) {
            const prev = (interactionSnapshot as any)[k];
            const curr = (current as any)[k];
            if (JSON.stringify(prev) !== JSON.stringify(curr)) {
                (diff as any)[k] = prev;
                hasChanges = true;
            }
        }

        if (!hasChanges) {
            set({ interactionSnapshot: null });
            return;
        }

        const tx: Transaction = { scope: 'param', diff, timestamp: Date.now() };
        set((state: any) => ({
            paramUndoStack: trim([...state.paramUndoStack, tx]),
            paramRedoStack: [],
            interactionSnapshot: null,
        }));
    },

    pushCameraTransaction: (camState) => {
        // A camera gesture is starting — flag the interactive state so the
        // engine can drop quality. Cleared by endParamTransaction (or its
        // handleInteractionEnd shim) on gesture end.
        set({ isUserInteracting: true });

        const now = Date.now();
        const elapsed = now - lastCameraUndoPush;
        // Single orbit drag collapses into one transaction via the debounce
        // window — only suppressed if a camera entry already exists.
        if (elapsed < CAMERA_UNDO_DEBOUNCE_MS && get().cameraUndoStack.length > 0) {
            return;
        }
        const tx: Transaction = {
            scope: 'camera',
            label: 'Camera gesture',
            diff: {
                cameraRot: camState.rotation,
                ...(camState.sceneOffset !== undefined ? { sceneOffset: camState.sceneOffset } : {}),
                ...(camState.targetDistance !== undefined ? { targetDistance: camState.targetDistance } : {}),
            } as Partial<EngineStoreState>,
            timestamp: now,
        };
        set((state: any) => ({
            cameraUndoStack: trim([...state.cameraUndoStack, tx]),
            cameraRedoStack: [],
        }));
        lastCameraUndoPush = now;
    },

    // ── Scoped undo / redo ─────────────────────────────────────────────

    undo: (scope) => {
        const keys = stackKeys(scope);
        const undoStack = (get() as any)[keys.undo] as Transaction[];
        if (undoStack.length === 0) return false;

        const tx = undoStack[undoStack.length - 1];
        const txKeys = Object.keys(tx.diff);
        const redoDiff = captureStateForKeys(txKeys, get());
        const redoTx: Transaction = { scope: tx.scope, label: tx.label, diff: redoDiff, timestamp: Date.now() };

        applyStateRestore(tx.diff, set, get);

        set((state: any) => ({
            [keys.undo]: state[keys.undo].slice(0, -1),
            [keys.redo]: [...state[keys.redo], redoTx],
        }));
        return true;
    },

    redo: (scope) => {
        const keys = stackKeys(scope);
        const redoStack = (get() as any)[keys.redo] as Transaction[];
        if (redoStack.length === 0) return false;

        const tx = redoStack[redoStack.length - 1];
        const txKeys = Object.keys(tx.diff);
        const undoDiff = captureStateForKeys(txKeys, get());
        const undoTx: Transaction = { scope: tx.scope, label: tx.label, diff: undoDiff, timestamp: Date.now() };

        applyStateRestore(tx.diff, set, get);

        set((state: any) => ({
            [keys.undo]: [...state[keys.undo], undoTx],
            [keys.redo]: state[keys.redo].slice(0, -1),
        }));
        return true;
    },

    canUndo: (scope) => ((get() as any)[stackKeys(scope).undo] as Transaction[]).length > 0,
    canRedo: (scope) => ((get() as any)[stackKeys(scope).redo] as Transaction[]).length > 0,
    peekUndo: (scope) => {
        const st = (get() as any)[stackKeys(scope).undo] as Transaction[];
        return st.length === 0 ? null : st[st.length - 1];
    },
    peekRedo: (scope) => {
        const st = (get() as any)[stackKeys(scope).redo] as Transaction[];
        return st.length === 0 ? null : st[st.length - 1];
    },
    clearHistory: () => set({
        paramUndoStack: [],
        paramRedoStack: [],
        cameraUndoStack: [],
        cameraRedoStack: [],
        interactionSnapshot: null,
    }),

    // ── Backward-compat shims ──────────────────────────────────────────

    handleInteractionStart: (mode) => {
        // The legacy CameraState overload is gone; route the typed
        // case to pushCameraTransaction so anything still passing a
        // camera state object keeps working until callers migrate.
        if (mode && typeof mode === 'object' && (mode as any).position) {
            get().pushCameraTransaction(mode as CameraState);
            return;
        }
        get().beginParamTransaction();
    },
    handleInteractionEnd: () => { get().endParamTransaction(); },
    undoParam: () => { get().undo('param'); },
    redoParam: () => { get().redo('param'); },
    undoCamera: () => { get().undo('camera'); },
    redoCamera: () => { get().redo('camera'); },
    resetParamHistory: () => { get().clearHistory(); },
});
