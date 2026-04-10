/**
 * ViewportRefs — Shared references to the R3F camera and canvas element.
 *
 * Provides access to the R3F camera and canvas element for DOM overlays
 * (light gizmos, drawing tools, etc.) that sit outside the <Canvas> and
 * can't use useThree().
 *
 * Set from inside the Canvas (WorkerTickScene).
 * Read from DOM overlays (LightGizmo, SingleLightGizmo, DrawingOverlay, etc.).
 *
 * In orthographic mode the display camera is an OrthographicCamera configured
 * from the optics.orthoScale parameter, so that `.project()` gives the correct
 * screen-space positions for overlay rendering.
 */

import * as THREE from 'three';
import { useFractalStore } from '../../store/fractalStore';

let _camera: THREE.Camera | null = null;
let _canvasElement: HTMLCanvasElement | null = null;

// Display cameras: snapshotted at the start of each frame.
// Gizmos and overlays use these rather than the live camera so they see
// a consistent state within a single tick cycle.
let _displayPerspCamera: THREE.PerspectiveCamera | null = null;
let _displayOrthoCamera: THREE.OrthographicCamera | null = null;

/** Which display camera was active last snapshot — avoids per-read store lookups */
let _isOrthoActive = false;

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
 *
 * When orthographic mode is active (optics.camType ≈ 1.0), the display
 * camera is an OrthographicCamera configured from orthoScale so that
 * `.project()` produces correct screen-space positions for overlays.
 */
export function snapshotDisplayCamera(cam: THREE.Camera) {
    const optics = (useFractalStore.getState() as any).optics;
    const isOrtho = optics ? optics.camType > 0.5 && optics.camType < 1.5 : false;
    _isOrthoActive = isOrtho;

    if (isOrtho) {
        // ── Orthographic display camera ──
        const orthoScale = optics.orthoScale ?? 2.0;
        const src = cam as THREE.PerspectiveCamera;
        const aspect = src.aspect || 1;
        const halfH = orthoScale / 2;
        const halfW = halfH * aspect;

        if (!_displayOrthoCamera) {
            _displayOrthoCamera = new THREE.OrthographicCamera(
                -halfW, halfW, halfH, -halfH, 0.001, 10000
            );
        } else {
            _displayOrthoCamera.left = -halfW;
            _displayOrthoCamera.right = halfW;
            _displayOrthoCamera.top = halfH;
            _displayOrthoCamera.bottom = -halfH;
        }

        _displayOrthoCamera.position.copy(cam.position);
        _displayOrthoCamera.quaternion.copy(cam.quaternion);
        _displayOrthoCamera.updateProjectionMatrix();
        _displayOrthoCamera.updateMatrixWorld();
    } else {
        // ── Perspective display camera ──
        if (!_displayPerspCamera) {
            _displayPerspCamera = new THREE.PerspectiveCamera();
        }
        _displayPerspCamera.position.copy(cam.position);
        _displayPerspCamera.quaternion.copy(cam.quaternion);
        const src = cam as THREE.PerspectiveCamera;
        if (src.fov !== undefined) {
            _displayPerspCamera.fov = src.fov;
            _displayPerspCamera.aspect = src.aspect;
            _displayPerspCamera.updateProjectionMatrix();
        }
        _displayPerspCamera.updateMatrixWorld();
    }
}

/**
 * Get the display camera (snapshotted at start of frame).
 * Use for rendering overlays that need consistent camera state.
 *
 * Returns an OrthographicCamera when ortho mode is active, so that
 * `.project()` gives correct screen-space positions. Falls back to
 * live camera before first snapshot.
 */
export function getDisplayCamera(): THREE.Camera | null {
    if (_isOrthoActive) return _displayOrthoCamera || _camera;
    return _displayPerspCamera || _camera;
}

// Track whether the mouse is over the viewport canvas (vs UI panels/menus).
// Used by adaptive resolution to decide grace period behavior.
let _mouseOverCanvas = false;
export function setMouseOverCanvas(over: boolean) { _mouseOverCanvas = over; }
export function isMouseOverCanvas(): boolean { return _mouseOverCanvas; }
