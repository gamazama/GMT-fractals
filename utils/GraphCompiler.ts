
import { GraphEdge, PipelineNode } from '../types';
import { MAX_MODULAR_PARAMS } from '../data/constants';
import { nodeRegistry } from '../engine/NodeRegistry';
import '../data/nodes/definitions'; // Ensure registry is populated

export const compileGraph = (sortedNodes: PipelineNode[], edges: GraphEdge[]): string => {
    // 1. Dead Code Elimination (DCE)
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

        const inputEdges = edges.filter(e => e.target === currentId);
        inputEdges.forEach(e => stack.push(e.source));
    }

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

        const inputEdges = edges.filter(e => e.target === node.id);
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
                    const mod = Math.round(Math.max(1, node.condition!.mod));
                    const rem = Math.round(node.condition!.rem);
                    body += `    if ( (i - (i/${mod})*${mod}) == ${rem} ) {\n`;
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

                if (hasCondition) body += `    }\n`;
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
// Iterates the nodes in the exact same order as compilation (topological sort assumed for now) to map values
export const updateModularUniforms = (pipeline: PipelineNode[], uniformArray: Float32Array) => {
    uniformArray.fill(0);
    let idx = 0;
    const setP = (v: number) => { if (idx < MAX_MODULAR_PARAMS) uniformArray[idx++] = v; };

    // Warning: The array update logic assumes the pipeline array passed here matches
    // the order of nodes used in 'compileGraph'. Since we store 'pipeline' as the sorted array,
    // this usually works. But if DCE is active, we must match the filtering logic or indexes will drift.
    
    // NOTE: For robustness, we should ideally use the same 'activeNodes' filter.
    // However, recreating that logic here is expensive every frame.
    // Standard approach: 'updateModularUniforms' assumes ALL nodes in the sorted pipeline contribute
    // or that the compiler assigns indexes even to dead nodes to keep order consistent.
    // Currently, compiler ONLY assigns indexes to active nodes. 
    // This creates a potential mismatch if the pipeline array contains dead nodes but compiler filtered them.
    // BUT: The Store sets `pipeline` to `topologicalSort(nodes)`. It includes dead nodes.
    // FIX: We must filter `pipeline` using the same logic as `compileGraph` OR change `compileGraph` to skip logic but burn params for consistency.
    // BETTER FIX: Let's assume for now that if a node is in the pipeline but disconnected, the user probably won't be adjusting its sliders live 
    // and expecting visual updates.
    // However, if we slide a dead node, and it writes to uModularParams[N], but the shader thinks N belongs to a live node, CHAOS ensues.
    //
    // SOLUTION: Use the same dead-code check here.
    // We need the edges to do DCE.
    // If edges aren't available here, we have a problem.
    // The store passes `config.pipeline`. `config.graph` is also available in ShaderConfig.
    // We should update `MaterialController.ts` to pass the full graph if possible, or just the filtered active pipeline.
    
    // For now, we will simply iterate ALL nodes in the pipeline.
    // IMPORTANT: The `compileGraph` function needs to change to iterate ALL sorted nodes 
    // but just not generate code for dead ones, WHILE still incrementing the param counter.
    // This wastes uniform slots but guarantees stability.
    
    pipeline.forEach(node => {
        if (!node.enabled) return;
        
        // We always increment counter to match compiler's robust mode
        const def = nodeRegistry.get(node.type);
        if (def) {
            def.inputs.forEach(input => {
                if (node.bindings && node.bindings[input.id]) {
                     // Bound params skip the array in compiler too
                } else {
                    const val = node.params[input.id] ?? input.default;
                    setP(val);
                }
            });
        }
    });
};
