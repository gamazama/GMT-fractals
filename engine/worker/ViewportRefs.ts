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
import { useEngineStore } from '../../store/engineStore';

let _camera: THREE.Camera | null = null;
let _canvasElement: HTMLCanvasElement | null = null;

// Display cameras: snapshotted at the start of each frame.
// Gizmos and overlays use these rather than the live camera so they see
// a consistent state within a single tick cycle.
let _displayPerspCamera: THREE.PerspectiveCamera | null = null;
let _displayOrthoCamera: THREE.OrthographicCamera | null = null;

/** Which display camera was active last snapshot — avoids per-read store lookups */
let _isOrthoActive = false;

/**
 * Call from inside R3F Canvas to register the active camera.
 *
 * @invariant Module-level singleton state — multiple `<Canvas>` instances
 *   would clobber each other; no per-canvas isolation.
 */
export function setViewportCamera(camera: THREE.Camera) {
    _camera = camera;
}

/**
 * Call from inside R3F Canvas to register the canvas DOM element.
 *
 * @invariant Module-level singleton state — multiple `<Canvas>` instances
 *   would clobber each other; no per-canvas isolation.
 */
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
/**
 * @invariant Reads engineStore via `(as any)` cast. If `optics` is
 *   absent, the snapshot silently treats the camera as perspective
 *   (`isOrtho = false`). The ortho-mode test is `camType > 0.5 &&
 *   camType < 1.5` — brittle if more camera types are added.
 * @invariant Lazy display-camera allocation, never freed.
 *   `_displayPerspCamera` and `_displayOrthoCamera` are allocated on
 *   first use and survive for the module's lifetime — fine for a
 *   singleton, but tests iterating ViewportRefs should know.
 */
export function snapshotDisplayCamera(cam: THREE.Camera) {
    const optics = (useEngineStore.getState() as any).optics;
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
/**
 * @invariant Falls back to live `_camera` before first snapshot —
 *   overlays consuming the result before SNAPSHOT has run will get the
 *   live perspective camera (wrong projection if ortho is active).
 */
export function getDisplayCamera(): THREE.Camera | null {
    if (_isOrthoActive) return _displayOrthoCamera || _camera;
    return _displayPerspCamera || _camera;
}

// Track whether the mouse is over the viewport canvas (vs UI panels/menus).
// Used by adaptive resolution to decide grace period behavior.
//
// @invariant Ref-backed, NOT a Zustand selector — adaptive-resolution
//   hot path polls every frame and must not trigger React reconciliation
//   on hover. `AdaptiveResolutionBadge` therefore does NOT re-render on
//   mouse-over alone; only on the next adaptive state change (followup
//   q-043).
let _mouseOverCanvas = false;
export function setMouseOverCanvas(over: boolean) { _mouseOverCanvas = over; }
export function isMouseOverCanvas(): boolean { return _mouseOverCanvas; }
