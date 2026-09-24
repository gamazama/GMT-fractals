/**
 * Guard: "Reduce stops…" — `palette/core/reduceStops.ts` (the plan: a version at every stop count,
 * the named amounts on that axis, the blend-mode search), the `blendSpace` option it added to
 * `palette/core/stopFit.ts`, the menu item in `components/gradient/gradientActions.ts`, and the
 * wiring (ADR-0127, ADR-0128).
 *
 *   [1] the steps — four, NAMES only (no digits, no descriptors), tolerances strictly rising; the
 *       search's space list covers every live blend space exactly once
 *   [2] the contract, over a corpus of catalogue picks (the seam's fit, as GX receives them),
 *       baked fits (the working pipeline's Detail-8 fit), and hand-made gradients in every live
 *       blend space incl. banded / step / biased ones and a linear-output one — search OFF and ON:
 *         "exact count"            a version at EVERY count from n−1 to 2, with exactly that many
 *                                  stops, sorted, in [0, 1], no stale `ramp` riding along
 *         "within tolerance"       every named amount's version, re-rendered HERE in its own blend
 *                                  space (not with the reducer's measure), is within that amount's
 *                                  ΔE of the input's render at all 256 texels; a reported maxDE is
 *                                  the measured one
 *         "monotonic"              the amounts' counts never rise from one to the next
 *         "more stops never look worse" — a version is never further off than the one with a stop
 *                                  fewer (beyond AXIS_SLACK — see the note at the check)
 *         "keeps colorSpace"       every version
 *         "own space when the search is off"; ON, a version is in the own space or the plan's
 *                                  one `other`, and `other` is named only when used
 *         "the search never costs a stop" — every amount's count ON ≤ its count OFF
 *   [3] "ramp refused" — a ramp gradient, a two-stop gradient and an empty list return null
 *   [4] stopFit's `blendSpace`: omitted is byte-identical to 'oklab'; a gradient that is exactly
 *       three stops in rgb / hsv / spectral fits, in that space, to ≤ 4 stops within 0.02 there
 *       and says so — with and without the bias trials
 *   [5] the menu: present under Double Stops with a reducer, absent without; disabled with a
 *       title on a ramp, on two stops and when the editor blocks it; its action OPENS (no undo
 *       bracket); a stop menu keeps every other item
 *   [6] real picks: the amounts are different gradients (mean count strictly falls Light →
 *       Maximum), and the search earns its keep (Light ON ≥ 15% fewer stops than OFF on core picks
 *       — measured 28% on 2026-09-24; the catalogue's sources are RGB-authored)
 *   [7] lazy: the first plan arrives with every count before the search has run (pending), the
 *       last is not pending, and the search really tries other spaces (a phone list without
 *       Spectral never yields a Spectral version)
 *   [8] wiring pins (text): registerPaletteUI fills the slot with the steps and the plan and drops
 *       Spectral on a phone; the editor applies through editAction + emitChange with the version's
 *       spaces, paints the preview through editorBarSource, and passes the remembered search flag
 *
 * Run: `npm run test:palette-reducestops`. `--calibrate [pack] [tolerances…]` prints the calibration
 * table instead (see CALIBRATION).
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
 * before kept, on every corpus. Light is often a no-op on a fresh catalogue pick with the search
 * off (the seam already fitted it at 0.02); with it on, Light removes 28% of a core pick (RGB).
 *
 * ── FALSIFIED 2026-09-24 (each reverted; the 2026-09-23 ladder's list went with the ladder) ──
 *   snapshot's axis repair skipped                                  → [2] "more stops never look worse" (216 rises,
 *     e.g. bumpy/oklab-rect 4: 0.074 > 3: 0.068).
 *   the other space used at every count it has (no OTHER_RATIO)     → [2] "the search never costs a stop" (42, e.g.
 *     bumpy/cielch Light ON 16 > off 13).
 *   `searchBlend` ignored (no other spaces)                          → [6] earns its keep (9.0 → 9.0), [7] plan count, [7] paint mix.
 *   `spaces` option ignored (Spectral on a phone)                    → [7] "a phone's list … never yields one" (other spectral).
 *   a version labelled with the own space whatever it was fitted in → [2] within tolerance, honest maxDE (+531), axis; [7].
 *   a named count accepted at 1.5 × its tolerance                     → [2] within tolerance; the smoke's gradient 10/5/3/2.
 *   the first plan (after the own path) not yielded                  → [7] plan count ONLY: the second plan is also own-space
 *     and pending, so "the first plan has every count" stays green — what is lost is its speed, which no node check sees.
 *   `{ ...config }` for `{ ...body }` (the stale ramp rides along)  → [2] shape.
 *   colorSpace forced to 'srgb'                                      → [2] keeps colorSpace (+2718).
 *   the path stopped at ΔE 0.3 (not every count)                     → [2] exact count, [7] first plan.
 *   registerPaletteUI keeping Spectral on a phone                    → [8] (text pin; smoke:ge-reduce [11] is the wired half).
 *   the editor's search pref defaulting OFF                          → [8] (text pin; smoke:ge-reduce [2] is the wired half).
 * A harness break that reds only through a text pin has its behaviour in the smoke; see its header.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { REDUCE_STEPS, REDUCE_SEARCH_SPACES, reduceStopsPlan, reduceStopsPlanSync, type ReducePlan, type ReduceStep } from '../palette/core/reduceStops';
import { fitRampToStops, rampToGradientConfig, bufferToRamp } from '../palette/core/stopFit';
import { oklabDistance } from '../palette/core/oklab';
import { renderStopsToRamp, sampleStops, BLEND_SPACE_ORDER } from '../utils/colorUtils';
import { makeRampGradient } from '../utils/gradientRamp';
import { buildGradientMenu, type GradientMenuContext } from '../components/gradient/gradientActions';
import type { ContextMenuItem } from '../types/help';
import type { GradientConfig, GradientStop, BlendColorSpace } from '../types';

let failures = 0;
const check = (cond: boolean, msg: string) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.log(`  ✗ ${msg}`); }
};
const show = (l: string[]) => (l.length ? ` — ${l.slice(0, 4).join('; ')}${l.length > 4 ? ` (+${l.length - 4})` : ''}` : '');
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

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
  if (!j) { console.log(`  (pack ${pack} not on disk — skipped; it is a CDN download in a fresh checkout)`); return []; }
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
    for (const searchBlend of [false, true]) {
      const rows = cases.map((c) => { const t0 = performance.now(); const p = reduceStopsPlanSync(c.config, { steps, searchBlend })!; return { n: c.config.stops.length, k: p.steps.map((o) => o.stops), ms: performance.now() - t0 }; });
      console.log(`${pack} ${mode}, search ${searchBlend ? 'ON' : 'off'}: ${rows.length} gradients, mean ${mean(rows.map((r) => r.n)).toFixed(1)} stops`);
      steps.forEach((s, i) => console.log(`  ${s.name.padEnd(6)} mean ${mean(rows.map((r) => r.k[i])).toFixed(1)} stops, ${(100 * mean(rows.map((r) => r.k[i] / r.n))).toFixed(0)}% kept, ${rows.filter((r) => r.k[i] === r.n).length} unchanged`));
      const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
      console.log(`  plan: median ${ms[ms.length >> 1]?.toFixed(0)} ms, max ${ms[ms.length - 1]?.toFixed(0)} ms`);
    }
  }
  process.exit(0);
}

// ── the independent measure ──────────────────────────────────────────────────
/** Worst ΔE of `a` rendered in `spaceA` against `b` rendered in `spaceB`, display sRGB — computed
 *  here, not with the reducer's `maxRenderedDE`, so a wrong measure inside it cannot vouch for itself. */
const worst = (a: GradientStop[], spaceA: BlendColorSpace, b: GradientStop[], spaceB: BlendColorSpace): number => {
  const ra = renderStopsToRamp(a, spaceA, 'srgb');
  const rb = renderStopsToRamp(b, spaceB, 'srgb');
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
  // a stale ramp riding a stop config (stops win): no version may carry it
  { name: 'stops+stale-ramp', config: { ...bumpy('oklab'), ramp: (makeRampGradient(renderStopsToRamp(spine)) as GradientConfig).ramp } },
];

console.log('[1] the steps');
{
  check(REDUCE_STEPS.length === 4, `four steps (${REDUCE_STEPS.map((s) => s.name).join(' · ')})`);
  check(REDUCE_STEPS.every((s) => /^[A-Z][a-z]+$/.test(s.name)), 'names only: one capitalised word, no digits, no descriptor');
  check(REDUCE_STEPS.every((s, i) => i === 0 || s.tolerance > REDUCE_STEPS[i - 1].tolerance), 'tolerances strictly rise');
  check([...REDUCE_SEARCH_SPACES].sort().join() === [...BLEND_SPACE_ORDER].sort().join() && new Set(REDUCE_SEARCH_SPACES).size === REDUCE_SEARCH_SPACES.length,
    `the search tries every live blend space once (${REDUCE_SEARCH_SPACES.join(' · ')})`);
}

/**
 * How much further off a version may be than the one with a stop fewer. The axis repair makes a
 * count at least as close as the count below it plus one well-placed stop; a stop on the list's
 * own curve bends it hardly at all in a straight space, but a polar or spectral mix, a bias or a
 * smooth segment could move it a hair. Measured 2026-09-24 over this corpus: worst rise 0.0000
 * (before the repair: 0.026 median, 0.11 p90, at 8.6% of counts; 0.04 on a banded cpt-city pick
 * until the repair learned to use the widest segment).
 */
const AXIS_SLACK = 0.002;

console.log('\n[2] the contract');
const corpus: Case[] = [...synthetic, ...catalogue('core', 60, 'seam'), ...catalogue('cptcity', 90, 'seam'), ...catalogue('core', 150, 'bake'), ...catalogue('softology', 500, 'bake')];
{
  const bad: Record<string, string[]> = { exact: [], tol: [], honest: [], mono: [], axis: [], spaces: [], own: [], other: [], cost: [], shape: [] };
  let t = 0, worstAxis = 0, positions = 0;
  for (const c of corpus) {
    const input = [...c.config.stops].sort((a, b) => a.position - b.position);
    const n = input.length;
    const own = c.config.blendSpace || 'oklab';
    const plans: Record<string, ReducePlan> = {};
    for (const searchBlend of [false, true]) {
      const t0 = performance.now();
      const plan = reduceStopsPlanSync(c.config, { searchBlend });
      t += performance.now() - t0;
      if (!plan) { bad.shape.push(`${c.name}: refused`); continue; }
      plans[String(searchBlend)] = plan;
      const tag = `${c.name}${searchBlend ? ' ON' : ''}`;
      if (plan.from !== n || plan.pending) bad.shape.push(`${tag}: from ${plan.from}, pending ${plan.pending}`);
      const measured: number[] = [];
      for (let k = 2; k < n; k++) {
        const v = plan.byCount[k];
        if (!v || v.stops !== k || v.config.stops.length !== k) { bad.exact.push(`${tag} ${k}: ${v?.config.stops.length ?? 'missing'}`); continue; }
        const st = v.config.stops;
        if ('ramp' in v.config || st.some((s, i) => s.position < 0 || s.position > 1 || (i > 0 && s.position < st[i - 1].position))) bad.shape.push(`${tag} ${k}`);
        if (v.config.colorSpace !== c.config.colorSpace) bad.spaces.push(`${tag} ${k}: ${v.config.colorSpace}`);
        const vs = v.config.blendSpace as BlendColorSpace;
        if (!searchBlend && vs !== own) bad.own.push(`${tag} ${k}: ${vs}`);
        if (searchBlend && vs !== own && vs !== plan.other) bad.other.push(`${tag} ${k}: ${vs}, other ${plan.other}`);
        const e = worst(st, vs, input, own);
        measured[k] = e;
        if (Math.abs(e - v.maxDE) > 1e-6) bad.honest.push(`${tag} ${k}: reported ${v.maxDE.toFixed(4)}, measured ${e.toFixed(4)}`);
        if (k > 2 && measured[k - 1] !== undefined) {
          positions++;
          worstAxis = Math.max(worstAxis, e - measured[k - 1]);
          if (e > measured[k - 1] + AXIS_SLACK) bad.axis.push(`${tag} ${k}: ${e.toFixed(4)} > ${k - 1}: ${measured[k - 1].toFixed(4)}`);
        }
      }
      if (searchBlend && plan.other && !plan.byCount.some((v) => v?.config.blendSpace === plan.other)) bad.other.push(`${tag}: other ${plan.other} named, never used`);
      plan.steps.forEach((o, i) => {
        if (i > 0 && o.stops > plan.steps[i - 1].stops) bad.mono.push(`${tag}: ${plan.steps.map((x) => x.stops).join('/')}`);
        if (o.stops < n) {
          const e = measured[o.stops];
          if (!(e <= o.step.tolerance)) bad.tol.push(`${tag} ${o.step.name} (${o.stops}): ${e?.toFixed(4)} > ${o.step.tolerance}`);
        } else if (o.stops !== n) bad.mono.push(`${tag} ${o.step.name}: ${o.stops} > ${n}`);
      });
    }
    const off = plans.false, on = plans.true;
    if (off && on) on.steps.forEach((o, i) => { if (o.stops > off.steps[i].stops) bad.cost.push(`${c.name} ${o.step.name}: ON ${o.stops} > off ${off.steps[i].stops}`); });
  }
  console.log(`  (${corpus.length} gradients × search off / on, ${(t / corpus.length).toFixed(0)} ms per gradient for both; ${positions} axis steps, worst rise ${worstAxis.toFixed(4)})`);
  check(bad.exact.length === 0, `exact count: a version at every count from n−1 to 2, with exactly that many stops${show(bad.exact)}`);
  check(bad.shape.length === 0, `no stale ramp rides along; stops sorted and in [0, 1]; the finished plan is not pending${show(bad.shape)}`);
  check(bad.tol.length === 0, `within tolerance: every named amount's version, re-rendered here, is within its ΔE at all 256 texels${show(bad.tol)}`);
  check(bad.honest.length === 0, `every reported maxDE is the measured one${show(bad.honest)}`);
  check(bad.mono.length === 0, `monotonic: the amounts' counts never rise, and never pass the input's${show(bad.mono)}`);
  check(bad.axis.length === 0, `more stops never look worse: no count is further off than the one below it by more than ${AXIS_SLACK}${show(bad.axis)}`);
  check(bad.spaces.length === 0, `keeps colorSpace (srgb / linear / aces_inverse)${show(bad.spaces)}`);
  check(bad.own.length === 0, `own space when the search is off (six blend spaces)${show(bad.own)}`);
  check(bad.other.length === 0, `search on: a version is in the own space or the plan's one other, and other is named only when used${show(bad.other)}`);
  check(bad.cost.length === 0, `the search never costs a stop: every amount ON ≤ OFF${show(bad.cost)}`);
  const b = reduceStopsPlanSync(bumpy('rgb', 'linear'))!;
  check(b.steps.map((o) => o.stops).join('/') === '12/8/4/3', `the smoke's gradient, search off, reduces 16 → ${b.steps.map((o) => o.stops).join(' / ')} (smoke:ge-reduce leans on four different answers)`);
}

console.log('\n[3] ramp refused');
{
  for (const searchBlend of [false, true]) {
    const tag = searchBlend ? ' (search on)' : '';
    check(reduceStopsPlan(makeRampGradient(renderStopsToRamp(spine)) as GradientConfig, { searchBlend }) === null, `a ramp gradient returns null${tag}`);
    check(reduceStopsPlan({ stops: spine.slice(0, 2), colorSpace: 'srgb', blendSpace: 'oklab' }, { searchBlend }) === null, `two stops return null${tag}`);
    check(reduceStopsPlan({ stops: [], colorSpace: 'srgb', blendSpace: 'oklab' }, { searchBlend }) === null, `an empty list returns null${tag}`);
  }
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

console.log('\n[6] real picks');
{
  const picks = catalogue('core', 40, 'seam');
  const input = mean(picks.map((c) => c.config.stops.length));
  const off = picks.map((c) => reduceStopsPlanSync(c.config)!);
  const means = REDUCE_STEPS.map((_, i) => mean(off.map((p) => p.steps[i].stops)));
  check(picks.length > 30 && means.every((m, i) => m < (i ? means[i - 1] : input)), `search off, mean stops over ${picks.length} core picks: ${input.toFixed(1)} → ${means.map((m) => m.toFixed(1)).join(' / ')} (strictly falling)`);
  const on = picks.map((c) => reduceStopsPlanSync(c.config, { searchBlend: true })!);
  const lightOff = mean(off.map((p) => p.steps[0].stops)), lightOn = mean(on.map((p) => p.steps[0].stops));
  const others = on.filter((p) => p.other).length;
  check(lightOn <= 0.85 * lightOff, `the search earns its keep: Light ${lightOff.toFixed(1)} → ${lightOn.toFixed(1)} stops with it on (−${(100 * (1 - lightOn / lightOff)).toFixed(0)}%; ${others} of ${picks.length} use another mode)`);
}

console.log('\n[7] lazy');
{
  const cfg = catalogue('core', 400, 'seam').find((c) => c.config.stops.length >= 8)?.config ?? bumpy('oklab');
  const n = cfg.stops.length;
  const yields: (ReducePlan | null)[] = [...reduceStopsPlan(cfg, { searchBlend: true, sliceMs: 0 })!];
  const plans = yields.filter((p): p is ReducePlan => !!p);
  const first = plans[0];
  const full = (p: ReducePlan) => Array.from({ length: n - 2 }, (_, i) => p.byCount[i + 2]).every((v, i) => v?.stops === i + 2);
  check(!!first && first.pending && full(first) && first.other === null && first.byCount.every((v) => !v || v.config.blendSpace === (cfg.blendSpace || 'oklab')),
    `the first plan has every count, in the own space, before the search has run (pending) — ${yields.length} yields, ${plans.length} plans`);
  check(yields.indexOf(first) > 0, 'work is sliced: a zero-ms slice yields null before the first plan');
  check(plans.length >= 2 + REDUCE_SEARCH_SPACES.length - 1 && !plans[plans.length - 1].pending && plans.slice(0, -1).every((p) => p.pending),
    'a fresh plan after the path, the own refits and each space tried; only the last is not pending');
  const phoneSpaces = REDUCE_SEARCH_SPACES.filter((s) => s !== 'spectral');
  // blue → yellow MIXED like paint (green in the middle), handed over described in RGB: only
  // Spectral can say that in two stops again
  const paint: GradientStop[] = [
    { id: 'a', position: 0, color: '#1030C0', bias: 0.5, interpolation: 'linear' },
    { id: 'b', position: 1, color: '#F0E020', bias: 0.5, interpolation: 'linear' },
  ];
  const asRgb: GradientConfig = { stops: fitRampToStops(renderStopsToRamp(paint, 'spectral', 'srgb'), { targetDE: 0.004, fitBias: true, blendSpace: 'rgb' }).stops, colorSpace: 'srgb', blendSpace: 'rgb' };
  const withSpectral = reduceStopsPlanSync(asRgb, { searchBlend: true })!;
  const noSpectral = reduceStopsPlanSync(asRgb, { searchBlend: true, spaces: phoneSpaces })!;
  const usesSpectral = (p: ReducePlan) => p.byCount.some((v) => v?.config.blendSpace === 'spectral');
  check(usesSpectral(withSpectral) && !usesSpectral(noSpectral), `the search reaches other spaces: a paint mix handed over in ${asRgb.stops.length} RGB stops is found again in Spectral (other ${withSpectral.other}, 2 stops ${withSpectral.byCount[2]?.config.blendSpace} at ΔE ${withSpectral.byCount[2]?.maxDE.toFixed(3)}), and a phone's list without Spectral never yields one (other ${noSpectral.other})`);
}

console.log('\n[8] wiring pins (text)');
{
  const reg = fs.readFileSync('palette/registerPaletteUI.ts', 'utf8');
  check(/setGradientStopReducer\(\{[\s\S]*?steps: REDUCE_STEPS[\s\S]*?reduceStopsPlan\(config, \{ searchBlend, spaces: phone \? REDUCE_SEARCH_SPACES\.filter\(\(s\) => s !== 'spectral'\) : REDUCE_SEARCH_SPACES \}\)/.test(reg),
    'registerPaletteUI fills the reducer slot with REDUCE_STEPS and the lazy plan, Spectral dropped on a phone');
  check(/const phone = useEngineStore\.getState\(\)\.isDeviceMobile;/.test(reg), 'the phone test is the live isDeviceMobile flag, read per call');
  const ed = fs.readFileSync('components/AdvancedGradientEditor.tsx', 'utf8');
  check(ed.includes('editAction(() => emitChange(cfg.stops, cfg.colorSpace, cfg.blendSpace))'), 'the editor applies through editAction + emitChange (one undo step, the version\'s spaces passed through)');
  check(ed.includes('stopsPreview: reducePreview?.stops') && ed.includes('reducePreview?.blendSpace ??'), 'the editor paints the preview through editorBarSource, in the version\'s blend space');
  check(ed.includes('{ searchBlend: reduceSearch }') && ed.includes("safeLocalGet(REDUCE_SEARCH_KEY) !== '0'"), 'the editor passes the remembered search flag, on unless turned off');
}

console.log(failures ? `\n${failures} FAILED` : '\nall green');
process.exit(failures ? 1 : 0);
