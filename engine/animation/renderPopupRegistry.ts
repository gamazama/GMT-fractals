/**
 * Render Popup Registry
 * ─────────────────────
 * The shared `<TimelineToolbar>` has a "Render" button. The actual
 * video-export dialog is app-specific (GMT's legacy `RenderPopup` was
 * 1046 lines of pipeline-specific code and was intentionally stripped
 * during engine extraction). Apps register their own component; if
 * nothing is registered the Render button is hidden.
 */
import type React from 'react';
import { createSingleSlot } from '../../store/createSingleSlot';

export type RenderPopupComponent = React.ComponentType<{ onClose: () => void }>;

/** Last-writer-wins host slot for the app's Render dialog component. */
const slot = createSingleSlot<RenderPopupComponent>();

export function registerRenderPopup(component: RenderPopupComponent | null): void {
    slot.set(component);
}

export function getRenderPopup(): RenderPopupComponent | null {
    return slot.get();
}

export function subscribeRenderPopup(cb: () => void): () => void {
    return slot.subscribe(cb);
}
