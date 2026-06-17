/**
 * Re-export shim — the shared GLSL chunks (OKLab, gradient sampler, vertex)
 * were carved into the host-agnostic `engine/fractal` library so the Gradient
 * Explorer's live-fractal renderer can consume the SAME kernel (no fork).
 * fluid-toy keeps importing `./common` exactly as before.
 *
 * @see engine/fractal/shaders/gradientSample.ts (canonical source)
 */
export { OKLAB_GLSL, GRADIENT_SAMPLE_GLSL, VERT_FULLSCREEN } from '../../../engine/fractal/shaders/gradientSample';
