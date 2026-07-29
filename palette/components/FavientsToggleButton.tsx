/**
 * FavientsToggleButton — the shared topbar button that shows/hides the Favients shelf
 * (the persistent gradient-favourites bar). It drives the dock-aware
 * `toggleFavientsPanel` (collapses/expands the dock when docked, opens/closes the float
 * otherwise) and reflects `useFavientsPanelShown` (true only when actually on screen),
 * so a docked-but-collapsed shelf reads as "hidden" and the button reveals it.
 *
 * TWO hosts mount it, not three — grep for `FavientsToggleButton` to see them:
 * `fluid-toy/main.tsx` (topbar registry, floated shelf) and
 * `gradient-explorer/TopBarButtons.tsx` (`desktopOnly`, dock-collapse variant). It
 * replaced their per-app copies. **app-gmt has no topbar toggle at all** — its copy
 * was deleted, not migrated, and the shelf is reached from the Palette Picker overlay
 * (grep `openFavientsPanel` in `app-gmt/PalettePickerOverlay.tsx`) and the System menu.
 * `desktopOnly` hides the button below the mobile breakpoint — the Explorer wants that
 * (the shelf is a dedicated tab on phones); fluid-toy doesn't.
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
