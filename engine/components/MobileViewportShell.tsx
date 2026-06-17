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
    // Snap target for the body's mandatory y-snap (host HTML). Pairs with
    // the intro splash's snap-start: the body's only scroll rests either
    // on the splash or here on the fullscreen shell — never half-scrolled
    // or drifted past the shell off the bottom. See ADR-0039.
    scrollSnapAlign: 'start',
};
const DESKTOP_STYLE: React.CSSProperties = {};

/**
 * @invariant Mobile branch uses `100dvh` (dynamic — tracks live
 *   viewport including keyboard open/close). `vh` would leave a black
 *   band after the mobile keyboard dismisses. Mobile branch applies
 *   `env(safe-area-inset-*)` padding on all four edges via the frozen
 *   `MOBILE_STYLE` object; desktop branch uses an empty style.
 * @invariant `MOBILE_STYLE` carries `scrollSnapAlign: 'start'`, the
 *   collapsed-state snap target for the host body's `scroll-snap-type:
 *   y mandatory`. It pairs with `MobileScrollIntro`'s snap-start: without
 *   both, the body's scroll could rest half-collapsed or drift past the
 *   shell off the bottom. See ADR-0039.
 */
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
