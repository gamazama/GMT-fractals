/**
 * Facet-metrics harness — sanity-checks the picker quality metrics on synthetic
 * controls and reports their distribution across the real catalog (so the 0..1
 * normalisers give the filter pads a useful spread).
 *
 * Run: npx tsx debug/test-palette-facets.mts
 */

import fs from 'fs';
import path from 'path';
import { computeFacets, passesFilters } from '../palette/core/facets';
import type { RGB } from '../palette/core/oklab';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); }
};

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

// --- synthetic controls ---
console.log('[1] synthetic controls');
const grayscale = ramp((t) => ({ r: t * 255, g: t * 255, b: t * 255 }));
const rainbow = ramp((t) => hsv(t * 330, 0.9, 0.95));
const singleHue = ramp((t) => hsv(210, 0.7, 0.2 + 0.7 * t)); // one blue hue, dark→light
const banded = ramp((t) => (Math.floor(t * 6) % 2 ? { r: 230, g: 230, b: 230 } : { r: 30, g: 30, b: 30 })); // grey steps = pure texture
const warmPal = ramp((t) => hsv(15 + t * 45, 0.85, 0.9)); // red→orange→yellow
const coolPal = ramp((t) => hsv(180 + t * 60, 0.8, 0.6)); // cyan→blue

const fg = computeFacets(grayscale), fr = computeFacets(rainbow), fs2 = computeFacets(singleHue), fb = computeFacets(banded);
const fw = computeFacets(warmPal), fc = computeFacets(coolPal);
const show = (n: string, f: ReturnType<typeof computeFacets>) =>
  console.log(`  ${n.padEnd(10)} L ${f.lightness.toFixed(2)} C ${f.chroma.toFixed(2)} cov ${f.complexity.toFixed(2)} rb ${f.rainbow.toFixed(2)} warm ${f.warmth.toFixed(2)}  (hf ${f.raw.hf.toFixed(3)} spread ${f.raw.hueSpreadDeg.toFixed(0)}° order ${f.raw.hueOrder.toFixed(2)})`);
show('grayscale', fg); show('rainbow', fr); show('singleHue', fs2); show('banded', fb); show('warm', fw); show('cool', fc);

ok(fg.chroma < 0.06, `grayscale chroma ${fg.chroma.toFixed(3)} should be ~0`);
ok(fg.rainbow < 0.1, `grayscale rainbow ${fg.rainbow.toFixed(3)} should be ~0`);
ok(fr.rainbow > 0.6, `rainbow rainbow ${fr.rainbow.toFixed(3)} should be high`);
ok(fr.raw.hueOrder > 0.7, `rainbow hueOrder ${fr.raw.hueOrder.toFixed(3)} should be orderly`);
ok(fr.chroma > 0.5, `rainbow chroma ${fr.chroma.toFixed(3)} should be vivid`);
ok(fs2.rainbow < fr.rainbow - 0.3, `singleHue rainbow ${fs2.rainbow.toFixed(2)} should be << rainbow ${fr.rainbow.toFixed(2)}`);
ok(fb.complexity > fr.complexity, `banded complexity ${fb.complexity.toFixed(2)} should exceed smooth rainbow ${fr.complexity.toFixed(2)}`);
ok(fw.warmth > 0.6, `warm palette warmth ${fw.warmth.toFixed(2)} should be high`);
ok(fc.warmth < 0.4, `cool palette warmth ${fc.warmth.toFixed(2)} should be low`);

// passesFilters sanity
ok(passesFilters(fr, { qRb: [0.6, 1] }), 'rainbow passes qRb=[0.6,1]');
ok(!passesFilters(fg, { qRb: [0.6, 1] }), 'grayscale fails qRb=[0.6,1]');
ok(passesFilters(fg, {}), 'empty filter passes all');

// --- distribution across the real catalog ---
const loadMap = (p: string): RGB[] => {
  const rows: number[][] = [];
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.trim().split(/\s+/);
    if (m.length < 3) continue;
    const r = +m[0], g = +m[1], b = +m[2];
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) rows.push([r, g, b]);
  }
  if (rows.length === 256) return rows.map(([r, g, b]) => ({ r, g, b }));
  const out: RGB[] = [];
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (rows.length - 1), a = Math.floor(t), bb = Math.min(rows.length - 1, a + 1), f = t - a;
    out.push({ r: Math.round(rows[a][0] * (1 - f) + rows[bb][0] * f), g: Math.round(rows[a][1] * (1 - f) + rows[bb][1] * f), b: Math.round(rows[a][2] * (1 - f) + rows[bb][2] * f) });
  }
  return out;
};

const DIRS = ['H:/GMT/workspace-gmt/Palettes', 'H:/GMT/stuff/palette-lab/bundles/cptcity', 'H:/GMT/stuff/palette-lab/bundles/matplotlib'];
let files: string[] = [];
for (const d of DIRS) {
  if (!fs.existsSync(d)) continue;
  const fl = fs.readdirSync(d).filter((f) => /\.map$/i.test(f));
  const stride = Math.max(1, Math.floor(fl.length / 40));
  for (let i = 0; i < fl.length; i += stride) files.push(path.join(d, fl[i]));
}

console.log(`\n[2] distribution across ${files.length} real palettes (p10 / p50 / p90 per axis)`);
if (files.length === 0) {
  console.log('  (no palettes found — skipping)');
} else {
  const axes = ['lightness', 'chroma', 'complexity', 'rainbow', 'warmth'] as const;
  const cols: Record<string, number[]> = Object.fromEntries(axes.map((a) => [a, []]));
  for (const f of files) {
    const fac = computeFacets(loadMap(f));
    for (const a of axes) cols[a].push(fac[a]);
  }
  const pct = (arr: number[], p: number) => { const s = [...arr].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
  for (const a of axes) {
    const v = cols[a];
    console.log(`  ${a.padEnd(11)} ${pct(v, 0.1).toFixed(2)} / ${pct(v, 0.5).toFixed(2)} / ${pct(v, 0.9).toFixed(2)}`);
    // Each axis should carve usefully: a real spread between the 10th and 90th pct.
    ok(pct(v, 0.9) - pct(v, 0.1) > 0.15, `${a} spread (p90−p10 = ${(pct(v, 0.9) - pct(v, 0.1)).toFixed(2)}) should exceed 0.15`);
  }
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
