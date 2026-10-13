/**
 * Migration fixture test — Escape Radius is a coloring-only threshold; the
 * raymarch DE has its own bailout (quality.deBailout / uDeBailout).
 *
 * Node-only. Registers the app-gmt migration (v1) and asserts:
 *   0. Registry: coloring owns `escape` (default 4, uEscapeThresh); quality
 *      owns `deBailout` (default 100, uDeBailout) and NOT `escape`.
 *   1. A REAL legacy library GMF (BioCube.gmf, coloring.escape = 1.2) loads
 *      unchanged — escape stays on coloring, no deBailout seeded (not MandelTerrain).
 *   2. A stray quality.escape (earlier dev build) routes back to coloring.escape.
 *   3. Legacy MandelTerrain (coloring.escape = 20) seeds quality.deBailout = 20
 *      so its self-contained geometry bail is preserved.
 *   4. Mid-build MandelTerrain (quality.escape = 20) → coloring.escape = 20 AND
 *      quality.deBailout = 20.
 *   5. A scene that never set escape stays clean (coloring default 4 applies).
 *   6. Re-running is a no-op; an existing deBailout is never overwritten.
 *
 *   tsx debug/test-escape-migration.mts
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import '../engine-gmt/formulas/index';
import { registerFeatures } from '../engine-gmt/features/index';
import { featureRegistry } from '../engine/FeatureSystem';
import { applyMigrations } from '../engine/migrations';
import { virtualScaleFor } from '../engine/features/modulation/paramMapping';
import '../app-gmt/migrations'; // registers v1 escape migration as a side effect
import { loadGMFScene } from '../engine-gmt/utils/FormulaFormat';
import { registry } from '../engine-gmt/engine/FractalRegistry';
import { SCALABILITY_PRESETS, SUBSYSTEM_LIGHTING } from '../engine-gmt/types/viewport';

registerFeatures();

const __dirname = dirname(fileURLToPath(import.meta.url));

let failures = 0;
const assert = (cond: boolean, msg: string) => {
  if (!cond) { console.error(`  FAIL: ${msg}`); failures++; }
  else console.log(`  ok: ${msg}`);
};

// --- Test 0: registry ownership ---
console.log('\n[0] registry ownership');
const colEscape = featureRegistry.get('coloring')!.params.escape as any;
const qDeBailout = featureRegistry.get('quality')!.params.deBailout as any;
assert(colEscape?.default === 4.0 && colEscape?.uniform === 'uEscapeThresh', 'coloring.escape: default 4, uEscapeThresh');
assert((featureRegistry.get('quality')!.params as any).escape === undefined, 'quality no longer declares escape');
assert(qDeBailout?.default === 100.0 && qDeBailout?.uniform === 'uDeBailout', 'quality.deBailout: default 100, uDeBailout');

// --- Test 1: REAL legacy library GMF (not MandelTerrain) ---
console.log('\n[1] real fixture — BioCube.gmf (coloring.escape = 1.2)');
const gmfPath = resolve(__dirname, '../public/gmf/fragmentarium/BioCube.gmf');
const { preset } = loadGMFScene(readFileSync(gmfPath, 'utf8'));
const m1 = applyMigrations(JSON.parse(JSON.stringify(preset)));
assert((m1.features as any)?.coloring?.escape === 1.2, 'coloring.escape stays 1.2');
assert((m1.features as any)?.quality?.escape === undefined, 'no quality.escape introduced');
assert((m1.features as any)?.quality?.deBailout === undefined, 'no deBailout seeded (not MandelTerrain)');

// --- Test 2: stray quality.escape routes back to coloring ---
console.log('\n[2] stray quality.escape -> coloring.escape');
const p2 = applyMigrations({ formula: 'Mandelbulb', features: { quality: { escape: 7 } } });
assert((p2.features as any).coloring?.escape === 7, 'coloring.escape = 7');
assert(!('escape' in (p2.features as any).quality), 'quality.escape removed');
assert((p2.features as any).quality?.deBailout === undefined, 'no deBailout seeded (not MandelTerrain)');

// --- Test 3: legacy MandelTerrain seeds deBailout from coloring.escape ---
console.log('\n[3] legacy MandelTerrain (coloring.escape = 20) seeds deBailout');
const p3 = applyMigrations({ formula: 'MandelTerrain', features: { coloring: { escape: 20 } } });
assert((p3.features as any).coloring?.escape === 20, 'coloring.escape stays 20 (smoothing)');
assert((p3.features as any).quality?.deBailout === 20, 'quality.deBailout seeded to 20 (bail preserved)');

// --- Test 4: mid-build MandelTerrain (quality.escape = 20) ---
console.log('\n[4] mid-build MandelTerrain (quality.escape = 20)');
const p4 = applyMigrations({ formula: 'MandelTerrain', features: { quality: { escape: 20 } } });
assert((p4.features as any).coloring?.escape === 20, 'coloring.escape = 20');
assert(!('escape' in (p4.features as any).quality), 'quality.escape removed');
assert((p4.features as any).quality?.deBailout === 20, 'quality.deBailout seeded to 20');

// --- Test 5: no escape anywhere ---
console.log('\n[5] no escape anywhere — defaults apply');
const p5 = applyMigrations({ formula: 'Mandelbulb', features: { coloring: { mode: 1 } } });
assert((p5.features as any).coloring?.escape === undefined, 'coloring.escape undefined (default 4 applies)');
assert((p5.features as any).quality?.deBailout === undefined, 'no deBailout seeded');

// --- Test 6: idempotent + deBailout never overwritten ---
console.log('\n[6] idempotent + deBailout preserved');
const p6 = applyMigrations({ formula: 'MandelTerrain', features: { coloring: { escape: 20 }, quality: { deBailout: 5 } } });
assert((p6.features as any).quality?.deBailout === 5, 'pre-existing deBailout (5) not overwritten');
delete (p6 as any)._migrationVersion; // simulate save/reload (version not persisted)
const p6b = applyMigrations(p6);
assert((p6b.features as any).coloring?.escape === 20 && (p6b.features as any).quality?.deBailout === 5, 'second pass is a no-op');

// --- Test 7: v7 modulation bands, nyquist-fraction → real Hz -----------------
// @see docs/adr/0106-modulation-bands-in-hz.md
console.log('\n[7] v7 — modulation rule bands convert to Hz');
{
  const legacy = {
    formula: 'Mandelbulb',
    features: {
      modulation: {
        rules: [
          { id: 'kick', target: 'coreMath.paramA', source: 'audio', freqStart: 0, freqEnd: 0.005 },
          { id: 'full', target: 'coreMath.paramB', source: 'audio', freqStart: 0, freqEnd: 1 },
          { id: 'lfo', target: 'coreMath.paramC', source: 'lfo' },
          // NON-ZERO freqStart. Every fixture above starts at 0, and 0 × 48000 is 0,
          // so the lowHz half of the conversion was unproven: replacing
          // `r.lowHz = r.freqStart * LEGACY_NYQUIST_HZ` with `r.lowHz = r.freqStart`
          // left this whole harness green (measured 2026-07-29). A degenerate
          // fixture, in the batch-1 sense. This band is 0.05–0.25 → 2400–12000 Hz.
          { id: 'mids', target: 'coreMath.paramD', source: 'audio', freqStart: 0.05, freqEnd: 0.25 },
          // MIXED VINTAGE — a rule carrying BOTH an already-converted Hz band and a
          // legacy fraction. This is the only shape the `already carries Hz` guard
          // actually protects: on a plain replay the first pass has already deleted
          // freqStart/freqEnd, so deleting that guard changed nothing and the harness
          // stayed green. Here it must keep 300/900 and drop the legacy fields.
          { id: 'mixed', target: 'coreMath.paramE', source: 'audio', lowHz: 300, highHz: 900, freqStart: 0.5, freqEnd: 0.9 },
        ],
      },
    },
  };
  const p7 = applyMigrations(legacy);
  const rules = (p7.features as any).modulation.rules;

  assert(rules[0].lowHz === 0 && rules[0].highHz === 120,
    'a 0–0.005 fraction becomes 0–120 Hz (assumed 48kHz authoring rate)');
  assert(rules[1].highHz === 24000, 'a full-range rule becomes 0–24000 Hz');
  assert(rules[0].freqStart === undefined && rules[0].freqEnd === undefined,
    'the old fields are removed, not left alongside');
  assert(rules[2].lowHz === undefined,
    'a non-audio rule with no band is left untouched');
  assert(rules[3].lowHz === 1200 && rules[3].highHz === 6000,
    'a NON-ZERO freqStart is scaled too (0.05–0.25 → 1200–6000 Hz), not just freqEnd');
  assert(rules[4].lowHz === 300 && rules[4].highHz === 900,
    'a rule already carrying Hz keeps them when a legacy fraction sits alongside');
  // Known and deliberate residue: the `continue` that protects the existing Hz
  // band also skips the `delete r.freqStart / r.freqEnd` below it, so a
  // mixed-vintage rule keeps its stale fractions. Harmless today — `grep -rn
  // freqStart` across engine, engine-gmt, components, store and app-gmt finds
  // NO reader outside the migration itself. Pinned as the CURRENT behaviour so
  // that if the guard is ever restructured, the change is deliberate.
  assert(rules[4].freqStart === 0.5 && rules[4].freqEnd === 0.9,
    'and its stale legacy fields survive (documented residue, no reader anywhere)');

  // Idempotence matters here: the version tag is not persisted in GMF, so a
  // save/reload replays the whole chain. Double-converting would drop a
  // 120 Hz kick band to 0.005 Hz.
  delete (p7 as any)._migrationVersion;
  const p7b = applyMigrations(p7);
  const again = (p7b.features as any).modulation.rules;
  assert(again[0].lowHz === 0 && again[0].highHz === 120,
    'a second pass leaves already-migrated Hz alone');

  // A scene with no modulation slice must not throw.
  const p7c = applyMigrations({ formula: 'Mandelbulb', features: {} });
  assert(!!p7c, 'a scene without modulation survives the migration');
}

// --- Test 8: v8 path-traced shadow tolerance -----------------------------------
// @see docs/adr/0093-zoom-normalized-shadow-march.md (update 2026-10-13)
console.log('\n[8] v8 — path-traced scenes keep their pre-fix shadow ratio');
{
  const tol = featureRegistry.get('lighting')!.params.ptShadowTolerance as any;
  const thr = featureRegistry.get('quality')!.params.pixelThreshold as any;
  assert(tol?.default === 1.0 && tol?.uniform === 'uPTShadowTolerance',
    'lighting.ptShadowTolerance: default 1 (the fixed ratio), uPTShadowTolerance');
  // The pin is 1/pixelThreshold. If either range moves, a legacy value would clamp
  // and that scene would stop rendering as it was saved.
  assert(Math.abs(tol.max - 1 / thr.min) < 1e-9 && Math.abs(tol.min - 1 / thr.max) < 1e-9,
    'its range is exactly 1/pixelThreshold over pixelThreshold\'s range');
  assert(thr?.default === 0.5, 'quality.pixelThreshold still defaults to 0.5 (the migration assumes it for saves that omit it)');

  // REAL fixture: the one bundled path-traced scene (renderMode 1, pixelThreshold 0.2).
  const ptPath = resolve(__dirname, '../public/scenes/metallic area light mandelbulb.gmf');
  const { preset: ptPreset } = loadGMFScene(readFileSync(ptPath, 'utf8'));
  const p8 = applyMigrations(JSON.parse(JSON.stringify(ptPreset)));
  assert(Math.abs((p8.features as any).lighting.ptShadowTolerance - 5) < 1e-9,
    'a saved path-traced scene at pixelThreshold 0.2 is pinned to 5');

  const direct = applyMigrations({ formula: 'Mandelbulb', features: { lighting: { renderMode: 0 }, quality: { pixelThreshold: 0.2 } } });
  assert((direct.features as any).lighting.ptShadowTolerance === undefined,
    'a Direct scene is NOT pinned (it never showed the old ratio)');

  const noMode = applyMigrations({ formula: 'Mandelbulb', features: { lighting: { ptBounces: 3 }, quality: { pixelThreshold: 0.2 } } });
  assert((noMode.features as any).lighting.ptShadowTolerance === undefined,
    'a preset that does not say Path Tracing is NOT pinned (formula switches stay on the fix)');

  const noThr = applyMigrations({ formula: 'Mandelbulb', features: { lighting: { renderMode: 1 } } });
  assert((noThr.features as any).lighting.ptShadowTolerance === 2,
    'a path-traced save that omits pixelThreshold is pinned to 1/0.5 = 2');

  const fresh = applyMigrations({ formula: 'Mandelbulb', features: { lighting: { renderMode: 1, ptShadowTolerance: 1 }, quality: { pixelThreshold: 0.2 } } });
  assert((fresh.features as any).lighting.ptShadowTolerance === 1,
    'a scene saved since the fix (explicit 1) is left alone');

  // The version tag is not persisted, so a save/reload replays the chain. The pin
  // must not be recomputed from a pixelThreshold the user changed afterwards.
  delete (p8 as any)._migrationVersion;
  (p8.features as any).quality.pixelThreshold = 1;
  const p8b = applyMigrations(p8);
  assert(Math.abs((p8b.features as any).lighting.ptShadowTolerance - 5) < 1e-9,
    'a second pass keeps the pinned value');

  const lo = applyMigrations({ formula: 'Mandelbulb', features: { lighting: { renderMode: 1 }, quality: { pixelThreshold: 0.01 } } });
  const hi = applyMigrations({ formula: 'Mandelbulb', features: { lighting: { renderMode: 1 }, quality: { pixelThreshold: 40 } } });
  assert((lo.features as any).lighting.ptShadowTolerance === 10 && (hi.features as any).lighting.ptShadowTolerance === 0.5,
    'an out-of-range pixelThreshold clamps to the param range');

  const bare = applyMigrations({ formula: 'Mandelbulb', features: {} });
  assert(!!bare && (bare.features as any).lighting === undefined, 'a scene without a lighting slice survives and gains none');
}

// --- Test 9: v9 old path-traced Sphere lights convert into the one falloff model
// @see docs/adr/0138-sphere-lights-follow-the-lights-falloff.md
console.log('\n[9] v9 — old path-traced Sphere lights are rewritten into Falloff / Range / Power');
{
  // The two laws the conversion translates between, written out independently of
  // the migration: what the old path tracer applied to a Sphere light (its own
  // falloff times a built-in power / (2·d²)), and the Quadratic curve as
  // UniformManager packs it.
  const ownAtt = (l: any, d: number) => {
    const range = l.range ?? 0, linear = l.falloffType === 'Linear';
    const k = range > 0.001 ? 99 / (linear ? range : range * range) : Math.max(0, l.falloff ?? 0);
    return 1 / (1 + k * (linear ? d : d * d));
  };
  const linearPower = (l: any) => l.intensityUnit === 'ev' ? Math.pow(2, l.intensity) : l.intensity;
  const oldLook = (l: any, d: number) => linearPower(l) * ownAtt(l, d) / (2 * d * d);
  const newLook = (l: any, d: number) => linearPower(l) * ownAtt(l, d);
  const pt = (lights: any[], extra: any = {}) => ({ formula: 'Mandelbulb', features: { lighting: { renderMode: 1, lights } }, ...extra });
  const sphere = (extra: any = {}) => ({ type: 'Sphere', position: { x: 0, y: 0, z: 0 }, intensity: 1, falloff: 0, falloffType: 'Quadratic', radius: 0.02, ...extra });
  const light0 = (p: any) => (p.features as any).lighting.lights[0];

  // The constants the migration copies from elsewhere still say what it assumes.
  assert(readFileSync(resolve(__dirname, '../engine-gmt/engine/managers/UniformManager.ts'), 'utf8').includes('99.0 / (range * range)'),
    'UniformManager still packs Quadratic falloff as 99 / range² (the migration mirrors it)');
  assert(virtualScaleFor('lighting.light0_intensity', 'Sphere')?.max === 10000,
    'the Sphere power slider still tops out at 10000 (the migration keeps converted Power under it)');

  // A light with no falloff of its own: the old look is a pure inverse-square,
  // and the converted light reproduces it from two radii outward.
  const plain = sphere();
  const plainOut = light0(applyMigrations(pt([JSON.parse(JSON.stringify(plain))])));
  assert(plainOut.unifiedFalloff === true && plainOut.falloffType === 'Quadratic' && Math.abs(plainOut.range - 0.1) < 1e-9,
    'a path-traced Sphere light is marked and given Quadratic falloff with Range = 5 radii');
  const drift = (d: number) => newLook(plainOut, d) / oldLook(plain, d);
  assert(Math.abs(drift(0.08) - 1) < 0.02 && Math.abs(drift(0.3) - 1) < 0.002 && Math.abs(drift(3) - 1) < 0.0001,
    `its look matches the old law: ${drift(0.08).toFixed(4)} at 4 radii, ${drift(0.3).toFixed(4)} at 15, ${drift(3).toFixed(5)} at 150`);
  assert(drift(0.04) > 0.9 && drift(0.04) < 1, `and stays within 10% at two radii (${drift(0.04).toFixed(3)})`);

  // REAL fixture: the bundled path-traced scene. Its Sphere light has a falloff
  // of its own (0.22), which is folded in at the subject distance.
  const ptPath = resolve(__dirname, '../public/scenes/metallic area light mandelbulb.gmf');
  const { preset: ptPreset } = loadGMFScene(readFileSync(ptPath, 'utf8'));
  const rawLights = (ptPreset.features as any).lighting.lights as any[];
  assert(rawLights[0].type === 'Sphere' && rawLights[0].falloff > 0 && rawLights.every(l => l.unifiedFalloff === undefined),
    'fixture: a Sphere light with its own falloff, and no light carries the mark yet');
  const before = JSON.parse(JSON.stringify(rawLights[0]));
  const p9 = applyMigrations(JSON.parse(JSON.stringify(ptPreset)));
  const after = light0(p9);
  // The surface under the screen centre, derived here from the preset the long way round.
  const q = (ptPreset as any).cameraRot, so = (ptPreset as any).sceneOffset, t = (ptPreset as any).targetDistance;
  const fwd = [-2 * (q.x * q.z + q.w * q.y), -2 * (q.y * q.z - q.w * q.x), -(1 - 2 * (q.x * q.x + q.y * q.y))];
  const subj = [so.x + (so.xL ?? 0) + fwd[0] * t, so.y + (so.yL ?? 0) + fwd[1] * t, so.z + (so.zL ?? 0) + fwd[2] * t];
  const dSubj = Math.hypot(before.position.x - subj[0], before.position.y - subj[1], before.position.z - subj[2]);
  assert(Math.abs(Math.hypot(...fwd) - 1) < 1e-9 && dSubj > before.radius,
    `fixture: the subject sits ${dSubj.toFixed(3)} from the light, outside its radius ${before.radius.toFixed(3)}`);
  const atSubject = newLook(after, dSubj) / oldLook(before, dSubj);
  assert(Math.abs(atSubject - 1) < 0.03, `a light with its own falloff matches the old look at the subject (${atSubject.toFixed(4)})`);
  assert(((p9.features as any).lighting.lights as any[]).slice(1).every((l: any, i: number) => JSON.stringify(l) === JSON.stringify(rawLights[i + 1])),
    'the scene\'s other lights are untouched');

  // Replay: the version tag is not persisted. A second pass must not rescale again.
  delete (p9 as any)._migrationVersion;
  const frozen = JSON.stringify(after);
  assert(JSON.stringify(light0(applyMigrations(p9))) === frozen, 'a second pass leaves a converted light exactly as it is');

  // A scene saved in Direct never showed the extra term: marked, not rewritten.
  const directIn = sphere({ range: 3 });
  const directOut = light0(applyMigrations({ formula: 'Mandelbulb', features: { lighting: { renderMode: 0, lights: [JSON.parse(JSON.stringify(directIn))] } } }));
  assert(directOut.unifiedFalloff === true && directOut.intensity === directIn.intensity && directOut.range === 3,
    'a Sphere light in a Direct scene is marked but keeps its Power and Range');

  // Made since the change: the light menu sets the mark, and the light is left alone.
  const freshOut = light0(applyMigrations(pt([sphere({ unifiedFalloff: true })])));
  assert(freshOut.intensity === 1 && freshOut.range === undefined, 'a Sphere light that already carries the mark is not rewritten');

  // Exposure-value power: the same gain, added in stops. (Radius 0.2 keeps both
  // well under their slider ceilings, which differ: 10000 raw, 2^20 in EV.)
  const evOut = light0(applyMigrations(pt([sphere({ radius: 0.2, intensityUnit: 'ev', intensity: 3 })])));
  const rawOut = light0(applyMigrations(pt([sphere({ radius: 0.2, intensity: 8 })])));
  assert(Math.abs(Math.pow(2, evOut.intensity) - rawOut.intensity) < 1e-6 * rawOut.intensity && evOut.range === rawOut.range,
    'an EV light converts to the same linear power as its raw twin');

  // A tiny light would convert past the slider: the Range widens instead, and the far field still matches.
  const tiny = sphere({ radius: 0.002 });
  const tinyOut = light0(applyMigrations(pt([JSON.parse(JSON.stringify(tiny))])));
  assert(tinyOut.intensity <= 10000 * (1 + 1e-9) && tinyOut.range > 5 * 0.002,
    `a tiny light's Power stops at the slider ceiling (${tinyOut.intensity.toFixed(1)}) with a wider Range (${tinyOut.range.toFixed(4)})`);
  assert(Math.abs(newLook(tinyOut, 1) / oldLook(tiny, 1) - 1) < 0.01, 'and still matches the old law in the far field');

  // Animated power: its tracks are in the old units, so the light is marked and left.
  const keyed = applyMigrations(pt([sphere(), sphere()], { sequence: { tracks: { 'lighting.light0_intensity': { id: 'lighting.light0_intensity', keyframes: [] } } } }));
  const kl = (keyed.features as any).lighting.lights;
  assert(kl[0].intensity === 1 && kl[0].range === undefined && kl[0].unifiedFalloff === true, 'a light with a keyframed Power is marked, not rewritten');
  assert(kl[1].range !== undefined, 'its un-animated neighbour is still converted');
  const lfo = light0(applyMigrations(pt([sphere()], { animations: [{ target: 'lighting.light0_falloff' }] })));
  assert(lfo.range === undefined && lfo.unifiedFalloff === true, 'the same for an LFO on its falloff');

  // Legacy top-level home for lights, with the legacy top-level render mode.
  const legacyTop = applyMigrations({ formula: 'Mandelbulb', features: {}, renderMode: 'PathTracing', lights: [sphere()] });
  assert((legacyTop as any).lights[0].unifiedFalloff === true && (legacyTop as any).lights[0].range !== undefined,
    'a Sphere light in the legacy top-level `lights` array converts too');

  // Not a working sphere light, and junk in the array.
  const dead = light0(applyMigrations(pt([sphere({ radius: 0 })])));
  assert(dead.unifiedFalloff === true && dead.range === undefined, 'a Sphere light with no radius is marked and otherwise left');
  const junk = applyMigrations(pt([null, 7, sphere()] as any[]));
  assert((junk.features as any).lighting.lights[2].unifiedFalloff === true, 'non-object entries in the array do not stop the pass');
  const point = light0(applyMigrations(pt([{ type: 'Point', intensity: 1 }])));
  assert(point.unifiedFalloff === undefined && point.range === undefined, 'a Point light gains nothing');
}

// --- Test 10: v10 Blinn-Phong stays with what was authored under it ---------------
// @see docs/adr/0139-cook-torrance-is-the-direct-specular-model.md
console.log('\n[10] v10 — a preset that sets up its look but names no specular model keeps Blinn-Phong');
{
  const sm = featureRegistry.get('lighting')!.params.specularModel as any;
  assert(sm?.default === 1.0, 'lighting.specularModel defaults to 1 (Cook-Torrance)');
  assert(Array.isArray(sm.options) && sm.options.some((o: any) => o.value === 0.0) && sm.options.some((o: any) => o.value === 1.0),
    'both models stay selectable (0 Blinn-Phong, 1 Cook-Torrance)');
  const model = (p: any) => p?.features?.lighting?.specularModel;

  // The shapes that predate the choice. A full save from before the param existed:
  const oldSave = applyMigrations({ formula: 'Mandelbulb', version: 5, features: { lighting: { shadows: true, shadowSoftness: 16, ptBounces: 3 }, materials: { specular: 1.64, roughness: 0.4 } } });
  assert(model(oldSave) === 0, 'a save with a lighting slice and no specularModel is pinned to Blinn-Phong');

  // A legacy preset keeps its lights at the top level and may carry no lighting slice at all.
  const legacyLights = applyMigrations({ formula: 'Mandelbulb', features: { coreMath: { iterations: 9 } }, lights: [{ type: 'Point', intensity: 2 }] });
  assert(model(legacyLights) === 0, 'top-level lights and no specularModel: pinned (the lighting slice is created)');

  const materialsOnly = applyMigrations({ formula: 'Mandelbulb', features: { materials: { specular: 2, roughness: 0.2 } } });
  assert(model(materialsOnly) === 0, 'a materials slice and no specularModel: pinned');

  // REAL fixture: a Formula Workshop file bakes its lights in and names no model.
  assert(model(m1) === 0, 'BioCube.gmf (baked lights, no specularModel) is pinned to Blinn-Phong');

  // What must NOT be pinned.
  const named1 = applyMigrations({ formula: 'Mandelbulb', features: { lighting: { specularModel: 1, shadows: true }, materials: { specular: 2 } } });
  const named0 = applyMigrations({ formula: 'Mandelbulb', features: { lighting: { specularModel: 0, shadows: true } } });
  assert(model(named1) === 1 && model(named0) === 0, 'a preset that names its model keeps it (1 stays 1, 0 stays 0)');

  const nothingAuthored = applyMigrations({ formula: 'Mandelbulb', features: { coreMath: { iterations: 9 }, quality: { fudgeFactor: 0.5 } } });
  assert((nothingAuthored.features as any).lighting === undefined,
    'a preset with no lights, lighting or materials gains no lighting slice (it takes the default model)');

  const emptySlices = applyMigrations({ formula: 'Mandelbulb', features: { lighting: {}, materials: {} }, lights: [] });
  assert(model(emptySlices) === undefined, 'empty slices and an empty lights array count as nothing authored');

  // The version tag is not persisted, so a save/reload replays the chain: the pin must hold,
  // and a model the user chose afterwards must not be pinned back.
  delete (oldSave as any)._migrationVersion;
  assert(model(applyMigrations(oldSave)) === 0, 'a second pass keeps the pin');
  (oldSave.features as any).lighting.specularModel = 1;
  delete (oldSave as any)._migrationVersion;
  assert(model(applyMigrations(oldSave)) === 1, 'a pinned scene the user then moved to Cook-Torrance stays there');

  // Every built-in default scene is lit for Cook-Torrance. One that sets up lights or
  // materials must say so, or the rule above pins it to Blinn-Phong and it renders too
  // bright; a sparse one (the Box Folds) names nothing and takes the default. The two
  // named holdouts are scenes the light rescale could not carry across — their look IS the
  // Blinn-Phong highlight — and they keep that model until they are retuned by eye.
  const HOLDOUTS = ['BoxBulb', 'Tetrabrot'];
  const defs = (registry.getAll() as any[]).filter(d => d?.defaultPreset);
  const after = (d: any) => model(applyMigrations(JSON.parse(JSON.stringify(d.defaultPreset))));
  assert(defs.length >= 50, `the registry is populated (${defs.length} default scenes)`);
  const pinned = defs.filter(d => after(d) === 0).map(d => d.id).sort();
  assert(JSON.stringify(pinned) === JSON.stringify(HOLDOUTS),
    `no built-in default scene ends on Blinn-Phong except the holdouts (on it: ${pinned.join(', ') || 'none'})`);
  const naming = defs.filter(d => after(d) === 1).length;
  assert(naming >= 45, `the lit built-ins name Cook-Torrance (${naming} of ${defs.length})`);

  // Blinn-Phong is otherwise reached only through the Fastest quality preset.
  const tierModel = (presetId: string) => {
    const preset = SCALABILITY_PRESETS.find(p => p.id === presetId)!;
    return SUBSYSTEM_LIGHTING.tiers[preset.subsystems.lighting_quality]?.overrides?.lighting?.specularModel;
  };
  assert(tierModel('fastest') === 0.0, 'the Fastest preset selects Blinn-Phong');
  const others = SCALABILITY_PRESETS.filter(p => p.id !== 'fastest' && p.id !== 'preview').map(p => p.id);
  assert(others.length >= 3 && others.every(id => tierModel(id) === 1.0), `every other lit preset selects Cook-Torrance (${others.join(', ')})`);
}

console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
