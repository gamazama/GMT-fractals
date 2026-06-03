/**
 * PalettePickerOverlay — a topbar button that opens the gradient library as a
 * FULL-WIDTH modal overlay, so the picker wall gets real width instead of being
 * squeezed into the ~300px right dock.
 *
 * The overlay reuses the studio's PickerStage (the wall + hero + apply seam) and embeds
 * the Quality-filter controls (the paletteFilters DDFS feature) in a sidebar via
 * AutoFeaturePanel — the same controls the dock panel used, now with room to breathe.
 * Picking a gradient still colours the fractal through PickerStage.onPick → the
 * gradientSeam; the overlay can stay open while the user auditions gradients.
 *
 * UX: no backdrop-click-to-close (it's a full-screen browser, easy to mis-click) — close
 * via the explicit ✕ button or Esc. Mouse/hover is transform-safe (PickerWall uses
 * getBoundingClientRect), so the fixed-position portal doesn't offset picks.
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { PickerStage } from '../palette-studio/PickerStage';
import { AutoFeaturePanel } from '../components/AutoFeaturePanel';

const SwatchIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18" />
  </svg>
);

const PalettePickerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[1000] flex flex-col bg-black/85 backdrop-blur-sm">
    <div className="shrink-0 h-11 flex items-center justify-between px-4 border-b border-white/10 bg-black/60">
      <span className="text-sm font-medium text-gray-200">Gradient Library</span>
      <button
        onClick={onClose}
        title="Close (Esc)"
        className="flex items-center gap-1.5 px-2.5 h-7 rounded text-[12px] text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
        Close
      </button>
    </div>
    <div className="flex-1 flex min-h-0">
      {/* Quality filters only. Favourites live in the FLOATING Favients shelf (topbar ★) —
          favourite a picked gradient via the ★ on the picker hero. */}
      <div className="w-[300px] shrink-0 overflow-y-auto border-r border-white/10 bg-zinc-900/60">
        <AutoFeaturePanel featureId="paletteFilters" />
      </div>
      <div className="flex-1 relative min-w-0">
        {/* PickerStage is flex-1; a relative slot gives it no height, so wrap in an
            absolute-fill flex column (same pattern the old dock panel used) — else the
            wall collapses to 0 height and only the fixed-height hero shows. */}
        <div className="absolute inset-0 flex flex-col">
          <PickerStage />
        </div>
      </div>
    </div>
  </div>
);

export const PalettePickerButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Browse the gradient library"
        className="flex items-center gap-1.5 px-2 h-7 rounded text-[12px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <SwatchIcon />
        <span className="hidden md:inline">Palettes</span>
      </button>
      {open && ReactDOM.createPortal(<PalettePickerModal onClose={() => setOpen(false)} />, document.body)}
    </>
  );
};

export default PalettePickerButton;
