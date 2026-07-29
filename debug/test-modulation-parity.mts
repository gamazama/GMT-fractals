/**
 * Live tick and render export must produce the SAME writes.
 *
 * The branch chain used to exist three times — AnimationSystem's tick and both
 * exportModulations copies. They drifted, and every divergence was an export
 * that silently disagreed with what the artist saw:
 *
 *   - vec axes matched `^(coreMath|geometry)\.(vec[23][ABC])_(x|y|z)$`, so any
 *     other feature's vec, every vec4, and every `_w` axis were dropped;
 *   - each vec axis was emitted separately, so the second overwrote the first;
 *   - `postRot` / `worldRot` were ignored (only `preRot` handled);
 *   - a julia axis modulated to exactly 0 was replaced by its base
 *     (`if (!juliaX)` — a falsy test on a legitimate value).
 *
 * One dispatcher now serves both, so this asserts the property directly rather
 * than trusting that two copies stay in step: run `planModulationTarget` over a
 * spread of targets and check each formerly-divergent case behaves.
 *
 *   tsx debug/test-modulation-parity.mts
 */

import '../engine-gmt/formulas/index';
import { registerFeatures } from '../engine-gmt/features/index';

registerFeatures();

const { useEngineStore } = await import('../store/engineStore');
const { classifyModulationTarget } = await import('../engine/features/modulation/targetRouting');
const { planModulationTarget, flushModulationComposites, newCompositeAccumulator } =
  await import('../engine/features/modulation/applyTarget');

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};

const store = () => useEngineStore.getState() as unknown as Record<string, any>;

/** Run a set of {target, offset} through the dispatcher and collect all writes. */
function run(targets: Array<[string, number]>) {
  const s = store();
  const comp = newCompositeAccumulator();
  const uniforms = new Map<string, unknown>();
  const engineMods: Record<string, number> = {};
  const live: Record<string, number> = {};
  for (const [t, off] of targets) {
    const plan = planModulationTarget(t, off, s, classifyModulationTarget(t, s), comp);
    for (const u of plan.uniforms) uniforms.set(u.key, u.value);
    for (const [k, v] of plan.engineMods) engineMods[k] = v;
    if (plan.live !== undefined) live[t] = plan.live;
  }
  for (const u of flushModulationComposites(comp, s)) uniforms.set(u.key, u.value);
  return { uniforms, engineMods, live };
}

console.log('\n[1] multi-axis vec modulation keeps every axis');
{
  // The export copy cloned the base vec and emitted per axis, so the second
  // axis's emit reset the first back to base.
  const s = store();
  const feats = (await import('../engine/FeatureSystem')).featureRegistry.getAll();
  let vecTarget: { feat: string; key: string; uniform: string } | null = null;
  for (const f of feats) {
    for (const [k, c] of Object.entries(f.params) as [string, any][]) {
      if (c.type === 'vec3' && c.uniform && !c.composeFrom && s[f.id]?.[k]) {
        vecTarget = { feat: f.id, key: k, uniform: c.uniform };
        break;
      }
    }
    if (vecTarget) break;
  }
  if (!vecTarget) { assert(false, 'found a vec3 param with a uniform'); }
  else {
    const { uniforms } = run([
      [`${vecTarget.feat}.${vecTarget.key}_x`, 0.25],
      [`${vecTarget.feat}.${vecTarget.key}_y`, 0.5],
    ]);
    const v: any = uniforms.get(vecTarget.uniform);
    const base: any = s[vecTarget.feat][vecTarget.key];
    assert(!!v, `${vecTarget.uniform} was emitted once, composed`, v);
    assert(!!v && v.x !== base.x && v.y !== base.y,
      'BOTH axes moved — the later axis did not reset the earlier', v && { x: v.x, y: v.y });
    assert(!!v && Math.abs(v.z - base.z) < 1e-12, 'and the unmodulated axis stayed at base', v?.z);
  }
}

console.log('\n[2] vec coverage is not limited to coreMath/geometry vec[23][ABC]');
{
  // The export regex accepted only two features, two vec sizes and three axes.
  const s = store();
  const feats = (await import('../engine/FeatureSystem')).featureRegistry.getAll();
  const exportRegex = /^(coreMath|geometry)\.(vec[23][ABC])_(x|y|z)$/;
  const reachable: string[] = [];
  const missedByOldRegex: string[] = [];
  for (const f of feats) {
    for (const [k, c] of Object.entries(f.params) as [string, any][]) {
      if (!['vec2', 'vec3', 'vec4'].includes(c.type) || c.composeFrom || !c.uniform) continue;
      if (!s[f.id]?.[k]) continue;
      const axes = c.type === 'vec2' ? ['x', 'y'] : c.type === 'vec3' ? ['x', 'y', 'z'] : ['x', 'y', 'z', 'w'];
      for (const a of axes) {
        const t = `${f.id}.${k}_${a}`;
        const { uniforms } = run([[t, 0.3]]);
        if (uniforms.size > 0) reachable.push(t);
        if (uniforms.size > 0 && !exportRegex.test(t)) missedByOldRegex.push(t);
      }
    }
  }
  assert(reachable.length > 0, `${reachable.length} vec-axis targets reach a uniform`);
  assert(missedByOldRegex.length > 0,
    `${missedByOldRegex.length} of them the old export regex would have DROPPED — the drift was real`,
    missedByOldRegex.slice(0, 5));
}

console.log('\n[3] all three rotation stages reach engine.modulations');
{
  // The export copy handled `geometry.preRot` only.
  for (const stage of ['preRot', 'postRot', 'worldRot']) {
    const t = `geometry.${stage}X`;
    const { engineMods } = run([[t, 0.4]]);
    assert(engineMods[t] === 0.4, `${t} writes its offset`, engineMods);
  }
}

console.log('\n[4] a julia axis modulated to exactly zero survives the composite');
{
  // The export fallback was `if (!juliaX) juliaX = base` — a falsy test, so a
  // legitimate 0 was overwritten by the store value.
  //
  // THE BASE MUST BE SEEDED NON-ZERO OR THIS CHECK CANNOT FAIL. juliaX's DDFS
  // default is 0.0 (grep `juliaX: { type: 'float', default: 0.0` in
  // engine-gmt/features/geometry/index.ts). With base 0 the offset that lands
  // the axis on 0 is itself 0, so `comp.julia.x ?? base` and the buggy
  // `comp.julia.x || base` BOTH yield 0 and the assertion passes either way —
  // and the sibling "untouched axes keep their base" assertion degenerates to
  // 0 === 0 the same way. Measured 2026-07-29: reverting flushModulationComposites
  // to the falsy `||` left this block fully green until these two seeds existed.
  const original = store().geometry;
  if (!original) { assert(false, 'geometry slice present'); }
  else {
    useEngineStore.setState({ geometry: { ...original, juliaX: 0.7, juliaY: -0.3 } } as any);
    try {
      const g = store().geometry;
      // Choose the offset that lands juliaX exactly on 0.
      const { uniforms } = run([['geometry.juliaX', -(g.juliaX ?? 0)]]);
      const uJulia: any = uniforms.get('uJulia');
      assert(!!uJulia, 'uJulia emitted', uJulia);
      assert(!!uJulia && uJulia.x === 0,
        'an axis driven to 0 stays 0 instead of snapping back to base (base 0.7)', uJulia?.x);
      assert(!!uJulia && uJulia.y === (g.juliaY ?? 0),
        'while untouched axes keep their base (-0.3)', uJulia?.y);
    } finally {
      useEngineStore.setState({ geometry: original } as any);
    }
  }
}

console.log('\n[5] the dispatcher is pure — same input, same output');
{
  // Purity is what lets the tick and the export share it without one leaking
  // state into the other.
  const a = run([['coloring.repeats', 0.5], ['geometry.juliaX', 0.2]]);
  const b = run([['coloring.repeats', 0.5], ['geometry.juliaX', 0.2]]);
  assert(JSON.stringify([...a.uniforms].map(([k, v]) => [k, JSON.stringify(v)]))
       === JSON.stringify([...b.uniforms].map(([k, v]) => [k, JSON.stringify(v)])),
    'two identical runs produce identical uniform writes');
  assert(JSON.stringify(a.engineMods) === JSON.stringify(b.engineMods), 'and identical engineMods');
  assert(JSON.stringify(a.live) === JSON.stringify(b.live), 'and identical live values');
}

console.log('\n[6] there is exactly one dispatcher left');
{
  // A dispatcher's signature is walking the OFFSETS BUFFER — that is what the
  // three copies all did. (Merely naming `uJulia` is not: feature defs declare
  // it as a uniform, and shader builders and importers reference it. An earlier
  // version of this check keyed on the name and flagged 12 innocent files.)
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const roots = ['engine', 'engine-gmt', 'components', 'store', 'app-gmt', 'fluid-toy'];
  const ALLOWED = [
    // Publishes offsets → liveModulations for every app. Doesn't dispatch.
    'engine/features/modulation/applyAt.ts',
    // The two legitimate appliers, both of which now delegate to applyTarget.
    'engine/animation/AnimationSystem.tsx',
    'engine-gmt/components/timeline/exportModulations.ts',
  ].map(p => path.normalize(p));

  const consumers: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { await walk(full); continue; }
      if (!/\.tsx?$/.test(e.name)) continue;
      const src = await fs.readFile(full, 'utf8');
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
      if (/modulationEngine\s*\.\s*offsets/.test(code)) consumers.push(path.normalize(full));
    }
  };
  for (const r of roots) {
    await walk(new URL(`../${r}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  }
  const unexpected = consumers.filter(c => !ALLOWED.some(a => c.endsWith(a)));
  assert(unexpected.length === 0,
    `only ${ALLOWED.length} files read the offsets buffer, and both appliers delegate`,
    unexpected);

  // And both appliers must actually delegate rather than re-implementing.
  for (const f of ['engine/animation/AnimationSystem.tsx',
                   'engine-gmt/components/timeline/exportModulations.ts']) {
    const src = await fs.readFile(new URL(`../${f}`, import.meta.url), 'utf8');
    assert(src.includes('planModulationTarget'), `${f} dispatches via planModulationTarget`);
  }
}

console.log(failures === 0 ? '\n✓ all assertions passed' : `\n✗ ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
