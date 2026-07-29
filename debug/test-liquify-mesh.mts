/**
 * test-liquify-mesh — numerical smoke for the Liquify soft body (LiquifyMesh).
 *
 * The MLS-rigid solver, the forward-warp brushes, the XPBD step, and the Taubin smoother are all
 * hand-rolled float math that runs every frame — a NaN/Infinity or a divergence there would brick
 * the mode at runtime (and can't be caught by tsc). This exercises every path on a small grid and
 * asserts: outputs stay finite, the soft body relaxes back to the sculpt (the art-direction
 * contract), and physics-off keeps the live mesh == sculpt.
 *
 * Pure CPU (no GL/DOM) so it runs under tsx. Run: npm run test:liquify (or npx tsx directly).
 * Also the last link in the `test:palette` chain.
 *
 * FALSIFIED 2026-07-29 (guard sweep, batch 9). The gate is live — `process.exit(fail === 0 ? 0 : 1)`
 * and gutting `step()` reds "[4] settled mesh kept the deformation (not flat)", exit 1. Fifth-mode
 * (green-because-the-input-vanished) is structurally closed: every fixture is constructed inline, so
 * the matrix cannot shrink, and the only external input is the module under test — losing it fails
 * at ESM link time before any assertion runs.
 *
 * THREE BLIND SPOTS CLOSED THE SAME DAY, each measured by breaking the product code and watching the
 * file stay green at 44/44, exit 0:
 *   1. `smoothAll` gutted to an immediate `return` — block [8] is titled "the global Smooth slider is
 *      convergent" and all three of its assertions (finite / bounded / never-inflates) are one-sided,
 *      so they are ALL satisfied by a slider that does nothing.
 *   2. `smoothRegion` gutted — the entire `smooth` brush dead. Block [3] deliberately skips the
 *      "actually deformed" check for the corrective brushes and [3b] covered only `restore`, so
 *      nothing in the repo noticed.
 *   3. `cr` in catmullRom.ts replaced by `p1 + (p2 - p1) * t` — i.e. plain bilinear upsampling, which
 *      is exactly the piecewise-linear "poly soup" the module exists to remove. Block [7]'s four
 *      assertions (S=1 identity, control-point pass-through, finiteness, flat-grid uniformity) are
 *      every one of them satisfied by linear interpolation.
 * Six assertions were ADDED to cover them; nothing existing was changed or loosened. Each break
 * re-applied against the repaired file reds on exactly its new assertion(s) — exit 1 at 48/2, 48/2
 * and 49/1 respectively. Measured healthy values and their margins are recorded at each new bound.
 */

import { LiquifyMesh } from '../gradient-explorer/fullscreen/modes/liquify/LiquifyMesh';
import { upsampleCatmullRom, renderSide, buildRenderIndices } from '../gradient-explorer/fullscreen/modes/liquify/catmullRom';

let pass = 0, fail = 0;
const ok = (cond: boolean, msg: string): void => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); }
};
const finite = (a: Float32Array): boolean => {
  for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return false;
  return true;
};
const inBounds = (a: Float32Array, lo: number, hi: number): boolean => {
  for (let i = 0; i < a.length; i++) if (a[i] < lo || a[i] > hi) return false;
  return true;
};

console.log('[1] construction + flat identity');
{
  const m = new LiquifyMesh(48);
  ok(m.count === 48 * 48, 'count = n²');
  ok(m.indices.length === (48 - 1) * (48 - 1) * 6, 'index count = 6 per cell');
  ok(finite(m.pos) && finite(m.t), 'pos + t finite at rest');
  ok(inBounds(m.pos, 0, 1), 'flat mesh pos in [0,1]');
  ok(m.handles.length === 4, '4 corner handles at construction');
}

console.log('[2] MLS-rigid handle solver');
{
  const m = new LiquifyMesh(48);
  const i = m.addHandle(0.5, 0.5, false);
  m.moveHandle(i, 0.7, 0.4);
  m.syncToSculpt(); // physics-off: the loop reflects sculpt → pos each frame
  ok(finite(m.pos), 'pos finite after a handle drag');
  ok(inBounds(m.pos, -0.5, 1.5), 'deformed pos stays in a sane range');
  // a vertex near the handle should track it; corners should stay put
  const near = (0.5 * 47 | 0) * 48 + (0.5 * 47 | 0);
  const movedX = m.pos[2 * near];
  ok(movedX > 0.5, 'vertex under the handle moved toward it');
  const corner = 0; // (0,0)
  ok(Math.abs(m.pos[2 * corner]) < 0.05 && Math.abs(m.pos[2 * corner + 1]) < 0.05, 'corner stayed fixed');
}

console.log('[3] every forward-warp brush stays finite');
{
  for (const brush of ['push', 'twirl', 'bloat', 'pucker', 'pull', 'smooth', 'restore'] as const) {
    const m = new LiquifyMesh(48);
    const flat = m.pos.slice();
    for (let s = 0; s < 8; s++) m.applyBrush(brush, 0.5, 0.5, 0.2, 0.8, 0.03, -0.02, false, 800, 600);
    m.syncToSculpt(); // physics-off: the loop reflects sculpt → pos; mirror that before asserting
    ok(finite(m.pos), `${brush}: pos finite after 8 strokes`);
    ok(inBounds(m.pos, -2, 3), `${brush}: pos bounded`);
    // Displacing brushes must move the flat mesh; smooth/restore are CORRECTIVE (they act on an
    // existing deformation), so on a flat mesh they're correctly no-ops — don't assert movement.
    if (brush !== 'smooth' && brush !== 'restore') {
      let moved = false;
      for (let i = 0; i < m.pos.length; i++) if (Math.abs(m.pos[i] - flat[i]) > 1e-4) { moved = true; break; }
      ok(moved, `${brush}: actually deformed the mesh`);
    }
  }
}

console.log('[3b] corrective brushes act on an existing deformation');
{
  const dev = (m: LiquifyMesh, flat: Float32Array): number => {
    let s = 0; for (let i = 0; i < m.pos.length; i++) s += Math.abs(m.pos[i] - flat[i]); return s;
  };
  // restore decays an existing warp back toward flat
  const m = new LiquifyMesh(48);
  const flat = m.pos.slice();
  for (let s = 0; s < 6; s++) m.applyBrush('bloat', 0.5, 0.5, 0.25, 0.9, 0, 0, false, 800, 600);
  m.syncToSculpt();
  const before = dev(m, flat);
  for (let s = 0; s < 10; s++) m.applyBrush('restore', 0.5, 0.5, 0.3, 0.8, 0, 0, false, 800, 600);
  m.syncToSculpt();
  ok(dev(m, flat) < before * 0.9, 'restore reduces an existing deformation');

  // `smooth` had NO assertion that it does anything: block [3] only checks finite + bounded and
  // deliberately skips the "actually deformed" check for the corrective brushes, and [3b] covered
  // only `restore`. Measured 2026-07-29: `smoothRegion` gutted to an immediate `return` left the
  // whole file green, 44/44, exit 0. Its job is to cut high-frequency roughness out of the warp,
  // so assert exactly that, on a deliberately CREASED mesh (two opposing pushes at adjacent spots
  // — a flat mesh would make it a correct no-op and the assertion a tautology).
  const roughness = (mm: LiquifyMesh, n: number): number => {
    let s = 0;
    for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
      const k = y * n + x;
      s += Math.abs(mm.pos[2 * (k - 1)] + mm.pos[2 * (k + 1)] - 2 * mm.pos[2 * k]);
      s += Math.abs(mm.pos[2 * (k - 1) + 1] + mm.pos[2 * (k + 1) + 1] - 2 * mm.pos[2 * k + 1]);
    }
    return s;
  };
  const c = new LiquifyMesh(48);
  for (let s = 0; s < 4; s++) c.applyBrush('push', 0.48, 0.5, 0.08, 1, 0.05, 0, false, 800, 600);
  for (let s = 0; s < 4; s++) c.applyBrush('push', 0.55, 0.5, 0.08, 1, -0.05, 0, false, 800, 600);
  c.syncToSculpt();
  const rough0 = roughness(c, 48);
  const posBefore = c.pos.slice();
  for (let s = 0; s < 10; s++) c.applyBrush('smooth', 0.5, 0.5, 0.25, 0.9, 0, 0, false, 800, 600);
  c.syncToSculpt();
  const rough1 = roughness(c, 48);
  let smoothMoved = 0;
  for (let i = 0; i < c.pos.length; i++) smoothMoved = Math.max(smoothMoved, Math.abs(c.pos[i] - posBefore[i]));
  // Measured healthy: rough 1.526 -> 0.898 (ratio 0.589), max vertex move 0.0564. Bounds have ~1.5x
  // and ~5x margin; a dead smoothRegion scores ratio 1.000 / move 0.000 and fails both.
  ok(smoothMoved > 0.01, 'smooth: brush actually moves the mesh (subject exists)');
  ok(rough1 < rough0 * 0.9, 'smooth: reduces high-frequency roughness of an existing crease');
}

console.log('[4] art-direction contract — physics relaxes to sculpt, never flat');
{
  const m = new LiquifyMesh(48);
  m.applyBrush('push', 0.5, 0.5, 0.25, 1, 0.15, 0.1, true, 800, 600); // sculpt + impart velocity
  // run physics to settlement
  for (let f = 0; f < 600; f++) m.step(1 / 60, 0.6, 0.6);
  ok(finite(m.pos), 'pos finite after 600 physics frames');
  // the centre vertex must have stayed deformed (relaxed to the sculpt, NOT back to flat)
  const c = (0.5 * 47 | 0) * 48 + (0.5 * 47 | 0);
  const restU = 0.5 * 47 / 47; // its flat uv.x
  ok(Math.abs(m.pos[2 * c] - restU) > 0.02, 'settled mesh kept the deformation (not flat)');
}

console.log('[5] physics OFF keeps pos == sculpt');
{
  const m = new LiquifyMesh(48);
  m.applyBrush('bloat', 0.4, 0.6, 0.2, 0.9, 0, 0, false, 800, 600);
  m.syncToSculpt();
  // with physics off, a step must be a no-op (settled), pos unchanged + finite
  const before = m.pos.slice();
  m.step(1 / 60, 0.5, 0.5);
  let same = true;
  for (let i = 0; i < before.length; i++) if (before[i] !== m.pos[i]) { same = false; break; }
  ok(same, 'physics-off: step does not move the mesh');
}

console.log('[6] pins freeze + reset clears');
{
  const m = new LiquifyMesh(48);
  m.addHandle(0.5, 0.5, true); // a pin
  m.applyBrush('push', 0.5, 0.5, 0.3, 1, 0.1, 0.1, true, 800, 600);
  for (let f = 0; f < 120; f++) m.step(1 / 60, 0.5, 0.5);
  ok(finite(m.pos), 'pinned-region physics finite');
  m.reset();
  ok(m.handles.length === 4, 'reset drops user handles (keeps corners)');
  ok(inBounds(m.pos, 0, 1) && finite(m.pos), 'reset returns a flat in-bounds mesh');
}

console.log('[7] Catmull-Rom render upsampling (smooth subdivision)');
{
  const n = 8;
  // a deformed grid (so the test isn't trivially linear)
  const m = new LiquifyMesh(n);
  m.addHandle(0.5, 0.5, false); m.moveHandle(m.handles.length - 1, 0.65, 0.4); m.syncToSculpt();
  const pos = m.pos;

  // S=1 reproduces the coarse grid exactly (identity)
  const out1 = new Float32Array(renderSide(n, 1) ** 2 * 2);
  upsampleCatmullRom(pos, n, 1, out1);
  let identical = true;
  for (let i = 0; i < pos.length; i++) if (Math.abs(out1[i] - pos[i]) > 1e-6) { identical = false; break; }
  ok(identical, 'S=1 upsample reproduces the coarse grid');

  // S=3 is interpolating: render vertices at control multiples equal the coarse control points
  const S = 3, RN = renderSide(n, S);
  const out3 = new Float32Array(RN * RN * 2);
  upsampleCatmullRom(pos, n, S, out3);
  let passesThrough = true;
  for (let cj = 0; cj < n; cj++) for (let ci = 0; ci < n; ci++) {
    const rk = 2 * ((cj * S) * RN + ci * S), ck = 2 * (cj * n + ci);
    if (Math.abs(out3[rk] - pos[ck]) > 1e-5 || Math.abs(out3[rk + 1] - pos[ck + 1]) > 1e-5) { passesThrough = false; }
  }
  ok(passesThrough, 'S=3 upsample passes through every coarse control point');
  ok(out3.every(Number.isFinite), 'upsampled positions finite');

  // A flat (rest) grid upsamples to a uniform fine grid for INTERIOR vertices (Catmull-Rom
  // reproduces linears exactly away from the clamped boundary cells).
  const flat = new LiquifyMesh(n);
  const outF = new Float32Array(RN * RN * 2);
  upsampleCatmullRom(flat.pos, n, S, outF);
  const ri = 10; // interior render vertex (its 4×4 stencil is fully inside the grid)
  const probe = 2 * (ri * RN + ri);
  ok(Math.abs(outF[probe] - ri / (RN - 1)) < 1e-5 && Math.abs(outF[probe + 1] - ri / (RN - 1)) < 1e-5,
    'flat grid stays a uniform fine grid at interior vertices (no warping artefacts)');

  // Everything above is satisfied by plain BILINEAR upsampling — measured 2026-07-29: replacing the
  // `cr` cubic in catmullRom.ts with `p1 + (p2 - p1) * t` left this file green, 44/44, exit 0. That
  // is the whole point of the module gone (piecewise-linear render == the "poly soup" creases it
  // exists to remove) under a block headed "Catmull-Rom render upsampling". So measure the cubic
  // itself: on a DEFORMED grid a render vertex between two control points must sit off the straight
  // line joining them, and on a FLAT grid it must sit on it (Catmull-Rom reproduces linears). Only
  // cells whose full 4-point stencil is interior are sampled, because the clamp-extended boundary
  // cells do NOT reproduce linears (measured 0.0106 there, which is why this is not a whole-grid
  // check). Healthy: warped max deviation 0.003912 (3.9x the 0.001 floor), flat 1.0e-8 (100x under
  // the 1e-6 ceiling). Linear scores exactly 0 on both and fails the first.
  const straightLineDev = (src: Float32Array): number => {
    const o = new Float32Array(RN * RN * 2);
    upsampleCatmullRom(src, n, S, o);
    let worst = 0;
    for (let cj = 1; cj <= n - 3; cj++) for (let ci = 1; ci <= n - 3; ci++) {
      for (let s = 1; s < S; s++) for (let comp = 0; comp < 2; comp++) {
        const t = s / S, ri = ci * S + s;
        const lin = (1 - t) * src[2 * (cj * n + ci) + comp] + t * src[2 * (cj * n + ci + 1) + comp];
        worst = Math.max(worst, Math.abs(o[2 * ((cj * S) * RN + ri) + comp] - lin));
      }
    }
    return worst;
  };
  ok(straightLineDev(pos) > 1e-3, 'upsample is genuinely CUBIC on a deformed grid (not bilinear)');
  ok(straightLineDev(flat.pos) < 1e-6, 'upsample still reproduces linears exactly on a flat grid');

  // index buffer is well-formed (6 per cell, all in range)
  const idx = buildRenderIndices(n, S);
  ok(idx.length === (RN - 1) * (RN - 1) * 6, 'render index count = 6 per fine cell');
  ok(idx.every((v) => v < RN * RN), 'render indices in range');
}

console.log('[8] global Smooth slider is convergent (no expand/fold) over many frames');
{
  const m = new LiquifyMesh(48);
  const flat = m.pos.slice();
  for (let s = 0; s < 6; s++) m.applyBrush('bloat', 0.5, 0.5, 0.25, 0.9, 0, 0, false, 800, 600);
  m.syncToSculpt();
  let dev0 = 0; for (let i = 0; i < m.pos.length; i++) dev0 += Math.abs(m.pos[i] - flat[i]);
  const preSmooth = m.pos.slice();
  // run the continuous global smooth for many frames at full strength
  for (let f = 0; f < 400; f++) { m.smoothAll(1); m.syncToSculpt(); }
  ok(m.pos.every(Number.isFinite), 'smoothAll stays finite over 400 frames');
  ok(inBounds(m.pos, -1, 2), 'smoothAll stays bounded (no runaway expansion)');
  let dev1 = 0; for (let i = 0; i < m.pos.length; i++) dev1 += Math.abs(m.pos[i] - flat[i]);
  ok(dev1 <= dev0 + 1e-3, 'smoothAll never INFLATES the deformation (boundary-pinned diffusion)');
  // Every assertion above is one-sided: finite, bounded and "never inflates" are ALL satisfied by a
  // smoothAll that does nothing at all. Measured 2026-07-29: an immediate `return` at the top of
  // smoothAll left this file green, 44/44, exit 0 — a block titled "the global Smooth slider is
  // convergent" passing with the slider disconnected. Prove the subject exists before proving it is
  // well-behaved: healthy, 400 frames at strength 1 take dev 41.75 -> 15.96 (ratio 0.382, ~2.4x
  // margin on the 0.9 bound) and move some vertex by 0.290 (~29x margin). A dead smoothAll scores
  // ratio 1.000 and move 0.000 and fails both.
  let smoothAllMoved = 0;
  for (let i = 0; i < m.pos.length; i++) smoothAllMoved = Math.max(smoothAllMoved, Math.abs(m.pos[i] - preSmooth[i]));
  ok(smoothAllMoved > 0.01, 'smoothAll actually moves the mesh (subject exists)');
  ok(dev1 < dev0 * 0.9, 'smoothAll actually relaxes the deformation toward smooth');
}

console.log(`\n${fail === 0 ? '✓ ALL PASS' : '✗ FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);