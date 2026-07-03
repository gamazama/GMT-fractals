import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';
for (const nm of ['theli', 'genetic', 'hyperben', 'menger trees', 'batjorge', 'tree planet']) {
  const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes(nm)); if (!s) continue;
  const r = emitFusedHybrid(parseMB3DBinary(decodeSampleScene(s.b64), s.name));
  const q: any = r.def?.defaultPreset?.features?.quality || {};
  console.log(`${s.name.padEnd(26)} detail=${q.detail ?? '-'} fudge=${q.fudgeFactor ?? '-'} bail=${q.deBailout ?? '-'} est=${q.estimator ?? '-'}`);
}
