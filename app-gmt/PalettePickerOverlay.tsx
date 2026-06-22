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

import React from 'react';
import { Modal, Z } from '../components/ui';
import { CloseIcon } from '../components/Icons';
import { PickerStage } from '../gradient-explorer/PickerStage';
import { AutoFeaturePanel } from '../components/AutoFeaturePanel';
import { usePaletteOverlayStore } from './paletteOverlayStore';
import { FavientsIcon, FAVIENTS_ACCENT } from '../palette/components/FavientsIcon';
import { openFavientsPanel } from '../palette/store/favientsPanelPersist';

const PalettePickerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="w-full h-full flex flex-col">
    <div className="shrink-0 h-11 flex items-center gap-3 px-4 border-b border-line/10 bg-surface/80">
      <span className="text-sm font-medium text-fg-secondary">Gradient Library</span>
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
        className="ml-auto flex items-center gap-1.5 px-2.5 h-7 rounded text-[12px] text-fg-tertiary hover:text-fg hover:bg-line/10 transition-colors"
      >
        <CloseIcon size={13} strokeWidth={2.2} />
        Close
      </button>
    </div>
    <div className="flex-1 flex min-h-0">
      {/* Quality filters only. Favourites live in the FLOATING Favients shelf (★ above /
          topbar) — favourite a picked gradient via the ★ on the picker hero. */}
      <div className="w-[300px] shrink-0 overflow-y-auto border-r border-line/10 bg-surface-sunken/60">
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

/** Mounted once (AppGmt). Renders the modal while the overlay store says it's open.
 *  Full-screen takeover with no backdrop-click close (easy to mis-click) — ✕ or Esc.
 *  Modal owns the portal, scope-aware Escape, and stacking (Z.modal). */
export const PalettePickerOverlayHost: React.FC = () => {
  const open = usePaletteOverlayStore((s) => s.open);
  const setOpen = usePaletteOverlayStore((s) => s.setOpen);

  if (!open) return null;
  return (
    <Modal
      onClose={() => setOpen(false)}
      z={Z.modal}
      dismissOnBackdrop={false}
      backdropClassName="bg-black/85 backdrop-blur-sm"
      className="p-0"
    >
      <PalettePickerModal onClose={() => setOpen(false)} />
    </Modal>
  );
};

export default PalettePickerOverlayHost;
