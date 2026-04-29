/**
 * @engine/pwa-update — generic Service Worker update prompt plugin.
 *
 * When VitePWA registers a new service worker, it waits in the
 * "installed" state until the page acknowledges the update. This plugin
 * surfaces that state as a small amber TopBar pill: clicking it tells
 * the new SW to skip waiting, then reloads. A hard fallback (unregister
 * + reload) catches the rare case where the skipWaiting message
 * doesn't land.
 *
 * Requires `vite-plugin-pwa` configured in vite.config.ts. Without it
 * the `virtual:pwa-register/react` import will fail at build time —
 * apps that don't ship as a PWA shouldn't install this plugin.
 *
 * Install once at app boot:
 *
 *   import { installPwaUpdate } from '../engine/plugins/PwaUpdate';
 *   installPwaUpdate();
 */

import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { topbar } from './TopBar';

const HOURLY = 60 * 60 * 1000;

const PwaUpdateButton: React.FC = () => {
    const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
        onRegisteredSW(_swUrl, registration) {
            if (!registration) return;
            setInterval(() => { registration.update().catch(() => {}); }, HOURLY);
        },
    });

    if (!needRefresh) return null;

    const handleApply = async () => {
        const fallback = setTimeout(async () => {
            try {
                const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
                await Promise.all(regs.map((r) => r.unregister()));
            } catch {}
            window.location.reload();
        }, 1500);
        try {
            await updateServiceWorker(true);
        } catch {
            clearTimeout(fallback);
            window.location.reload();
        }
    };

    return (
        <button
            type="button"
            onClick={handleApply}
            title="App update available — click to reload"
            className="px-2 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-colors text-[10px] font-bold flex items-center gap-1.5"
        >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Update
        </button>
    );
};

let _installed = false;

export interface InstallPwaUpdateOptions {
    /** TopBar slot. Default 'right'. */
    slot?: 'left' | 'center' | 'right';
    /** TopBar order within slot. Default -100 (renders before fps/adaptive). */
    order?: number;
}

export const installPwaUpdate = (options: InstallPwaUpdateOptions = {}) => {
    if (_installed) return;
    _installed = true;
    topbar.register({
        id: 'pwa-update',
        slot: options.slot ?? 'right',
        order: options.order ?? -100,
        component: PwaUpdateButton,
    });
};

export const uninstallPwaUpdate = () => {
    topbar.unregister('pwa-update');
    _installed = false;
};
