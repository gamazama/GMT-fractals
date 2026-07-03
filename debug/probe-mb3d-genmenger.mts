/**
 * Trace WHY a multi-slot MB3D scene bakes instead of exposing sliders.
 * Replicates emitFusedHybrid's parametric gate per-slot and prints the verdict.
 * Run: npx tsx debug/probe-mb3d-genmenger.mts [nameSubstr]
 */
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { AmazingBox } from '../engine-gmt/formulas/AmazingBox.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { MB3D_SAMPLE_SCENES } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { transpileSlot } from '../engine-gmt/utils/mb3d/slotTranspiler.ts';
import { buildWeaveSequence, stepSlot } from '../engine-gmt/utils/mb3d/weaveSequencer.ts';
import { LaneAllocator } from '../engine-gmt/utils/uniformSlots.ts';
import { DECOMPILED_OPTIONS, DECOMPILED_DEFAULTS } from '../engine-gmt/utils/mb3d/decompiled-formulas.ts';

registry.register(AmazingBox);
const want = (process.argv[2] ?? 'genetic menger').toLowerCase();
const dec = (b64: string) => Uint8Array.from(Buffer.from(b64, 'base64'));

// option-type names (from packConstBuffer / bindOptions)
const TYPE: Record<number, string> = {
  0: 'DOUBLE', 1: 'SINGLE', 2: 'INTEGER', 3: 'DOUBLEANGLE', 4: 'SINGLEANGLE',
  6: '3SINGLEANGLES(rot)', 7: 'BOXSCALE', 8: 'FOLDING', 9: 'DSQUARE', 11: 'FOLDING16',
  12: '6SINGLEANGLES(4x4)', 13: 'DRECIPRO', 14: '2DOUBLES', 21: 'SRECI2', 22: 'DRECI2',
};
const BIND_OK = new Set([0, 1, 2, 6, 7, 8, 11]); // types bindOptions (parametric) handles

for (const s of MB3D_SAMPLE_SCENES) {
  if (!s.name.toLowerCase().includes(want)) continue;
  const scene = parseMB3DBinary(dec(s.b64), s.name);
  const addon = scene.addon!;
  const plan = buildWeaveSequence(addon);
  const usedIdx = [...new Set(plan.order.map(stepSlot))].sort((a, b) => a - b);
  console.log(`\n=== ${s.name} ===  weave mode ${plan.mode}, used slots [${usedIdx.join(',')}]`);
  const has4D = usedIdx.some((idx) => addon.slots[idx].formulaIndex === 2);
  console.log(`  has4D (Quaternion #2): ${has4D}`);

  const alloc = new LaneAllocator();
  let bakeReason = '';
  for (const idx of usedIdx) {
    const slot = addon.slots[idx];
    // mirror transpileSlot's dIFS option-count pad so the type list matches what it sees
    const defs = slot.name ? DECOMPILED_DEFAULTS[slot.name] : undefined;
    const types = (defs && slot.optionCount < defs.optionCount ? defs.optionTypes : slot.optionTypes).slice(0, 16);
    const count = defs && slot.optionCount < defs.optionCount ? defs.optionCount : slot.optionCount;
    const optTypes = types.slice(0, count);
    const unmapped = [...new Set(optTypes.filter((t) => !BIND_OK.has(t)))];
    const optNames = (slot.name ? DECOMPILED_OPTIONS[slot.name] : [])?.map((o: any) => o.name) ?? [];

    alloc.startSlot();
    const before = { s: alloc.scalarsUsed, v: alloc.vec3sUsed };
    const tx = transpileSlot(slot, idx, `probe_slot${idx}`, { alloc });
    const after = { s: alloc.scalarsUsed, v: alloc.vec3sUsed };
    console.log(`\n  slot ${idx}: ${slot.name || '#' + slot.formulaIndex}  (tier=${tx.tier}, fi=${slot.formulaIndex})`);
    console.log(`    optionCount=${count}  types=[${optTypes.map((t) => `${t}:${TYPE[t] ?? '?'}`).join(', ')}]`);
    if (optNames.length) console.log(`    optionNames=[${optNames.slice(0, count).join(', ')}]`);
    if (unmapped.length) console.log(`    ⚠ types bindOptions can't map (force bake): [${unmapped.map((t) => `${t}:${TYPE[t] ?? '?'}`).join(', ')}]`);
    console.log(`    paramOk=${tx.paramOk}  lanes consumed: scalar ${before.s}→${after.s}, vec3 ${before.v}→${after.v}`);
    if (tx.paramOk === false && !bakeReason) bakeReason = `slot ${idx} (${slot.name}) could not bind parametrically — ${tx.flag.note}`;
  }
  console.log(`\n  alloc.fits()=${alloc.fits()}  (scalar lanes used=${alloc.scalarsUsed}/24, vec3=${alloc.vec3sUsed}/3)`);
  console.log(`  VERDICT: ${has4D ? 'BAKES (4D Quaternion reserves paramA/B)' : !alloc.fits() ? 'BAKES (pool overflow)' : bakeReason ? 'BAKES — ' + bakeReason : 'PARAMETRIC (would expose sliders)'}`);
}
