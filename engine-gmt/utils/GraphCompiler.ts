/**
 * @module engine-gmt/utils/GraphCompiler
 *
 * Turns a Modular pipeline (topologically sorted `PipelineNode[]` + `GraphEdge[]`)
 * into the GLSL body of `formula_Modular()`, and produces a matching flat
 * `Float32Array` of per-frame parameter slots so that slider drags update
 * uniforms WITHOUT a shader recompile.
 *
 * `compileGraph` and `updateModularUniforms` MUST allocate / pack
 * `uModularParams` slots in lockstep — they share `buildInputsByTarget` +
 * `buildLiveNodeIds`, walk `pipeline` in the same input order, apply identical
 * skip predicates (`!liveNodeIds.has(node.id)`, `!node.enabled`), and treat
 * `condition.active` as two leading slots ahead of the node's own params.
 * See ADR-0050 for the slot-order parity contract.
 *
 * DCE walks BACKWARD from the synthetic `root-end` via `stack.pop()` (LIFO ⇒
 * DFS). The two synthetic roots (`root-start`, `root-end`) are hard-coded
 * string literals; see ADR-0051. `distOverride` window is `(-1.0, 999.0)`;
 * `v_start_d = 1000.0` so non-SDF graphs naturally fall outside.
 */

import { GraphEdge, PipelineNode } from '../types';
import { MAX_MODULAR_PARAMS } from '../../data/constants';
import { nodeRegistry } from '../engine/NodeRegistry';
import '../data/nodes/definitions'; // Ensure registry is populated

/** Build a Map<targetId, edges[]> for O(1) per-node lookup. */
const buildInputsByTarget = (edges: GraphEdge[]): Map<string, GraphEdge[]> => {
    const map = new Map<string, GraphEdge[]>();
    edges.forEach(e => {
        if (!map.has(e.target)) map.set(e.target, []);
        map.get(e.target)!.push(e);
    });
    return map;
};

/** Walk backward from root-end to find all reachable (live) node IDs. */
const buildLiveNodeIds = (inputsByTarget: Map<string, GraphEdge[]>): Set<string> => {
    const liveNodeIds = new Set<string>();
    const stack = ['root-end'];
    const visited = new Set<string>();
    while (stack.length > 0) {
        const currentId = stack.pop()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        if (currentId !== 'root-end' && currentId !== 'root-start') {
            liveNodeIds.add(currentId);
        }
        (inputsByTarget.get(currentId) ?? []).forEach(e => stack.push(e.source));
    }
    return liveNodeIds;
};

/**
 * Compile a Modular pipeline into the GLSL body of `formula_Modular()`.
 *
 * @invariant DCE walks BACKWARD from synthetic `root-end` via `stack.pop()`
 * (LIFO ⇒ DFS, NOT BFS). Unreachable nodes produce no GLSL and consume no
 * `uModularParams` slots. Empty active set → identity body.
 *
 * @invariant Disabled nodes still emit the propagation triple
 * `v_<id>_p/_d/_dr` from `in1` (so downstream variable lookups resolve) but
 * DO NOT call `def.glsl` and DO NOT consume `uModularParams` slots. The
 * packer mirrors this skip predicate — see `updateModularUniforms`.
 *
 * @invariant The two synthetic roots are hard-coded string literals at EIGHT
 * sites across THREE files — `grep -rn "root-start\|root-end" engine-gmt/`
 * before renaming (ADR-0051 says "three places"; that counts only the three
 * in `compileGraph` and misses the rest):
 *   - `GraphCompiler.ts` ×5 — the DCE seed `['root-end']`, the
 *     `currentId !== 'root-end' && currentId !== 'root-start'` liveness
 *     filter, the `varMap` pre-seed `varMap.set('root-start', 'v_start')`,
 *     the output-edge `target === 'root-end'` lookup, and the
 *     `outputEdge.source !== 'root-start'` guard.
 *   - `graphAlg.ts` ×2 — `pipelineToGraph` MINTS the two boundary edges with
 *     these ids; a rename that misses this produces a graph whose edges point
 *     at nothing and DCE eliminates every node.
 *   - `components/panels/flow/FlowEditor.tsx` ×4 — the two ReactFlow root
 *     nodes and the persisted-root-position lookup.
 *
 * @invariant `distOverride` window is `(-1.0, 999.0)`; `v_start_d` is seeded
 * to `1000.0` so non-SDF graphs naturally fall outside and never override
 * the iterative DE. SDF Primitive nodes write `< 999.0` to engage
 * `distOverride`.
 */
export const compileGraph = (sortedNodes: PipelineNode[], edges: GraphEdge[]): string => {
    // Pre-index edges by target — used for both DCE and per-node input resolution.
    const inputsByTarget = buildInputsByTarget(edges);

    // 1. Dead Code Elimination (DCE)
    const liveNodeIds = buildLiveNodeIds(inputsByTarget);

    const activeNodes = sortedNodes.filter(n => liveNodeIds.has(n.id));

    if (!activeNodes || activeNodes.length === 0) {
        return `
        void formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i) {
            z.xyz += c.xyz;
            float r = length(z.xyz);
            trap = min(trap, r);
        }
        `;
    }

    let body = `
    // --- Graph Init ---
    vec3 v_start_p = z.xyz;
    float v_start_d = 1000.0;
    float v_start_dr = dr; 
    
    vec3 v_curr_p = v_start_p;
    float v_curr_d = v_start_d;
    float v_curr_dr = v_start_dr;
    `;

    const varMap = new Map<string, string>();
    varMap.set('root-start', 'v_start'); 

    let paramCounter = 0;

    activeNodes.forEach((node, i) => {
        const safeId = node.id.replace(/[^a-zA-Z0-9]/g, '');
        const varName = `v_${safeId}`;
        varMap.set(node.id, varName);

        const inputEdges = inputsByTarget.get(node.id) ?? [];
        const edgeA = inputEdges.find(e => !e.targetHandle || e.targetHandle === 'a');
        const edgeB = inputEdges.find(e => e.targetHandle === 'b');
        
        const in1 = edgeA ? (varMap.get(edgeA.source) || "v_start") : "v_start";
        const in2 = edgeB ? (varMap.get(edgeB.source) || "v_start") : "v_start";

        body += `    // Node: ${node.type} (${node.id})\n`;
        body += `    vec3 ${varName}_p = ${in1}_p;\n`;
        body += `    float ${varName}_d = ${in1}_d;\n`;
        body += `    float ${varName}_dr = ${in1}_dr;\n`;

        if (node.enabled) {
            const def = nodeRegistry.get(node.type);
            
            if (def) {
                const hasCondition = node.condition && node.condition.active;
                let indent = "    ";

                if (hasCondition) {
                    // mod/rem are runtime uniforms — dragging sliders updates them
                    // without triggering a shader recompile. Only toggling `active` recompiles.
                    const modSlot = paramCounter < MAX_MODULAR_PARAMS ? `uModularParams[${paramCounter++}]` : '2.0';
                    const remSlot = paramCounter < MAX_MODULAR_PARAMS ? `uModularParams[${paramCounter++}]` : '0.0';
                    body += `    { int ${varName}_cmod = max(1, int(${modSlot})); int ${varName}_crem = int(${remSlot});\n`;
                    body += `    if ( (i - (i/${varName}_cmod)*${varName}_cmod) == ${varName}_crem ) {\n`;
                    indent = "        ";
                }

                // Helper to resolve params for this node
                const getParam = (key: string) => {
                    // Check binding
                    if (node.bindings && node.bindings[key]) {
                        return `u${node.bindings[key]}`;
                    }
                    // Else use array
                    if (paramCounter < MAX_MODULAR_PARAMS) {
                        return `uModularParams[${paramCounter++}]`;
                    }
                    return "0.0";
                };

                // Generate code from definition
                body += def.glsl({
                    varName,
                    in1,
                    in2,
                    getParam,
                    indent
                });

                if (hasCondition) body += `    }}\n`;
            }
        }
        
        body += `\n`;
    });

    const outputEdge = edges.find(e => e.target === 'root-end');
    let finalPrefix = "v_start";
    if (outputEdge) {
        if (outputEdge.source !== 'root-start') {
            finalPrefix = varMap.get(outputEdge.source) || "v_start";
        }
    }

    body += `
    z.xyz = ${finalPrefix}_p;
    dr = ${finalPrefix}_dr;
    
    float final_d = ${finalPrefix}_d;
    if (final_d < 999.0 && final_d > -1.0) {
        distOverride = final_d;
    }
    
    trap = min(trap, length(z.xyz));
    `;

    return `
void formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i) {
${body}
}
`;
};

// --- RUNTIME UPDATE HELPER ---
// Applies the same DCE logic as compileGraph so that uniform slot indices match exactly.
// Pass the graph edges so that dead (disconnected) nodes are skipped — just like the compiler does.
/**
 * Pack per-frame parameter values into the flat `uModularParams` array.
 *
 * @invariant Slot-order parity with `compileGraph` is LOAD-BEARING. Both share
 * `buildInputsByTarget` + `buildLiveNodeIds`, walk `pipeline` in the same
 * input order, apply identical skip predicates (`!liveNodeIds.has(node.id)`,
 * `!node.enabled`), and treat `condition.active` as two leading slots (`cmod`
 * then `crem`) ahead of the node's own params. Divergence silently misaligns
 * sliders (ADR-0050).
 *
 * @invariant `getParam`-call order in each `NodeDefinition.glsl()` template
 * MUST equal `def.inputs` declaration order, ONE call per declared input.
 * The compiler's `getParam` closure ignores the `key` argument when
 * allocating slots — it just increments a counter on each unbound call, so a
 * template that reads the same param twice burns two slots. The packer
 * iterates `def.inputs` in declaration order and writes one value per input.
 * — proven by: npm run test:modular-parity ("<def>: template reads [...] but
 * declares [...]" per registered definition; "compiler emitted slots up to
 * index N but the packer writes M" per pipeline; and the realistic
 * Scale→Mandelbulb→AddConstant case asserting each node reads its own value).
 * Falsified 2026-09-02 against the pre-fix definitions: 17 assertions red —
 * Scale, Twist, Bend, SmoothUnion and Mix in block 1, every pipeline
 * containing one of them in block 2, and Mandelbulb reading power = 0.1
 * (Scale's neighbour slot) instead of 8 in block 3.
 *
 * Until 2026-09-02 those five definitions violated this — each interpolated
 * the same `getParam(...)` two or three times — so a Scale in front of a
 * Mandelbulb made the bulb read its power from the wrong slot and shifted
 * every node after it. Fixed by hoisting each read into a local, the pattern
 * `IFSScale` already used. Saved Modular scenes containing those nodes render
 * differently after the fix: they now read the values their sliders show.
 * `MANDELBOX_PIPELINE` (the example the old annotation cited) has zero
 * importers and is not reachable from the UI.
 *
 * @invariant Param overflow degrades silently — compiler returns the GLSL
 * literal `"0.0"`; packer's `setP` drops writes past `MAX_MODULAR_PARAMS`.
 * No exception, no console warning.
 */
export const updateModularUniforms = (pipeline: PipelineNode[], edges: GraphEdge[], uniformArray: Float32Array) => {
    uniformArray.fill(0);
    let idx = 0;
    const setP = (v: number) => { if (idx < MAX_MODULAR_PARAMS) uniformArray[idx++] = v; };

    // Replicate DCE: same upstream walk as compileGraph so slot indices match.
    const liveNodeIds = buildLiveNodeIds(buildInputsByTarget(edges));

    pipeline.forEach(node => {
        // Skip dead nodes (not reachable from root-end) — matches compileGraph DCE.
        if (!liveNodeIds.has(node.id)) return;
        // Skip disabled nodes — matches compileGraph behaviour (no GLSL emitted, no slots).
        if (!node.enabled) return;

        // Condition mod/rem occupy slots BEFORE node params (compiler allocates them first).
        if (node.condition?.active) {
            setP(Math.max(1, Math.round(node.condition.mod)));
            setP(Math.max(0, Math.round(node.condition.rem)));
        }

        const def = nodeRegistry.get(node.type);
        if (def) {
            def.inputs.forEach(input => {
                if (node.bindings && node.bindings[input.id]) {
                    // Bound params resolve to named uniforms in the compiler — no slot consumed.
                } else {
                    const val = node.params[input.id] ?? input.default;
                    setP(val);
                }
            });
        }
    });
};
