/**
 * Smoke test for the shared floating-panel primitives' pure logic.
 *
 * Only the DOM-free part is exercised here: `clampToViewport`, the flip-then-
 * clamp helper behind AnchoredMenu (used by the Gradient and Graph context
 * menus). The React components themselves are covered by `tsc` for types and
 * need a visual pass when each panel is migrated.
 *
 * SCOPE, measured (2026-07-29 guard sweep). Of `components/ui/**`'s 11 modules
 * this reaches exactly one — `viewportClamp.ts`. `check:rule-guards --verbose`
 * prints the same number from the other side: 1 of the 129 files
 * `ui-and-panels.md` scopes. It is honest but narrow; do not read a green run
 * as coverage of Layer / Modal / FloatingPanel / AnchoredMenu / layerStack.
 *
 * BLIND SPOT CLOSED (2026-07-29). The original seven cases left the y-axis
 * *hard clamp* dead: every fixture's final y landed inside
 * `viewport.height - size.height - padding`, so the `Math.min` on y never bound
 * anything. Swapping that term to `size.width` — a plausible copy-paste slip
 * from the x branch three lines above — passed all seven. A 13-mutation sweep
 * over the same fixture set caught 11 of 12 real mutations and missed exactly
 * that one. The two cases below marked BOTTOM-CLAMP are its cover: both are
 * chosen so `size.width` (200) and `size.height` (300) give different answers
 * (492 vs 592, and 492 vs 495), which is what makes them arithmetic rather than
 * tautology. Falsified after adding: same swap now fails both, exit 1.
 *
 * The corpus is inline, so it cannot vanish the way an external fixture
 * directory can; the one external input is the module under test, and losing it
 * fails at ESM link time before any assertion runs (falsified by renaming the
 * export — SyntaxError, exit 1).
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

// BOTTOM-CLAMP. The vertical twin of 'no-flip clamps to far edge', which was
// missing: flip:false + bottom overflow must hard-clamp to
// height - size.height - padding = 800 - 300 - 8 = 492. Reads 592 if the clamp
// uses size.width.
check(
    'no-flip clamps to bottom edge',
    clampToViewport({ x: 100, y: 700 }, M, VP, { flip: false }),
    { x: 100, y: VP.height - M.height - 8 },
);

// BOTTOM-CLAMP. Flipping is not on its own enough: an anchor below
// `height - padding` flips to 495, which is still past the gutter, so the hard
// clamp has to pull it back to 492. Reads 495 if the clamp uses size.width.
check('flip past bottom still clamps', clampToViewport({ x: 100, y: 795 }, M, VP), { x: 100, y: 492 });

if (failures > 0) {
    console.error(`\n${failures} clampToViewport case(s) failed`);
    process.exit(1);
}
console.log('\nAll clampToViewport cases passed');
