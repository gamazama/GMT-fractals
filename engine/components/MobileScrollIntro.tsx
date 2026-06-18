/**
 * Pre-shell banner shown on mobile that adds enough scroll capacity to
 * the page that swiping up collapses the browser address bar. Once the
 * user scrolls past it, the sticky `<MobileViewportShell>` below locks
 * and fills the screen.
 *
 * Renders nothing on desktop. Render before `<MobileViewportShell>`:
 *
 *   {!isLoadingVisible && <MobileScrollIntro />}
 *   <MobileViewportShell>...</MobileViewportShell>
 *
 * The mechanism: this banner is `100svh` tall (the *small* viewport,
 * i.e. the height with the address bar visible). The shell below is
 * `100dvh`. Their combined height always exceeds the visible viewport
 * by at least the address-bar height, so the body has scroll capacity.
 * Swipe up → address bar retracts → sticky shell takes over.
 */

import React from 'react';
import { ChevronDown } from '../../components/Icons2';
import { useMobileLayout } from '../../hooks/useMobileLayout';

interface MobileScrollIntroProps {
    /** App name shown in the intro. Defaults to "GMT". Used as the text
     *  fallback / aria label when `logo` is not supplied. */
    title?: string;
    /** Subtitle / hint line. Defaults to "Swipe up to enter". */
    subtitle?: string;
    /** Brand slot — when provided, renders this (e.g. an app's vector
     *  wordmark) instead of the plain `title` text. Keeps engine-core
     *  domain-agnostic: the app supplies its own logo. */
    logo?: React.ReactNode;
}

/**
 * @invariant Must render BEFORE `<MobileViewportShell>` in DOM order
 *   (see top-of-file comment lines 7-9). The sticky-shell-after-scroll
 *   mechanism depends on this banner contributing pre-shell scroll
 *   height; reversing order breaks the address-bar collapse trick.
 * @invariant Banner uses `100svh` (small viewport); shell uses
 *   `100dvh` (dynamic viewport). The pairing gives the body scroll
 *   capacity exceeding the visible viewport by at least the
 *   address-bar height — that IS the collapse mechanism. Both heights
 *   are load-bearing; do not interchange with `vh`. See ADR-0039.
 * @invariant Carries `scrollSnapAlign: 'start'` — the open-state snap
 *   target for the host body's `scroll-snap-type: y mandatory`. Pairs
 *   with the sticky shell's snap-start so the body's only scroll rests
 *   either here (splash) or on the fullscreen shell, never between.
 */
export const MobileScrollIntro: React.FC<MobileScrollIntroProps> = ({
    title = 'GMT',
    subtitle = 'Swipe up to enter',
    logo,
}) => {
    // Intentionally `isDeviceMobile`, not `isMobile` — the address-bar
    // collapse trick has no purpose on a desktop browser, and rendering
    // a 100svh banner there would deadlock (desktop body has
    // overflow:hidden so there's no scroll past it). Force Mobile UI on
    // a desktop still gets the rest of the mobile layout, just not
    // this banner.
    const { isDeviceMobile } = useMobileLayout();
    if (!isDeviceMobile) return null;

    return (
        <div
            className="w-full flex flex-col items-center justify-center bg-black text-white text-center px-8"
            style={{ height: '100svh', scrollSnapAlign: 'start' }}
        >
            {logo ?? <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>}
            <p className="text-gray-500 text-sm font-mono mt-2 mb-8">{subtitle}</p>
            <div className="text-cyan-400 animate-bounce">
                <ChevronDown size={32} />
            </div>
        </div>
    );
};
