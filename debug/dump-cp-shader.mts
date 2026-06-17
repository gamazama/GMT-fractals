/** Verify estimator=5 (Cutting Plane) shader generation. */
import * as fs from 'fs';

import { registerFeatures as registerGmtFeatures } from '../engine-gmt/features/index.ts';
registerGmtFeatures();
import '../engine-gmt/formulas/index.ts';

import { ShaderFactory } from '../engine-gmt/engine/ShaderFactory.ts';
import { createDefaultShaderConfig } from '../engine-gmt/engine/ConfigDefaults.ts';

const FORMULA = process.argv[2] || 'GreatStellatedDodecahedron';

const cfg: any = createDefaultShaderConfig(FORMULA);
cfg.quality = cfg.quality || {};
cfg.quality.estimator = 5;

const src = ShaderFactory.generateFragmentShader(cfg);
fs.writeFileSync(`debug/shader-dump/${FORMULA}.cp5.frag`, src);

const lines = src.split('\n');
let inGetDist = false;
let depth = 0;
const block: string[] = [];
for (const ln of lines) {
    if (!inGetDist && /vec2 getDist\s*\(/.test(ln)) {
        inGetDist = true;
        block.push(ln);
        depth = (ln.match(/{/g) || []).length - (ln.match(/}/g) || []).length;
        continue;
    }
    if (inGetDist) {
        block.push(ln);
        depth += (ln.match(/{/g) || []).length - (ln.match(/}/g) || []).length;
        if (depth === 0) break;
    }
}
console.log(`\n=== ${FORMULA} getDist body (estimator=5) ===`);
console.log(block.join('\n'));

console.log(`\n=== cp_* references ===`);
for (let i = 0; i < lines.length; i++) {
    if (/\bcp_(dmin|scale|trap)\b/.test(lines[i])) {
        console.log(`L${i+1}: ${lines[i].trim()}`);
    }
}
