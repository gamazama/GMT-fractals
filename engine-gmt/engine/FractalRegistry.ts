/**
 * @module engine-gmt/engine/FractalRegistry
 *
 * Singleton FractalRegistry mapping formula id → FractalDefinition.
 *
 * There is NO single registration site. In boot order:
 *  1. `engine-gmt/formulas/index.ts` registers one def per entry in its
 *     `formulas` array (47 at time of writing) + 5 legacy aliases, as a
 *     module-import side effect.
 *  2. `registerBoxFoldFormulas()` (`engine-gmt/formulas/boxFolds.ts`, called
 *     from `registerFeatures()`, NOT from the barrel) adds one `BoxFold*` def
 *     per `FOLD_LIST` entry — 7 today.
 *  3. Runtime registrations keep arriving after boot: Workshop V3/V4 import
 *     (`features/fragmentarium_import/FormulaWorkshop.tsx`), pasted formula
 *     (`components/panels/formula/loadPastedFormula.ts`), MB3D scene load
 *     (`utils/mb3d/loadMB3DScene.ts`), weave migration
 *     (`utils/weaveMigration.ts`), shared-scene open (`gallery/openSharedScene.ts`)
 *     and the worker's `REGISTER_FORMULA` handler (`engine/worker/renderWorker.ts`).
 *
 * Do not hard-code a total here — `npm run test:compat` iterates the live
 * registry and prints it ("structural checks: N formulas OK").
 *
 * Importers MUST import `engine-gmt/formulas/index.ts` (directly or
 * transitively) BEFORE calling `registry.get` / `getAll` / `getIds`, or they
 * will see an empty registry; node harnesses that need the BoxFold defs must
 * also call `registerFeatures()` (or `registerBoxFoldFormulas()` directly).
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
                `docs/history/gmt/35_Capability_Protocol.md.`,
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
     * check, and the returned array routinely contains strings that are NOT
     * members of `FormulaType`:
     *  - the 5 alias IDs (`UberMenger`, `FoldingBrot`, `HyperTorus`,
     *    `HyperbolicMandelbrot`, `RhombicIcosahedron`);
     *  - the 7 `BoxFold*` IDs registered by `registerBoxFoldFormulas()`
     *    (`BoxFoldStandard`, `BoxFoldMirror`, `BoxFoldKali`, `BoxFoldTetra`,
     *    `BoxFoldOcta`, `BoxFoldIcosa`, `BoxFoldMenger`) — these are weave-slot
     *    defs, deliberately absent from the user-facing union;
     *  - every id registered at runtime (Workshop imports, `frag_workshop_preview`,
     *    MB3D-loaded scenes, pasted formulas).
     * The cast hides all of it. Callers that need only the built-in native
     * formulas must filter, not trust the type. See ADR-0048 and followup q-102.
     */
    public getIds(): FormulaType[] {
        return Array.from(this.definitions.keys()) as FormulaType[];
    }
}

export const registry = new FractalRegistry();
