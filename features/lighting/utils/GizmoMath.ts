
import * as THREE from 'three';
import { LightParams } from '../../../types';
import { PreciseVector3 } from '../../../types/common';

export const MIN_GIZMO_DISTANCE = 0.00005;
export const GIZMO_SCALE_FACTOR = 0.15;
export const PLANE_SCALE = 0.4;

export const GizmoColors = {
    X: '#ff4444',
    Y: '#44ff44',
    Z: '#4444ff',
    Hover: '#ffffff',
    PlaneXY: '#4444ff',
    PlaneXZ: '#44ff44',
    PlaneYZ: '#ff4444'
};

const _tempVec = new THREE.Vector3();
const _viewPos = new THREE.Vector3();

export const getLightWorldPosition = (light: LightParams, camera: THREE.Camera, sceneOffset: PreciseVector3): THREE.Vector3 => {
    _tempVec.set(light.position.x, light.position.y, light.position.z);
    
    if (light.fixed) {
        // Headlamp: Apply Camera Transform
        _tempVec.applyQuaternion(camera.quaternion).add(camera.position);
    } else {
        // World: Subtract Scene Offset (Virtual Space)
        _tempVec.sub({ 
            x: sceneOffset.x + sceneOffset.xL, 
            y: sceneOffset.y + sceneOffset.yL, 
            z: sceneOffset.z + sceneOffset.zL 
        } as THREE.Vector3);
    }
    
    return _tempVec.clone();
};

export interface ScreenPoint {
    x: number;
    y: number;
    z: number; // View space depth
    isBehindCamera: boolean;
}

export const projectToScreen = (
    worldPos: THREE.Vector3, 
    camera: THREE.Camera, 
    width: number, 
    height: number
): ScreenPoint | null => {
    camera.updateMatrixWorld();
    const viewMat = camera.matrixWorldInverse;

    // View Space Check
    _viewPos.copy(worldPos).applyMatrix4(viewMat);
    
    // Cull if behind camera or too close
    if (_viewPos.z > -MIN_GIZMO_DISTANCE) {
        return null; 
    }

    _tempVec.copy(worldPos).project(camera);

    const halfW = width / 2;
    const halfH = height / 2;

    const x = (_tempVec.x * halfW) + halfW;
    const y = -(_tempVec.y * halfH) + halfH;
    
    // Safety clamp
    if (Math.abs(x) > 50000 || Math.abs(y) > 50000) return null;

    return { x, y, z: _viewPos.z, isBehindCamera: false };
};

export const getScreenTip = (
    origin: THREE.Vector3, 
    axisDirection: THREE.Vector3, 
    scale: number,
    camera: THREE.Camera,
    viewMat: THREE.Matrix4,
    screenOrigin: {x:number, y:number},
    width: number, 
    height: number
) => {
    const tipWorld = origin.clone().add(axisDirection.clone().multiplyScalar(scale));
    
    // Check Tip Depth
    _viewPos.copy(tipWorld).applyMatrix4(viewMat);
    if (_viewPos.z > -MIN_GIZMO_DISTANCE) return null; // Tip is behind camera

    _tempVec.copy(tipWorld).project(camera);
    const sx = (_tempVec.x * width/2);
    const sy = -(_tempVec.y * height/2);
    
    // Return delta relative to origin div center (0,0)
    // Note: screenOrigin is absolute, sx/sy are relative to center of screen?
    // Wait, project() returns -1..1.
    // Screen coords calculation:
    // x = (ndc * w/2) + w/2.
    // We want delta from Origin. 
    // Origin Screen X = (ndc0 * w/2) + w/2
    // Tip Screen X    = (ndc1 * w/2) + w/2
    // Delta           = (ndc1 - ndc0) * w/2
    
    // But passed screenOrigin is already pixels.
    // Let's recalculate tip absolute pixels.
    const tipAbsX = (_tempVec.x * width/2) + width/2;
    const tipAbsY = -(_tempVec.y * height/2) + height/2;
    
    return { x: tipAbsX - screenOrigin.x, y: tipAbsY - screenOrigin.y };
};
