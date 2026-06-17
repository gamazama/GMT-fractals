
import type { FoldDefinition } from '../types';
import * as THREE from 'three';

/** Kali fold — constant - abs(z), produces organic plant-like growth */
export const kaliFold: FoldDefinition = {
    id: 'kali',
    label: 'Kali',
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = uHybridKaliConstant - abs(z);
}
`,
    rotMode: 'post',
    extraParams: {
        hybridKaliConstant: {
            type: 'vec3', default: new THREE.Vector3(1, 1, 1), label: 'Kali Constant',
            shortId: 'hkc', uniform: 'uHybridKaliConstant', min: -3.0, max: 3.0, step: 0.01,
            group: 'hybrid'
        }
    },
    defaults: {
        hybridScale: 1.5,
        hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
        hybridMinR: 0.6,
        hybridFixedR: 1.0,
        hybridIter: 3,
        hybridKaliConstant: { x: 0.5, y: 0.5, z: 0.5 },
    }
};
