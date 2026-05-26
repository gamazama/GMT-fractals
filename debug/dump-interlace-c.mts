/**
 * Inspection-only: dump the rendered main fragment shader for an interlace
 * pair and grep the parts that show the cInterlace plumbing — useful when
 * verifying the c.w fix.
 *
 *   npx tsx debug/dump-interlace-c.mts                          # Mandelbulb + Tetrabrot
 *   npx tsx debug/dump-interlace-c.mts Mandelbulb Quaternion
 */

import { registerFeatures } from '../engine-gmt/features/index.ts';
registerFeatures();
import '../engine-gmt/formulas/index.ts';

import { ShaderFactory } from '../engine-gmt/engine/ShaderFactory.ts';
import { createDefaultShaderConfig } from '../engine-gmt/engine/ConfigDefaults.ts';

const primary   = process.argv[2] ?? 'Mandelbulb';
const secondary = process.argv[3] ?? 'Tetrabrot';

const cfg: any = createDefaultShaderConfig(primary);
cfg.interlace.interlaceCompiled = true;
cfg.interlace.interlaceFormula  = secondary;
cfg.interlace.interlaceEnabled  = true;

const src = ShaderFactory.generateFragmentShader(cfg);
const lines = src.split('\n');

const grep = (re: RegExp, n = 3) => {
    for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
            const ctx = lines.slice(Math.max(0, i - 1), i + n).join('\n');
            console.log(`──── line ${i + 1} ────`);
            console.log(ctx);
        }
    }
};

console.log(`\n[${primary} + ${secondary}]\n`);
console.log('1. c construction:');
grep(/vec4 c = mix/, 1);
console.log('\n2. cInterlace construction:');
grep(/cInterlace/, 1);
console.log('\n3. formula_Interlace call (should pass cInterlace, not c):');
grep(/formula_Interlace\s*\(/);
