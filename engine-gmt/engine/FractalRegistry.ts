/**
 * @module engine-gmt/engine/FractalRegistry
 *
 * Singleton FractalRegistry mapping formula id → FractalDefinition.
 *
 * Registration is side-effectful at `engine-gmt/formulas/index.ts` module-import
 * time (42 formulas + 5 legacy aliases). Importers MUST import
 * `engine-gmt/formulas/index.ts` (directly or transitively) BEFORE calling
 * `registry.get` / `getAll` / `getIds`, or they will see an empty registry.
 *
 * See ADR-0048 (FormulaType vs registry drift), ADR-0049 (two independent
 * registries: FractalRegistry + NodeRegistry).
 */

import { FractalDefinition, FormulaType } from '../types';

class FractalRegistry {
    private definitions: Map<string, FractalDefinition> = new Map();

    /**
     * Register a formula definition by `def.id`.
     *
     * @invariant No membership check — replacement is silent. Re-registering
     * the same id silently overwrites the prior definition.
     * @invariant `def.shader.capabilities` MUST be declared by the producer.
     * P8 of the capability protocol removed the `deriveLegacy` shim that
     * previously auto-populated this from legacy `shader.*` flags. Producers:
     * - Native formulas: declare explicitly (see engine-gmt/formulas/*.ts).
     * - V3/V4 Workshop imports: emit via deriveImportCapabilities (see
     *   engine-gmt/features/fragmentarium_import/import-capabilities.ts).
     * - GMF round-trip: parseGMF restores from shaderMeta or derives inline
     *   for legacy files (see engine-gmt/utils/FormulaFormat.ts).
     */
    public register(def: FractalDefinition) {
        if (!def.shader.capabilities) {
            throw new Error(
                `FractalRegistry.register: formula '${def.id}' is missing ` +
                `shader.capabilities. Declare via ` +
                `new Set([...] satisfies Capability[]). See ` +
                `dev/docs/gmt/35_Capability_Protocol.md.`,
            );
        }
        this.definitions.set(def.id, def);
    }

    /**
     * Point an alias key at an already-registered definition.
     *
     * @invariant Silently no-ops on unknown target (logs `console.warn`).
     * Order of alias declarations matters — `engine-gmt/formulas/index.ts`
     * declares all five legacy aliases AFTER `formulas.forEach(register)` so
     * they always resolve. The alias is stored as the SAME `FractalDefinition`
     * reference under a second key (identity comparison works; `getAll()`
     * dedupes via `Set`).
     */
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

    /**
     * @invariant Deduplicates aliases via `Array.from(new Set(values()))` —
     * consumers iterating over `getAll()` see each definition exactly once
     * even when multiple keys point at it.
     */
    public getAll(): FractalDefinition[] {
        // Return unique values (deduplicate aliases)
        return Array.from(new Set(this.definitions.values()));
    }

    /**
     * @invariant Widens `Map.keys()` to `FormulaType[]` via cast — NO runtime
     * check. The 5 alias IDs (`UberMenger`, `FoldingBrot`, `HyperTorus`,
     * `HyperbolicMandelbrot`, `RhombicIcosahedron`) are registered but missing
     * from the `FormulaType` union; the cast hides the drift. See ADR-0048
     * and followup q-102.
     */
    public getIds(): FormulaType[] {
        return Array.from(this.definitions.keys()) as FormulaType[];
    }
}

export const registry = new FractalRegistry();
