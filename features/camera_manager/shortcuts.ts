
import { useFractalStore } from '../../store/fractalStore';

/**
 * Camera slot keyboard shortcuts.
 *
 * Ctrl+1-9  — Save current view to slot N (creates if empty, overwrites if occupied)
 * 1-9       — Recall camera from slot N
 *
 * Returns true if the event was consumed so the caller can early-return.
 * Registered via useKeyboardShortcuts (capture phase, after text-input guard).
 */
export function handleCameraSlotShortcut(e: KeyboardEvent): boolean {
    if (e.shiftKey || e.altKey) return false;

    const digitMatch = e.code.match(/^Digit([1-9])$/);
    if (!digitMatch) return false;

    const slotIndex = parseInt(digitMatch[1]) - 1;
    const isCtrl = e.ctrlKey || e.metaKey;

    if (isCtrl) {
        e.preventDefault();
        e.stopPropagation();
        useFractalStore.getState().saveToSlot(slotIndex);
        return true;
    }

    // No modifier — recall slot. Consume the key regardless so digits never
    // fall through to other handlers, even when the slot is empty.
    const cameras = useFractalStore.getState().savedCameras;
    if (slotIndex < cameras.length) {
        e.preventDefault();
        e.stopPropagation();
        useFractalStore.getState().selectCamera(cameras[slotIndex].id);
    }
    return true;
}
