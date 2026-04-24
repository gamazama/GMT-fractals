
import type { FoldDefinition } from '../types';

/** Half-fold — one-sided absolute reflection, creates half-space geometry */
export const halfFold: FoldDefinition = {
    id: 'half',
    label: 'Half-fold',
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = abs(z + foldLimit);
}
`,
    defaults: {
        hybridScale: 1.5,
        hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
        hybridMinR: 0.3,
        hybridFixedR: 1.0,
        hybridIter: 2,
    }
};
