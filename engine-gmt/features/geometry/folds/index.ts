
import type { FoldDefinition } from '../types';
import { standardFold } from './standard';
import { mirrorFold } from './mirror';
import { kaliFold } from './kali';
import { tetraFold } from './tetra';
import { octaFold } from './octa';
import { icosaFold } from './icosa';
import { mengerFold } from './menger';

/** The available fold types. Identity is each fold's STABLE `foldType` code
 *  (the persisted legacy `hybridFoldType` value) — NOT list position. Codes
 *  2 (half) and 3 (decoupled) are retired (2026-07-05): half was an invented
 *  fold with an embedded per-iteration drift; decoupled was numerically
 *  identical to standard at its default Folding Value = 2·Fold Limit. */
export const FOLD_LIST: FoldDefinition[] = [
    standardFold,   // foldType 0
    mirrorFold,     // foldType 1
    kaliFold,       // foldType 4
    tetraFold,      // foldType 5
    octaFold,       // foldType 6
    icosaFold,      // foldType 7
    mengerFold,     // foldType 8
];

/** Dropdown options for the fold type selector — value is the stable code. */
export const FOLD_OPTIONS = FOLD_LIST.map((f) => ({
    label: f.label,
    value: f.foldType,
}));
