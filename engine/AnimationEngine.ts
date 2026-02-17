
import * as THREE from 'three';
import { engine } from './FractalEngine';
import { useAnimationStore } from '../store/animationStore';
import { useFractalStore } from '../store/fractalStore';
import { Track, Keyframe } from '../types';
import { solveBezierY } from './BezierMath';
import { FractalEvents, FRACTAL_EVENTS } from './FractalEvents';
import { featureRegistry } from './FeatureSystem';
import { VirtualSpace } from './PrecisionMath';
import { AnimationMath } from './math/AnimationMath';

// Pending State Buffer to prevent partial updates per frame
interface PendingCameraState {
    rot: THREE.Euler;
    unified: THREE.Vector3; // The only position source of truth
    
    rotDirty: boolean;
    unifiedDirty: boolean;
}

type ValueSetter = (val: number) => void;

export class AnimationEngine {
    private pendingCam: PendingCameraState;
    private binders: Map<string, ValueSetter> = new Map();
    private overriddenTracks: Set<string> = new Set();
    
    // Track previous active camera to prevent redundant switching
    private lastCameraIndex: number = -1;

    constructor() {
        this.pendingCam = {
            rot: new THREE.Euler(),
            unified: new THREE.Vector3(),
            rotDirty: false,
            unifiedDirty: false
        };
    }
    
    public setOverriddenTracks(ids: Set<string>) {
        this.overriddenTracks = ids;
    }

    private getBinder(id: string): ValueSetter {
        if (this.binders.has(id)) {
            return this.binders.get(id)!;
        }

        let binder: ValueSetter = () => {}; 
        
        // 0. Active Camera Switcher
        if (id === 'camera.active_index') {
            binder = (v) => {
                const index = Math.round(v);
                if (index !== this.lastCameraIndex) {
                    const store = useFractalStore.getState();
                    const cameras = store.savedCameras;
                    if (cameras && cameras[index]) {
                         store.selectCamera(cameras[index].id);
                         this.lastCameraIndex = index;
                    }
                }
            }
        }

        // 1. Camera Properties (Unified Only)
        else if (id.startsWith('camera.')) {
            const parts = id.split('.');
            const type = parts[1];
            const axis = parts[2];

            if (type === 'unified') {
                binder = (v) => {
                    this.pendingCam.unified[axis as 'x'|'y'|'z'] = v;
                    this.pendingCam.unifiedDirty = true;
                }
            } else if (type === 'rotation') {
                 binder = (v) => { 
                    this.pendingCam.rot[axis as 'x'|'y'|'z'] = v; 
                    this.pendingCam.rotDirty = true; 
                };
            } 
            // Legacy tracks are ignored (no binder created)
        }
        // 2. Light Properties (Legacy format mapping)
        else if (id.startsWith('lights.')) {
             const parts = id.split('.');
             const index = parseInt(parts[1]);
             const prop = parts[2];
             
             let newProp = "";
             if (prop === 'position') newProp = `pos${parts[3].toUpperCase()}`; // position.x -> posX
             else if (prop === 'color') newProp = "color"; 
             else newProp = prop; // intensity -> intensity
             
             const ddfsKey = `lighting.light${index}_${newProp}`;
             return this.getBinder(ddfsKey);
        }
        // 3. DDFS Lighting Array Mapping (lighting.light0_posX)
        else if (id.startsWith('lighting.light')) {
            const match = id.match(/lighting\.light(\d+)_(\w+)/);
            if (match) {
                const index = parseInt(match[1]);
                const prop = match[2];
                const actions = useFractalStore.getState();

                if (prop === 'intensity') binder = (v) => actions.updateLight({ index, params: { intensity: v } });
                else if (prop === 'falloff') binder = (v) => actions.updateLight({ index, params: { falloff: v } });
                else if (prop.startsWith('pos')) {
                    const axis = prop.replace('pos', '').toLowerCase(); // X, Y, Z -> x, y, z
                    binder = (v) => {
                        const state = useFractalStore.getState();
                        const l = state.lighting?.lights[index];
                        if (l) {
                            const newPos = { ...l.position, [axis]: v };
                            actions.updateLight({ index, params: { position: newPos } });
                        }
                    };
                } else if (prop.startsWith('rot')) {
                    const axis = prop.replace('rot', '').toLowerCase(); // X, Y, Z -> x, y, z
                    binder = (v) => {
                        const state = useFractalStore.getState();
                        const l = state.lighting?.lights[index];
                        if (l) {
                            const newRot = { ...l.rotation, [axis]: v };
                            actions.updateLight({ index, params: { rotation: newRot } });
                        }
                    };
                }
            }
        }
        // 4. Universal DDFS Resolver (Feature.Param)
        else if (id.includes('.')) {
            const parts = id.split('.');
            const parent = parts[0];
            const child = parts[1];
            
            const feature = featureRegistry.get(parent);
            
            if (feature) {
                const actions = useFractalStore.getState();
                const setterName = `set${parent.charAt(0).toUpperCase() + parent.slice(1)}`;
                const setter = (actions as any)[setterName];
                
                if (setter && typeof setter === 'function') {
                    binder = (v) => setter({ [child]: v });
                } else {
                    console.warn(`AnimationEngine: Setter ${setterName} not found for feature ${parent}`);
                }
            }
        }
        // 5. Direct Store Properties (Root level fallback)
        else {
            const actions = useFractalStore.getState();
            const setterName = 'set' + id.charAt(0).toUpperCase() + id.slice(1);
            if (typeof (actions as any)[setterName] === 'function') {
                binder = (v) => (actions as any)[setterName](v);
            }
        }

        this.binders.set(id, binder);
        return binder;
    }

    public tick(dt: number) {
        const store = useAnimationStore.getState();
        if (!store.isPlaying) return;

        const fps = store.fps;
        const currentFrame = store.currentFrame;
        const duration = store.durationFrames;
        const loopMode = store.loopMode;
        
        const deltaFrames = dt * fps;
        let nextFrame = currentFrame + deltaFrames;
        
        if (nextFrame >= duration) {
            if (loopMode === 'Once' || store.isRecordingModulation) {
                nextFrame = duration;
                useAnimationStore.setState({ isPlaying: false, currentFrame: duration });
                if (store.isRecordingModulation) {
                    store.stopModulationRecording();
                }
                return;
            } else {
                nextFrame = 0; 
            }
        }
        
        useAnimationStore.setState({ currentFrame: nextFrame });
        this.scrub(nextFrame);
    }

    public scrub(frame: number) {
        const { sequence, isPlaying, isRecording, recordCamera } = useAnimationStore.getState();
        const tracks = Object.values(sequence.tracks) as Track[];
        
        this.syncBuffersFromEngine();

        // If recording camera, ignore timeline camera tracks to avoid fighting
        const ignoreCamera = isPlaying && isRecording && recordCamera;

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            
            if (this.overriddenTracks.has(track.id)) continue;

            if (track.keyframes.length === 0) continue;
            if (track.type !== 'float') continue; 

            if (track.id.includes('camera.position') || track.id.includes('camera.offset')) continue;

            if (ignoreCamera && track.id.startsWith('camera.')) continue;

            const val = this.interpolate(track, frame);
            const binder = this.getBinder(track.id);
            binder(val);
        }
        
        this.commitState();
    }

    private syncBuffersFromEngine() {
        const cam = engine.activeCamera;
        if (cam) {
            this.pendingCam.rot.setFromQuaternion(cam.quaternion);
            const eo = engine.sceneOffset;
            
            this.pendingCam.unified.set(
                eo.x + eo.xL + cam.position.x,
                eo.y + eo.yL + cam.position.y,
                eo.z + eo.zL + cam.position.z
            );
            
            this.pendingCam.rotDirty = false;
            this.pendingCam.unifiedDirty = false;
        }
    }

    private interpolate(track: Track, frame: number): number {
        const keys = track.keyframes;
        if (keys.length === 0) return 0;
        
        const firstKey = keys[0];
        const lastKey = keys[keys.length - 1];
        const isRotation = track.id.startsWith('camera.rotation') || track.id.includes('rot') || track.id.includes('phase') || track.id.includes('twist');
        
        if (frame > lastKey.frame) {
            const behavior = track.postBehavior || 'Hold';
            
            if (behavior === 'Hold') return lastKey.value;
            
            if (behavior === 'Continue') {
                let slope = 0;
                if (keys.length > 1) {
                    const prev = keys[keys.length - 2];
                    if (lastKey.interpolation === 'Linear') {
                         slope = (lastKey.value - prev.value) / (lastKey.frame - prev.frame);
                    } else if (lastKey.interpolation === 'Bezier') {
                         if (lastKey.leftTangent && Math.abs(lastKey.leftTangent.x) > 0.001) {
                             slope = lastKey.leftTangent.y / lastKey.leftTangent.x;
                         } else {
                             slope = (lastKey.value - prev.value) / (lastKey.frame - prev.frame);
                         }
                    }
                }
                return lastKey.value + slope * (frame - lastKey.frame);
            }

            const duration = lastKey.frame - firstKey.frame;
            if (duration <= 0.001) return lastKey.value;
            
            const timeSinceStart = frame - firstKey.frame;
            const cycleCount = Math.floor(timeSinceStart / duration);
            const localTime = firstKey.frame + (timeSinceStart % duration);
            
            const baseVal = this.evaluateCurveInternal(keys, localTime, isRotation);
            
            if (behavior === 'Loop') return baseVal;
            
            if (behavior === 'PingPong') {
                const isReversed = cycleCount % 2 === 1;
                if (isReversed) {
                    const reversedTime = lastKey.frame - (timeSinceStart % duration);
                    return this.evaluateCurveInternal(keys, reversedTime, isRotation);
                }
                return baseVal;
            }
            
            if (behavior === 'OffsetLoop') {
                const cycleDiff = lastKey.value - firstKey.value;
                return baseVal + (cycleDiff * cycleCount);
            }
        }
        
        if (frame < firstKey.frame) return firstKey.value;

        return this.evaluateCurveInternal(keys, frame, isRotation);
    }
    
    private evaluateCurveInternal(keys: Keyframe[], frame: number, isRotation: boolean): number {
        for (let i = 0; i < keys.length - 1; i++) {
            const k1 = keys[i];
            const k2 = keys[i+1];
            
            if (frame >= k1.frame && frame <= k2.frame) { 
                return AnimationMath.interpolate(frame, k1, k2, isRotation);
            }
        }
        return keys[keys.length - 1].value;
    }

    private commitState() {
        if (this.pendingCam.unifiedDirty || this.pendingCam.rotDirty) {
            engine.shouldSnapCamera = true;
            
            const q = new THREE.Quaternion().setFromEuler(this.pendingCam.rot);
            const rot = { x: q.x, y: q.y, z: q.z, w: q.w };
            
            const sX = VirtualSpace.split(this.pendingCam.unified.x);
            const sY = VirtualSpace.split(this.pendingCam.unified.y);
            const sZ = VirtualSpace.split(this.pendingCam.unified.z);
            
            FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, {
                position: { x: 0, y: 0, z: 0 },
                rotation: rot,
                sceneOffset: {
                    x: sX.high, y: sY.high, z: sZ.high,
                    xL: sX.low, yL: sY.low, zL: sZ.low
                }
            });

            useFractalStore.setState({ cameraRot: rot });
        }
    }
}

export const animationEngine = new AnimationEngine();
