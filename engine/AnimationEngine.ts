
import * as THREE from 'three';
import { engine } from './FractalEngine';
import { useAnimationStore } from '../store/animationStore';
import { useFractalStore } from '../store/fractalStore';
import { Track } from '../types';
import { solveBezierY } from './BezierMath';
import { FractalEvents } from './FractalEvents';
import { featureRegistry } from './FeatureSystem';

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

        // 1. Camera Properties (Unified Only)
        if (id.startsWith('camera.')) {
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
        // If older tracks exist like "lights.0.position.x", map them to new DDFS "lighting.light0_posX"
        else if (id.startsWith('lights.')) {
             const parts = id.split('.');
             const index = parseInt(parts[1]);
             const prop = parts[2];
             
             let newProp = "";
             if (prop === 'position') newProp = `pos${parts[3].toUpperCase()}`; // position.x -> posX
             else if (prop === 'color') newProp = "color"; // DDFS colors aren't directly float-animatable yet via single track easily, but let's assume not supported for now or handled by generic.
             else newProp = prop; // intensity -> intensity
             
             const ddfsKey = `lighting.light${index}_${newProp}`;
             
             // Recursively get binder for the new key
             return this.getBinder(ddfsKey);
        }
        // 3. DDFS Lighting Array Mapping (lighting.light0_posX)
        // This must be handled specifically because the State is an array of objects, not flat params
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
                            // We must merge with current position to avoid overwriting other axes
                            const newPos = { ...l.position, [axis]: v };
                            actions.updateLight({ index, params: { position: newPos } });
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
            
            // Check if this is a registered Feature (e.g. 'geometry', 'atmosphere', 'coreMath', 'lighting')
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
        
        // Loop Logic
        if (nextFrame >= duration) {
            if (loopMode === 'Once' || store.isRecordingModulation) {
                nextFrame = duration;
                useAnimationStore.setState({ isPlaying: false, currentFrame: duration });
                
                // End of Recording Pass logic
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

        // Feature: Live Camera Recording
        // If playing AND recording AND camera recording is active, ignore camera tracks.
        // This allows the user to fly freely while recording new keys.
        // If recordCamera is FALSE, we PLAY the camera tracks (dubbing mode).
        const ignoreCamera = isPlaying && isRecording && recordCamera;

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            
            // SKIP OVERRIDDEN TRACKS (Modulation recording in progress)
            if (this.overriddenTracks.has(track.id)) continue;

            if (track.keyframes.length === 0) continue;
            if (track.type !== 'float') continue; 

            // Skip legacy tracks
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
        // Lights sync is now handled by Zustand's reactivity via bindStoreToEngine > UniformManager
        // AnimationEngine just blindly writes to store actions, which updates the state source of truth.
    }

    private interpolate(track: Track, frame: number): number {
        const keys = track.keyframes;
        if (keys.length === 0) return 0;
        
        if (frame <= keys[0].frame) return keys[0].value;
        if (frame >= keys[keys.length - 1].frame) return keys[keys.length - 1].value;
        
        const isRotation = track.id.startsWith('camera.rotation');
        const PI2 = Math.PI * 2;

        for (let i = 0; i < keys.length - 1; i++) {
            const k1 = keys[i];
            const k2 = keys[i+1];
            
            if (frame >= k1.frame && frame < k2.frame) {
                if (k1.interpolation === 'Step') return k1.value;
                
                let v1 = k1.value;
                let v2 = k2.value;

                if (isRotation) {
                    const diff = v2 - v1;
                    if (diff > Math.PI) v2 -= PI2;
                    else if (diff < -Math.PI) v2 += PI2;
                }

                if (k1.interpolation === 'Bezier') {
                    const h1x = k1.rightTangent ? k1.rightTangent.x : (k2.frame - k1.frame) * 0.33;
                    const h1y = k1.rightTangent ? k1.rightTangent.y : 0;
                    const h2x = k2.leftTangent ? k2.leftTangent.x : -(k2.frame - k1.frame) * 0.33;
                    const h2y = k2.leftTangent ? k2.leftTangent.y : 0;
                    
                    return solveBezierY(
                        frame,
                        k1.frame, v1, h1x, h1y,
                        k2.frame, v2, h2x, h2y
                    );
                }
                
                const t = (frame - k1.frame) / (k2.frame - k1.frame);
                return v1 + (v2 - v1) * t;
            }
        }
        return keys[0].value;
    }

    private commitState() {
        // Only Camera requires special commit logic due to Virtual Space
        if (this.pendingCam.unifiedDirty || this.pendingCam.rotDirty) {
            engine.shouldSnapCamera = true;
            
            if (this.pendingCam.unifiedDirty) {
                let lx = 0, ly = 0, lz = 0;
                if (engine.activeCamera) {
                    lx = engine.activeCamera.position.x;
                    ly = engine.activeCamera.position.y;
                    lz = engine.activeCamera.position.z;
                }

                engine.virtualSpace.setFromUnified(
                    this.pendingCam.unified.x - lx,
                    this.pendingCam.unified.y - ly,
                    this.pendingCam.unified.z - lz
                );
            }

            if (this.pendingCam.rotDirty && engine.activeCamera) {
                engine.activeCamera.quaternion.setFromEuler(this.pendingCam.rot);
                engine.activeCamera.updateMatrixWorld();
            }
            
            useFractalStore.setState({ sceneOffset: engine.virtualSpace.state });
            FractalEvents.emit('reset_accum', undefined);
        }
    }
}

export const animationEngine = new AnimationEngine();
