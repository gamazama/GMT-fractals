/**
 * Dump the default full GLSL shader for app-gmt.
 *
 * Boots the feature registry + formulas the same way app-gmt's main.tsx does,
 * builds a fresh default ShaderConfig (Mandelbulb), and runs ShaderFactory to
 * produce the full Main fragment shader. Writes the result to disk so it can
 * be inspected / fed to analysis agents.
 *
 * Also dumps PathTracing variant + a Direct-mode shader-stats summary
 * (length, line count, uniform / function counts) for quick triage.
 *
 * Usage:
 *   npx tsx debug/dump-default-shader.mts
 *   npx tsx debug/dump-default-shader.mts --formula=Mandelbox
 *   npx tsx debug/dump-default-shader.mts --pt           # also dump PathTracing variant
 *   npx tsx debug/dump-default-shader.mts --all-features # enable every toggleable feature
 */

import * as fs from 'fs';
import * as path from 'path';

// Mirror app-gmt/main.tsx boot order: features + formulas register on import.
import { registerFeatures as registerGmtFeatures } from '../engine-gmt/features/index.ts';
registerGmtFeatures();
import '../engine-gmt/formulas/index.ts';

import { ShaderFactory } from '../engine-gmt/engine/ShaderFactory.ts';
import { createDefaultShaderConfig } from '../engine-gmt/engine/ConfigDefaults.ts';
import { featureRegistry } from '../engine-gmt/engine/FeatureSystem.ts';

const argVal = (flag: string) => {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit?.split('=')[1];
};

const FORMULA      = argVal('--formula') ?? 'Mandelbulb';
const ALSO_PT      = process.argv.includes('--pt');
const ALL_FEATURES = process.argv.includes('--all-features');

const OUT_DIR = path.resolve('debug/shader-dump');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Build config ────────────────────────────────────────────────────────────

const cfg: any = createDefaultShaderConfig(FORMULA);

if (ALL_FEATURES) {
    // Flip every feature's toggleParam (or obvious *Compiled / *Enabled flag) to true
    // so we get a worst-case fully-injected shader.
    for (const feat of featureRegistry.getAll()) {
        const ec: any = (feat as any).engineConfig;
        const slice = cfg[feat.id] ?? cfg[feat.namespace ?? feat.id];
        if (!slice) continue;
        const toggle = ec?.toggleParam;
        if (toggle && toggle in slice) slice[toggle] = true;
        // also flip likely *Compiled flags
        for (const k of Object.keys(slice)) {
            if (/Compiled$/.test(k)) slice[k] = true;
        }
    }
}

// ─── Generate ────────────────────────────────────────────────────────────────

function stats(label: string, src: string) {
    const lines = src.split('\n');
    const uniforms = (src.match(/^\s*uniform\b/gm) ?? []).length;
    const funcs    = (src.match(/^\s*(?:vec[234]|float|void|int|bool|mat[234])\s+\w+\s*\(/gm) ?? []).length;
    const ifs      = (src.match(/\bif\s*\(/g) ?? []).length;
    const loops    = (src.match(/\bfor\s*\(/g) ?? []).length;
    const texFetch = (src.match(/\btexture(?:Lod|Grad)?\s*\(/g) ?? []).length;
    return { label, bytes: src.length, lines: lines.length, uniforms, functions: funcs, ifs, loops, textureFetches: texFetch };
}

const summary: any[] = [];

const main = ShaderFactory.generateFragmentShader(cfg);
fs.writeFileSync(path.join(OUT_DIR, `${FORMULA}.direct${ALL_FEATURES ? '.all-features' : ''}.frag`), main);
summary.push(stats(`${FORMULA} Direct`, main));

if (ALSO_PT) {
    const ptCfg = { ...cfg, renderMode: 'PathTracing' };
    const pt = ShaderFactory.generateFragmentShader(ptCfg);
    fs.writeFileSync(path.join(OUT_DIR, `${FORMULA}.pt${ALL_FEATURES ? '.all-features' : ''}.frag`), pt);
    summary.push(stats(`${FORMULA} PathTracing`, pt));
}

// ─── Report ──────────────────────────────────────────────────────────────────

console.log(`\nShader dump → ${path.relative(process.cwd(), OUT_DIR)}\n`);
console.log('label                            bytes    lines   uniforms  funcs   ifs   loops   tex');
for (const s of summary) {
    console.log(
        s.label.padEnd(32),
        String(s.bytes).padStart(8),
        String(s.lines).padStart(8),
        String(s.uniforms).padStart(10),
        String(s.functions).padStart(7),
        String(s.ifs).padStart(5),
        String(s.loops).padStart(7),
        String(s.textureFetches).padStart(5),
    );
}
console.log('');
