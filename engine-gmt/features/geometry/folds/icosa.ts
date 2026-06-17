
import type { FoldDefinition } from '../types';

/**
 * Icosahedral fold — Knighty's KIFS using golden ratio plane normals.
 * Creates dodecahedral/icosahedral symmetry.
 * Reference: Fragmentarium Icosahedron.frag (Syntopia/Knighty)
 */
export const icosaFold: FoldDefinition = {
    id: 'icosa',
    label: 'Icosahedral (KIFS)',
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Knighty's icosahedral fold — golden ratio plane normals
    const float PHI = 1.618033988749895;
    const vec3 n1 = normalize(vec3(-PHI, PHI - 1.0, 1.0));
    const vec3 n2 = normalize(vec3(1.0, -PHI, PHI + 1.0));
    const vec3 n3 = vec3(0.0, 0.0, -1.0);

    z = abs(z);
    float t;
    t = dot(z, n1); if (t > 0.0) z -= 2.0 * t * n1;
    t = dot(z, n2); if (t > 0.0) z -= 2.0 * t * n2;
    t = dot(z, n3); if (t > 0.0) z -= 2.0 * t * n3;
    t = dot(z, n2); if (t > 0.0) z -= 2.0 * t * n2;
}
`,
    defaults: {
        hybridScale: 2.0,
        hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
        hybridMinR: 0.3,
        hybridFixedR: 1.0,
        hybridIter: 4,
    }
};
