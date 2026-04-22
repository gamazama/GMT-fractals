/**
 * PresetLogic — generic scene-state application + sanitization.
 *
 * Preset hydration is fundamentally a generic pattern:
 *   1. For each registered feature, find matching state in preset.features
 *   2. Invoke the feature's auto-generated setter with that state
 *   3. Apply top-level scene fields (camera rotation, target distance, etc.)
 *   4. Apply animations + timeline
 *
 * Anything fractal-specific (cameraPos → sceneOffset absorption via
 * VirtualSpace, Fragmentarium-imported formula registration, ensureLightIds)
 * lived in the previous GMT version of this file. A future fractal plugin
 * re-installs those as preset middlewares.
 */

import type { Preset } from '../types';
import type { FractalActions } from '../types/store';
import { FractalEvents } from '../engine/FractalEvents';
import { useAnimationStore } from '../store/animationStore';
import { featureRegistry } from '../engine/FeatureSystem';
import * as THREE from 'three';

/**
 * Builds a default preset from feature registry defaults. Used by URL-share
 * decoding when no feature data is present in the incoming share string.
 */
export const getFullDefaultPreset = (formula: string): Preset => {
    const full: Preset = {
        version: 5,
        name: formula || 'Untitled',
        formula,
        features: {},
    };
    return full;
};

/** Strip Three.js object wrappers so feature state is JSON-serializable. */
export const sanitizeFeatureState = (state: Record<string, unknown>) => {
    const out: Record<string, unknown> = {};
    if (!state) return out;
    Object.keys(state).forEach(key => {
        if (key.startsWith('is')) return;
        const val = state[key] as Record<string, unknown>;
        if (val && typeof val === 'object' && 'isColor' in val) {
            out[key] = '#' + (val as unknown as THREE.Color).getHexString();
        } else if (val && typeof val === 'object' && ('isVector2' in val || 'isVector3' in val)) {
            const cleaned = { ...val };
            delete cleaned.isVector2;
            delete cleaned.isVector3;
            out[key] = cleaned;
        } else {
            out[key] = val;
        }
    });
    return out;
};

/**
 * Apply a Preset to the live store. Iterates the feature registry and calls
 * each feature's auto-generated setter (set<FeatureId>) with the matching
 * preset data, falling back to feature param defaults for missing keys.
 *
 * Sanitizes plain vec2/vec3/color objects back into THREE instances where
 * feature params declare those types.
 */
export const applyPresetState = (
    p: Partial<Preset>,
    set: (partial: Record<string, unknown>) => void,
    get: () => Record<string, unknown>,
) => {
    const actions = get();
    const features = p.features || {};

    featureRegistry.getAll().forEach(feat => {
        const setterName = `set${feat.id.charAt(0).toUpperCase() + feat.id.slice(1)}`;
        const setter = (actions as any)[setterName];
        if (typeof setter !== 'function') return;

        const incomingData = (features as any)[feat.id];
        const nextState: Record<string, unknown> = {};
        if (feat.state) Object.assign(nextState, feat.state);

        Object.entries(feat.params).forEach(([key, config]) => {
            if (incomingData && incomingData[key] !== undefined) {
                let val = incomingData[key];
                if (config.type === 'vec2' && val && !(val instanceof THREE.Vector2)) {
                    val = new THREE.Vector2(val.x, val.y);
                } else if (config.type === 'vec3' && val && !(val instanceof THREE.Vector3)) {
                    val = new THREE.Vector3(val.x, val.y, val.z);
                } else if (config.type === 'color' && val && !(val instanceof THREE.Color)) {
                    val = new THREE.Color(val);
                }
                nextState[key] = val;
            } else if (nextState[key] === undefined) {
                let val: any = config.default;
                if (val && typeof val === 'object') {
                    if (typeof val.clone === 'function') val = val.clone();
                    else if (Array.isArray(val)) val = [...val];
                    else val = { ...val };
                }
                nextState[key] = val;
            }
        });

        setter(nextState);
    });

    // Animations & timeline — generic
    if (p.sequence) useAnimationStore.getState().setSequence(p.sequence);
    (actions as unknown as FractalActions).setAnimations(p.animations || []);

    // Saved-camera library — generic pattern
    if (p.savedCameras && Array.isArray(p.savedCameras) && p.savedCameras.length > 0) {
        set({
            savedCameras: p.savedCameras as any,
            activeCameraId: (p.savedCameras[0] as any).id || null,
        });
    }

    // Core scene state (what's left after stripping VirtualSpace absorb)
    if (p.cameraRot) set({ cameraRot: p.cameraRot });
    if (p.targetDistance !== undefined) set({ targetDistance: p.targetDistance });

    if (p.duration) useAnimationStore.getState().setDuration(p.duration);

    FractalEvents.emit('reset_accum', undefined);
};
