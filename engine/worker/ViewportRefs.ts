/**
 * ViewportRefs — Shared references to the R3F camera and canvas element.
 *
 * Provides access to the R3F camera and canvas element for DOM overlays
 * (light gizmos, etc.) that sit outside the <Canvas> and can't use useThree().
 *
 * Set from inside the Canvas (WorkerTickScene).
 * Read from DOM overlays (LightGizmo, SingleLightGizmo, etc.).
 */

import * as THREE from 'three';

let _camera: THREE.Camera | null = null;
let _canvasElement: HTMLCanvasElement | null = null;

// Display camera: snapshot of the R3F camera taken at the start of each frame.
// Gizmos and overlays use this rather than the live camera so they see
// a consistent state within a single tick cycle.
let _displayCamera: THREE.PerspectiveCamera | null = null;

/** Call from inside R3F Canvas to register the active camera */
export function setViewportCamera(camera: THREE.Camera) {
    _camera = camera;
}

/** Call from inside R3F Canvas to register the canvas DOM element */
export function setViewportCanvas(canvas: HTMLCanvasElement) {
    _canvasElement = canvas;
}

/** Get the R3F camera */
export function getViewportCamera(): THREE.Camera | null {
    return _camera;
}

/** Get the canvas DOM element */
export function getViewportCanvas(): HTMLCanvasElement | null {
    return _canvasElement;
}

/**
 * Snapshot the current R3F camera into the display camera clone.
 * Called in the SNAPSHOT phase (first tick each frame) so that
 * OVERLAY ticks (gizmos) see a consistent camera state.
 */
export function snapshotDisplayCamera(cam: THREE.Camera) {
    if (!_displayCamera) {
        _displayCamera = new THREE.PerspectiveCamera();
    }
    _displayCamera.position.copy(cam.position);
    _displayCamera.quaternion.copy(cam.quaternion);
    const src = cam as THREE.PerspectiveCamera;
    if (src.fov !== undefined) {
        _displayCamera.fov = src.fov;
        _displayCamera.aspect = src.aspect;
        _displayCamera.updateProjectionMatrix();
    }
    _displayCamera.updateMatrixWorld();
}

/**
 * Get the display camera (snapshotted at start of frame).
 * Use for rendering overlays that need consistent camera state.
 * Falls back to live camera before first snapshot.
 */
export function getDisplayCamera(): THREE.Camera | null {
    return _displayCamera || _camera;
}
