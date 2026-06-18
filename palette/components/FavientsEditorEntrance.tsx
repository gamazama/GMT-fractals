/**
 * FavientsEditorEntrance — the Favients "saved gradients & presets" button that the
 * Stops editor (`components/AdvancedGradientEditor.tsx`) shows in its header.
 *
 * The editor is engine-core and must not import `palette/`, so this palette-side
 * component is injected through the engine `gradientEditorEntrance` seam in
 * `registerPaletteUI`, which also hands it the editor's CURRENT gradient. Hosts that
 * mount the palette suite (app-gmt, the Gradient Explorer) get the entrance; hosts that
 * don't (fluid-toy) leave the slot empty — exactly the old `hasFavients` gating, now
 * without the cross-layer import.
 *
 * Two-state button: when the shelf is CLOSED it opens it; when the shelf is already OPEN
 * it ADDS the current gradient (dedup + auto-name, the same as the menu's "Send to
 * Favients") so a second click does something useful instead of a no-op on the
 * already-visible panel.
 */

import React from 'react';
import type { GradientConfig } from '../../types';
import { getGradientFavientsBridge } from '../../components/gradient/gradientFavients';
import { getSendTargets } from '../../store/sendTargetRegistry';
import { FavientsIcon, FAVIENTS_ACCENT } from './FavientsIcon';
import { revealFavientsPanel, useFavientsPanelShown } from '../store/favientsPanelPersist';
import { useFavientsStore } from '../store/favientsStore';

export const FavientsEditorEntrance: React.FC<{ config: GradientConfig; featureId?: string; paramKey?: string }> = ({ config, featureId, paramKey }) => {
  const panelShown = useFavientsPanelShown();
  const handleClick = (): void => {
    // Point the shelf's "Destination" dropdown at THIS editor's send target, when one
    // declares it edits this (featureId, paramKey) — so the star says "save/apply here".
    if (featureId && paramKey) {
      const target = getSendTargets().find(
        (t) => t.editsParam?.featureId === featureId && t.editsParam?.paramKey === paramKey,
      );
      if (target) useFavientsStore.getState().setSelectedTarget(target.id);
    }
    if (panelShown) {
      // Shelf already on screen — add via the SAME bridge the menu's "Send to Favients"
      // uses, so dedup + auto-name + provenance stay defined in one place (registerPaletteUI).
      getGradientFavientsBridge()?.add(config);
    } else {
      // Not visible — bring it into view where it lives: a docked-but-hidden shelf is
      // revealed in its dock; only a floating/unplaced shelf comes up as a float.
      revealFavientsPanel();
    }
  };
  return (
    <button
      className={`gradient-interactive-element flex items-center px-1.5 py-0.5 rounded border border-white/10 ${FAVIENTS_ACCENT.border} hover:bg-white/10 text-[11px] leading-none transition-colors active:scale-95`}
      onClick={handleClick}
      title={panelShown ? 'Add this gradient to Favients' : 'Favients — saved gradients & presets'}
    >
      <FavientsIcon />
    </button>
  );
};

export default FavientsEditorEntrance;
