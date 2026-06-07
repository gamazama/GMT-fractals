/**
 * Re-export shim — the deep-zoom GPU-state controller (reference-orbit / LA
 * table / AT payload uniform binding) was carved into the shared
 * `engine/fractal` library so the Gradient Explorer's live-fractal mode binds
 * the SAME deep-zoom uniforms fluid-toy's FluidEngine binds (no fork).
 *
 * @see engine/fractal/DeepZoomController.ts (canonical source)
 */
export { DeepZoomController } from '../../engine/fractal/DeepZoomController';
export type { ATPayload, DeepZoomBindParams } from '../../engine/fractal/DeepZoomController';
