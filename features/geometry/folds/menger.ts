
import type { FoldDefinition } from '../types';

/** Menger/cubic fold — abs + axis sort, creates Menger sponge symmetry */
export const mengerFold: FoldDefinition = {
    id: 'menger',
    label: 'Menger (Cubic)',
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Full 48-fold octahedral symmetry via abs + sort
    z = abs(z);
    if (z.x - z.y < 0.0) z.xy = z.yx;
    if (z.x - z.z < 0.0) z.xz = z.zx;
    if (z.y - z.z < 0.0) z.yz = z.zy;
}
`,
    defaults: {
        hybridScale: 3.0,
        hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
        hybridMinR: 0.5,
        hybridFixedR: 1.0,
        hybridIter: 3,
    }
};
