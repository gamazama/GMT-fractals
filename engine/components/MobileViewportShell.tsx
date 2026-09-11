/**
 * MobileViewportShell — root wrapper that swaps between desktop's
 * fixed-inset layout and the mobile dynamic-viewport layout.
 *
 * Mobile:
 *   - `sticky top-0` at `100dvh` (inline, over an `h-screen` = 100vh class as the
 *     fallback for browsers without `dvh` — see MOBILE_STYLE_DVH) — `dvh` (dynamic viewport height)
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
 * @assumption Mobile branch uses `100dvh` (dynamic — tracks live
 *   viewport including keyboard open/close). `vh` would leave a black
 *   band after the mobile keyboard dismisses. Mobile branch applies
 *   `env(safe-area-inset-*)` padding on all four edges via the frozen
 *   `MOBILE_STYLE` object; desktop branch uses an empty style.
 * @assumption `MOBILE_STYLE` carries `scrollSnapAlign: 'start'`, the
 *   collapsed-state snap target for the host body's `scroll-snap-type:
 *   y mandatory`. It pairs with `MobileScrollIntro`'s snap-start: without
 *   both, the body's scroll could rest half-collapsed or drift past the
 *   shell off the bottom. See ADR-0039.
 */
/**
 * The mobile box is `100dvh` WITH A `100vh` FALLBACK, and the two are declared in two
 * places on purpose: the class carries `h-screen` (100vh) and the inline style carries
 * `100dvh`. A browser that knows `dvh` applies the inline value over the class, as
 * always; one that does not (Chrome < 108, Safari < 15.4) REJECTS the inline assignment
 * as an invalid value and the class's 100vh stands. Before this the shell had only
 * `h-[100dvh]`, and on a Huawei P20 Pro that dropped the declaration: the sticky box
 * collapsed to its content, and the Gradient Explorer's wall — a region whose only
 * children are absolutely positioned — came out 0 px tall while the header, hero and rail
 * above it drew normally (owner, 2026-09-11). React sets `style.height = '100dvh'`
 * exactly like a hand-written assignment, so the rejection is the browser's, not ours.
 */
const MOBILE_STYLE_DVH: React.CSSProperties = { ...MOBILE_STYLE, height: '100dvh' };

export const MobileViewportShell: React.FC<MobileViewportShellProps> = ({ children, className = '' }) => {
    // Use `isDeviceMobile` (raw device flag) — the sticky+dvh trick is
    // meant to handle iOS address bar / Android keyboard. Force Mobile
    // UI on a desktop browser shouldn't apply it; desktop layout (fixed
    // inset-0) is correct there.
    const { isDeviceMobile } = useMobileLayout();

    const positioning = isDeviceMobile
        ? 'sticky top-0 h-screen overflow-hidden shadow-2xl'
        : 'fixed inset-0 w-full h-full';

    return (
        <div className={`${positioning} ${className}`} style={isDeviceMobile ? MOBILE_STYLE_DVH : DESKTOP_STYLE}>
            {children}
        </div>
    );
};
