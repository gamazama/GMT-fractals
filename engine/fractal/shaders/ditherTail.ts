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
 *   • AMPLITUDE = NUMBER OF DITHER LEVELS NEEDED = band width: a 1-LSB step spread over an
 *     N-pixel band (slope 1/N LSB/pixel) needs ~N dithered levels to read smooth, i.e.
 *     amplitude ≈ 1/slope. `fwidth(c)` is the per-pixel colour change.
 *   • FLAT-GATED: a region of constant colour (slope ≈ 0 — a fractal island, an intentional
 *     solid fill) has NO step to interpolate, so it gets ZERO dither — dithering it would be
 *     adding noise, not removing banding. Only a region that actually varies is dithered.
 *   • CAPPED + DARK-WEIGHTED: 1/slope is clamped so a near-flat gradient doesn't become
 *     full-range noise; the ceiling is higher in darks (the eye is most sensitive to
 *     low-luminance steps — Weber), where banding is worst.
 *   • Tapered to 0 at pure black/white so 0 and 1 are never dithered into noise.
 *
 * The four tuning constants are calibrated by `debug/test-dither.mts` (a banding/noise metric
 * + visual montage); keep them in sync with that harness.
 *
 * Requires the including shader to declare:
 *   `uniform sampler2D uBlueNoise; uniform vec2 uBlueNoiseRes; uniform bool uDither;`
 * and call `ditherTail(color, gl_FragCoord.xy)` immediately before writing the fragment.
 */
export const DITHER_TAIL_GLSL = /* glsl */ `
// Calibrated by debug/test-dither.mts (the column-average test). On a WIDE band (shallow
// gradient) a 1-LSB step spans many pixels, so amplitude must ≈ that band width (1/slope) to
// break the long flat runs the eye reads as steps — a full-screen gradient (~56px bands) has
// 6px step-runs at cap8 vs 20px at cap2. Higher amplitude costs a little grain, but killing the
// visible STEP is the goal, so the ceiling is generous and dark-weighted (a dark step is most
// visible — Weber).
// The gate must catch ONLY a truly-constant region (an island, slope ≈ 0) — NOT a shallow
// gradient. A full-screen 5–15% gradient is ~0.018 LSB/px, so the open threshold sits well
// below that; anything shallower than ~0.004 LSB/px is a gradient >6000px wide for 10%, i.e.
// effectively flat. (Earlier 0.006/0.030 thresholds wrongly half-gated real gradients → bands.)
const float DITHER_FLAT_LO = 0.0005; // slope (LSB/px) below which a region is "flat" → no dither
const float DITHER_FLAT_HI = 0.004;  // slope at/above which the flat-gate is fully open
const float DITHER_MAX_DARK = 8.0;  // amplitude ceiling on wide DARK bands (LSB)
const float DITHER_MAX_LIGHT = 4.0; // ceiling on midtone/bright bands (LSB)
vec3 ditherTail(vec3 c, vec2 fragCoord) {
  if (!uDither) return c;
  vec2 res = max(uBlueNoiseRes, vec2(1.0));               // REPEAT wrap tiles over any size
  // One fetch of the independent-channel RGBA tile; each output channel sums a distinct pair
  // of independent blue-noise channels → a genuine triangular PDF in [-1,1] per channel, with
  // the blue-noise spectrum preserved (no offset-tap smearing).
  vec4 bn = texture(uBlueNoise, fragCoord / res);
  vec3 tpdf = vec3(bn.r + bn.g, bn.b + bn.a, bn.a + bn.r) - 1.0;
  // Local slope in LSB/pixel (max channel). Flat (slope≈0) ⇒ no banding ⇒ gate dither off.
  vec3 slopeLSB = fwidth(c) * 255.0;
  float s = max(slopeLSB.r, max(slopeLSB.g, slopeLSB.b));
  float gate = smoothstep(DITHER_FLAT_LO, DITHER_FLAT_HI, s); // 0 on flats, 1 on real gradients
  // Dark-weighted ceiling: value 0 → DARK cap, value ≥ 0.5 → LIGHT cap (linear between).
  float value = max(c.r, max(c.g, c.b));
  float maxLSB = mix(DITHER_MAX_DARK, DITHER_MAX_LIGHT, clamp(value * 2.0, 0.0, 1.0));
  // Levels needed = band width = 1/slope, capped; gated to 0 on flats.
  float ampLSB = clamp(1.0 / max(s, 1e-3), 1.0, maxLSB) * gate;
  vec3 taper = clamp(min(c, 1.0 - c) * 255.0, 0.0, 1.0);  // 0 at extremes, 1 in the interior
  return c + tpdf * ampLSB * taper * (1.0 / 255.0);
}
`;
