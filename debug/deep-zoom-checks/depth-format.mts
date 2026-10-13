/**
 * depth-format check: how a depth is written and placed on the scale
 * (`deep-zoom/components/depthFormat.ts`). Node only, no browser.
 *
 *   npx tsx debug/deep-zoom-checks/depth-format.mts
 *
 * The smoke's status-chip step matches the depth text against `/^\d\.\d\de-?\d+$/`; the first
 * lines here pin that the formatter can only produce that shape.
 *
 * FALSIFICATION RECORD, 2026-10-08: `.replace('e+', 'e')` removed from `formatDepth` -> 2 red
 * ("1.5 is written 1.50e0", "every sampled depth matches the smoke's pattern").
 */
import {
    FLOOR_EXP, decadesPerSecond, decadesToFloor, depthAtFraction, formatDepth, formatDepthCompact, scaleFraction, validDepth, yardstickFor,
} from '../../deep-zoom/components/depthFormat.ts';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}
const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;

check(formatDepth(6.4e-53) === '6.40e-53', '6.4e-53 is written 6.40e-53', formatDepth(6.4e-53));
check(formatDepth(1.5) === '1.50e0', '1.5 is written 1.50e0', formatDepth(1.5));
const PATTERN = /^\d\.\d\de-?\d+$/;
const samples = [2.6, 1, 0.999, 1e-4, 3.35e-7, 1.14e-17, 9.99e-51, 1e-77, 12.5];
const bad = samples.map((d) => formatDepth(d)).filter((t) => !PATTERN.test(t));
check(bad.length === 0, 'every sampled depth matches the smoke’s pattern', bad.join(', '));
check(formatDepth(0) === '-' && formatDepth(NaN) === '-' && formatDepth(-1) === '-' && formatDepth(undefined) === '-', 'no depth is a dash, never NaN or Infinity text');
check(formatDepthCompact(6.4e-53) === '6e-53' && formatDepthCompact(1) === '1e0', 'the compact form has one digit');
check(validDepth(1e-77) && !validDepth(0) && !validDepth(Infinity), 'validDepth: positive and finite');

check(near(decadesToFloor(1), 77) && near(decadesToFloor(1e-77), 0) && decadesToFloor(1e-90) === 0, 'decades to the floor: 77 at depth 1, 0 at the floor, never negative');
check(scaleFraction(1) === 0 && near(scaleFraction(1e-77), 1) && scaleFraction(10) === 0 && scaleFraction(1e-99) === 1, 'the scale runs 0 at 1e0 to 1 at the floor and is clamped');
check(depthAtFraction(0) === 1 && depthAtFraction(1) === 1e-77 && depthAtFraction(2) === 1e-77 && depthAtFraction(30 / FLOOR_EXP) === 1e-30,
    'a click on the scale gives a whole decade, never below 1e-77');

check(yardstickFor(1) === '' && yardstickFor(1e-30) === 'grain of sand' && yardstickFor(1e-70) === 'Planck length', 'the yardstick is the smallest one passed');
check(near(decadesPerSecond(1e-10, 1e-12, 2), 1) && near(decadesPerSecond(1e-12, 1e-10, 2), -1), 'speed: positive going deeper, in decades per second');
check(decadesPerSecond(0, 1e-3, 1) === 0 && decadesPerSecond(1e-3, 1e-4, 0) === 0, 'speed: 0 for a missing depth or no time');

console.log(failed === 0 ? 'depth-format: all green' : `depth-format: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
