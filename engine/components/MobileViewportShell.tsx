/**
 * MobileViewportShell — root wrapper that swaps between desktop's
 * fixed-inset layout and the mobile address-bar-collapse layout.
 *
 * The trick: a `sticky top-0 h-[100vh] overflow-hidden` element matches
 * the visual viewport when the page first loads with the address bar
 * visible, then sticks to the top once the user scrolls 1px — the
 * browser then collapses the address bar and `100vh` resolves to the
 * larger post-collapse viewport. End result: full-screen app, no manual
 * scrolling required by the user.
 *
 * Adoption (any sibling app):
 *   <MobileViewportShell>...</MobileViewportShell>
 */

import React from 'react';
import { useMobileLayout } from '../../hooks/useMobileLayout';

interface MobileViewportShellProps {
    children: React.ReactNode;
    /** Extra classes appended to the wrapper. */
    className?: string;
}

// Safe-area insets keep UI clear of iOS notches / Dynamic Island /
// Android gesture bars. `env()` resolves to 0 on devices without
// cutouts, so the desktop branch can use an empty style object.
const MOBILE_STYLE: React.CSSProperties = {
    paddingTop:    'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    paddingLeft:   'env(safe-area-inset-left)',
    paddingRight:  'env(safe-area-inset-right)',
};
const DESKTOP_STYLE: React.CSSProperties = {};

export const MobileViewportShell: React.FC<MobileViewportShellProps> = ({ children, className = '' }) => {
    const { isMobile } = useMobileLayout();

    // `sticky` needs the element in flow (not `fixed`) so the body can
    // scroll the 1px that triggers address-bar collapse.
    const positioning = isMobile
        ? 'sticky top-0 h-[100vh] overflow-hidden shadow-2xl'
        : 'fixed inset-0 w-full h-full';

    return (
        <div className={`${positioning} ${className}`} style={isMobile ? MOBILE_STYLE : DESKTOP_STYLE}>
            {children}
        </div>
    );
};
