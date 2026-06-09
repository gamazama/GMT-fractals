/**
 * ditherTail — the SHARED fragment-shader render-tail every fullscreen mode's output
 * passes through before the 8-bit write (the fullscreen-v2 dithering seam).
 *
 * A smooth 256-step ramp quantised to 8-bit bands visibly (the eye resolves ~1 LSB steps
 * in a flat sweep). The fix is SOTA: add blue-noise-sourced **TPDF** (triangular-PDF)
 * noise at ~1 LSB (1/255) just before the implicit 8-bit write. TPDF (two summed uniform
 * samples) makes the quantisation error's first AND second moments signal-independent, so
 * the band edges dissolve into noise the eye low-pass-filters away. Blue noise concentrates
 * that noise in high spatial frequencies, so a STATIC tile (no per-frame reseed → no
 * shimmer) reads as clean grain on a still gradient.
 *
 * Reuse, don't reinvent: the tile is the repo's existing `public/blueNoise.png`, loaded via
 * `engine/utils/createBlueNoiseWebGL2` (the same asset the fractal kernel samples). We sample
 * it STATICALLY (no R2 temporal offset — that's for accumulation convergence, not a still
 * ramp) at `gl_FragCoord / resolution` with REPEAT wrap so the tile covers any canvas size.
 *
 * Contract for modes:
 *   • cpuRaster + glQuad modes go through {@link wrapModeFragment} automatically — they
 *     inherit the tail for free; nothing to author.
 *   • an `ownCanvas` mode (its own renderer/canvas, e.g. the live fractal) that wants the
 *     same tail includes {@link DITHER_TAIL_GLSL} in its own display shader and calls
 *     `ditherTail(color, gl_FragCoord.xy)` before writing. (The fractal already dithers via
 *     in-kernel blue noise + TSAA accumulation, so it doesn't band — it opts out today.)
 *
 * @see gradient-explorer/fullscreen/FullscreenCompositor.ts (compiles the wrapped shaders)
 * @see engine/fractal/shaders/ditherTail.ts (the shared adaptive-dither chunk — single source)
 * @see engine/utils/createBlueNoiseWebGL2.ts (the tile loader)
 */

// The dither function itself is the shared, host-agnostic engine chunk — re-exported here so
// the seam's public surface is unchanged, and so the live-fractal display pass uses the EXACT
// same tail (one source, no drift).
export { DITHER_TAIL_GLSL } from '../../engine/fractal/shaders/ditherTail';
import { DITHER_TAIL_GLSL } from '../../engine/fractal/shaders/ditherTail';

/** Uniform names the wrapper always declares (the standard fullscreen-mode preamble).
 *  A mode's `setUniforms` must NOT collide with these.
 *
 *  Reserved TEXTURE UNITS the compositor binds: 0 = uSrc, 1 = uLut, 2 = uBlueNoise,
 *  3 = uPos, 4 = uCov (field path). A glQuad mode that binds its OWN textures in
 *  `setUniforms` must use unit ≥ 5 (and declare the sampler via `fragUniforms`). */
export const RESERVED_UNIFORMS = [
  'uSrc', 'uLut', 'uResolution', 'uBlueNoise', 'uBlueNoiseRes', 'uDither',
] as const;

/** Minimal fullscreen-quad vertex shader (passes UVs; no neighbour taps). */
export const VERT_QUAD = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/** GLSL body for the built-in cpuRaster present: blit the uploaded RGBA buffer. */
export const BLIT_MODE_BODY = /* glsl */ `
vec3 modeColor(vec2 uv) { return texture(uSrc, uv).rgb; }
`;

/**
 * Wrap a mode's fragment BODY (which must define `vec3 modeColor(vec2 uv)`) into a complete
 * `#version 300 es` fragment shader: the standard preamble (uSrc / uLut / resolution /
 * blue-noise / dither uniforms + a `sampleLut(t)` helper), the dither tail, the mode body,
 * and a `main()` that applies the tail before the 8-bit write.
 *
 * @param body            GLSL defining `vec3 modeColor(vec2 uv)` (+ any helpers it needs).
 * @param extraUniforms   Optional extra `uniform …;` declarations the mode reads (set via
 *                        the mode's `setUniforms`). Must not shadow {@link RESERVED_UNIFORMS}.
 */
export const wrapModeFragment = (body: string, extraUniforms = ''): string => /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSrc;          // cpuRaster source buffer (blit modes)
uniform sampler2D uLut;          // gradient LUT, 256×1 RGBA8 (glQuad modes)
uniform vec2 uResolution;
uniform sampler2D uBlueNoise;
uniform vec2 uBlueNoiseRes;
uniform bool uDither;
${extraUniforms}
vec3 sampleLut(float t) { return texture(uLut, vec2(clamp(t, 0.0, 1.0), 0.5)).rgb; }
${DITHER_TAIL_GLSL}
${body}
void main() {
  // modeColor receives uv with (0,0) at the TOP-left — matching CSS/canvas and the
  // row-major cpuRaster buffer (whose row 0 is the image top). The quad's vUv has y-up,
  // so flip here; the blit body then reads the uploaded buffer upright on screen + in PNG.
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec3 c = modeColor(uv);
  fragColor = vec4(ditherTail(c, gl_FragCoord.xy), 1.0);
}`;
