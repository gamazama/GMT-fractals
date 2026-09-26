/**
 * GradientStudioEntrance — the POPOUT in a gradient editor's header (beside the My Gradients ★):
 * it points GMT's Gradient Studio at this editor's param and shows the Studio. Registered through
 * the editor's header seam by `palette/installGradientStudio.ts` — app-gmt only.
 *
 * Renders nothing for an editor with no param identity (a standalone editor has nothing for the
 * Studio to write) or inside the Studio itself (`host === 'studio'`). Lit while the Studio is open
 * on this param.
 */

import React from 'react';
import { useEngineStore } from '../../store/engineStore';
import { useGradientStudio, sameTarget, STUDIO_PANEL_ID, openStudioOn } from '../store/gradientStudio';

/** A window with an arrow leaving its corner — drawn at the header's 11 px like the ☰ beside it. */
const PopoutIcon: React.FC = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 2.5H3a1 1 0 0 0-1 1V9a1 1 0 0 0 1 1h5.5a1 1 0 0 0 1-1V7" />
    <path d="M7 2h3v3" />
    <path d="M10 2 5.5 6.5" />
  </svg>
);

export const GradientStudioEntrance: React.FC<{ featureId?: string; paramKey?: string; host?: string }> = ({ featureId, paramKey, host }) => {
  const open = useEngineStore((s) => !!(s as unknown as { panels?: Record<string, { isOpen?: boolean }> }).panels?.[STUDIO_PANEL_ID]?.isOpen);
  const onThis = useGradientStudio((s) => sameTarget(s.target, featureId && paramKey ? { featureId, paramKey } : null));
  if (!featureId || !paramKey || host === 'studio') return null;
  const lit = open && onThis;
  return (
    <button
      className={`gradient-interactive-element flex items-center px-1.5 py-0.5 rounded border transition-colors active:scale-95 ${lit ? 'border-accent-400/50 text-accent-300 bg-accent-400/10' : 'border-line/10 hover:border-line/25 hover:bg-line/10 text-fg-dim hover:text-fg'}`}
      onClick={() => openStudioOn({ featureId, paramKey })}
      title={lit ? 'Open in the Gradient Studio' : 'Gradient Studio — edit this gradient in a floating window with Curves, Adjust and Paint'}
      data-gradient-studio-popout=""
    >
      <PopoutIcon />
    </button>
  );
};

export default GradientStudioEntrance;
