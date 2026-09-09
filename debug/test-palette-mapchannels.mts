/**
 * gradient-map channels harness — pins `palette/core/gradientMapChannels.ts`, the seven
 * drivers the Wallpaper gradient map can read an image through (Phase W.4).
 *
 * The module is pure maths over three bytes, so everything here runs on bare node with no
 * canvas and no image. What it proves:
 *   [1] the index → id resolution is stable and total (a stored `mapChannel` can never
 *       resolve to nothing, however old or hand-edited the state is);
 *   [2] every channel stays inside [0,1] across the 8-bit cube — the module's @invariant;
 *   [3] each channel actually reads the property it names (a red ramp moves `red` and not
 *       `blue`; exposure moves `lightness` and not `hue`), which is the half that would
 *       silently rot if someone reordered MAP_CHANNELS;
 *   [4] luma is unchanged from the pre-W.4 expression, so the DEFAULT map still renders
 *       exactly the picture it did before the channel choice existed.
 *
 * Run: npx tsx debug/test-palette-mapchannels.mts
 */

import {
  CHROMA_MAX,
  MAP_CHANNELS,
  mapChannelAt,
  mapChannelValue,
  type MapChannel,
} from '../palette/core/gradientMapChannels';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else console.log('  ✓ ' + msg);
};

// --- [1] index → id is total ------------------------------------------------------------
console.log('[1] channel index resolution');
{
  MAP_CHANNELS.forEach((c, i) => {
    ok(mapChannelAt(i) === c.id, `index ${i} → ${c.id}`);
  });
  ok(mapChannelAt(0) === 'luma', 'index 0 is luma (the default IS the classic gradient map)');
  ok(mapChannelAt(-1) === 'luma', 'a negative index falls back to luma');
  ok(mapChannelAt(999) === 'luma', 'an out-of-range index falls back to luma');
  ok(mapChannelAt(2.4) === 'green', 'a fractional index rounds to its channel');
}

// --- [2] every channel stays in [0,1] over the cube (the module's @invariant) ------------
console.log('[2] range over the 8-bit cube');
{
  const STEP = 8; // 32³ lattice = 32,768 triples per channel
  for (const { id } of MAP_CHANNELS) {
    let worstLo = 1;
    let worstHi = 0;
    for (let r = 0; r <= 255; r += STEP) {
      for (let g = 0; g <= 255; g += STEP) {
        for (let b = 0; b <= 255; b += STEP) {
          const v = mapChannelValue(r, g, b, id);
          if (!Number.isFinite(v)) { worstLo = -1; worstHi = 2; break; }
          if (v < worstLo) worstLo = v;
          if (v > worstHi) worstHi = v;
        }
      }
    }
    // The eight corners are the extremes the lattice can miss when 255 % STEP !== 0.
    for (const r of [0, 255]) for (const g of [0, 255]) for (const b of [0, 255]) {
      const v = mapChannelValue(r, g, b, id);
      if (v < worstLo) worstLo = v;
      if (v > worstHi) worstHi = v;
    }
    ok(worstLo >= 0 && worstHi <= 1, `${id}: in range over the 8-bit cube (${worstLo.toFixed(3)}..${worstHi.toFixed(3)})`);
  }
  // The ceiling is a real one, not a clamp doing all the work: sRGB's most saturated colour
  // must land BELOW 1 with headroom to spare, or every vivid pixel flattens onto one colour.
  const bluest = mapChannelValue(0, 0, 255, 'chroma');
  ok(bluest < 0.95, `chroma: sRGB's most saturated blue keeps headroom (${bluest.toFixed(3)} < 0.95)`);
  ok(CHROMA_MAX > 0.32, 'CHROMA_MAX clears sRGB\'s ~0.32 peak');
}

// --- [3] each channel reads what it names ------------------------------------------------
console.log('[3] each channel reads its own property');
{
  const v = (r: number, g: number, b: number, c: MapChannel) => mapChannelValue(r, g, b, c);

  // Black → 0 and white → 1 for every non-circular channel (hue and chroma are undefined on
  // greys, and the module says so: a grey has no hue, so it lands on 0).
  for (const id of ['luma', 'red', 'green', 'blue', 'lightness'] as MapChannel[]) {
    ok(v(0, 0, 0, id) === 0, `${id}: black is 0`);
    ok(Math.abs(v(255, 255, 255, id) - 1) < 1e-6, `${id}: white is 1`);
  }
  ok(v(128, 128, 128, 'chroma') < 1e-6, 'chroma: a grey has none');
  ok(v(128, 128, 128, 'hue') === 0, 'hue: a grey has none (lands on 0, not on float noise)');

  // The RGB channels are independent: raising red must not move blue.
  ok(v(255, 0, 0, 'red') === 1 && v(255, 0, 0, 'blue') === 0, 'red/blue read their own byte');
  ok(v(0, 255, 0, 'green') === 1, 'green reads its own byte');

  // Hue is about WHICH colour, not how lit: a dark red and a light red are the same hue, and
  // a red and a blue are not. This is the property the luma map cannot express and the whole
  // reason the channel exists.
  const hueDarkRed = v(90, 20, 20, 'hue');
  const hueLightRed = v(255, 190, 190, 'hue');
  ok(Math.abs(hueDarkRed - hueLightRed) < 0.05, 'hue: exposure does not change it');
  ok(Math.abs(v(255, 0, 0, 'hue') - v(0, 0, 255, 'hue')) > 0.1, 'hue: red and blue differ');

  // Chroma is about HOW colourful, not which: a vivid red and a vivid blue read alike, and
  // both read far above a grey of the same lightness.
  ok(v(255, 0, 0, 'chroma') > 0.4 && v(0, 0, 255, 'chroma') > 0.4, 'chroma: vivid reads high');
  ok(v(255, 0, 0, 'chroma') > v(200, 140, 140, 'chroma'), 'chroma: vivid beats muted');

  // Lightness is monotone in exposure, and PERCEPTUAL — mid-grey sits near the middle where
  // the same pixel's linear value would not. (This is the difference from luma that earns it
  // a place beside luma rather than replacing it.)
  ok(v(40, 40, 40, 'lightness') < v(120, 120, 120, 'lightness'), 'lightness: rises with exposure');
  const midL = v(128, 128, 128, 'lightness');
  ok(midL > 0.45 && midL < 0.65, `lightness: mid-grey sits mid-ramp (${midL.toFixed(3)})`);
}

// --- [4] luma is bit-for-bit what it was before the channel choice existed ----------------
console.log('[4] luma is unchanged (the default map still renders the same picture)');
{
  // The expression this replaced, verbatim from gradientMapMode's pre-W.4 inner loop.
  const legacyLuma = (r: number, g: number, b: number): number => {
    let t = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    return t;
  };
  let worst = 0;
  for (let r = 0; r <= 255; r += 5) {
    for (let g = 0; g <= 255; g += 5) {
      for (let b = 0; b <= 255; b += 5) {
        worst = Math.max(worst, Math.abs(mapChannelValue(r, g, b, 'luma') - legacyLuma(r, g, b)));
      }
    }
  }
  ok(worst === 0, 'luma: identical to the pre-W.4 expression across the cube');
  // Fractional inputs reach it too — the caller bilinearly resamples before asking.
  ok(mapChannelValue(12.5, 200.25, 7.75, 'luma') === legacyLuma(12.5, 200.25, 7.75),
    'luma: identical on fractional (resampled) input');
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
