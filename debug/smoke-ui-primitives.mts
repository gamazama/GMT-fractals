/**
 * Smoke test for the shared floating-panel primitives' pure logic.
 *
 * Only the DOM-free part is exercised here: `clampToViewport`, the flip-then-
 * clamp helper behind AnchoredMenu (used by the Gradient and Graph context
 * menus). The React components themselves are covered by `tsc` for types and
 * need a visual pass when each panel is migrated.
 */
import { clampToViewport } from '../components/ui/viewportClamp.ts';

let failures = 0;
function check(name: string, got: { x: number; y: number }, want: { x: number; y: number }) {
    const ok = got.x === want.x && got.y === want.y;
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  got=(${got.x},${got.y}) want=(${want.x},${want.y})`);
}

const VP = { width: 1000, height: 800 };
const M = { width: 200, height: 300 };

// Fits as-is, no adjustment.
check('fits unchanged', clampToViewport({ x: 100, y: 100 }, M, VP), { x: 100, y: 100 });

// Overflows the right edge → flips left across the anchor (x - width).
check('flip horizontal', clampToViewport({ x: 900, y: 100 }, M, VP), { x: 700, y: 100 });

// Overflows the bottom edge → flips up across the anchor (y - height).
check('flip vertical', clampToViewport({ x: 100, y: 700 }, M, VP), { x: 100, y: 400 });

// Both edges overflow → flips on both axes.
check('flip both', clampToViewport({ x: 950, y: 750 }, M, VP), { x: 750, y: 450 });

// Negative anchor is hard-clamped to the padding gutter.
check('clamp top-left to padding', clampToViewport({ x: -50, y: -50 }, M, VP, { padding: 8 }), { x: 8, y: 8 });

// flip:false → clamp only, no flip across the anchor.
check(
    'no-flip clamps to far edge',
    clampToViewport({ x: 900, y: 100 }, M, VP, { flip: false }),
    { x: VP.width - M.width - 8, y: 100 },
);

// Custom padding is honoured on the clamp.
check('custom padding', clampToViewport({ x: -50, y: 100 }, M, VP, { padding: 20 }), { x: 20, y: 100 });

if (failures > 0) {
    console.error(`\n${failures} clampToViewport case(s) failed`);
    process.exit(1);
}
console.log('\nAll clampToViewport cases passed');
