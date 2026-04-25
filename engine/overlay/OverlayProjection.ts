/**
 * OverlayProjection — Shared projection utilities for DOM overlays.
 *
 * Any overlay that projects 3D world positions onto the 2D viewport
 * (light gizmos, drawing tools, future measurement/annotation overlays)
 * should use these helpers for consistent behaviour:
 *
 *   - Uses the display camera (snapshotted at TICK_PHASE.SNAPSHOT)
 *   - Uses clientWidth/clientHeight (correct under CSS fitScale)
 *   - Pre-allocated temp vectors (zero per-frame GC pressure)
 *   - Consistent behind-camera culling
 *
 * Usage from a tick function (TICK_PHASE.OVERLAY):
 *
 *   const vp = getOverlayViewport();
 *   if (!vp) return;
 *   const screen = projectWorldToScreen(worldPos, vp.camera, vp.width, vp.height);
 */

import * as THREE from 'three';
import { getDisplayCamera, getViewportCanvas } from '../worker/ViewportRefs';
import type { PreciseVector3 } from '../../types/common';

// ── Pre-allocated temporaries (module-scoped, never exposed) ─────────

const _projVec = new THREE.Vector3();
const _viewVec = new THREE.Vector3();
const _tempVec = new THREE.Vector3();

// ── Types ────────────────────────────────────────────────────────────

export interface ScreenPoint {
    x: number;
    y: number;
    z: number;           // View-space depth (negative = in front of camera)
    isBehindCamera: boolean;
}

export interface OverlayViewport {
    camera: THREE.Camera;
    canvas: HTMLCanvasElement;
    width: number;       // clientWidth  (pre-transform, correct under fitScale)
    height: number;      // clientHeight (pre-transform, correct under fitScale)
}

// ── Constants ────────────────────────────────────────────────────────

/** Minimum view-space depth to consider "in front of camera" */
export const MIN_OVERLAY_DEPTH = 0.00005;

/** Safety clamp — suppress positions that would produce absurd DOM offsets */
const MAX_SCREEN_COORD = 50_000;

// ── Core Projection ──────────────────────────────────────────────────

/**
 * Get the current overlay viewport (display camera + canvas dimensions).
 * Returns null if the viewport isn't ready (pre-boot, unmounted).
 */
export function getOverlayViewport(): OverlayViewport | null {
    const camera = getDisplayCamera();
    const canvas = getViewportCanvas();
    if (!camera || !canvas) return null;
    return {
        camera,
        canvas,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
    };
}

/**
 * Project a world-space position to screen-space pixel coordinates.
 *
 * Returns null if the point is behind the camera or produces extreme
 * coordinates (safety clamp). Uses pre-allocated vectors — zero GC.
 */
export function projectWorldToScreen(
    worldPos: THREE.Vector3,
    camera: THREE.Camera,
    width: number,
    height: number,
): ScreenPoint | null {
    // View-space depth check
    _viewVec.copy(worldPos).applyMatrix4(camera.matrixWorldInverse);
    if (_viewVec.z > -MIN_OVERLAY_DEPTH) return null;

    // NDC projection
    _projVec.copy(worldPos).project(camera);

    const halfW = width / 2;
    const halfH = height / 2;
    const x = _projVec.x * halfW + halfW;
    const y = -_projVec.y * halfH + halfH;

    if (Math.abs(x) > MAX_SCREEN_COORD || Math.abs(y) > MAX_SCREEN_COORD) return null;

    return { x, y, z: _viewVec.z, isBehindCamera: false };
}

/**
 * Lightweight projection that returns {x, y, behind} without view-depth.
 * Useful for shape vertex projection where full ScreenPoint isn't needed.
 * Uses the shared temp vector — caller should consume result before next call.
 */
export function projectWorldToXY(
    worldPos: THREE.Vector3,
    camera: THREE.Camera,
    width: number,
    height: number,
): { x: number; y: number; behind: boolean } {
    _projVec.copy(worldPos).project(camera);
    return {
        x: (_projVec.x * 0.5 + 0.5) * width,
        y: (-_projVec.y * 0.5 + 0.5) * height,
        behind: _projVec.z > 1,
    };
}

// ── World Position Helpers ───────────────────────────────────────────

/**
 * Convert a store position to world-space, handling both camera-fixed
 * ("headlamp") and world-anchored modes.
 *
 * - fixed=true:  position is camera-local → apply camera rotation + translation
 * - fixed=false: position is absolute → subtract scene offset (virtual-space treadmill)
 *
 * Returns a new Vector3 (safe to mutate).
 */
export function storeToWorld(
    storePos: { x: number; y: number; z: number },
    fixed: boolean,
    camera: THREE.Camera,
    sceneOffset: PreciseVector3,
): THREE.Vector3 {
    _tempVec.set(storePos.x, storePos.y, storePos.z);

    if (fixed) {
        _tempVec.applyQuaternion(camera.quaternion).add(camera.position);
    } else {
        _tempVec.x -= sceneOffset.x + sceneOffset.xL;
        _tempVec.y -= sceneOffset.y + sceneOffset.yL;
        _tempVec.z -= sceneOffset.z + sceneOffset.zL;
    }

    return _tempVec.clone();
}

/**
 * Compute a PreciseVector3-based world position relative to the current
 * scene offset. Used by the drawing overlay where shapes are stored as
 * split-float PreciseVector3 centers.
 *
 * If `out` is provided, writes into it (zero allocation). Otherwise
 * returns a new Vector3.
 */
export function preciseToWorld(
    center: PreciseVector3,
    sceneOffset: PreciseVector3,
    out?: THREE.Vector3,
): THREE.Vector3 {
    const x = (center.x - sceneOffset.x) + (center.xL - sceneOffset.xL);
    const y = (center.y - sceneOffset.y) + (center.yL - sceneOffset.yL);
    const z = (center.z - sceneOffset.z) + (center.zL - sceneOffset.zL);
    if (out) return out.set(x, y, z);
    return new THREE.Vector3(x, y, z);
}

// ── Screen-space Axis Tip ────────────────────────────────────────────

/**
 * Project an axis tip (origin + direction * scale) to screen-space and
 * return the delta relative to the origin's screen position.
 *
 * Returns null if the tip is behind the camera.
 */
export function getScreenAxisTip(
    origin: THREE.Vector3,
    axisDirection: THREE.Vector3,
    scale: number,
    camera: THREE.Camera,
    screenOrigin: { x: number; y: number },
    width: number,
    height: number,
): { x: number; y: number } | null {
    const tipWorld = _tempVec.copy(origin).addScaledVector(axisDirection, scale);

    // View-space depth check
    _viewVec.copy(tipWorld).applyMatrix4(camera.matrixWorldInverse);
    if (_viewVec.z > -MIN_OVERLAY_DEPTH) return null;

    _projVec.copy(tipWorld).project(camera);
    const tipAbsX = (_projVec.x * width / 2) + width / 2;
    const tipAbsY = -(_projVec.y * height / 2) + height / 2;

    return { x: tipAbsX - screenOrigin.x, y: tipAbsY - screenOrigin.y };
}
