/**
 * Classify WHY each bundled multi-slot MB3D scene bakes (no sliders) vs packs.
 * Measures each slot's demand with a FRESH allocator (so pool exhaustion from a prior
 * slot doesn't masquerade as "unmapped"), then sums: scalar>24 or vec3>3 = overflow;
 * a slot that can't bind even alone = unmapped option type.
 * Run: npx tsx debug/probe-mb3d-bakereason.mts
 */
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { AmazingBox } from '../engine-gmt/formulas/AmazingBox.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { MB3D_SAMPLE_SCENES } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { transpileSlot } from '../engine-gmt/utils/mb3d/slotTranspiler.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';
import { buildWeaveSequence, stepSlot } from '../engine-gmt/utils/mb3d/weaveSequencer.ts';
import { LaneAllocator } from '../engine-gmt/utils/uniformSlots.ts';

registry.register(AmazingBox);
const dec = (b64: string) => Uint8Array.from(Buffer.from(b64, 'base64'));

const buckets: Record<string, string[]> = {};
const push = (k: string, n: string) => (buckets[k] ?? (buckets[k] = [])).push(n);

for (const s of MB3D_SAMPLE_SCENES) {
  const scene = parseMB3DBinary(dec(s.b64), s.name);
  const { def } = emitFusedHybrid(scene);
  const params = (def?.parameters ?? []).filter(Boolean);
  const addon = scene.addon!;
  const plan = buildWeaveSequence(addon);
  const usedIdx = [...new Set(plan.order.map(stepSlot))].sort((a, b) => a - b);
  if (usedIdx.length === 1) { push('singleSlot', s.name); continue; }
  if (params.length > 0) { push('parametric', s.name); continue; }
  if (usedIdx.some((idx) => addon.slots[idx].formulaIndex === 2)) { push('has4D (Quaternion)', s.name); continue; }

  // Measure each slot ALONE (fresh allocator = full 24/3 capacity).
  let scalarDemand = 0, vec3Demand = 0;
  const unmapped: string[] = [];
  for (const idx of usedIdx) {
    const a = new LaneAllocator();
    const tx = transpileSlot(addon.slots[idx], idx, `solo_${idx}`, { alloc: a });
    if (tx.paramOk === false) unmapped.push(addon.slots[idx].name || `#${addon.slots[idx].formulaIndex}`);
    else { scalarDemand += a.scalarsUsed; vec3Demand += a.vec3sUsed; }
  }
  const reason = unmapped.length ? `unmapped option type (${unmapped.join(', ')})`
    : vec3Demand > 3 ? `vec3 pool overflow (needs ${vec3Demand}, pool=3)`
    : scalarDemand > 24 ? `scalar pool overflow (needs ${scalarDemand}, pool=24)`
    : 'other';
  push(reason.replace(/ \(.*/, ''), `${s.name}  — ${reason}  [scalars ${scalarDemand}/24, vec3 ${vec3Demand}/3]`);
}

const order = ['parametric', 'singleSlot', 'vec3 pool overflow', 'scalar pool overflow', 'unmapped option type', 'has4D (Quaternion)', 'other'];
for (const k of order) {
  const v = buckets[k]; if (!v?.length) continue;
  console.log(`\n=== ${k}: ${v.length} ===`);
  v.forEach((n) => console.log('  ' + n));
}
