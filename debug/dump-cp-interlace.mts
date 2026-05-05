/** Verify GSD + MengerSponge interlace under estimator=5 (the user's failing case). */
import * as fs from 'fs';

import { registerFeatures as registerGmtFeatures } from '../engine-gmt/features/index.ts';
registerGmtFeatures();
import '../engine-gmt/formulas/index.ts';

import { ShaderFactory } from '../engine-gmt/engine/ShaderFactory.ts';
import { createDefaultShaderConfig } from '../engine-gmt/engine/ConfigDefaults.ts';

const cfg: any = createDefaultShaderConfig('GreatStellatedDodecahedron');
cfg.quality = cfg.quality || {};
cfg.quality.estimator = 5;
cfg.interlace = cfg.interlace || {};
cfg.interlace.interlaceCompiled = true;
cfg.interlace.interlaceFormula = 'MengerSponge';
cfg.interlace.interlaceEnabled = true;
cfg.interlace.interlaceInterval = 6;
cfg.interlace.interlaceStartIter = 0;

const src = ShaderFactory.generateFragmentShader(cfg);
fs.writeFileSync('debug/shader-dump/GSD-Menger-CP.frag', src);

const lines = src.split('\n');

// Count declarations
const cpDeclCount = lines.filter(l => /^\s*float\s+cp_(dmin|scale|trap)\s*;/.test(l)).length;
console.log(`cp_* top-level float declarations: ${cpDeclCount} (expected 3 — one each for cp_dmin/cp_scale/cp_trap)`);

// Verify both formulas write to cp_*
const gsdWrites = lines.filter(l => /cp_(dmin|scale|trap)/.test(l) && /formula_GreatStellatedDodecahedron|formula_GSD/.test('')).length;
console.log(`\n=== Interlace function (formula_Interlace = MengerSponge) ===`);
let inFn = false;
let depth = 0;
const block: string[] = [];
for (const ln of lines) {
    if (!inFn && /void formula_Interlace\s*\(/.test(ln)) {
        inFn = true;
        block.push(ln);
        depth = (ln.match(/{/g) || []).length - (ln.match(/}/g) || []).length;
        continue;
    }
    if (inFn) {
        block.push(ln);
        depth += (ln.match(/{/g) || []).length - (ln.match(/}/g) || []).length;
        if (depth === 0) break;
    }
}
console.log(block.slice(0, 60).join('\n'));

console.log('\n=== getDist body ===');
inFn = false;
depth = 0;
const gd: string[] = [];
for (const ln of lines) {
    if (!inFn && /vec2 getDist\s*\(/.test(ln)) {
        inFn = true;
        gd.push(ln);
        depth = (ln.match(/{/g) || []).length - (ln.match(/}/g) || []).length;
        continue;
    }
    if (inFn) {
        gd.push(ln);
        depth += (ln.match(/{/g) || []).length - (ln.match(/}/g) || []).length;
        if (depth === 0) break;
    }
}
console.log(gd.join('\n'));

console.log('\n=== All cp_* references ===');
for (let i = 0; i < lines.length; i++) {
    if (/\bcp_(dmin|scale|trap)\b/.test(lines[i])) {
        console.log(`L${i+1}: ${lines[i].trim()}`);
    }
}
