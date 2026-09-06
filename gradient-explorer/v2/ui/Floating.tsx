/**
 * Floating — the v2 floating surface (plans/ge-v2-unified-shell-plan.md §1 V1: "Floating
 * (tray, popover, tool palette, toast, dialog) = `surface-section`, hairline `line/20`,
 * radius 12, one shadow, opens and closes"). Used by VariantsMenu and ExportMenu's
 * popover containers; the toast host lives outside `gradient-explorer/v2/**` (`engine/
 * components/ToastHost`) so it is not converted here (P6, out of scope for this pass).
 *
 * Deliberately a plain div, not a portal/positioning primitive — callers keep their own
 * `absolute`/`fixed` placement; this only supplies the V1 surface chrome.
 */

import React from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Floating = React.forwardRef<HTMLDivElement, Props>(({ children, className = '', ...rest }, ref) => (
  <div ref={ref} className={`bg-surface-section border border-line/20 rounded-xl shadow-lg ${className}`} {...rest}>
    {children}
  </div>
));
Floating.displayName = 'Floating';

export default Floating;
