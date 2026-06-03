/**
 * PalettePickerOverlay — the gradient library as a FULL-WIDTH modal overlay, so the
 * picker wall gets real width instead of being squeezed into the ~300px right dock.
 *
 * Opened from the System menu ("Gradient Library…") or the Favients panel's Palettes
 * button — both flip `usePaletteOverlayStore`. `PalettePickerOverlayHost` (mounted once
 * in AppGmt) renders the modal while it's open; there's no dedicated topbar button.
 *
 * The overlay reuses the studio's PickerStage (the wall + hero + apply seam) and embeds
 * the Quality-filter controls (paletteFilters) in a sidebar. Picking still colours the
 * fractal via the gradientSeam; the overlay can stay open while auditioning gradients.
 *
 * UX: no backdrop-click-to-close (full-screen, easy to mis-click) — close via ✕ or Esc.
 */

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { PickerStage } from '../gradient-explorer/PickerStage';
import { AutoFeaturePanel } from '../components/AutoFeaturePanel';
import { usePaletteOverlayStore } from './paletteOverlayStore';
import { FavientsIcon, FAVIENTS_ACCENT } from '../palette/components/FavientsIcon';
import { openFavientsPanel } from '../palette/store/favientsPanelPersist';

const PalettePickerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[1000] flex flex-col bg-black/85 backdrop-blur-sm">
    <div className="shrink-0 h-11 flex items-center gap-3 px-4 border-b border-white/10 bg-black/60">
      <span className="text-sm font-medium text-gray-200">Gradient Library</span>
      <button
        onClick={openFavientsPanel}
        title="Open the Favients shelf"
        className={`text-[12px] ${FAVIENTS_ACCENT.link}`}
      >
        <FavientsIcon /> Favients
      </button>
      <button
        onClick={onClose}
        title="Close (Esc)"
        className="ml-auto flex items-center gap-1.5 px-2.5 h-7 rounded text-[12px] text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
        Close
      </button>
    </div>
    <div className="flex-1 flex min-h-0">
      {/* Quality filters only. Favourites live in the FLOATING Favients shelf (★ above /
          topbar) — favourite a picked gradient via the ★ on the picker hero. */}
      <div className="w-[300px] shrink-0 overflow-y-auto border-r border-white/10 bg-zinc-900/60">
        <AutoFeaturePanel featureId="paletteFilters" />
      </div>
      <div className="flex-1 relative min-w-0">
        {/* PickerStage is flex-1; a relative slot gives it no height, so wrap in an
            absolute-fill flex column (same pattern the old dock panel used) — else the
            wall collapses to 0 height and only the fixed-height hero shows. */}
        <div className="absolute inset-0 flex flex-col">
          {/* The Favients link lives in the modal header here, not the picker hero. */}
          <PickerStage hideFavientsLink />
        </div>
      </div>
    </div>
  </div>
);

/** Mounted once (AppGmt). Renders the modal while the overlay store says it's open. */
export const PalettePickerOverlayHost: React.FC = () => {
  const open = usePaletteOverlayStore((s) => s.open);
  const setOpen = usePaletteOverlayStore((s) => s.setOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;
  return ReactDOM.createPortal(<PalettePickerModal onClose={() => setOpen(false)} />, document.body);
};

export default PalettePickerOverlayHost;
