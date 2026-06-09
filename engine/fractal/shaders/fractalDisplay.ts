/**
 * FRAG_FRACTAL_DISPLAY — minimal composite for the standalone fractal
 * coloring renderer (Gradient Explorer live-fractal mode).
 *
 * The fractal kernel (FRAG_JULIA) already bakes the gradient-mapped colour
 * (interior-blended) into its `outFx.rgb` attachment, so display is just a
 * straight blit of that attachment to the screen. No dye / velocity / bloom /
 * tone-mapping — that is fluid-toy's FRAG_DISPLAY, which stays in fluid-toy.
 * The colour is already in display space (the gradient LUT is authored there),
 * so no gamma conversion.
 *
 * The shared adaptive-dither tail runs here too (the fractal is an `ownCanvas` mode that
 * doesn't flow through the GX compositor) so a smooth gradient-coloured region — exterior
 * potential, shallow bands — doesn't 8-bit-band on the final write. Static tile + TSAA, so no
 * shimmer. `uDither` lets the host toggle it in lock-step with the rest of the modes.
 *
 * @see engine/fractal/FractalColorRenderer.ts
 * @see engine/fractal/shaders/ditherTail.ts
 */
import { DITHER_TAIL_GLSL } from './ditherTail';

export const FRAG_FRACTAL_DISPLAY = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uImage;
uniform sampler2D uBlueNoise;
uniform vec2 uBlueNoiseRes;
uniform bool uDither;
${DITHER_TAIL_GLSL}
void main() {
  vec3 c = texture(uImage, vUv).rgb;
  fragColor = vec4(ditherTail(c, gl_FragCoord.xy), 1.0);
}`;
