
import { useFractalStore } from '../store/fractalStore';
import { engine } from '../engine/FractalEngine';
import * as THREE from 'three';
import { Keyframe, AnimationSequence, SoftSelectionType } from '../types';
import { featureRegistry } from '../engine/FeatureSystem';
import { getLightFromSlice } from '../features/lighting';
import { nanoid } from 'nanoid';
import { AnimationMath } from '../engine/math/AnimationMath';
import { CameraUtils } from './CameraUtils';

// --- LIVE VALUE HELPER ---
// Reads current value from the specific store slice
export const getLiveValue = (trackId: string, isPlaying: boolean, currentFrame: number, sequence: any): number => {
    if (isPlaying) return 0;

    const fs = useFractalStore.getState();
    const geom = (fs as any).geometry;
    const lighting = (fs as any).lighting;
    
    // UNIFIED CAMERA SUPPORT
    if (trackId.startsWith('camera.unified')) {
        // Use the new CameraUtils to ensure math consistency with Scene Panel
        // We fallback to Engine for camera local pos as Store might lag during high-speed fly
        const camPos = engine.activeCamera ? engine.activeCamera.position : fs.cameraPos;
        const unified = CameraUtils.getUnifiedPosition(camPos, fs.sceneOffset);
        
        if (trackId === 'camera.unified.x') return unified.x;
        if (trackId === 'camera.unified.y') return unified.y;
        if (trackId === 'camera.unified.z') return unified.z;
    }
    
    if (trackId.startsWith('camera.rotation')) {
        const cam = engine.activeCamera;
        if (cam) {
            const euler = new THREE.Euler().setFromQuaternion(cam.quaternion);
            if (trackId === 'camera.rotation.x') return euler.x;
            if (trackId === 'camera.rotation.y') return euler.y;
            if (trackId === 'camera.rotation.z') return euler.z;
        }
        return 0;
    }
    
    // Legacy Light Mapping
    if (trackId.startsWith('lights.') || trackId.startsWith('lighting.')) {
        const match = trackId.match(/lighting\.light(\d+)_(\w+)/);
        if (match) {
             const idx = parseInt(match[1]);
             const prop = match[2];
             const light = getLightFromSlice(lighting, idx);
             if (light) {
                 if (prop === 'intensity') return light.intensity;
                 if (prop === 'falloff') return light.falloff;
                 if (prop === 'posX') return light.position.x;
                 if (prop === 'posY') return light.position.y;
                 if (prop === 'posZ') return light.position.z;
             }
        }
    }
    
    // Check for Features
    if (trackId.includes('.')) {
        const parts = trackId.split('.');
        const parent = parts[0];
        const child = parts[1];
        
        if (featureRegistry.get(parent)) {
            const featureState = (fs as any)[parent];
            if (featureState && featureState[child] !== undefined) {
                let val = featureState[child];
                if (typeof val === 'boolean') return val ? 1 : 0;
                if (typeof val === 'number') return val;
            }
        }
    }
    
    // Fallback for legacy bare params
    const coreMath = fs.coreMath;
    if (coreMath) {
        if (trackId === 'paramA') return coreMath.paramA;
        if (trackId === 'paramB') return coreMath.paramB;
        if (trackId === 'paramC') return coreMath.paramC;
        if (trackId === 'paramD') return coreMath.paramD;
        if (trackId === 'paramE') return coreMath.paramE;
        if (trackId === 'paramF') return coreMath.paramF;
        if (trackId === 'iterations') return coreMath.iterations;
    }
    
    return 0;
};

// --- CURVE EVALUATION ---
// Wrapper for AnimationMath to handle track traversal
export const evaluateTrackValue = (keys: Keyframe[], frame: number, isRotation: boolean): number => {
    if (keys.length === 0) return 0;
    
    if (frame <= keys[0].frame) return keys[0].value;
    if (frame >= keys[keys.length - 1].frame) return keys[keys.length - 1].value;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const k1 = keys[i];
        const k2 = keys[i+1];
        
        if (frame >= k1.frame && frame < k2.frame) {
            return AnimationMath.interpolate(frame, k1, k2, isRotation);
        }
    }
    return keys[0].value;
};

// --- TANGENT MATH HELPERS (Re-exported from AnimationMath for compatibility if needed, or UI specific helpers) ---

export const getTangentStats = (handle: {x: number, y: number} | undefined, timeDist: number | undefined, isLeft: boolean) => {
    if (!handle) return { angle: 0, length: 0 };
    
    const vx = isLeft ? -handle.x : handle.x;
    const vy = isLeft ? -handle.y : handle.y;
    
    const angle = Math.atan2(vy, vx) * (180 / Math.PI);

    let lenPct = 0;
    if (timeDist && Math.abs(timeDist) > 1e-9) {
        lenPct = (Math.abs(handle.x) / Math.abs(timeDist)) * 100;
    } else {
        lenPct = Math.abs(handle.x) * 10; 
    }
    return { angle, length: lenPct };
};

export const updateTangentFromStats = (isLeft: boolean, angle: number, lenPct: number, timeDist: number) => {
    const safeAngle = Math.max(-89.9, Math.min(89.9, angle));
    const rad = safeAngle * (Math.PI / 180);
    
    const dist = Math.abs(timeDist) < 0.0001 ? 10 : Math.abs(timeDist);

    const x = (isLeft ? -1 : 1) * (lenPct / 100) * dist;
    const y = Math.abs(x) * Math.tan(rad) * (isLeft ? -1 : 1);
    
    return { x, y };
};

// --- KEYFRAME CONSTRAINT UTILITY ---
export const constrainKeyframeHandles = AnimationMath.constrainHandles;
export const calculateSoftFalloff = AnimationMath.calculateSoftFalloff;

// --- EULER FILTER LOGIC ---
export const calculateEulerUpdates = (trackIds: string[], sequence: AnimationSequence) => {
    const updates: { trackId: string, keyId: string, patch: Partial<Keyframe> }[] = [];
    const CYCLE = Math.PI * 2;

    trackIds.forEach(tid => {
        const track = sequence.tracks[tid];
        const isRotation = /rotation|rot|phase|twist/i.test(tid) || /param[C-F]/i.test(tid); 
        
        if (track && track.keyframes.length > 1 && isRotation) {
            const keys = [...track.keyframes].sort((a,b) => a.frame - b.frame);
            const values = keys.map(k => k.value);
            const unrolled = [...values];
            
            for(let i=1; i<unrolled.length; i++) {
                let d = unrolled[i] - unrolled[i-1];
                d -= Math.round(d / CYCLE) * CYCLE;
                unrolled[i] = unrolled[i-1] + d;
            }
            
            keys.forEach((k, i) => {
                if (Math.abs(k.value - unrolled[i]) > 0.0001) {
                    updates.push({
                        trackId: tid,
                        keyId: k.id,
                        patch: { value: unrolled[i] }
                    });
                }
            });
        }
    });
    
    return updates;
};

// --- SMOOTHING / BOUNCE ---
export const calculateSmoothingUpdates = (
    trackIds: string[], 
    sequence: AnimationSequence, 
    selectedKeyframeIds: string[],
    radiusInput: number = 1,
    sourceSequence?: AnimationSequence,
    tensionBase: number = 0.5,
    frictionBase: number = 0.6
) => {
    const updates: { trackId: string, keyId: string, patch: Partial<Keyframe> }[] = [];
    const hasSelection = selectedKeyframeIds.length > 0;
    const selectedSet = new Set(selectedKeyframeIds);
    
    const isBounce = radiusInput < 0;
    const radius = Math.abs(radiusInput);
    
    if (radius === 0) {
        // Reset Logic
        if (sourceSequence) {
             trackIds.forEach(tid => {
                const track = sourceSequence.tracks[tid];
                const targetTrack = sequence.tracks[tid];
                if (!track || !targetTrack) return;
                
                track.keyframes.forEach(k => {
                     const currentKey = targetTrack.keyframes.find(ck => ck.id === k.id);
                     if (currentKey && (hasSelection ? selectedSet.has(`${tid}::${k.id}`) : true)) {
                         if (Math.abs(currentKey.value - k.value) > 1e-9) {
                             updates.push({ trackId: tid, keyId: k.id, patch: { value: k.value } });
                         }
                     }
                });
             });
        }
        return updates;
    }

    const refSequence = sourceSequence || sequence;
    const sigma = Math.max(0.1, radius / 2.5);
    const sigma2 = 2 * sigma * sigma;
    const kernelSize = Math.ceil(radius); 

    trackIds.forEach(tid => {
        const track = refSequence.tracks[tid];
        if (!track || track.keyframes.length < 2) return;
        
        const isRotation = /rotation|rot|phase|twist/i.test(tid) || /param[C-F]/i.test(tid);
        const keys = [...track.keyframes].sort((a,b) => a.frame - b.frame);
        
        // BOUNCE LOGIC (Simulated Spring)
        if (isBounce) {
            // Adjust Spring params based on drag radius
            const t = Math.min(radius, 5.0) / 5.0;
            
            // Allow user customization via tensionBase/frictionBase
            const tension = tensionBase * (1.0 - t * 0.9);   
            const friction = frictionBase * (1.0 - t * 0.8);  
            
            let pos = keys[0].value;
            let vel = 0;
            const startFrame = keys[0].frame;
            const endFrame = keys[keys.length - 1].frame;

            const initNext = evaluateTrackValue(keys, startFrame + 1.0, isRotation);
            let initDiff = initNext - pos;
            if (isRotation) {
                 if (initDiff > Math.PI) initDiff -= Math.PI * 2;
                 else if (initDiff < -Math.PI) initDiff += Math.PI * 2;
            }
            vel = initDiff;
            
            for (let f = startFrame; f <= endFrame; f++) {
                let target = evaluateTrackValue(keys, f, isRotation);
                
                if (isRotation) {
                     const diff = target - pos;
                     if (diff > Math.PI) target -= Math.PI * 2;
                     else if (diff < -Math.PI) target += Math.PI * 2;
                }
                
                const force = (target - pos) * tension;
                const damping = -vel * friction;
                const accel = force + damping;
                
                vel += accel;
                pos += vel;
                
                const k = keys.find(key => Math.abs(key.frame - f) < 0.1);
                
                if (k) {
                    if (!hasSelection || selectedSet.has(`${tid}::${k.id}`)) {
                        updates.push({
                            trackId: tid,
                            keyId: k.id,
                            patch: { value: pos }
                        });
                    } else {
                        pos = k.value;
                        let nextTarget = evaluateTrackValue(keys, f + 1.0, isRotation);
                        let diff = nextTarget - pos;
                        if (isRotation) {
                            if (diff > Math.PI) diff -= Math.PI * 2;
                            else if (diff < -Math.PI) diff += Math.PI * 2;
                        }
                        vel = diff;
                    }
                }
            }
            return; 
        }

        // SMOOTHING LOGIC (Weighted Moving Average)
        let blocks: number[][] = [];
        
        if (hasSelection) {
            let currentBlock: number[] = [];
            keys.forEach((k, i) => {
                if (selectedSet.has(`${tid}::${k.id}`)) {
                    currentBlock.push(i);
                } else {
                    if (currentBlock.length > 0) {
                        blocks.push(currentBlock);
                        currentBlock = [];
                    }
                }
            });
            if (currentBlock.length > 0) blocks.push(currentBlock);
        } else {
            blocks.push(keys.map((_, i) => i));
        }

        blocks.forEach(indices => {
            const getValueAt = (idx: number) => {
                if (idx < 0) return keys[0].value; 
                if (idx >= keys.length) return keys[keys.length-1].value; 
                return keys[idx].value;
            };

            for(let i=0; i<indices.length; i++) {
                const keyIdx = indices[i];
                const key = keys[keyIdx];
                
                let weightSum = 0;
                let valueSum = 0;
                
                for (let offset = -kernelSize; offset <= kernelSize; offset++) {
                    const neighborIdx = keyIdx + offset;
                    const weight = Math.exp(-(offset * offset) / sigma2);
                    let val = getValueAt(neighborIdx);
                    valueSum += val * weight;
                    weightSum += weight;
                }
                
                if (weightSum > 0) {
                    let newVal = valueSum / weightSum;
                    const currentTrack = sequence.tracks[tid];
                    const currentKey = currentTrack ? currentTrack.keyframes.find(k => k.id === key.id) : null;
                    if (currentKey && Math.abs(newVal - currentKey.value) > 1e-9) {
                        updates.push({
                            trackId: tid,
                            keyId: key.id,
                            patch: { value: newVal }
                        });
                    }
                }
            }
        });
    });
    
    return updates;
};

export const calculateResampleUpdates = (
    trackIds: string[],
    sequence: AnimationSequence,
    step: number = 1.0
) => {
    const updates: { trackId: string, newKeys: Keyframe[] }[] = [];

    trackIds.forEach(tid => {
        const track = sequence.tracks[tid];
        if (!track || track.keyframes.length === 0) return;

        const sortedKeys = [...track.keyframes].sort((a,b) => a.frame - b.frame);
        
        const startFrame = Math.ceil(sortedKeys[0].frame);
        const endFrame = Math.floor(sortedKeys[sortedKeys.length - 1].frame);
        const isRotation = tid.startsWith('camera.rotation');

        const newKeys: Keyframe[] = [];

        for (let f = startFrame; f <= endFrame; f += step) {
            const val = evaluateTrackValue(sortedKeys, f, isRotation);
            newKeys.push({
                id: nanoid(),
                frame: f,
                value: val,
                interpolation: 'Linear',
                autoTangent: false,
                brokenTangents: false
            });
        }

        if (newKeys.length > 0) {
            updates.push({ trackId: tid, newKeys });
        }
    });

    return updates;
};
