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
import '../app-gmt/migrations'; // registers v1 escape migration as a side effect
import { loadGMFScene } from '../engine-gmt/utils/FormulaFormat';

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

console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
