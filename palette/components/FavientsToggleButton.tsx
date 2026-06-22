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
import { TopBarToggle } from '../../components/TopBarToggle';

export const FavientsToggleButton: React.FC<{ desktopOnly?: boolean; className?: string }> = ({
  desktopOnly = false,
  className = '',
}) => {
  const shown = useFavientsPanelShown();
  return (
    <TopBarToggle
      active={shown}
      onClick={toggleFavientsPanel}
      title="Toggle the Favients shelf (saved gradients)"
      desktopOnly={desktopOnly}
      icon={<FavientsIcon className="text-sm leading-none" />}
      label="Favients"
      activeClassName={`${FAVIENTS_ACCENT.text} bg-line/10`}
      inactiveClassName="text-fg-muted hover:text-fg hover:bg-line/10"
      className={className}
    />
  );
};

export default FavientsToggleButton;
