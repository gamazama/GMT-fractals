
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
 */
export const isStructureEqual = (a: PipelineNode[], b: PipelineNode[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const nA = a[i]; const nB = b[i];
        if (nA.id !== nB.id || nA.type !== nB.type || nA.enabled !== nB.enabled) return false; 
        const binA = nA.bindings || {}; const binB = nB.bindings || {};
        const keysA = Object.keys(binA).filter(k => binA[k] !== undefined);
        const keysB = Object.keys(binB).filter(k => binB[k] !== undefined);
        if (keysA.length !== keysB.length) return false;
        for (const k of keysA) { if (binA[k] !== binB[k]) return false; }
        const cA = nA.condition || { active: false, mod: 0, rem: 0 };
        const cB = nB.condition || { active: false, mod: 0, rem: 0 };
        if (cA.active !== cB.active) return false;
        if (cA.active && (cA.mod !== cB.mod || cA.rem !== cB.rem)) return false;
    }
    return true;
};

export const isPipelineEqual = (a: PipelineNode[], b: PipelineNode[]) => {
    if (a.length !== b.length) return false;
    return JSON.stringify(a) === JSON.stringify(b);
};
