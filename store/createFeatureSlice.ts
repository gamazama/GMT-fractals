/**
 * Builds the Zustand slice from `featureRegistry`. Boot-time hot path:
 * registers features → registers preset fields → freezes both
 * registries → iterates `getAll()` to seed state + install one auto-
 * setter per feature.
 *
 * @invariant Auto-setter name `set${FeatureId with capitalised first
 *   letter}` is a load-bearing STRING convention with NO type
 *   enforcement. Four downstream consumers derive the same name:
 *   PresetLogic.applyPresetState, AnimationEngine.getBinder (case 4),
 *   historySlice.beginParamTransaction, typedSlices.setSlice.
 * @invariant Track-id convention `${featureId}.${paramKey}` (scalars)
 *   and `${featureId}.${paramKey}_<axis>` (UNDERSCORE axes) is the
 *   second load-bearing string contract. See engine/animation/
 *   trackBinding.ts for the authoritative form.
 * @invariant `image`-typed params are deliberately excluded from the
 *   `config` event payload (data URLs can be many MB). Restored via
 *   the `texture` event channel.
 * @invariant The setter has NO `oldValue !== newValue` guard. Every
 *   key in `updates` triggers the full sanitise + emit path; equality
 *   short-circuiting lives downstream in `ConfigManager.areValuesEqual`.
 * @invariant `onSet` extras only land for keys not present in the
 *   user-provided `updates` — preset loads override defaults the
 *   `onSet` would otherwise compute.
 */

import { StateCreator } from 'zustand';
import * as THREE from 'three';
import { featureRegistry } from '../engine/FeatureSystem';
import { registerFeatures } from '../engine/features';
import { FractalEvents } from '../engine/FractalEvents';
import { generateGradientTextureBuffer } from '../utils/colorUtils';
import { presetFieldRegistry } from '../utils/PresetFieldRegistry';
import { registerDefaultPresetFields } from '../utils/defaultPresetFields';

// Generic type for the dynamic slice
export interface FeatureSlice {
    [key: string]: any; 
}

export const createFeatureSlice: StateCreator<any> = (set, get) => {
    const slice: any = {};
    // Ensure features are registered before building slices —
    // module evaluation order can vary due to circular dependencies.
    registerFeatures();
    // Register canonical non-feature preset fields (cameraRot, targetDistance,
    // savedCameras). A future @engine/camera plugin will own these; for now
    // they live in the engine proper. See docs/20_Fragility_Audit.md F3.
    registerDefaultPresetFields();
    // Freeze both registries: from this point on, new registrations fail loudly
    // (throw in dev, warn in prod). State slices are snapshotted below, so
    // late arrivals would be invisible to the store — this catches the bug
    // at the point of the late register() call instead of much later when
    // a feature's setter is unexpectedly undefined. See docs/20_Fragility_Audit.md F1.
    featureRegistry.freeze();
    presetFieldRegistry.freeze();
    const features = featureRegistry.getAll();

    features.forEach(feat => {
        // 1. Initialize State
        const initialState: any = {};
        const compositeParams: Record<string, string> = {}; 
        
        if (feat.state) {
            Object.assign(initialState, feat.state);
        }
        
        Object.entries(feat.params).forEach(([key, config]) => {
            if (!config.composeFrom) {
                if (initialState[key] === undefined) {
                    initialState[key] = config.default;
                }
            } else {
                config.composeFrom.forEach(dep => {
                    compositeParams[dep] = key;
                });
            }
        });
        
        slice[feat.id] = initialState;

        // 2. Create Standard Setter
        const actionName = `set${feat.id.charAt(0).toUpperCase() + feat.id.slice(1)}`;
        
        slice[actionName] = (updates: any) => {
            let shouldReset = false;
            // Capture config updates for the engine
            const configUpdates: Record<string, any> = {};

            set((state: any) => {
                const current = state[feat.id];
                const sanitized = { ...updates };
                
                // Sanitize types
                Object.keys(updates).forEach(key => {
                    const config = feat.params[key];
                    if (config) {
                        const val = updates[key];
                        if (val === undefined || val === null) return;

                        if (config.type === 'vec2' && !(val instanceof THREE.Vector2)) {
                            sanitized[key] = new THREE.Vector2(val.x, val.y);
                        }
                        if (config.type === 'vec3' && !(val instanceof THREE.Vector3)) {
                            sanitized[key] = new THREE.Vector3(val.x, val.y, val.z);
                        }
                        if (config.type === 'color' && !(val instanceof THREE.Color)) {
                            if (typeof val === 'string') sanitized[key] = new THREE.Color(val);
                            else if (typeof val === 'number') sanitized[key] = new THREE.Color(val);
                            else if (typeof val === 'object' && 'r' in val) sanitized[key] = new THREE.Color(val.r, val.g, val.b);
                        }
                    }
                });

                // Apply onSet hooks: params can inject extra state updates when their value changes.
                // Only apply extras for keys NOT already in the original updates — this prevents
                // onSet from overwriting explicitly provided values (e.g. during preset load where
                // interlaceFormula + interlaceParamA are both in the same update batch).
                Object.keys(sanitized).forEach(paramKey => {
                    const config = feat.params[paramKey];
                    if (config?.onSet) {
                        const extras = config.onSet(sanitized[paramKey], current);
                        if (extras) {
                            Object.entries(extras).forEach(([k, v]) => {
                                if (updates[k] === undefined) sanitized[k] = v;
                            });
                        }
                    }
                });

                const next = { ...current, ...sanitized };
                const compositesToUpdate = new Set<string>();

                Object.keys(sanitized).forEach(paramKey => {
                    const config = feat.params[paramKey];
                    
                    if (compositeParams[paramKey]) {
                        compositesToUpdate.add(compositeParams[paramKey]);
                    }

                    if (config) {
                        // Only treat this param as a reason to reset accumulation
                        // if its value actually changed. Re-applying the value it
                        // already holds (redundant setter calls, preset/undo
                        // re-applies, sliders that re-fire the same value) must
                        // not disturb the accumulated buffer. Conservative for
                        // object-typed params (vec/color/gradient/array): treat
                        // as changed so a needed reset is never skipped.
                        const oldVal = current[paramKey];
                        const newVal = next[paramKey];
                        const paramChanged =
                            oldVal === newVal ? false
                            : (typeof newVal === 'number' && typeof oldVal === 'number') ? Math.abs(newVal - oldVal) > 1e-9
                            : (typeof newVal !== 'object' && typeof oldVal !== 'object') ? newVal !== oldVal
                            : true;

                        if (paramChanged && !config.noAccumReset) shouldReset = true;

                        // Sync ALL changed params to ConfigManager via CONFIG event.
                        // ConfigManager.update() only triggers recompile for onUpdate:'compile'
                        // params — runtime params are merged without rebuild. This ensures
                        // configManager.config is always the source of truth (e.g. gradient
                        // stop arrays survive through syncConfigUniforms after recompilation).
                        // Skip images (large data URLs handled via separate texture channel).
                        if (config.type !== 'image') {
                            if (!configUpdates[feat.id]) configUpdates[feat.id] = {};
                            configUpdates[feat.id][paramKey] = next[paramKey];
                        }

                        if (config.uniform) {
                            const val = next[paramKey];
                            
                            if (config.type === 'image') {
                                // Determine texture type from uniform name
                                const textureType: 'color' | 'env' = config.uniform!.toLowerCase().includes('env') ? 'env' : 'color';

                                if (val && typeof val === 'string') {
                                    // Send data URL to worker — it handles ImageBitmap conversion + texture creation
                                    FractalEvents.emit('texture', { textureType, dataUrl: val });

                                    // Auto-enable environment map when image is loaded
                                    if (paramKey === 'envMapData' && next['useEnvMap'] === false) {
                                        next['useEnvMap'] = true;
                                        FractalEvents.emit('uniform', { key: 'uUseEnvMap', value: 1.0, noAccumReset: false });
                                    }
                                    // Auto-enable texturing when image is loaded
                                    if (paramKey === 'layer1Data' && next['active'] === false) {
                                        next['active'] = true;
                                        FractalEvents.emit('uniform', { key: 'uUseTexture', value: 1.0, noAccumReset: false });
                                    }
                                } else {
                                    FractalEvents.emit('texture', { textureType, dataUrl: null });

                                    // Auto-disable environment map when image is cleared
                                    if (paramKey === 'envMapData' && next['useEnvMap'] === true) {
                                        next['useEnvMap'] = false;
                                        FractalEvents.emit('uniform', { key: 'uUseEnvMap', value: 0.0, noAccumReset: false });
                                    }
                                    // Auto-disable texturing when image is cleared
                                    if (paramKey === 'layer1Data' && next['active'] === true) {
                                        next['active'] = false;
                                        FractalEvents.emit('uniform', { key: 'uUseTexture', value: 0.0, noAccumReset: false });
                                    }
                                }
                            }
                            else if (config.type === 'gradient') {
                                // Handles both GradientStop[] and GradientConfig object via utils/colorUtils logic
                                const buffer = generateGradientTextureBuffer(val);
                                FractalEvents.emit('uniform', { 
                                    key: config.uniform!, 
                                    value: { isGradientBuffer: true, buffer }, 
                                    noAccumReset: !!config.noAccumReset 
                                });
                            }
                            else {
                                let finalVal = val;
                                if (config.type === 'boolean') finalVal = val ? 1.0 : 0.0;
                                if (config.type === 'color' && !(finalVal instanceof THREE.Color)) finalVal = new THREE.Color(finalVal);
                                
                                FractalEvents.emit('uniform', { key: config.uniform, value: finalVal, noAccumReset: !!config.noAccumReset || !paramChanged });
                            }
                        }
                    }
                });
                
                compositesToUpdate.forEach(compKey => {
                    const config = feat.params[compKey];
                    if (config && config.composeFrom && config.uniform) {
                        const values = config.composeFrom.map(k => next[k]);
                        
                        // Handle Gradient Dependency Trigger (e.g. ColorSpace changed)
                        if (config.type === 'gradient') {
                            // In this case, 'values' array depends on composeFrom order in Feature definition.
                            // But usually we just pass the MAIN gradient param as 'val' to generateGradientTextureBuffer.
                            // However, since we updated 'colorSpace', we need to re-trigger the gradient uniform update.
                            // We look up the gradient data from 'next' using the param key from config.
                            
                            // NOTE: 'compKey' is the key of the gradient param itself (e.g., 'gradient' or 'gradient2').
                            const gradientVal = next[compKey]; 
                            
                            if (gradientVal) {
                                const buffer = generateGradientTextureBuffer(gradientVal);
                                FractalEvents.emit('uniform', { 
                                    key: config.uniform, 
                                    value: { isGradientBuffer: true, buffer }, 
                                    noAccumReset: !!config.noAccumReset 
                                });
                                if (!config.noAccumReset) shouldReset = true;
                            }
                        }
                        else if (config.type === 'vec2') {
                            const compositeVal = new THREE.Vector2(values[0], values[1]);
                            FractalEvents.emit('uniform', { key: config.uniform, value: compositeVal, noAccumReset: !!config.noAccumReset });
                            if (!config.noAccumReset) shouldReset = true;
                        }
                        else if (config.type === 'vec3') {
                            const compositeVal = new THREE.Vector3(values[0], values[1], values[2]);
                            FractalEvents.emit('uniform', { key: config.uniform, value: compositeVal, noAccumReset: !!config.noAccumReset });
                            if (!config.noAccumReset) shouldReset = true;
                        }
                    }
                });

                return { [feat.id]: next };
            });

            // Emit the config update to trigger ShaderFactory
            if (Object.keys(configUpdates).length > 0) {
                FractalEvents.emit('config', configUpdates);
            }
            
            if (shouldReset) {
                FractalEvents.emit('reset_accum', undefined);
            }
        };

        // 3. Custom Actions
        if (feat.actions) {
            Object.entries(feat.actions).forEach(([name, reducer]) => {
                slice[name] = (payload: any) => {
                    const state = get();
                    const currentSliceState = state[feat.id];
                    const updates = reducer(currentSliceState, payload);
                    
                    if (updates && Object.keys(updates).length > 0) {
                        set({ [feat.id]: { ...currentSliceState, ...updates } });
                        FractalEvents.emit('reset_accum', undefined);
                    }
                };
            });
        }
    });

    return slice;
};
