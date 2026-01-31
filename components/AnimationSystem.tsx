
import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { animationEngine } from '../engine/AnimationEngine';
import { useFractalStore } from '../store/fractalStore';
import { useAnimationStore } from '../store/animationStore';
import { engine } from '../engine/FractalEngine';
import { featureRegistry } from '../engine/FeatureSystem';
import { audioAnalysisEngine } from '../features/audioMod/AudioAnalysisEngine';
import { modulationEngine } from '../features/modulation/ModulationEngine';
import { AudioState } from '../features/audioMod';
import { ModulationState } from '../features/modulation';
import { GeometryState } from '../features/geometry';
import { ColoringState } from '../features/coloring';
import { evaluateTrackValue } from '../utils/timelineUtils';

export const AnimationSystem: React.FC = () => {
    const activeTargetsRef = useRef<Set<string>>(new Set());
    const juliaScratch = useMemo(() => new THREE.Vector3(), []);
    
    // Scratch objects for Matrix calculation to avoid GC
    const mat4Scratch = useMemo(() => new THREE.Matrix4(), []);
    const mat3Scratch = useMemo(() => new THREE.Matrix3(), []);
    
    // Track last rotation state to optimize updates
    const lastRotation = useRef(new THREE.Vector3(-1000, -1000, -1000));
    
    // Cache recording state to avoid re-querying store every frame if possible
    const lastFrameRecorded = useRef(-1);
    
    // Store initial static values for modulation recording (prevent feedback loop on new tracks)
    const initialStaticValues = useRef<Record<string, number>>({});

    // Reset static values when recording starts
    const isRecordingModulation = useAnimationStore(s => s.isRecordingModulation);
    
    useEffect(() => {
        if (isRecordingModulation) {
            initialStaticValues.current = {};
            lastFrameRecorded.current = -1;
        } else {
             // Clear overrides when not recording
             animationEngine.setOverriddenTracks(new Set());
        }
    }, [isRecordingModulation]);

    // Main Loop (Vanilla RAF)
    useEffect(() => {
        let rafId: number;
        let lastTime = performance.now();

        const loop = () => {
            const now = performance.now();
            // Cap delta to prevent massive jumps on tab wake
            const delta = Math.min((now - lastTime) / 1000, 0.1); 
            lastTime = now;
            const time = now / 1000;

            const animStore = useAnimationStore.getState();
            const storeState = useFractalStore.getState();
            
            // 1. Tick Animation Timeline (Keyframes)
            animationEngine.tick(delta);
    
            const modulationSlice = (storeState as any).modulation as ModulationState;
            const audioSlice = (storeState as any).audio as AudioState;
            
            // 2. Update Audio Engine Hardware
            if (audioSlice && audioSlice.isEnabled) {
                audioAnalysisEngine.update(); 
            }
    
            // 3. Reset Engine Buffer
            modulationEngine.resetOffsets();
            engine.modulations = {}; // Reset engine buffer
    
            // 4. Update Oscillators
            const animations = storeState.animations;
            modulationEngine.updateOscillators(animations, time, delta);
    
            // 5. Process Modulation Rules
            if (modulationSlice && modulationSlice.rules) {
                 modulationEngine.update(modulationSlice.rules, delta);
            }
    
            // 6. Apply Results to Engine Uniforms (Bridge)
            const combinedOffsets = modulationEngine.offsets;
            const liveModulations: Record<string, number> = {};
            
            const currentTargets = new Set(Object.keys(combinedOffsets));
            const prevTargets = activeTargetsRef.current;
            
            const allTargetsToProcess = new Set<string>();
            for (const t of currentTargets) allTargetsToProcess.add(t);
            for (const t of prevTargets) allTargetsToProcess.add(t);
            
            let juliaX = 0, juliaY = 0, juliaZ = 0;
            let juliaDirty = false;
    
            let rotXOffset = 0, rotYOffset = 0, rotZOffset = 0;
            
            // Track if anything visual actually changed to reset accumulation
            let hasVisualChange = false;
            
            // Recording Check
            const currentFrame = Math.floor(animStore.currentFrame);
            // We use the ref version of isRecordingModulation to avoid effect re-runs, 
            // but we must read fresh from store inside loop or use the ref passed from prop/store
            const isRec = useAnimationStore.getState().isRecordingModulation;
            const shouldRecord = isRec && currentFrame > lastFrameRecorded.current;
            
            if (shouldRecord) lastFrameRecorded.current = currentFrame;
    
            // BATCH: Collect keys to record here, update store ONCE at end of frame
            const keysToRecord: { trackId: string, value: number }[] = [];
    
            // Inform AnimationEngine which tracks we are actively modulating, so it doesn't fight us
            if (isRec && allTargetsToProcess.size > 0) {
                 animationEngine.setOverriddenTracks(allTargetsToProcess);
            }
    
            allTargetsToProcess.forEach(targetKey => {
                const isRemoved = !currentTargets.has(targetKey);
                const offset = isRemoved ? 0 : (combinedOffsets[targetKey] ?? 0);
                
                // Only consider it a "change" if the value is non-zero
                if (Math.abs(offset) > 0.0001) hasVisualChange = true;
                
                // F. Standard Feature Params & DDFS Lookup (Moved Up for Base Value Logic)
                let resolvedBase = 0;
                let uniformName = '';
                let isNoReset = false;
                
                // --- BASE VALUE RESOLUTION ---
                if (targetKey.includes('.')) {
                    const [featureId, paramId] = targetKey.split('.');
                    const feature = featureRegistry.get(featureId);
                    const slice = (storeState as any)[featureId];
                    if (feature && slice) {
                        const paramConfig = feature.params[paramId];
                        if (paramConfig) {
                            // 1. Get Base Value
                            if (typeof slice[paramId] === 'number') {
                                resolvedBase = slice[paramId];
                            }
                            // 2. Get Uniform Name
                            if (paramConfig.uniform) {
                                uniformName = paramConfig.uniform;
                            }
                            if (paramConfig.noReset) isNoReset = true;
                        }
                    }
                } else {
                     // Legacy Root Params
                     if (targetKey === 'iterations') {
                         uniformName = 'uIterations';
                         resolvedBase = storeState.coreMath?.iterations ?? 0;
                     } else if (targetKey.startsWith('param')) {
                         uniformName = 'u' + targetKey.charAt(0).toUpperCase() + targetKey.slice(1);
                         resolvedBase = (storeState.coreMath as any)?.[targetKey] ?? 0;
                     }
                }
    
                // --- RECORDING LOGIC (With Feedback Loop Prevention) ---
                if (shouldRecord && Math.abs(offset) > 0.000001) {
                    // If recording, we must use the CLEAN base value, not the dirty store value (which has prev recorded mods)
                    let cleanBase = resolvedBase;
                    
                    // 1. Try to get value from Snapshot Sequence (if track existed before recording)
                    const snapshotSeq = animStore.recordingSnapshot;
                    if (snapshotSeq && snapshotSeq.tracks[targetKey]) {
                        const track = snapshotSeq.tracks[targetKey];
                        const isRotation = targetKey.includes('rotation');
                        cleanBase = evaluateTrackValue(track.keyframes, animStore.currentFrame, isRotation);
                    } else {
                        // 2. If no track, use Initial Static Value (captured at start of recording)
                        if (initialStaticValues.current[targetKey] === undefined) {
                            initialStaticValues.current[targetKey] = resolvedBase;
                        }
                        cleanBase = initialStaticValues.current[targetKey];
                    }
    
                    // Instead of calling addKeyframe immediately, push to batch
                    keysToRecord.push({
                        trackId: targetKey,
                        value: cleanBase + offset
                    });
                    
                    // Important: We still want to SHOW the modulated value in the UI
                    resolvedBase = cleanBase; 
                }
    
                // --- APPLY TO SHADER ---
    
                // A. Coloring Repeats/Phase Special Case
                if (targetKey.startsWith('coloring.')) {
                    if (targetKey === 'coloring.repeats') {
                        const c = (storeState as any).coloring as ColoringState;
                        if (c && Math.abs(c.repeats) > 0.001) {
                            const effectiveBase = shouldRecord ? resolvedBase : c.repeats;
                            const ratio = c.scale / effectiveBase; 
                            const finalScale = (effectiveBase + offset) * ratio;
                            if (!isRemoved) liveModulations[targetKey] = effectiveBase + offset;
                            engine.setUniform('uColorScale', finalScale);
                        }
                        return;
                    }
                    if (targetKey === 'coloring.phase') {
                        const c = (storeState as any).coloring as ColoringState;
                        const effectiveBase = shouldRecord ? resolvedBase : c.phase;
                        if (!isRemoved) liveModulations[targetKey] = effectiveBase + offset;
                        engine.setUniform('uColorOffset', c.offset + offset);
                        return;
                    }
                    // ... same for repeats2/phase2 ...
                    if (targetKey === 'coloring.repeats2') {
                        const c = (storeState as any).coloring as ColoringState;
                        if (c && Math.abs(c.repeats2) > 0.001) {
                            const effectiveBase = shouldRecord ? resolvedBase : c.repeats2;
                            const ratio = c.scale2 / effectiveBase;
                            const finalScale = (effectiveBase + offset) * ratio;
                            if (!isRemoved) liveModulations[targetKey] = effectiveBase + offset;
                            engine.setUniform('uColorScale2', finalScale);
                        }
                        return;
                    }
                    if (targetKey === 'coloring.phase2') {
                        const c = (storeState as any).coloring as ColoringState;
                        const effectiveBase = shouldRecord ? resolvedBase : c.phase2;
                        if (!isRemoved) liveModulations[targetKey] = effectiveBase + offset;
                        engine.setUniform('uColorOffset2', c.offset2 + offset);
                        return;
                    }
                }
    
                // B. Julia Vector Composite
                if (targetKey.startsWith('julia.') || targetKey.startsWith('geometry.julia')) {
                    const g = (storeState as any).geometry;
                    const baseX = g?.juliaX ?? 0;
                    const baseY = g?.juliaY ?? 0;
                    const baseZ = g?.juliaZ ?? 0;
                    
                    if (targetKey.endsWith('juliaX') || targetKey.endsWith('x')) { 
                        juliaX = baseX + offset; liveModulations[targetKey] = juliaX;
                        if (shouldRecord) keysToRecord.push({ trackId: 'geometry.juliaX', value: juliaX });
                    } else if (targetKey.endsWith('juliaY') || targetKey.endsWith('y')) { 
                        juliaY = baseY + offset; liveModulations[targetKey] = juliaY;
                        if (shouldRecord) keysToRecord.push({ trackId: 'geometry.juliaY', value: juliaY });
                    } else if (targetKey.endsWith('juliaZ') || targetKey.endsWith('z')) { 
                        juliaZ = baseZ + offset; liveModulations[targetKey] = juliaZ;
                        if (shouldRecord) keysToRecord.push({ trackId: 'geometry.juliaZ', value: juliaZ });
                    }
                    juliaDirty = true;
                    return;
                }
    
                // C. Camera Modulation
                if (targetKey.startsWith('camera.')) {
                    if (targetKey.startsWith('camera.unified')) {
                        if (targetKey.endsWith('x')) { engine.modulations['camera.unified.x'] = offset; }
                        else if (targetKey.endsWith('y')) { engine.modulations['camera.unified.y'] = offset; }
                        else if (targetKey.endsWith('z')) { engine.modulations['camera.unified.z'] = offset; }
                    } else if (targetKey.startsWith('camera.rotation')) {
                        if (targetKey.endsWith('x')) { engine.modulations['camera.rotation.x'] = offset; }
                        else if (targetKey.endsWith('y')) { engine.modulations['camera.rotation.y'] = offset; }
                        else if (targetKey.endsWith('z')) { engine.modulations['camera.rotation.z'] = offset; }
                    }
                    liveModulations[targetKey] = offset; // Just display offset for camera
                    return;
                }
    
                // D. Geometry Pre-Rotation
                if (targetKey.startsWith('geometry.preRot')) {
                    if (targetKey.endsWith('X')) { rotXOffset = offset; liveModulations[targetKey] = offset; }
                    else if (targetKey.endsWith('Y')) { rotYOffset = offset; liveModulations[targetKey] = offset; }
                    else if (targetKey.endsWith('Z')) { rotZOffset = offset; liveModulations[targetKey] = offset; }
                    return;
                }
    
                // E. Lighting Array
                if (targetKey.startsWith('lighting.light')) {
                    const match = targetKey.match(/lighting\.light(\d+)_(\w+)/);
                    if (match) {
                        const idx = parseInt(match[1]);
                        const prop = match[2];
                        
                        const lights = (storeState as any).lighting?.lights;
                        if (lights && lights[idx]) {
                            const l = lights[idx];
                            let baseVal = 0;
                            let valid = false;
    
                            if (prop === 'intensity') { baseVal = l.intensity; valid = true; }
                            else if (prop === 'falloff') { baseVal = l.falloff; valid = true; }
                            else if (prop === 'posX') { baseVal = l.position.x; valid = true; }
                            else if (prop === 'posY') { baseVal = l.position.y; valid = true; }
                            else if (prop === 'posZ') { baseVal = l.position.z; valid = true; }
                            
                            if (valid) {
                                if (shouldRecord) {
                                    // Re-implement Clean Base logic for Lights
                                    let cleanBase = baseVal;
                                    if (animStore.recordingSnapshot && animStore.recordingSnapshot.tracks[targetKey]) {
                                        cleanBase = evaluateTrackValue(animStore.recordingSnapshot.tracks[targetKey].keyframes, animStore.currentFrame, false);
                                    } else {
                                         if (initialStaticValues.current[targetKey] === undefined) initialStaticValues.current[targetKey] = baseVal;
                                         cleanBase = initialStaticValues.current[targetKey];
                                    }
                                    
                                    // BATCH
                                    keysToRecord.push({ trackId: targetKey, value: cleanBase + offset });
                                    
                                    // Update live mod for UI
                                    liveModulations[targetKey] = cleanBase + offset;
                                } else {
                                    liveModulations[targetKey] = baseVal + offset;
                                }
                                
                                engine.modulations[targetKey] = offset; 
                            }
                        }
                    }
                    return;
                }
                
                // Apply Standard Uniforms
                if (uniformName) {
                    const finalVal = resolvedBase + offset;
                    if (!isRemoved) {
                        liveModulations[targetKey] = finalVal;
                    }
                    engine.setUniform(uniformName, finalVal, isNoReset);
                }
            });
    
            // --- EXECUTE BATCH RECORDING ---
            if (keysToRecord.length > 0) {
                animStore.batchAddKeyframes(currentFrame, keysToRecord, 'Linear');
            }
    
            // Apply Julia Composite
            if (juliaDirty) {
                 const geom = (storeState as any).geometry;
                 if (liveModulations['geometry.juliaX'] === undefined && liveModulations['julia.x'] === undefined) juliaX = geom?.juliaX ?? 0;
                 if (liveModulations['geometry.juliaY'] === undefined && liveModulations['julia.y'] === undefined) juliaY = geom?.juliaY ?? 0;
                 if (liveModulations['geometry.juliaZ'] === undefined && liveModulations['julia.z'] === undefined) juliaZ = geom?.juliaZ ?? 0;
                 
                 juliaScratch.set(juliaX, juliaY, juliaZ);
                 engine.setUniform('uJulia', juliaScratch);
            }
    
            // Apply Rotation Matrix Composite (Authoritative)
            const geom = (storeState as any).geometry as GeometryState;
            if (geom && geom.preRotMaster) {
                 const finalX = geom.preRotX + rotXOffset;
                 const finalY = geom.preRotY + rotYOffset;
                 const finalZ = geom.preRotZ + rotZOffset;
    
                 if (Math.abs(finalX - lastRotation.current.x) > 1e-6 || 
                     Math.abs(finalY - lastRotation.current.y) > 1e-6 || 
                     Math.abs(finalZ - lastRotation.current.z) > 1e-6) {
                     
                     const mx = new THREE.Matrix4().makeRotationX(finalX);
                     const my = new THREE.Matrix4().makeRotationY(finalY);
                     const mz = new THREE.Matrix4().makeRotationZ(finalZ);
                     
                     mat4Scratch.identity().multiply(mz).multiply(mx).multiply(my);
                     mat3Scratch.setFromMatrix4(mat4Scratch);
                     
                     engine.setUniform('uPreRotMatrix', mat3Scratch);
                     lastRotation.current.set(finalX, finalY, finalZ);
                     // Rotation definitely changes the image
                     hasVisualChange = true;
                 }
            }
    
            // --- CRITICAL: Reset Accumulation if Visuals Changed ---
            if (hasVisualChange) {
                engine.resetAccumulation();
            }
    
            // Sync to UI (Visual Feedback)
            if (Object.keys(liveModulations).length > 0 || Object.keys(storeState.liveModulations).length > 0) {
                useFractalStore.getState().setLiveModulations(liveModulations);
            }
            
            activeTargetsRef.current = currentTargets;
            
            rafId = requestAnimationFrame(loop);
        };
        
        rafId = requestAnimationFrame(loop);
        
        return () => {
             cancelAnimationFrame(rafId);
        };
    }, []); // Run once on mount

    return null;
};
