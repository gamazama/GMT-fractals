
import type { FoldDefinition } from '../types';

/** Octahedral fold — Knighty's KIFS, 4-reflection octahedral symmetry */
export const octaFold: FoldDefinition = {
    id: 'octa',
    label: 'Octahedral (KIFS)',
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Knighty's octahedral fold — diagonal plane reflections + axis sorting
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.x - z.y < 0.0) z.xy = z.yx;
    if (z.x - z.z < 0.0) z.xz = z.zx;
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
