import React, { forwardRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { z as zOf, isPortalTier, type Tier } from './zIndex';
import { getLayerHost } from './layerHost';
import { useLayerStack, useLayerStackZ } from './layerStack';

/**
 * `<Layer tier=…>` — the one un-trappable way to author a floating surface.
 *
 * A `portal` tier ALWAYS `createPortal`s to the layer host (so it can never be
 * accidentally trapped inside the shell's stacking context — see zIndex.ts), and
 * ALWAYS takes its z from the tier table. An author writing
 * `<Layer tier="popover">` gets a correctly-portalled, correctly-z'd surface
 * with zero stacking knowledge and cannot reach for a bare `z-[9999]`.
 *
 * A `shell` tier renders INLINE (its value is local to its trap by definition) —
 * the dev guard warns if you used a shell tier where a portal one was meant.
 *
 * Positioning is the caller's job (via `className`/`style`/`left`/`top`); Layer
 * only owns the portal, the `position`, and the `zIndex`. For click-to-front,
 * pass a `stackId` and the surface joins that tier's `layerStack` (raises on
 * pointer-down, ranks within the band). The `Modal`/`AnchoredMenu`/`FloatingPanel`
 * primitives keep their own bespoke chrome but resolve their host the same way.
 *
 * @see plans/z-index-system-design.md (§3d)
 * @see docs/adr/0081-floating-panel-click-to-front-stacking.md (layerStack)
 */
export interface LayerProps extends React.HTMLAttributes<HTMLDivElement> {
    tier: Tier;
    /** Static intra-band rank (ignored when `stackId` drives click-to-front). */
    rank?: number;
    /** Opt into click-to-front ordering for this tier, keyed by this id. */
    stackId?: string;
    /** Portal host override — for the documented named-host exceptions (HeroSlot, splineMode). */
    host?: HTMLElement | null;
    /** CSS position. Defaults to `fixed` (portal surfaces); pass `absolute`/`relative` for in-flow. */
    position?: React.CSSProperties['position'];
    children: React.ReactNode;
}

export const Layer = forwardRef<HTMLDivElement, LayerProps>(function Layer({
    tier,
    rank = 0,
    stackId,
    host,
    position = 'fixed',
    style,
    onPointerDownCapture,
    children,
    ...rest
}, ref) {
    const portal = isPortalTier(tier);

    // Click-to-front: enrol on mount, raise on pointer-press, rank within the band.
    // Hooks run unconditionally; a missing stackId yields a constant z (no re-renders).
    const raise = useLayerStack(tier, (s) => s.raise);
    const release = useLayerStack(tier, (s) => s.release);
    const stackedZ = useLayerStackZ(tier, stackId ?? '');
    useEffect(() => {
        if (!stackId) return;
        raise(stackId);
        return () => release(stackId);
    }, [stackId, raise, release]);

    const zIndex = stackId ? stackedZ : zOf(tier, rank);

    const node = (
        <div
            ref={ref}
            style={{ position, zIndex, ...style }}
            onPointerDownCapture={(e) => {
                if (stackId) raise(stackId);
                onPointerDownCapture?.(e);
            }}
            {...rest}
        >
            {children}
        </div>
    );

    return portal ? createPortal(node, host ?? getLayerHost()) : node;
});

export default Layer;
