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
 *   [6] ...and are handed the same range to begin with, read from the wall's SCROLL
 *   [7] the span that range is laid out over never leaves the selection window
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
 *   [6] `marker={marker}` → `marker={lens}`        ✗ "the pad is given `marker`, not `lens`"
 *   [6] restoring the band-derived lens            ✗ "the band is read from scroll position"
 *
 * [6] is a source-text check, which is weak, but it pins what geometry cannot see. The
 * pad and the bar drew the same shape from DIFFERENT values, so the lens vanished
 * wherever they disagreed. And the value itself used to be derived from which lightness
 * BANDS were on screen, which froze outright under grouping — measured at top 6 px
 * through a 5,819 px scroll — and was coarse without it. It is the scroll position now.
 *
 * Run: `npx tsx debug/test-palette-lensband.mts`
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { lensBand, MIN_BAND, mapSpan } from '../palette/core/lensBand';

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

console.log('[6] the pad and the scrollbar are fed the same range, from a readable wall');
{
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const stage = readFileSync(join(root, 'gradient-explorer/v2/BrowseStage.tsx'), 'utf8');
  ok(/marker=\{marker\}/.test(stage), 'the pad is given `marker`, not `lens`');
  ok(/range=\{marker\}/.test(stage), 'the scrollbar is given `marker`');
  ok(!/marker=\{lens\}/.test(stage), 'the pad is not given the bare `lens` again');
  // The band is read from the SCROLL, not from the bands' lightness (owner, 2026-09-09):
  // band-derived positions froze under grouping and were coarse without it.
  ok(/scrollTop \+ height\) \/ scrollHeight/.test(stage), 'the band is read from scroll position');
  ok(!/b\.hi - fBot \*/.test(stage), 'the band is not derived from the visible bands again');
}

console.log('[7] the span the band is laid out over never leaves the selection');
{
  // A band reports its BUCKET's range, not the range of what is in it, so `reach` can be
  // WIDER than a window drawn inside a bucket — and a band laid out over reach then sits
  // outside the selection box. Measured before mapSpan: box 19-26 px, reach 17-28 px.
  const inside = mapSpan([0.70, 0.80], [0.72, 0.78]);
  ok(inside[0] >= 0.72 && inside[1] <= 0.78, 'never wider than the window');
  ok(inside[0] === 0.72 && inside[1] === 0.78, '...and it is the window when the bucket contains it');

  // the other direction: the wall holds less than the window asked for
  const narrower = mapSpan([0.30, 0.40], [0, 1]);
  ok(narrower[0] === 0.30 && narrower[1] === 0.40, 'a wall narrower than the window gives the wall');

  ok(JSON.stringify(mapSpan(null, [0.2, 0.6])) === JSON.stringify([0.2, 0.6]), 'no bands ⇒ the window');
  ok(JSON.stringify(mapSpan([0.8, 0.2], [0.6, 0.1])) === JSON.stringify(mapSpan([0.2, 0.8], [0.1, 0.6])),
     'either order of either range gives the same span');

  // stale bands (a filter just changed, the wall has not re-reported) must not collapse the
  // span to nothing — an empty span makes the band undrawable rather than merely wrong.
  const stale = mapSpan([0.9, 1.0], [0.1, 0.2]);
  ok(stale[1] > stale[0], 'no overlap still yields a usable span');
  ok(stale[0] === 0.1 && stale[1] === 0.2, '...the window, until the wall catches up');
}


console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
