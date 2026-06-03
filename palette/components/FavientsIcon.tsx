/**
 * FavientsIcon + FAVIENTS_ACCENT — the single source of truth for the Favients look.
 *
 * The icon (a white/cyan star: cyan filled = a favourite/active, white outline otherwise)
 * AND the brand accent classes used by every entrance live here, so restyling the whole
 * Favients look — glyph or colour — is a one-file edit. Each entrance imports the relevant
 * `FAVIENTS_ACCENT.*` token instead of hardcoding `text-cyan-…` at the call site.
 *
 * (Tailwind's JIT scans these literal class strings here, so the generated CSS exists even
 * though the call sites apply them via the imported constants.)
 */

import React from 'react';

export const FAVIENTS_ACCENT = {
  /** Filled star colour. */
  iconFilled: 'text-cyan-400',
  /** Dimmed / outline star colour. */
  iconDim: 'text-white/60',
  /** Inline "Favients" text-link buttons (picker hero, overlay header). */
  link: 'text-cyan-300/90 hover:text-cyan-200 transition-colors',
  /** Solid accent text for an active / selected state (topbar toggle). */
  text: 'text-cyan-300',
  /** Hover border accent for compact icon buttons (gradient editor). */
  border: 'hover:border-cyan-300/40',
  /** Favourited glow (FavStar). */
  glow: 'drop-shadow-[0_0_4px_rgba(34,211,238,0.6)]',
} as const;

interface FavientsIconProps {
  /** Filled (a favourite / active) = cyan, vs white outline. */
  filled?: boolean;
  className?: string;
}

export const FavientsIcon: React.FC<FavientsIconProps> = ({ filled = true, className = '' }) => (
  <span className={`leading-none ${filled ? FAVIENTS_ACCENT.iconFilled : FAVIENTS_ACCENT.iconDim} ${className}`} aria-hidden="true">
    {filled ? '★' : '☆'}
  </span>
);

export default FavientsIcon;
