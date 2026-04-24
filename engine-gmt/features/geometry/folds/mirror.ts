
import type { FoldDefinition } from '../types';

/** Symmetric mirror fold — double-reflection, creates crystalline structures */
export const mirrorFold: FoldDefinition = {
    id: 'mirror',
    label: 'Mirror',
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = foldLimit - abs(abs(z) - foldLimit);
}
`,
    defaults: {
        hybridScale: 2.0,
        hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
        hybridMinR: 0.5,
        hybridFixedR: 1.0,
        hybridIter: 3,
    }
};
