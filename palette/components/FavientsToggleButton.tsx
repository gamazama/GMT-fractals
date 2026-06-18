/**
 * FavientsToggleButton — the shared topbar button that shows/hides the Favients shelf
 * (the persistent gradient-favourites bar). One component for every host: it drives the
 * dock-aware `toggleFavientsPanel` (collapses/expands the dock when docked, opens/closes
 * the float otherwise) and reflects `useFavientsPanelShown` (true only when actually on
 * screen), so a docked-but-collapsed shelf reads as "hidden" and the button reveals it.
 *
 * Replaces the three near-identical per-app copies (app-gmt floated, fluid-toy floated,
 * the Gradient Explorer's dock-collapse variant). `desktopOnly` hides it below the mobile
 * breakpoint — the Explorer wants that (the shelf is a dedicated tab on phones); the
 * floating hosts don't.
 */

import React from 'react';
import { FavientsIcon, FAVIENTS_ACCENT } from './FavientsIcon';
import { useFavientsPanelShown, toggleFavientsPanel } from '../store/favientsPanelPersist';

export const FavientsToggleButton: React.FC<{ desktopOnly?: boolean; className?: string }> = ({
  desktopOnly = false,
  className = '',
}) => {
  const shown = useFavientsPanelShown();
  return (
    <button
      type="button"
      onClick={toggleFavientsPanel}
      title="Toggle the Favients shelf (saved gradients)"
      className={`${desktopOnly ? 'hidden md:flex' : 'flex'} items-center gap-1.5 px-2 h-7 rounded text-[12px] transition-colors ${
        shown ? `${FAVIENTS_ACCENT.text} bg-white/10` : 'text-gray-400 hover:text-white hover:bg-white/10'
      } ${className}`}
    >
      <FavientsIcon className="text-sm leading-none" />
      <span className="hidden md:inline">Favients</span>
    </button>
  );
};

export default FavientsToggleButton;
