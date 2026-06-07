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
 * @see engine/fractal/FractalColorRenderer.ts
 */
export const FRAG_FRACTAL_DISPLAY = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uImage;
void main() {
  fragColor = vec4(texture(uImage, vUv).rgb, 1.0);
}`;
