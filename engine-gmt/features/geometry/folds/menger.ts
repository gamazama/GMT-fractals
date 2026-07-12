
import type { FoldDefinition } from '../types';

/** Menger/cubic fold — abs + axis sort + scale-coupled offset (full Menger IFS step).
 *  selfContained: the fold handles scaling, offset, and DR internally,
 *  so formula_Hybrid skips sphereFold and the outer scale step. */
export const mengerFold: FoldDefinition = {
    id: 'menger',
    label: 'Menger (Cubic)',
    foldType: 8,
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // 1. 48-fold octahedral symmetry: abs + branchless descending sort
    z = abs(z);
    vec3 s = z;
    z.x = max(max(s.x, s.y), s.z);
    z.z = min(min(s.x, s.y), s.z);
    z.y = s.x + s.y + s.z - z.x - z.z;

    // 2. Scale + Offset (IFS step): z = Scale*z - Offset*(Scale-1)
    float scale = uHybridScale;
    vec3 shift = uHybridMengerOffset * (scale - 1.0);
    z = z * scale - shift;

    // 3. Center-Z conditional fold (restores full cubic symmetry)
    if (uHybridMengerCenterZ > 0.5) {
        z.z += shift.z * step(z.z, -0.5 * shift.z);
    }

    // 4. Derivative (chain rule for uniform scale)
    dr *= abs(scale);
}
`,
    selfContained: true,
    defaults: {
        hybridScale: 3.0,
        hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
        hybridMinR: 0.5,
        hybridFixedR: 1.0,
        hybridIter: 3,
        hybridMengerOffset: { x: 1, y: 1, z: 1 },
        hybridMengerCenterZ: true,
    }
};
