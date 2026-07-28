
import { FractalGraph, PipelineNode, GraphNode } from '../types';

/**
 * Checks if adding an edge would create a cycle in the graph.
 */
export const hasCycle = (nodes: GraphNode[], edges: {source: string, target: string}[]): boolean => {
    const adj: Record<string, string[]> = {};
    nodes.forEach(n => adj[n.id] = []);
    edges.forEach(e => {
        if (adj[e.source]) adj[e.source].push(e.target);
    });

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const isCyclic = (nodeId: string): boolean => {
        if (!visited.has(nodeId)) {
            visited.add(nodeId);
            recStack.add(nodeId);

            const neighbors = adj[nodeId] || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor) && isCyclic(neighbor)) return true;
                if (recStack.has(neighbor)) return true;
            }
        }
        recStack.delete(nodeId);
        return false;
    };

    for (const node of nodes) {
        if (isCyclic(node.id)) return true;
    }
    return false;
};

/**
 * Sorts graph nodes topologically.
 * Used to convert a Graph into a Linear Pipeline for the legacy shader engine.
 *
 * @invariant Does NOT detect cycles — passing a cyclic graph yields a partial
 * pipeline (nodes inside the cycle drop out because their in-degree never
 * reaches 0).
 * @invariant The `hasCycle()` guard is applied by the UI, NOT the store:
 * `hasCycle` has exactly one caller, `FlowEditor`'s `onConnect`
 * (`components/panels/flow/FlowEditor.tsx`), which rejects the connection and
 * logs "Cycle detected!". `modularSlice.setGraph` / `refreshPipeline` never
 * call it, so any non-`onConnect` path into the store — scene load,
 * `setPipeline`, programmatic `setGraph` — can seat a cyclic graph, and the
 * only symptom is silently missing nodes.
 * @invariant Tie-break is alphabetical (`queue.sort()` each pop), so compile
 * order is deterministic across runs.
 * @invariant `nodes.find(n => n.id === u)` inside the loop is O(N²);
 * acceptable at current preset counts (< ~50 nodes).
 */
export const topologicalSort = (nodes: GraphNode[], edges: {source: string, target: string}[]): PipelineNode[] => {
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    
    nodes.forEach(n => {
        adj[n.id] = [];
        inDegree[n.id] = 0;
    });
    
    edges.forEach(e => {
        if (adj[e.source]) {
            adj[e.source].push(e.target);
            inDegree[e.target] = (inDegree[e.target] || 0) + 1;
        }
    });

    // Queue for nodes with no incoming edges
    const queue: string[] = [];
    nodes.forEach(n => {
        if (inDegree[n.id] === 0) queue.push(n.id);
    });

    const result: PipelineNode[] = [];
    
    while (queue.length > 0) {
        // Sort queue by Node ID to ensure Deterministic Compilation.
        queue.sort();

        const u = queue.shift()!;
        const node = nodes.find(n => n.id === u);
        if (node) {
            // Convert GraphNode back to PipelineNode (strip position)
            const { position, ...rest } = node;
            result.push(rest);
        }

        if (adj[u]) {
            for (const v of adj[u]) {
                inDegree[v]--;
                if (inDegree[v] === 0) queue.push(v);
            }
        }
    }

    return result;
};

// --- Helpers Migrated from Store ---

/**
 * Converts a linear pipeline array into a visual node graph structure.
 * Assigns default vertical positions.
 */
export const pipelineToGraph = (pipeline: PipelineNode[]): FractalGraph => {
    const nodes = pipeline.map((p, i) => ({
        ...p,
        position: { x: 250, y: 150 + i * 200 }
    }));
    const edges = [];
    if (nodes.length > 0) {
        edges.push({ id: `e-root-start-${nodes[0].id}`, source: 'root-start', target: nodes[0].id });
        for(let i=0; i<nodes.length-1; i++) {
            edges.push({ id: `e-${nodes[i].id}-${nodes[i+1].id}`, source: nodes[i].id, target: nodes[i+1].id });
        }
        edges.push({ id: `e-${nodes[nodes.length-1].id}-root-end`, source: nodes[nodes.length-1].id, target: 'root-end' });
    }
    return { nodes, edges };
};

/**
 * Deep equality check for Pipeline structure.
 * Ignores visual positions, checks only logic impacting the shader.
 *
 * @invariant Recompile-trigger diff. Compares id/type/enabled,
 * `JSON.stringify(bindings ?? {})`, and `condition.active`. `condition.mod` /
 * `condition.rem` and `node.params` values are deliberately excluded so
 * retuning sliders does NOT trigger a recompile.
 * @invariant Two semantically equivalent `bindings` objects whose keys were
 * inserted in different orders compare unequal and spuriously recompile
 * (`JSON.stringify` is order-sensitive).
 *
 * @bug PRODUCTION: this diff is EDGE-BLIND, but the emitted GLSL is not.
 * `PipelineNode` carries no wiring (`types/graph.ts`), so any edge-only edit
 * that leaves the topological order intact compares equal here — and
 * `modularSlice.setGraph` uses `isStructureEqual` as its sole recompile
 * trigger, so it falls through to the bare `set({ graph: g })` branch: no
 * `pipelineRevision` bump, no `FRACTAL_EVENTS.CONFIG` emit, stale shader.
 * Verified on a two-node chain (IFSScale → AddConstant → root-end): deleting
 * the `root-end` edge leaves `isStructureEqual` AND `isPipelineEqual` both
 * true while `compileGraph` output flips to the empty-active-set identity
 * body. Same class: swapping which upstream node feeds a CSG node's `a` vs
 * `b` handle. The user has to press COMPILE (`refreshPipeline`) by hand;
 * with autoCompile ON the edit looks like it did nothing. Fixing it means
 * folding an edge fingerprint (id/source/target/targetHandle, sorted) into
 * the structural diff — which needs the edges passed in, so it is a
 * signature change on this function and its `setGraph` caller.
 */
export const isStructureEqual = (a: PipelineNode[], b: PipelineNode[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const nA = a[i]; const nB = b[i];
        if (nA.id !== nB.id || nA.type !== nB.type || nA.enabled !== nB.enabled) return false; 
        if (JSON.stringify(nA.bindings ?? {}) !== JSON.stringify(nB.bindings ?? {})) return false;
        // Only condition.active is structural (changes GLSL control flow).
        // mod/rem are runtime uniforms — changing them triggers a param update, not recompile.
        const activeA = nA.condition?.active ?? false;
        const activeB = nB.condition?.active ?? false;
        if (activeA !== activeB) return false;
    }
    return true;
};

export const isPipelineEqual = (a: PipelineNode[], b: PipelineNode[]) => {
    if (a.length !== b.length) return false;
    return JSON.stringify(a) === JSON.stringify(b);
};
