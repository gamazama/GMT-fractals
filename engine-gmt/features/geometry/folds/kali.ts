
import type { FoldDefinition } from '../types';

/** Kali fold — constant - abs(z), produces organic plant-like growth */
export const kaliFold: FoldDefinition = {
    id: 'kali',
    label: 'Kali',
    foldType: 4,
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = uHybridKaliConstant - abs(z);
}
`,
    rotMode: 'post',
    defaults: {
        hybridScale: 1.5,
        hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
        hybridMinR: 0.6,
        hybridFixedR: 1.0,
        hybridIter: 3,
        hybridKaliConstant: { x: 0.5, y: 0.5, z: 0.5 },
    }
};
