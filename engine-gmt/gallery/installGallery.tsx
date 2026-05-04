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

export { GalleryPage as GalleryOverlay } from './GalleryPage';

const GalleryIcon: React.FC = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <path d="M10 7h4" />
        <path d="M17 10v4" />
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
};

export const uninstallGallery = (menuId = 'file') => {
    menu.unregisterItem(menuId, 'browse-gallery');
    _installed = false;
};
