/**
 * Smoke for applyPartialPreset utility.
 *
 * Node-only. Boots the GMT feature registry and a synthetic store snapshot,
 * runs a few representative applyPartialPreset calls, and asserts behavior.
 *
 *   tsx debug/test-partial-apply.mts
 *
 * @see dev/engine-gmt/utils/applyPartialPreset.ts
 * @see dev/plans/partial-apply-utility.md
 */

import '../engine-gmt/formulas/index';
import { registerFeatures } from '../engine-gmt/features/index';
import { featureRegistry } from '../engine/FeatureSystem';

registerFeatures();

// Synthetic store to exercise applyPartialPreset without booting React/Zustand.
// Mirrors the real store's surface: per-feature slice + auto-setter + transaction stubs.
const fakeStore: any = {
  _txOpen: false,
  beginParamTransaction: () => { fakeStore._txOpen = true; },
  endParamTransaction: () => { fakeStore._txOpen = false; },
};

for (const feat of featureRegistry.getAll()) {
  const initial: Record<string, any> = {};
  for (const [key, config] of Object.entries(feat.params)) {
    initial[key] = (config as any).default;
  }
  fakeStore[feat.id] = initial;

  const setterName = `set${feat.id.charAt(0).toUpperCase()}${feat.id.slice(1)}`;
  fakeStore[setterName] = (updates: Record<string, any>) => {
    fakeStore[feat.id] = { ...fakeStore[feat.id], ...updates };
  };
}

// Shim useEngineStore.getState() to return our fake store. Stash the original
// so the production code under test reads from `fakeStore` for this run.
const engineStoreMod = await import('../store/engineStore');
const originalGetState = (engineStoreMod.useEngineStore as any).getState;
(engineStoreMod.useEngineStore as any).getState = () => fakeStore;

const { applyPartialPreset } = await import('../engine-gmt/utils/applyPartialPreset');

let failures = 0;
const assert = (cond: boolean, msg: string) => {
  if (!cond) { console.error(`  FAIL: ${msg}`); failures++; }
  else console.log(`  ok: ${msg}`);
};

// --- Test 1: reset semantics (empty source, single feature) ---
console.log('\n[1] reset semantics — empty source resets lighting only');
fakeStore.lighting = { ...fakeStore.lighting, shadows: false, shadowSoftness: 999 };
const materialsBefore = JSON.stringify(fakeStore.materials);
applyPartialPreset({ source: {}, featureIds: ['lighting'] });
const lightingDefaults = featureRegistry.get('lighting')!.params;
assert(
  fakeStore.lighting.shadows === (lightingDefaults.shadows as any).default,
  'lighting.shadows reset to default',
);
assert(
  fakeStore.lighting.shadowSoftness === (lightingDefaults.shadowSoftness as any).default,
  'lighting.shadowSoftness reset to default',
);
assert(
  JSON.stringify(fakeStore.materials) === materialsBefore,
  'materials slice untouched',
);

// --- Test 2: copy from source ---
console.log('\n[2] copy from source — materials slice copied from custom values');
fakeStore.materials = { ...fakeStore.materials, diffuse: 0, specular: 0 };
applyPartialPreset({
  source: { features: { materials: { diffuse: 1.7, specular: 2.3 } } },
  featureIds: ['materials'],
});
assert(fakeStore.materials.diffuse === 1.7, 'materials.diffuse = 1.7 from source');
assert(fakeStore.materials.specular === 2.3, 'materials.specular = 2.3 from source');
const matDefaults = featureRegistry.get('materials')!.params;
const expectedRoughness = (matDefaults.roughness as any).default;
assert(
  fakeStore.materials.roughness === expectedRoughness,
  'materials.roughness fell back to default (not in source)',
);

// --- Test 3: noReset honored ---
console.log('\n[3] noReset honored — flagged keys preserved');
const aoFeat = featureRegistry.get('ao')!;
const noResetKeys = Object.entries(aoFeat.params)
  .filter(([, c]) => (c as any).noReset)
  .map(([k]) => k);
if (noResetKeys.length === 0) {
  console.log('  skip: no params with noReset:true on ao feature');
} else {
  const sentinelKey = noResetKeys[0];
  fakeStore.ao = { ...fakeStore.ao, [sentinelKey]: 'SENTINEL' };
  applyPartialPreset({ source: {}, featureIds: ['ao'] });
  assert(
    fakeStore.ao[sentinelKey] === 'SENTINEL',
    `ao.${sentinelKey} (noReset) preserved through reset`,
  );
}

// --- Test 4: empty featureIds is no-op ---
console.log('\n[4] empty featureIds — no-op (no transaction)');
fakeStore._txOpen = false;
applyPartialPreset({ source: {}, featureIds: [] });
assert(fakeStore._txOpen === false, 'no transaction opened for empty selection');

// --- Test 5: unknown featureId silently skipped ---
console.log('\n[5] unknown featureId — silently skipped without error');
const lightingSnapshot = JSON.stringify(fakeStore.lighting);
let threw = false;
try {
  applyPartialPreset({ source: {}, featureIds: ['lighting', 'doesNotExist', 'ao'] });
} catch (e) {
  threw = true;
}
assert(!threw, 'no exception thrown on unknown id');

// --- Test 6: includeCompileParams=false skips compile-flagged ---
console.log('\n[6] includeCompileParams=false — compile-flagged params skipped');
const featWithCompile = [...featureRegistry.getAll()]
  .find(f => Object.values(f.params).some(p => (p as any).onUpdate === 'compile'));
if (!featWithCompile) {
  console.log('  skip: no feature has compile-flagged params (unexpected)');
} else {
  const compileKey = Object.entries(featWithCompile.params)
    .find(([, c]) => (c as any).onUpdate === 'compile')![0];
  fakeStore[featWithCompile.id] = { ...fakeStore[featWithCompile.id], [compileKey]: 'COMPILE_SENTINEL' };
  applyPartialPreset({
    source: {},
    featureIds: [featWithCompile.id],
    includeCompileParams: false,
  });
  assert(
    fakeStore[featWithCompile.id][compileKey] === 'COMPILE_SENTINEL',
    `${featWithCompile.id}.${compileKey} (compile-flagged) preserved when includeCompileParams=false`,
  );
}

// Restore original getState (cleanup)
(engineStoreMod.useEngineStore as any).getState = originalGetState;

console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
