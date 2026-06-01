/**
 * toastStore — minimal app-wide transient toast queue, decoupled from
 * the engine store so any code (menu handlers, save/export paths,
 * gallery submit, worker-adjacent callbacks) can fire a toast without a
 * React context. Mount <ToastHost/> once at the app root to render it.
 *
 * Distinct from <StateLibraryToast/>, which is slot-specific (it reads
 * the `${arrayKey}_savedToast` field a state-library slice writes). This
 * one is for one-off confirmations: "Scene saved", "Snapshot saved",
 * "Export complete", "Submitted for review".
 *
 * Safe to call `showToast()` in an app that never mounts <ToastHost/> —
 * the push is a harmless no-op with nothing subscribed to render it.
 */
import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type ToastTone = 'success' | 'warning' | 'error' | 'info';

export interface AppToast {
    id: string;
    message: string;
    tone: ToastTone;
}

interface ToastState {
    toasts: AppToast[];
    /** Internal — prefer the imperative `showToast()` helper below. */
    _push: (t: AppToast) => void;
    dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    _push: (t) => set((s) => ({ toasts: [...s.toasts, t] })),
    dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/** Default on-screen lifetime. Educational / multi-line messages can
 *  pass a longer duration. */
export const TOAST_DEFAULT_MS = 2600;

/**
 * Fire a transient toast from anywhere — React-free. Auto-dismisses
 * after `durationMs` (the user can also click it to dismiss early).
 */
export function showToast(
    message: string,
    tone: ToastTone = 'success',
    durationMs: number = TOAST_DEFAULT_MS,
): void {
    const id = nanoid();
    useToastStore.getState()._push({ id, message, tone });
    setTimeout(() => useToastStore.getState().dismiss(id), durationMs);
}
