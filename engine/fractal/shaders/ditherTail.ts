/**
 * DITHER_TAIL_GLSL — the shared, host-agnostic adaptive-dither fragment chunk.
 *
 * Lives in `engine/` (pure GLSL, no app deps) so EVERY fullscreen consumer can include the
 * SAME tail before its 8-bit write — the Gradient Explorer compositor (via
 * `gradient-explorer/fullscreen/ditherTail.ts`, which re-exports this) AND the live-fractal
 * display pass (`fractalDisplay.ts`). One source, no drift.
 *
 * Adaptive TPDF blue-noise dither (static tile — no temporal reseed → no shimmer on a still
 * image):
 *   • TRUE triangular PDF from a single fetch of an INDEPENDENT-CHANNEL RGBA blue-noise tile
 *     (`public/blueNoiseRGBA.png`, the Christoph Peters free set): summing two independent
 *     channels gives a proper TPDF AND preserves the blue-noise spatial spectrum (one position,
 *     no offset-tap smearing). Each output channel uses a distinct channel pair so the three
 *     are decorrelated. (Requires the tile's channels to be independent — a grayscale tile
 *     would degrade this to uniform-PDF, the classic reason a "1 LSB dither" still bands.)
 *   • AMPLITUDE AUTO-SCALES to the local colour slope: a quantisation step only bands where the
 *     gradient changes by < 1 LSB/pixel (it then spreads into a wide flat band), so amplitude is
 *     raised by 1/slope there (capped) to span the step; steep gradients keep 1 LSB. `fwidth(c)`
 *     is the per-pixel colour change the eye would otherwise read as a band edge.
 *   • The cap is DARK-WEIGHTED: darks band most perceptibly (the eye is most sensitive to
 *     low-luminance steps — Weber) and their gradients are shallow, so the 0–20% range gets a
 *     much higher amplitude ceiling than midtones/brights.
 *   • Tapered to 0 at pure black/white so 0 and 1 are never dithered into noise.
 *
 * Requires the including shader to declare:
 *   `uniform sampler2D uBlueNoise; uniform vec2 uBlueNoiseRes; uniform bool uDither;`
 * and call `ditherTail(color, gl_FragCoord.xy)` immediately before writing the fragment.
 */
export const DITHER_TAIL_GLSL = /* glsl */ `
const float DITHER_MAX_DARK = 8.0;  // amplitude ceiling on near-flat DARK bands (LSB)
const float DITHER_MAX_LIGHT = 2.5; // ceiling on midtone/bright flats (LSB)
vec3 ditherTail(vec3 c, vec2 fragCoord) {
  if (!uDither) return c;
  vec2 res = max(uBlueNoiseRes, vec2(1.0));               // REPEAT wrap tiles over any size
  // One fetch of the independent-channel RGBA tile; each output channel sums a distinct pair
  // of independent blue-noise channels → a genuine triangular PDF in [-1,1] per channel, with
  // the blue-noise spectrum preserved (no offset-tap smearing).
  vec4 bn = texture(uBlueNoise, fragCoord / res);
  vec3 tpdf = vec3(bn.r + bn.g, bn.b + bn.a, bn.a + bn.r) - 1.0;
  // Per-channel local slope in LSB/pixel; shallow slope ⇒ wide band ⇒ boost amplitude.
  vec3 slopeLSB = fwidth(c) * 255.0;
  // Dark-weighted ceiling: value 0 → DARK cap, value ≥ 0.5 → LIGHT cap (linear between).
  float value = max(c.r, max(c.g, c.b));
  float maxLSB = mix(DITHER_MAX_DARK, DITHER_MAX_LIGHT, clamp(value * 2.0, 0.0, 1.0));
  vec3 amp = clamp(1.0 / max(slopeLSB, 1e-3), vec3(1.0), vec3(maxLSB));
  vec3 taper = clamp(min(c, 1.0 - c) * 255.0, 0.0, 1.0);  // 0 at extremes, 1 in the interior
  return c + tpdf * amp * taper * (1.0 / 255.0);
}
`;
