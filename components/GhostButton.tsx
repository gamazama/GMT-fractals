import React from 'react';

/**
 * GhostButton — the flat-translucent modal/overlay action button family.
 *
 * Distinct from {@link Button} (the `t-btn` panel family: `text-[9px]`, dark-gradient
 * base). This is the chrome the gallery/auth/feedback modals hand-rolled. Three baked
 * `variant`s, each a verbatim dedup of a chrome that recurred across those surfaces:
 *
 *  • `neutral` (default) — `bg-white/[0.04] hover:bg-white/[0.08] border border-white/10`.
 *  • `danger` — `bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40`
 *    (the "Delete forever" / "Clear key" chrome; text-red-200 was byte-identical across sites).
 *  • `primary` — `bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50` (the
 *    "Submit to Gallery" chrome). NOTE: text colour is NOT baked — it drifts cyan-100
 *    vs white across sites, so the caller keeps it in `className`.
 *
 * Only the per-variant invariant is baked; padding, rounding, text size, font weight,
 * `flex-1`, `transition-colors`, and (for primary) text colour stay the caller's via
 * `className`, so each converted call site renders byte-identically — a dedup of the
 * shared chrome, not a restyle. Forwards all native button props (onClick, disabled, …).
 *
 * @invariant Engine-core (components/) — generic, no app/store imports.
 */
export type GhostButtonVariant = 'neutral' | 'danger' | 'primary';

const VARIANT_CHROME: Record<GhostButtonVariant, string> = {
    neutral: 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/10',
    danger: 'bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40',
    primary: 'bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50',
};

export interface GhostButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Baked chrome. Default 'neutral'. */
    variant?: GhostButtonVariant;
}

export const GhostButton: React.FC<GhostButtonProps> = ({ className = '', variant = 'neutral', children, ...props }) => (
    <button {...props} className={`${VARIANT_CHROME[variant]} ${className}`.trim()}>
        {children}
    </button>
);

export default GhostButton;
