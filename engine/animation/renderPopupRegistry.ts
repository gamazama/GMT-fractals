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

export type RenderPopupComponent = React.ComponentType<{ onClose: () => void }>;

let renderPopupComponent: RenderPopupComponent | null = null;
const listeners = new Set<() => void>();

export function registerRenderPopup(component: RenderPopupComponent | null): void {
    renderPopupComponent = component;
    listeners.forEach(l => l());
}

export function getRenderPopup(): RenderPopupComponent | null {
    return renderPopupComponent;
}

export function subscribeRenderPopup(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
