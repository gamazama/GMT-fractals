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

console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
