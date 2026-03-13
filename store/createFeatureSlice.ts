
import { StateCreator } from 'zustand';
import * as THREE from 'three';
import { featureRegistry } from '../engine/FeatureSystem';
import { registerFeatures } from '../features';
import { FractalEvents } from '../engine/FractalEvents';
import { generateGradientTextureBuffer } from '../utils/colorUtils';

// Generic type for the dynamic slice
export interface FeatureSlice {
    [key: string]: any; 
}

export const createFeatureSlice: StateCreator<any> = (set, get) => {
    const slice: any = {};
    // Ensure features are registered before building slices —
    // module evaluation order can vary due to circular dependencies
    registerFeatures();
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

                const next = { ...current, ...sanitized };
                const compositesToUpdate = new Set<string>();

                Object.keys(sanitized).forEach(paramKey => {
                    const config = feat.params[paramKey];
                    
                    if (compositeParams[paramKey]) {
                        compositesToUpdate.add(compositeParams[paramKey]);
                    }

                    if (config) {
                        if (!config.noReset) shouldReset = true;

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
                                        FractalEvents.emit('uniform', { key: 'uUseEnvMap', value: 1.0, noReset: false });
                                    }
                                    // Auto-enable texturing when image is loaded
                                    if (paramKey === 'layer1Data' && next['active'] === false) {
                                        next['active'] = true;
                                        FractalEvents.emit('uniform', { key: 'uUseTexture', value: 1.0, noReset: false });
                                    }
                                } else {
                                    FractalEvents.emit('texture', { textureType, dataUrl: null });

                                    // Auto-disable environment map when image is cleared
                                    if (paramKey === 'envMapData' && next['useEnvMap'] === true) {
                                        next['useEnvMap'] = false;
                                        FractalEvents.emit('uniform', { key: 'uUseEnvMap', value: 0.0, noReset: false });
                                    }
                                    // Auto-disable texturing when image is cleared
                                    if (paramKey === 'layer1Data' && next['active'] === true) {
                                        next['active'] = false;
                                        FractalEvents.emit('uniform', { key: 'uUseTexture', value: 0.0, noReset: false });
                                    }
                                }
                            }
                            else if (config.type === 'gradient') {
                                // Handles both GradientStop[] and GradientConfig object via utils/colorUtils logic
                                const buffer = generateGradientTextureBuffer(val);
                                FractalEvents.emit('uniform', { 
                                    key: config.uniform!, 
                                    value: { isGradientBuffer: true, buffer }, 
                                    noReset: !!config.noReset 
                                });
                            }
                            else {
                                let finalVal = val;
                                if (config.type === 'boolean') finalVal = val ? 1.0 : 0.0;
                                if (config.type === 'color' && !(finalVal instanceof THREE.Color)) finalVal = new THREE.Color(finalVal);
                                
                                FractalEvents.emit('uniform', { key: config.uniform, value: finalVal, noReset: !!config.noReset });
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
                                    noReset: !!config.noReset 
                                });
                                if (!config.noReset) shouldReset = true;
                            }
                        }
                        else if (config.type === 'vec2') {
                            const compositeVal = new THREE.Vector2(values[0], values[1]);
                            FractalEvents.emit('uniform', { key: config.uniform, value: compositeVal, noReset: !!config.noReset });
                            if (!config.noReset) shouldReset = true;
                        }
                        else if (config.type === 'vec3') {
                            const compositeVal = new THREE.Vector3(values[0], values[1], values[2]);
                            FractalEvents.emit('uniform', { key: config.uniform, value: compositeVal, noReset: !!config.noReset });
                            if (!config.noReset) shouldReset = true;
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
