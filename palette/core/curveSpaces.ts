/**
 * curveSpaces — WHICH three axes the Curves editor draws.
 *
 * The generator pipeline is OkLCh from end to end: `Channels` is {L, C, h} and the Adjust
 * chain after the curve override reads those names directly. That is unchanged. What this
 * module adds is an AUTHORING space: the tracks are edited in whatever space the owner
 * picked, sampled, and converted to OkLCh once, at `sampleCurves`. Nothing downstream of
 * that seam knows the difference.
 *
 * The list is not a new vocabulary. It is `BLEND_SPACE_ORDER` minus `spectral` (owner,
 * 2026-09-12: the axes are "the same ones available in the 'blend' section of the picker",
 * with Spectral and HSL skipped) — same keys, same labels, same order, so the chooser in
 * Curves and the chooser on the gradient strip are the same control over the same words.
 * Spectral is absent because it is a MIXING MODEL, not a triple of channels: there is no
 * "spectral axis" to draw a curve along.
 *
 * ── Three things that are easy to get wrong here ─────────────────────────────────────────
 *
 * 1. EPSILON IS PER-CHANNEL, NOT PER-SPACE. The fit tolerance is in the channel's own
 *    units, and those differ by orders of magnitude across one space, never mind between
 *    spaces: OkLCh chroma spans 0.4 while its hue spans 2π, and CIE L* spans 100. A single
 *    per-space number would give the same Detail setting wildly different key counts per
 *    channel. `fitChannelsToTracks` already hand-tuned this for OkLCh (0.01 / 0.01 / 0.06);
 *    that tuning now lives on the channel, where it belongs.
 *
 * 2. ANGULAR CHANNELS MUST BE UNWRAPPED FOR EDITING, or a hue that crosses the seam draws
 *    as a vertical cliff and a keyframe dragged across it teleports. Every polar space has
 *    one (OkLCh h, CIE h, HSV H) and the rectangular ones have none. All angles here are
 *    RADIANS, including HSV's and CIE's, which are conventionally degrees — one unit means
 *    one unwrap and one plot range.
 *
 * 3. RGB, HSV AND CIE LCh ARE GAMUT-BOUNDED AND OkLCh IS NOT. Those three route through
 *    sRGB, so a curve that swings out of gamut in OkLCh is CLIPPED on the way in. Switching
 *    space is lossy in that direction, inherently — not a defect to fix, but a thing to say
 *    out loud. Switching also re-fits, since a bezier in L/C/h has no counterpart in R/G/B.
 *
 * @invariant Every space round-trips an in-gamut gradient back to the same colours (max 2
 *   of 255 per channel) — proven by: `npm run test:palette-curvespaces` section [2]. This is
 *   what makes "switch to RGB, draw, switch back" honest rather than destructive. Falsified
 *   2026-09-12 by dropping HSV's 0..100 scaling (`rgbToHsv` reports S and V there, this
 *   editor plots 0..1): the round trip went to 252/255 — the whole gradient came back grey.
 *
 * @invariant Every angular channel is UNWRAPPED on the way out, and no other channel is
 *   touched — proven by: the same harness, section [4] ("angular, and comes back with no
 *   seam"). Falsified by returning `fromOklch`'s output unmapped: all three polar spaces
 *   went red. Without it a hue crossing the seam draws as a vertical cliff and a keyframe
 *   dragged across it teleports.
 *
 * @invariant Each channel's `eps` is a comparable fraction (0.4–3%) of that channel's own
 *   range — proven by: the same harness, section [5]. Falsified by giving OkLCh hue L's
 *   0.01: it read 0.16% of a 2π range, i.e. six times the keys. This is why eps lives on the
 *   channel and not on the space.
 *
 * @see plans/ge-v2-unified-shell-plan.md §10, entry 2026-09-12
 * @see utils/colorUtils.ts (BLEND_SPACE_ORDER / BLEND_SPACE_LABEL — the shared vocabulary)
 */

import type { BlendColorSpace } from '../../types/graphics';
import { BLEND_SPACE_LABEL, BLEND_SPACE_ORDER, cieLabToRgb, hsvToRgb, rgbToCieLab, rgbToHsv, wrapHue } from '../../utils/colorUtils';
import { clamp01 } from '../../utils/stopOps';
import { oklabToRgbSafe, rgbToOklab } from './oklab';
import type { Channels } from './generatorPipeline';

/** A curve space is a blend space, minus the ones that are not three axes. */
export type CurveSpace = Exclude<BlendColorSpace, 'spectral' | 'hsv-far'>;

/**
 * The chooser's order — `BLEND_SPACE_ORDER` with the non-axis modes filtered out, so the
 * two lists can never drift into different orderings or a different spelling of a mode.
 */
export const CURVE_SPACE_ORDER: CurveSpace[] = BLEND_SPACE_ORDER.filter(
  (s): s is CurveSpace => s !== 'spectral' && s !== 'hsv-far',
);

export const DEFAULT_CURVE_SPACE: CurveSpace = 'oklab'; // POLAR OkLCh — what Curves has always been

export const curveSpaceLabel = (s: CurveSpace): string => BLEND_SPACE_LABEL[s];

/**
 * What a channel MEANS, independent of the space it lives in. A wave preset says "put a
 * monotone ramp on lightness"; only the space knows that lightness is `L` in OkLCh, `V` in
 * HSV, `L*` in CIE LCh — and that RGB has no lightness channel at all, which is why
 * `component` exists and why {@link channelForRole} can return null.
 */
export type ChannelRole = 'lightness' | 'chroma' | 'hue' | 'component';

export interface CurveChannelDef {
  /** Track key, and the key this channel occupies in a persisted `ChannelTracks`. */
  key: string;
  label: string;
  /** Which of the three perceptual jobs this channel does, or `component` for a channel
   *  that does not separate them (R, G, B, and Oklab's a/b). */
  role: ChannelRole;
  /** Plot colour, matching GraphRenderer's track colours for OkLCh and semantic elsewhere. */
  color: string;
  /** The channel's RELEVANT range in its own units — the normalized plot's extent. */
  min: number;
  max: number;
  /** Douglas-Peucker tolerance at Detail 8, in the channel's own units. See note 1 above. */
  eps: number;
  /** An angle: unwrap before editing, and grow the plot range in whole turns. */
  angular?: boolean;
}

export interface CurveSpaceDef {
  id: CurveSpace;
  label: string;
  channels: [CurveChannelDef, CurveChannelDef, CurveChannelDef];
  /** True when the space routes through sRGB and therefore clips. See note 3 above. */
  gamutBound: boolean;
  /** OkLCh channels → this space's three channels, in `channels` order. */
  fromOklch: (ch: Channels) => [number[], number[], number[]];
  /** This space's three channels → OkLCh. The inverse, to the limit of the gamut. */
  toOklch: (a: number[], b: number[], c: number[]) => Channels;
}

const TURN = Math.PI * 2;
const DEG = Math.PI / 180;

/** Unwrap a periodic channel into a continuous one, for any period. The generic form of
 *  `generatorPipeline.unwrapHue`, which is hardcoded to ±π. */
export const unwrapAngle = (a: number[], turn = TURN): number[] => {
  if (a.length === 0) return [];
  const half = turn / 2;
  const out = [a[0]];
  let prev = a[0];
  for (let i = 1; i < a.length; i++) {
    let d = a[i] - prev;
    while (d > half) d -= turn;
    while (d < -half) d += turn;
    out.push(out[i - 1] + d);
    prev = a[i];
  }
  return out;
};

/** OkLCh sample i → an sRGB triple in 0..255, gamut-mapped (chroma-clipped, hue preserved). */
const oklchToRgb255 = (L: number, C: number, h: number) =>
  oklabToRgbSafe({ L, a: C * Math.cos(h), b: C * Math.sin(h) });

/** Walk 256 samples, mapping each OkLCh triple through `f` into three output arrays. */
const mapFrom = (ch: Channels, f: (L: number, C: number, h: number) => [number, number, number]): [number[], number[], number[]] => {
  const n = ch.L.length;
  const a: number[] = new Array(n);
  const b: number[] = new Array(n);
  const c: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = f(ch.L[i], ch.C[i], ch.h[i]);
    a[i] = x; b[i] = y; c[i] = z;
  }
  return [a, b, c];
};

/** The inverse walk: three arrays → OkLCh, via a per-sample sRGB triple (0..255). */
const mapToViaRgb = (a: number[], b: number[], c: number[], f: (x: number, y: number, z: number) => { r: number; g: number; b: number }): Channels => {
  const n = a.length;
  const L: number[] = new Array(n);
  const C: number[] = new Array(n);
  const h: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const o = rgbToOklab(f(a[i], b[i], c[i]));
    L[i] = o.L;
    C[i] = Math.hypot(o.a, o.b);
    h[i] = Math.atan2(o.b, o.a);
  }
  return { L, C, h };
};

const clamp255 = (v: number) => Math.max(0, Math.min(255, v));

const SPACES: Record<CurveSpace, CurveSpaceDef> = {
  // POLAR OkLCh — the space Curves has always been, and the pipeline's own. The only one
  // whose conversion is the identity, so the only one that cannot lose anything.
  oklab: {
    id: 'oklab',
    label: BLEND_SPACE_LABEL.oklab,
    gamutBound: false,
    channels: [
      { key: 'L', label: 'Lightness', color: '#22d3ee', min: 0, max: 1, eps: 0.01, role: 'lightness' },
      { key: 'C', label: 'Chroma', color: '#a855f7', min: 0, max: 0.4, eps: 0.01, role: 'chroma' },
      { key: 'h', label: 'Hue', color: '#22c55e', min: 0, max: TURN, eps: 0.06, angular: true, role: 'hue' },
    ],
    fromOklch: (ch) => [ch.L.slice(), ch.C.slice(), ch.h.slice()],
    toOklch: (L, C, h) => ({ L: L.slice(), C: C.slice(), h: h.slice() }),
  },

  // Rectangular Oklab: the same perceptual space with NO hue seam, so a curve that crosses
  // red never meets a discontinuity. The trade is that "make it more saturated" stops being
  // one channel.
  'oklab-rect': {
    id: 'oklab-rect',
    label: BLEND_SPACE_LABEL['oklab-rect'],
    gamutBound: false,
    channels: [
      { key: 'L', label: 'Lightness', color: '#22d3ee', min: 0, max: 1, eps: 0.01, role: 'lightness' },
      { key: 'a', label: 'Green–red', color: '#f472b6', min: -0.4, max: 0.4, eps: 0.01, role: 'component' },
      { key: 'b', label: 'Blue–yellow', color: '#fbbf24', min: -0.4, max: 0.4, eps: 0.01, role: 'component' },
    ],
    fromOklch: (ch) => mapFrom(ch, (L, C, h) => [L, C * Math.cos(h), C * Math.sin(h)]),
    toOklch: (L, a, b) => ({
      L: L.slice(),
      C: a.map((v, i) => Math.hypot(v, b[i])),
      h: a.map((v, i) => Math.atan2(b[i], v)),
    }),
  },

  rgb: {
    id: 'rgb',
    label: BLEND_SPACE_LABEL.rgb,
    gamutBound: true,
    channels: [
      { key: 'R', label: 'Red', color: '#ef4444', min: 0, max: 1, eps: 0.01, role: 'component' },
      { key: 'G', label: 'Green', color: '#22c55e', min: 0, max: 1, eps: 0.01, role: 'component' },
      { key: 'B', label: 'Blue', color: '#3b82f6', min: 0, max: 1, eps: 0.01, role: 'component' },
    ],
    fromOklch: (ch) => mapFrom(ch, (L, C, h) => {
      const c = oklchToRgb255(L, C, h);
      return [c.r / 255, c.g / 255, c.b / 255];
    }),
    toOklch: (r, g, b) => mapToViaRgb(r, g, b, (x, y, z) => ({
      r: clamp255(x * 255), g: clamp255(y * 255), b: clamp255(z * 255),
    })),
  },

  // CIE L*C*h — a differently wound hue circle from Oklab's (blue→yellow routes via
  // magenta here, via green there), and a chroma on a wholly different scale: sRGB tops
  // out near C=133 where Oklab's tops out near 0.37. Hence the ranges and epsilons below,
  // which are Oklab's scaled by ~100 and ~360, not numbers picked by eye.
  cielch: {
    id: 'cielch',
    label: BLEND_SPACE_LABEL.cielch,
    gamutBound: true,
    channels: [
      // L* / C* / h*, not L / C / h: the CIE convention, and it keeps the key triple
      // DISTINCT from OkLCh's. A persisted `ChannelTracks` is then self-describing — a
      // document whose stored space id is wrong or missing is detectable rather than
      // silently reinterpreted as the other polar space.
      { key: 'L*', label: 'Lightness', color: '#22d3ee', min: 0, max: 100, eps: 1, role: 'lightness' },
      { key: 'C*', label: 'Chroma', color: '#a855f7', min: 0, max: 133, eps: 1.3, role: 'chroma' },
      { key: 'h*', label: 'Hue', color: '#22c55e', min: 0, max: TURN, eps: 0.06, angular: true, role: 'hue' },
    ],
    fromOklch: (ch) => mapFrom(ch, (L, C, h) => {
      const lab = rgbToCieLab(oklchToRgb255(L, C, h));
      return [lab.L, Math.hypot(lab.a, lab.b), Math.atan2(lab.b, lab.a)];
    }),
    toOklch: (L, C, h) => mapToViaRgb(L, C, h, (l, c, hh) => {
      const rgb = cieLabToRgb({ L: l, a: c * Math.cos(hh), b: c * Math.sin(hh) });
      return { r: clamp255(rgb.r), g: clamp255(rgb.g), b: clamp255(rgb.b) };
    }),
  },

  hsv: {
    id: 'hsv',
    label: BLEND_SPACE_LABEL.hsv,
    gamutBound: true,
    channels: [
      { key: 'H', label: 'Hue', color: '#22c55e', min: 0, max: TURN, eps: 0.06, angular: true, role: 'hue' },
      { key: 'S', label: 'Saturation', color: '#a855f7', min: 0, max: 1, eps: 0.01, role: 'chroma' },
      { key: 'V', label: 'Value', color: '#22d3ee', min: 0, max: 1, eps: 0.01, role: 'lightness' },
    ],
    // `rgbToHsv` reports S and V on 0..100 and `hsvToRgb` expects them there, while this
    // editor plots every unit-ish channel on 0..1 — hence the /100 and *100. Getting that
    // wrong clamps a saturation of 85 to 1 and the whole gradient comes back grey (caught
    // by this space's round-trip assertion, 2026-09-12: max Δ 233/255).
    fromOklch: (ch) => mapFrom(ch, (L, C, h) => {
      const { h: hh, s, v } = rgbToHsv(oklchToRgb255(L, C, h));
      return [hh * DEG, s / 100, v / 100];
    }),
    toOklch: (H, S, V) => mapToViaRgb(H, S, V, (h, s, v) => {
      // wrapHue is load-bearing: the H channel arrives UNWRAPPED (it may be negative, or
      // past 360), and `hsvToRgb`'s `i % 6` takes JavaScript's signed modulo — a negative
      // hue matches no case in its switch and returns pure black.
      const c = hsvToRgb(wrapHue(h / DEG), clamp01(s) * 100, clamp01(v) * 100);
      return { r: clamp255(c.r), g: clamp255(c.g), b: clamp255(c.b) };
    }),
  },
};

/** The space's definition. Falls back to OkLCh so a stored id from a future (or hand-edited)
 *  document can never resolve to nothing and strand the editor with no axes. */
export const curveSpace = (id: CurveSpace | string | undefined): CurveSpaceDef =>
  SPACES[(id as CurveSpace)] ?? SPACES[DEFAULT_CURVE_SPACE];

/**
 * The key of the channel doing `role` in this space, or null when it has none — RGB has no
 * single lightness channel, so a preset that wants one cannot apply there, and the caller
 * must offer it as unavailable rather than picking a channel at random.
 */
export const channelForRole = (id: CurveSpace | string | undefined, role: ChannelRole): string | null =>
  curveSpace(id).channels.find((c) => c.role === role)?.key ?? null;

/** The space's three track keys, in channel order. */
export const curveSpaceKeys = (id: CurveSpace | string | undefined): [string, string, string] => {
  const c = curveSpace(id).channels;
  return [c[0].key, c[1].key, c[2].key];
};

/**
 * OkLCh channels → the space's three channels, with angular channels UNWRAPPED so they are
 * continuous and editable. This is what the fit and the ghost both consume.
 */
export const toCurveChannels = (id: CurveSpace | string | undefined, ch: Channels): [number[], number[], number[]] => {
  const def = curveSpace(id);
  const out = def.fromOklch(ch);
  return out.map((vals, i) => (def.channels[i].angular ? unwrapAngle(vals) : vals)) as [number[], number[], number[]];
};

/** The inverse: the space's three channels (angular ones possibly unwrapped past one turn,
 *  which is fine — cos/sin do not care) back to the pipeline's OkLCh. */
export const fromCurveChannels = (id: CurveSpace | string | undefined, a: number[], b: number[], c: number[]): Channels =>
  curveSpace(id).toOklch(a, b, c);
