// Audit per-slot dr emission across bundled MB3D scenes to validate the est7
// routing refinement: route to est7 when any MAIN-FRACTAL slot (a non-"_"-
// prefixed formula, MB3D's transform-naming convention) fails to emit dr.
// Reports which scenes would FLIP vs the current "route only if NO slot emits dr".
// Run: npx tsx debug/mb3d-dr-audit.mts
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { transpileSlot } from '../engine-gmt/utils/mb3d/slotTranspiler.ts';
import { DECOMPILED_DE_META } from '../engine-gmt/utils/mb3d/decompiled-formulas.ts';

const isTransform = (name: string) => name.trim().startsWith('_');
const deOptOf = (name: string) => DECOMPILED_DE_META[name]?.deOption ?? '·';

for (const s of MB3D_SAMPLE_SCENES) {
  const scene = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
  const slots = (scene.addon?.slots ?? []).filter((sl: any) => sl && (sl.iterCount ?? 0) !== 0 && sl.formulaIndex >= 0);
  const info = slots.map((sl: any, i: number) => {
    let writesDeriv = false, tier = '?';
    try {
      const t: any = transpileSlot(sl, i, `f${i}`, { parametric: true });
      writesDeriv = !!t.writesDeriv; tier = t.tier;
    } catch (e: any) { tier = 'ERR'; }
    const deOpt = deOptOf(sl.name || '');
    return { name: sl.name || `#${sl.formulaIndex}`, transform: isTransform(sl.name || ''), writesDeriv, tier, deOpt };
  });
  const anyDr = info.some((x) => x.writesDeriv);
  const curEst7 = !anyDr;                                    // current rule
  // Refined: a slot that OWNS a DE (deOption ≥ 0) but emits no dr = a no-analytic-
  // derivative escape fractal → the analytic DE degenerates. deOption -1 (·) = a
  // pure transform / mapping (Riemann2, folds) whose missing dr is carried by a
  // sibling fractal, so it must NOT trigger est7.
  const deEscape = info.some((x) => typeof x.deOpt === 'number' && x.deOpt >= 0 && x.deOpt !== 20 && !x.writesDeriv);
  const newEst7 = anyDr && deEscape;
  const flip = curEst7 !== (curEst7 || newEst7);
  const route = curEst7 ? 'est7(none-dr)' : newEst7 ? 'est7(NEW)' : 'analytic';
  console.log(
    `${flip ? '⇄ FLIP ' : '       '}${route.padEnd(14)} ${s.name}`,
  );
  console.log('          ' + info.map((x) => `${x.name}${x.transform ? '[T]' : ''}:${x.writesDeriv ? 'dr' : 'nodr'}/de${x.deOpt}`).join('  '));
}
