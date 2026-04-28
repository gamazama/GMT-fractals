
import { Track, Keyframe } from '../types';
import { solveBezierY } from './BezierMath';
import { featureRegistry } from './FeatureSystem';
import { AnimationMath } from './math/AnimationMath';
import { binderRegistry } from './animation/binderRegistry';

type ValueSetter = (val: number) => void;

/** Minimal store accessor shape — matches Zustand's getState/setState API. */
interface StoreAccessor {
    getState(): any;
    setState(partial: any): void;
}

/** Per-frame context passed to scrub hooks. Apps wiring camera-style
 *  composite binders (e.g. GMT's split-precision sceneOffset) read
 *  this to know whether to skip camera tracks (record-camera mode). */
export interface ScrubContext {
    frame: number;
    isPlaying: boolean;
    isRecording: boolean;
    recordCamera: boolean;
    /** True when binders that drive the camera should be skipped this
     *  frame (record-camera mode — the user is moving the camera and
     *  the timeline shouldn't fight back). */
    ignoreCamera: boolean;
}

export type ScrubHook = (ctx: ScrubContext) => void;

export class AnimationEngine {
    private binders: Map<string, ValueSetter> = new Map();
    private overriddenTracks: Set<string> = new Set();

    private preScrubHooks: ScrubHook[] = [];
    private postScrubHooks: ScrubHook[] = [];

    // Injected store accessors — set via connect() from bridge layer
    private animStore: StoreAccessor | null = null;
    private fractalStore: StoreAccessor | null = null;

    /** Connect store accessors. Called from bindStoreToEngine() after stores are initialized. */
    public connect(animStore: StoreAccessor, fractalStore: StoreAccessor) {
        this.animStore = animStore;
        this.fractalStore = fractalStore;
    }
    
    public setOverriddenTracks(ids: Set<string>) {
        this.overriddenTracks = ids;
    }

    /** Register a function that runs before/after every scrub frame.
     *  Used by host apps that batch composite-track updates outside
     *  the binder pipeline — e.g. GMT's split-precision camera reads
     *  the live camera in `pre` and emits CAMERA_TELEPORT in `post`.
     *  Returns an unregister function so install*() teardowns don't
     *  leak. */
    public registerScrubHook(phase: 'pre' | 'post', fn: ScrubHook): () => void {
        const arr = phase === 'pre' ? this.preScrubHooks : this.postScrubHooks;
        arr.push(fn);
        return () => {
            const idx = arr.indexOf(fn);
            if (idx >= 0) arr.splice(idx, 1);
        };
    }

    private getBinder(id: string): ValueSetter {
        // Explicit registration wins — checked BEFORE the per-id cache
        // so that registering a custom binder AFTER a previous lookup
        // (which would have cached a DDFS-derived writer in this.binders)
        // still takes effect immediately. The registry is O(1) lookup
        // itself; no second-level caching needed, and caching the
        // registered writer would leak stale entries across
        // register/unregister cycles.
        const registered = binderRegistry.lookup(id);
        if (registered) return registered.write;

        if (this.binders.has(id)) {
            return this.binders.get(id)!;
        }

        let binder: ValueSetter = () => {};

        // Camera-shaped composite tracks (`camera.active_index`,
        // `camera.unified.*`, `camera.rotation.*`) live on the host
        // app — see engine-gmt/animation/cameraBinders.ts. They
        // register via binderRegistry, which is consulted above
        // BEFORE this fallback chain. Tracks that fall through here
        // unmatched get a no-op binder.

        // Light Properties (Legacy format mapping)
        if (id.startsWith('lights.')) {
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
                const actions = this.fractalStore!.getState();

                if (prop === 'intensity') binder = (v) => actions.updateLight({ index, params: { intensity: v } });
                else if (prop === 'falloff') binder = (v) => actions.updateLight({ index, params: { falloff: v } });
                else if (prop.startsWith('pos')) {
                    const axis = prop.replace('pos', '').toLowerCase(); // X, Y, Z -> x, y, z
                    binder = (v) => {
                        const state = this.fractalStore!.getState();
                        const l = state.lighting?.lights[index];
                        if (l) {
                            const newPos = { ...l.position, [axis]: v };
                            actions.updateLight({ index, params: { position: newPos } });
                        }
                    };
                } else if (prop.startsWith('rot')) {
                    const axis = prop.replace('rot', '').toLowerCase(); // X, Y, Z -> x, y, z
                    binder = (v) => {
                        const state = this.fractalStore!.getState();
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
                const actions = this.fractalStore!.getState();
                const setterName = `set${parent.charAt(0).toUpperCase() + parent.slice(1)}`;
                const setter = (actions as any)[setterName];

                if (setter && typeof setter === 'function') {
                    // Writer helper: clone the current vec-shaped param,
                    // overwrite the named axis, commit the whole vec. Works
                    // for THREE.Vector{2,3,4} (has .clone()) and plain
                    // {x,y[,z,w]} objects (spread). Used by both the
                    // UNDERSCORE and DOT forms below.
                    const writeVecAxis = (base: string, axis: 'x' | 'y' | 'z' | 'w') => (v: number) => {
                        const state = this.fractalStore!.getState() as any;
                        const current = state[parent]?.[base];
                        if (current && typeof current === 'object') {
                            const next = typeof current.clone === 'function'
                                ? current.clone()
                                : { ...current };
                            next[axis] = v;
                            setter({ [base]: next });
                        }
                    };

                    // UNDERSCORE form — GMT convention used by AutoFeaturePanel's
                    // vec2/vec3/vec4 rendering: `featureId.paramName_<axis>`.
                    // Matches if the base name exists as a vec-like object
                    // in the slice (so `power_x` on a scalar `power` falls
                    // through to the scalar branch below).
                    const underscoreMatch = child.match(/^(.+)_([xyzw])$/);
                    if (underscoreMatch) {
                        const state = this.fractalStore!.getState() as any;
                        const base = underscoreMatch[1];
                        const axis = underscoreMatch[2] as 'x' | 'y' | 'z' | 'w';
                        const current = state[parent]?.[base];
                        if (current && typeof current === 'object' && axis in current) {
                            binder = writeVecAxis(base, axis);
                            this.binders.set(id, binder);
                            return binder;
                        }
                    }

                    // DOT form — kept as backward-compat for callers that
                    // encode the axis as a third path segment
                    // (phase-5-era `feature.param.axis`). Never produced
                    // by AutoFeaturePanel, but keyframes may exist in
                    // saved scenes from early phase-5 builds.
                    const thirdPart = parts[2];
                    if (thirdPart === 'x' || thirdPart === 'y' || thirdPart === 'z' || thirdPart === 'w') {
                        binder = writeVecAxis(child, thirdPart as 'x' | 'y' | 'z' | 'w');
                    } else {
                        // Standard scalar param.
                        binder = (v) => setter({ [child]: v });
                    }
                } else {
                    console.warn(`AnimationEngine: Setter ${setterName} not found for feature ${parent}`);
                }
            }
        }
        // 5. Direct Store Properties (Root level fallback)
        else {
            const actions = this.fractalStore!.getState();
            const setterName = 'set' + id.charAt(0).toUpperCase() + id.slice(1);
            if (typeof (actions as any)[setterName] === 'function') {
                binder = (v) => (actions as any)[setterName](v);
            }
        }

        this.binders.set(id, binder);
        return binder;
    }

    public tick(dt: number) {
        if (!this.animStore) return;
        const store = this.animStore.getState();
        if (!store.isPlaying) return;

        const fps = store.fps;
        const currentFrame = store.currentFrame;
        const duration = store.durationFrames;
        const loopMode = store.loopMode;

        // Deterministic playback: lock advance to exactly one timeline frame
        // per tick, regardless of how long the wall RAF tick was. Pairs with
        // useFluidEngine's controlled timestamp so a "play from start"
        // session reproduces the same dt sequence the export sees. Display
        // playback rate becomes (RAF rate) / fps — set fps = RAF for
        // real-time preview.
        const deterministic = (store as { deterministicPlayback?: boolean }).deterministicPlayback;
        const deltaFrames = deterministic ? 1 : dt * fps;
        let nextFrame = currentFrame + deltaFrames;
        
        if (nextFrame >= duration) {
            if (loopMode === 'Once' || store.isRecordingModulation) {
                nextFrame = duration;
                this.scrub(duration); // Commit final frame camera state before stopping
                this.animStore!.setState({ isPlaying: false, currentFrame: duration });
                if (store.isRecordingModulation) {
                    store.stopModulationRecording();
                }
                return;
            } else {
                nextFrame = 0; 
            }
        }
        
        this.animStore!.setState({ currentFrame: nextFrame });
        this.scrub(nextFrame);
    }

    public scrub(frame: number) {
        if (!this.animStore) return;
        const { sequence, isPlaying, isRecording, recordCamera } = this.animStore.getState();
        const tracks = Object.values(sequence.tracks) as Track[];

        const ignoreCamera = isPlaying && isRecording && recordCamera;
        const ctx: ScrubContext = { frame, isPlaying, isRecording, recordCamera, ignoreCamera };

        // Pre-scrub hooks — apps with composite-track batching read the
        // live state into their own buffers here so the binders that
        // fire below see a fresh starting point.
        for (const h of this.preScrubHooks) h(ctx);

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

        // Post-scrub hooks — apps flush their batched composite-track
        // state here (GMT camera teleport / accumulation reset).
        for (const h of this.postScrubHooks) h(ctx);
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

}

export const animationEngine = new AnimationEngine();
