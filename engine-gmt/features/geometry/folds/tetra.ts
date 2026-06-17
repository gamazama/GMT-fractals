
import type { FoldDefinition } from '../types';

/** Tetrahedral fold — Knighty's KIFS, creates sierpinski-like symmetry */
export const tetraFold: FoldDefinition = {
    id: 'tetra',
    label: 'Tetrahedral (KIFS)',
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.y + z.z < 0.0) z.yz = -z.zy;
}
`,
    defaults: {
        hybridScale: 2.0,
        hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
        hybridMinR: 0.25,
        hybridFixedR: 1.0,
        hybridIter: 3,
    }
};
