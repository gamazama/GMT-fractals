import React from 'react';

/**
 * GhostButton — the flat-translucent modal/overlay action button family.
 *
 * Distinct from {@link Button} (the `t-btn` panel family: `text-[9px]`, dark-gradient
 * base). This is the chrome the gallery/auth/feedback modals hand-rolled ~12×:
 * `bg-white/[0.04] hover:bg-white/[0.08] border border-white/10` on a neutral
 * translucent fill. Only that invariant is baked here; padding, rounding, text
 * size/colour, font weight, `flex-1`, and `transition-colors` stay the caller's via
 * `className`, so each converted call site renders byte-identically — a dedup of the
 * shared chrome, not a restyle. Forwards all native button props (onClick, disabled,
 * title, type, …).
 *
 * @invariant Engine-core (components/) — generic, no app/store imports.
 */
export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', children, ...props }) => (
    <button {...props} className={`bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 ${className}`.trim()}>
        {children}
    </button>
);

export default GhostButton;
