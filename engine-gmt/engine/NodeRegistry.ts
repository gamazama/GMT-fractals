/**
 * @module engine-gmt/engine/NodeRegistry
 *
 * Singleton NodeRegistry mapping Modular-graph node id → NodeDefinition.
 *
 * The 25 node definitions are registered from `engine-gmt/data/nodes/definitions.ts`
 * (owned by g09-modular-graph, NOT this module). `engine-gmt/utils/GraphCompiler.ts`
 * performs a bare side-effect import of `'../data/nodes/definitions'` so any
 * compile path triggers registration.
 *
 * See ADR-0049 (two independent registries: FractalRegistry + NodeRegistry).
 */

import { NodeType } from '../types';

export interface NodeInput {
    id: string;      // Internal param name (e.g., 'x', 'scale')
    label: string;   // UI Label
    min: number;
    max: number;
    step: number;
    default: number;
    hardMin?: number;
    hardMax?: number;
}

export interface GLSLContext {
    varName: string;      // The variable name for this node (e.g., v_rot_1)
    in1: string;          // The variable name of Input A (e.g., v_start)
    in2: string;          // The variable name of Input B (for CSG)
    getParam: (key: string) => string; // Helper to get uniform or bound value
    indent: string;
}

export interface NodeDefinition {
    id: NodeType;
    label: string;
    category: 'Fractals' | 'Transforms' | 'Folds' | 'Primitives' | 'Combiners (CSG)' | 'Utils' | 'Distortion';
    description: string;
    inputs: NodeInput[];
    // Returns the GLSL code block for this operation
    glsl: (ctx: GLSLContext) => string;
}

class NodeRegistry {
    private nodes: Map<string, NodeDefinition> = new Map();

    public register(def: NodeDefinition) {
        this.nodes.set(def.id, def);
    }

    public get(id: string): NodeDefinition | undefined {
        return this.nodes.get(id);
    }

    public getAll(): NodeDefinition[] {
        return Array.from(this.nodes.values());
    }

    public getGrouped(): Record<string, string[]> {
        const groups: Record<string, string[]> = {};
        this.nodes.forEach(def => {
            if (!groups[def.category]) groups[def.category] = [];
            groups[def.category].push(def.id);
        });
        return groups;
    }
}

export const nodeRegistry = new NodeRegistry();
