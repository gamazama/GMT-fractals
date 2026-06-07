/**
 * Re-export shim — the 1-D colormap LUT manager was carved into the
 * host-agnostic `engine/fractal` library so the Gradient Explorer's
 * live-fractal renderer uploads its colormap through the SAME path
 * fluid-toy uses (`renderStopsToBuffer` → setBuffer; one ramp seam, no fork).
 *
 * @see engine/fractal/GradientLutManager.ts (canonical source)
 */
export { GradientLutManager } from '../../engine/fractal/GradientLutManager';
export type { GradientSlot } from '../../engine/fractal/GradientLutManager';
