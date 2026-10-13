/**
 * Render Popup Registry
 * ─────────────────────
 * The shared `<TimelineToolbar>` has a "Render" button. The actual
 * video-export dialog is app-specific (GMT's legacy `RenderPopup` was
 * 1046 lines of pipeline-specific code and was intentionally stripped
 * during engine extraction). Apps register their own component; if
 * nothing is registered the Render button is hidden.
 *
 * WHETHER IT IS OPEN lives here too (since 2026-10-11), so that something other than the
 * toolbar's own button can open it: `openRenderPopup()` from a panel button, `closeRenderPopup()`,
 * `isRenderPopupOpen()`. `subscribeRenderPopup` tells of both changes - the component and the
 * open flag - and each getter is a stable snapshot for `useSyncExternalStore`.
 *
 * THE SEAM
 *   - THE TOOLBAR STILL DRAWS THE DIALOG (`components/timeline/TimelineToolbar.tsx`), as a child
 *     of the timeline, exactly where it was drawn before the flag moved here. So the dialog
 *     exists only while the timeline is mounted: `components/TimelineHost.tsx` opens the
 *     timeline when the popup is asked for, and closes the popup when the timeline goes.
 *   - `openRenderPopup()` in an app that mounts no `<TimelineHost>` (or hides it) opens nothing.
 *
 * PITFALL
 *   Closing the timeline takes the dialog with it, also in the middle of a render: the dialog
 *   is the timeline's child. That is how every app has behaved since the dialog was written;
 *   a runner that must not run on unseen has to watch for it (the deep zoomer's does:
 *   `deep-zoom/routeRender.ts`, `dialogClosed`).
 */
import type React from 'react';
import { createSingleSlot } from '../../store/createSingleSlot';

export type RenderPopupComponent = React.ComponentType<{ onClose: () => void }>;

/** Last-writer-wins host slot for the app's Render dialog component. */
const slot = createSingleSlot<RenderPopupComponent>();
/** `true` while the dialog is asked for; null otherwise. */
const open = createSingleSlot<true>();

export function registerRenderPopup(component: RenderPopupComponent | null): void {
    slot.set(component);
}

export function getRenderPopup(): RenderPopupComponent | null {
    return slot.get();
}

/** Listen for a change of the registered component or of the open flag. */
export function subscribeRenderPopup(cb: () => void): () => void {
    const offSlot = slot.subscribe(cb), offOpen = open.subscribe(cb);
    return () => { offSlot(); offOpen(); };
}

/** Ask for the render dialog (see THE SEAM for who shows it). Nothing happens with no component registered. */
export function openRenderPopup(): void {
    if (slot.get()) open.set(true);
}

export function closeRenderPopup(): void {
    open.set(null);
}

export function isRenderPopupOpen(): boolean {
    return open.get() === true;
}
