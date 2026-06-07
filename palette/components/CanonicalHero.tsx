/**
 * CanonicalHero — the one result-hero a gradient mode embeds (P2-A). It unifies the
 * five surfaces' hand-rolled result strips behind one "select → act" interaction:
 *
 *   • the strip is a DRAG SOURCE — drag it onto any lower-centre bin (Fullscreen /
 *     Stops / Generator slot / ColorBox / Favients);
 *   • clicking the strip SELECTS the gradient (the click-path twin of a drag) — which
 *     reveals the same bin dock so a click on a bin sends it there. Clicking the
 *     selected hero again deselects.
 *
 * It owns the strip render, the name + source chip, the embedded ★, and the
 * select/drag wiring; it embeds — never modifies — `GradientStrip` and `FavStar`. The
 * ACTIONS are the dock bins, not per-hero buttons, so this hero carries no Apply /
 * Send-to / Fullscreen buttons (those moved into the dock). Surface-specific NON-action
 * controls (stops count, the Generator enlarge toggle) go in `trailing`.
 *
 * Selection is per-mode (the transient `heroSelection` store keyed by `mode` + `key`),
 * so a selected Picker gradient never lights the Generator hero, and it survives the
 * Picker's desktop↔mobile remount.
 *
 * Rename is deliberately absent (it lives only in Favients, on saved items).
 *
 * @see palette/store/heroSelection.ts · components/DragWellsOverlay.tsx (the bin dock)
 */

import React, { useMemo } from 'react';
import type { GradientConfig } from '../../types';
import type { RGB } from '../core/oklab';
import { renderStopsToRamp } from '../core/gmtGradient';
import { GradientStrip } from './GradientStrip';
import { FavStar } from './FavStar';
import { favientSig } from '../store/favientsStore';
import { setFavientDrag } from '../core/favientDnd';
import {
  useHeroSelection,
  setHeroSelection,
  clearHeroSelection,
  type HeroMode,
} from '../store/heroSelection';

interface CanonicalHeroProps {
  config: GradientConfig;
  /** Precomputed ramp (surfaces usually have it); falls back to rendering the config. */
  ramp?: RGB[];
  /** Display + favourite name. */
  name: string;
  /** Provenance (favourite source + the hero's small chip; hidden when it duplicates name). */
  source?: string;
  mode: HeroMode;
  /** Strip height in px. */
  height?: number;
  /** Surface-specific NON-action controls (stops count, enlarge toggle, …). */
  trailing?: React.ReactNode;
  className?: string;
}

export const CanonicalHero: React.FC<CanonicalHeroProps> = ({
  config,
  ramp,
  name,
  source,
  mode,
  height = 44,
  trailing,
  className = '',
}) => {
  const sel = useHeroSelection();
  // Identity for the selection ring (content signature — re-renders track the exact
  // gradient). Computed here so callers don't recompute it on every parent render.
  const selectionKey = useMemo(() => favientSig(config), [config]);
  const isSelected = sel?.mode === mode && sel.key === selectionKey;

  const r = useMemo(
    () => ramp ?? renderStopsToRamp(config.stops, config.blendSpace, config.colorSpace),
    [ramp, config],
  );

  const toggleSelect = (): void => {
    if (isSelected) clearHeroSelection();
    else setHeroSelection({ mode, key: selectionKey, payload: { config, name, source } });
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FavStar config={config} name={name} source={source} size="sm" />
          <span className="text-xs text-gray-300 font-medium truncate">{name}</span>
          {source && source !== name && (
            <span className="text-[10px] text-gray-500 truncate shrink-0">{source}</span>
          )}
        </div>
        {trailing && <div className="flex items-center gap-2 shrink-0">{trailing}</div>}
      </div>
      {/* The strip is the select + drag affordance: click to select (reveals the bin
          dock), drag to drop onto a bin. A cyan ring marks the active selection. */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        draggable
        onDragStart={(e) => setFavientDrag(e.dataTransfer, { config, name, source })}
        onClick={toggleSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSelect();
          }
        }}
        title={
          isSelected
            ? 'Selected — pick a destination below, or click to deselect'
            : 'Click to select (then pick a destination) · drag onto a bin'
        }
        className={`overflow-hidden rounded-md cursor-grab active:cursor-grabbing transition-shadow ${
          isSelected ? 'ring-2 ring-cyan-400' : 'ring-1 ring-white/10 hover:ring-white/25'
        }`}
      >
        <GradientStrip ramp={r} height={height} />
      </div>
    </div>
  );
};

export default CanonicalHero;
