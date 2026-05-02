/**
 * MobileViewportShell — root wrapper that swaps between desktop's
 * fixed-inset layout and the mobile dynamic-viewport layout.
 *
 * Mobile:
 *   - `sticky top-0 h-[100dvh]` — `dvh` (dynamic viewport height)
 *     tracks the visual viewport, so the shell shrinks/grows when the
 *     mobile keyboard opens/closes and when the address bar collapses.
 *     `vh` would leave a black band after the keyboard dismisses.
 *   - `overflow: hidden` on the shell itself so its child layout doesn't
 *     scroll independently. The body is scrollable (set in the host
 *     HTML) so the user can swipe past the intro to trigger
 *     address-bar collapse, after which the sticky shell locks.
 *
 * Desktop:
 *   - `fixed inset-0 w-full h-full` — original locked viewport.
 *
 * Adoption: <MobileViewportShell>...</MobileViewportShell>
 */

import React from 'react';
import { useMobileLayout } from '../../hooks/useMobileLayout';

interface MobileViewportShellProps {
    children: React.ReactNode;
    className?: string;
}

const MOBILE_STYLE: React.CSSProperties = {
    paddingTop:    'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    paddingLeft:   'env(safe-area-inset-left)',
    paddingRight:  'env(safe-area-inset-right)',
};
const DESKTOP_STYLE: React.CSSProperties = {};

export const MobileViewportShell: React.FC<MobileViewportShellProps> = ({ children, className = '' }) => {
    // Use `isDeviceMobile` (raw device flag) — the sticky+dvh trick is
    // meant to handle iOS address bar / Android keyboard. Force Mobile
    // UI on a desktop browser shouldn't apply it; desktop layout (fixed
    // inset-0) is correct there.
    const { isDeviceMobile } = useMobileLayout();

    const positioning = isDeviceMobile
        ? 'sticky top-0 h-[100dvh] overflow-hidden shadow-2xl'
        : 'fixed inset-0 w-full h-full';

    return (
        <div className={`${positioning} ${className}`} style={isDeviceMobile ? MOBILE_STYLE : DESKTOP_STYLE}>
            {children}
        </div>
    );
};
