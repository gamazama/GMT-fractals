/**
 * Proves the mapping LIFT was behaviour-neutral, and keeps it that way.
 *
 * Slider curves used to be per-widget module constants: lighting defined
 * POWER / POWER_SPHERE / RANGE identically in TWO files, and coreMath.iterations
 * had a pow-3 curve visible only inside FormulaParamsWidget. They now resolve
 * from engine/features/modulation/paramMapping.ts so the modulation compose path
 * can see the same curve the slider draws.
 *
 * A lift like that is only safe if the new curve is the OLD curve. This
 * reconstructs each original definition inline and compares them point by point
 * — if a lift silently changed a slider's feel, this is what catches it.
 *
 *   tsx debug/test-param-mapping.mts
 */

import '../engine-gmt/formulas/index';
import { registerFeatures } from '../engine-gmt/features/index';
import { featureRegistry } from '../engine/FeatureSystem';
import {
  createLogMapping, createLog1pMapping, createPowMapping, piUnitMapping,
  type ValueMapping,
} from '../components/inputs/primitives/FormatUtils';
import {
  mappingForScale, mappingForParam, mappingForVirtual, LIGHT_RADIUS_SCALE,
  isCurvedScale, composeModulatedValue, LINEAR_CURVE,
} from '../engine/features/modulation/paramMapping';

registerFeatures();

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};

/** Compare two mappings across the value range, both directions. */
function sameCurve(
  a: ValueMapping | undefined,
  b: ValueMapping | undefined,
  min: number,
  max: number,
  label: string,
) {
  if (!a || !b) { assert(false, `${label}: one side is undefined`, { a: !!a, b: !!b }); return; }
  let worst = 0;
  for (let i = 0; i <= 40; i++) {
    const v = min + (max - min) * (i / 40);
    worst = Math.max(worst, Math.abs(a.toDisplay(v) - b.toDisplay(v)));
  }
  const dA = a.domainMin ?? a.toDisplay(min);
  const dB = a.domainMax ?? a.toDisplay(max);
  for (let i = 0; i <= 40; i++) {
    const d = dA + (dB - dA) * (i / 40);
    worst = Math.max(worst, Math.abs(a.fromDisplay(d) - b.fromDisplay(d)) / Math.max(1, Math.abs(max)));
  }
  assert(worst < 1e-9, `${label}: lifted curve is identical to the original`, worst);
}

console.log('\n[1] lifted widget curves match their original definitions');
{
  // FormulaParamsWidget: const ITERATIONS_MAPPING = createPowMapping(1, 500, 3)
  sameCurve(createPowMapping(1, 500, 3), mappingForScale('cube', 1, 500), 1, 500, 'iterations pow-3');

  // Both light widgets: createLog1pMapping(10000) / createPowMapping(0,100,2) / createLog1pMapping(100)
  sameCurve(createLog1pMapping(10000), mappingForVirtual('lighting.light0_intensity', 'Sphere'),
    0, 10000, 'sphere-light Power log1p');
  sameCurve(createPowMapping(0, 100, 2), mappingForVirtual('lighting.light0_intensity', 'Point'),
    0, 100, 'other-light Power pow-2');
  sameCurve(createLog1pMapping(100), mappingForVirtual('lighting.light0_falloff'),
    0, 100, 'light Range log1p');

  // LightControls: createLogMapping(0.0001, 5, { reserveZero: false })
  sameCurve(
    createLogMapping(0.0001, 5, { reserveZero: false }),
    mappingForScale(LIGHT_RADIUS_SCALE.scale, LIGHT_RADIUS_SCALE.min, LIGHT_RADIUS_SCALE.max,
      { reserveZero: LIGHT_RADIUS_SCALE.reserveZero }),
    0.0001, 5, 'light Radius log (no reserved zero)');
}

console.log('\n[2] AutoFeaturePanel curves are unchanged for every scale-declared param');
{
  // The old local switch: pi → piUnitMapping, square → pow2, log → logMapping,
  // anything else → undefined.
  const legacy = (c: { scale?: string; min?: number; max?: number }): ValueMapping | undefined => {
    const min = c.min ?? 0, max = c.max ?? 1;
    if (c.scale === 'pi') return piUnitMapping;
    if (!c.scale || c.scale === 'linear') return undefined;
    if (c.scale === 'square') return createPowMapping(min, max, 2);
    if (c.scale === 'log') return createLogMapping(min, max);
    return undefined;
  };

  let checked = 0, diverged: string[] = [];
  for (const feat of featureRegistry.getAll()) {
    for (const [key, cfg] of Object.entries(feat.params)) {
      const c = cfg as { scale?: string; min?: number; max?: number };
      // 'cube' is NEW on iterations (it had no declared scale before, the widget
      // supplied the curve) — [1] already pinned it against the widget original.
      if (!c.scale || c.scale === 'linear' || c.scale === 'cube') continue;
      const before = legacy(c), after = mappingForParam(cfg);
      if (!before || !after) { diverged.push(`${feat.id}.${key} (${c.scale}): one side undefined`); continue; }
      const min = c.min ?? 0, max = c.max ?? 1;
      for (let i = 0; i <= 20; i++) {
        const v = min + (max - min) * (i / 20);
        if (Math.abs(before.toDisplay(v) - after.toDisplay(v)) > 1e-9) {
          diverged.push(`${feat.id}.${key} (${c.scale}) at ${v}`);
          break;
        }
      }
      checked++;
    }
  }
  assert(diverged.length === 0, `all ${checked} scale-declared params keep their curve`, diverged);
  assert(checked > 15, 'and the sweep actually covered the declared params', checked);
}

console.log('\n[3] every curve round-trips');
{
  const cases: Array<[string, ValueMapping | undefined, number, number]> = [
    ['log',    mappingForScale('log', 0.1, 100), 0.1, 100],
    ['log1p',  mappingForScale('log1p', 0, 1000), 0, 1000],
    ['square', mappingForScale('square', 0, 100), 0, 100],
    ['cube',   mappingForScale('cube', 1, 500), 1, 500],
    ['root',   mappingForScale('root', 0, 10), 0, 10],
    ['pi',     mappingForScale('pi', -Math.PI, Math.PI), -Math.PI, Math.PI],
  ];
  for (const [name, m, min, max] of cases) {
    if (!m) { assert(false, `${name}: no mapping produced`); continue; }
    let worst = 0;
    for (let i = 0; i <= 30; i++) {
      const v = min + (max - min) * (i / 30);
      worst = Math.max(worst, Math.abs(m.fromDisplay(m.toDisplay(v)) - v));
    }
    assert(worst < 1e-6 * Math.max(1, Math.abs(max)), `${name} round-trips value → display → value`, worst);
  }
  // 'root' was declared in ScaleType but never handled — a scale a param could
  // set and silently get a linear slider. Now real.
  assert(!!mappingForScale('root', 0, 10), "'root' resolves instead of silently falling through");
}

console.log('\n[4] pi and linear are NOT treated as curved');
{
  // Modulation compensates only genuine curves. `pi` is a unit relabel (v/π):
  // composing an offset in its display space is identical to composing in value
  // space, so compensating it would be pointless work — and would change the
  // meaning of Gain on every angle param for no benefit.
  assert(!isCurvedScale('pi'), 'pi is linear in shape, so not compensated');
  assert(!isCurvedScale('linear'), 'linear is not compensated');
  assert(!isCurvedScale(undefined), 'an undeclared scale is not compensated');
  for (const s of ['log', 'log1p', 'square', 'cube', 'root'] as const) {
    assert(isCurvedScale(s), `${s} is compensated`);
  }
}

console.log('\n[5] no new widget-local curve constants');
{
  // The lift only holds if curves keep resolving from paramMapping. A fresh
  // `createLogMapping(...)` in a panel would be invisible to modulation again —
  // exactly the state this replaced.
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const roots = ['components', 'engine', 'engine-gmt'];
  const EXEMPT = [
    // The curve implementations themselves.
    'components/inputs/primitives/FormatUtils.ts',
    // The canonical resolver.
    'engine/features/modulation/paramMapping.ts',
    // LFO period/phase are controls on the MODULATOR, not modulation targets —
    // nothing composes an offset into them.
    'engine/components/modulation/LfoList.tsx',
  ].map(p => path.normalize(p));

  const offenders: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { await walk(full); continue; }
      if (!/\.tsx?$/.test(e.name)) continue;
      if (EXEMPT.some(x => path.normalize(full).endsWith(x))) continue;
      const src = await fs.readFile(full, 'utf8');
      // Strip comments first — prose that NAMES the old constructors (as the
      // lift notes deliberately do, to say what was replaced) is not a call.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
      if (/create(Log|Log1p|Pow)Mapping\s*\(/.test(code)) offenders.push(full);
    }
  };
  for (const r of roots) await walk(new URL(`../${r}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

  assert(offenders.length === 0,
    'no panel builds its own curve — all resolve via paramMapping', offenders);
}

console.log('\n[6] a curved param modulates with CONSTANT slider travel');
{
  // The bug: modulation adds a linear offset in VALUE space while a curved
  // slider moves in display space, so the same rule looked wildly different
  // depending on where the base sat. coloring.repeats (log, 0.1..100) moved the
  // handle 25.9% of the track at base 0.2 and 0.2% at base 80 — 130×.
  const min = 0.1, max = 100;
  const m = mappingForScale('log', min, max)!;
  const curve = { mapping: m, min, max };
  const offset = 1.0;

  const travels = [0.2, 1, 5, 20, 80].map(base => {
    const out = composeModulatedValue(base, offset, curve);
    return m.toDisplay(out) - m.toDisplay(base);
  });
  const spread = Math.max(...travels) - Math.min(...travels);
  assert(spread < 1e-9,
    'travel is identical at every base along a log track',
    travels.map(t => `${t.toFixed(3)}%`));

  // And it equals what the same offset gives on a LINEAR slider of that range —
  // "responds the way sliders do" means matching what linear already did.
  const expected = (offset / (max - min)) * 100;
  assert(Math.abs(travels[0] - expected) < 1e-9,
    `and matches the linear-slider travel for the same offset (${expected.toFixed(3)}%)`,
    travels[0]);
}

console.log('\n[7] linear params are bit-identical to before');
{
  // The compensation must not touch anything that was already correct — that is
  // what lets Gain / Offset / LFO amplitude keep their meaning.
  for (const [base, off] of [[0, 1], [5, -2.5], [-3, 0.25], [100, 0]] as const) {
    const out = composeModulatedValue(base, off, LINEAR_CURVE);
    assert(out === base + off, `linear compose ${base} + ${off} is exactly ${base + off}`, out);
  }
  // A curve with a degenerate range must also fall back rather than divide by 0.
  const degenerate = { mapping: mappingForScale('log', 5, 5), min: 5, max: 5 };
  assert(composeModulatedValue(5, 2, degenerate) === 7,
    'a zero-width range falls back to plain addition instead of dividing by zero');
}

console.log('\n[8] the result stays within what the slider itself can reach');
{
  // Outside the display domain a curve is meaningless (log of a negative, a
  // pow root of a negative), so the curved path clamps where the linear one
  // does not. The bound is the mapping's OWN domain, not [min, max]: a log
  // param whose min is at or below LOG_ZERO_EPS (0.1) gets a reserved band at
  // the bottom of the track for an exact 0, so 0 is a legitimate destination —
  // it is where dragging the handle to the far left lands too. Asserting
  // `>= min` here would be asserting something the slider doesn't obey.
  const min = 0.1, max = 100;
  const m = mappingForScale('log', min, max)!;
  const curve = { mapping: m, min, max };
  const floor = m.fromDisplay(m.domainMin ?? m.toDisplay(min));
  const ceil = m.fromDisplay(m.domainMax ?? m.toDisplay(max));

  const hi = composeModulatedValue(80, 1e6, curve);
  const lo = composeModulatedValue(0.2, -1e6, curve);
  assert(Math.abs(hi - ceil) < 1e-9, 'a huge positive offset lands on the top of the track', { hi, ceil });
  assert(Math.abs(lo - floor) < 1e-9, 'a huge negative offset lands on the bottom of the track', { lo, floor });
  assert(floor === 0, 'and for this param that bottom is an exact 0 (reserved-zero band)', floor);
  assert(Number.isFinite(hi) && Number.isFinite(lo), 'never produces NaN/Infinity', { hi, lo });

  // A log param whose min is a real value keeps that min as its floor.
  const m2 = mappingForScale('log', 1, 1000)!;
  const lo2 = composeModulatedValue(5, -1e6, { mapping: m2, min: 1, max: 1000 });
  assert(Math.abs(lo2 - 1) < 1e-9, 'a min above the zero-epsilon stays the floor', lo2);
}

console.log('\n[9] every applier composes identically');
{
  // The compose has exactly TWO call sites now (ADR-0109 collapsed the three
  // dispatchers into one):
  //   - applyTarget.ts     — the shared dispatcher the tick AND export run
  //   - createFeatureSlice — the DDFS auto-setter's double-writer guard
  // When the tick and the setter disagreed the uniform alternated between their
  // two answers — the modulated-slider flicker — so the setter genuinely is a
  // second site and must stay in step. Asserts the call sites exist rather than
  // re-deriving the maths; test-modulation-parity covers the dispatcher itself.
  const fs = await import('node:fs/promises');
  const appliers = [
    'engine/features/modulation/applyTarget.ts',
    'store/createFeatureSlice.ts',
  ];
  const missing: string[] = [];
  const rawAdds: string[] = [];
  for (const f of appliers) {
    const src = await fs.readFile(new URL(`../${f}`, import.meta.url), 'utf8');
    if (!src.includes('composeModulatedValue')) missing.push(f);
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    // A bare `<something> + offset` in an applier is a site that skipped the
    // compose — the exact shape this change replaced. BOTH operand orders are
    // checked: the pattern used to be `\w\s*\+\s*offset` only, and swapping the
    // operands to `offset + b` walked straight through it. Falsified
    // 2026-07-29: replacing applyTarget's `composeModulatedValue(b, offset,
    // routing.curve)` with `offset + b` left this block green AND
    // test:modulation-parity green, even though it defeats slider-space compose
    // for every curved param — the thing block [6] exists to protect. (Block [6]
    // calls composeModulatedValue directly, so it cannot see an applier that
    // stopped calling it.) The `missing` check above does not cover this either:
    // it is satisfied by the surviving import line alone.
    if (/(\w\s*\+\s*offset\b|\boffset\s*\+\s*\w)/.test(code)) rawAdds.push(f);
  }
  assert(missing.length === 0, 'every applier calls the shared compose', missing);
  assert(rawAdds.length === 0, 'and none still adds an offset raw', rawAdds);
}

console.log(failures === 0 ? '\n✓ all assertions passed' : `\n✗ ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
