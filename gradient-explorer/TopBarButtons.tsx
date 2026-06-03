/**
 * Gradient Explorer topbar buttons.
 *
 * Two left-slot affordances unique to the standalone Explorer:
 *   - BackToGmtButton — returns to the main GMT fractal studio (sibling
 *     `app-gmt.html` entry point; relative href works in dev + prod).
 *   - FavientsTopBarButton — shows/hides the saved-gradient shelf. Here the
 *     shelf is DOCKED LEFT (not floating like app-gmt), so the toggle drives
 *     the left dock's collapsed state rather than the panel's open flag — that
 *     is what actually hides/reveals the shelf when it's the sole left panel.
 */

import React from 'react';
import { useEngineStore } from '../store/engineStore';
import { FavientsIcon, FAVIENTS_ACCENT } from '../palette/components/FavientsIcon';

const BackArrowIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

/** Return to the main GMT studio. An <a> (not a button) so middle-click /
 *  open-in-new-tab work; relative href resolves to the sibling page. */
export const BackToGmtButton: React.FC = () => (
  <a
    href="app-gmt.html"
    title="Back to the GMT fractal studio"
    className="flex items-center gap-1.5 px-2 h-7 rounded text-[12px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors no-underline"
  >
    <BackArrowIcon />
    <span className="hidden md:inline font-medium">GMT</span>
  </a>
);

/** Toggle the Favients shelf. Docked left in the Explorer, so we collapse /
 *  expand the left dock — `togglePanel('Favients', true)` re-activates the tab
 *  and un-collapses in one shot (see uiSlice.togglePanel). */
export const FavientsTopBarButton: React.FC = () => {
  const collapsed = useEngineStore((s) => s.isLeftDockCollapsed);
  const isOpen = useEngineStore(
    (s) => (s as unknown as { panels?: Record<string, { isOpen?: boolean }> }).panels?.Favients?.isOpen ?? false,
  );
  const togglePanel = useEngineStore((s) => s.togglePanel);
  const setDockCollapsed = useEngineStore((s) => s.setDockCollapsed);

  const shown = !collapsed && isOpen;
  const onClick = () => {
    if (shown) setDockCollapsed('left', true);
    else togglePanel('Favients', true); // un-collapses + activates the tab
  };

  return (
    <button
      onClick={onClick}
      title="Toggle the Favients shelf (saved gradients)"
      className={`flex items-center gap-1.5 px-2 h-7 rounded text-[12px] transition-colors ${
        shown ? `${FAVIENTS_ACCENT.text} bg-white/10` : 'text-gray-400 hover:text-white hover:bg-white/10'
      }`}
    >
      <FavientsIcon className="text-sm leading-none" />
      <span className="hidden md:inline">Favients</span>
    </button>
  );
};
