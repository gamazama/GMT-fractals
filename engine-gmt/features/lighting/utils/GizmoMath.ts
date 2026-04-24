
import * as THREE from 'three';
import { LightParams } from '../../../types';
import type { PreciseVector3 } from '../../../types/common';
import {
    projectWorldToScreen,
    storeToWorld,
    getScreenAxisTip,
    MIN_OVERLAY_DEPTH,
} from '../../../engine/overlay/OverlayProjection';
// Re-export ScreenPoint from the shared module so existing imports keep working
import type { ScreenPoint } from '../../../engine/overlay/OverlayProjection';
export type { ScreenPoint };

// Gizmo constants — shared with the future SinglePositionGizmo
// component (not yet ported in the extraction). Inlined here so
// light-gizmo math doesn't depend on the component being present.
export const GIZMO_SCALE_FACTOR = 0.15;
export const PLANE_SCALE = 0.4;
export const GizmoColors = {
    X:       '#ff4444',
    Y:       '#44ff44',
    Z:       '#4444ff',
    Hover:   '#ffffff',
    PlaneXY: '#4444ff',
    PlaneXZ: '#44ff44',
    PlaneYZ: '#ff4444',
};

/** Which light index currently has its settings popup open (-1 = none).
 *  Written by CenterHUD, read by SingleLightGizmo for range circle gating. */
export const activeLightPopup = { index: -1 };

export const MIN_GIZMO_DISTANCE = MIN_OVERLAY_DEPTH;

/**
 * Get a light's world-space position from its store params.
 * Delegates to the shared storeToWorld utility.
 */
export const getLightWorldPosition = (light: LightParams, camera: THREE.Camera, sceneOffset: PreciseVector3): THREE.Vector3 => {
    return storeToWorld(light.position, !!light.fixed, camera, sceneOffset);
};

/**
 * Project a world position to screen-space pixel coordinates.
 * Delegates to the shared projectWorldToScreen utility.
 */
export const projectToScreen = (
    worldPos: THREE.Vector3,
    camera: THREE.Camera,
    width: number,
    height: number
): ScreenPoint | null => {
    camera.updateMatrixWorld();
    return projectWorldToScreen(worldPos, camera, width, height);
};

/**
 * Project an axis tip to screen-space and return delta from the origin.
 * Delegates to the shared getScreenAxisTip utility.
 */
export const getScreenTip = (
    origin: THREE.Vector3,
    axisDirection: THREE.Vector3,
    scale: number,
    camera: THREE.Camera,
    screenOrigin: {x:number, y:number},
    width: number,
    height: number
): { x: number; y: number } | null => {
    return getScreenAxisTip(origin, axisDirection, scale, camera, screenOrigin, width, height);
};
