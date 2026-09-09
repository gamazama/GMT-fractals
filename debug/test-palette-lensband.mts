/**
 * lensBand harness — the lens across the pad and the thumb on the scrollbar beside it must
 * occupy the same pixels.
 *
 * They are one instrument: the owner reads the lens's edges as pointing at the thumb, so a
 * pixel of disagreement reads as the map being wrong. Before `lensBand` they agreed by each
 * containing the same arithmetic, which is not agreement — the scrollbar clamped its band
 * into the track and the pad did not, so any range reaching outside 0..1 drew them apart.
 * Sharing the function is the fix; this pins that it stays shared and that the clamping the
 * pad was missing actually holds.
 *
 *   [1] a band sits where the range says, with 1 at the top
 *   [2] a range order does not matter — [lo,hi] and [hi,lo] draw identically
 *   [3] a band never leaves the track, however far the range reaches past 0..1
 *   [4] a vanishingly thin range still draws MIN_BAND tall, and still inside the track
 *   [5] the two consumers agree: same range + same height ⇒ same pixels
 *
 * [3] is the one that was broken. [5] reads the two source files rather than the runtime —
 * a unit test cannot see a React style prop, but it CAN see whether either file went back
 * to computing its own geometry, which is the regression that matters.
 *
 * Falsified 2026-09-09, each independently:
 *   [1] `1 - Math.max(...)` → `Math.max(...)`      ✗ "a range at the top draws at the top"
 *   [3] dropping the Math.max(0, Math.min(...))    ✗ "a range past the top stays in the track"
 *   [4] MIN_BAND 3 → 0                             ✗ "a zero-width range is still visible"
 *
 * [4]'s first draft asserted `height === MIN_BAND`, which put the constant on both sides of
 * the comparison and passed under every mutation. Falsifying it is what exposed that; it now
 * asserts pixels.
 *   [5] re-inlining the arithmetic in MapScrollbar  ✗ "MapScrollbar uses the shared lensBand"
 *
 * Run: `npx tsx debug/test-palette-lensband.mts`
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { lensBand, MIN_BAND } from '../palette/core/lensBand';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else { console.log('  ✓ ' + msg); }
};
const H = 56; // the height BrowseStage gives both the pad and the scrollbar

console.log('[1] a band sits where the range says, with 1 at the top');
ok(lensBand([0.9, 1], H).top === 0, 'a range at the top draws at the top');
ok(lensBand([0, 0.1], H).top + lensBand([0, 0.1], H).height === H, 'a range at the bottom ends at the bottom');
ok(lensBand([0, 1], H).height === H, 'the whole axis fills the track');

console.log('[2] range order does not matter');
for (const [a, b] of [[0.2, 0.8], [0, 0.35], [0.61, 1]] as [number, number][]) {
  const f = lensBand([a, b], H), r = lensBand([b, a], H);
  ok(f.top === r.top && f.height === r.height, `[${a},${b}] draws the same either way round`);
}

console.log('[3] a band never leaves the track');
for (const r of [[-0.4, 0.3], [0.7, 1.6], [-2, 3], [1.2, 1.4], [-0.9, -0.5]] as [number, number][]) {
  const b = lensBand(r, H);
  ok(b.top >= 0 && b.top + b.height <= H, `[${r[0]},${r[1]}] stays in the track (top ${b.top}, h ${b.height})`);
}
ok(lensBand([1.5, 2], H).top === 0, 'a range past the top stays in the track');

console.log('[4] a vanishingly thin range is still visible');
// NOT `=== MIN_BAND`: the first draft asserted that, which puts the constant on both sides
// and can never fail. What matters is that the band has real pixels.
ok(lensBand([0.5, 0.5], H).height >= 3, 'a zero-width range is still visible');
ok(MIN_BAND >= 3, 'MIN_BAND is a visible number of pixels');
{
  const b = lensBand([1, 1], H);
  ok(b.top + b.height <= H, 'a zero-width range at the very top is still inside the track');
}

console.log('[5] both consumers use the shared function, not their own arithmetic');
{
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const pad = readFileSync(join(root, 'palette/components/HueLightnessPad.tsx'), 'utf8');
  const bar = readFileSync(join(root, 'gradient-explorer/v2/ui/MapScrollbar.tsx'), 'utf8');
  ok(pad.includes('lensBand('), 'HueLightnessPad uses the shared lensBand');
  ok(bar.includes('lensBand('), 'MapScrollbar uses the shared lensBand');
  // the arithmetic this replaced, in either file, means one of them has drifted back
  const inlined = /Math\.round\(\(1 - Math\.max\(/;
  ok(!inlined.test(pad), 'HueLightnessPad does not re-inline the geometry');
  ok(!inlined.test(bar), 'MapScrollbar does not re-inline the geometry');
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
