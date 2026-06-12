/**
 * Category map for the unified <FormulaPicker>.
 *
 * Distinct from engine-gmt/formulas/categories.ts (which the old PortalDropdown
 * uses) — that map has overlapping groups (a formula can appear in "Featured"
 * AND in its taxonomy group). The picker design requires each formula to
 * belong to exactly one native group, so this file owns the canonical
 * one-formula-one-bucket mapping.
 *
 * Any formula not listed here falls into the "Custom" group at runtime — that
 * covers Workshop-imported formulas (importSource set) and any future native
 * we forget to classify.
 *
 * @see dev/plans/formula-picker-design.md
 */

import type { FormulaType } from '../../types';

export interface PickerCategory {
    /** Stable id for keyboard nav + state. */
    id: string;
    /** Display name. */
    name: string;
    /** Formula ids in the picker's native category map (matches `def.id`). */
    items: FormulaType[];
}

export const NATIVE_CATEGORIES: PickerCategory[] = [
    {
        id: 'power',
        name: 'Power Fractals',
        items: [
            'Mandelbulb', 'Mandelbar3D', 'Mandelorus', 'Buffalo', 'Phoenix',
            'BoxBulb', 'MakinBrot', 'Quaternion', 'Bristorbrot', 'Tetrabrot',
            'JuliaMorph', 'MandelTerrain', 'MandelMap', 'MandelBolic', 'Claude',
        ],
    },
    {
        id: 'boxfolds',
        name: 'Box & Folds',
        items: ['AmazingBox', 'AmazingSurf', 'AmazingSurface', 'KaliBox', 'MarbleMarcher'],
    },
    {
        id: 'menger',
        name: 'Menger & IFS',
        items: ['MengerSponge', 'MengerAdvanced', 'MixPinski', 'SierpinskiTetrahedron'],
    },
    {
        id: 'polyhedra',
        name: 'Polyhedra',
        items: [
            'Octahedron', 'Dodecahedron', 'Icosahedron', 'Cuboctahedron',
            'TruncatedIcosahedron', 'RhombicDodecahedron', 'RhombicTriacontahedron',
            'GreatStellatedDodecahedron', 'Coxeter',
        ],
    },
    {
        id: 'kleinian',
        name: 'Kleinian / Apollonian',
        items: [
            'Kleinian', 'KleinianJos', 'KleinianMobius',
            'PseudoKleinian', 'PseudoKleinian06', 'PseudoKleinianMod4',
            'Apollonian',
        ],
    },
    {
        id: 'hybrids',
        name: 'Hybrids & Experimental',
        items: ['Borromean', 'Appell', 'SineJulia3D', 'Julia3D'],
    },
];

/** Reverse lookup: formula id → category id. */
export const FORMULA_TO_CATEGORY: Map<string, string> = new Map(
    NATIVE_CATEGORIES.flatMap(c => c.items.map(id => [id as string, c.id] as const)),
);

/** Special launcher ids. Sidebar gets these as their own buttons. */
export type SpecialEntry = 'modular' | 'workshop';

/** Stable references — passing array literals as props would defeat the
 *  picker's category-list memoization on every parent render. */
export const DEFAULT_SPECIAL_ENTRIES: SpecialEntry[] = ['modular', 'workshop'];
export const NO_SPECIAL_ENTRIES: SpecialEntry[] = [];
