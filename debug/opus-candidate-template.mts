/**
 * opus-candidate-template.mts — turn a candidate JSON (from the exploration
 * workflow) into a complete, registrable FractalDefinition .ts file under
 * engine-gmt/formulas/OpusCand<N>.ts, wired with a warm clay default palette
 * so I can render + judge it. Also patches the FormulaType union + index.ts so
 * the render harness can resolve it.
 *
 * Usage: npx tsx debug/opus-candidate-template.mts --in=h:/tmp/candidates.json
 *   candidates.json = array of candidate objects (the workflow's .candidates).
 */
import * as fs from 'fs';

function arg(flag: string, def?: string) {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit ? hit.slice(flag.length + 1) : def;
}
const IN = arg('--in', 'h:/tmp/candidates.json')!;
const FORMS_DIR = 'engine-gmt/formulas';

const WARM_GRADIENT = `[
                    { id: 'op_0', position: 0.0,  color: '#160a04' },
                    { id: 'op_1', position: 0.25, color: '#6e2f17' },
                    { id: 'op_2', position: 0.48, color: '#c0552b' },
                    { id: 'op_3', position: 0.68, color: '#e07a4f' },
                    { id: 'op_4', position: 0.85, color: '#f2ad7c' },
                    { id: 'op_5', position: 1.0,  color: '#fbe9d8' },
                ]`;

function paramLine(p: any): string {
    const u = String(p.glslUniform || p.id || '').replace(/^u/, '');
    const id = /^uVec3/.test(p.glslUniform) ? 'vec3' + p.glslUniform.slice(5)
             : /^uVec2/.test(p.glslUniform) ? 'vec2' + p.glslUniform.slice(5)
             : 'param' + (p.glslUniform || '').replace(/^uParam/, '');
    // Prefer explicit p.id if it already looks like a slot id
    const slot = /^(param[A-F]|vec[23][A-C])$/.test(p.id) ? p.id : id;
    if (/^vec3/.test(slot)) {
        return `{ label: ${JSON.stringify(p.label)}, id: '${slot}', type: 'vec3', min: ${p.min ?? -2}, max: ${p.max ?? 2}, step: 0.001, default: { x: ${p.default ?? 0}, y: ${p.default ?? 0}, z: ${p.default ?? 0} } }`;
    }
    return `{ label: ${JSON.stringify(p.label)}, id: '${slot}', min: ${p.min ?? 0}, max: ${p.max ?? 4}, step: 0.001, default: ${p.default ?? 1} }`;
}

function build(cand: any, idx: number): { name: string; src: string } {
    const name = `OpusCand${idx}`;
    const fnName = `formula_${name}`;
    // Rename the candidate's function to our unique name (it used formula_X or similar).
    let fn = String(cand.glslFunction || '');
    fn = fn.replace(/void\s+formula_\w+\s*\(/, `void ${fnName}(`);
    let preamble = String(cand.glslPreamble || '');
    let loopBody = `${fnName}(z, dr, trap, c);`;
    const dmRaw = cand.suggestedDefaults || {};
    const cam = cand.cameraHint || '';

    const coreMath: Record<string, any> = { iterations: dmRaw.iterations ?? 10 };
    for (const p of (cand.params || [])) {
        const slot = /^(param[A-F]|vec[23][A-C])$/.test(p.id) ? p.id : null;
        if (slot && dmRaw[slot] !== undefined) coreMath[slot] = dmRaw[slot];
        else if (slot && p.default !== undefined) coreMath[slot] = p.default;
    }

    const src = `
import { FractalDefinition } from '../types';
import type { Capability } from '../types/capabilities';

// CANDIDATE: ${cand.familyName} (${cand.key})
// ${String(cand.mathSummary || '').replace(/\n/g, ' ')}
export const ${name}: FractalDefinition = {
    id: '${name}',
    name: '${name}',
    shortDescription: ${JSON.stringify(String(cand.familyName || name))},
    description: ${JSON.stringify(String(cand.mathSummary || ''))},
    juliaType: '${cand.juliaType || 'offset'}',
    tags: ['candidate'],
    shader: {
        ${preamble.trim() ? `preamble: \`${preamble.replace(/`/g, '\\`')}\`,` : ''}
        ${(cand.preambleVars && cand.preambleVars.length) ? `preambleVars: ${JSON.stringify(cand.preambleVars)},` : ''}
        function: \`${fn.replace(/`/g, '\\`')}\`,
        loopBody: \`${loopBody}\`,
        ${cand.loopInit && cand.loopInit.trim() ? `loopInit: \`${cand.loopInit.replace(/`/g, '\\`')}\`,` : ''}
        ${cand.getDist && cand.getDist.trim() ? `getDist: \`${cand.getDist.replace(/`/g, '\\`')}\`,` : ''}
        capabilities: new Set(['shape:per-iteration', 'iter:c-constant', 'render:writes-trap', 'render:writes-iter'] satisfies Capability[]),
    },
    parameters: [
        ${(cand.params || []).map(paramLine).join(',\n        ')}
    ],
    defaultPreset: {
        formula: '${name}',
        features: {
            coreMath: ${JSON.stringify(coreMath)},
            geometry: { juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0 },
            quality: { detail: 2, fudgeFactor: 0.6, pixelThreshold: 0.3, maxSteps: 400, distanceMetric: 0.0, estimator: ${cand.estimator ?? 1}.0 },
            coloring: { mode: 0.0, scale: 5.0, offset: 0.0, repeats: 2.0, phase: 0.0, bias: 1.0, escape: 8.0,
                gradient: ${WARM_GRADIENT} },
            materials: { diffuse: 1.05, reflection: 0.08, specular: 1.3, roughness: 0.38, rim: 0.25, rimExponent: 2.0, emission: 0.0, envStrength: 0.2 },
            ao: { aoIntensity: 0.4, aoSpread: 0.4, aoSamples: 8, aoEnabled: true, aoMode: false },
            atmosphere: { fogNear: 1.0, fogFar: 14.0, fogColor: '#140a05', fogDensity: 0.0, glowIntensity: 0.006, glowSharpness: 2.0, glowColor: '#e07a4f', glowMode: false },
            lighting: { shadows: true, shadowSoftness: 16.0, shadowIntensity: 1.0, shadowBias: 0.0025 },
            optics: { camType: 0, camFov: 55 },
        },
        // cameraHint: ${JSON.stringify(cam)}
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0, y: 0, z: 0, w: 1 },
        sceneOffset: { x: 0, y: 0, z: 3.5, xL: 0, yL: 0, zL: 0 },
        targetDistance: 3.5,
        cameraMode: 'Orbit',
        lights: [
            { type: 'Directional', position: { x: 1.2, y: 1.6, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 }, color: '#fff2e6', intensity: 1.1, falloff: 0, falloffType: 'Quadratic', fixed: false, visible: true, castShadow: true },
        ],
    },
};
`;
    return { name, src };
}

function main() {
    const cands = JSON.parse(fs.readFileSync(IN, 'utf8'));
    const list = Array.isArray(cands) ? cands : (cands.candidates ?? []);
    const names: string[] = [];
    list.forEach((cand: any, i: number) => {
        const { name, src } = build(cand, i);
        fs.writeFileSync(`${FORMS_DIR}/${name}.ts`, src);
        names.push(name);
        console.log(`wrote ${FORMS_DIR}/${name}.ts  (${cand.key} / ${cand.familyName})`);
    });
    // Wire registration into _candidates.ts (self-registering).
    const imports = names.map(n => `import { ${n} } from './${n}';`).join('\n');
    const listLine = `candidates.push(${names.join(', ')});`;
    const candFile = `// TEMP candidate registration for Opus round-3 exploration. Safe to delete.
import { registry } from '../engine/FractalRegistry';
${imports}

const candidates: any[] = [];
${listLine}

candidates.forEach(def => { try { registry.register(def); } catch (e) { console.warn('cand register failed', e); } });
export const OpusCandidates = candidates;
`;
    fs.writeFileSync(`${FORMS_DIR}/_candidates.ts`, candFile);
    fs.writeFileSync('h:/tmp/cand_names.json', JSON.stringify(names));
    console.log('CANDIDATE_NAMES=' + names.join(','));
}
main();
