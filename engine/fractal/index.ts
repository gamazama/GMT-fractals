/**
 * engine/fractal — host-agnostic fractal-colouring library, carved out of
 * fluid-toy's FluidEngine so any app (fluid-toy, the Gradient Explorer's
 * live-fractal coloring mode, future prototypes) can render a Mandelbrot/Julia
 * coloured by a 256×1 colormap LUT through the SAME shared kernel.
 *
 * Shallow float32 only (deep-zoom worker stack stays in fluid-toy).
 *
 * @see FractalColorRenderer (the standalone renderer host)
 * @see docs/adr (carve rationale)
 */
export {
  FractalColorRenderer,
  MANDEL_MIN_ZOOM,
  MANDEL_DEEP_MIN_ZOOM,
  MANDEL_MAX_ZOOM,
} from './FractalColorRenderer';
export type { FractalColorParams, FractalKind } from './FractalColorRenderer';
export { GradientLutManager, FRACTAL_GRADIENT_LUT_WIDTH } from './GradientLutManager';
export type { GradientSlot } from './GradientLutManager';
