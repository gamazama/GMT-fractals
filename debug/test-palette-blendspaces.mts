/**
 * Blend-space harness — the guard behind the `@invariant`s in utils/colorUtils.ts.
 *
 * Covers the four modes added / corrected on 2026-09-10: spectral, rectangular Oklab,
 * CIE LCh, and the polar OkLCh whose gamut mapping and achromatic handling were both
 * wrong. Each assertion below was FALSIFIED against a deliberately broken build before
 * being committed — see the "falsified by" note on each block. A guard nobody watched
 * go red is a guess about a guard (CLAUDE.md).
 *
 * FOUR of these passed under mutation on the first cut and had to be rewritten. Read why
 * before weakening one:
 *   [3] probed two fixed greys chosen for the OLD 0.005 threshold, so moving the threshold
 *       to 0.05 put both probes on the same side and it stayed green. It now SWEEPS.
 *   [6] compared a warm cache read against an earlier warm read; the cache is
 *       first-write-wins, so a mis-keyed memo made both reads agree. It now uses self-mix
 *       as an oracle.
 *   [7] called lerpSpectral directly, so repointing `case 'spectral'` at lerpRGB never
 *       touched it. It now goes through blendLerp.
 *   [9] asserted the three midpoints were DISTINCT, which holds even when a mode is wired
 *       to the wrong lerp. It now pins each against its own function.
 * The shape of all four mistakes is the same: asserting something true-but-adjacent
 * instead of the claim itself.
 *
 * @see docs/adr/0113-blend-spaces-pigment-to-tint.md
 *
 * Pure maths, no DOM, no store — runs in node.
 *
 * Run: npx tsx debug/test-palette-blendspaces.mts
 */

import {
  blendLerp,
  lerpOklab,
  lerpOklabRect,
  lerpCieLch,
  lerpSpectral,
  renderStopsToRamp,
  hexToRgb,
  rgbToHex,
  BLEND_SPACE_ORDER,
  BLEND_SPACE_LABEL,
} from '../utils/colorUtils';
import { coerceGradientConfig } from '../palette/core/editorConfig';
import type { BlendColorSpace, GradientStop } from '../types';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); }
  else console.log('  ✓ ' + msg);
};

type RGB = { r: number; g: number; b: number };
const P = (hex: string) => hexToRgb(hex) as RGB;

// --- Oklab helpers, independent of the implementation under test ---------------
const s2l = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const toLab = (c: RGB) => {
  const lr = s2l(c.r), lg = s2l(c.g), lb = s2l(c.b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
};
const hueDeg = (c: RGB) => { const L = toLab(c); return (Math.atan2(L.b, L.a) * 180 / Math.PI + 360) % 360; };
const hueGap = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const chromaOf = (c: RGB) => { const L = toLab(c); return Math.hypot(L.a, L.b); };

const PAIRS: [string, string][] = [
  ['#0000FF', '#FFFF00'], ['#FF0000', '#00FF00'], ['#FF0000', '#0000FF'],
  ['#3300CC', '#00CC33'], ['#FF0080', '#00FFCC'], ['#0E4D64', '#E8743B'],
];

console.log('blend spaces:');

// 1) Gamut mapping preserves hue.
//    FALSIFIED BY: swapping oklabToRgbGamut's body for a bare `return oklabToRgb(lab)`
//    (the pre-2026-09-10 per-channel clamp) — this reports 25.8 deg and goes red.
{
  let worst = 0, at = '';
  for (const [x, y] of PAIRS) {
    const c1 = P(x), c2 = P(y);
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const got = lerpOklab(c1, c2, t);
      // Reference: same L and chroma-ratio, hue taken straight from the polar path.
      const A = toLab(c1), B = toLab(c2);
      const ca = Math.hypot(A.a, A.b), cb = Math.hypot(B.a, B.b);
      if (ca < 1e-9 || cb < 1e-9) continue;
      let h1 = Math.atan2(A.b, A.a);
      let dh = Math.atan2(B.b, B.a) - h1;
      if (dh > Math.PI) dh -= 2 * Math.PI;
      if (dh < -Math.PI) dh += 2 * Math.PI;
      const wantHue = ((h1 + dh * t) * 180 / Math.PI + 360) % 360;
      // A fully desaturated result has no meaningful hue to compare.
      if (chromaOf(got) < 0.004) continue;
      const gap = hueGap(hueDeg(got), wantHue);
      if (gap > worst) { worst = gap; at = `${x}->${y} t=${t.toFixed(2)} ${rgbToHex(got)}`; }
    }
  }
  ok(worst <= 1.0, `gamut mapping preserves hue within 1 degree (worst ${worst.toFixed(2)} deg${worst > 1 ? ' at ' + at : ''})`);
}

// 2) Powerless hue == rectangular lerp from an exact grey.
//    FALSIFIED BY: restoring the old `if (chroma < 0.005) return <rectangular>` branch
//    and widening it to 0.05 — the near-grey continuity check below then goes red.
{
  const grey = P('#808080'), vivid = P('#FFD000');
  let worst = 0;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const polar = lerpOklab(grey, vivid, t);
    const rect = lerpOklabRect(grey, vivid, t);
    worst = Math.max(worst, Math.abs(polar.r - rect.r), Math.abs(polar.g - rect.g), Math.abs(polar.b - rect.b));
  }
  // NOT exactly equal: #808080 is achromatic to ~1e-8, not to the 1e-9 the powerless
  // rule tests for, so it takes the polar path with a numerically noisy hue. The two
  // agree to well under one 8-bit step, which is the claim that actually matters.
  ok(worst < 1.5, `powerless hue matches rectangular lerp from an exact grey to under one 8-bit step (max delta ${worst.toFixed(3)}/255)`);
}

// 3) No chroma CLIFF anywhere. The old code branched at chroma < 0.005, so two greys a
//    hair apart blended completely differently (#827E7E → #BFA765 vs #847C7C → #D7996F,
//    ~24/255 apart). Sweeping a family of near-greys and watching for a JUMP catches a
//    threshold at ANY chroma — an earlier version of this test probed two fixed colours
//    and stayed green when the threshold was moved to 0.05, which is exactly the trap.
//    FALSIFIED BY: reinstating `if (ca < X || cb < X) return <rectangular>` in
//    lerpPolarLab for X anywhere in the swept range — the jump lands at X.
{
  const target = P('#FFD000');
  // Neutral grey walked toward red in even steps: chroma rises smoothly through 0.
  const probes: RGB[] = [];
  for (let k = 0; k <= 24; k++) probes.push({ r: 128 + k, g: 128 - k, b: 128 - k });
  const ramps = probes.map((p) => Array.from({ length: 21 }, (_, i) => lerpOklab(p, target, i / 20)));
  let worstJump = 0, jumpAt = 0;
  for (let k = 1; k < ramps.length; k++) {
    let d = 0;
    for (let i = 0; i < 21; i++) {
      d = Math.max(d, Math.abs(ramps[k][i].r - ramps[k - 1][i].r),
                      Math.abs(ramps[k][i].g - ramps[k - 1][i].g),
                      Math.abs(ramps[k][i].b - ramps[k - 1][i].b));
    }
    if (d > worstJump) { worstJump = d; jumpAt = k; }
  }
  // Each step moves the input by 1/255 per channel; a smooth blend answers in kind.
  ok(worstJump < 6, `no chroma cliff across a near-grey sweep (worst step ${worstJump.toFixed(1)}/255 at probe ${jumpAt})`);
}

// 4) Rectangular Oklab IS the straight line — bow is EXACTLY zero whenever the line
//    stays inside sRGB. This is what makes it the centre of the picker's axis, so it
//    is the claim worth pinning; the only thing that bends it is gamut mapping pulling
//    an out-of-sRGB midpoint back in (#3300CC→#00CC33 bows 0.0036 for that reason,
//    measured 2026-09-10), which is correct behaviour, not drift.
//    FALSIFIED BY: routing lerpOklabRect through lerpPolarLab — every in-gamut pair
//    below then bows and this goes red on the first one.
{
  const inGamut = (lab: { L: number; a: number; b: number }) => {
    const l = (lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b) ** 3;
    const m = (lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b) ** 3;
    const s = (lab.L - 0.0894841775 * lab.a - 1.2914855480 * lab.b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ].every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  };
  let worstBow = 0, worstL = 0, checked = 0;
  for (const [x, y] of PAIRS) {
    const c1 = P(x), c2 = P(y);
    const A = toLab(c1), B = toLab(c2);
    const straight = { L: (A.L + B.L) / 2, a: (A.a + B.a) / 2, b: (A.b + B.b) / 2 };
    if (!inGamut(straight)) continue;   // gamut mapping legitimately bends these
    checked++;
    const M = toLab(lerpOklabRect(c1, c2, 0.5));
    worstBow = Math.max(worstBow, Math.hypot(M.a - straight.a, M.b - straight.b));
    worstL = Math.max(worstL, Math.abs(M.L - straight.L));
  }
  ok(checked >= 4 && worstBow < 1e-5 && worstL < 1e-5,
    `rectangular Oklab is exactly the straight line where it fits in sRGB (${checked} pairs, bow ${worstBow.toExponential(1)}, lightness ${worstL.toExponential(1)})`);
}

// 5) Every mode returns its endpoints EXACTLY. The editor contract: a knot renders the
//    colour the user set. Spectral and the polar modes each reach this differently.
//    NOTE: this does NOT depend on lerpSpectral's t<=0 / t>=1 short-circuit — spectral
//    mixing already returns the endpoints exactly (verified by removing it and watching
//    this stay green). That short-circuit is there to skip a 38-band mix at every
//    segment boundary, not for correctness.
{
  const MODES: BlendColorSpace[] = ['spectral', 'rgb', 'oklab-rect', 'oklab', 'cielch', 'hsv'];
  let bad = '';
  for (const m of MODES) {
    for (const [x, y] of PAIRS) {
      const c1 = P(x), c2 = P(y);
      const a = blendLerp(c1, c2, 0, m), b = blendLerp(c1, c2, 1, m);
      if (rgbToHex(a) !== x || rgbToHex(b) !== y) bad += ` ${m}:${x}->${rgbToHex(a)},${y}->${rgbToHex(b)}`;
    }
  }
  ok(bad === '', `every mode returns its endpoints exactly${bad && ' —' + bad}`);
}

// 6) The spectral memo resolves the RIGHT Color for every colour. lerpSpectral caches
//    on packed RGB; ANY narrower key collides, and because the cache is first-write-wins
//    the damage shows up on the colour that arrives SECOND, not the one already cached.
//    Self-mix is the oracle that needs no reference implementation: mixing a colour with
//    itself must return that colour, and it cannot if the lookup handed back a different
//    pigment. An earlier version of this test compared a warm read against an earlier
//    warm read and stayed green under a broken key — first-write-wins made both reads
//    agree. Do not weaken this back to a stability check.
//    FALSIFIED BY: `const key = Math.round(c.r)` — #FF0000 then resolves to the already
//    cached #FFFF00 and self-mixes to yellow.
{
  // Warm the cache in an order that traps every narrow key (r alone, g alone, sums).
  for (const h of ['#FFFF00', '#00FFFF', '#FF00FF', '#0000FF', '#00FF00', '#808080']) {
    lerpSpectral(P(h), P('#123456'), 0.5);
  }
  let bad = '';
  for (const h of ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#7F3FBF', '#0E4D64']) {
    const self = rgbToHex(lerpSpectral(P(h), P(h), 0.5));
    if (self !== h) bad += ` ${h}->${self}`;
  }
  ok(bad === '', `spectral memo resolves the right Color for every colour${bad && ' — collided:' + bad}`);
}

// 7) Spectral actually mixes like pigment — blue + yellow must reach green, which is the
//    whole reason the mode exists. Goes through blendLerp, not lerpSpectral, so it also
//    guards the DISPATCH: an earlier version called lerpSpectral directly and stayed
//    green when `case 'spectral'` was repointed at lerpRGB.
//    FALSIFIED BY: pointing 'spectral' at lerpRGB in blendLerp — midpoint goes grey.
{
  const mid = blendLerp(P('#0000FF'), P('#FFFF00'), 0.5, 'spectral');
  const h = hueDeg(mid);
  // Oklab hue of green sits near 145 deg; grey/mud would be far off or near-achromatic.
  ok(chromaOf(mid) > 0.05 && h > 110 && h < 175, `spectral reaches green from blue + yellow (${rgbToHex(mid)}, hue ${h.toFixed(0)} deg)`);
}

// 8) Every mode in the type union survives a save/load round trip. This is the guard
//    against the editorConfig whitelist drifting behind the union.
//    FALSIFIED BY: removing 'cielch' from BLEND_SPACES — it silently becomes 'oklab'.
{
  const stops: GradientStop[] = [
    { id: 's1', position: 0, color: '#0B1026', bias: 0.5, interpolation: 'linear' },
    { id: 's2', position: 1, color: '#FFD166', bias: 0.5, interpolation: 'linear' },
  ];
  const ALL: BlendColorSpace[] = ['spectral', 'rgb', 'oklab-rect', 'oklab', 'cielch', 'hsv', 'hsv-far'];
  let bad = '';
  for (const m of ALL) {
    const restored = coerceGradientConfig(JSON.parse(JSON.stringify({ stops, colorSpace: 'srgb', blendSpace: m })));
    if (!restored || restored.blendSpace !== m) bad += ` ${m}->${restored ? restored.blendSpace : 'null'}`;
  }
  ok(bad === '', `every blend space survives save/load${bad && ' — reset:' + bad}`);
}

// 9) The ramp renderer routes each mode to ITS OWN lerp, end to end (blendLerp is
//    reached through sampleSorted, not called directly, so this is the integration
//    edge). Pinned against the specific function rather than "the three differ" — a
//    distinctness check passes even when a mode is wired to the wrong lerp, as long as
//    the wrong answer happens to differ from the other two.
//    FALSIFIED BY: swapping any two cases in blendLerp's switch.
{
  const stops: GradientStop[] = [
    { id: 's1', position: 0, color: '#0000FF', bias: 0.5, interpolation: 'linear' },
    { id: 's2', position: 1, color: '#FFFF00', bias: 0.5, interpolation: 'linear' },
  ];
  const c1 = P('#0000FF'), c2 = P('#FFFF00');
  const cases: [BlendColorSpace, (a: RGB, b: RGB, t: number) => RGB][] = [
    ['spectral', lerpSpectral], ['oklab-rect', lerpOklabRect],
    ['oklab', lerpOklab], ['cielch', lerpCieLch],
  ];
  let bad = '';
  let shown = '';
  for (const [mode, fn] of cases) {
    const ramp = renderStopsToRamp(stops, mode, 'srgb');
    // texel i samples i/255, so texel 128 is t = 128/255 exactly.
    const want = rgbToHex(fn(c1, c2, 128 / 255));
    const got = rgbToHex(ramp[128]);
    shown += ` ${mode}=${got}`;
    if (ramp.length !== 256 || got !== want) bad += ` ${mode}: got ${got} want ${want}`;
  }
  ok(bad === '', `renderStopsToRamp routes each mode to its own lerp${bad ? ' —' + bad : ' (' + shown.trim() + ')'}`);
}

// 10) The chooser order covers every non-retired mode exactly once. Three surfaces read
//     BLEND_SPACE_ORDER (the strip picker, the context menu, the Stops dock), so a mode
//     missing from it is a mode nobody can select even though it renders and saves.
//     The full union is restated here BY HAND on purpose: importing it would make this
//     tautological, and the point is to force a human decision when the union grows.
//     FALSIFIED BY: dropping 'cielch' from BLEND_SPACE_ORDER, and by adding a duplicate.
{
  const RETIRED: BlendColorSpace[] = ['hsv-far'];
  const ALL: BlendColorSpace[] = ['spectral', 'rgb', 'oklab-rect', 'oklab', 'cielch', 'hsv', 'hsv-far'];
  const want = ALL.filter((m) => !RETIRED.includes(m));
  const missing = want.filter((m) => !BLEND_SPACE_ORDER.includes(m));
  const extra = BLEND_SPACE_ORDER.filter((m) => !want.includes(m));
  const dupes = BLEND_SPACE_ORDER.filter((m, i) => BLEND_SPACE_ORDER.indexOf(m) !== i);
  const unlabelled = ALL.filter((m) => !BLEND_SPACE_LABEL[m]);
  const parts: string[] = [];
  if (missing.length) parts.push('missing: ' + missing.join(','));
  if (extra.length) parts.push('unexpected: ' + extra.join(','));
  if (dupes.length) parts.push('duplicated: ' + dupes.join(','));
  if (unlabelled.length) parts.push('unlabelled: ' + unlabelled.join(','));
  ok(parts.length === 0, 'the chooser order covers every non-retired blend space exactly once' + (parts.length ? ' - ' + parts.join('; ') : ''));
}

console.log(failures === 0 ? '\nblend spaces: all passed' : `\nblend spaces: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
