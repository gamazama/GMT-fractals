
import { FractalDefinition, FormulaType } from '../types';

class FractalRegistry {
    private definitions: Map<string, FractalDefinition> = new Map();

    public register(def: FractalDefinition) {
        this.definitions.set(def.id, def);
    }

    public registerAlias(alias: string, targetId: string) {
        const def = this.definitions.get(targetId);
        if (def) {
            this.definitions.set(alias, def);
        } else {
            console.warn(`FractalRegistry: Cannot register alias '${alias}' for unknown target '${targetId}'`);
        }
    }

    public get(id: string): FractalDefinition | undefined {
        return this.definitions.get(id);
    }

    public getAll(): FractalDefinition[] {
        // Return unique values (deduplicate aliases)
        return Array.from(new Set(this.definitions.values()));
    }

    public getIds(): FormulaType[] {
        return Array.from(this.definitions.keys()) as FormulaType[];
    }
}

export const registry = new FractalRegistry();
