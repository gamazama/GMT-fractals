/**
 * FavientsEditorEntrance — the Favients "saved gradients & presets" button that the
 * Stops editor (`components/AdvancedGradientEditor.tsx`) shows in its header.
 *
 * The editor is engine-core and must not import `palette/`, so this palette-side
 * component is injected through the engine `gradientEditorEntrance` seam in
 * `registerPaletteUI`. Hosts that mount the palette suite (app-gmt, the Gradient
 * Explorer) get the entrance; hosts that don't (fluid-toy) leave the slot empty —
 * exactly the old `hasFavients` gating, now without the cross-layer import.
 */

import React from 'react';
import { FavientsIcon, FAVIENTS_ACCENT } from './FavientsIcon';
import { openFavientsPanel } from '../store/favientsPanelPersist';

export const FavientsEditorEntrance: React.FC = () => (
  <button
    className={`gradient-interactive-element flex items-center px-1.5 py-0.5 rounded border border-white/10 ${FAVIENTS_ACCENT.border} hover:bg-white/10 text-[11px] leading-none transition-colors active:scale-95`}
    onClick={openFavientsPanel}
    title="Favients — saved gradients & presets"
  >
    <FavientsIcon />
  </button>
);

export default FavientsEditorEntrance;
