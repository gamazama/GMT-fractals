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

/** Options threaded into the registered capture function. Mirror what
 *  the legacy sequenceSlice.captureCameraFrame supported — apps pass
 *  these from per-frame record-mode loops + manual Scene-panel captures. */
export interface CameraKeyCaptureOptions {
    /** Skip the undo/redo snapshot. Default false. Set true for
     *  per-frame record-mode loops so the undo stack doesn't fill
     *  with intermediate frames. */
    skipSnapshot?: boolean;
    /** Interpolation type for the new keyframe. Apps can pass 'Linear'
     *  during playback so Bezier auto-tangents don't overshoot. Capture
     *  fns are free to ignore this and pick a default. */
    interpolation?: 'Linear' | 'Bezier' | 'Step';
}

/** App-provided capture function. The registered fn is the SINGLE
 *  source of truth for "snapshot the live camera into keyframes" — Key
 *  Cam button, record-mode auto-capture, scene-panel manual captures
 *  all funnel through `captureCameraKeyFrame` below.
 *
 *  Apps register this when their camera values live outside the DDFS
 *  store (e.g. GMT reads sceneOffset + cameraRot from R3F). When no fn
 *  is registered, the default DDFS-store walker runs — works for any
 *  camera whose values live under a feature slice (fluid-toy / fractal-
 *  toy). Skip-stub-fail-loud is the rule: register or accept the walker
 *  fallback; never half-register one path and let another stub win.
 */
export type CameraKeyCaptureFn = (
    frame: number,
    tracks: readonly string[],
    opts?: CameraKeyCaptureOptions,
) => void;
let _captureFn: CameraKeyCaptureFn | null = null;

export function setCameraKeyCaptureFn(fn: CameraKeyCaptureFn): void {
    _captureFn = fn;
}

import { useEngineStore } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';

/** Capture the current camera into keyframes at `frame`. The single
 *  entry point — every site that wants to snapshot the camera (Key
 *  Cam button, record-mode driver, manual capture buttons) calls this.
 *  Routes through the host-registered fn if any; falls back to the
 *  default DDFS-store walker otherwise. */
export function captureCameraKeyFrame(
    frame: number,
    opts?: CameraKeyCaptureOptions,
): void {
    if (_captureFn) { _captureFn(frame, cameraKeyTracks, opts); return; }
    // Default capture: path-resolve each track to a scalar in the DDFS
    // store and call the animation-store addKeyframe. Supports both
    // pure-scalar paths (`sceneCamera.zoom`) and UNDERSCORE vec-component
    // paths (`sceneCamera.center_x`) — the latter resolves the base part
    // (`center`) to a vec, then picks the axis. The walker doesn't honor
    // skipSnapshot / interpolation — apps that need those options register
    // a host-side capture fn instead.
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
