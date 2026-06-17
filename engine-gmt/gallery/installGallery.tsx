/**
 * @engine-gmt/gallery — online curated gallery plugin.
 *
 * Adds a "Browse Online Gallery" item to the File menu (registered by
 * @engine/scene-io). When clicked, opens a full-screen overlay backed by
 * a Supabase + Cloudflare R2 read-only catalog of curated scenes.
 *
 * The overlay component must be mounted at the app root via the exported
 * `<GalleryOverlay />` (typical spot: next to <HelpOverlay />).
 *
 * Phase 1: read-only, no auth, server-side moderation. See
 * `debug/scratch/41_Gallery_Implementation_Plan.md` (in stable/) for the
 * roadmap to user submissions and social features.
 */
import React from 'react';
import { menu } from '../../engine/plugins/Menu';
import { useGalleryStore } from './galleryStore';
import { SubmitGalleryModal } from './SubmitGalleryModal';

export { GalleryPage as GalleryOverlay } from './GalleryPage';
export { BucketRenderResultModal as BucketRenderResultOverlay } from './BucketRenderResultModal';
export { MySubmissionsOverlay } from './MySubmissionsOverlay';

/**
 * Mounts the submit modal driven by galleryStore.isSubmitOpen.
 * Mount once at app root next to <GalleryOverlay />.
 */
export const SubmitGalleryOverlay: React.FC = () => {
    const isOpen = useGalleryStore((s) => s.isSubmitOpen);
    const close  = useGalleryStore((s) => s.closeSubmit);
    return <SubmitGalleryModal open={isOpen} onClose={close} />;
};

const GalleryIcon: React.FC = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <path d="M10 7h4" />
        <path d="M17 10v4" />
    </svg>
);

const SubmitIcon: React.FC = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="M5 12l7-7 7 7" />
    </svg>
);

let _installed = false;

export interface InstallGalleryOptions {
    /** Menu id to register the entry in. Default 'file' (SceneIO's menu). */
    menuId?: string;
    /** Item order within the menu. Default 25 — sits above Save/Share entries. */
    order?: number;
    /** Item label. Default 'Browse Online Gallery'. */
    label?: string;
}

export const installGallery = (options: InstallGalleryOptions = {}) => {
    if (_installed) return;
    _installed = true;

    menu.registerItem(options.menuId ?? 'file', {
        id: 'browse-gallery',
        type: 'button',
        label: options.label ?? 'Browse Online Gallery',
        icon: <GalleryIcon />,
        order: options.order ?? 25,
        onSelect: () => {
            useGalleryStore.getState().openGallery();
        },
    });

    // "Submit to Gallery" — ALWAYS visible so newcomers discover that
    // publishing exists (it used to be hidden until signed in). The submit
    // modal handles the signed-out state with a sign-in CTA; the real gate
    // (JWT + tier-based slot cap) is enforced server-side.
    menu.registerItem(options.menuId ?? 'file', {
        id: 'submit-gallery',
        type: 'button',
        label: 'Submit to Gallery',
        icon: <SubmitIcon />,
        order: (options.order ?? 25) + 0.5,
        onSelect: () => {
            useGalleryStore.getState().openSubmit();
        },
    });

    // Admin moderation has moved out of the open-source GMT app entirely.
    // The standalone admin site at backend/admin/ (Cloudflare Pages +
    // Cloudflare Access) handles approve / reject / delete via the same
    // moderate-gallery-item Edge Function. See plan 44 §1.11.
};

export const uninstallGallery = (menuId = 'file') => {
    menu.unregisterItem(menuId, 'browse-gallery');
    menu.unregisterItem(menuId, 'submit-gallery');
    _installed = false;
};
