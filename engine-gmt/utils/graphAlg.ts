
import { FractalGraph, PipelineNode, GraphNode, GraphEdge } from '../types';

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
 * @assumption Does NOT detect cycles — passing a cyclic graph yields a partial
 * pipeline (nodes inside the cycle drop out because their in-degree never
 * reaches 0).
 * @assumption The `hasCycle()` guard is applied by the UI, NOT the store:
 * `hasCycle` has exactly one caller, `FlowEditor`'s `onConnect`
 * (`components/panels/flow/FlowEditor.tsx`), which rejects the connection and
 * logs "Cycle detected!". `modularSlice.setGraph` / `refreshPipeline` never
 * call it, so any non-`onConnect` path into the store — scene load,
 * `setPipeline`, programmatic `setGraph` — can seat a cyclic graph, and the
 * only symptom is silently missing nodes.
 * @assumption Tie-break is alphabetical (`queue.sort()` each pop), so compile
 * order is deterministic across runs.
 * @assumption `nodes.find(n => n.id === u)` inside the loop is O(N²);
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
 * Structural fingerprint of a graph — everything that changes the EMITTED
 * GLSL and nothing that does not. Two graphs with equal keys compile to the
 * same shader; a differing key means the compiled shader is stale.
 *
 * Nodes contribute id / type / enabled / bindings (keys sorted, so insertion
 * order cannot cause a spurious mismatch) / `condition.active`. `node.params`
 * and `condition.mod` / `condition.rem` are deliberately excluded: they are
 * runtime uniforms, and retuning a slider must NOT read as a structural edit.
 * Edges contribute source / target / targetHandle (sorted, ids dropped — an
 * edge id is a visual handle). `compileGraph` derives DCE liveness and every
 * node's `in1` / `in2` from the edges, so an edge-only edit that leaves the
 * topological order intact still changes the GLSL; until 2026-09-02 the
 * structural diff (`isStructureEqual`, now deleted) compared nodes only and
 * could not see that — a deleted output edge or a swapped CSG a/b feed left
 * the shader stale with no signal.
 *
 * @invariant An edge-only change (delete, or swap a CSG node's `a`/`b` feed)
 *   or a bindings value change flips the key; a params-only change, an edge
 *   id rename or a bindings key-order change does not.
 *   — proven by: npm run test:modular-parity (block 4: "structureKey: edge-only
 *   change flips the key", "params-only change keeps it", "edge ids are
 *   irrelevant", "bindings key order is irrelevant").
 */
export const structureKey = (nodes: PipelineNode[], edges: GraphEdge[]): string => {
    const nodePart = nodes.map(n => {
        const b: Record<string, string | undefined> = n.bindings ?? {};
        const bindings = Object.keys(b).sort().map(k => k + '=' + (b[k] ?? '')).join(',');
        return [n.id, n.type, n.enabled ? 1 : 0, bindings, n.condition?.active ? 1 : 0].join('|');
    }).join(';');
    const edgePart = edges
        .map(e => e.source + '>' + e.target + ':' + (e.targetHandle ?? 'a'))
        .sort()
        .join(';');
    return nodePart + '#' + edgePart;
};

export const isPipelineEqual = (a: PipelineNode[], b: PipelineNode[]) => {
    if (a.length !== b.length) return false;
    return JSON.stringify(a) === JSON.stringify(b);
};
