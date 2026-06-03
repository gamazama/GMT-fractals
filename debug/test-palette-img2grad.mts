/**
 * img2grad harness — verifies the image→gradient extraction is DETERMINISTIC and
 * gamut-safe across all three modes. The standalone tool's #1 bug was a Math.random
 * k-means seed that made the ribbon flip-flop on every slider drag; this asserts the
 * deterministic port never does that: same image + settings ⇒ byte-identical ramp.
 *
 * Run: npx tsx debug/test-palette-img2grad.mts
 */

import { ingestPixels } from '../palette/core/img2grad/ingest';
import { extract, autoPath, type Img2GradParams, type Img2GradMode } from '../palette/core/img2grad';
import type { RGB } from '../palette/core/oklab';
import type { TracePath } from '../palette/core/img2grad/common';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  }
};

// --- synthetic test image: a hue sweep left→right, a vertical light gradient, and a
// bright salient blob near the centre (gives Distill/Tone/Trace all something to find).
const hsv = (h: number, s: number, v: number): [number, number, number] => {
  h = (((h % 360) + 360) % 360) / 60;
  const c = v * s,
    x = c * (1 - Math.abs((h % 2) - 1)),
    m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 1) [r, g, b] = [c, x, 0];
  else if (h < 2) [r, g, b] = [x, c, 0];
  else if (h < 3) [r, g, b] = [0, c, x];
  else if (h < 4) [r, g, b] = [0, x, c];
  else if (h < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

const W = 120,
  H = 80;
const makeImage = (): Uint8ClampedArray => {
  const d = new Uint8ClampedArray(W * H * 4);
  const cx = W / 2,
    cy = H / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const hue = (x / (W - 1)) * 320;
      const val = 0.25 + 0.6 * (y / (H - 1));
      let [r, g, b] = hsv(hue, 0.75, val);
      // salient warm blob
      const dd = Math.hypot(x - cx, y - cy);
      if (dd < 14) {
        const k = 1 - dd / 14;
        r = r * (1 - k) + 250 * k;
        g = g * (1 - k) + 210 * k;
        b = b * (1 - k) + 60 * k;
      }
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  return d;
};

const eqRamp = (a: RGB[], b: RGB[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].r !== b[i].r || a[i].g !== b[i].g || a[i].b !== b[i].b) return false;
  return true;
};
const inGamut = (a: RGB[]): boolean =>
  a.every((c) => c.r >= 0 && c.r <= 255 && c.g >= 0 && c.g <= 255 && c.b >= 0 && c.b <= 255);

const baseParams = (mode: Img2GradMode): Img2GradParams => ({
  mode,
  goldenHour: 0,
  spacing: 0.35,
  reverse: false,
  colours: 8,
  saliency: 0.45,
  tonalDetail: 48,
  chromaBoost: 1,
  bandWidth: 8,
  smoothing: 3,
});

console.log('[1] ingest determinism');
const px = makeImage();
const m1 = ingestPixels(px, W, H);
const m2 = ingestPixels(makeImage(), W, H);
ok(m1.bins.length === m2.bins.length, `bin count stable (${m1.bins.length} vs ${m2.bins.length})`);
ok(m1.cloud.length > 0 && m1.cloud.length <= 1600, `cloud capped (${m1.cloud.length})`);

const path: TracePath = autoPath(m1);
const path2: TracePath = autoPath(m2);
ok(
  path.x0 === path2.x0 && path.y0 === path2.y0 && path.x1 === path2.x1 && path.y1 === path2.y1,
  'autoPath deterministic',
);

console.log('[2] per-mode determinism + gamut + shape');
for (const mode of ['distill', 'tone', 'trace'] as Img2GradMode[]) {
  const p = baseParams(mode);
  const r1 = extract(m1, path, p);
  const r2 = extract(ingestPixels(makeImage(), W, H), autoPath(m2), p);
  ok(r1.ramp.length === 256, `${mode}: 256 stops`);
  ok(r1.ribbon.length === 256, `${mode}: 256 ribbon points`);
  ok(inGamut(r1.ramp), `${mode}: all colours in gamut`);
  ok(eqRamp(r1.ramp, r2.ramp), `${mode}: identical image+settings ⇒ identical ramp`);

  // reverse flips the ramp
  const rev = extract(m1, path, { ...p, reverse: true });
  const flipped = r1.ramp.slice().reverse();
  ok(eqRamp(rev.ramp, flipped), `${mode}: reverse mirrors the ramp`);
}

console.log('[3] distill respects colour count');
{
  // few colours → ordered nodes ≤ K (sampled indirectly: a 3-colour distill must not
  // produce more banding variety than a 12-colour one). Cheap proxy: extract runs.
  const small = extract(m1, path, { ...baseParams('distill'), colours: 3 });
  const big = extract(m1, path, { ...baseParams('distill'), colours: 16 });
  ok(small.ramp.length === 256 && big.ramp.length === 256, 'distill colour-count sweep runs');
  ok(!eqRamp(small.ramp, big.ramp), 'distill 3 vs 16 colours differ');
}

console.log('[4] saliency / golden-hour change the result (and stay deterministic)');
{
  const a = extract(m1, path, { ...baseParams('distill'), saliency: 0 });
  const b = extract(m1, path, { ...baseParams('distill'), saliency: 1 });
  ok(!eqRamp(a.ramp, b.ramp), 'saliency 0 vs 1 differ');
  const a2 = extract(ingestPixels(makeImage(), W, H), path, { ...baseParams('distill'), saliency: 0 });
  ok(eqRamp(a.ramp, a2.ramp), 'saliency=0 deterministic across re-ingest');
  const g = extract(m1, path, { ...baseParams('tone'), goldenHour: -1 });
  const g2 = extract(m1, path, { ...baseParams('tone'), goldenHour: 1 });
  ok(!eqRamp(g.ramp, g2.ramp), 'golden-hour shadows vs highlights differ');
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
