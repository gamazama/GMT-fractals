/**
 * CanonicalHero — the one result-hero a gradient mode embeds (P2-A). It unifies the
 * five surfaces' hand-rolled result strips behind one "select → act" interaction:
 *
 *   • the strip is a DRAG SOURCE — drag it onto any target (Fullscreen / Stops /
 *     Generator slot / ColorBox / Favients);
 *   • clicking the strip PICKS the gradient (the click-path twin of a drag) and opens the
 *     options dock so a click on a target sends it there. The pick is STICKY: clicking
 *     away / applying / Esc closes the dock but KEEPS the gradient in hand (a fresh pick
 *     replaces it). Clicking the hero again re-opens the dock. See
 *     `palette/store/heroSelection.ts` + `plans/p2-a-picker-interaction.md`.
 *
 * It owns the strip render, the name + source chip, the embedded ★, and the pick/drag
 * wiring; it embeds — never modifies — `GradientStrip` and `FavStar`. The ACTIONS are the
 * dock targets, not per-hero buttons, so this hero carries no Apply / Send-to / Fullscreen
 * buttons. Surface-specific NON-action controls (stops count) go in `trailing`.
 *
 * Visual tiers (orthogonal): the in-hand pick shows a muted cyan ring; the ACTIVE state
 * (pick + dock open) brightens it + glows. A neutral ring otherwise marks draggability.
 * The vertical-enlarge height is a separate, shared concern (see callers).
 *
 * Selection is per-mode (the transient `heroSelection` store keyed by `mode` + `key`),
 * so a picked Picker gradient never lights the Generator hero, and it survives the
 * Picker's desktop↔mobile remount.
 *
 * @see palette/store/heroSelection.ts · gradient-explorer/GradientDropLayer.tsx (the dock)
 */

import React, { useMemo } from 'react';
import type { GradientConfig } from '../../types';
import type { RGB } from '../core/oklab';
import { renderStopsToRamp } from '../core/gmtGradient';
import { GradientStrip } from './GradientStrip';
import { FavStar } from './FavStar';
import { favientSig } from '../store/favientsStore';
import { setFavientDrag, suppressNativeDragImage } from '../core/favientDnd';
import {
  useHeroPick,
  useActiveHeroMode,
  useHeroOptionsOpen,
  setHeroPick,
  setHeroDrag,
  type HeroMode,
} from '../store/heroSelection';
import { useHeroPrefs, toggleHeroEnlarged, HERO_HEIGHT_TALL, HERO_HEIGHT_BASE } from '../store/heroPrefs';
import { setDragOrigin } from '../store/dragVisual';

interface CanonicalHeroProps {
  config: GradientConfig;
  /** Precomputed ramp (surfaces usually have it); falls back to rendering the config. */
  ramp?: RGB[];
  /** Display + favourite name. */
  name: string;
  /** Provenance (favourite source + the hero's small chip; hidden when it duplicates name). */
  source?: string;
  mode: HeroMode;
  /**
   * Overrides the pick identity (default: `favientSig(config)`). The Picker passes its
   * catalog-entry id so the hero + the wall's `selectedId` share one key, and a re-render
   * with a content-equal config doesn't churn the pick.
   */
  selectionKey?: string;
  /**
   * Makes this hero a DROP TARGET as well as a source: it tags its root
   * `data-gx-target={targetId}` (so the registered (c) target's `getRect` anchors its
   * dropbox exactly here) AND self-filters (you don't drop a gradient onto itself, and
   * its own dropbox never covers the source while dragging/selecting it). The host still
   * registers the target's `apply`/`getRect`/`revealPath` in gradientTargets — this prop
   * is the ONLY hero-side wiring needed to turn any hero into a source+target.
   */
  targetId?: string;
  /** Surface-specific NON-action controls (stops count, …). The shared vertical-enlarge
   *  toggle is built in — callers don't pass it. */
  trailing?: React.ReactNode;
  className?: string;
}

export const CanonicalHero: React.FC<CanonicalHeroProps> = ({
  config,
  ramp,
  name,
  source,
  mode,
  selectionKey,
  targetId,
  trailing,
  className = '',
}) => {
  const surfacePick = useHeroPick(mode);
  const activeMode = useActiveHeroMode();
  const optionsOpen = useHeroOptionsOpen();
  // Shared, persisted vertical-enlarge tier (flips every hero at once). One subscription.
  const { enlarged } = useHeroPrefs();
  const height = enlarged ? HERO_HEIGHT_TALL : HERO_HEIGHT_BASE;
  // Identity for the pick. Defaults to the content signature; callers (the Picker)
  // override it with a stable id so the hero + the wall's selectedId share one key.
  const sigKey = useMemo(() => favientSig(config), [config]);
  const key = selectionKey ?? sigKey;
  // This surface's sticky pick matches this hero → "in hand". ACTIVE (bright + glow) only
  // when it's also the active surface with the dock open; otherwise it's a dormant pick
  // (still shown, muted) — e.g. the Picker hero while you're poking at a favourite.
  const isSelected = surfacePick?.key === key;
  const active = isSelected && activeMode === mode && optionsOpen;

  const r = useMemo(
    () => ramp ?? renderStopsToRamp(config.stops, config.blendSpace, config.colorSpace),
    [ramp, config],
  );

  // Click = PICK + open the dock. No toggle-to-clear: the pick is sticky, and the dock
  // closes via Esc / click-away / apply while the pick stays in hand (re-click re-opens).
  const pick = (): void =>
    setHeroPick({ mode, key, payload: { config, name, source }, selfTargetId: targetId });

  return (
    // data-gx-target tags this hero as the anchor for its (c) drop target, when it is one.
    // data-gx-selectable on the ROOT (not just the strip) so clicking a header control —
    // ★ or the enlarge toggle — doesn't trip the click-away that closes the dock.
    <div className={className} data-gx-target={targetId} data-gx-selectable="">
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FavStar config={config} name={name} source={source} size="sm" />
          <span className="text-xs text-gray-300 font-medium truncate">{name}</span>
          {source && source !== name && (
            <span className="text-[10px] text-gray-500 truncate shrink-0">{source}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {trailing}
          {/* Shared vertical-enlarge toggle — flips every hero at once (persisted). */}
          <button
            onClick={toggleHeroEnlarged}
            title={enlarged ? 'Compact hero strip' : 'Enlarge hero strip'}
            aria-label="Toggle hero height"
            aria-pressed={enlarged}
            className={`text-[11px] leading-none px-1.5 py-1 rounded-sm transition-colors ${
              enlarged ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/[0.06] text-gray-400 hover:text-gray-200'
            }`}
          >
            ⬍
          </button>
        </div>
      </div>
      {/* The strip is the pick + drag affordance: click to pick (opens the dock), drag to
          drop onto a target. Neutral ring = draggable; cyan = the in-hand pick; bright +
          glow = active (dock open). */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        draggable
        onDragStart={(e) => {
          setFavientDrag(e.dataTransfer, { config, name, source });
          suppressNativeDragImage(e.dataTransfer);
          setDragOrigin(e.currentTarget.getBoundingClientRect()); // morph the avatar out of the strip
          // Drag mirrors click: set the pick so the avatar has a ramp + the source stays lit.
          setHeroDrag({ mode, key, payload: { config, name, source }, selfTargetId: targetId });
        }}
        onClick={pick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pick();
          }
        }}
        title={
          isSelected
            ? 'In hand — pick a destination, or drag onto a target'
            : 'Click to pick (then choose a destination) · drag onto a target'
        }
        className={`overflow-hidden rounded-md cursor-grab active:cursor-grabbing transition-shadow ${
          active
            ? 'ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.30)]'
            : isSelected
              ? 'ring-2 ring-cyan-400/50'
              : 'ring-1 ring-white/15 hover:ring-white/30'
        }`}
      >
        <GradientStrip ramp={r} height={height} />
      </div>
    </div>
  );
};

export default CanonicalHero;
