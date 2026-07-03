// For each scene, compare the multi-slot PARAMETRIC binding (each Cm offset bound
// to a uniform, evaluated at its coreMath default) against the BAKED literal for
// the same offset. Any divergence is the regression source.
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { bindOptions, packConstBuffer } from '../engine-gmt/utils/mb3d/constPacker.ts';
import { LaneAllocator } from '../engine-gmt/utils/uniformSlots.ts';
import { DECOMPILED_OPTIONS, DECOMPILED_FORMULAS } from '../engine-gmt/utils/mb3d/decompiled-formulas.ts';

const targets = (process.argv[2] ?? 'batjorge,lenord,no,').toLowerCase().split(',');
for (const s of MB3D_SAMPLE_SCENES) {
  if (!targets.some((t) => t && s.name.toLowerCase().includes(t))) continue;
  const p = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
  console.log(`\n=== ${s.name} ===`);
  const alloc = new LaneAllocator();
  for (const sl of p.addon?.slots ?? []) {
    if (sl.formulaIndex < 0 || !sl.name || !DECOMPILED_FORMULAS[sl.name]) {
      console.log(`  slot ${sl.name || '#' + sl.formulaIndex}: (intern/empty — skip bind compare)`);
      continue;
    }
    const baked = packConstBuffer(sl.optionValues, sl.optionTypes, sl.optionCount);
    const bound = bindOptions(sl.optionValues, sl.optionTypes, sl.optionCount, DECOMPILED_OPTIONS[sl.name] ?? [], alloc);
    if (!bound) { console.log(`  slot ${sl.name}: bindOptions=null (would bake)`); continue; }
    // build a uniform→value map from coreMath
    const uval: Record<string, number | { x: number; y: number; z: number }> = {};
    for (const [id, v] of Object.entries(bound.coreMath)) uval['u' + id[0].toUpperCase() + id.slice(1)] = v as any;
    // evaluate a binding expression at its defaults (handles uX, uX.x, uX*uX, etc.)
    const evalExpr = (e: string): number => {
      let js = e.replace(/u(Param[A-F]|Vec[234][A-C])(\.[xyzw])?/g, (_m, id, comp) => {
        const val = uval['u' + id] as any;
        if (comp) return String(val[comp.slice(1)]);
        return String(typeof val === 'number' ? val : val.x);
      });
      try { return Function(`"use strict";return (${js.replace(/max/g, 'Math.max')});`)(); } catch { return NaN; }
    };
    let bad = 0;
    for (const [off, expr] of bound.bindings) {
      const bk = baked.get(off);
      if (bk === undefined) continue;
      const got = evalExpr(expr);
      if (Math.abs(got - bk) > 1e-6 * Math.max(1, Math.abs(bk))) {
        bad++; console.log(`  slot ${sl.name} Cm${off}: parametric=${got} (${expr})  baked=${bk}  ✗`);
      }
    }
    if (bad === 0) console.log(`  slot ${sl.name}: ${bound.bindings.size} bindings OK (cumulative scalar lanes=${alloc.scalarsUsed} vec3=${alloc.vec3sUsed})`);
  }
}
