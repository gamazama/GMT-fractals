/**
 * Wall-layout harness — verifies the Picker wall's GLOBAL "squarish" reflow math: a small
 * wall squares up (so it doesn't render as a couple of full-width thin strips) while a
 * content-heavy wall (enough total to fill several rows) keeps its full width.
 *
 * Run: npx tsx debug/test-palette-walllayout.mts
 */

import { shouldSquare, squareCols, STRIP_ROWS_MAX } from '../palette/core/wallLayout';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else console.log('  ✓ ' + msg);
};

// Default-ish swatch cell on a wide wall.
const CW = 32, CH = 18, COLS = 30;

// --- shouldSquare: who gets reflowed ------------------------------------------------
console.log('[1] shouldSquare — few-row wide blocks reflow, tall blocks do not');
ok(shouldSquare(20, COLS, CW, CH), 'a partial single row (20 of 30) is a thin strip → square');
ok(shouldSquare(30, COLS, CW, CH), 'a full single row (30) is still a thin strip → square');
ok(shouldSquare(60, COLS, CW, CH), 'two full rows (60) → square');
ok(shouldSquare(90, COLS, CW, CH), `${STRIP_ROWS_MAX} full rows (90) → square (at the row cap)`);
ok(!shouldSquare(120, COLS, CW, CH), 'four full rows (120) is past the strip cap → keep full width');
ok(!shouldSquare(600, COLS, CW, CH), 'a content-heavy wall (600, ~20 rows) keeps full width');
ok(!shouldSquare(0, COLS, CW, CH), 'an empty wall is never squared');

// --- squareCols: the reflowed column count ------------------------------------------
console.log('[2] squareCols — balanced, clamped to the wall width');
const c20 = squareCols(20, CW, CH, COLS);
ok(c20 < COLS && c20 >= 1, `20 swatches reflow to ${c20} cols (< ${COLS})`);
// the resulting block should be far less wide than the full-width strip it replaces
const rows20 = Math.ceil(20 / c20);
const aspect = (c20 * CW) / (rows20 * CH);
ok(aspect < 4, `reflowed 20-swatch block aspect ${aspect.toFixed(2)} is no longer a thin strip`);
ok(squareCols(20, CW, CH, COLS) >= squareCols(8, CW, CH, COLS), 'more swatches → at least as many columns (monotonic)');
// big blocks clamp to the wall width (never wider than cols)
ok(squareCols(100000, CW, CH, COLS) === COLS, 'a huge block clamps to the full wall width');
ok(squareCols(1, CW, CH, COLS) >= 1, 'a single swatch yields at least one column');

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
