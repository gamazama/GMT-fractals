import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';

const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes('timemachine'))!;
const p = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
const r = emitFusedHybrid(p);
console.log('SUPPORTED:', r.ledger.supported, 'reasons:', r.ledger.reasons);
console.log('slotFlags:', r.ledger.slotFlags.map((f) => `${f.slotIndex}:${f.name}(${f.tier})`).join(', '));
console.log('quality:', JSON.stringify(r.def?.defaultPreset?.features?.quality));
console.log('loopInit:', JSON.stringify(r.def?.shader?.loopInit));
console.log('loopBody:', JSON.stringify(r.def?.shader?.loopBody));
const fn = r.def?.shader?.function || '';
console.log('\n=== per-slot dr/w + c writes ===');
const re = /void (\w+_slot\d+)\(([^{]*)\)\s*\{([\s\S]*?)\n\}/g;
let m: RegExpExecArray | null;
while ((m = re.exec(fn))) {
  const body = m[3];
  const writesW = /(^|[^=!<>])\bw\s*=[^=]/.test(body);
  const writesC = /\bc\.(x|y|z|w|xyz)\s*=/.test(body) || /\bc\s*=/.test(body);
  console.log(`  ${m[1]}: writes_w(dr)=${writesW} writes_c=${writesC}`);
}
console.log('\n=== full function GLSL ===');
console.log(fn);
