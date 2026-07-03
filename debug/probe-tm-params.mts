import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';

const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes('timemachine'))!;
const r = emitFusedHybrid(parseMB3DBinary(decodeSampleScene(s.b64), s.name));
const ps = (r.def?.parameters || []) as any[];
console.log('multi-slot parametric:', ps.length > 0);
console.log('param count:', ps.length);
for (const p of ps) console.log(`  ${p.id}  ${p.type || 'scalar'}  default=${JSON.stringify(p.default)}   [${p.label}]`);
console.log('coreMath:', JSON.stringify(r.def?.defaultPreset?.features?.coreMath));
