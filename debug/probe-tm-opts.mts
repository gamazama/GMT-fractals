import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { DECOMPILED_OPTIONS } from '../engine-gmt/utils/mb3d/decompiled-formulas.ts';

const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes('timemachine'));
if (!s) { console.log('no scene'); process.exit(1); }
const p = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
for (const sl of p.addon?.slots ?? []) {
  if (sl.formulaIndex < 0) continue;
  const opts = (DECOMPILED_OPTIONS as any)[sl.name] ?? [];
  console.log(`${sl.name}  fi=${sl.formulaIndex}  count=${sl.optionCount}`);
  console.log('  types =', JSON.stringify(sl.optionTypes.slice(0, sl.optionCount)));
  console.log('  values=', JSON.stringify(sl.optionValues.slice(0, sl.optionCount)));
  console.log('  names =', JSON.stringify(opts.map((o: any) => o.name)));
}
