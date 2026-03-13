
import type { FoldDefinition } from '../types';
import { standardFold } from './standard';
import { mirrorFold } from './mirror';
import { halfFold } from './half';
import { decoupledFold } from './decoupled';
import { kaliFold } from './kali';
import { tetraFold } from './tetra';
import { octaFold } from './octa';
import { icosaFold } from './icosa';
import { mengerFold } from './menger';

/** Ordered list of fold types — index maps to hybridFoldType param value */
export const FOLD_LIST: FoldDefinition[] = [
    standardFold,   // 0
    mirrorFold,     // 1
    halfFold,       // 2
    decoupledFold,  // 3
    kaliFold,       // 4
    tetraFold,      // 5
    octaFold,       // 6
    icosaFold,      // 7
    mengerFold,     // 8
];

/** Dropdown options for the fold type selector */
export const FOLD_OPTIONS = FOLD_LIST.map((f, i) => ({
    label: f.label,
    value: i as number,
}));

/** Look up a fold by index (defaults to standard) */
export function getFold(index: number): FoldDefinition {
    return FOLD_LIST[index] ?? FOLD_LIST[0];
}
