
import { Preset } from '../types';
import { engine } from '../engine/FractalEngine';
import { FractalEvents } from '../engine/FractalEvents';
import { useAnimationStore } from '../store/animationStore';
import { featureRegistry } from '../engine/FeatureSystem';
import { registry } from '../engine/FractalRegistry';
import { VirtualSpace } from '../engine/PrecisionMath'; // Added Import
import * as THREE from 'three';

// Helper to clean up Three.js objects for JSON serialization
export const sanitizeFeatureState = (state: any) => {
    const out: any = {};
    if (!state) return out;
    Object.keys(state).forEach(key => {
        if (key.startsWith('is')) return;
        const val = state[key];
        if (val && typeof val === 'object' && val.isColor) {
            out[key] = '#' + val.getHexString();
        } else if (val && typeof val === 'object' && (val.isVector2 || val.isVector3)) {
            out[key] = { ...val };
            delete out[key].isVector2;
            delete out[key].isVector3;
        } else {
            out[key] = val;
        }
    });
    return out;
};

export const getFullDefaultPreset = (formula: string): Preset => {
    const def = registry.get(formula as any);
    const formulaDefault: Partial<Preset> = (def && def.defaultPreset) ? def.defaultPreset : { formula: formula as any };
    const full: Preset = {
        version: 5,
        name: formula, // Default name matches formula ID
        formula: formula as any,
        features: {}
    };

    featureRegistry.getAll().forEach(feat => {
        const featDefaults: any = {};
        Object.entries(feat.params).forEach(([key, config]) => {
            if (!config.composeFrom) featDefaults[key] = config.default;
        });
        full.features![feat.id] = sanitizeFeatureState(featDefaults);
    });

    if (formulaDefault.features) {
        Object.entries(formulaDefault.features).forEach(([featId, data]) => {
            if (full.features![featId]) {
                full.features![featId] = { ...full.features![featId], ...sanitizeFeatureState(data) };
            } else {
                full.features![featId] = sanitizeFeatureState(data);
            }
        });
    }

    // Direct Lighting Array Mapping
    if (formulaDefault.lights) {
        if (!full.features!['lighting']) full.features!['lighting'] = {};
        full.features!['lighting'].lights = formulaDefault.lights;
    }

    // Map Legacy Render Mode to DDFS Lighting
    if (formulaDefault.renderMode) {
        if (!full.features!['lighting']) full.features!['lighting'] = {};
        full.features!['lighting'].renderMode = formulaDefault.renderMode === 'PathTracing' ? 1.0 : 0.0;
    }

    full.cameraMode = formulaDefault.cameraMode || 'Orbit';
    full.quality = { aaMode: 'Always', aaLevel: 1, msaa: 1, accumulation: true, ...(formulaDefault.quality || {}) };
    full.lights = []; 
    full.animations = formulaDefault.animations || [];
    full.navigation = { flySpeed: 0.5, autoSlow: true, ...(formulaDefault.navigation || {}) };
    full.sceneOffset = formulaDefault.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
    full.cameraPos = formulaDefault.cameraPos || { x: 0, y: 0, z: 3.5 };
    full.cameraRot = formulaDefault.cameraRot || { x: 0, y: 0, z: 0, w: 1 };
    full.targetDistance = formulaDefault.targetDistance || 3.5;
    full.duration = formulaDefault.duration || 300;
    full.sequence = formulaDefault.sequence || { durationFrames: 300, fps: 30, tracks: {} };
    return full;
};

export const applyPresetState = (p: Partial<Preset>, set: any, get: any) => {
    const actions = get();

    // Create map of features
    const features = p.features || {};

    // MIGRATION: Root RenderMode -> Lighting Feature
    if (p.renderMode) {
        if (!features.lighting) features.lighting = {};
        // Only set if not already present in feature block
        if (features.lighting.renderMode === undefined) {
            features.lighting.renderMode = p.renderMode === 'PathTracing' ? 1.0 : 0.0;
        }
    }

    // MIGRATION: AO from Atmosphere -> AO Feature
    if (features.atmosphere && !features.ao) {
        const aoData: any = {};
        if (features.atmosphere.aoIntensity !== undefined) aoData.aoIntensity = features.atmosphere.aoIntensity;
        if (features.atmosphere.aoSpread !== undefined) aoData.aoSpread = features.atmosphere.aoSpread;
        if (features.atmosphere.aoMode !== undefined) aoData.aoMode = features.atmosphere.aoMode;
        if (features.atmosphere.aoEnabled !== undefined) aoData.aoEnabled = features.atmosphere.aoEnabled;
        
        if (Object.keys(aoData).length > 0) {
             features.ao = aoData;
        }
    }

    featureRegistry.getAll().forEach(feat => {
        const setterName = `set${feat.id.charAt(0).toUpperCase() + feat.id.slice(1)}`;
        const setter = (actions as any)[setterName];
        
        if (typeof setter === 'function') {
            const incomingData = features[feat.id];
            const nextState: Record<string, any> = {};

            if (feat.state) Object.assign(nextState, feat.state);
            
            Object.entries(feat.params).forEach(([key, config]) => {
                if (incomingData && incomingData[key] !== undefined) {
                    let val = incomingData[key];
                    // Sanitize incoming vectors/colors back to THREE objects if needed
                    if (config.type === 'vec2' && val && !(val instanceof THREE.Vector2)) {
                        val = new THREE.Vector2(val.x, val.y);
                    } else if (config.type === 'vec3' && val && !(val instanceof THREE.Vector3)) {
                        val = new THREE.Vector3(val.x, val.y, val.z);
                    } else if (config.type === 'color' && val && !(val instanceof THREE.Color)) {
                        val = new THREE.Color(val);
                    }
                    nextState[key] = val;
                } else if (nextState[key] === undefined) {
                    let val = config.default;
                    if (val && typeof val === 'object') {
                        if (typeof val.clone === 'function') val = val.clone();
                        else if (Array.isArray(val)) val = [...val];
                        else val = { ...val };
                    }
                    nextState[key] = val;
                }
            });
            
            // Consolidated Lighting Migration
            if (feat.id === 'lighting' && incomingData) {
                if (incomingData.lights) {
                    nextState.lights = incomingData.lights;
                } else if (incomingData.light0_posX !== undefined) {
                    // V2 Legacy Migration
                    const newLights = [];
                    for(let i=0; i<3; i++) {
                        if (incomingData[`light${i}_posX`] !== undefined) {
                            let color = incomingData[`light${i}_color`] || '#ffffff';
                            if (color.getHexString) color = '#' + color.getHexString();
                            
                            newLights.push({
                                position: { x: incomingData[`light${i}_posX`], y: incomingData[`light${i}_posY`], z: incomingData[`light${i}_posZ`] },
                                color,
                                intensity: incomingData[`light${i}_intensity`] ?? 1,
                                falloff: incomingData[`light${i}_falloff`] ?? 0,
                                falloffType: incomingData[`light${i}_type`] ? 'Linear' : 'Quadratic',
                                fixed: incomingData[`light${i}_fixed`] ?? false,
                                visible: incomingData[`light${i}_visible`] ?? (i===0),
                                castShadow: incomingData[`light${i}_castShadow`] ?? true
                            });
                        }
                    }
                    if (newLights.length > 0) nextState.lights = newLights;
                }
            }

            setter(nextState);
        }
    });

    // Root Legacy Lights Array Migration
    if (p.lights && p.lights.length > 0) {
        if (actions.setLighting) actions.setLighting({ lights: p.lights });
    }
    
    // Animations & Timeline
    if (p.sequence) useAnimationStore.getState().setSequence(p.sequence);
    actions.setAnimations(p.animations || []);
    
    // --- CORE SCENE STATE NORMALIZATION ---
    // Critical Fix: Ensure camera is at (0,0,0) locally for the Treadmill Engine.
    // We absorb the Preset's Camera Position into the Scene Offset.
    
    const rawPos = p.cameraPos || { x: 0, y: 0, z: 3.5 };
    const rawOffset = p.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
    const dist = p.targetDistance || 3.5;
    const rot = p.cameraRot || { x: 0, y: 0, z: 0, w: 1 };

    // Calculate Unified (World) Position
    const totalX = rawOffset.x + rawOffset.xL + rawPos.x;
    const totalY = rawOffset.y + rawOffset.yL + rawPos.y;
    const totalZ = rawOffset.z + rawOffset.zL + rawPos.z;

    // Re-Split into High Precision Offset
    const sX = VirtualSpace.split(totalX);
    const sY = VirtualSpace.split(totalY);
    const sZ = VirtualSpace.split(totalZ);
    
    const finalOffset = { 
        x: sX.high, y: sY.high, z: sZ.high, 
        xL: sX.low, yL: sY.low, zL: sZ.low 
    };
    
    // Camera stays at origin
    const finalPos = { x: 0, y: 0, z: 0 };

    set({
        cameraPos: finalPos,
        cameraRot: rot,
        targetDistance: dist,
        sceneOffset: finalOffset,
        cameraMode: p.cameraMode || get().cameraMode
    });

    if (engine.activeCamera) {
        // Apply to Engine
        engine.virtualSpace.applyCameraState(engine.activeCamera, {
            position: finalPos, 
            rotation: rot, 
            sceneOffset: finalOffset, 
            targetDistance: dist
        });
    }
    
    // Emit teleport with the CLEAN (Zeroed) position to update Navigation/OrbitControls
    FractalEvents.emit('camera_teleport', { 
        position: finalPos, 
        rotation: rot, 
        sceneOffset: finalOffset, 
        targetDistance: dist 
    });

    if (p.duration) useAnimationStore.getState().setDuration(p.duration);
    if (p.formula === 'Modular') actions.refreshPipeline();
    
    actions.refreshHistogram();
    FractalEvents.emit('reset_accum', undefined);
};
