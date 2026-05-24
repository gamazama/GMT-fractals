import React, { useSyncExternalStore } from 'react';
import { FeedbackModal } from './FeedbackModal';
import type { MenuItem } from '../../engine/plugins/Menu';

// ── Singleton open/close state ────────────────────────────────────────
//
// The Help menu popover unmounts when an item is clicked. If the modal
// lived inside the menu item, its useState would unmount too and the
// modal would never appear. So we lift "is the modal open" to a module
// singleton, drive opens from the menu item via openFeedback(), and
// render the modal from <FeedbackOverlay /> mounted at the app root.

let _open = false;
const _subs = new Set<() => void>();
const _subscribe = (fn: () => void) => { _subs.add(fn); return () => { _subs.delete(fn); }; };
const _snapshot  = () => _open;
const _set       = (v: boolean) => { _open = v; _subs.forEach((fn) => fn()); };

export const openFeedback  = () => _set(true);
export const closeFeedback = () => _set(false);

// ── Overlay ───────────────────────────────────────────────────────────

export const FeedbackOverlay: React.FC = () => {
    const open = useSyncExternalStore(_subscribe, _snapshot, _snapshot);
    return <FeedbackModal open={open} onClose={closeFeedback} />;
};

// ── Menu icon + item ──────────────────────────────────────────────────

const MailIcon: React.FC = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);

/**
 * MenuItem suitable for `installHelp({ extraItems: [feedbackMenuItem()] })`.
 *
 * The id is fixed so re-registering replaces the prior entry rather than
 * duplicating it. Customize via the small option bag if you want to drop
 * it into a non-Help menu under a different id.
 */
export const feedbackMenuItem = (opts: { id?: string; label?: string } = {}): MenuItem => ({
    id: opts.id ?? 'feedback',
    type: 'button',
    label: opts.label ?? 'Send Feedback',
    icon: <MailIcon />,
    title: 'Report a bug, request a feature, or ask for help',
    onSelect: () => openFeedback(),
});
