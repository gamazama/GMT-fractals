/**
 * Guard: Modular node slot parity.
 *
 * `compileGraph`'s `getParam` closure allocates ONE `uModularParams` slot per
 * unbound call and ignores the key; `updateModularUniforms` writes ONE value
 * per `def.inputs` entry. The two stay in lockstep only if every
 * `NodeDefinition.glsl()` template calls `getParam` exactly once per declared
 * input, in declaration order (ADR-0050). Nothing else asserts that.
 *
 * Run: `npm run test:modular-parity`
 */
import { nodeRegistry } from '../engine-gmt/engine/NodeRegistry';
import '../engine-gmt/data/nodes/definitions';
import { compileGraph, updateModularUniforms } from '../engine-gmt/utils/GraphCompiler';
import { topologicalSort, pipelineToGraph, structureKey } from '../engine-gmt/utils/graphAlg';
import { TUTORIAL_PIPELINE, MANDELBOX_PIPELINE, JULIA_REPEATER_PIPELINE } from '../engine-gmt/data/initialPipelines';
import { MAX_MODULAR_PARAMS } from '../data/constants';
import type { PipelineNode } from '../engine-gmt/types';

let failures = 0;
const fail = (msg: string) => { failures++; console.log(`  ✗ ${msg}`); };
const ok = (msg: string) => console.log(`  ✓ ${msg}`);

// ── Block 1: every registered definition reads each input exactly once, in order ──
console.log('Block 1 — per-definition getParam call list equals def.inputs');
const defs = nodeRegistry.getAll();
if (defs.length < 20) fail(`only ${defs.length} definitions registered — the registry did not populate`);
for (const def of defs) {
    const calls: string[] = [];
    const getParam = (key: string) => { calls.push(key); return `uModularParams[${calls.length - 1}]`; };
    try {
        def.glsl({ varName: 'v_t', in1: 'v_a', in2: 'v_b', getParam, indent: '    ' });
    } catch (e) {
        fail(`${def.id}: glsl() threw ${(e as Error).message}`);
        continue;
    }
    const declared = def.inputs.map(i => i.id);
    const same = calls.length === declared.length && calls.every((c, i) => c === declared[i]);
    if (same) ok(`${def.id}: [${calls.join(', ')}]`);
    else fail(`${def.id}: template reads [${calls.join(', ')}] but declares [${declared.join(', ')}] — surplus reads burn slots the packer never writes`);
}

// ── Block 2: compiled slot count equals packed slot count, per pipeline ──
console.log('\nBlock 2 — max emitted slot index + 1 equals the packer\'s write count');
const P = (nodes: Array<Omit<PipelineNode, 'type'> & { type: string }>) => nodes as unknown as PipelineNode[];
const chain = (...types: string[]) => P(types.map((type, i) => ({ id: `n${i}`, type, enabled: true, params: {} })));

/** The packer's contract, restated independently of its code. */
const expectedPacked = (sorted: PipelineNode[], liveIds: Set<string>) => {
    let n = 0;
    for (const node of sorted) {
        if (!liveIds.has(node.id) || !node.enabled) continue;
        if (node.condition?.active) n += 2;
        const d = nodeRegistry.get(node.type);
        if (!d) continue;
        for (const inp of d.inputs) if (!(node.bindings && node.bindings[inp.id])) n++;
    }
    return n;
};
// The compiler names variables from the id with non-alphanumerics stripped
// (`safeId`); mirror that or ids like `note-intro` never match.
const liveIdsOf = (glsl: string, sorted: PipelineNode[]) =>
    new Set(sorted.filter(n => glsl.includes(`v_${n.id.replace(/[^a-zA-Z0-9]/g, '')}_p`)).map(n => n.id));

const cases: Array<[string, PipelineNode[]]> = [
    ['TUTORIAL_PIPELINE', TUTORIAL_PIPELINE],
    ['MANDELBOX_PIPELINE', MANDELBOX_PIPELINE],
    ['JULIA_REPEATER_PIPELINE', JULIA_REPEATER_PIPELINE],
    ['Scale→Mandelbulb→AddConstant', chain('Scale', 'Mandelbulb', 'AddConstant')],
    ['Twist→Mandelbulb', chain('Twist', 'Mandelbulb')],
    ['Bend→Mandelbulb', chain('Bend', 'Mandelbulb')],
    ['Sphere→SmoothUnion→Translate', chain('Sphere', 'SmoothUnion', 'Translate')],
    ['Box→Mix→Translate', chain('Box', 'Mix', 'Translate')],
    ['every definition once, in registry order', chain(...defs.map(d => d.id))],
];
for (const [name, pipeline] of cases) {
    const g = pipelineToGraph(pipeline);
    const sorted = topologicalSort(g.nodes, g.edges);
    const glsl = compileGraph(sorted, g.edges);
    const used = [...glsl.matchAll(/uModularParams\[(\d+)\]/g)].map(m => Number(m[1]));
    const maxSlot = used.length ? Math.max(...used) : -1;
    const packed = expectedPacked(sorted, liveIdsOf(glsl, sorted));
    if (packed > MAX_MODULAR_PARAMS) { ok(`${name}: ${packed} slots exceeds MAX_MODULAR_PARAMS=${MAX_MODULAR_PARAMS}, overflow path — count check not applicable`); continue; }
    if (maxSlot + 1 === packed) ok(`${name}: ${packed} slot(s), highest emitted index ${maxSlot}`);
    else fail(`${name}: compiler emitted slots up to index ${maxSlot} (${maxSlot + 1} slots) but the packer writes ${packed} — every node after the first offender reads the wrong value`);
}

// ── Block 3: the user-visible case — a Scale in front of a Mandelbulb ──
console.log('\nBlock 3 — Scale(2) → Mandelbulb(power 8) → AddConstant(1): each node reads its own value');
{
    const pipeline = P([
        { id: 's', type: 'Scale', enabled: true, params: { scale: 2.0 } },
        { id: 'b', type: 'Mandelbulb', enabled: true, params: { power: 8.0, phaseX: 0.1, phaseY: 0.2, twist: 0.3 } },
        { id: 'c', type: 'AddConstant', enabled: true, params: { scale: 1.0 } },
    ]);
    const g = pipelineToGraph(pipeline);
    const sorted = topologicalSort(g.nodes, g.edges);
    const glsl = compileGraph(sorted, g.edges);
    const arr = new Float32Array(MAX_MODULAR_PARAMS);
    updateModularUniforms(sorted, g.edges, arr);
    const slotOf = (re: RegExp, what: string): number => {
        const m = glsl.match(re);
        if (!m) { fail(`${what}: pattern ${re} not found in compiled GLSL`); return -1; }
        return Number(m[1]);
    };
    const check = (what: string, slot: number, want: number) => {
        if (slot < 0) return;
        const got = arr[slot];
        if (Math.abs(got - want) < 1e-6) ok(`${what} reads slot ${slot} = ${got}`);
        else fail(`${what} reads slot ${slot} = ${got}, expected ${want}`);
    };
    check('Scale.scale', slotOf(/float scale = uModularParams\[(\d+)\];\s*v_s_p \*= scale;/, 'Scale'), 2.0);
    check('Mandelbulb.power', slotOf(/float power = uModularParams\[(\d+)\]/, 'Mandelbulb power'), 8.0);
    check('Mandelbulb.twist', slotOf(/float tw = uModularParams\[(\d+)\]/, 'Mandelbulb twist'), 0.3);
    check('AddConstant.scale', slotOf(/v_c_p \+= c\.xyz \* uModularParams\[(\d+)\]/, 'AddConstant'), 1.0);
}

// ── Block 4: structureKey sees what compileGraph sees ──
console.log('\nBlock 4 — structureKey: edges and bindings count, params and edge ids do not');
{
    const nodes = P([
        { id: 'a', type: 'Sphere', enabled: true, params: { r: 1.0 } },
        { id: 'b', type: 'Box', enabled: true, params: { x: 1, y: 1, z: 1 } },
        { id: 'u', type: 'Subtract', enabled: true, params: {} },
    ]);
    const edges = (h: 'a' | 'b') => [
        { id: 'e1', source: 'root-start', target: 'a' },
        { id: 'e2', source: 'root-start', target: 'b' },
        { id: 'e3', source: 'a', target: 'u', targetHandle: h },
        { id: 'e4', source: 'b', target: 'u', targetHandle: h === 'a' ? 'b' : 'a' },
        { id: 'e5', source: 'u', target: 'root-end' },
    ];
    const base = structureKey(nodes, edges('a'));
    if (base !== structureKey(nodes, edges('b'))) ok('structureKey: edge-only change flips the key (a/b feed swap)');
    else fail('structureKey: swapping which node feeds the a/b handle did NOT change the key');
    if (base !== structureKey(nodes, edges('a').filter(e => e.id !== 'e5'))) ok('structureKey: edge-only change flips the key (output edge deleted)');
    else fail('structureKey: deleting the root-end edge did NOT change the key');
    const retuned = P([{ ...nodes[0], params: { r: 2.5 } }, nodes[1], nodes[2]]);
    if (structureKey(retuned, edges('a')) === base) ok('structureKey: params-only change keeps it');
    else fail('structureKey: a slider retune changed the key — sliders would trigger recompiles');
    if (structureKey(nodes, edges('a').map(e => ({ ...e, id: 'x-' + e.id }))) === base) ok('structureKey: edge ids are irrelevant');
    else fail('structureKey: renaming edge ids changed the key');
    const b1 = P([{ id: 'r', type: 'Rotate', enabled: true, params: {}, bindings: { x: 'ParamA', z: 'ParamC' } }]);
    const b2 = P([{ id: 'r', type: 'Rotate', enabled: true, params: {}, bindings: { z: 'ParamC', x: 'ParamA' } }]);
    const b3 = P([{ id: 'r', type: 'Rotate', enabled: true, params: {}, bindings: { x: 'ParamB', z: 'ParamC' } }]);
    if (structureKey(b1, []) === structureKey(b2, [])) ok('structureKey: bindings key order is irrelevant');
    else fail('structureKey: bindings insertion order changed the key');
    if (structureKey(b1, []) !== structureKey(b3, [])) ok('structureKey: a bindings value change flips the key');
    else fail('structureKey: rebinding x from ParamA to ParamB did NOT change the key');
}

console.log(failures === 0 ? '\nPASS — slot parity and structural fingerprint hold' : `\nFAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
