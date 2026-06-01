/** Dump the generated fragment shader for a formula via ShaderFactory (node, no browser). */
import { registerFeatures } from '../engine-gmt/features/index.ts';
registerFeatures();
import '../engine-gmt/formulas/index.ts';
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { ShaderFactory } from '../engine-gmt/engine/ShaderFactory.ts';
import { createDefaultShaderConfig } from '../engine-gmt/engine/ConfigDefaults.ts';
import * as fs from 'fs';

const which = process.argv.find(a => a.startsWith('--formula='))?.split('=')[1] ?? 'Opus';
const cfg: any = createDefaultShaderConfig(which);
const def: any = registry.get(which as any);
const pf = def?.defaultPreset?.features ?? {};
for (const [k, v] of Object.entries(pf)) if (cfg[k]) Object.assign(cfg[k], v as any);

const factory = new ShaderFactory();
let src = '';
try {
    const out: any = (factory as any).generateShader ? (factory as any).generateShader(cfg)
                  : (factory as any).build ? (factory as any).build(cfg)
                  : null;
    src = typeof out === 'string' ? out : (out?.fragmentShader ?? out?.fragment ?? JSON.stringify(Object.keys(out ?? {})));
} catch (e: any) {
    src = 'ERROR: ' + e.message + '\n' + (e.stack ?? '');
}
const outPath = `h:/tmp/shader_${which}.frag`;
fs.writeFileSync(outPath, src);
console.log(`wrote ${outPath} (${src.length} bytes)`);
// Print just the formula function region
const idx = src.indexOf(`formula_${which}`);
if (idx >= 0) console.log(src.slice(Math.max(0, idx - 200), idx + 1400));
