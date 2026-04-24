/**
 * HistorySlice — unified transaction stack with scope labels.
 *
 * One undoStack + one redoStack. Each entry is a Transaction carrying
 * its scope ('param' | 'camera' | 'animation' | 'ui' | string) and a
 * diff-based snapshot (partial store state — only keys that changed).
 *
 * The scope labels replace the previous three-stack design
 * (F2b in docs/20_Fragility_Audit.md). Apps can pop the most recent
 * transaction regardless of scope (undo()), or filter to a specific
 * scope (undo('camera')) — the latter is how the timeline's dedicated
 * Ctrl+Z can skip param entries to operate only on animation edits.
 *
 * Backward-compat API (kept for existing consumers):
 *   handleInteractionStart / handleInteractionEnd — unchanged signature
 *   undoParam / redoParam     — delegate to undo('param') / redo('param')
 *   undoCamera / redoCamera   — delegate to undo('camera') / redo('camera')
 *
 * New unified API:
 *   undo(scope?)       — pop newest matching (or any), apply diff
 *   redo(scope?)       — pop newest matching on redo stack, apply
 *   canUndo(scope?)    — for UI enable/disable
 *   canRedo(scope?)
 *   peekUndo(scope?)   — inspect newest matching
 */

import { StateCreator } from 'zustand';
import { EngineStoreState, EngineActions, CameraState } from '../../types';
import { FractalEvents } from '../../engine/FractalEvents';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { featureRegistry } from '../../engine/FeatureSystem';

export type UndoScope = 'param' | 'camera' | 'animation' | 'ui' | string;

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
    undoStack: Transaction[];
    redoStack: Transaction[];
    /** Pre-interaction snapshot captured by handleInteractionStart. */
    interactionSnapshot: Partial<EngineStoreState> | null;
    /** Scope of the in-progress interaction (drives the eventual commit). */
    interactionScope: UndoScope | null;
}

export interface HistorySliceActions {
    /** Unified undo/redo. Scope arg filters to that scope; omit for
     *  "most recent across any scope". */
    undo: (scope?: UndoScope) => boolean;
    redo: (scope?: UndoScope) => boolean;
    canUndo: (scope?: UndoScope) => boolean;
    canRedo: (scope?: UndoScope) => boolean;
    peekUndo: (scope?: UndoScope) => Transaction | null;
    peekRedo: (scope?: UndoScope) => Transaction | null;
    clearHistory: () => void;

    // Interaction boundary (set by primitives + pointer layers).
    handleInteractionStart: (mode?: 'camera' | 'param' | CameraState) => void;
    handleInteractionEnd: () => void;

    // Backward-compat shims — delegate to the unified API.
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

/** Find index (in the given stack) of newest entry matching scope.
 *  scope undefined → newest of any scope. Returns -1 if none. */
const findMatchIdx = (stack: Transaction[], scope?: UndoScope): number => {
    if (stack.length === 0) return -1;
    if (!scope) return stack.length - 1;
    for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].scope === scope) return i;
    }
    return -1;
};

export const createHistorySlice: StateCreator<
    EngineStoreState & EngineActions & HistorySlice,
    [["zustand/subscribeWithSelector", never]],
    [],
    HistorySlice
> = (set, get) => ({
    undoStack: [],
    redoStack: [],
    interactionSnapshot: null,
    interactionScope: null,

    handleInteractionStart: (mode) => {
        set({ isUserInteracting: true });

        // Camera gesture — immediate push with debounce (matches the
        // previous behaviour; a single orbit drag collapses into one
        // transaction via the debounce window).
        if (mode && typeof mode === 'object' && (mode as any).position) {
            const camState = mode as unknown as CameraState;
            const now = Date.now();
            const elapsed = now - lastCameraUndoPush;

            if (elapsed < CAMERA_UNDO_DEBOUNCE_MS && get().undoStack.some((t) => t.scope === 'camera')) {
                // Within debounce — keep existing camera entry.
            } else {
                const tx: Transaction = {
                    scope: 'camera',
                    label: 'Camera gesture',
                    diff: { cameraRot: camState.rotation } as Partial<EngineStoreState>,
                    timestamp: now,
                };
                set((state: any) => {
                    const next = [...state.undoStack, tx];
                    return {
                        undoStack: next.length > MAX_STACK ? next.slice(-MAX_STACK) : next,
                        redoStack: [],
                    };
                });
                lastCameraUndoPush = now;
            }
            return;
        }

        // Parameter interaction — snapshot now, commit on handleInteractionEnd
        // if anything actually changed.
        const snap = getParamSnapshot(get());
        set({ interactionSnapshot: snap, interactionScope: 'param' });
    },

    handleInteractionEnd: () => {
        set({ isUserInteracting: false });

        const { interactionSnapshot, interactionScope, aaMode, aaLevel, msaaSamples, dpr } = get() as any;

        // Restore DPR to interactive baseline (kept from the original code).
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

        if (hasChanges) {
            const tx: Transaction = {
                scope: (interactionScope as UndoScope) ?? 'param',
                diff,
                timestamp: Date.now(),
            };
            set((state: any) => {
                const next = [...state.undoStack, tx];
                return {
                    undoStack: next.length > MAX_STACK ? next.slice(-MAX_STACK) : next,
                    redoStack: [],
                    interactionSnapshot: null,
                    interactionScope: null,
                };
            });
        } else {
            set({ interactionSnapshot: null, interactionScope: null });
        }
    },

    // ── Unified undo / redo ────────────────────────────────────────────

    undo: (scope) => {
        const { undoStack, redoStack } = get();
        const idx = findMatchIdx(undoStack, scope);
        if (idx === -1) return false;

        const tx = undoStack[idx];
        const keys = Object.keys(tx.diff);
        // Capture current state for these keys → redo entry.
        const redoDiff = captureStateForKeys(keys, get());
        const redoTx: Transaction = { scope: tx.scope, label: tx.label, diff: redoDiff, timestamp: Date.now() };

        applyStateRestore(tx.diff, set, get);

        set({
            undoStack: [...undoStack.slice(0, idx), ...undoStack.slice(idx + 1)],
            redoStack: [...redoStack, redoTx],
        });
        return true;
    },

    redo: (scope) => {
        const { undoStack, redoStack } = get();
        const idx = findMatchIdx(redoStack, scope);
        if (idx === -1) return false;

        const tx = redoStack[idx];
        const keys = Object.keys(tx.diff);
        const undoDiff = captureStateForKeys(keys, get());
        const undoTx: Transaction = { scope: tx.scope, label: tx.label, diff: undoDiff, timestamp: Date.now() };

        applyStateRestore(tx.diff, set, get);

        set({
            undoStack: [...undoStack, undoTx],
            redoStack: [...redoStack.slice(0, idx), ...redoStack.slice(idx + 1)],
        });
        return true;
    },

    canUndo: (scope) => findMatchIdx(get().undoStack, scope) !== -1,
    canRedo: (scope) => findMatchIdx(get().redoStack, scope) !== -1,
    peekUndo: (scope) => {
        const st = get().undoStack;
        const idx = findMatchIdx(st, scope);
        return idx === -1 ? null : st[idx];
    },
    peekRedo: (scope) => {
        const st = get().redoStack;
        const idx = findMatchIdx(st, scope);
        return idx === -1 ? null : st[idx];
    },
    clearHistory: () => set({ undoStack: [], redoStack: [], interactionSnapshot: null, interactionScope: null }),

    // ── Backward-compat shims ──────────────────────────────────────────
    undoParam: () => { get().undo('param'); },
    redoParam: () => { get().redo('param'); },
    undoCamera: () => { get().undo('camera'); },
    redoCamera: () => { get().redo('camera'); },
    resetParamHistory: () => { get().clearHistory(); },
});
