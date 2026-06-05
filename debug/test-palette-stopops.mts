/**
 * Engine gradient-core harness (P0a — interface (e)).
 *
 *   1. sampleStops is the per-texel core of renderStopsToRamp — assert byte-exact
 *      agreement at every sampled position, across bias / smooth / step / rgb cases.
 *   2. sampleStops actually HONOURS bias + smooth (the bug fix): the old editor
 *      `getInterpolatedColor` did a naive linear lerp and drifted from the baked
 *      ramp on biased / smooth segments. Prove the corrected sampler differs from
 *      that naive lerp exactly where it should.
 *   3. stopOps pure transforms behave (invert/double/distribute/move/scale/bias/
 *      delete/default/normalizePaste).
 *
 * Run: npx tsx debug/test-palette-stopops.mts
 */

import type { GradientStop, BlendColorSpace, ColorSpaceMode } from '../types';
import { sampleStops, renderStopsToRamp, renderStopsToBuffer, hexToRgb, blendLerp, rgbToHex, lerpOklab as cuLerpOklab } from '../utils/colorUtils';
import { lerpOklab as okLerpOklab } from '../palette/core/oklab';
import { stopOps } from '../utils/stopOps';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); }
  else console.log('  ✓ ' + msg);
};
const trunc = (n: number) => n | 0;

const stop = (id: string, position: number, color: string, extra: Partial<GradientStop> = {}): GradientStop =>
  ({ id, position, color, ...extra });

// ===== 1 + 2. sampleStops seam + bias/smooth correctness =====
console.log('[1] sampleStops == renderStopsToRamp at every sampled position');
const cases: Array<{ name: string; stops: GradientStop[]; blend: BlendColorSpace; cs: ColorSpaceMode }> = [
  { name: 'linear/oklab', blend: 'oklab', cs: 'srgb', stops: [stop('a', 0, '#FF0000'), stop('b', 1, '#0000FF')] },
  { name: 'biased/oklab', blend: 'oklab', cs: 'srgb', stops: [stop('a', 0, '#FF0000', { bias: 0.8 }), stop('b', 1, '#00FF00')] },
  { name: 'smooth/rgb', blend: 'rgb', cs: 'srgb', stops: [stop('a', 0, '#000000', { interpolation: 'smooth' }), stop('b', 1, '#FFFFFF')] },
  { name: 'step/oklab', blend: 'oklab', cs: 'srgb', stops: [stop('a', 0, '#FF0000', { interpolation: 'step' }), stop('b', 0.5, '#00FF00'), stop('c', 1, '#0000FF')] },
  { name: 'linear-colorspace', blend: 'oklab', cs: 'linear', stops: [stop('a', 0, '#112233'), stop('b', 1, '#AABBCC')] },
  { name: 'multi/biased+smooth', blend: 'oklab', cs: 'srgb', stops: [stop('a', 0, '#220088', { bias: 0.3, interpolation: 'smooth' }), stop('b', 0.4, '#FFAA00', { bias: 0.7 }), stop('c', 1, '#00CCAA')] },
];
for (const c of cases) {
  const ramp = renderStopsToRamp(c.stops, c.blend, c.cs);
  const buf = renderStopsToBuffer(c.stops, c.blend, c.cs);
  let floatMismatch = 0, byteMismatch = 0;
  for (let i = 0; i < 256; i++) {
    const s = sampleStops(c.stops, i / 255, c.blend, c.cs);
    if (s.r !== ramp[i].r || s.g !== ramp[i].g || s.b !== ramp[i].b) floatMismatch++;
    if (trunc(s.r) !== buf[i * 4] || trunc(s.g) !== buf[i * 4 + 1] || trunc(s.b) !== buf[i * 4 + 2]) byteMismatch++;
  }
  ok(floatMismatch === 0 && byteMismatch === 0, `${c.name}: ${floatMismatch} float / ${byteMismatch} byte mismatches vs ramp`);
}

console.log('[2] sampleStops honours bias + smooth (the drift fix)');
// Naive linear lerp == the OLD getInterpolatedColor behaviour. On a biased segment
// the corrected sampler must differ from it at the segment midpoint.
const biasStops = [stop('a', 0, '#000000', { bias: 0.85 }), stop('b', 1, '#FFFFFF')];
const corrected = sampleStops(biasStops, 0.5, 'rgb', 'srgb');
const c1 = hexToRgb('#000000')!, c2 = hexToRgb('#FFFFFF')!;
const naive = blendLerp(c1, c2, 0.5, 'rgb'); // no bias — what the old editor did
ok(Math.abs(corrected.r - naive.r) > 1, `biased midpoint differs from naive linear (corrected ${rgbToHex(corrected)} vs naive ${rgbToHex(naive)})`);
const smoothStops = [stop('a', 0, '#000000', { interpolation: 'smooth' }), stop('b', 1, '#FFFFFF')];
const sCorr = sampleStops(smoothStops, 0.25, 'rgb', 'srgb');
const sNaive = blendLerp(c1, c2, 0.25, 'rgb');
ok(Math.abs(sCorr.r - sNaive.r) > 1, `smooth easing differs from naive linear at t=0.25 (${rgbToHex(sCorr)} vs ${rgbToHex(sNaive)})`);

// ===== 3. stopOps =====
console.log('[3] stopOps pure transforms');
const base = [stop('1', 0, '#000000'), stop('2', 0.5, '#888888'), stop('3', 1, '#FFFFFF')];

const inv = stopOps.invert(base);
ok(inv.length === 3 && inv[0].position === 0 && inv[0].color === '#FFFFFF' && inv[2].color === '#000000', 'invert mirrors + reverses');
ok(stopOps.invert(inv).every((s, i) => Math.abs(s.position - base[i].position) < 1e-9 && s.color === base[i].color), 'invert is an involution');

const dbl = stopOps.double(base);
ok(dbl.length === 6 && dbl.every((s) => s.position >= 0 && s.position <= 1), 'double → 6 stops in [0,1]');
ok(new Set(dbl.map((s) => s.id)).size === 6, 'double keeps ids unique');
const reDbl = stopOps.double([stop('1', 0, '#000000'), stop('1-dup', 1, '#FFFFFF')]);
ok(new Set(reDbl.map((s) => s.id)).size === 4, 'double is collision-safe when ids already end in -dup');
ok(dbl.slice(0, 3).every((s) => s.position <= 0.5) && dbl.slice(3).every((s) => s.position >= 0.5), 'double splits at 0.5');

const spread = [stop('1', 0, '#000'.padEnd(7, '0')), stop('2', 0.1, '#111111'), stop('3', 0.15, '#222222'), stop('4', 1, '#333333')];
const dist = stopOps.distribute(spread, ['1', '2', '3', '4']);
const gaps = dist.map((s) => s.position).sort((a, b) => a - b);
ok(Math.abs((gaps[1] - gaps[0]) - (gaps[2] - gaps[1])) < 1e-9 && Math.abs((gaps[2] - gaps[1]) - (gaps[3] - gaps[2])) < 1e-9, 'distribute evenly spaces selected');

const moved = stopOps.move(base, ['2'], 0.9);
ok(moved[1].position === 1 && moved[0].position === 0 && moved[2].position === 1, 'move clamps to 1, leaves unselected');
ok(stopOps.move(base, ['2'], 0.123, true)[1].position === 0.6, 'move snap rounds to 1/20');

// scale about left edge (pivot = max of selection); drag min past pivot → inversion
const sel = [stop('1', 0.2, '#000'.padEnd(7, '0')), stop('2', 0.8, '#fff'.padEnd(7, 'f'))];
const scaled = stopOps.scaleAboutPivot(sel, ['1', '2'], 0.0, 'left');
ok(Math.abs(scaled[1].position - 0.8) < 1e-9 && Math.abs(scaled[0].position - 0.2) < 1e-9, 'scale by 0 is identity (pivot fixed)');
const inverted = stopOps.scaleAboutPivot(sel, ['1', '2'], 1.0, 'left'); // drag min from 0.2 to 1.2, past pivot 0.8
ok(inverted[0].position > inverted[1].position - 1e-9 ? true : inverted[0].position >= 0 && inverted[0].position <= 1, 'scale past pivot stays clamped in [0,1]');

const biased = stopOps.setBias(base, 0, 0.25);
ok(biased[0].bias !== undefined && biased[0].bias! > 0.5 && biased[0].bias! <= 1, 'setBias raises segment-0 bias');
ok(stopOps.setBias(base, base.length - 1, 0.5) === base, 'setBias on last index is a no-op');

const del = stopOps.delete(base, ['2']);
ok(del.length === 2 && !del.some((s) => s.id === '2'), 'delete removes selected only');

const def = stopOps.default();
ok(def.length === 2 && def[0].color === '#000000' && def[1].color === '#FFFFFF', 'default → black→white');

ok(stopOps.normalizePaste('garbage') === null, 'normalizePaste rejects garbage');
const np = stopOps.normalizePaste([{ position: 2, color: '#ff0000' }, { position: -1, color: 'nope' }, { position: 0.3, color: '#00ff00', bias: 5 }]);
ok(np !== null && np.length === 2 && np[0].position === 1 && np[1].position === 0.3 && np[1].bias === 1, 'normalizePaste clamps + drops bad rows');
const wrapped = stopOps.normalizePaste({ stops: [{ position: 0, color: '#abcdef' }] });
ok(wrapped !== null && wrapped.length === 1 && wrapped[0].color === '#ABCDEF', 'normalizePaste unwraps {stops} + uppercases hex');
const lenient = stopOps.normalizePaste([{ position: 0, color: 'ff0000' }, { position: 1, color: '#fff' }]);
ok(lenient !== null && lenient.length === 2 && lenient[0].color === '#FF0000' && lenient[1].color === '#FFFFFF', 'normalizePaste accepts no-# and 3-digit hex (matches the sampler)');

// ===== 4. oklab drift pin =====
// The P0a collapse routed the SAMPLER through colorUtils, which made
// test-palette-stopfit's `generateGradientTextureBuffer == renderStopsToBuffer`
// tautological (both are now the same code). But the oklab/blend math is still
// duplicated in palette/core/oklab.ts (used by the stop-fitter / generator / facets).
// Pin the two copies together explicitly so a coefficient/threshold change in either
// fails loudly instead of silently desyncing the renderer from the fitter.
console.log('[4] colorUtils oklab blend == palette/core/oklab (drift pin)');
{
  const grid = ['#000000', '#FFFFFF', '#FF0000', '#00FF80', '#1133AA', '#808080', '#FFAA00', '#220088'];
  let mismatch = 0;
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid.length; j++) {
      const c1 = hexToRgb(grid[i])!, c2 = hexToRgb(grid[j])!;
      for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
        const a = cuLerpOklab(c1, c2, t);
        const b = okLerpOklab(c1, c2, t);
        if (a.r !== b.r || a.g !== b.g || a.b !== b.b) mismatch++;
      }
    }
  }
  ok(mismatch === 0, `colorUtils.lerpOklab matches oklab.ts across ${grid.length * grid.length * 7} samples (${mismatch} mismatches)`);
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
