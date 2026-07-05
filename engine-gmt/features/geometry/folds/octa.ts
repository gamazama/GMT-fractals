
import type { FoldDefinition } from '../types';

/** Octahedral fold — Knighty's KIFS, 4-reflection octahedral symmetry.
 *  Matches MB3D's OctahedronIFS structure: fold, then the IFS step
 *  `z·scale − offset·(scale−1)` (scale about the offset vertex — an
 *  octahedron vertex (1,0,0) by default).
 *  selfContained: no sphereFold / outer scale — pure KIFS, like MB3D. */
export const octaFold: FoldDefinition = {
    id: 'octa',
    label: 'Octahedral (KIFS)',
    foldType: 6,
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.x - z.y < 0.0) z.xy = z.yx;
    if (z.x - z.z < 0.0) z.xz = z.zx;
    float scale = uHybridScale;
    z = z * scale - uHybridKifsOffset * (scale - 1.0);
    dr *= abs(scale);
}
`,
    selfContained: true,
    defaults: {
        hybridScale: 2.0,
        hybridIter: 4,
        hybridKifsOffset: { x: 1, y: 0, z: 0 },
    }
};
