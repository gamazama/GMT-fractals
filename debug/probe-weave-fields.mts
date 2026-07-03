import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { buildWeaveSequence } from '../engine-gmt/utils/mb3d/weaveSequencer.ts';
for (const nm of ['theli', 'hyperben', 'menger trees', 'genetic']) {
  const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes(nm));
  if (!s) continue;
  const p = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
  const a = p.addon!;
  const iters = (a.slots || []).slice(0, 6).map((sl: any) => sl.iterCount);
  const plan = buildWeaveSequence(a);
  console.log(`${s.name.padEnd(26)} hybOpt1=${a.hybOpt1} endTo=${a.hybOpt1 & 7} repFrom(>>4)=${a.hybOpt1 >> 4} | iters=${JSON.stringify(iters)} | PLAN endTo=${plan.endTo} repeatFrom=${plan.repeatFrom} intro=${plan.introLen} cycle=${plan.cycleLen}`);
}
