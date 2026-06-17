/**
 * Selection-geometry harness — verifies the pure carve helpers the Picker wall uses for
 * Lasso / Rect / Paint spatial filtering (point-in-rect, point-in-polygon, drag→box, and
 * the swatch-centre membership test).
 *
 * Run: npx tsx debug/test-palette-selection.mts
 */

import {
  pointInBox,
  pointInPolygon,
  rectFromDrag,
  swatchesInShape,
  type SelShape,
  type SwatchCenter,
} from '../palette/core/selectionGeometry';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else console.log('  ✓ ' + msg);
};

// --- rectFromDrag normalises any drag direction --------------------------------------
console.log('[1] rectFromDrag');
const r = rectFromDrag(30, 40, 10, 10);
ok(r.x === 10 && r.y === 10 && r.w === 20 && r.h === 30, `up-left drag normalised → ${JSON.stringify(r)}`);
const r2 = rectFromDrag(5, 5, 5, 5);
ok(r2.w === 0 && r2.h === 0, 'zero-size drag is a degenerate box');

// --- pointInBox ----------------------------------------------------------------------
console.log('[2] pointInBox');
const box = { x: 10, y: 10, w: 100, h: 50 };
ok(pointInBox({ x: 50, y: 30 }, box), 'centre is inside');
ok(pointInBox({ x: 10, y: 10 }, box), 'top-left corner is inclusive');
ok(pointInBox({ x: 110, y: 60 }, box), 'bottom-right corner is inclusive');
ok(!pointInBox({ x: 9, y: 30 }, box), 'just left of box is outside');
ok(!pointInBox({ x: 50, y: 61 }, box), 'just below box is outside');

// --- pointInPolygon (a non-convex arrow) ---------------------------------------------
console.log('[3] pointInPolygon');
const tri = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }];
ok(pointInPolygon({ x: 50, y: 10 }, tri), 'near top edge, inside triangle');
ok(!pointInPolygon({ x: 5, y: 90 }, tri), 'bottom-left, outside the tapering triangle');
ok(!pointInPolygon({ x: 200, y: 200 }, tri), 'far away is outside');
// concave: a C-shape — the notch must read as outside
const cShape = [
  { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 30 }, { x: 30, y: 30 },
  { x: 30, y: 70 }, { x: 100, y: 70 }, { x: 100, y: 100 }, { x: 0, y: 100 },
];
ok(pointInPolygon({ x: 10, y: 50 }, cShape), 'left bar of the C is inside');
ok(!pointInPolygon({ x: 60, y: 50 }, cShape), 'the C notch reads as outside');

// --- swatchesInShape on a known grid -------------------------------------------------
console.log('[4] swatchesInShape');
// A 4×4 grid of swatch centres at 50px spacing starting (25,25): ids "c{col}r{row}".
const centers: SwatchCenter[] = [];
for (let col = 0; col < 4; col++)
  for (let row = 0; row < 4; row++)
    centers.push({ id: `c${col}r${row}`, cx: 25 + col * 50, cy: 25 + row * 50 });

const rectShape: SelShape = { kind: 'rect', box: { x: 0, y: 0, w: 100, h: 100 } };
const inRect = swatchesInShape(rectShape, centers);
// centres at 25 & 75 in both axes fall inside [0,100]; 125 & 175 do not → top-left 2×2 block.
ok(inRect.size === 4, `rect [0,0,100,100] captures the top-left 2×2 (got ${inRect.size})`);
ok(inRect.has('c0r0') && inRect.has('c1r1') && !inRect.has('c2r2'), 'rect membership ids correct');

const lassoShape: SelShape = { kind: 'lasso', pts: [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 200 }, { x: 0, y: 200 }] };
const inLasso = swatchesInShape(lassoShape, centers);
// x ∈ (0,60) → only col 0 (cx=25). 4 rows.
ok(inLasso.size === 4 && [...inLasso].every((id) => id.startsWith('c0')), `lasso strip captures column 0 only (got ${inLasso.size})`);

const paintShape: SelShape = { kind: 'paint', rects: [] };
ok(swatchesInShape(paintShape, centers).size === 0, 'paint shapes carry no geometric membership here');

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
