import * as fs from 'fs';
import { registerFeatures } from '../engine-gmt/features/index.ts';
registerFeatures();
import '../engine-gmt/formulas/index.ts';
import { ShaderFactory } from '../engine-gmt/engine/ShaderFactory.ts';
import { createDefaultShaderConfig } from '../engine-gmt/engine/ConfigDefaults.ts';
const cfg: any = createDefaultShaderConfig('GreatStellatedDodecahedron');
cfg.quality = cfg.quality || {};
cfg.quality.estimator = 1;
const src = ShaderFactory.generateFragmentShader(cfg);
fs.writeFileSync('debug/shader-dump/GSD-linear.frag', src);
const lines = src.split('\n');
const inFnLines: string[] = [];
let inFn = false, depth = 0;
for (const ln of lines) {
  if (!inFn && /vec2 getDist\s*\(/.test(ln)) { inFn = true; inFnLines.push(ln); depth = 1; continue; }
  if (inFn) { inFnLines.push(ln); depth += (ln.match(/{/g)||[]).length - (ln.match(/}/g)||[]).length; if (depth === 0) break; }
}
console.log(inFnLines.join('\n'));
console.log('--- cp_* still declared (writes still happen, just unused): ---');
for (let i = 0; i < lines.length; i++) {
  if (/^\s*float\s+cp_/.test(lines[i])) console.log(`L${i+1}: ${lines[i].trim()}`);
}
