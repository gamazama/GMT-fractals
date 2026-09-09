/**
 * rampTween — perceptual cross-fade between two 256-texel ramps.
 *
 * The blend half of the Gradient Explorer's "Variants" feature: two captured
 * variants each carry the ramp they produced, and the user dials between them.
 * Mixing in sRGB would darken and desaturate through the middle (the classic
 * "muddy midpoint"), so the lerp happens in OKLab and comes back through the
 * gamut-safe encoder — chroma is reduced at constant L,h rather than each
 * channel being clipped independently, so a hot midpoint loses vividness but
 * never shifts hue.
 *
 * Pure and DOM-free: no store, no canvas, no module state. Deterministic for a
 * given `(a, b, t)`, which is what lets the Gradient Explorer render the same
 * blend twice and get byte-identical output (the same property `rampGeometry`
 * relies on).
 *
 * Nothing here resamples `a`. The OUTPUT is always `a.length` texels — `a` is
 * the ramp whose geometry the caller is showing, and `b` is sampled to match by
 * t-position (nearest texel). Callers that want b's length swap the arguments
 * and invert `t`.
 *
 * @assumption Inputs are finite sRGB triples in [0, 255] (what `renderStopsToRamp`
 *   and the generator pipeline emit). A NaN channel in `a` or `b` propagates to
 *   the output — the clamp on `t` is the only sanitisation done, because the
 *   callers are all internal ramp producers, not untrusted input.
 * @see palette/core/oklab.ts (the colour primitives, and their drift caveat)
 */

import { rgbToOklab, oklabToRgbSafe, type RGB } from './oklab';

/** Clamp to [0, 1]; a non-finite `t` (NaN / Infinity from a division) reads as 0. */
const clamp01 = (t: number): number => (Number.isFinite(t) ? (t < 0 ? 0 : t > 1 ? 1 : t) : 0);

/**
 * Per-texel OKLab cross-fade. `t = 0` reproduces `a`, `t = 1` reproduces `b`
 * (both within one 8-bit level — the values make a round trip through OKLab,
 * so they are not bit-identical to the input floats).
 *
 * Length rules:
 *   • output length is always `a.length` (0 in, 0 out);
 *   • `b` shorter/longer is sampled by t-position (nearest texel), so a 64-texel
 *     `b` blends against a 256-texel `a` without either being stretched in place;
 *   • an empty `b` is a no-op — a copy of `a` is returned rather than a black ramp.
 */
export const tweenRamp = (a: RGB[], b: RGB[], t: number): RGB[] => {
  const n = a.length;
  if (n === 0) return [];
  const m = b.length;
  if (m === 0) return a.map((c) => ({ r: c.r, g: c.g, b: c.b }));

  const k = clamp01(t);
  const out: RGB[] = new Array(n);
  for (let i = 0; i < n; i++) {
    // Nearest-texel resample of `b` onto `a`'s t-axis. Identity when m === n.
    const j = m === n ? i : n === 1 ? 0 : Math.round((i / (n - 1)) * (m - 1));
    const la = rgbToOklab(a[i]);
    const lb = rgbToOklab(b[j]);
    out[i] = oklabToRgbSafe({
      L: la.L + (lb.L - la.L) * k,
      a: la.a + (lb.a - la.a) * k,
      b: la.b + (lb.b - la.b) * k,
    });
  }
  return out;
};
