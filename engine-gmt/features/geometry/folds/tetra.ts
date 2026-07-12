
import type { FoldDefinition } from '../types';

/** Tetrahedral fold — Knighty's KIFS, sierpinski-tetrahedron symmetry.
 *  Matches MB3D's Sierpinski3 structure: fold, then the IFS step
 *  `z·scale − offset·(scale−1)` (scale about the offset corner).
 *  selfContained: no sphereFold / outer scale — pure KIFS, like MB3D. */
export const tetraFold: FoldDefinition = {
    id: 'tetra',
    label: 'Tetrahedral (KIFS)',
    foldType: 5,
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.y + z.z < 0.0) z.yz = -z.zy;
    float scale = uHybridScale;
    z = z * scale - uHybridKifsOffset * (scale - 1.0);
    dr *= abs(scale);
}
`,
    selfContained: true,
    defaults: {
        hybridScale: 2.0,
        hybridIter: 4,
        hybridKifsOffset: { x: 1, y: 1, z: 1 },
    }
};
