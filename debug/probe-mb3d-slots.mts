// Inspect a scene's slot stack + DE meta. Usage: npx tsx debug/probe-mb3d-slots.mts <nameFilter>
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { DECOMPILED_DE_META, DECOMPILED_SCRATCH } from '../engine-gmt/utils/mb3d/decompiled-formulas.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';

const f = (process.argv[2] ?? '').toLowerCase();
const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes(f));
if (!s) { console.log('no scene matches', f); process.exit(1); }
const p = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
console.log(`=== ${s.name} ===  iters=${p.header.iterations} zoom=${p.header.zoom} julia=${p.header.isJulia}`);
for (const sl of p.addon?.slots ?? []) {
  if (sl.formulaIndex < 0) { if (sl.iterCount) console.log(`  (empty slot iterCount=${sl.iterCount})`); continue; }
  const de = (DECOMPILED_DE_META as any)[sl.name] ?? {};
  const scr = (DECOMPILED_SCRATCH as any)[sl.name] ?? [];
  console.log(`  ${sl.name}  fi=${sl.formulaIndex}  iterCount=${sl.iterCount}  deOption=${de.deOption ?? '?'}  scratch=[${scr}]  opts=${JSON.stringify(sl.optionValues.slice(0, 6))}`);
}
const r = emitFusedHybrid(p);
console.log('supported:', r.ledger.supported, '| quality:', JSON.stringify(r.def?.defaultPreset?.features?.quality));
console.log('weave slotFlags:', r.ledger.slotFlags.map((x) => `${x.slotIndex}:${x.name}(${x.tier})`).join(', '));
