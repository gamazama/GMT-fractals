/**
 * facetName harness — asserts the frozen-ahead facetsToName() helper composes stable,
 * deterministic labels across the facet space (warm/cool, vivid/muted/soft, dark/bright,
 * rainbow). Pure: builds Facets objects directly so the labelling thresholds are tested
 * independently of the OKLab maths, plus one end-to-end rampToName() check.
 *
 * Run: npx tsx debug/test-palette-facetname.mts
 */

import { facetsToName, rampToName } from '../palette/core/facetName';
import type { Facets } from '../palette/core/facets';
import type { RGB } from '../palette/core/oklab';

let failures = 0;
const eq = (got: string, want: string, label: string) => {
  if (got !== want) { failures++; console.error(`  ✗ ${label}: got "${got}", want "${want}"`); }
  else console.log(`  ✓ ${label.padEnd(22)} → "${got}"`);
};

// Build a Facets object from the 5 normalised axes; raw is irrelevant to naming.
const F = (lightness: number, chroma: number, rainbow: number, warmth: number, complexity = 0.3): Facets => ({
  lightness, chroma, complexity, rainbow, warmth,
  raw: { meanL: lightness, meanC: chroma, hf: 0, hueSpreadDeg: rainbow * 360, meanHue: 0, meanA: 0, hueOrder: 0 },
});

console.log('[1] facetsToName — composed labels across the facet space');
// warmth · intensity · lightness · rainbow combinations
eq(facetsToName(F(0.5, 0.8, 0.1, 0.8)), 'Warm Vivid', 'warm vivid mid-light');
eq(facetsToName(F(0.5, 0.1, 0.1, 0.2)), 'Cool Muted', 'cool muted mid-light');
eq(facetsToName(F(0.5, 0.8, 0.9, 0.2)), 'Cool Vivid Rainbow', 'cool vivid rainbow');
eq(facetsToName(F(0.2, 0.1, 0.1, 0.5)), 'Dark Muted', 'dark muted neutral-warmth');
eq(facetsToName(F(0.85, 0.8, 0.1, 0.8)), 'Bright Warm Vivid', 'bright warm vivid');
eq(facetsToName(F(0.5, 0.3, 0.1, 0.5)), 'Soft', 'soft, all-else-neutral');
eq(facetsToName(F(0.5, 0.5, 0.1, 0.5)), 'Neutral', 'fully neutral → fallback');
eq(facetsToName(F(0.9, 0.9, 0.9, 0.9)), 'Bright Warm Vivid Rainbow', 'all-high stacks all parts');

console.log('\n[2] determinism + totality (random facet space never empty)');
let seed = 1234567;
const rng = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
for (let i = 0; i < 500; i++) {
  const f = F(rng(), rng(), rng(), rng());
  const a = facetsToName(f), b = facetsToName(f);
  if (a !== b) { failures++; console.error(`  ✗ non-deterministic: "${a}" vs "${b}"`); break; }
  if (!a || a.trim().length === 0) { failures++; console.error(`  ✗ empty label produced`); break; }
}
if (failures === 0) console.log('  ✓ 500 random facets all deterministic + non-empty');

console.log('\n[3] rampToName — end-to-end through computeFacets');
const hsv = (h: number, s: number, v: number): RGB => {
  h = ((h % 360) + 360) % 360 / 60;
  const c = v * s, x = c * (1 - Math.abs((h % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 1) [r, g, b] = [c, x, 0];
  else if (h < 2) [r, g, b] = [x, c, 0];
  else if (h < 3) [r, g, b] = [0, c, x];
  else if (h < 4) [r, g, b] = [0, x, c];
  else if (h < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
};
const ramp = (fn: (t: number) => RGB): RGB[] => Array.from({ length: 256 }, (_, i) => fn(i / 255));
const ok = (cond: boolean, label: string) => {
  if (!cond) { failures++; console.error(`  ✗ ${label}`); }
  else console.log(`  ✓ ${label}`);
};
const rainbowName = rampToName(ramp((t) => hsv(t * 330, 0.9, 0.95)));
console.log(`  rainbow ramp → "${rainbowName}"`);
ok(/Rainbow$/.test(rainbowName) && /Vivid/.test(rainbowName), 'rainbow ramp is Vivid + Rainbow');

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
