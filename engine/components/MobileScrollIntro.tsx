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
import { useMobileLayout } from '../../hooks/useMobileLayout';

interface MobileScrollIntroProps {
    /** App name shown in the intro. Defaults to "GMT". */
    title?: string;
    /** Subtitle / hint line. Defaults to "Swipe up to enter". */
    subtitle?: string;
}

export const MobileScrollIntro: React.FC<MobileScrollIntroProps> = ({
    title = 'GMT',
    subtitle = 'Swipe up to enter',
}) => {
    const { isMobile } = useMobileLayout();
    if (!isMobile) return null;

    return (
        <div
            className="w-full flex flex-col items-center justify-center bg-black text-white text-center px-8"
            style={{ height: '100svh' }}
        >
            <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
            <p className="text-gray-500 text-sm font-mono mb-8">{subtitle}</p>
            <div className="text-cyan-400 animate-bounce">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </div>
        </div>
    );
};
