/**
 * Camera-Key Track Registry
 * ─────────────────────────
 * The shared `<TimelineToolbar>` has a "Key Cam" button that captures the
 * current camera pose as a keyframe and flags its "dirty" state (live
 * value differs from timeline value). The set of tracks that make up a
 * camera pose is app-specific:
 *
 *   - GMT legacy  : `camera.unified.{x,y,z}`, `camera.rotation.{x,y,z}`
 *   - fractal-toy : `camera.orbitTheta`, `camera.orbitPhi`, `camera.distance`, `camera.target`
 *   - fluid-toy   : `sceneCamera.pan.{x,y}`, `sceneCamera.zoom`
 *
 * Apps register their camera track list on boot (usually in `main.tsx`
 * after `installViewport`). The toolbar reads the registered list at
 * render time; if no tracks are registered, the Key Cam button is
 * hidden entirely.
 *
 * Cleanest design choice (option B from the porting plan) — explicit
 * registration, no feature-registry heuristics, no hardcoding.
 */

let cameraKeyTracks: readonly string[] = [];
const listeners = new Set<() => void>();

/** Optional app-provided capture function. Apps override when their
 *  camera values live outside the DDFS store (e.g. GMT reads from
 *  engine.activeCamera). Default reads scalar values from store paths
 *  — works for any DDFS-resident camera (fluid-toy, fractal-toy). */
export type CameraKeyCaptureFn = (frame: number, tracks: readonly string[]) => void;
let _captureFn: CameraKeyCaptureFn | null = null;

export function setCameraKeyCaptureFn(fn: CameraKeyCaptureFn): void {
    _captureFn = fn;
}

import { useEngineStore } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';

export function captureCameraKeyFrame(frame: number): void {
    if (_captureFn) { _captureFn(frame, cameraKeyTracks); return; }
    // Default capture: path-resolve each track to a scalar in the DDFS
    // store and call the animation-store addKeyframe. Supports both
    // pure-scalar paths (`sceneCamera.zoom`) and UNDERSCORE vec-component
    // paths (`sceneCamera.center_x`) — the latter resolves the base part
    // (`center`) to a vec, then picks the axis.
    const state = useEngineStore.getState() as any;
    const animActions = useAnimationStore.getState();
    for (const tid of cameraKeyTracks) {
        const parts = tid.split('.');
        let v: any = state;
        for (let i = 0; i < parts.length; i++) {
            if (v == null) break;
            const p = parts[i];
            // Last segment: check for `base_axis` vec-component form.
            if (i === parts.length - 1) {
                const m = p.match(/^(.+)_([xyzw])$/);
                if (m && v[m[1]] != null && typeof v[m[1]] === 'object' && m[2] in v[m[1]]) {
                    v = v[m[1]][m[2]];
                    break;
                }
            }
            v = v[p];
        }
        if (typeof v === 'number' && isFinite(v)) {
            // addKeyframe silently no-ops if the track doesn't exist yet;
            // auto-create here so Key Cam works on first press without
            // the app having to pre-register every track.
            if (!(useAnimationStore.getState() as any).sequence.tracks[tid]) {
                animActions.addTrack(tid, tid);
            }
            animActions.addKeyframe(tid, frame, v);
        }
    }
}

/**
 * Register the set of track IDs that together represent the camera pose.
 * Calling again replaces the previous registration (apps should register
 * exactly once on boot; subsequent calls are allowed so hot-reload works).
 */
export function registerCameraKeyTracks(tracks: readonly string[]): void {
    cameraKeyTracks = tracks.slice();
    listeners.forEach(l => l());
}

/**
 * Current registered camera track IDs. Empty array when no app has
 * registered yet — toolbar treats this as "hide the Key Cam button".
 */
export function getCameraKeyTracks(): readonly string[] {
    return cameraKeyTracks;
}

/**
 * Subscribe to registration changes. Useful if the toolbar mounts
 * before the app's registerCameraKeyTracks() call (e.g. async boot).
 * Returns an unsubscribe function.
 */
export function subscribeCameraKeyTracks(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
