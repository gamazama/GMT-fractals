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
  isCurvedScale,
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

console.log(failures === 0 ? '\n✓ all assertions passed' : `\n✗ ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
