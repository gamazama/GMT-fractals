/**
 * Re-export shim — the Julia/Mandelbrot iteration kernel (FRAG_JULIA) was
 * carved into the host-agnostic `engine/fractal` library so the Gradient
 * Explorer's live-fractal coloring mode renders the SAME fractal+gradient
 * kernel fluid-toy uses (one shared source, no fork). The deep-zoom path
 * inside the kernel is unchanged; fluid-toy still drives it via its local
 * DeepZoomController.
 *
 * @see engine/fractal/shaders/fractalKernel.ts (canonical source)
 */
export { FRAG_JULIA } from '../../../engine/fractal/shaders/fractalKernel';
