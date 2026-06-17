/**
 * @engine-gmt/auth — Supabase Auth integration for GMT.
 *
 * Mounts a profile chip (or "Sign in" button) in the topbar's right slot
 * and exports overlay components for the app to mount near the other
 * full-screen UIs (HelpOverlay, GalleryOverlay, etc.).
 *
 * Phase 2B: email + password, Google OAuth, password reset. Username
 * required at signup; admin-only at backend/admin/. Phase 2C adds avatar
 * upload, profile pages, etc.
 */
import React from 'react';
import { topbar } from '../../engine/plugins/TopBar';
import { AuthTopbarWidget } from './AuthTopbarWidget';
import { AuthOverlay } from './AuthOverlay';
import { AccountPanel } from './AccountPanel';
import { useAuthStore } from './authStore';

export const AuthOverlayHost: React.FC = () => {
    const open  = useAuthStore((s) => s.isAuthModalOpen);
    const close = useAuthStore((s) => s.closeAuthModal);
    return <AuthOverlay open={open} onClose={close} />;
};

export const AccountPanelHost: React.FC = () => <AccountPanel />;

let _installed = false;

export interface InstallAuthOptions {
    /** Topbar slot for the profile chip. Default 'left' — placed right
     *  after GmtLogo (order -10) so the auth state is visible at a glance
     *  without scanning the whole topbar. */
    slot?: 'left' | 'center' | 'right';
    /** Order within the slot. Default 0 — sits between the logo and the
     *  first divider (which is at order 1 in registerGmtTopbar). */
    order?: number;
    /** Optional visibility predicate (TopBar `when:`). GMT passes
     *  `() => !isMobileSnapshot()` to hide the avatar on mobile, where the
     *  narrow topbar can't fit it without burying the System menu. */
    when?: () => boolean;
}

export const installAuth = (options: InstallAuthOptions = {}) => {
    if (_installed) return;
    _installed = true;

    topbar.register({
        id: 'auth-widget',
        slot: options.slot ?? 'left',
        order: options.order ?? 0,
        component: AuthTopbarWidget,
        when: options.when,
    });
};

export const uninstallAuth = () => {
    topbar.unregister('auth-widget');
    _installed = false;
};
