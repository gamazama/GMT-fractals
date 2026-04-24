
import type { FoldDefinition } from '../types';

/** Tglad box fold — the classic mandelbox fold (clamp-reflect) */
export const standardFold: FoldDefinition = {
    id: 'standard',
    label: 'Standard (Tglad)',
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}
`,
    defaults: {
        hybridScale: 2.0,
        hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
        hybridMinR: 0.5,
        hybridFixedR: 1.0,
        hybridIter: 2,
    }
};
