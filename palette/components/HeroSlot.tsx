/**
 * HeroSlot / HeroPortalProvider — relocates a mode's RESULT hero into a host-provided
 * "hero rail" without duplicating or re-rendering it.
 *
 * Why a portal (not a second hero or a shared store): the Generator's result updates
 * continuously as you drag dials, so a store-mirrored copy would go stale between picks.
 * Portalling keeps the ONE live `<CanonicalHero>` element — it just renders into the rail
 * DOM node instead of inline. Events still propagate through the React tree, so pick/drag
 * and the `data-gx-selectable` click-away guard keep working unchanged.
 *
 * Default (no provider — desktop Explorer + every app-gmt mount): the slot renders its
 * child inline exactly where it sits, so nothing changes off the mobile rail. Only one
 * stage is mounted at a time, so only the active mode's hero ever fills the rail.
 *
 * @see gradient-explorer/GradientExplorerApp.tsx (mounts the mobile rail + provider)
 */

import React, { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

const HeroPortalContext = createContext<HTMLElement | null>(null);

/** Host mounts this around the stage subtree with the rail element as `value` (mobile),
 *  or omits it entirely (desktop / app-gmt → heroes stay inline). */
export const HeroPortalProvider = HeroPortalContext.Provider;

/** True when the calling component is being rendered into a host hero rail (mobile). Lets
 *  the hero add rail-only affordances (e.g. a Save-to-favourites action) that don't belong
 *  on the inline desktop strip. */
export const useInHeroRail = (): boolean => useContext(HeroPortalContext) != null;

/** Wrap a mode's result hero. Portals it into the host rail when one is mounted, else
 *  renders inline.
 *
 *  `railOnly`: render ONLY into the rail — nothing inline. Use for a rail placeholder a
 *  surface wants in its always-visible mobile band but NOT in its desktop body (e.g. the
 *  Image mode's "load an image" state, which has no result strip on desktop but should keep
 *  the mobile rail from showing a bare empty band). */
export const HeroSlot: React.FC<{ children: React.ReactNode; railOnly?: boolean }> = ({ children, railOnly }) => {
  const target = useContext(HeroPortalContext);
  if (target) return createPortal(children, target);
  return railOnly ? null : <>{children}</>;
};

export default HeroSlot;
