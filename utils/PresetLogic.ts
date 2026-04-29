
import { Preset } from '../types';
import type { FractalActions } from '../types/store';
import type { LightParams } from '../types/graphics';
import type { FormulaType } from '../types/common';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { FractalEvents } from '../engine/FractalEvents';
import { useAnimationStore } from '../store/animationStore';
import { featureRegistry } from '../engine/FeatureSystem';
import { registry } from '../engine/FractalRegistry';
import { VirtualSpace } from '../engine/PrecisionMath'; // Added Import
import * as THREE from 'three';
import { ensureLightIds } from '../features/lighting/index';

// Helper to clean up Three.js objects for JSON serialization
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

export const getFullDefaultPreset = (formula: string): Preset => {
    const def = registry.get(formula);
    const formulaDefault: Partial<Preset> = (def && def.defaultPreset) ? def.defaultPreset : { formula: formula as FormulaType };
    const full: Preset = {
        version: 5,
        name: formula,
        formula: formula as FormulaType,
        features: {}
    };

    featureRegistry.getAll().forEach(feat => {
        const featDefaults: Record<string, unknown> = {};
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
    // cameraPos is a preset-format-only field for backwards compatibility.
    // At runtime the store has no cameraPos — applyPresetState() absorbs it into sceneOffset.
    full.cameraPos = formulaDefault.cameraPos || { x: 0, y: 0, z: 3.5 };
    full.cameraRot = formulaDefault.cameraRot || { x: 0, y: 0, z: 0, w: 1 };
    full.targetDistance = formulaDefault.targetDistance || 3.5;
    full.duration = formulaDefault.duration || 300;
    full.sequence = formulaDefault.sequence || { durationFrames: 300, fps: 30, tracks: {} };
    return full;
};

export const applyPresetState = (p: Partial<Preset>, set: (partial: Record<string, unknown>) => void, get: () => Record<string, unknown>) => {
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
        const aoData: Record<string, unknown> = {};
        if (features.atmosphere.aoIntensity !== undefined) aoData.aoIntensity = features.atmosphere.aoIntensity;
        if (features.atmosphere.aoSpread !== undefined) aoData.aoSpread = features.atmosphere.aoSpread;
        if (features.atmosphere.aoMode !== undefined) aoData.aoMode = features.atmosphere.aoMode;
        if (features.atmosphere.aoEnabled !== undefined) aoData.aoEnabled = features.atmosphere.aoEnabled;
        
        if (Object.keys(aoData).length > 0) {
             features.ao = aoData;
        }
    }

    // Hardware-managed params are owned by the hardware profile, not by scenes.
    // Preserve current store values so loading a formula/scene doesn't downgrade them.
    const HARDWARE_MANAGED_PARAMS = new Set(['compilerHardCap', 'precisionMode', 'bufferPrecision']);

    featureRegistry.getAll().forEach(feat => {
        const setterName = `set${feat.id.charAt(0).toUpperCase() + feat.id.slice(1)}`;
        const setter = (actions as any)[setterName];

        if (typeof setter === 'function') {
            const incomingData = features[feat.id];
            const nextState: Record<string, unknown> = {};
            // Snapshot current quality slice so we can preserve hardware-managed params
            const currentSlice = feat.id === 'quality' ? (get() as any).quality : null;

            if (feat.state) Object.assign(nextState, feat.state);

            Object.entries(feat.params).forEach(([key, config]) => {
                // Hardware-managed params: keep current store value, ignore scene data
                if (feat.id === 'quality' && HARDWARE_MANAGED_PARAMS.has(key) && currentSlice) {
                    nextState[key] = currentSlice[key];
                    return;
                }

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
                    // Populate missing new fields (type, rotation) and ensure stable IDs
                    nextState.lights = ensureLightIds(incomingData.lights.map((l: Record<string, unknown>) => ({
                        ...l,
                        type: l.type || 'Point',
                        rotation: l.rotation || { x: 0, y: 0, z: 0 }
                    })) as any);
                } else if (incomingData.light0_posX !== undefined) {
                    // V2 Legacy Migration
                    const newLights = [];
                    for(let i=0; i<3; i++) {
                        if (incomingData[`light${i}_posX`] !== undefined) {
                            let color = incomingData[`light${i}_color`] || '#ffffff';
                            if (color.getHexString) color = '#' + color.getHexString();
                            
                            newLights.push({
                                type: 'Point',
                                position: { x: incomingData[`light${i}_posX`], y: incomingData[`light${i}_posY`], z: incomingData[`light${i}_posZ`] },
                                rotation: { x: 0, y: 0, z: 0 },
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

            // Migration: Materials envMapVisible -> envBackgroundStrength
            if (feat.id === 'materials' && incomingData) {
                if (incomingData.envMapVisible !== undefined && incomingData.envBackgroundStrength === undefined) {
                    // Convert boolean visibility to float strength (0.0 or 1.0)
                    nextState.envBackgroundStrength = incomingData.envMapVisible ? 1.0 : 0.0;
                }
            }

            setter(nextState);
        }
    });

    // Root Legacy Lights Array Migration
    if (p.lights && p.lights.length > 0) {
        const setLightingFn = (actions as Record<string, unknown>).setLighting;
        if (typeof setLightingFn === 'function') {
             const migratedLights = ensureLightIds(p.lights.map((l) => ({
                 ...l,
                 type: l.type || 'Point',
                 rotation: l.rotation || { x: 0, y: 0, z: 0 }
             })) as LightParams[]);
             (setLightingFn as (v: { lights: LightParams[] }) => void)({ lights: migratedLights });
        }
    }
    
    // ── Modular pipeline / graph restoration ──
    // Without this, applyPresetState silently drops the saved pipeline +
    // graph — the worker keeps the default JULIA_REPEATER pipeline and the
    // loaded scene renders with default Modular params until the user hits
    // recompile. Bumping pipelineRevision is what triggers ConfigManager to
    // schedule a rebuild; the explicit CONFIG emit ensures the loaded pipeline
    // reaches the worker before the compile fires (the formula-only CONFIG
    // emitted by loadPreset above would otherwise schedule against defaults).
    if (Array.isArray((p as any).pipeline)) {
        const store = get();
        const nextRev = ((store as any).pipelineRevision ?? 0) + 1;
        const update: Record<string, unknown> = {
            pipeline: (p as any).pipeline,
            pipelineRevision: nextRev,
        };
        if ((p as any).graph) update.graph = (p as any).graph;
        set(update);
        FractalEvents.emit('config', {
            pipeline: (p as any).pipeline,
            graph: (p as any).graph,
            pipelineRevision: nextRev,
        } as any);
    }

    // Animations & Timeline
    if (p.sequence) useAnimationStore.getState().setSequence(p.sequence);
    (actions as unknown as FractalActions).setAnimations(p.animations || []);
    
    // --- RESTORE SAVED CAMERAS ---
    if (p.savedCameras && Array.isArray(p.savedCameras) && p.savedCameras.length > 0) {
        set({
            savedCameras: p.savedCameras as any,
            activeCameraId: p.savedCameras[0].id || null
        });
    }

    // --- CORE SCENE STATE NORMALIZATION ---
    // Presets may carry a non-zero cameraPos (legacy format / formula defaults).
    // We absorb it into sceneOffset so the runtime camera stays at origin.

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
    
    set({
        cameraRot: rot,
        targetDistance: dist,
        sceneOffset: finalOffset,
        cameraMode: p.cameraMode || get().cameraMode
    });

    if (engine.activeCamera && engine.virtualSpace) {
        // Apply to Engine
        engine.virtualSpace.applyCameraState(engine.activeCamera, {
            position: { x: 0, y: 0, z: 0 }, 
            rotation: rot, 
            sceneOffset: finalOffset, 
            targetDistance: dist
        });
    }
    
    // Stash + emit teleport with the CLEAN (Zeroed) position.
    // The stash on WorkerProxy ensures WorkerTickScene can re-emit this exact
    // payload at boot-ready time — avoiding races with Navigation mount timing
    // and any store drift from orbit/physics ticks.
    const teleport = {
        position: { x: 0, y: 0, z: 0 },
        rotation: rot,
        sceneOffset: finalOffset,
        targetDistance: dist
    };
    engine.pendingTeleport = teleport;
    FractalEvents.emit('camera_teleport', teleport);

    if (p.duration) useAnimationStore.getState().setDuration(p.duration);
    if (p.formula === 'Modular') (actions as unknown as FractalActions).refreshPipeline();

    (actions as unknown as FractalActions).refreshHistogram();
    FractalEvents.emit('reset_accum', undefined);
};
