/**
 * AnimationSystem — modulation tick dispatcher.
 *
 * Ex-`legacy-gmt/AnimationSystem.tsx`. The tick runs the generic DDFS
 * modulation path (animationEngine.tick → modulationEngine oscillators /
 * rules → per-target base+offset resolution → liveModulations) AND four
 * GMT-specific composite branches (coloring repeats/phase, julia vector
 * composite, geometry pre/post/world rotation, lighting light-array).
 * Each GMT branch is GATED by slice existence (`storeState.geometry`,
 * `storeState.coloring`, `storeState.lighting`) so apps without those
 * slices fall through to the generic path untouched.
 *
 * FUTURE REFACTOR — branch registry:
 *   The GMT-specific branches should move into engine-gmt via a
 *   `registerModulationBranch()` extension point. Until that lands, the
 *   gating keeps cross-contamination out and this file is allowed to
 *   know about GMT slice names.
 */

import React from 'react';
import * as THREE from 'three';
import { animationEngine } from '../AnimationEngine';
import { useEngineStore } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';
import { getProxy } from '../worker/WorkerProxy';
import { FractalEvents, FRACTAL_EVENTS } from '../FractalEvents';
const engine = getProxy();

// Uniform writes flow through FRACTAL_EVENTS.UNIFORM so apps that have
// installed a real worker-proxy bridge (engine-gmt via
// GmtRendererTickDriver) receive them. Engine-core's WorkerProxy
// is a stub — calling engine.setUniform directly would be a no-op and
// the modulated uniform never reaches the render pipeline.
const emitUniform = (key: string, value: unknown, noReset = false) => {
    FractalEvents.emit(FRACTAL_EVENTS.UNIFORM, { key, value, noReset });
};
const emitResetAccum = () => {
    FractalEvents.emit(FRACTAL_EVENTS.RESET_ACCUM, undefined);
};

import { featureRegistry } from '../FeatureSystem';
import { audioAnalysisEngine } from '../features/audioMod/AudioAnalysisEngine';
import { modulationEngine } from '../features/modulation/ModulationEngine';
import { AudioState } from '../features/audioMod';
import { ModulationState } from '../features/modulation';
// ColoringState was a fractal feature; treat as opaque here.
type ColoringState = Record<string, any>;
import { evaluateTrackValue } from '../../utils/timelineUtils';

// Global refs for animation system state
const activeTargetsRef = { current: new Set<string>() };
const juliaScratch = new THREE.Vector3();
const lastFrameRecorded = { current: -1 };
const initialStaticValues = { current: {} as Record<string, number> };
// Tracks isRecordingModulation across ticks so the per-tick driver
// can run the on-start / on-stop transitions itself instead of
// relying on a React useEffect (the legacy AnimationSystem component
// only mounts in <ViewportArea>; app-gmt uses ViewportFrame and
// therefore never fires that effect — leaving overriddenTracks set
// after recording stopped, which silently broke timeline playback
// for any track that was being modulated during the recording).
const prevIsRec = { current: false };
const EMPTY_OVERRIDES: Set<string> = new Set();

// Exported tick function for orchestrator pattern
export const tick = (delta: number) => {
    const animStore = useAnimationStore.getState();
    const storeState = useEngineStore.getState();

    // Recording-on/off transitions. Used to live in the React component
    // <AnimationSystem />'s useEffect, but app-gmt never mounts that
    // component, so the cleanup never ran and overriddenTracks stayed
    // populated after recording — blocking the timeline from driving
    // the recorded params on playback. Run from the tick instead so
    // the lifecycle is self-contained.
    const isRecNow = animStore.isRecordingModulation;
    if (isRecNow !== prevIsRec.current) {
        if (isRecNow) {
            initialStaticValues.current = {};
            lastFrameRecorded.current = -1;
        } else {
            // Recording just stopped — clear overrides so AnimationEngine
            // .scrub stops skipping the recorded tracks during playback.
            animationEngine.setOverriddenTracks(EMPTY_OVERRIDES);
        }
        prevIsRec.current = isRecNow;
    }

    // OPTIMIZATION: Skip animation if nothing is animated or oscillating
    const trackCount = Object.keys(animStore.sequence.tracks).length;
    const hasAnimations = trackCount > 0;
    const hasOscillators = storeState.animations.length > 0;
    const hasModulationRules = (storeState as any).modulation?.rules?.length > 0;
    const isAudioEnabled = (storeState as any).audio?.isEnabled ?? false;

    // The cleanup branch below relies on `activeTargetsRef.current` to know
    // which targets were modulated last frame so it can emit a baseline
    // uniform write + clear liveModulations on removal. When the user
    // deletes the last LFO, hasOscillators flips to false and an early
    // return here would skip that flush — leaving the uniform stuck at
    // its final modulated value and liveModulations stale forever. Stay
    // through one more pass when prev-frame targets remain, then on the
    // tick after that everything legitimately is empty and we early-out.
    if (
        !hasAnimations && !hasOscillators && !hasModulationRules && !isAudioEnabled
        && activeTargetsRef.current.size === 0
    ) {
        return; // Skip all animation processing
    }
    
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
    //    Deterministic playback phases the oscillators by `currentFrame /
    //    fps` instead of `performance.now() / 1000`, so an LFO that's at
    //    phase 0.5 in the export is at phase 0.5 in the live preview too.
    const animations = storeState.animations;
    const deterministic = (animStore as { deterministicPlayback?: boolean }).deterministicPlayback;
    const oscTime = deterministic && animStore.isPlaying
        ? animStore.currentFrame / Math.max(1, animStore.fps)
        : performance.now() / 1000;
    const oscDt = deterministic && animStore.isPlaying
        ? 1 / Math.max(1, animStore.fps)
        : delta;
    modulationEngine.updateOscillators(animations, oscTime, oscDt);

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
    
    currentTargets.forEach(t => allTargetsToProcess.add(t));
    prevTargets.forEach(t => allTargetsToProcess.add(t));
    
    let juliaX = 0, juliaY = 0, juliaZ = 0;
    let juliaDirty = false;

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
        // Tracks whether the target resolved to a known DDFS param
        // (vec axis or scalar). Targets that don't resolve are still
        // processed by GMT's special-case branches above; the flag
        // controls whether the generic scalar fallback at the bottom
        // writes to liveModulations or skips to avoid polluting the
        // consumer map with zeros for unrecognized targets.
        let isDDFSResolved = false;

        // --- BASE VALUE RESOLUTION ---
        if (targetKey.includes('.')) {
            const [featureId, paramId] = targetKey.split('.');
            const feature = featureRegistry.get(featureId);
            const slice = (storeState as any)[featureId];
            if (feature && slice) {
                // Check for vector component target — UNDERSCORE form
                // (e.g. `juliaC_x`, `vec3A_y`). Generic: matches any
                // paramName ending in _x/_y/_z/_w when the base points
                // at a vec-shaped object in the slice. Falls through
                // to the scalar branch when the base is a scalar
                // (e.g. a param literally named `power_x`).
                const vectorMatch = paramId.match(/^(.+)_(x|y|z|w)$/);
                const vectorName = vectorMatch?.[1];
                if (vectorMatch && vectorName && slice[vectorName] && typeof slice[vectorName] === 'object') {
                    const axis = vectorMatch[2];
                    const paramConfig = feature.params[vectorName];
                    if (paramConfig) {
                        const vector = slice[vectorName];
                        resolvedBase = (vector as any)[axis] ?? 0;
                        if (paramConfig.uniform) {
                            // Map to individual uniform components
                            uniformName = `${paramConfig.uniform}_${axis}`;
                        }
                        if (paramConfig.noReset) isNoReset = true;
                        isDDFSResolved = true;
                    }
                } else {
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
                        isDDFSResolved = true;
                    }
                }
            }
        } else {
             // Legacy Root Params
             if (targetKey === 'iterations') {
                 uniformName = 'uIterations';
                 resolvedBase = (storeState as any).coreMath?.iterations ?? 0;
                 isDDFSResolved = true;
             } else if (targetKey.startsWith('param')) {
                 uniformName = 'u' + targetKey.charAt(0).toUpperCase() + targetKey.slice(1);
                 resolvedBase = (storeState as any).coreMath?.[targetKey] ?? 0;
                 isDDFSResolved = true;
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

        // A. Coloring Repeats/Phase Special Case — GMT-specific.
        //    Scoped to apps that have a `coloring` slice so engine-fork
        //    apps can register their own `coloring` feature without
        //    inheriting GMT's uColorScale/uColorOffset bindings.
        if (targetKey.startsWith('coloring.') && (storeState as any).coloring) {
            if (targetKey === 'coloring.repeats') {
                const c = (storeState as any).coloring as ColoringState;
                if (c && Math.abs(c.repeats) > 0.001) {
                    const effectiveBase = shouldRecord ? resolvedBase : c.repeats;
                    const ratio = c.scale / effectiveBase; 
                    const finalScale = (effectiveBase + offset) * ratio;
                    if (!isRemoved) liveModulations[targetKey] = effectiveBase + offset;
                    emitUniform('uColorScale', finalScale);
                }
                return;
            }
            if (targetKey === 'coloring.phase') {
                const c = (storeState as any).coloring as ColoringState;
                const effectiveBase = shouldRecord ? resolvedBase : c.phase;
                if (!isRemoved) liveModulations[targetKey] = effectiveBase + offset;
                emitUniform('uColorOffset', c.offset + offset);
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
                    emitUniform('uColorScale2', finalScale);
                }
                return;
            }
            if (targetKey === 'coloring.phase2') {
                const c = (storeState as any).coloring as ColoringState;
                const effectiveBase = shouldRecord ? resolvedBase : c.phase2;
                if (!isRemoved) liveModulations[targetKey] = effectiveBase + offset;
                emitUniform('uColorOffset2', c.offset2 + offset);
                return;
            }
        }

        // B. Julia Vector Composite — GMT-specific (`geometry.juliaX/Y/Z` →
        //    `uJulia` composite). Scoped to apps that have a `geometry`
        //    slice. Engine-fork apps that name a feature `julia` (e.g.
        //    fluid-toy's Julia-set feature) fall through to the generic
        //    DDFS vec handler below so their targets aren't hijacked.
        if ((targetKey.startsWith('julia.') || targetKey.startsWith('geometry.julia')) && (storeState as any).geometry) {
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

        // D. Geometry Pre/Post/World Rotation — GMT-specific.
        //    UniformManager.syncFrame reads engine.modulations to build
        //    rotation matrices. Scoped to apps that have a `geometry`
        //    slice; engine-fork apps registering their own `geometry`
        //    feature take over this namespace.
        if ((targetKey.startsWith('geometry.preRot') || targetKey.startsWith('geometry.postRot') || targetKey.startsWith('geometry.worldRot')) && (storeState as any).geometry) {
            engine.modulations[targetKey] = offset;
            if (!isRemoved) liveModulations[targetKey] = resolvedBase + offset;
            if (Math.abs(offset) > 0.0001) hasVisualChange = true;
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
        
        // F. Vector Params — any feature with vec2/3/4 params (e.g.,
        //    `coreMath.vec3A_x`, `julia.juliaC_x`). Works for uniform-backed
        //    DDFS params (GMT) AND uniformless DDFS params (engine-fork
        //    apps like fluid-toy read liveModulations directly from the
        //    store). The uniform write is conditional; the liveModulations
        //    update always happens so React consumers see the modulation.
        const vectorMatch = targetKey.match(/^(\w+)\.([\w]+)_(x|y|z|w)$/);
        if (vectorMatch) {
            const featureId = vectorMatch[1];
            const paramName = vectorMatch[2];
            const axis = vectorMatch[3] as 'x' | 'y' | 'z' | 'w';

            const slice = (storeState as any)[featureId];
            if (slice && slice[paramName] && typeof slice[paramName] === 'object') {
                const vec = slice[paramName];
                const baseVal = (vec as any)[axis] ?? 0;
                const finalVal = baseVal + offset;

                let liveVal = finalVal;
                if (shouldRecord) {
                    let cleanBase = baseVal;
                    if (animStore.recordingSnapshot && animStore.recordingSnapshot.tracks[targetKey]) {
                        cleanBase = evaluateTrackValue(animStore.recordingSnapshot.tracks[targetKey].keyframes, animStore.currentFrame, false);
                    } else {
                        if (initialStaticValues.current[targetKey] === undefined) initialStaticValues.current[targetKey] = baseVal;
                        cleanBase = initialStaticValues.current[targetKey];
                    }
                    keysToRecord.push({ trackId: targetKey, value: cleanBase + offset });
                    liveVal = cleanBase + offset;
                }

                if (!isRemoved) liveModulations[targetKey] = liveVal;
                if (Math.abs(offset) > 0.0001) hasVisualChange = true;

                // Uniform write only when the feature declares one.
                if (uniformName && uniformName.endsWith(`_${axis}`)) {
                    const baseUniform = uniformName.replace(/_[xyzw]$/, '');
                    const fullVec = typeof (vec as any).clone === 'function'
                        ? (vec as any).clone()
                        : { ...vec };
                    (fullVec as any)[axis] = finalVal;
                    emitUniform(baseUniform, fullVec);
                }
            }
            return;
        }

        // Apply Standard — liveModulations for every DDFS scalar;
        // uniform only if the feature declared one. Skip entirely if
        // the target isn't a known DDFS param AND has no uniform (it
        // was a typo, a removed param, or handled by an earlier special
        // case above).
        if (uniformName || isDDFSResolved) {
            const finalScalar = resolvedBase + offset;
            if (!isRemoved) liveModulations[targetKey] = finalScalar;
            if (uniformName) {
                emitUniform(uniformName, finalScalar, isNoReset);
            }
            if (Math.abs(offset) > 0.0001) hasVisualChange = true;
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
         emitUniform('uJulia', juliaScratch);
    }

    // --- CRITICAL: Reset Accumulation if Visuals Changed ---
    if (hasVisualChange) {
        emitResetAccum();
    }

    // Sync to UI (Visual Feedback). Only write when values actually
    // changed — without this, every frame replaced `liveModulations`
    // with a fresh object reference, which triggered re-renders in
    // every subscribing component each frame. Combined with the
    // `?? {}` selector fallbacks (which already return a new ref per
    // call when null), this caused enough cascading renders during
    // rapid pointer events to trip React's "Maximum update depth"
    // guard inside fluid-toy's pan handler.
    const oldMods = storeState.liveModulations ?? {};
    const newKeys = Object.keys(liveModulations);
    const oldKeys = Object.keys(oldMods);
    let changed = newKeys.length !== oldKeys.length;
    if (!changed) {
        for (let i = 0; i < newKeys.length; i++) {
            const k = newKeys[i];
            if (liveModulations[k] !== (oldMods as Record<string, number>)[k]) {
                changed = true;
                break;
            }
        }
    }
    if (changed) {
        useEngineStore.getState().setLiveModulations(liveModulations);
    }
    
     activeTargetsRef.current = currentTargets;
};

// React component kept as a no-op for back-compat — the legacy
// ViewportArea mounts this; the tick function above is now the sole
// owner of the recording-on/off lifecycle. Apps wiring AnimationSystem
// via the engine TickRegistry (the modern path) don't need to mount
// this at all.
export const AnimationSystem: React.FC = () => null;
