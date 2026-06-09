/**
 * test-liquify-mesh — numerical smoke for the Liquify soft body (LiquifyMesh).
 *
 * The MLS-rigid solver, the forward-warp brushes, the XPBD step, and the Taubin smoother are all
 * hand-rolled float math that runs every frame — a NaN/Infinity or a divergence there would brick
 * the mode at runtime (and can't be caught by tsc). This exercises every path on a small grid and
 * asserts: outputs stay finite, the soft body relaxes back to the sculpt (the art-direction
 * contract), and physics-off keeps the live mesh == sculpt.
 *
 * Pure CPU (no GL/DOM) so it runs under tsx. Run: npx tsx debug/test-liquify-mesh.mts
 */

import { LiquifyMesh } from '../gradient-explorer/fullscreen/modes/liquify/LiquifyMesh';

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
    for (let s = 0; s < 8; s++) m.applyBrush(brush, 0.5, 0.5, 0.2, 0.8, 0.03, -0.02, false);
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
  for (let s = 0; s < 6; s++) m.applyBrush('bloat', 0.5, 0.5, 0.25, 0.9, 0, 0, false);
  m.syncToSculpt();
  const before = dev(m, flat);
  for (let s = 0; s < 10; s++) m.applyBrush('restore', 0.5, 0.5, 0.3, 0.8, 0, 0, false);
  m.syncToSculpt();
  ok(dev(m, flat) < before * 0.9, 'restore reduces an existing deformation');
}

console.log('[4] art-direction contract — physics relaxes to sculpt, never flat');
{
  const m = new LiquifyMesh(48);
  m.applyBrush('push', 0.5, 0.5, 0.25, 1, 0.15, 0.1, true); // sculpt + impart velocity
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
  m.applyBrush('bloat', 0.4, 0.6, 0.2, 0.9, 0, 0, false);
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
  m.applyBrush('push', 0.5, 0.5, 0.3, 1, 0.1, 0.1, true);
  for (let f = 0; f < 120; f++) m.step(1 / 60, 0.5, 0.5);
  ok(finite(m.pos), 'pinned-region physics finite');
  m.reset();
  ok(m.handles.length === 4, 'reset drops user handles (keeps corners)');
  ok(inBounds(m.pos, 0, 1) && finite(m.pos), 'reset returns a flat in-bounds mesh');
}

console.log(`\n${fail === 0 ? '✓ ALL PASS' : '✗ FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);