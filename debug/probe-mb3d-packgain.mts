/**
 * Report which BUNDLED MB3D sample scenes gain editable sliders from dense param-
 * packing. A scene "gains" iff it now emits a parametric def whose shader references a
 * uVec2 / uVec4 COMPONENT lane (uVecNA.x) — those lanes are only ever produced by the
 * new dense allocator packing surplus scalars; genuine vec3 params use uVec3* (a true
 * unit), so they don't count. Under the old 6-scalar budget any such scene baked.
 * Run: npx tsx debug/probe-mb3d-packgain.mts
 */
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { AmazingBox } from '../engine-gmt/formulas/AmazingBox.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';
import { MB3D_SAMPLE_SCENES } from '../engine-gmt/utils/mb3d/sampleScenes.ts';

registry.register(AmazingBox);

const VEC_LANE = /uVec[24][ABC]\.[xyzw]/;        // packed-scalar component lane
const dec = (b64: string) => Uint8Array.from(Buffer.from(b64, 'base64'));

const gained: string[] = [];
const alreadyParam: string[] = [];
const baked: string[] = [];
let errors = 0;

for (const s of MB3D_SAMPLE_SCENES) {
  try {
    const scene = parseMB3DBinary(dec(s.b64), s.name);
    const { def } = emitFusedHybrid(scene);
    const slots = s.formulas.length;
    const params = (def?.parameters ?? []).filter(Boolean) as any[];
    const parametric = !!def && params.length > 0;
    const usesVecLane = !!def && VEC_LANE.test(def.shader.function);
    const tag = `${s.name}  [${slots} slot${slots === 1 ? '' : 's'}: ${s.formulas.join(' + ')}]`;
    if (parametric && usesVecLane) {
      const vecParams = params.filter((p) => p.type === 'vec2' || p.type === 'vec4').map((p) => `${p.id}«${p.label}»`);
      gained.push(`${tag}  →  ${params.length} sliders incl ${vecParams.join(', ')}`);
    } else if (parametric) {
      alreadyParam.push(`${tag}  →  ${params.length} sliders`);
    } else {
      baked.push(tag);
    }
  } catch (e: any) {
    errors++;
    console.log(`  ERROR ${s.name}: ${e?.message ?? e}`);
  }
}

console.log(`\n=== GAINED sliders via dense vec-lane packing: ${gained.length} ===`);
gained.forEach((x) => console.log('  ' + x));
console.log(`\n=== already parametric (≤6 scalars / single-slot, unchanged): ${alreadyParam.length} ===`);
alreadyParam.forEach((x) => console.log('  ' + x));
console.log(`\n=== still baked (4D / unbindable slot / pool overflow): ${baked.length} ===`);
baked.forEach((x) => console.log('  ' + x));
console.log(`\ntotals: ${MB3D_SAMPLE_SCENES.length} bundled scenes | ${gained.length} gained | ${alreadyParam.length} already-param | ${baked.length} baked | ${errors} errors`);
