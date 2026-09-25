/**
 * paint harness — pins `palette/core/paintRamp.ts` (the Gradient Explorer's Paint face).
 *
 * Pure, so everything here runs on bare node. What it proves:
 *   [1] every brush is LOCAL — a stroke changes nothing outside its footprint — and does change
 *       something inside it (a dead brush fails here, not only a leaky one);
 *   [2] Opacity is a stroke's CEILING: crossing the same texels three times in one stroke stays at
 *       the opacity, and only a second stroke builds past it;
 *   [3] Flow is the RATE: one dab lays `flow` of the colour, holding still builds toward opacity;
 *   [4] Paint mixes in the Explorer's blend spaces — yellow over blue in Spectral is GREEN, in
 *       RGB it is not (ADR-0113's pigment claim, reached through the brush);
 *   [5] Restore paints the gradient back as the face opened it;
 *   [6] Clone copies from the source at the brush's offset, and reads the gradient AS THE STROKE
 *       FOUND IT — a stroke painting back over its own source does not copy its own paint;
 *   [7] Soften flattens an edge and Sharpen steepens it — two brushes, opposite signs;
 *   [8] Tone moves lightness up and down;
 *   [9] Smudge carries colour along the stroke;
 *  [10] undo / redo step a stroke at a time and give back the texels exactly;
 *  [11] Wrap takes a dab over the end onto the start, and without it the start is untouched;
 *  [12] Mirror paints the reflected dab too;
 *  [13] Spacing places dabs `spacing × diameter` apart, up to 1000 %;
 *  [14] a chooser's hover can show the last Paint stroke in another mode and back, exactly;
 *  [15] the committed ramp is 256 whole numbers in 0 … 255.
 *
 * Falsified 2026-09-24, each break reverted after it went red:
 *   F1 the wash recomposited from `current` instead of the stroke base → [2], [3] and [14] red
 *      ([2] only since its flow went below 1 — at flow 1 it passed this break, see the step);
 *   F2 Clone sampling `current` instead of the stroke base → [6] red (the right-to-left pass);
 *   F3 Sharpen's sign flipped to Soften's → [7] red;
 *   F4 `endStroke` pushing the painted texels instead of the stroke's `before` → [10] red;
 *   F5 `dabStep` ignoring `spacing` → [13] red;
 *   F6 the footprint wrapping whatever `wrap` says → [11] red.
 */

import {
  PaintSession, DEFAULT_BRUSH, PAINT_TEXELS, PAINT_TOOLS, brushRadius,
  type PaintBrush, type PaintTool,
} from '../palette/core/paintRamp';
import { rgbToOklab, type RGB } from '../palette/core/oklab';

let failures = 0;
const ok = (cond: boolean, msg: string): void => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else console.log('  ✓ ' + msg);
};

const N = PAINT_TEXELS;
const rampOf = (f: (i: number) => RGB): RGB[] => Array.from({ length: N }, (_, i) => f(i));
const flat = (c: RGB): RGB[] => rampOf(() => c);
const rainbow = rampOf((i) => ({ r: 128 + 110 * Math.sin(i / 20), g: 128 + 110 * Math.sin(i / 20 + 2.1), b: 128 + 110 * Math.sin(i / 20 + 4.2) }));
const brush = (over: Partial<PaintBrush>): PaintBrush => ({ ...DEFAULT_BRUSH, ...over });
/** One stroke from `a` to `b` (texel units), in 0.5-texel pointer steps. */
const stroke = (s: PaintSession, a: number, b: number, br: PaintBrush, p = 1): void => {
  s.beginStroke(a, p, br);
  const dir = Math.sign(b - a);
  if (dir !== 0) for (let x = a; dir > 0 ? x <= b : x >= b; x += dir * 0.5) s.strokeTo(x, p);
  s.strokeTo(b, p);
  s.endStroke();
};
const diff = (a: RGB, b: RGB): number => Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));
const L = (c: RGB): number => rgbToOklab(c).L;

console.log('[1] every brush is local, and does something');
for (const tool of PAINT_TOOLS as readonly PaintTool[]) {
  const s = new PaintSession(rainbow);
  const br = brush({ tool, size: 4, colour: { r: 250, g: 20, b: 200 }, smudge: 1, toneTarget: 'L' });
  if (tool === 'clone') s.setCloneSource(30);
  if (tool === 'restore') { stroke(s, 100, 120, brush({ tool: 'paint', size: 4 })); }
  const before = s.current.slice();
  stroke(s, 100, 120, br);
  const r = brushRadius(4);
  let outside = 0, inside = 0;
  for (let j = 0; j < N; j++) {
    const moved = diff(s.texel(j), s.texel(j, before)) > 1e-3;
    if (j < 100 - r - 1 || j > 120 + r + 1) { if (moved) outside++; } else if (moved) inside++;
  }
  ok(outside === 0, `${tool}: nothing outside the footprint changed (${outside})`);
  ok(inside > 5, `${tool}: the stroke changed ${inside} texels inside it`);
}

console.log('[2] Opacity is a stroke\'s ceiling');
{
  // flow below 1, so every pass adds coverage and every dab recomposites the texel — at flow 1 a
  // texel is full after one dab and never touched again, and a wash that composites from the
  // PAINTED texels instead of the stroke base passed this step (measured, F1)
  const hard = brush({ tool: 'paint', size: 10, hardness: 1, flow: 0.5, opacity: 0.5, mix: 'rgb', colour: { r: 255, g: 255, b: 255 } });
  const s = new PaintSession(flat({ r: 0, g: 0, b: 0 }));
  s.beginStroke(90, 1, hard);
  for (const x of [130, 90, 130, 90]) s.strokeTo(x, 1);
  s.endStroke();
  ok(Math.abs(s.texel(110).r - 127.5) < 1, `three passes in one stroke stay at 50 % (${s.texel(110).r.toFixed(1)})`);
  stroke(s, 90, 130, hard);
  ok(Math.abs(s.texel(110).r - 191.25) < 1, `a second stroke builds past it (${s.texel(110).r.toFixed(1)})`);
}

console.log('[3] Flow is the rate');
{
  const s = new PaintSession(flat({ r: 0, g: 0, b: 0 }));
  const br = brush({ tool: 'paint', size: 10, hardness: 1, flow: 0.25, opacity: 1, mix: 'rgb', colour: { r: 255, g: 255, b: 255 } });
  s.beginStroke(110.5, 1, br);
  ok(Math.abs(s.texel(110).r - 63.75) < 1, `one dab at flow 0.25 lays a quarter (${s.texel(110).r.toFixed(1)})`);
  s.hold(); s.hold(); s.hold();
  ok(Math.abs(s.texel(110).r - 255 * (1 - 0.75 ** 4)) < 1.5, `holding still builds toward opacity (${s.texel(110).r.toFixed(1)})`);
  s.endStroke();
}

console.log('[4] Paint mixes in the Explorer\'s blend spaces');
{
  const yellow = { r: 244, g: 196, b: 48 }, blue = { r: 59, g: 76, b: 192 };
  const at = (mix: PaintBrush['mix']): RGB => {
    const s = new PaintSession(flat(blue));
    stroke(s, 100, 120, brush({ tool: 'paint', size: 10, hardness: 1, flow: 1, opacity: 0.5, mix, colour: yellow }));
    return s.texel(110);
  };
  const sp = at('spectral'), rgb = at('rgb');
  ok(sp.g > sp.r && sp.g > sp.b, `Spectral: yellow over blue is green (${sp.r.toFixed(0)}, ${sp.g.toFixed(0)}, ${sp.b.toFixed(0)})`);
  ok(!(rgb.g > rgb.r && rgb.g > rgb.b), `RGB: the same stroke is not (${rgb.r.toFixed(0)}, ${rgb.g.toFixed(0)}, ${rgb.b.toFixed(0)})`);
}

console.log('[5] Restore paints the gradient back');
{
  const s = new PaintSession(rainbow);
  stroke(s, 60, 140, brush({ tool: 'paint', size: 8, colour: { r: 0, g: 0, b: 0 } }));
  stroke(s, 60, 140, brush({ tool: 'restore', size: 8, hardness: 1, flow: 1, opacity: 1 }));
  let worst = 0;
  for (let j = 60; j <= 140; j++) worst = Math.max(worst, diff(s.texel(j), s.texel(j, s.original)));
  ok(worst < 0.75, `restored within ${worst.toFixed(2)} of the original`);
}

console.log('[6] Clone copies from the source, as the stroke found it');
{
  const ramp = rampOf((i) => ({ r: i, g: 255 - i, b: 128 }));
  const clone = brush({ tool: 'clone', size: 6, hardness: 1, flow: 1, opacity: 1 });
  const s = new PaintSession(ramp);
  s.setCloneSource(200.5);
  stroke(s, 50.5, 80.5, clone);
  let worst = 0;
  for (let j = 52; j <= 78; j++) worst = Math.max(worst, diff(s.texel(j), ramp[j + 150]));
  ok(worst < 0.75, `texel j took the source's j + 150 (worst ${worst.toFixed(2)})`);
  // right to left over its own source: sampling the painted ramp would copy j + 20, not j + 10
  const t = new PaintSession(ramp);
  t.setCloneSource(100.5);
  stroke(t, 90.5, 50.5, clone);
  let back = 0;
  for (let j = 55; j <= 85; j++) back = Math.max(back, diff(t.texel(j), ramp[j + 10]));
  ok(back < 0.75, `painting back over its source still copies j + 10 (worst ${back.toFixed(2)})`);
}

console.log('[7] Soften flattens, Sharpen steepens');
{
  const step = rampOf((i) => (i < 128 ? { r: 80, g: 80, b: 80 } : { r: 170, g: 170, b: 170 }));
  const edge = (s: PaintSession): number => { let m = 0; for (let j = 100; j < 156; j++) m = Math.max(m, Math.abs(L(s.texel(j + 1)) - L(s.texel(j)))); return m; };
  const soft = new PaintSession(step);
  const e0 = edge(soft);
  stroke(soft, 110, 146, brush({ tool: 'soften', size: 10, soften: 1 }));
  ok(edge(soft) < e0 * 0.8, `Soften: the steepest step fell from ${e0.toFixed(3)} to ${edge(soft).toFixed(3)}`);
  const sharp = new PaintSession(step);
  stroke(sharp, 110, 146, brush({ tool: 'sharpen', size: 10, sharpen: 1 }));
  let lo = 255, hi = 0;
  for (let j = 100; j < 156; j++) { lo = Math.min(lo, sharp.texel(j).r); hi = Math.max(hi, sharp.texel(j).r); }
  ok(lo < 79 && hi > 171, `Sharpen: overshoot both sides of the edge (${lo.toFixed(1)} … ${hi.toFixed(1)})`);
}

console.log('[8] Tone moves lightness');
{
  const grey = flat({ r: 120, g: 120, b: 120 });
  const up = new PaintSession(grey), down = new PaintSession(grey);
  stroke(up, 100, 120, brush({ tool: 'tone', size: 10, toneTarget: 'L', toneDir: 1, toneAmount: 1 }));
  stroke(down, 100, 120, brush({ tool: 'tone', size: 10, toneTarget: 'L', toneDir: -1, toneAmount: 1 }));
  const L0 = L(grey[0]);
  ok(L(up.texel(110)) > L0 + 0.01 && L(down.texel(110)) < L0 - 0.01, `L ${L0.toFixed(3)} → up ${L(up.texel(110)).toFixed(3)}, down ${L(down.texel(110)).toFixed(3)}`);
}

console.log('[9] Smudge carries colour along the stroke');
{
  const s = new PaintSession(rampOf((i) => (i < 128 ? { r: 230, g: 30, b: 30 } : { r: 30, g: 30, b: 230 })));
  stroke(s, 110, 160, brush({ tool: 'smudge', size: 8, smudge: 1 }));
  const c = s.texel(140);
  ok(c.r > c.b, `texel 140 was blue and is now red-leaning (${c.r.toFixed(0)} vs ${c.b.toFixed(0)})`);
}

console.log('[10] undo / redo, a stroke at a time, exactly');
{
  const s = new PaintSession(rainbow);
  stroke(s, 40, 90, brush({ tool: 'paint', size: 6, colour: { r: 255, g: 255, b: 255 } }));
  const one = s.current.slice();
  stroke(s, 150, 200, brush({ tool: 'soften', size: 6, soften: 1 }));
  const two = s.current.slice();
  ok(s.strokes === 2, `two strokes on the stack (${s.strokes})`);
  s.undo();
  ok(s.current.every((v, i) => v === one[i]), 'undo gives back the first stroke\'s texels exactly');
  s.undo();
  ok(s.current.every((v, i) => v === s.original[i]) && !s.changed, 'a second undo gives back the original');
  s.redo(); s.redo();
  ok(s.current.every((v, i) => v === two[i]), 'redo twice gives back the painting');
}

console.log('[11] Wrap');
{
  const run = (wrap: boolean): number => {
    const s = new PaintSession(flat({ r: 0, g: 0, b: 0 }));
    stroke(s, 254, 254, brush({ tool: 'paint', size: 4, hardness: 1, flow: 1, opacity: 1, mix: 'rgb', colour: { r: 255, g: 255, b: 255 }, wrap }));
    return s.texel(2).r;
  };
  ok(run(true) > 200, `with Wrap a dab at 254 reaches texel 2 (${run(true).toFixed(0)})`);
  ok(run(false) === 0, `without it texel 2 is untouched (${run(false)})`);
}

console.log('[12] Mirror');
{
  const run = (mirror: boolean): number => {
    const s = new PaintSession(flat({ r: 0, g: 0, b: 0 }));
    stroke(s, 40, 40, brush({ tool: 'paint', size: 4, hardness: 1, flow: 1, opacity: 1, mix: 'rgb', colour: { r: 255, g: 255, b: 255 }, mirror }));
    return s.texel(N - 40).r;
  };
  ok(run(true) > 200 && run(false) === 0, `the reflected texel is painted with Mirror (${run(true).toFixed(0)}) and not without (${run(false)})`);
}

console.log('[13] Spacing, up to 1000 %');
{
  const s = new PaintSession(flat({ r: 0, g: 0, b: 0 }));
  // size 2 % → diameter 5.12 texels → dabs every 51.2 at spacing 10: 20, 71.2, 122.4, 173.6
  stroke(s, 20, 200, brush({ tool: 'paint', size: 2, hardness: 1, flow: 1, opacity: 1, spacing: 10, mix: 'rgb', colour: { r: 255, g: 255, b: 255 } }));
  ok(s.texel(71).r > 200 && s.texel(122).r > 200, 'the dabs land a spacing apart');
  ok(s.texel(45).r === 0 && s.texel(97).r === 0, 'and nothing lands between them');
}

console.log('[14] the last Paint stroke, shown in another mode and back');
{
  const s = new PaintSession(rainbow);
  stroke(s, 80, 160, brush({ tool: 'paint', size: 8, colour: { r: 200, g: 60, b: 90 }, mix: 'oklab' }));
  const normal = s.current.slice();
  ok(s.recompositeLast('multiply', 'oklab') && diff(s.texel(120), s.texel(120, normal)) > 5, 'Multiply shows a different stroke');
  s.recompositeLast('normal', 'oklab');
  let worst = 0;
  for (let i = 0; i < normal.length; i++) worst = Math.max(worst, Math.abs(s.current[i] - normal[i]));
  ok(worst < 1e-3, `and Normal gives back the stroke exactly (worst ${worst.toExponential(1)})`);
  stroke(s, 10, 30, brush({ tool: 'soften' }));
  ok(!s.recompositeLast('multiply', 'oklab'), 'after another brush there is no Paint stroke to show');
}

console.log('[15] the committed ramp');
{
  const s = new PaintSession(rainbow);
  stroke(s, 0, 255, brush({ tool: 'tone', toneAmount: 1, toneTarget: 'C', size: 30 }));
  const r = s.toRamp();
  ok(r.length === N && r.every((c) => [c.r, c.g, c.b].every((v) => Number.isInteger(v) && v >= 0 && v <= 255)), '256 whole numbers in 0 … 255');
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nall green');
