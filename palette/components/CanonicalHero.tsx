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
 * It owns the strip render, the name + source chip, and the pick/drag wiring; it embeds —
 * never modifies — `GradientStrip`. The ACTIONS are the dock targets, not per-hero buttons,
 * so this hero carries no Apply / Send-to / Fullscreen buttons. The ONE exception is the
 * Save-to-Favients star (add-with-dedup, reflects saved state) — a quick one-click add on
 * every surface, and the only add path on touch (drag-to-shelf doesn't fire on touch).
 * Surface-specific NON-action controls (stops count) go in `trailing`.
 *
 * Visual tiers (orthogonal): the in-hand pick shows a muted cyan ring; the ACTIVE state
 * (pick + dock open) brightens it + glows AND insets the ramp in a tinted padding frame
 * (§2.5b). A neutral ring otherwise marks draggability. The vertical-enlarge height is a
 * separate, shared concern (see callers).
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
import { configToName } from '../core/facetName';
import { GradientStrip } from './GradientStrip';
import { favientSig, useFavientsStore } from '../store/favientsStore';
import { useInHeroRail } from './HeroSlot';
import { setFavientDrag, beginCustomAvatarDrag } from '../core/favientDnd';
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
  /** Display name + (by default) the favourite name a drag/send carries. */
  name: string;
  /**
   * When set, `name` is a DISPLAY-ONLY label (e.g. "Generated", "Image · distill") — a
   * computed output with no authored name — so the payload/favourite name AUTO-DERIVES from
   * the gradient's facets (`configToName`) instead of saving the placeholder. The strip
   * still shows `name`; only what a drag/send/favourite is NAMED changes. Heroes with a real
   * name (Picker entry, Generator slot preset) leave this off.
   */
  autoName?: boolean;
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
  autoName,
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

  // The name a drag/send/favourite carries: the display `name` for an authored gradient, or
  // an auto-derived perceptual label for a placeholder-named computed output (`autoName`).
  // Computed at gesture time, not per render — configToName renders+facets the ramp, and the
  // name isn't shown mid-drag, so deriving it eagerly would burn cycles on every dial frame.
  const payloadName = (): string => (autoName ? configToName(config) : name);

  // Click = PICK + open the dock. No toggle-to-clear: the pick is sticky, and the dock
  // closes via Esc / click-away / apply while the pick stays in hand (re-click re-opens).
  const pick = (): void =>
    setHeroPick({ mode, key, payload: { config, name: payloadName(), source }, selfTargetId: targetId });

  // Save-to-Favients toggle. Originally rail-only (the desktop add path is dragging the
  // strip onto the shelf, which doesn't fire on touch); now shown on every surface as an
  // explicit one-click affordance so desktop users don't have to drag. It ADDS with dedup
  // (add only when not already saved) and reflects state — filled ★ when this gradient is
  // on the shelf, and a second click un-saves it. The rail variant keeps a bigger tap
  // target + "Save/Saved" label; the inline desktop variant is a compact star glyph.
  const inRail = useInHeroRail();
  const savedId = useFavientsStore((s) => {
    const sig = favientSig(config);
    return s.favients.find((f) => favientSig(f.config) === sig)?.id ?? null;
  });
  const toggleSave = (): void => {
    const st = useFavientsStore.getState();
    if (savedId) st.remove(savedId);
    else st.add(config, payloadName(), source);
  };

  return (
    // data-gx-target tags this hero as the anchor for its (c) drop target, when it is one.
    // data-gx-selectable on the ROOT (not just the strip) so clicking a header control —
    // the enlarge toggle — doesn't trip the click-away that closes the dock.
    <div className={className} data-gx-target={targetId} data-gx-selectable="">
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-300 font-medium truncate">{name}</span>
          {source && source !== name && (
            <span className="text-[10px] text-gray-500 truncate shrink-0">{source}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {trailing}
          {/* Save-to-Favients toggle — a one-click add-with-dedup (the quick alternative to
              dragging the strip onto the shelf, and the only path on touch). Filled ★ =
              saved; a second click un-saves. Bigger tap target + label in the rail; compact
              star glyph inline on desktop. */}
          <button
            onClick={toggleSave}
            title={savedId ? 'Remove from Favients' : 'Save to Favients'}
            aria-label={savedId ? 'Remove from Favients' : 'Save to Favients'}
            aria-pressed={!!savedId}
            className={`flex items-center gap-1 leading-none rounded-sm transition-colors ${
              inRail ? 'text-[12px] px-2.5 py-2' : 'text-[11px] px-1.5 py-1'
            } ${savedId ? 'bg-amber-400/20 text-amber-200' : 'bg-white/[0.06] text-gray-300 hover:text-white'}`}
          >
            <span aria-hidden>{savedId ? '★' : '☆'}</span>
            {inRail && (savedId ? 'Saved' : 'Save')}
          </button>
          {/* Shared vertical-enlarge toggle — flips every hero at once (persisted). Bigger
              tap target in the rail (the one hero control a thumb reaches on a phone). */}
          <button
            onClick={toggleHeroEnlarged}
            title={enlarged ? 'Compact hero strip' : 'Enlarge hero strip'}
            aria-label="Toggle hero height"
            aria-pressed={enlarged}
            className={`text-[11px] leading-none rounded-sm transition-colors ${inRail ? 'px-2.5 py-2' : 'px-1.5 py-1'} ${
              enlarged ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/[0.06] text-gray-400 hover:text-gray-200'
            }`}
          >
            ⬍
          </button>
        </div>
      </div>
      {/* The strip is the pick + drag affordance: click to pick (opens the dock), drag to
          drop onto a target. Neutral ring = draggable; cyan = the in-hand pick; bright +
          glow = active (dock open). The ACTIVE state also frames the ramp in a tinted
          padding matte (§2.5b) — the ramp insets by the p-1 so the hero's FOOTPRINT stays
          constant (a frame, NOT a size change per §2.5). Glow + frame ease in via the
          box-shadow/bg transition; the ramp inset itself is instant. */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        draggable
        onDragStart={(e) => {
          const pn = payloadName();
          setFavientDrag(e.dataTransfer, { config, name: pn, source });
          beginCustomAvatarDrag(e.dataTransfer);
          setDragOrigin(e.currentTarget.getBoundingClientRect()); // morph the avatar out of the strip
          // Drag mirrors click: set the pick so the avatar has a ramp + the source stays lit.
          setHeroDrag({ mode, key, payload: { config, name: pn, source }, selfTargetId: targetId });
        }}
        onClick={(e) => {
          setDragOrigin(e.currentTarget.getBoundingClientRect()); // in-hand avatar morphs from the strip
          pick();
        }}
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
        className={`overflow-hidden rounded-md cursor-grab active:cursor-grabbing transition-[box-shadow,background-color] duration-150 ${
          active
            ? 'ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.30)] bg-cyan-500/15 p-1'
            : isSelected
              ? 'ring-2 ring-cyan-400/50'
              : 'ring-1 ring-white/15 hover:ring-white/30'
        }`}
      >
        {/* Shrink the ramp by the p-1 frame (8px) when active so the matte appears WITHOUT
            growing the hero — keeps the footprint matching the deselected placeholder. */}
        <GradientStrip ramp={r} height={active ? Math.max(0, height - 8) : height} />
      </div>
    </div>
  );
};

export default CanonicalHero;
