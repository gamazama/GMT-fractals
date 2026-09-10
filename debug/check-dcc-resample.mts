/**
 * check-dcc-resample — the two claims the Cinema 4D / Blender export rests on.
 *
 * 1. Reducing with Douglas-Peucker holds every measured pair inside 4/255 of the app's own
 *    ramp, and rescues the ones even spacing gets badly wrong. The spec the exporter was
 *    built from recommends even spacing; that advice holds for a smooth curve, and GMT's
 *    are not smooth — gamut mapping puts a kink in an OKLCh ramp wherever it leaves the
 *    sRGB boundary. Note D-P does NOT win everywhere: on an easy ramp it stops early and
 *    can sit a fraction behind. Cited as the proof of the @invariant in
 *    palette/core/dccExport.ts.
 * 2. The payload markers are still in the two .py templates. `withPayload` throws without
 *    them, and a rename in the Python would otherwise only surface at export time.
 *
 * Run: npx tsx debug/check-dcc-resample.mts
 */
import { readFileSync } from 'fs';
import { renderStopsToRamp } from '../utils/colorUtils';
import { reduceStopIndices, STOP_BUDGETS } from '../palette/core/exportFormats';
import type { RGB } from '../palette/core/oklab';

const PAIRS: [string, string, string][] = [
  ['blue -> yellow', '#0000ff', '#ffff00'],
  ['navy -> orange', '#001f5b', '#ff8c1a'],
  ['magenta -> green', '#ff00ff', '#00c853'],
  ['deep purple -> cream', '#0d0426', '#fff2d9'],
  ['teal -> crimson', '#008080', '#dc143c'],
];

const stopsOf = (a: string, b: string) =>
  [
    { id: 'a', position: 0, color: a, bias: 0.5, interpolation: 'linear' },
    { id: 'b', position: 1, color: b, bias: 0.5, interpolation: 'linear' },
  ] as never;

/** Read a stop set back the way both DCCs do: straight linear RGB between neighbours. */
const readLinear = (ramp: RGB[], idx: number[]): RGB[] => {
  const out: RGB[] = new Array(256);
  for (let s = 0; s < idx.length - 1; s++) {
    const i0 = idx[s];
    const i1 = idx[s + 1];
    const c0 = ramp[i0];
    const c1 = ramp[i1];
    for (let i = i0; i <= i1; i++) {
      const t = i1 === i0 ? 0 : (i - i0) / (i1 - i0);
      out[i] = { r: c0.r + (c1.r - c0.r) * t, g: c0.g + (c1.g - c0.g) * t, b: c0.b + (c1.b - c0.b) * t };
    }
  }
  return out;
};

const maxErr = (a: RGB[], b: RGB[]) => {
  let m = 0;
  for (let i = 0; i < 256; i++) m = Math.max(m, Math.abs(a[i].r - b[i].r), Math.abs(a[i].g - b[i].g), Math.abs(a[i].b - b[i].b));
  return m;
};
const evenIdx = (n: number) => Array.from({ length: n }, (_, k) => Math.round((k * 255) / (n - 1)));

const fails: string[] = [];
const rescued: string[] = [];
/** Past this, a DCC render stops looking like the browser's gradient. */
const BUDGET = 4;
const N = STOP_BUDGETS.c4d;
console.log(`resampling to ${N} stops — max per-channel error in 8-bit units\n`);
console.log('pair                    even     D-P');
for (const [name, a, b] of PAIRS) {
  const truth = renderStopsToRamp(stopsOf(a, b), 'oklab', 'srgb');
  const even = maxErr(truth, readLinear(truth, evenIdx(N)));
  const dp = maxErr(truth, readLinear(truth, reduceStopIndices(truth, N)));
  console.log(`${name.padEnd(22)} ${even.toFixed(1).padStart(5)}  ${dp.toFixed(1).padStart(6)}`);
  // A DCC ramp that misses by more than ~4/255 is visibly not the browser's gradient.
  if (dp > BUDGET) fails.push(`[1] ${name}: D-P error ${dp.toFixed(1)}/255 is past the ${BUDGET}/255 budget`);
  // The claim is NOT that D-P wins everywhere - on a smooth ramp it stops early and can
  // sit a fraction behind even spacing (deep purple -> cream: 0.8 vs 0.2, on 9 stops
  // rather than 32). The claim is that it rescues the ones even spacing gets wrong.
  if (even > BUDGET && dp > even)
    fails.push(`[1] ${name}: even spacing misses by ${even.toFixed(1)} and D-P does no better (${dp.toFixed(1)})`);
  if (even > BUDGET) rescued.push(`${name} ${even.toFixed(1)} -> ${dp.toFixed(1)}`);
}

// [3] the generated module is still what the .py say. It is generated rather than pulled
// in with Vite's `?raw` because node cannot resolve `?raw` and exportFormats.ts is on the
// node-run guards' import path; that makes drift possible, so it is checked.
const gen = await import('./gen-dcc-templates.mjs');
if (readFileSync(gen.OUT, 'utf8') !== gen.render())
  fails.push('[3] palette/core/dcc/templates.generated.ts has drifted from the .py - run `npm run gen:dcc`');

for (const f of ['c4dImport.py', 'blenderImport.py']) {
  const src = readFileSync(new URL(`../palette/core/dcc/${f}`, import.meta.url), 'utf8');
  if (!src.includes('# >>> PAYLOAD')) fails.push(`[2] ${f}: opening payload marker is gone — withPayload would throw`);
  if (!src.includes('# <<< PAYLOAD <<<')) fails.push(`[2] ${f}: closing payload marker is gone — withPayload would throw`);
  if (!/GRADIENTS\s*=\s*\[/.test(src)) fails.push(`[2] ${f}: no GRADIENTS list to replace`);
}

if (fails.length) {
  console.error('\n' + fails.map((f) => '✗ ' + f).join('\n'));
  process.exit(1);
}
if (!rescued.length) fails.push('[1] even spacing cleared the budget on every pair - the D-P reduction is no longer earning its keep');
console.log(`\n✓ [1] D-P holds every pair inside ${BUDGET}/255; even spacing misses on ${rescued.length} (${rescued.join(', ')})`);
console.log('✓ [2] both .py templates still carry the payload markers');
console.log('✓ [3] the generated template module matches the .py');
