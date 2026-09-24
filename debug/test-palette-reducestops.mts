/**
 * Guard: "Reduce stops…" — `palette/core/reduceStops.ts` (the ladder), the `blendSpace` option it
 * added to `palette/core/stopFit.ts`, and the menu item in `components/gradient/gradientActions.ts`.
 *
 *   [1] the steps — four, NAMES only (no digits, no descriptors), tolerances strictly rising
 *   [2] the contract, over a corpus of catalogue picks (the seam's fit, as GX receives them),
 *       baked fits (the working pipeline's Detail-8 fit), and hand-made gradients in every live
 *       blend space incl. banded / step / biased ones and a linear-output one:
 *         "within tolerance"       every result, re-rendered HERE (not with the reducer's own
 *                                  measure), is within its step's ΔE of the input at all 256 texels
 *         "never more stops"       than the input
 *         "monotonic"              than the step before it
 *         "keeps colorSpace and blendSpace", no stale `ramp` rides along, stops sorted and in [0, 1]
 *   [3] "ramp refused" — a ramp gradient, a two-stop gradient and an empty list return null
 *   [4] stopFit's `blendSpace`: omitted is byte-identical to 'oklab'; a gradient that is exactly
 *       three stops in rgb / hsv / spectral fits, in that space, to ≤ 4 stops within 0.02 there
 *       and says so — with and without the bias trials
 *   [5] the menu: present under Double Stops with a reducer, absent without; disabled with a
 *       title on a ramp, on two stops and when the editor blocks it; its action OPENS (no undo
 *       bracket); a stop menu keeps every other item
 *   [6] the steps are DIFFERENT gradients on real picks: mean stop count strictly falls
 *       Light → Maximum over the catalogue sample (the calibration's point, pinned)
 *   [7] wiring pin (text): registerPaletteUI fills the reducer slot with the ladder
 *
 * Run: `npx tsx debug/test-palette-reducestops.mts` (proposed `npm run test:palette-reducestops`).
 * `--calibrate [pack] [tolerances…]` prints the calibration table instead (see CALIBRATION).
 *
 * CALIBRATION (2026-09-23). Tolerances swept over catalogue picks as GX receives them (the
 * seam's ΔE 0.02 fit) and over baked fits (Detail 8, ΔE 0.012 — every Add stops and every bake):
 *
 *                       0.012  0.02  0.03  0.04  0.06  0.08  0.12  0.15   (mean share of stops kept)
 *   core, picks  10.4    —     89%   77%   69%*  60%   55%*  48%   43%*
 *   core, baked  16.7   90%    75%   67%   60%   53%   48%   43%   39%
 *   cpt-city, bk 13.8   91%    80%   73%   67%   60%   56%   49%   46%
 *   Softology,bk 67.0   89%    72%   59%   51%   41%   35%   30%   28%
 *   (* measured at the chosen four in a separate run: 0.02 / 0.04 / 0.08 / 0.15)
 *
 * The four chosen — Light 0.02 (about one just-noticeable step, at the worst texel), Medium 0.04,
 * Strong 0.08, Maximum 0.15 — each keep roughly two thirds to three quarters of what the step
 * before kept, on every corpus, so no two neighbours are the same gradient. Light is often a no-op
 * on a fresh catalogue pick (22 of 66 core picks: the seam already fitted it at 0.02) and removes a
 * quarter of a baked one; that is the point of it, not a flaw.
 *
 * ── FALSIFIED 2026-09-23 (each reverted) ─────────────────────────────────
 *   reduceStops: target rendered in 'oklab' whatever the space      → [2] "within tolerance" (spectral /
 *     oklab-rect Medium 0.042, 0.045 > 0.04) and the smoke gradient 16 → 13 / 8 / 4 / 3.
 *   steps yielded loosest first                                     → [2] within tolerance (+335 misses), [6] flat.
 *   `fewer` choosing the lower error, not the fewer stops           → [2] smoke gradient 16/16/16/16, [6] flat 10.4.
 *   result `blendSpace: 'oklab'`                                    → [2] "keeps colorSpace and blendSpace".
 *   `input.length < 2`                                              → [3] "two stops return null".
 *   `{ ...config }` for `{ ...body }` (the stale ramp rides along)  → [2] "no stale ramp".
 *   each step from the INPUT, no chaining                           → [2] "monotonic" (core speakNowLive 5/6/5/3).
 *   all four tolerances 0.04                                        → [1], [2] smoke gradient 8/8/8/8, [6].
 *   stopFit refine loop rendering 'oklab'                           → [4] (rgb 27, hsv 30, spectral 22 stops).
 *     The FIRST cut of [4] (one RGB fit, misses > 0.05) stayed GREEN under this break: with bias trials
 *     on, the trial measures in the right space, the loop spins to its guard and exits with the same
 *     three stops. Rewritten to a gradient that is exactly three stops in its space, with and without
 *     the trials; it now reds on every site.
 *   stopFit bias trials sampling 'oklab'                            → [4] (7 / 5 / 9 stops).
 *   stopFit result `blendSpace: 'oklab'`                            → [4].
 *   gradientActions: the ramp reason dropped                        → [5] (the item stays disabled through
 *     the two-stop reason — a ramp has no knots — so it is the TITLE check that catches it).
 *   gradientActions: action wrapped in `wrap()`                     → [5] "opens NO undo bracket".
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { REDUCE_STEPS, reduceStopsLadder, type ReduceStep } from '../palette/core/reduceStops';
import { fitRampToStops, rampToGradientConfig, bufferToRamp } from '../palette/core/stopFit';
import { oklabDistance } from '../palette/core/oklab';
import { renderStopsToRamp, sampleStops } from '../utils/colorUtils';
import { makeRampGradient } from '../utils/gradientRamp';
import { buildGradientMenu, type GradientMenuContext } from '../components/gradient/gradientActions';
import type { ContextMenuItem } from '../types/help';
import type { GradientConfig, GradientStop, BlendColorSpace } from '../types';

let failures = 0;
const check = (cond: boolean, msg: string) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.log(`  ✗ ${msg}`); }
};

// ── the catalogue ────────────────────────────────────────────────────────────
const PAL = path.resolve('public/palette');
const readPack = (id: string): { entries: { name: string }[] } | null => {
  const p = path.join(PAL, `${id}.json.gz`);
  return fs.existsSync(p) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(p)).toString('utf8')) : null;
};
const decodeRamps = (id: string, count: number): Uint8Array[] => {
  const f = zlib.gunzipSync(fs.readFileSync(path.join(PAL, `${id}.bin.gz`)));
  const out: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    const off = i * 768;
    const ramp = new Uint8Array(1024);
    let r = f[off], g = f[off + 1], b = f[off + 2];
    ramp[0] = r; ramp[1] = g; ramp[2] = b; ramp[3] = 255;
    for (let k = 1; k < 256; k++) {
      r = (r + f[off + k * 3]) & 255; g = (g + f[off + k * 3 + 1]) & 255; b = (b + f[off + k * 3 + 2]) & 255;
      ramp[k * 4] = r; ramp[k * 4 + 1] = g; ramp[k * 4 + 2] = b; ramp[k * 4 + 3] = 255;
    }
    out.push(ramp);
  }
  return out;
};
type Case = { name: string; config: GradientConfig };
/** Catalogue gradients in the form GX holds them: 'seam' = a pick, 'bake' = a Detail-8 refit. */
const catalogue = (pack: string, every: number, mode: 'seam' | 'bake'): Case[] => {
  const j = readPack(pack);
  if (!j) return [];
  const ramps = decodeRamps(pack, j.entries.length);
  const out: Case[] = [];
  for (let i = 0; i < j.entries.length; i += every) {
    const ramp = bufferToRamp(ramps[i]);
    const cfg = mode === 'bake'
      ? fitRampToStops(ramp, { targetDE: 0.012, maxStops: 128, fitBias: true })
      : rampToGradientConfig(ramp, { targetDE: 0.02, maxStops: 128 });
    if (cfg.stops.length >= 3) out.push({ name: `${pack}/${mode}/${j.entries[i].name}`, config: { ...cfg, colorSpace: 'linear' } });
  }
  return out;
};

// ── --calibrate ──────────────────────────────────────────────────────────────
if (process.argv.includes('--calibrate')) {
  const args = process.argv.slice(process.argv.indexOf('--calibrate') + 1);
  const pack = args.find((a) => !/^[\d.]+$/.test(a)) ?? 'core';
  const tols = args.filter((a) => /^[\d.]+$/.test(a)).map(Number);
  const steps: ReduceStep[] = (tols.length ? tols : REDUCE_STEPS.map((s) => s.tolerance)).map((t) => ({ id: 'light', name: String(t), tolerance: t }));
  for (const mode of ['seam', 'bake'] as const) {
    const cases = catalogue(pack, mode === 'seam' ? 40 : 60, mode);
    const rows = cases.map((c) => { const t0 = performance.now(); const l = reduceStopsLadder(c.config, steps)!; return { n: c.config.stops.length, k: l.map((o) => o.stops), ms: performance.now() - t0 }; });
    const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
    console.log(`${pack} ${mode}: ${rows.length} gradients, mean ${mean(rows.map((r) => r.n)).toFixed(1)} stops`);
    steps.forEach((s, i) => console.log(`  ${s.name.padEnd(6)} mean ${mean(rows.map((r) => r.k[i])).toFixed(1)} stops, ${(100 * mean(rows.map((r) => r.k[i] / r.n))).toFixed(0)}% kept, ${rows.filter((r) => r.k[i] === r.n).length} unchanged`));
    const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
    console.log(`  ladder: median ${ms[ms.length >> 1]?.toFixed(0)} ms, max ${ms[ms.length - 1]?.toFixed(0)} ms`);
  }
  process.exit(0);
}

// ── the independent measure ──────────────────────────────────────────────────
/** Worst ΔE between two stop lists, each rendered in `space`, display sRGB — computed here, not
 *  with the reducer's `maxRenderedDE`, so a wrong measure inside it cannot vouch for itself. */
const worst = (a: GradientStop[], b: GradientStop[], space: BlendColorSpace): number => {
  const ra = renderStopsToRamp(a, space, 'srgb');
  const rb = renderStopsToRamp(b, space, 'srgb');
  let m = 0;
  for (let i = 0; i < 256; i++) { const d = oklabDistance(ra[i], rb[i]); if (!(d <= m)) m = Number.isNaN(d) ? Infinity : d; }
  return m;
};

// ── hand-made gradients ──────────────────────────────────────────────────────
const hex = (c: { r: number; g: number; b: number }) => '#' + [c.r, c.g, c.b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const spine: GradientStop[] = [
  { id: 'a', position: 0, color: '#1B2A6B', bias: 0.5, interpolation: 'linear' },
  { id: 'b', position: 0.55, color: '#E0A030', bias: 0.5, interpolation: 'linear' },
  { id: 'c', position: 1, color: '#F5F0E0', bias: 0.5, interpolation: 'linear' },
];
const BUMPS = [0, 4, 0, 9, 0, 16, 0, 30, 0, 6, 0, 12, 0, 22, 0, 0];
const bumpy = (space: BlendColorSpace, colorSpace: GradientConfig['colorSpace'] = 'srgb'): GradientConfig => ({
  stops: BUMPS.map((b, i) => {
    const c = sampleStops(spine, i / (BUMPS.length - 1), 'oklab');
    return { id: `t${i}`, position: i / (BUMPS.length - 1), color: hex({ r: c.r + b, g: c.g + b, b: c.b - b }), bias: 0.5, interpolation: 'linear' as const };
  }),
  colorSpace, blendSpace: space,
});
const banded: GradientConfig = {
  stops: Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, position: i / 9, color: hex(sampleStops(spine, Math.round(i / 3) / 3, 'oklab')), bias: 0.5, interpolation: (i % 3 === 2 ? 'step' : 'linear') as GradientStop['interpolation'] })),
  colorSpace: 'aces_inverse', blendSpace: 'oklab-rect',
};
const biased: GradientConfig = {
  stops: [0, 0.1, 0.2, 0.35, 0.5, 0.62, 0.8, 0.9, 1].map((p, i) => ({ id: `q${i}`, position: p, color: hex(sampleStops(spine, p * p, 'oklab')), bias: [0.3, 0.7, 0.5, 0.2, 0.5, 0.8, 0.5, 0.4, 0.5][i], interpolation: (i % 2 ? 'smooth' : 'linear') as GradientStop['interpolation'] })),
  colorSpace: 'srgb', blendSpace: 'cielch',
};
const synthetic: Case[] = [
  ...(['oklab', 'rgb', 'oklab-rect', 'cielch', 'hsv', 'spectral'] as BlendColorSpace[]).map((sp) => ({ name: `bumpy/${sp}`, config: bumpy(sp, sp === 'rgb' ? 'linear' : 'srgb') })),
  { name: 'banded/step/oklab-rect/aces', config: banded },
  { name: 'biased/smooth/cielch', config: biased },
  // a stale ramp riding a stop config (stops win): the result must not carry it
  { name: 'stops+stale-ramp', config: { ...bumpy('oklab'), ramp: (makeRampGradient(renderStopsToRamp(spine)) as GradientConfig).ramp } },
];

console.log('[1] the steps');
{
  check(REDUCE_STEPS.length === 4, `four steps (${REDUCE_STEPS.map((s) => s.name).join(' · ')})`);
  check(REDUCE_STEPS.every((s) => /^[A-Z][a-z]+$/.test(s.name)), 'names only: one capitalised word, no digits, no descriptor');
  check(REDUCE_STEPS.every((s, i) => i === 0 || s.tolerance > REDUCE_STEPS[i - 1].tolerance), 'tolerances strictly rise');
}

console.log('\n[2] the contract');
const corpus: Case[] = [...synthetic, ...catalogue('core', 60, 'seam'), ...catalogue('cptcity', 60, 'seam'), ...catalogue('core', 120, 'bake'), ...catalogue('softology', 400, 'bake')];
{
  const bad: Record<string, string[]> = { tol: [], more: [], mono: [], spaces: [], shape: [] };
  let t = 0;
  for (const c of corpus) {
    const t0 = performance.now();
    const lad = reduceStopsLadder(c.config);
    t += performance.now() - t0;
    if (!lad) { bad.shape.push(`${c.name}: refused`); continue; }
    const input = [...c.config.stops].sort((a, b) => a.position - b.position);
    const space = c.config.blendSpace || 'oklab';
    lad.forEach((o, i) => {
      const e = worst(o.config.stops, input, space);
      if (!(e <= o.step.tolerance)) bad.tol.push(`${c.name} ${o.step.name}: ${e.toFixed(4)} > ${o.step.tolerance}`);
      if (o.config.stops.length > input.length || o.stops !== o.config.stops.length) bad.more.push(`${c.name} ${o.step.name}: ${o.config.stops.length} > ${input.length}`);
      if (i > 0 && o.stops > lad[i - 1].stops) bad.mono.push(`${c.name}: ${lad.map((x) => x.stops).join('/')}`);
      if (o.config.colorSpace !== c.config.colorSpace || o.config.blendSpace !== space) bad.spaces.push(`${c.name} ${o.step.name}: ${o.config.blendSpace}/${o.config.colorSpace}`);
      const st = o.config.stops;
      if ('ramp' in o.config || st.some((s, k) => s.position < 0 || s.position > 1 || (k > 0 && s.position < st[k - 1].position))) bad.shape.push(`${c.name} ${o.step.name}`);
    });
  }
  const show = (l: string[]) => (l.length ? ` — ${l.slice(0, 4).join('; ')}${l.length > 4 ? ` (+${l.length - 4})` : ''}` : '');
  console.log(`  (${corpus.length} gradients, ${(t / corpus.length).toFixed(0)} ms per ladder on average)`);
  check(bad.tol.length === 0, `within tolerance: every result, re-rendered here, is within its step's ΔE at all 256 texels${show(bad.tol)}`);
  check(bad.more.length === 0, `never more stops than the input${show(bad.more)}`);
  check(bad.mono.length === 0, `monotonic: never more stops than the step before${show(bad.mono)}`);
  check(bad.spaces.length === 0, `keeps colorSpace and blendSpace (six blend spaces, srgb / linear / aces_inverse)${show(bad.spaces)}`);
  check(bad.shape.length === 0, `no stale ramp rides along; stops sorted and in [0, 1]${show(bad.shape)}`);
  const b = reduceStopsLadder(bumpy('rgb', 'linear'))!;
  check(b.map((o) => o.stops).join('/') === '12/8/4/3', `the smoke's gradient reduces 16 → ${b.map((o) => o.stops).join(' / ')} (smoke:ge-reduce leans on four different answers)`);
}

console.log('\n[3] ramp refused');
{
  check(reduceStopsLadder(makeRampGradient(renderStopsToRamp(spine)) as GradientConfig) === null, 'a ramp gradient returns null');
  check(reduceStopsLadder({ stops: spine.slice(0, 2), colorSpace: 'srgb', blendSpace: 'oklab' }) === null, 'two stops return null');
  check(reduceStopsLadder({ stops: [], colorSpace: 'srgb', blendSpace: 'oklab' }) === null, 'an empty list returns null');
}

console.log("\n[4] stopFit's blendSpace option");
{
  const ramp = renderStopsToRamp(bumpy('oklab').stops, 'oklab', 'srgb');
  const a = fitRampToStops(ramp, { targetDE: 0.01, fitBias: true });
  const b = fitRampToStops(ramp, { targetDE: 0.01, fitBias: true, blendSpace: 'oklab' });
  check(JSON.stringify(a) === JSON.stringify(b) && a.blendSpace === 'oklab', 'omitted is byte-identical to an explicit oklab');
  // A red → green → blue gradient is exactly three stops in ITS OWN space and a long curve in any
  // other, so a fit that renders anywhere but `blendSpace` — the refine's render, its bias trials,
  // its re-score — needs many more stops or misses. Both refine paths (bias trials on and off).
  const rgbw: GradientStop[] = [
    { id: 'a', position: 0, color: '#FF0000', bias: 0.5, interpolation: 'linear' },
    { id: 'b', position: 0.5, color: '#00FF00', bias: 0.5, interpolation: 'linear' },
    { id: 'c', position: 1, color: '#0000FF', bias: 0.5, interpolation: 'linear' },
  ];
  const bad: string[] = [];
  for (const sp of ['rgb', 'hsv', 'spectral'] as BlendColorSpace[]) {
    const target = renderStopsToRamp(rgbw, sp, 'srgb');
    for (const fitBias of [true, false]) {
      const f = fitRampToStops(target, { targetDE: 0.01, fitBias, blendSpace: sp });
      const r = renderStopsToRamp(f.stops, sp, 'srgb');
      let m = 0;
      for (let i = 0; i < 256; i++) m = Math.max(m, oklabDistance(r[i], target[i]));
      if (f.blendSpace !== sp || f.stops.length > 4 || !(m <= 0.02)) bad.push(`${sp}${fitBias ? '+bias' : ''}: ${f.stops.length} stops, ${f.blendSpace}, worst ${m.toFixed(3)}`);
    }
  }
  check(bad.length === 0, `a fit in rgb / hsv / spectral of a gradient that is three stops there says so, takes ≤ 4 stops and is within 0.02 in that space${bad.length ? ` — ${bad.join('; ')}` : ''}`);
}

console.log('\n[5] the menu');
const menuFor = (config: GradientConfig, knots: GradientStop[], extra: Partial<GradientMenuContext> = {}) => {
  const calls = { bracket: 0, reduce: 0 };
  const ctx: GradientMenuContext = {
    knots, config, selectedIds: new Set(), blendSpace: config.blendSpace ?? 'oklab', colorSpace: config.colorSpace ?? 'srgb',
    isBiasHandlesVisible: true, emit: () => {}, setConfig: () => {},
    editAction: (m) => { calls.bracket++; m(); },
    setSelectedIds: () => {}, setBiasHandlesVisible: () => {}, copy: () => {}, paste: () => {},
    reduceStops: () => { calls.reduce++; },
    ...extra,
  };
  return { items: buildGradientMenu(ctx), calls };
};
const item = (items: ContextMenuItem[], label: string) => items.find((i) => i.label === label && !i.isHeader);
{
  const cfg = bumpy('oklab');
  const { items, calls } = menuFor(cfg, cfg.stops);
  const at = items.findIndex((i) => i.label === 'Reduce Stops…');
  check(at > 0 && items[at - 1].label === 'Double Stops', 'Reduce Stops… sits under Double Stops');
  const it = items[at];
  check(!!it && !it.disabled && !it.title, 'enabled, no title, on a 16-stop gradient');
  it?.action?.();
  check(calls.reduce === 1 && calls.bracket === 0, 'its action opens the popup and opens NO undo bracket (Apply is the undo step)');
  check(!item(menuFor(cfg, cfg.stops, { reduceStops: undefined }).items, 'Reduce Stops…'), 'no reducer registered: no item');
  const ramp = makeRampGradient(renderStopsToRamp(spine)) as GradientConfig;
  const r = item(menuFor(ramp, []).items, 'Reduce Stops…');
  check(!!r?.disabled && /ramp/i.test(r.title ?? '') && /Add Stops/.test(r.title ?? ''), `a ramp: disabled — "${r?.title}"`);
  const two = { ...cfg, stops: spine.slice(0, 2) };
  const t2 = item(menuFor(two, two.stops).items, 'Reduce Stops…');
  check(!!t2?.disabled && !!t2.title, `two stops: disabled — "${t2?.title}"`);
  const bl = item(menuFor(cfg, cfg.stops, { reduceStopsBlocked: 'not now' }).items, 'Reduce Stops…');
  check(!!bl?.disabled && bl.title === 'not now', 'the editor\'s block reason disables it and becomes its title');
  const labels = (xs: ContextMenuItem[]) => xs.map((x) => x.label).filter((l) => l !== 'Reduce Stops…').join('|');
  check(labels(items) === labels(menuFor(cfg, cfg.stops, { reduceStops: undefined }).items), 'every other item is unchanged by it');
}

console.log('\n[6] the steps are different gradients on real picks');
{
  const picks = catalogue('core', 40, 'seam');
  const means = REDUCE_STEPS.map((_, i) => picks.reduce((s, c) => s + reduceStopsLadder(c.config)![i].stops, 0) / Math.max(1, picks.length));
  const input = picks.reduce((s, c) => s + c.config.stops.length, 0) / Math.max(1, picks.length);
  check(picks.length > 30 && means.every((m, i) => m < (i ? means[i - 1] : input)), `mean stops over ${picks.length} core picks: ${input.toFixed(1)} → ${means.map((m) => m.toFixed(1)).join(' / ')} (strictly falling)`);
}

console.log('\n[7] wiring pin (text)');
{
  const reg = fs.readFileSync('palette/registerPaletteUI.ts', 'utf8');
  check(/setGradientStopReducer\(\{[\s\S]*?steps: REDUCE_STEPS[\s\S]*?reduceStopsSteps\(config\)/.test(reg), 'registerPaletteUI fills the reducer slot with REDUCE_STEPS and the lazy ladder');
  const ed = fs.readFileSync('components/AdvancedGradientEditor.tsx', 'utf8');
  check(ed.includes('editAction(() => emitChange(cfg.stops, cfg.colorSpace, cfg.blendSpace))'), 'the editor applies through editAction + emitChange (one undo step, spaces passed through)');
  check(ed.includes('stopsPreview: reducePreview?.stops'), 'the editor paints the preview through editorBarSource');
}

console.log(failures ? `\n${failures} FAILED` : '\nall green');
process.exit(failures ? 1 : 0);
