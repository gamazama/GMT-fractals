/**
 * @engine/animation — canonical DDFS track-binding derivation.
 *
 * The engine's animation pipeline uses a fixed naming convention for
 * per-param track IDs:
 *
 *   scalar     → `${featureId}.${paramKey}`
 *   vec2       → `${featureId}.${paramKey}_x`, `_y`
 *   vec3       → same + `_z`
 *   vec4       → same + `_w`
 *
 * This convention is read by AnimationEngine.getBinder (case 4) for
 * keyframe playback, by AnimationSystem.tsx's modulation dispatch for
 * LFO/rule offsets, and by AutoFeaturePanel for per-axis keyframe
 * buttons + live-value indicators. It must match across all three or
 * vec params silently stop animating (F12/F13).
 *
 * The `composeFrom` field on a param config is the compound-widget
 * escape hatch: a feature can bundle multiple scalar params into one
 * vector widget (e.g. GMT's orbit camera with orbitTheta, orbitPhi,
 * distance → a single vec3 control). Each component track is a
 * scalar-param track (`${featureId}.${composeFromKey}`), not an
 * axis-suffixed one.
 *
 * Any DDFS input primitive that wants to be animatable consumes a
 * TrackBinding. A typical AutoFeaturePanel caller supplies the feature
 * id, param key, label, and axis list; gets back `trackKeys` +
 * `trackLabels` ready to forward into ConnectedVectorInputProps or the
 * Slider's `trackId` prop.
 */

import * as THREE from 'three';

export interface TrackBindingInput {
    featureId: string;
    paramKey: string;
    /** Param's display label — used to compose axis labels (`"Julia c X"`). */
    label: string;
    /**
     * Axis names for vec params: `['x','y']` / `['x','y','z']` / `['x','y','z','w']`.
     * Empty array means scalar. Unused when `composeFrom` is set.
     */
    axes: readonly string[];
    /**
     * Compound-widget override: emit one track per listed param key
     * (`${featureId}.${k}`), not axis-suffixed. For widgets that bundle
     * multiple scalar params into one vector control.
     */
    composeFrom?: readonly string[];
}

export interface TrackBinding {
    /** Track IDs in canonical format. Always length ≥ 1. */
    trackKeys: string[];
    /**
     * Human-readable per-track labels. Undefined for composeFrom-driven
     * bindings — downstream widgets fall back to each composed param's
     * own label.
     */
    trackLabels?: string[];
}

export function deriveTrackBinding(input: TrackBindingInput): TrackBinding {
    const { featureId, paramKey, label, axes, composeFrom } = input;

    if (composeFrom && composeFrom.length > 0) {
        return {
            trackKeys: composeFrom.map((k) => `${featureId}.${k}`),
            trackLabels: undefined,
        };
    }

    if (axes.length === 0) {
        return {
            trackKeys: [`${featureId}.${paramKey}`],
            trackLabels: [label],
        };
    }

    return {
        trackKeys: axes.map((a) => `${featureId}.${paramKey}_${a}`),
        trackLabels: axes.map((a) => `${label} ${a.toUpperCase()}`),
    };
}

/**
 * Build a THREE.Vector{2,3,4} from the `liveModulations` entries for a
 * binding when ANY axis is currently modulated. Returns `undefined`
 * when no axis is live — consumers then fall back to the unmodulated
 * base value from the DDFS slice. Axis count is inferred from the
 * binding's trackKeys length.
 */
export function readLiveVec(
    liveModulations: Partial<Record<string, number>>,
    binding: TrackBinding,
): THREE.Vector2 | THREE.Vector3 | THREE.Vector4 | undefined {
    const vals = binding.trackKeys.map((k) => liveModulations[k]);
    if (vals.every((v) => v === undefined)) return undefined;
    const safe = vals.map((v) => v ?? 0);
    switch (safe.length) {
        case 2: return new THREE.Vector2(safe[0], safe[1]);
        case 3: return new THREE.Vector3(safe[0], safe[1], safe[2]);
        case 4: return new THREE.Vector4(safe[0], safe[1], safe[2], safe[3]);
        default: return undefined;
    }
}
