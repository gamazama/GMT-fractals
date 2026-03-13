
import type { FoldDefinition } from '../types';
import * as THREE from 'three';

/** Decoupled fold — separate fold boundary from reflection plane (ABoxMod1 style) */
export const decoupledFold: FoldDefinition = {
    id: 'decoupled',
    label: 'Decoupled',
    glsl: `
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Fold boundary at foldLimit, reflect to foldingValue (Mandelbulber box fold)
    vec3 fv = uHybridFoldingValue;
    if (z.x > foldLimit.x) z.x = fv.x - z.x;
    else if (z.x < -foldLimit.x) z.x = -fv.x - z.x;
    if (z.y > foldLimit.y) z.y = fv.y - z.y;
    else if (z.y < -foldLimit.y) z.y = -fv.y - z.y;
    if (z.z > foldLimit.z) z.z = fv.z - z.z;
    else if (z.z < -foldLimit.z) z.z = -fv.z - z.z;
}
`,
    extraParams: {
        hybridFoldingValue: {
            type: 'vec3', default: new THREE.Vector3(2, 2, 2), label: 'Folding Value',
            shortId: 'hfv', uniform: 'uHybridFoldingValue', min: 0.1, max: 5.0, step: 0.01,
            group: 'hybrid'
        }
    },
    defaults: {
        hybridScale: 2.0,
        hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
        hybridMinR: 0.5,
        hybridFixedR: 1.0,
        hybridIter: 2,
        hybridFoldingValue: { x: 2, y: 2, z: 2 },
    }
};
