/**
 * Wall-zoom harness — the maths behind the picker wall's ZOOM STEP (`zoomStep`, Phase F,
 * 2026-09-10) and the commit anchor it shares with the middle-drag zoom.
 *
 * The step exists because a phone has no middle button to drag and no pinch (the wall keeps
 * `touch-action: pan-y` so a finger can still scroll it), so the host offers − / + buttons.
 * The claim worth checking is not "the number went up" but "the wall did not jump": a step
 * must leave the tile under the viewport centre under the viewport centre, which is only
 * true if the anchor is taken at the centre AND the fixed-height band headers are held out
 * of the scaling. Both are arithmetic, so both can be checked without a browser.
 *
 * `zoomStepPlan` and `pinnedContentPoint` are exported from the component for exactly this
 * reason; the component's own commit effect calls the same `pinnedContentPoint`, so a drag
 * and a step cannot drift apart.
 *
 * Falsified 2026-09-10, five ways, each reverted:
 *   · anchoring at `view.scrollLeft` instead of `scrollLeft + relX` → [3] + all four of [4]'s
 *     column checks red (the centre lands half a viewport away)
 *   · dropping the clamp from `next` → [2] red (a step past 16× / below 0.3×)
 *   · returning a plan when neither axis changed → [2] red (a no-op commits a zoom)
 *   · scaling `headerAbove` along with the swatches in `pinnedContentPoint` → [5] red
 *   · pinning by the raw zoom ratio instead of the ROUNDED rendered tile → [4] red at the
 *     starting zooms where the rounding bites (1.1×, 0.7×, 3.3×) and green at 1× — which is
 *     why [4] does not test 1:1 alone.
 *
 * [4]'s first cut measured the column from the anchor and passed under the first mutation
 * above: an anchor-relative check only proves the pin is self-consistent with whatever the
 * anchor says. It measures from the VIEW instead, which is the claim a user can see.
 *
 * [7] (2026-09-24, the polish pass's G01) is the wall's KEYBOARD CURSOR, `stepCursor`: the
 * arrows step through the grid the wall draws, not the flat reading order. It lives here
 * because it is the same kind of claim — wall geometry that is pure arithmetic — and Help ▸
 * Keyboard promises "← → ↑ ↓ … move between gradients". The catalogue fills its bands
 * COLUMN-major, and the cursor used to step the flat index, so → moved down and ↓ jumped
 * columns. Falsified the same day, each reverted — see the note at [7].
 *
 * Run: npx tsx debug/test-palette-wallzoom.mts
 */

import { clampWallZoom, zoomStepPlan, pinnedContentPoint, stepCursor, type CursorBand, type CursorKey } from '../palette/components/PickerWall';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else console.log('  ✓ ' + msg);
};

/** A wall as the layout sizes it: base tile 32×18, no host padding. */
const G = { labelW: 0, swatchW: 32, swatchH: 18, gap: 0 };
/** The layout's own tile + gap at a given zoom — the same two lines the component runs. */
const tile = (z: { x: number; y: number }) => {
  const ewW = Math.max(1, Math.round(G.swatchW * z.x));
  const ewH = Math.max(1, Math.round(G.swatchH * z.y));
  const effGap = Math.max(G.gap, Math.round(ewW / 14));
  return { ewW, ewH, effGap };
};
const VIEW = { scrollLeft: 400, scrollTop: 900, clientWidth: 800, clientHeight: 600 };

console.log('[1] the step multiplies both axes');
const up = zoomStepPlan(VIEW, 0, { x: 1, y: 1 }, 1.25);
ok(!!up, 'a step from 1:1 is a change');
ok(up!.next.x === 1.25 && up!.next.y === 1.25, `1.25× from 1:1 → ${up!.next.x} × ${up!.next.y}`);
const down = zoomStepPlan(VIEW, 0, { x: 1.25, y: 1.25 }, 1 / 1.25);
ok(Math.abs(down!.next.x - 1) < 1e-12 && Math.abs(down!.next.y - 1) < 1e-12, 'the inverse factor returns to 1:1');

console.log('[2] the wall’s own limits, and a no-op is not a commit');
ok(clampWallZoom(100) === 16 && clampWallZoom(0.01) === 0.3, 'the clamp is the wall’s 0.3 … 16');
ok(zoomStepPlan(VIEW, 0, { x: 16, y: 16 }, 1.25) === null, 'a step up at the ceiling plans nothing');
ok(zoomStepPlan(VIEW, 0, { x: 0.3, y: 0.3 }, 1 / 1.25) === null, 'a step down at the floor plans nothing');
const half = zoomStepPlan(VIEW, 0, { x: 12, y: 1 }, 2);
ok(!!half && half.next.x === 16 && half.next.y === 2, 'one axis clamping does not cancel the other (16 × 2)');

console.log('[3] the anchor is the centre of the viewport');
ok(up!.anchor.relX === 400 && up!.anchor.relY === 300, 'rel is the middle of the 800×600 box');
ok(up!.anchor.ax === 800, 'ax is scrollLeft + relX (400 + 400)');
ok(up!.anchor.swatchAbove === 1200, 'swatchAbove is scrollTop + relY with no headers above it');
ok(up!.anchor.czx === 1 && up!.anchor.czy === 1, 'the anchor remembers the zoom it was taken at');

console.log('[4] the tile under the centre is the same tile after the step');
// Measured from the VIEWPORT, not from the anchor: the scroll the commit sets is
// `contentPoint − rel`, so this fails if the anchor is taken anywhere but the centre AND if
// the pin scales it wrongly. (An anchor-relative check passes either way — it only proves
// the pin is self-consistent.)
// The starting zooms include ones the layout ROUNDS (32 × 1.1 = 35.2 → a 35 px tile): the pin
// must scale by the rounded rendered sizes, or that rounding accumulates into visible drift.
for (const [start, factor] of [
  [1, 1.25], [1, 1 / 1.25], [1, 2], [1, 0.5], [1.1, 1.25], [1.1, 1 / 1.25], [0.7, 1.25], [3.3, 0.5],
] as [number, number][]) {
  const cur = { x: start, y: start };
  const plan = zoomStepPlan(VIEW, 0, cur, factor)!;
  const before = tile(cur);
  const after = tile(plan.next);
  const p = pinnedContentPoint(plan.anchor, { ...G, ...after });
  const scrollLeft = p.contentX - plan.anchor.relX;
  const scrollTop = p.contentY - plan.anchor.relY;
  const colBefore = (VIEW.scrollLeft + VIEW.clientWidth / 2) / (before.ewW + before.effGap);
  const colAfter = (scrollLeft + VIEW.clientWidth / 2) / (after.ewW + after.effGap);
  ok(Math.abs(colBefore - colAfter) < 1e-9, `${start}× ×${factor}: column ${colBefore.toFixed(3)} stays ${colAfter.toFixed(3)}`);
  const rowBefore = (VIEW.scrollTop + VIEW.clientHeight / 2) / (before.ewH + before.effGap);
  const rowAfter = (scrollTop + VIEW.clientHeight / 2) / (after.ewH + after.effGap);
  ok(Math.abs(rowBefore - rowAfter) < 1e-9, `${start}× ×${factor}: row ${rowBefore.toFixed(3)} stays ${rowAfter.toFixed(3)}`);
}

console.log('[5] fixed-height band headers do not scale with the swatches');
{
  const HEAD = 40;
  const plan = zoomStepPlan(VIEW, HEAD, { x: 1, y: 1 }, 2)!;
  ok(plan.anchor.swatchAbove === 1200 - HEAD, 'the headers come off the swatch height, not out of the anchor');
  const after = tile(plan.next);
  const p = pinnedContentPoint(plan.anchor, { ...G, ...after });
  const scaled = (after.ewH + after.effGap) / (tile({ x: 1, y: 1 }).ewH + tile({ x: 1, y: 1 }).effGap);
  ok(Math.abs(p.contentY - (HEAD + (1200 - HEAD) * scaled)) < 1e-9, 'contentY = header + scaled swatch run');
  ok(p.contentY < 1200 * scaled, 'a wall with headers scrolls LESS than one without — they did not stretch');
}

console.log('[6] a step composes: two 1.25× steps land where one 1.5625× step does');
{
  const a = zoomStepPlan(VIEW, 0, { x: 1, y: 1 }, 1.25)!;
  const b = zoomStepPlan(VIEW, 0, a.next, 1.25)!;
  const one = zoomStepPlan(VIEW, 0, { x: 1, y: 1 }, 1.25 * 1.25)!;
  ok(Math.abs(b.next.x - one.next.x) < 1e-12 && Math.abs(b.next.y - one.next.y) < 1e-12, `two steps → ${b.next.x}`);
}

console.log('[7] the keyboard cursor steps in grid space');
// Falsified 2026-09-24 against mutated copies of `stepCursor` (the live file untouched):
//   · the old flat-index step (±1 / ±cols) → 15 red, every column-major case among them
//   · every band read as row-major → red on the short-row wrap and the nearest column
//   · the chunk edge not crossed on ↓ → red on the three chunk cases
//   · ↓ without the nearest-column clamp → red on the three short-row landings
{
  // Every case reads the answer off a drawn grid rather than off the function's own maths.
  // A column-major band of 10 at 4 columns is 3 rows, drawn (flat index in each cell):
  //     0 3 6 9
  //     1 4 7
  //     2 5 8
  const R = 'ArrowRight', L = 'ArrowLeft', U = 'ArrowUp', D = 'ArrowDown';
  const step = (bands: CursorBand[], cols: number, chunkLen: number, cur: number, key: CursorKey) => stepCursor(bands, cols, chunkLen, cur, key);
  const walk = (bands: CursorBand[], cols: number, chunkLen: number, from: number, keys: CursorKey[]) =>
    keys.reduce((cur, k) => step(bands, cols, chunkLen, cur, k), from);
  const COL10: CursorBand[] = [{ count: 10, rowMajor: false }];
  const BIG = 1000; // one chunk
  ok(step(COL10, 4, BIG, 0, R) === 3, 'column-major: → goes ACROSS (0 → 3), not down');
  ok(step(COL10, 4, BIG, 0, D) === 1, 'column-major: ↓ goes DOWN (0 → 1), not +cols');
  ok(step(COL10, 4, BIG, 4, U) === 3 && step(COL10, 4, BIG, 4, L) === 1, 'column-major: ↑ and ← from the middle (4 → 3, 4 → 1)');
  ok(step(COL10, 4, BIG, 9, R) === 1, 'column-major: → off the end of the top row wraps to the next row\'s first (9 → 1)');
  ok(step(COL10, 4, BIG, 7, R) === 2, 'column-major: → off a SHORT row wraps too (7 → 2)');
  ok(step(COL10, 4, BIG, 1, L) === 9, 'column-major: ← off a row\'s start wraps to the previous row\'s last (1 → 9)');
  ok(step(COL10, 4, BIG, 9, D) === 7, 'column-major: ↓ under a short row lands on its nearest column (9 → 7)');
  ok(step(COL10, 4, BIG, -1, R) === 0 && step(COL10, 4, BIG, -1, D) === 0, 'no cursor yet: → / ↓ start at the first tile');
  ok(step(COL10, 4, BIG, -1, L) === 9 && step(COL10, 4, BIG, -1, U) === 9, 'no cursor yet: ← / ↑ start at the last tile');
  ok(step(COL10, 4, BIG, 0, L) === 0 && step(COL10, 4, BIG, 0, U) === 0, 'the first tile stays put on ← and ↑');
  ok(step(COL10, 4, BIG, 8, R) === 8 && step(COL10, 4, BIG, 8, D) === 8, 'the bottom row\'s last tile (8) stays put on → and ↓');
  ok(step([], 4, BIG, -1, R) === -1, 'an empty wall has no cursor');
  // The reviewer's reproduction on All: 33 columns, a first band 7 rows tall. Twice → from
  // nothing put the ring on column 1, row 3; it belongs on column 1, row 0 = index 7.
  ok(walk([{ count: 33 * 7, rowMajor: false }], 33, BIG, -1, [R, R]) === 7, 'All: → twice from nothing is column 1, row 0 (index 7)');

  // A ROW-major band (a set, "More like this") is the reading order, so ← / → are exactly ±1.
  const ROW11: CursorBand[] = [{ count: 11, rowMajor: true }];
  let pm1 = true;
  for (let i = 0; i < 11; i++) {
    if (step(ROW11, 4, BIG, i, R) !== Math.min(10, i + 1) || step(ROW11, 4, BIG, i, L) !== Math.max(0, i - 1)) pm1 = false;
  }
  ok(pm1, 'row-major: ← / → are ±1 on every tile, wrapping rows');
  ok(step(ROW11, 4, BIG, 1, D) === 5 && step(ROW11, 4, BIG, 7, D) === 10, 'row-major: ↓ is the column below, or the short row\'s nearest (1 → 5, 7 → 10)');

  // Two bands: row-major 5 at 4 columns (0 1 2 3 / 4), then the column-major 10 above (5 …).
  const TWO: CursorBand[] = [{ count: 5, rowMajor: true }, { count: 10, rowMajor: false }];
  ok(step(TWO, 4, BIG, 3, D) === 4, 'across rows of band A: ↓ from column 3 onto its one-tile last row (3 → 4)');
  ok(step(TWO, 4, BIG, 4, D) === 5, 'into the next BAND: ↓ from A\'s last row lands on B\'s first row (4 → 5)');
  ok(step(TWO, 4, BIG, 5 + 6, U) === 4, 'back up: ↑ from B\'s top row, column 2, is A\'s short last row at its nearest column (11 → 4)');
  ok(step(TWO, 4, BIG, 4, R) === 5 && step(TWO, 4, BIG, 5, L) === 4, '→ / ← wrap across the band edge (4 ↔ 5)');
  ok(step([{ count: 3, rowMajor: true }, { count: 0, rowMajor: true }, { count: 2, rowMajor: true }], 4, BIG, 1, D) === 4, 'an empty band is stepped over (↓ from 1 → 4, nearest column 1)');

  // CHUNKS: a band sliced into canvases of 6 at 3 columns, column-major. Drawn:
  //   chunk 0:  0 2 4      chunk 1:  6 8 10
  //             1 3 5                7 9 11
  const CH: CursorBand[] = [{ count: 12, rowMajor: false }];
  ok(step(CH, 3, 6, 1, D) === 6, 'across a CHUNK edge: ↓ from chunk 0\'s last row, column 0 (1 → 6)');
  ok(step(CH, 3, 6, 3, D) === 8, '… and column 1 stays column 1 (3 → 8)');
  ok(step(CH, 3, 6, 8, U) === 3, '↑ back into the chunk above (8 → 3)');
  ok(step(CH, 3, 6, 5, R) === 6 && step(CH, 3, 6, 6, L) === 5, '→ / ← wrap across the chunk edge (5 ↔ 6)');
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
