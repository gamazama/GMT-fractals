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
    /** Topbar slot for the profile chip. Default 'right'. */
    slot?: 'left' | 'center' | 'right';
    /** Order within the slot. Default 60 — places it after Help (40). */
    order?: number;
}

export const installAuth = (options: InstallAuthOptions = {}) => {
    if (_installed) return;
    _installed = true;

    topbar.register({
        id: 'auth-widget',
        slot: options.slot ?? 'right',
        order: options.order ?? 60,
        component: AuthTopbarWidget,
    });
};

export const uninstallAuth = () => {
    topbar.unregister('auth-widget');
    _installed = false;
};
