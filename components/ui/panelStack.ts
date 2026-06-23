import { useLayerStack, useLayerStackZ, type LayerBandState } from './layerStack';

/**
 * Click-to-front stacking for floating panels — now the `'panel'` instance of
 * the generalized {@link useLayerStack} band machinery (see `layerStack.ts`).
 *
 * Kept as a thin, named wrapper so the existing `FloatingPanel` call sites and
 * ADR-0081 references stay valid unchanged. New rank-able surfaces (popovers,
 * overlays) should call `useLayerStack(tier, …)` / `useLayerStackZ(tier, …)`
 * directly rather than adding another bespoke band wrapper.
 *
 * @see docs/adr/0081-floating-panel-click-to-front-stacking.md
 */
export const usePanelStack = <T,>(selector: (s: LayerBandState) => T): T => useLayerStack('panel', selector);

/** The z-index a participating floating panel should render at (`Z.panel + rank`). */
export const usePanelStackZ = (id: string): number => useLayerStackZ('panel', id);
