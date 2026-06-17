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

/** Track entry for `registerCameraKeyTracks`. Plain string for the
 *  common case; object form when the track needs metadata (e.g.
 *  `hidden:true` for sub-f64 DD-pair lo-words like fluid-toy's
 *  `centerLow_x/_y`, which are paired-and-auto-managed and would
 *  clutter the timeline if shown). */
export type CameraKeyTrackEntry = string | { id: string; hidden?: boolean };

interface NormalizedTrackEntry { id: string; hidden?: boolean }

let cameraKeyTracks: readonly NormalizedTrackEntry[] = [];
/** Cached `id`-only projection of `cameraKeyTracks`. Critical that this
 *  reference stays stable between registrations — `KeyCamButton` reads
 *  it via `useSyncExternalStore`, which polls `getCameraKeyTracks` on
 *  every render and compares by reference. Returning a fresh `.map()`
 *  each call would trip React's "snapshot changed without notify"
 *  infinite-loop guard. Recomputed only inside `registerCameraKeyTracks`. */
let cameraKeyTrackIds: readonly string[] = [];
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
    const trackIds = cameraKeyTracks.map(e => e.id);
    if (_captureFn) { _captureFn(frame, trackIds, opts); return; }
    // Default capture: path-resolve each track to a scalar in the DDFS
    // store and call the animation-store addKeyframe. Supports both
    // pure-scalar paths (`sceneCamera.zoom`) and UNDERSCORE vec-component
    // paths (`sceneCamera.center_x`) — the latter resolves the base part
    // (`center`) to a vec, then picks the axis. Honors skipSnapshot;
    // interpolation falls through to addKeyframe's auto-pick — apps
    // that need an explicit override register a host-side capture fn.
    const state = useEngineStore.getState() as any;
    const animActions = useAnimationStore.getState() as any;

    // Resolve all values up front so we can decide whether to take a
    // snapshot at all (no-op press → no undo entry).
    const resolved: Array<{ tid: string; v: number; hidden?: boolean }> = [];
    for (const entry of cameraKeyTracks) {
        const tid = entry.id;
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
        if (typeof v === 'number' && isFinite(v)) resolved.push({ tid, v, hidden: entry.hidden });
    }
    if (resolved.length === 0) return;

    // ONE snapshot for the whole batch. Without this the first press
    // would push N entries (addTrack snapshots per missing track) and
    // subsequent presses would push zero (addKeyframe doesn't snapshot)
    // — neither matches the "one press → one undo entry" mental model.
    if (!opts?.skipSnapshot && typeof animActions.snapshot === 'function') {
        animActions.snapshot();
    }

    for (const { tid, v, hidden } of resolved) {
        if (!animActions.sequence.tracks[tid]) {
            // Inline track creation — bypass addTrack so its internal
            // snapshot doesn't multiply the single batch snapshot above.
            // `hidden:true` keeps DD-pair lo-words (centerLow_*) out of
            // the timeline UI; the camera-pair binder still drives them.
            const newTrack: any = { id: tid, type: 'float', label: tid, keyframes: [] };
            if (hidden) newTrack.hidden = true;
            useAnimationStore.setState((s: any) => ({
                sequence: {
                    ...s.sequence,
                    tracks: { ...s.sequence.tracks, [tid]: newTrack },
                },
            }));
        }
        animActions.addKeyframe(tid, frame, v);
    }
}

/**
 * Register the set of track IDs that together represent the camera pose.
 * Accepts either a plain ID string or `{ id, hidden? }` for tracks that
 * should be created with `hidden:true` (e.g. DD-pair lo-words). Calling
 * again replaces the previous registration (apps should register exactly
 * once on boot; subsequent calls are allowed so hot-reload works).
 */
export function registerCameraKeyTracks(tracks: readonly CameraKeyTrackEntry[]): void {
    cameraKeyTracks = tracks.map(t => typeof t === 'string' ? { id: t } : { ...t });
    cameraKeyTrackIds = cameraKeyTracks.map(e => e.id);
    listeners.forEach(l => l());
}

/**
 * Current registered camera track IDs. Empty array when no app has
 * registered yet — toolbar treats this as "hide the Key Cam button".
 * Returns a stable reference (recomputed only in `registerCameraKeyTracks`)
 * so `useSyncExternalStore` callers don't loop.
 */
export function getCameraKeyTracks(): readonly string[] {
    return cameraKeyTrackIds;
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
