// Dump the compiled est7 (Numerical DE) fragment shader for a fused MB3D scene, to confirm
// de.ts's centerCount/iterateRadius/numericDistance actually compile in. No browser.
import { registerFeatures } from '../engine-gmt/features/index.ts';
registerFeatures();
import '../engine-gmt/formulas/index.ts';
import * as fs from 'fs';
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { ShaderFactory } from '../engine-gmt/engine/ShaderFactory.ts';
import { createDefaultShaderConfig } from '../engine-gmt/engine/ConfigDefaults.ts';
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';

const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes('dsyne'))!;
const scene = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
const { def } = emitFusedHybrid(scene);
if (!def) { console.log('emit failed'); process.exit(1); }
if (!registry.get(def.id as any)) registry.register(def);

const cfg: any = createDefaultShaderConfig(def.id);
const pf = (def.defaultPreset as any)?.features ?? {};
for (const [k, v] of Object.entries(pf)) { if (!cfg[k]) cfg[k] = {}; Object.assign(cfg[k], v as any); }
cfg.quality = { ...cfg.quality, estimator: 7, numDEeps: 0.1 };  // numerical

const out: any = (ShaderFactory as any).generateFragmentShader(cfg);
const src: string = typeof out === 'string' ? out : (out?.fragmentShader ?? out?.fragment ?? '');
fs.writeFileSync('h:/tmp/est7-dsyne.glsl', src);

console.log(`wrote h:/tmp/est7-dsyne.glsl (${src.length} chars)`);
for (const fn of ['centerCount', 'iterateRadius', 'numericDistance', 'numericNormal', 'numProbe', 'numFootprint', 'uNumDEeps', 'NUMERIC_DE']) {
  console.log(`  ${fn.padEnd(16)} ${src.includes(fn) ? 'PRESENT' : 'MISSING'}`);
}
// show the numericDistance body
const i = src.indexOf('float numericDistance');
if (i >= 0) console.log('\n--- numericDistance ---\n' + src.slice(i, src.indexOf('}', i) + 1));
