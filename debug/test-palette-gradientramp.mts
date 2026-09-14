/**
 * Guard: the RAMP form of a gradient (ADR-0122) — the codec, the one reader, the texture seam,
 * and the automatic "keep stops only when cheap" rule.
 *
 *   [1] codec: 256 random texels encode to 1,024 base64 chars and decode back exactly; a
 *       malformed string (short, padded, non-base64) decodes to null.
 *   [2] the texture seam: a ramp gradient bakes its texels verbatim under `srgb`, and under
 *       `linear` / `aces_inverse` bakes EXACTLY what the equivalent 256-stop rgb gradient does —
 *       the two forms share the colour-space transform, not a copy of it.
 *   [3] precedence: stops win over a stale `ramp`; a config with neither gets the greyscale ramp.
 *   [4] the CSS preview: a ramp gradient is 256 texel stops, not the black→white fallback.
 *   [5] rampToGradientConfig: the form flips exactly at the limit (a free fit needing ≤ limit
 *       keeps ITS stops; one needing more becomes the ramp), and a period-2 zebra — the
 *       8ZEBBOW2 shape that fitted to 126 black stops — becomes a ramp that renders exactly.
 *   [6] normalizeGradientConfig strips a stale ramp from a stop gradient and returns the same
 *       object when there is nothing to strip.
 *
 * Run: `npm run test:palette-gradientramp` (also a link of `test:palette`)
 *
 * ── FALSIFIED 2026-09-14 ─────────────────────────────────────────────────
 *   Dropping decodeRampBytes' length check ALONE stays green, and that is correct, not a hole:
 *     RAMP_STRING_RE already admits only 1,024 chars, which always decode to 768 bytes. The two
 *     are walls for one thing. Loosening the regex to `^[A-Za-z0-9+/=]+$` reds [6] ("a malformed
 *     ramp string is dropped" — isRampString says yes); loosening it AND dropping the length
 *     check reds [1] too ("a malformed ramp string is refused").
 *   generateGradientTextureBuffer's ramp branch ignoring colorSpace: [2] red on linear and
 *     aces_inverse, srgb green.
 *   renderGradientToRamp preferring `ramp` over stops (`stops.length > 0 && !input.ramp`): [3]
 *     red on the reader; the texture seam's own precedence is the separate assertion above it.
 *   rampToGradientConfig accepting with `<` instead of `<=`: [5] red ("form flips at the cap" and
 *     "kept stops are the free fit's" — the sweep includes a free fit of exactly the limit).
 *   rampToGradientConfig without its faithfulness check (the first cut, which trusted "ended
 *     under the limit" to mean "met targetDE"): [5] red, "a cheap fit missing > 4 texels becomes
 *     a ramp; missing a few stays stops". Found by the licensing agent on 22 cpt-city entries.
 */
import {
  encodeRamp, decodeRamp, decodeRampBytes, isRampString, isRampGradient, makeRampGradient,
  normalizeGradientConfig, RAMP_STRING_LENGTH,
} from '../utils/gradientRamp';
import { generateGradientTextureBuffer, renderGradientToRamp, getGradientCssString, renderStopsToBuffer, renderStopsToRamp } from '../utils/colorUtils';
import { fitRampToStops, rampToGradientConfig, STOP_LAYER_CAP, FAITHFUL_MISS_TEXELS } from '../palette/core/stopFit';
import { oklabDistance } from '../palette/core/oklab';
import type { GradientConfig, GradientStop } from '../types';

let failures = 0;
const check = (cond: boolean, msg: string) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.log(`  ✗ ${msg}`); }
};

type RGB = { r: number; g: number; b: number };
let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const randomRamp = (): RGB[] => Array.from({ length: 256 }, () => ({ r: Math.floor(rand() * 256), g: Math.floor(rand() * 256), b: Math.floor(rand() * 256) }));
const toHex = (c: RGB) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');
/** The same ramp as 256 rgb-blended stops — renders byte-identically through sampleSorted. */
const asStops = (ramp: RGB[], colorSpace: GradientConfig['colorSpace']): GradientConfig => ({
  stops: ramp.map((c, i): GradientStop => ({ id: `s${i}`, position: i / 255, color: toHex(c) })),
  colorSpace,
  blendSpace: 'rgb',
});
const sameBuf = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

console.log('[1] codec');
{
  const ramp = randomRamp();
  const s = encodeRamp(ramp);
  check(s.length === RAMP_STRING_LENGTH && isRampString(s), `encodes to ${RAMP_STRING_LENGTH} base64 chars (got ${s.length})`);
  const back = decodeRamp(s)!;
  check(!!back && back.every((c, i) => c.r === ramp[i].r && c.g === ramp[i].g && c.b === ramp[i].b), 'codec round-trips 256 random texels');
  check(encodeRamp(ramp.map((c) => ({ r: c.r + 0.4, g: c.g - 0.4, b: c.b }))) === s, 'float texels round to the nearest byte');
  const truncated = s.slice(0, 1020) + 'AAA=';
  check(decodeRampBytes(truncated) === null && decodeRampBytes(s.slice(0, 1000)) === null && decodeRampBytes('!'.repeat(1024)) === null && decodeRampBytes(42) === null,
    'a malformed ramp string is refused');
}

console.log('\n[2] texture seam');
{
  const ramp = randomRamp();
  const rg = makeRampGradient(ramp);
  const srgb = generateGradientTextureBuffer(rg);
  let verbatim = true;
  for (let i = 0; i < 256; i++) if (srgb[i * 4] !== ramp[i].r || srgb[i * 4 + 1] !== ramp[i].g || srgb[i * 4 + 2] !== ramp[i].b || srgb[i * 4 + 3] !== 255) verbatim = false;
  check(verbatim, 'srgb ramp buffer is the texels verbatim');
  for (const cs of ['srgb', 'linear', 'aces_inverse'] as const) {
    const a = generateGradientTextureBuffer({ ...rg, colorSpace: cs });
    const b = generateGradientTextureBuffer(asStops(ramp, cs));
    check(sameBuf(a, b), `${cs}: ramp gradient bakes byte-identical to its 256-stop equivalent`);
  }
  const lin = renderGradientToRamp({ ...rg, colorSpace: 'linear' });
  const disp = renderGradientToRamp({ ...rg, colorSpace: 'linear' }, 'srgb');
  check(disp.every((c, i) => c.r === ramp[i].r) && lin.some((c, i) => c.r !== ramp[i].r), 'a colorSpace override reads the display ramp; without it the config colorSpace applies');
}

console.log('\n[3] precedence');
{
  const ramp = randomRamp();
  const stops: GradientStop[] = [{ id: 'a', position: 0, color: '#ff0000' }, { id: 'b', position: 1, color: '#0000ff' }];
  const both = { stops, ramp: encodeRamp(ramp), colorSpace: 'srgb', blendSpace: 'oklab' } as GradientConfig;
  check(sameBuf(generateGradientTextureBuffer(both), renderStopsToBuffer(stops, 'oklab', 'srgb')), 'stops win over a stale ramp (texture)');
  const r0 = renderGradientToRamp(both)[0];
  check(Math.round(r0.r) === 255 && Math.round(r0.b) === 0, 'stops win over a stale ramp (reader)');
  const neither = renderGradientToRamp({ stops: [], colorSpace: 'srgb', blendSpace: 'oklab' });
  check(neither[0].r === 0 && neither[255].r === 255, 'neither stops nor a valid ramp → the greyscale ramp');
  check(!isRampGradient(both) && isRampGradient(makeRampGradient(ramp)), 'isRampGradient only for the ramp form');
}

console.log('\n[4] CSS preview');
{
  const zebra: RGB[] = Array.from({ length: 256 }, (_, i) => (i % 2 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 200, b: 0 }));
  const css = getGradientCssString(makeRampGradient(zebra));
  const count = (css.match(/#[0-9A-F]{6}/g) ?? []).length;
  check(count === 256 && css.includes('#FFC800 0.00%') && css.includes('#000000 0.39%'), `a ramp gradient previews as its 256 texels (got ${count} stops)`);
}

console.log('\n[5] rampToGradientConfig — the form rule');
{
  /** `bands` hard-edged bands with distinct colours. */
  const banded = (bands: number): RGB[] => Array.from({ length: 256 }, (_, i) => {
    const b = Math.floor((i / 256) * bands);
    return { r: (b * 97) % 256, g: (b * 57 + 40) % 256, b: (b * 151 + 90) % 256 };
  });
  let sawStops = false;
  let sawRamp = false;
  let sawExactlyLimit = false;
  let flipsRight = true;
  let keptSame = true;
  for (let bands = 8; bands <= 64; bands++) {
    const ramp = banded(bands);
    const free = fitRampToStops(ramp, { targetDE: 0.02, maxStops: 200 });
    const cfg = rampToGradientConfig(ramp, { targetDE: 0.02, maxStops: 128 });
    const wantStops = free.stops.length <= STOP_LAYER_CAP;
    if (free.stops.length === STOP_LAYER_CAP) sawExactlyLimit = true;
    if (wantStops !== cfg.stops.length > 0) flipsRight = false;
    if (wantStops) {
      sawStops = true;
      if (JSON.stringify(cfg.stops) !== JSON.stringify(free.stops) || cfg.ramp !== undefined) keptSame = false;
    } else {
      sawRamp = true;
      if (!isRampGradient(cfg)) flipsRight = false;
    }
  }
  check(sawStops && sawRamp, 'the sweep lands on both sides of the cap');
  check(sawExactlyLimit, `the sweep includes a ramp whose free fit needs exactly ${STOP_LAYER_CAP} stops`);
  check(flipsRight, 'form flips at the cap');
  check(keptSame, "kept stops are the free fit's, with no ramp field");

  // FAITHFUL: a fit under the cap that still misses on more than FAITHFUL_MISS_TEXELS texels is a
  // ramp; one that misses a few edge texels stays stops. Thin random bands (1–12 texels) are what
  // produce both.
  const thinBands = (seedIn: number): RGB[] => {
    let s = seedIn;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const out: RGB[] = [];
    while (out.length < 256) {
      const w = 1 + Math.floor(rnd() * 12);
      const c = { r: Math.floor(rnd() * 256), g: Math.floor(rnd() * 256), b: Math.floor(rnd() * 256) };
      for (let k = 0; k < w && out.length < 256; k++) out.push(c);
    }
    return out;
  };
  let sawFewKept = false;
  let sawManyRamp = false;
  let faithfulRight = true;
  for (let sd = 1; sd <= 40; sd++) {
    const ramp = thinBands(sd);
    const free = fitRampToStops(ramp, { targetDE: 0.02, maxStops: STOP_LAYER_CAP + 1 });
    const rendered = renderStopsToRamp(free.stops, 'oklab', 'srgb');
    let miss = 0;
    for (let i = 0; i < 256; i++) if (oklabDistance(rendered[i], ramp[i]) > 0.05) miss++;
    const cheap = free.stops.length <= STOP_LAYER_CAP;
    const want = cheap && miss <= FAITHFUL_MISS_TEXELS;
    const cfg = rampToGradientConfig(ramp, { targetDE: 0.02, maxStops: 128 });
    if (want !== cfg.stops.length > 0) faithfulRight = false;
    if (cheap && miss > 0 && miss <= FAITHFUL_MISS_TEXELS) sawFewKept = true;
    if (cheap && miss > FAITHFUL_MISS_TEXELS) sawManyRamp = true;
  }
  check(sawFewKept && sawManyRamp, 'the thin-band sweep has a cheap fit missing a few texels AND one missing more');
  check(faithfulRight, `a cheap fit missing > ${FAITHFUL_MISS_TEXELS} texels becomes a ramp; missing a few stays stops`);

  const zebra: RGB[] = Array.from({ length: 256 }, (_, i) => (i % 2 ? { r: 0, g: 0, b: 0 } : { r: 252, g: (i * 7) % 256, b: 180 }));
  const z = rampToGradientConfig(zebra, { targetDE: 0.02, maxStops: 128 });
  const zr = renderGradientToRamp(z);
  check(isRampGradient(z) && zr.every((c, i) => c.r === zebra[i].r && c.g === zebra[i].g && c.b === zebra[i].b), 'zebra becomes a ramp and renders exactly');

  const smooth: RGB[] = Array.from({ length: 256 }, (_, i) => ({ r: i, g: 64, b: 255 - i }));
  const s = rampToGradientConfig(smooth);
  check(s.stops.length > 0 && s.stops.length <= 8 && s.ramp === undefined, `a smooth two-colour ramp stays stops (got ${s.stops.length})`);
  check(rampToGradientConfig(zebra, { cap: Infinity, maxStops: 1000 }).stops.length > 0, 'cap: Infinity with a big enough budget keeps stops (only the budget limits it)');
}

console.log('\n[6] normalizeGradientConfig');
{
  const stops: GradientStop[] = [{ id: 'a', position: 0, color: '#000000' }, { id: 'b', position: 1, color: '#ffffff' }];
  const stale = { stops, ramp: encodeRamp(randomRamp()), colorSpace: 'srgb', blendSpace: 'oklab' } as GradientConfig;
  const n = normalizeGradientConfig(stale);
  check(!('ramp' in n) && n.stops === stops, 'a stop gradient loses its stale ramp');
  const plain: GradientConfig = { stops, colorSpace: 'srgb', blendSpace: 'oklab' };
  check(normalizeGradientConfig(plain) === plain, 'nothing to strip → the same object');
  const rg = makeRampGradient(randomRamp());
  check(normalizeGradientConfig(rg) === rg, 'a ramp gradient is left as it is');
  const bad = { stops: [], ramp: 'nope', colorSpace: 'srgb', blendSpace: 'oklab' } as GradientConfig;
  check(!('ramp' in normalizeGradientConfig(bad)), 'a malformed ramp string is dropped');
}

console.log(failures === 0 ? '\nPASS — the ramp form holds' : `\nFAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
