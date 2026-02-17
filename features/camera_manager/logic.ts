
import * as THREE from 'three';
import { CameraUtils } from '../../utils/CameraUtils';

// Helper to determine direction name
export const getDirectionName = (rot: { x: number, y: number, z: number, w: number }): string | null => {
    const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
    const v = new THREE.Vector3(0, 0, -1).applyQuaternion(q); // Camera looks down -Z by default locally
    
    // Threshold for alignment (allow slight imperfection)
    const T = 0.98; 

    if (v.y > T) return 'Bottom View';
    if (v.y < -T) return 'Top View';
    if (v.x > T) return 'Left View';
    if (v.x < -T) return 'Right View';
    if (v.z > T) return 'Back View';
    if (v.z < -T) return 'Front View';
    
    return null;
};

export interface DirectionalViewResult {
    position: THREE.Vector3;
    rotation: { x: number, y: number, z: number, w: number };
    targetDistance: number;
    // Optional optics overrides
    optics?: {
        camType: number;
        orthoScale: number;
        dofStrength: number;
    };
}

export const calculateDirectionalView = (
    dir: 'Top' | 'Bottom' | 'Left' | 'Right' | 'Front' | 'Back' | 'Isometric',
    currentOptics: any
): DirectionalViewResult => {
    
    // 1. Determine Distance from World Center (Preserve "Altitude")
    const currentUnified = CameraUtils.getUnifiedFromEngine();
    let distToCenter = currentUnified.length();
    
    // Fallback for startup or zero-pos
    if (distToCenter < 0.001) distToCenter = 3.5;
    
    // 2. Set Pivot to World Origin
    const lookTarget = new THREE.Vector3(0, 0, 0);
    
    const q = new THREE.Quaternion();
    let isAxial = true; // True for Front/Back/Top etc, False for Iso
    
    switch (dir) {
        case 'Front':
            // Facing -Z (Standard)
            q.setFromEuler(new THREE.Euler(0, 0, 0));
            break;
        case 'Back':
            // Facing +Z
            q.setFromEuler(new THREE.Euler(0, Math.PI, 0));
            break;
        case 'Left':
            // Facing +X (Look Right)
            q.setFromEuler(new THREE.Euler(0, -Math.PI/2, 0));
            break;
        case 'Right':
            // Facing -X (Look Left)
            q.setFromEuler(new THREE.Euler(0, Math.PI/2, 0));
            break;
        case 'Top':
            // Facing -Y (Look Down)
            q.setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0));
            break;
        case 'Bottom':
            // Facing +Y (Look Up)
            q.setFromEuler(new THREE.Euler(Math.PI/2, 0, 0));
            break;
        case 'Isometric':
            isAxial = false;
            // Isometric View (3/4 Cam)
            const pitch = THREE.MathUtils.degToRad(-35.264);
            const yaw = THREE.MathUtils.degToRad(45);
            q.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
            break;
    }
    
    // 3. Calculate New Position
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const newUnifiedPos = lookTarget.clone().sub(forward.multiplyScalar(distToCenter));
    
    // 4. Calculate Optics Changes
    const targetCamType = isAxial ? 1.0 : 0.0; // 1.0 = Ortho
    let targetOrthoScale = currentOptics ? currentOptics.orthoScale : 2.0;
    let targetDofStrength = currentOptics ? currentOptics.dofStrength : 0.0;

    let opticsUpdates = undefined;

    if (isAxial) {
        // Switching TO Ortho
        if (!currentOptics || currentOptics.camType < 0.5) {
             // Was Perspective -> Switching to Ortho -> Use Distance Heuristic
             targetOrthoScale = distToCenter;
        }
        // Ortho presets should be sharp
        targetDofStrength = 0.0;
        
        opticsUpdates = {
            camType: targetCamType,
            orthoScale: targetOrthoScale,
            dofStrength: targetDofStrength
        };
    }
    
    return {
        position: newUnifiedPos,
        rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
        targetDistance: distToCenter,
        optics: opticsUpdates
    };
};
