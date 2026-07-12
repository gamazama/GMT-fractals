/**
 * Native + imported-frag/DEC slot SOURCES for the Weave Editor picker (ADR-0089
 * P4.3). Staging is engine-driven (P3 decision #2 — the picker lists what the
 * engine can weave), so this module owns:
 *
 *  - {@link nativeSlotReject} — the pure predicate mirroring
 *    {@link resolveNativeSlot}'s engine-side capability rejects
 *    (`shape:self-contained` / `shape:modular`). The picker greys EXACTLY what
 *    the resolver would reject; `test:mb3d:weave` asserts the two stay in sync
 *    (reject-greying set == `resolveNativeSlot(...).ok === false`).
 *  - {@link nativeSlotShell} — the plain addon-slot shell a native/imported
 *    formula loads as (`formulaIndex: NATIVE_FORMULA_INDEX`, `name` = the
 *    registered formula id). The whole build path (buildWeaveScene →
 *    loadUserWeave → emitFusedHybrid → nativeResolver) already accepts these.
 *  - {@link getNativeSlotCatalog} — registered native formulas grouped by the
 *    unified FormulaPicker's category map, plus an "Imported" group for
 *    registered frag/DEC (importSource) and unclassified natives.
 *
 * SCOPE (v1, confirmed with the owner 2026-07-04): only REGISTERED formulas are
 * weavable, so the raw 438-thumbnail catalog is NOT surfaced here — a user
 * imports a catalog frag through the Workshop first, then it appears under
 * "Imported". Frag/DEC imports resolve through the SAME native resolver (kind
 * stays `'native'`), self-limiting to global/tracker shapes (design doc §1.3).
 *
 * @see docs/adr/0089-weave-core-unification.md
 * @see engine-gmt/engine/weave/nativeResolver.ts (the enforcement this mirrors)
 */
import { registry } from '../../engine/FractalRegistry';
import type { FractalDefinition } from '../../types/fractal';
import type { MB3DFormulaSlot } from '../../utils/mb3d/parseMB3D';
import { NATIVE_CATEGORIES, FORMULA_TO_CATEGORY } from '../../components/FormulaPicker/pickerCategories';
import { NATIVE_FORMULA_INDEX } from './nativeResolver';

export interface NativeSlotEntry {
    /** Registered formula id (= `def.id`, the native slot's `name`/`ref`). */
    id: string;
    /** Display label. */
    label: string;
    /** Reject reason when this formula can't be a weave slot (greyed, with a
     *  hover tooltip). Undefined = weavable. */
    disabledReason?: string;
}

export interface NativeSlotGroup {
    category: string;
    entries: NativeSlotEntry[];
}

/**
 * Mirror of {@link resolveNativeSlot}'s capability rejects. Registration is not
 * checked here (the catalog only lists registered defs), so this is caps-only —
 * kept byte-for-byte aligned with the resolver's reject branch. The interlace
 * secondary picker greys the same two caps (`InterlaceSecondaryPicker.tsx`).
 */
export function nativeSlotReject(def: FractalDefinition): string | undefined {
    const caps = def.shader.capabilities;
    if (caps?.has('shape:self-contained'))
        return 'Self-contained formula — owns its full iteration loop, so it can’t run as a weave slot.';
    if (caps?.has('shape:modular') || def.id === 'Modular')
        return 'Modular graph formula — not weavable as a slot yet.';
    return undefined;
}

/** The addon-slot shell a native/imported formula loads as: a plain weave slot
 *  whose `formulaIndex` is the native sentinel and whose `name` is the
 *  registered formula id (P4.1). No MB3D options — the resolver auto-exposes the
 *  formula's declared parameters onto the shared lane budget. */
export function nativeSlotShell(id: string, iterCount = 2): MB3DFormulaSlot {
    return {
        iterCount,
        formulaIndex: NATIVE_FORMULA_INDEX,
        name: id,
        optionCount: 0,
        optionTypes: [],
        optionValues: [],
    };
}

/** True for a weave row backed by a native/imported formula (vs an MB3D slot). */
export const isNativeSlot = (slot: { formulaIndex: number }): boolean =>
    slot.formulaIndex === NATIVE_FORMULA_INDEX;

/**
 * Registered native + imported formulas, grouped for the weave picker. Native
 * categories follow the unified FormulaPicker's canonical one-formula-one-bucket
 * map; registered frag/DEC imports (importSource) and any unclassified natives
 * fall into a trailing "Imported" group (the picker's Custom semantics).
 */
export function getNativeSlotCatalog(): NativeSlotGroup[] {
    const all = registry.getAll();
    const byId = new Map(all.map((d) => [d.id, d] as const));
    const groups: NativeSlotGroup[] = [];
    const placed = new Set<string>();

    for (const cat of NATIVE_CATEGORIES) {
        const entries: NativeSlotEntry[] = [];
        for (const fid of cat.items) {
            const def = byId.get(fid);
            if (!def) continue;
            placed.add(def.id);
            entries.push({ id: def.id, label: def.name ?? def.id, disabledReason: nativeSlotReject(def) });
        }
        if (entries.length) groups.push({ category: cat.name, entries });
    }

    // Imported (registered frag/DEC) + unclassified natives — the picker's Custom
    // bucket. `importSource` marks a Workshop-imported formula; an unclassified
    // native means we forgot to add it to a category (still weavable).
    const imported: NativeSlotEntry[] = [];
    for (const def of all) {
        if (def.id === 'Modular' || placed.has(def.id)) continue;
        if (def.importSource || !FORMULA_TO_CATEGORY.has(def.id)) {
            imported.push({ id: def.id, label: def.name ?? def.id, disabledReason: nativeSlotReject(def) });
        }
    }
    if (imported.length) {
        imported.sort((a, b) => a.label.localeCompare(b.label));
        groups.push({ category: 'Imported', entries: imported });
    }
    return groups;
}
