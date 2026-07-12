
import type { FoldDefinition } from '../types';

/**
 * Icosahedral fold — ported from MB3D's IcosahedronIFS (x87 decompile,
 * utils/mb3d/decompiled-formulas.ts): full abs, then 3× (reflect across the
 * icosahedral mirror plane N = (1/(2φ), −1/2, −φ/2) when dot < 0, re-abs yz),
 * then the IFS step `z·scale − offset·(scale−1)`. Default offset is the
 * icosahedron vertex (0.8507, 0.5257, 0), which lies ON the mirror plane
 * (dot = 0) — a fixed point of the fold, as KIFS scaling centers should be.
 * selfContained: no sphereFold / outer scale — pure KIFS, like MB3D.
 */
export const icosaFold: FoldDefinition = {
    id: 'icosa',
    label: 'Icosahedral (KIFS)',
    foldType: 7,
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    const vec3 N = vec3(0.309016994374947, -0.5, -0.809016994374947);
    z = abs(z);
    float t;
    t = dot(z, N); if (t < 0.0) z -= 2.0 * t * N;
    z.yz = abs(z.yz);
    t = dot(z, N); if (t < 0.0) z -= 2.0 * t * N;
    z.yz = abs(z.yz);
    t = dot(z, N); if (t < 0.0) z -= 2.0 * t * N;
    z.yz = abs(z.yz);
    float scale = uHybridScale;
    z = z * scale - uHybridKifsOffset * (scale - 1.0);
    dr *= abs(scale);
}
`,
    selfContained: true,
    defaults: {
        hybridScale: 2.0,
        hybridIter: 4,
        hybridKifsOffset: { x: 0.8507, y: 0.5257, z: 0 },
    }
};
