/**
 * @engine/pwa-update — the "a new version is ready" button, and the service worker's registration.
 *
 * THE UPDATE MODEL (vite.config.ts, decided 2026-06-17, suite-wide): workbox `skipWaiting` +
 * `clientsClaim`. A returning visitor gets the version their browser cached last time; the browser
 * fetches the new build in the background and the new worker TAKES OVER AT ONCE, purging the old
 * precache. The page already on screen keeps running the old code — the new version only shows on
 * the next reload. Silent, that read as "I reloaded and nothing changed" (owner, 2026-09-26).
 *
 * So this plugin shows a small amber **Update** pill in the topbar when a new version has taken over
 * the page (`controllerchange` while the page already had a controller). A click reloads onto it.
 * It never reloads by itself: an automatic reload would give every user a double load on every
 * deploy, and could land under unsaved work (owner, 2026-09-26: "not sold on reloading
 * automatically").
 *
 * Seams:
 *   - `installPwaUpdate()` registers the pill in the topbar and starts watching. The worker itself is
 *     registered by `useRegisterSW` (vite-plugin-pwa's virtual module) when the pill mounts, which
 *     also checks for an update hourly.
 *   - The watch starts at INSTALL time, not at mount: a takeover that lands before React has
 *     rendered must still count.
 *
 * Pitfalls:
 *   - A FIRST visit also fires `controllerchange` (`clientsClaim` claims the page the moment the
 *     first worker activates). That is not an update, so the pill only counts a change when the
 *     page already had a controller at load (`hadControllerAtLoad`).
 *   - `needRefresh` (a worker WAITING to take over) can never be true under `skipWaiting`; it stays
 *     wired only so the pill still works if that config ever changes.
 *   - The service worker is disabled on the dev server (`devOptions.enabled: false`), so none of this
 *     runs in `npm run dev`. The guard builds and serves the app: `npm run smoke:pwa-update`.
 *
 * Requires `vite-plugin-pwa` configured in vite.config.ts. Without it the
 * `virtual:pwa-register/react` import will fail at build time — apps that don't ship as a PWA
 * shouldn't install this plugin.
 *
 *   import { installPwaUpdate } from '../engine/plugins/PwaUpdate';
 *   installPwaUpdate();
 */

import React, { useSyncExternalStore } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { topbar } from './TopBar';

const HOURLY = 60 * 60 * 1000;

// ── "a new version took over this page" ────────────────────────────────────────────────────────
let _takenOver = false;
const _listeners = new Set<() => void>();
const subscribe = (l: () => void): (() => void) => { _listeners.add(l); return () => { _listeners.delete(l); }; };
const getTakenOver = (): boolean => _takenOver;

let _watching = false;
const watchForTakeover = (): void => {
    if (_watching) return;
    _watching = true;
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
    if (!sw) return;
    // Captured now, at install: a first visit has no controller yet, and its first claim is not an update.
    const hadControllerAtLoad = !!sw.controller;
    sw.addEventListener('controllerchange', () => {
        if (!hadControllerAtLoad || _takenOver) return;
        _takenOver = true;
        _listeners.forEach((l) => l());
    });
};

const PwaUpdateButton: React.FC = () => {
    const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
        onRegisteredSW(_swUrl, registration) {
            if (!registration) return;
            setInterval(() => { registration.update().catch(() => {}); }, HOURLY);
        },
    });
    const takenOver = useSyncExternalStore(subscribe, getTakenOver, getTakenOver);

    if (!needRefresh && !takenOver) return null;

    const handleApply = async () => {
        // The new version already controls the page — loading it is just a reload.
        if (takenOver) { window.location.reload(); return; }
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
            title="A new version is ready — click to reload. Save first if you have unsaved work."
            data-pwa-update=""
            className="px-2 py-1 rounded bg-warn/15 border border-warn/30 text-warn hover:bg-warn/25 transition-colors text-[10px] font-bold flex items-center gap-1.5"
        >
            <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse" />
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
    watchForTakeover();
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
