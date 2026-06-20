
import * as THREE from 'three';
import { ShaderConfig } from './ShaderFactory';
import { CameraState } from '../types';
import { Uniforms } from './UniformNames';
import { VirtualSpace } from './PrecisionMath';
import { FractalEvents, FRACTAL_EVENTS } from './FractalEvents';
import { RenderPipeline } from './RenderPipeline';
import { BandScheduler } from './BandScheduler';
import { MaterialController } from './MaterialController';
import { SceneController } from './SceneController';
import { PickingController } from './controllers/PickingController';
import { bucketRenderer, BucketRenderConfig } from './BucketRenderer';
import { UniformManager } from './managers/UniformManager';
import { ConfigManager } from './managers/ConfigManager';
import { CompileScheduler } from './CompileScheduler';
import { OpticsState } from '../features/optics';
import { LightingState } from '../features/lighting';
import { QualityState } from '../features/quality';
import type { GeometryState } from '../features/geometry';
import '../formulas';
import { halton } from '../../engine/codec/halton';
import { detectHardwareProfileMainThread } from './HardwareDetection';
import { createFullscreenPass } from './utils/FullscreenQuad';
import { createDefaultShaderConfig } from './ConfigDefaults';

// ──────────────────────────────────────────────────────────────────────
// Radiance HDR (RGBE) encoder — used by captureEnvMapAsHDR.
//
// Float pixels (RGBA, but we ignore A) -> RGBE bytes -> Radiance .hdr file.
// Uncompressed, stride-by-stride. RLE would shrink files ~50% but isn't
// worth the implementation cost yet at the resolutions we cap to (≤512).
// ──────────────────────────────────────────────────────────────────────
function encodeRadianceHDR(floats: Float32Array, w: number, h: number): Blob {
    const pixels = w * h;
    const rgbe = new Uint8Array(pixels * 4);

    for (let i = 0; i < pixels; i++) {
        let r = Math.max(0, floats[i * 4 + 0]);
        let g = Math.max(0, floats[i * 4 + 1]);
        let b = Math.max(0, floats[i * 4 + 2]);
        const v = Math.max(r, g, b);
        if (v < 1e-32) {
            // (0,0,0,0) is the canonical "all zero" RGBE pixel.
            rgbe[i * 4 + 0] = 0;
            rgbe[i * 4 + 1] = 0;
            rgbe[i * 4 + 2] = 0;
            rgbe[i * 4 + 3] = 0;
        } else {
            // Standard frexp split: e in [1, ...], mant in [0.5, 1).
            // Math.log2 + ceil reconstructs the exponent reliably.
            const exp = Math.ceil(Math.log2(v));
            const norm = 256 / Math.pow(2, exp);
            rgbe[i * 4 + 0] = Math.min(255, Math.floor(r * norm));
            rgbe[i * 4 + 1] = Math.min(255, Math.floor(g * norm));
            rgbe[i * 4 + 2] = Math.min(255, Math.floor(b * norm));
            rgbe[i * 4 + 3] = exp + 128;
        }
    }

    // GPU readback yields rows bottom-up; Radiance HDR expects rows top-down
    // when the resolution string is "-Y H +X W". Flip in place.
    const flipped = new Uint8Array(rgbe.length);
    const stride = w * 4;
    for (let y = 0; y < h; y++) {
        const src = (h - 1 - y) * stride;
        flipped.set(rgbe.subarray(src, src + stride), y * stride);
    }

    const header =
        '#?RADIANCE\n' +
        'FORMAT=32-bit_rle_rgbe\n' +
        '\n' +
        `-Y ${h} +X ${w}\n`;
    const headerBytes = new TextEncoder().encode(header);

    return new Blob([headerBytes, flipped], { type: 'image/vnd.radiance' });
}


/** Custom input event passed to FractalEngine.handleInput() from viewport interaction handlers. */
export type EngineInputEvent =
    | { type: 'wheel'; delta: number }
    | { type: 'drag'; dx: number; dy: number };

export interface EngineRenderState {
    cameraMode: 'Orbit' | 'Fly';
    isExporting: boolean;
    isBucketRendering: boolean;
    isMobile: boolean;
    optics: OpticsState | null;
    lighting: LightingState | null;
    quality: QualityState | null;
    geometry: GeometryState | null;
    bucketConfig: BucketRenderConfig;
    /** Hard-suppress adaptive resolution. Bucket-render dialog and export flows
     *  set this so the user judges quality at full res. Plumbed from the store
     *  via RENDER_TICK so UniformManager's adaptive loop can honour it. */
    adaptiveSuppressed: boolean;
    /** ADR-0061 worker bridge. Gesture-activity boolean from the
     *  InteractionSession (session.isInteracting()), declared at the input
     *  event rather than inferred from a buffered useFrame. Since P5 this is the
     *  SOLE activity signal the adaptive input reads (the legacy proxy is gone).
     *  The `!isExporting && !isBucketRendering` gate stays at the GMT consumer
     *  site, not here (E2). */
    interacting: boolean;
    /** ADR-0061. Autonomous scene animation (playback / active LFO) — the
     *  SEPARATE axis adaptive + hold compose with gesture activity (`interacting
     *  || isSceneAnimating`). Playback is NOT a gesture, so it is not an
     *  interaction source. */
    isSceneAnimating: boolean;
    /** ADR-0061. Filtered session activity for the accumulation HOLD —
     *  `session.isInteracting({ only: ['camera','gizmo','scrub'] })`. Hold wants
     *  the camera/gizmo/scrub gestures (where freezing the frame is correct),
     *  NOT slider/picker/drawing (which must re-render fresh each frame). Derived
     *  main-thread (where the session lives) and composed with `isSceneAnimating`
     *  by the hold consumer — this is the camera+playback+scrub+gizmo hold set
     *  the old `cameraInUse || isGizmoInteracting` proxy produced, without the
     *  buffered-useFrame lag. The worker only gets this serialized boolean; the
     *  filtering happens main-thread (the worker can't call session.isInteracting). */
    sessionHoldActive: boolean;
    /** Main-thread frame rate (GmtRendererTickDriver's 500ms sampler). The idle
     *  band scheduler closes its adaptive band-count loop on this — it's the
     *  compositor/responsiveness rate the band renderer exists to protect, and the
     *  signal the analytic cost estimate can't see (per-tick overhead). */
    fps?: number;
}

// Precompute 2048 jitter values using Halton sequence for faster access.
// @invariant Module-scope, shared across all FractalEngine instances —
//   safe because it is READ-ONLY.
const PRECOMPUTED_JITTER: THREE.Vector2[] = [];
for (let i = 1; i <= 2048; i++) {
    const jX = halton(i, 2) * 2.0 - 1.0;
    const jY = halton(i, 3) * 2.0 - 1.0;
    PRECOMPUTED_JITTER.push(new THREE.Vector2(jX, jY));
}

/**
 * @invariant `engine.renderer` and `engine.pipeline` are NULL on the main
 *   thread under worker mode. Code MUST guard via `engine.isBooted` or
 *   use the shadow state on `WorkerProxy`. Matches the "What NOT to Do"
 *   rule in `CLAUDE.md` / `docs/gmt/01_System_Architecture.md`.
 */
export class FractalEngine {
    public materials: MaterialController;
    public sceneCtrl: SceneController;
    private pickingCtrl: PickingController;
    private uniformManager: UniformManager;
    private configManager: ConfigManager;
    
    public readonly virtualSpace = new VirtualSpace();
    public renderer: THREE.WebGLRenderer | null = null;
    public pipeline: RenderPipeline;
    
    public modulations: Record<string, number> = {};

    public state: EngineRenderState = {
        cameraMode: 'Orbit',
        isExporting: false,
        isBucketRendering: false,
        isMobile: false,
        optics: null,
        lighting: null,
        quality: null,
        geometry: null,
        bucketConfig: { bucketSize: 512, outputWidth: 1920, outputHeight: 1080, tileCols: 1, tileRows: 1, accumulation: true, samplesPerBucket: 64 },
        adaptiveSuppressed: false,
        interacting: false,        // ADR-0061: session gesture activity (adaptive + idle-pause)
        isSceneAnimating: false,   // ADR-0061: autonomous-animation axis (composed with interacting)
        sessionHoldActive: false,  // ADR-0061: filtered camera/gizmo/scrub session activity (hold)
        fps: 0,                    // M5b: measured main-thread fps for the adaptive band loop
    };

    public isPaused: boolean = false;
    private lastInteractionTime: number = 0;

    // ── Tiled progressive idle rendering (plans/tiled-progressive-rendering.md, M2) ──
    // When accumulating on a STATIC scene, render one horizontal band per tick
    // instead of a full-screen sample, so each frame is a short GPU submit the
    // compositor can interleave UI paints between. The whole screen advances one
    // sample at a time (pass-indexed blend). Off during interaction/hold, bucket,
    // export, and preview-region.
    public progressiveTilingEnabled: boolean = true;
    /** Worker sets this true while preview-region owns the render, so tiling
     *  stands down for that specialised path. */
    public tilingSuppressed: boolean = false;
    private bandScheduler = new BandScheduler();
    private _tilingActive = false;
    /** Adaptive band-count controller (M5b). Float so the FPS feedback loop can
     *  nudge it fractionally; rounded when pushed to the scheduler. Seeded from the
     *  analytic cost estimate on a fresh accumulation, then closed-loop on measured
     *  fps. 0 = uninitialised. */
    private _bandCountCtrl = 0;
    /** performance.now() of the last FPS-driven band-count adjustment — throttles
     *  the loop to roughly one step per fps sample window. */
    private _lastBandAdjustTime = 0;
    /** Render-target width at the last frame we actually drew. Used to catch the
     *  adaptive→idle handoff frame (resolution restored to full) and keep a stray
     *  full-screen pass off it — bands must own the first full-res frame. */
    private _lastRenderResX = 0;
    private _bandMin = new THREE.Vector2(0, 0);
    private _bandMax = new THREE.Vector2(1, 1);
    private _lastCameraInUseTime: number = 0;

    public shouldSnapCamera: boolean = false;
    public lastMeasuredDistance: number = 10.0;
    // True when the crosshair-center pixel is sky (no surface hit). Distinct
    // from lastMeasuredDistance, which retains the last valid distance so
    // navigation keeps working over sky — this carries the live hit/miss state.
    public centerIsSky: boolean = false;
    public dirty: boolean = true;
    
    public isBooted: boolean = false;

    /** Owns the off-thread shader compile pipeline + parallel-compile
     *  detection + generation counter. External `engine.isCompiling` /
     *  `hasCompiledShader` / `lastCompileDuration` getters delegate here. */
    private compiler!: CompileScheduler;

    private _pendingTeleport: CameraState | null = null;
    private _totalFrames: number = 0;

    private lastRenderState = {
        pos: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        offset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 },
        fov: 60.0
    };
    
    private jitterVec = new THREE.Vector2();

    private inputState = {
        isDragging: false,
        lastX: 0,
        lastY: 0,
        zoomSpeed: 0.1,
        rotateSpeed: 0.005
    };

    constructor() {
        this.state.isMobile = detectHardwareProfileMainThread().isMobile;

        // --- DYNAMIC CONFIG GENERATION ---
        // Shared with test harnesses so feature-registry iteration stays in one place.
        const initialConfig = createDefaultShaderConfig('Mandelbulb') as any;

        if (this.state.isMobile && initialConfig.quality) {
            initialConfig.quality.precisionMode = 1.0;
            // Use HalfFloat16 on mobile - works well on modern iOS devices
            initialConfig.quality.bufferPrecision = 1.0; // HalfFloat16
        }

        this.configManager = new ConfigManager(initialConfig as ShaderConfig);
        this.materials = new MaterialController(initialConfig as ShaderConfig);
        this.sceneCtrl = new SceneController(this.materials);
        this.pipeline = new RenderPipeline();
        this.pickingCtrl = new PickingController(this.materials, this.sceneCtrl, this.virtualSpace, this.pipeline);
        
        this.pipeline.updateQuality(initialConfig.quality as QualityState);

        this.uniformManager = new UniformManager(this.materials.mainUniforms, this.virtualSpace, this.pipeline);

        this.compiler = new CompileScheduler({
            getRenderer:       () => this.renderer,
            getMainUniforms:   () => this.materials.mainUniforms,
            materials:         this.materials,
            sceneCtrl:         this.sceneCtrl,
            pipeline:          this.pipeline,
            configManager:     this.configManager,
            pipelineRender:    (r) => this.pipelineRender(r),
            resetAccumulation: () => this.resetAccumulation(),
        });

        this.materials.setGradient([
            { id: '1', position: 0.0, color: '#000000' },
            { id: '2', position: 1.0, color: '#ffffff' }
        ], 'uGradientTexture');
        
        this.bindEvents();
        this.isBooted = false;

        // Bind bucket renderer to this engine instance
        bucketRenderer.init(this);

        this.markInteraction();
    }

    public handleInput(event: EngineInputEvent) {
        if (!this.activeCamera) return;
        this.markInteraction();

        if (event.type === 'wheel') {
            if (!event.delta) return; // zero-delta wheel — no camera move, no reset
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.activeCamera.quaternion);
            this.activeCamera.position.addScaledVector(forward, event.delta * this.inputState.zoomSpeed * this.lastMeasuredDistance);
            this.resetAccumulation();
        } else if (event.type === 'drag') {
            if (!event.dx && !event.dy) return; // zero-delta drag — no rotation, no reset
            const up = new THREE.Vector3(0, 1, 0);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.activeCamera.quaternion);
            const qPitch = new THREE.Quaternion().setFromAxisAngle(right, event.dy * this.inputState.rotateSpeed);
            const qYaw = new THREE.Quaternion().setFromAxisAngle(up, -event.dx * this.inputState.rotateSpeed);
            this.activeCamera.quaternion.multiplyQuaternions(qYaw, this.activeCamera.quaternion);
            this.activeCamera.quaternion.multiplyQuaternions(this.activeCamera.quaternion, qPitch);
            this.resetAccumulation();
        }
    }
    
    public markInteraction() {
        this.lastInteractionTime = performance.now();
    }

    /** Pre-load config without triggering compilation. Used by worker INIT
     *  so gradients/uniforms are ready before the deferred BOOT message arrives. */
    public preloadConfig(config: ShaderConfig) {
        this.configManager.config = { ...config };
        this.configManager.rebuildMap();
    }

    public bootWithConfig(config: ShaderConfig) {
        if (this.isBooted) return;
        if (import.meta.env.DEV) console.log("⚡ FractalEngine: Booting...");

        this.configManager.config = { ...config };
        this.configManager.rebuildMap();

        this.isBooted = true;
        this.compiler.schedule();
    }

    public get mainMaterial() { return this.materials.mainMaterial; }
    public get histogramMaterial() { return this.materials.histogramMaterial; }
    public get mainUniforms() { return this.materials.mainUniforms; }
    public get histogramUniforms() { return this.materials.histogramUniforms; }
    public get mainScene() { return this.sceneCtrl.mainScene; }
    public get mainCamera() { return this.sceneCtrl.mainCamera; }
    public get mainMesh() { return this.sceneCtrl.mainMesh; }
    public get activeCamera() { return this.sceneCtrl.activeCamera; }
    public get lastGeneratedFrag() { return this.materials.getLastFrag(); }
    public get isCompiling()         { return this.compiler.isCompiling; }
    public get hasCompiledShader()   { return this.compiler.hasCompiledShader; }
    public set hasCompiledShader(v: boolean) { this.compiler.hasCompiledShader = v; }
    public get lastCompileDuration() { return this.compiler.lastDuration; }

    public get sceneOffset() { return this.virtualSpace.state; }
    public get isExporting() { return this.state.isExporting; }
    public get isBucketRendering() { return this.state.isBucketRendering; }

    private bindEvents() {
        FractalEvents.on(FRACTAL_EVENTS.UNIFORM, ({ key, value, noAccumReset }) => { this.setUniform(key, value, noAccumReset); });
        FractalEvents.on(FRACTAL_EVENTS.CONFIG, (newConfig) => { this.updateConfigInternal(newConfig as any); });
        FractalEvents.on(FRACTAL_EVENTS.RESET_ACCUM, () => { this.resetAccumulation(); });
        FractalEvents.on(FRACTAL_EVENTS.OFFSET_SHIFT, ({ x, y, z }) => { this.virtualSpace.move(x, y, z); this.resetAccumulation(); });
        FractalEvents.on(FRACTAL_EVENTS.OFFSET_SET, (v) => {
            const current = this.virtualSpace.state;
            if (Math.abs(current.x - v.x) > 1e-9 || Math.abs(current.y - v.y) > 1e-9 || Math.abs(current.z - v.z) > 1e-9) {
                this.virtualSpace.state = v;
                this.resetAccumulation();
            }
        });
        FractalEvents.on(FRACTAL_EVENTS.CAMERA_ABSORB, ({ camera }) => {
            this.virtualSpace.absorbCamera(camera.position);
            camera.position.set(0, 0, 0);
            camera.updateMatrixWorld();
            this.resetAccumulation();
        });
        FractalEvents.on(FRACTAL_EVENTS.CAMERA_SNAP, () => { this.shouldSnapCamera = true; this.resetAccumulation(); });
        FractalEvents.on(FRACTAL_EVENTS.CAMERA_TELEPORT, (state: CameraState) => {
            if (this.activeCamera) {
                this.virtualSpace.applyCameraState(this.activeCamera, state);
                if (state.targetDistance && state.targetDistance > 0) {
                    this.lastMeasuredDistance = state.targetDistance;
                }
                this.shouldSnapCamera = true; 
                this.resetAccumulation();
            } else {
                this._pendingTeleport = state;
            }
        });
    }
    
    public updateTexture(type: 'color' | 'env', dataUrl: string | null) {
        this.materials.loadTexture(type, dataUrl);
    }

    /**
     * @invariant Deliberately does NOT set `dirty = true` — would
     *   infinite-loop with `update()`. The `dirty` flag is for "config
     *   changed, recompile" semantics; accumulation reset is a separate
     *   concern (RenderPipeline.reset on the next render).
     */
    public resetAccumulation() {
        // NOTE: Removed setting 'this.dirty = true' because it was causing an infinite loop
        // in the update() method where accumulation was constantly being reset
        this.markInteraction();
        this.bandScheduler.reset();
        this.pipeline?.resetAccumulation();
    }
    public setPreviewSampleCap(n: number) { this.pipeline?.setSampleCap(n); }

    /** Write the active render region (UV-space) to the shader. Used by tiling for
     *  the per-band rect and to restore the full frame (0,0)-(1,1). */
    private setRegion(minX: number, minY: number, maxX: number, maxY: number) {
        this._bandMin.set(minX, minY);
        this._bandMax.set(maxX, maxY);
        this.materials.setUniform(Uniforms.RegionMin, this._bandMin);
        this.materials.setUniform(Uniforms.RegionMax, this._bandMax);
    }

    /** Force tiling to release the region uniforms back to full-frame and clear the
     *  blend override. Called when an exclusive render mode (export/bucket) starts,
     *  because those don't run compute()'s tiling-exit branch, so a leftover band
     *  region would otherwise clip the exported / bucketed image. */
    public clearTilingRegion() {
        this._tilingActive = false;
        this.pipeline.setTiledBlend(null);
        this.setRegion(0, 0, 1, 1);
    }
    
    public registerCamera(camera: THREE.Camera) { 
        this.sceneCtrl.registerCamera(camera); 
        if (this._pendingTeleport) {
            this.virtualSpace.applyCameraState(camera, this._pendingTeleport);
            if (this._pendingTeleport.targetDistance) this.lastMeasuredDistance = this._pendingTeleport.targetDistance;
            FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, this._pendingTeleport);
            this._pendingTeleport = null;
            this.shouldSnapCamera = true;
            this.resetAccumulation();
        }
    }
    
    public registerRenderer(renderer: THREE.WebGLRenderer) { this.renderer = renderer; }

    /**
     * Sync a THREE.Camera's world matrix into the shader's camera uniforms.
     * This is the canonical camera-→-uniform bridge used by the worker at
     * boot and per tick, and by test harnesses per frame. Any change to the
     * camera-uniform set (new FOV/near/far uniforms, matrix-based camera,
     * etc.) should happen here and propagate to all callers automatically.
     */
    public syncCameraFromMatrix(camera: THREE.PerspectiveCamera) {
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        const m = camera.matrixWorld.elements;
        const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
        const tanHalf = Math.tan(halfFov);
        const u = this.mainUniforms as any;
        u.uCameraPosition.value.set(m[12], m[13], m[14]);
        u.uCamBasisX.value.set(m[0], m[1], m[2]).multiplyScalar(tanHalf * camera.aspect);
        u.uCamBasisY.value.set(m[4], m[5], m[6]).multiplyScalar(tanHalf);
        u.uCamForward.value.set(-m[8], -m[9], -m[10]);
    }

    /**
     * Await the next compile cycle to complete. Resolves when
     * `IS_COMPILING=false` fires; rejects on timeout. Shared primitive for
     * test harnesses and any tooling that needs deterministic compile
     * completion. The app's React UI uses FractalEvents listeners directly
     * and doesn't need this.
     */
    public awaitCompile(timeoutMs = 30000): Promise<void> {
        return this.compiler.awaitCompile(timeoutMs);
    }

    public resolveLightPosition(currentPos: {x:number, y:number, z:number}, wasFixed: boolean): {x:number, y:number, z:number} {
        return this.virtualSpace.resolveRealWorldPosition(currentPos, wasFixed, this.sceneCtrl.getCamera());
    }

    private updateConfigInternal(newConfig: Partial<ShaderConfig>) {
        this.markInteraction(); 
        if ((newConfig as any).quality) {
            this.pipeline.updateQuality((newConfig as any).quality as QualityState);
        }
        if ((newConfig as any).quality?.accumulation !== undefined) {
             this.pipeline.setAccumulationEnabled((newConfig as any).quality.accumulation);
        }

        if (!this.isBooted) {
             this.configManager.update(newConfig, this.state);
             return;
        }

        const { rebuildNeeded, uniformUpdate, modeChanged, needsAccumReset } = this.configManager.update(newConfig, this.state);

        if (newConfig.maxSteps !== undefined) {
             this.setUniform('uMaxSteps', newConfig.maxSteps);
        }

        if (modeChanged && !rebuildNeeded) {
            // Only do immediate mode swap if no rebuild is needed.
            // If rebuildNeeded, performCompilation handles the mode switch via async path.
            // Doing it here would trigger lazy synchronous PT compilation in getMaterial(),
            // causing a 14s GPU freeze (fxc on Windows).
            const mode = this.configManager.config.renderMode;
            const mat = this.materials.getMaterial(mode || 'Direct');
            this.sceneCtrl.setMaterial(mat);
            this.resetAccumulation();
            FractalEvents.emit(FRACTAL_EVENTS.SHADER_CODE, this.materials.getLastFrag());
        }

        if (rebuildNeeded) {
            this.compiler.schedule();
        } else {
            if (!this.compiler.isCompiling) {
                FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
            }

            if (uniformUpdate) {
                this.materials.syncConfigUniforms(this.configManager.config);
                if (this.configManager.config.pipeline) {
                    this.materials.syncModularUniforms(this.configManager.config.pipeline, this.configManager.config.graph?.edges ?? []);
                }
                // Only reset accumulation if a non-noAccumReset param actually changed.
                // Post-process params (bloom, CA, color grading) are noAccumReset and should
                // not disrupt the accumulated buffer.
                if (needsAccumReset) {
                    this.resetAccumulation();
                }
            } else if (Object.keys(newConfig).length > 0 && needsAccumReset) {
                this.resetAccumulation();
            }
        }
    }
    

    /** Called by CONFIG_DONE message or fallback timer. Fires the actual compile. */
    public fireCompile() { this.compiler.fire(); }


    public setUniform(key: string, value: any, noAccumReset: boolean = false) {
        const changed = this.materials.setUniform(key, value);
        this.configManager.syncUniform(key, value);
        // Only reset accumulation when the uniform's value actually changed.
        // Re-emitting an unchanged value (display-only uniforms, redundant
        // param writes, probe-driven no-ops) must not disturb the buffer.
        if (!noAccumReset && changed) this.resetAccumulation();
    }
    
    public setRenderState(partial: Partial<EngineRenderState>) {
        Object.assign(this.state, partial);
        if (partial.quality) this.pipeline.updateQuality(partial.quality);
        
        if (partial.bucketConfig?.accumulation !== undefined) {
             this.pipeline.setAccumulationEnabled(partial.bucketConfig.accumulation);
        }
        
        if ((partial.quality as any)?.accumulation !== undefined) {
            this.pipeline.setAccumulationEnabled((partial.quality as any).accumulation);
        }
    }
    
    public update(camera: THREE.Camera, delta: number, state: any, isInteracting: boolean = false) {
        if (!this.isBooted) return;
        if (this.state.isExporting) return;
        if (isInteracting) this.markInteraction();

        this._totalFrames++;
        // During bucket rendering, use per-bucket accumulation count for frame count.
        // This gives each bucket a deterministic R2 noise sequence starting from 1,
        // making DoF and stochastic sampling reproducible regardless of bucket order.
        this.mainUniforms[Uniforms.FrameCount].value = this.state.isBucketRendering
            ? this.pipeline.accumulationCount
            : this._totalFrames;

        if (this.renderer && this.state.isBucketRendering) {
            bucketRenderer.update(this.renderer, this.state.bucketConfig);
        }
        
        const targetFov = this.state.optics?.camFov ?? 60.0;

        this.virtualSpace.updateSmoothing(camera, targetFov, delta, this.shouldSnapCamera, isInteracting);
        
        if (this.shouldSnapCamera) {
            this.shouldSnapCamera = false;
            if (!this.state.isBucketRendering) this.pipeline.resetAccumulation();
        }

        const currentOffsetState = this.sceneOffset;
        const prevRenderOffset = this.lastRenderState.offset;
        const offsetChanged = Math.abs(currentOffsetState.x - prevRenderOffset.x) > 1e-9 || Math.abs(currentOffsetState.y - prevRenderOffset.y) > 1e-9 || Math.abs(currentOffsetState.z - prevRenderOffset.z) > 1e-9;

        const sPos = this.virtualSpace.smoothedPos;
        const sQuat = this.virtualSpace.smoothedQuat;
        const sFov = this.virtualSpace.smoothedFov;

        // During bucket rendering, do NOT reset accumulation on camera drift —
        // the bucket renderer manages its own per-bucket accumulation cycle.
        const userMoved = sPos.distanceToSquared(this.lastRenderState.pos) > 1e-4 || sQuat.angleTo(this.lastRenderState.quat) > 1e-3 || Math.abs(sFov - this.lastRenderState.fov) > 0.1 || offsetChanged || this.dirty;
        if (!this.state.isBucketRendering && userMoved) {
            this.pipeline.resetAccumulation(); this.dirty = false;
            // Release any held final frame from a completed Refine/Preview session —
            // the user is now interacting, so the held image should yield to live rendering.
            if (bucketRenderer.isHoldingFinalFrame()) bucketRenderer.releaseHeldFinalFrame();
        }
        if (sPos.distanceToSquared(this.lastRenderState.pos) > 1e-4 || sQuat.angleTo(this.lastRenderState.quat) > 1e-3 || Math.abs(sFov - this.lastRenderState.fov) > 0.1 || offsetChanged) {
            this.lastRenderState.pos.copy(sPos); this.lastRenderState.quat.copy(sQuat);
            this.lastRenderState.offset = { ...currentOffsetState };
            this.lastRenderState.fov = sFov;
        }
        if (!this.state.isBucketRendering && this.dirty) this.dirty = false;

        const cam = camera as THREE.PerspectiveCamera;
        this.sceneCtrl.updateFallback(sPos, sQuat, sFov, cam.aspect);
        this.syncFrame(this.sceneCtrl.fallbackCamera, state);
    }

    /** Helper: call pipeline.render with engine's uniforms/scene/camera */
    public pipelineRender(renderer: THREE.WebGLRenderer) {
        this.pipeline.render(renderer, this.mainUniforms, this.mainScene, this.mainCamera);
    }

    // New: Compute Phase (Updates FBOs)
    public compute(renderer: THREE.WebGLRenderer) {
        if (!this.isBooted || this.state.isExporting) return;
        
        const now = performance.now();

        // Idle-pause early-return. ADR-0061 migrates this by COMPOSITION, not
        // replacement: keepAwake is `session-active OR recently-woke`, where
        // recentlyWoke (`lastInteractionTime` within 1s) is the EXISTING WAKE /
        // invalidation signal (markInteraction fires on discrete preset/param/
        // config changes that produce no gesture) and MUST stay — reading the
        // session alone would stop a paused render from waking on a non-drag
        // change (click a preset, type a value). The session term covers live
        // gestures. (`this.state.interacting` is the serialized session boolean
        // incl. its 200ms tail; the 1s wake window dominates either way — the
        // worker can't call session.isIdle(), so it reads the boolean.)
        if (this.isPaused && !this.state.isBucketRendering) {
            const recentlyWoke = now - this.lastInteractionTime <= 1000;
            const keepAwake = this.state.interacting || recentlyWoke;
            if (!keepAwake) return;
        }

        // Hold accumulation during camera interaction ONLY if DOF is disabled
        // If DOF is enabled, continue rendering to show blur preview (with stable per-pixel noise)
        // During bucket rendering, never hold — the bucket renderer drives the pipeline.
        const dofEnabled = (this.state.optics?.dofStrength ?? 0) > 0.0001;
        const wasHolding = this.pipeline.isHolding;

        // Accumulation hold. ADR-0061: driven by the InteractionSession's
        // FILTERED activity (camera/gizmo/scrub — `sessionHoldActive`, derived
        // main-thread) composed with the autonomous isSceneAnimating axis. This
        // is the camera+playback+scrub+gizmo hold set the old `cameraInUse ||
        // isGizmoInteracting` proxy produced, without the buffered-useFrame lag.
        // Deliberately NOT the unfiltered session: slider/picker/drawing gestures
        // must re-render fresh each frame (holding would freeze a stale frame —
        // `pipeline.render()` is a no-op while holding), so they stay OUT of the
        // hold set. (The worker only gets the serialized boolean; the filtering
        // happens main-thread since the worker can't call session.isInteracting.)
        const holdActive = this.state.sessionHoldActive || this.state.isSceneAnimating;
        if (holdActive) this._lastCameraInUseTime = now;

        // Extend hold until adaptive resolution has settled at full res.
        // Without this, accumulation starts at reduced res, then the adaptive grace period
        // expires and full res kicks in — resetting accumulation a second time (double kick).
        // By keeping hold active for the adaptive grace period + a small buffer, the resize
        // happens while hold is still active (a no-op), so accumulation starts once at full res.
        const adaptiveEnabled = this.state.quality?.dynamicScaling ?? false;
        const timeSinceCam = now - this._lastCameraInUseTime;
        const holdForAdaptive = adaptiveEnabled && timeSinceCam < this.uniformManager.getAdaptiveGrace() + 50;

        const shouldHold = !this.state.isBucketRendering && !dofEnabled && (holdActive || holdForAdaptive);
        this.pipeline.setHold(shouldHold);

        // If we just started holding, reset accumulation for clean frame
        if (shouldHold && !wasHolding) {
            this.pipeline.resetAccumulation();
        }

        // ── Tiled progressive idle rendering ─────────────────────────────────
        // On a static scene (not holding, not bucket/export, region not owned by
        // preview-region, accumulation on), render ONE horizontal band this tick
        // instead of a full-screen sample. The band's uRegionMin/Max confine the
        // expensive trace; the shader copies history forward outside it so the
        // accumulation buffer stays complete. blend + accumulationCount come from
        // the pass-indexed band scheduler — render() honours the blend override
        // and skips its auto-increment. See plans/tiled-progressive-rendering.md.
        // `interacting` is the full session signal (incl. slider/picker/drawing). TILE
        // only when accumulation is SURVIVING (`accumulationCount > 1`) during a gesture
        // — that is the "the image is static this frame" signal, and it splits the two
        // held-gesture cases correctly so the handoff is adaptive-while-dragging,
        // bands-on-pause:
        //   • display-only / no-reset drag (bloom, saturation, droste): never resets
        //     accumulation → always > 1 → bands the whole time (the post-process fix:
        //     measured ~6-18fps full-frame → ~30fps tiled).
        //   • scene-changing drag (power, camera blur): ACTIVE movement resets every
        //     frame → pinned at 0/1 → NOT tiled → adaptive resolution drives a cheap
        //     downscaled live preview; the moment the user PAUSES, accumulation climbs
        //     past 1 → hands off to bands and converges. (Banding a reset-every-frame
        //     drag would only ever paint the centre strip, and flipping to bands mid-drag
        //     is the "hands off too soon" regression.)
        // (Sliders stay out of the hold set for the same "not a camera move" reason,
        // ADR-0061.) `shouldHold` adds playback + adaptive-grace.
        // `convergenceNeeded` = a render-region overlay owns uRegionMin/Max — stand
        // down so tiling doesn't overwrite the user's region with bands.
        // `isSceneAnimating` (timeline playback / live LFO) must gate tiling DIRECTLY,
        // not via `shouldHold`: playback is not a gesture so it never sets
        // `interacting`, and `shouldHold` has a DOF carve-out (false while DOF is on so
        // the blur preview renders) — so with DOF enabled, animation would otherwise
        // fall into tiling. But the scene changes EVERY frame during animation, which
        // resets accumulation each tick → the band scheduler restarts at pass 0 → only
        // the centre band ever paints. Animation must render full-frame (adaptive
        // engages on `isSceneAnimating` in UniformManager), never banded.
        // Adaptive while dragging, bands on pause: tile only when accumulation is
        // surviving (static this frame). See block comment above.
        const tilesDuringInteraction = !this.state.interacting || this.pipeline.accumulationCount > 1;
        const tiling = this.progressiveTilingEnabled && !shouldHold && tilesDuringInteraction
            && !this.state.isSceneAnimating
            && !this.state.isBucketRendering && !this.state.isExporting
            && !this.tilingSuppressed && !this.pipeline.convergenceNeeded
            && this.pipeline.accumulationEnabled;
        if (tiling) {
            const wasTiling = this._tilingActive;
            this._tilingActive = true;
            // M5b — adaptive band count, closed-loop on measured fps.
            //   Seed: nBands ≈ fullFrameCost / targetBandMs (analytic). Good starting
            //     point so a new scene converges in ~1 window instead of ramping.
            //   Refine: AIMD off the REAL main-thread fps. The analytic model ignores
            //     per-tick overhead (whole-screen history copy + blit + driver), so it
            //     undershoots the target; the feedback loop makes the band count
            //     actually hit it. Multiplicative increase (fast back-off when too
            //     slow → protect responsiveness), additive decrease (slowly reclaim
            //     convergence speed when there's headroom), deadband between to avoid
            //     oscillation. setBandCount defers to a pass boundary, so per-tick
            //     calls are safe.
            // The "Target FPS" responsiveness slider (quality.adaptiveTarget) is the
            // target; fall back to 30 when it's off.
            const targetFps = (this.state.quality?.adaptiveTarget ?? 0) > 0
                ? (this.state.quality!.adaptiveTarget as number)
                : 30;
            if (this.pipeline.accumulationCount === 0 || this._bandCountCtrl <= 0) {
                // Fresh accumulation (new scene/view) — reseed from the analytic estimate.
                const fullMs = this.uniformManager.getFullResFrameMs();
                const seed = fullMs > 0 ? Math.ceil(fullMs / (1000 / targetFps)) : 24;
                this._bandCountCtrl = Math.max(1, Math.min(64, seed));
                this._lastBandAdjustTime = now;
            } else if (!wasTiling) {
                // Just re-entered steady tiling — let it settle a window before the
                // loop reads fps (the last reading reflects the interaction, not bands).
                this._lastBandAdjustTime = now;
            } else {
                const fps = this.state.fps ?? 0;
                if (fps > 0 && now - this._lastBandAdjustTime >= 500) {
                    this._lastBandAdjustTime = now;
                    if (fps < targetFps * 0.92) {
                        // Too slow → more (thinner) bands. Step scales with the deficit.
                        const factor = Math.min(1.6, Math.max(1.05, targetFps / fps));
                        this._bandCountCtrl = Math.min(64, this._bandCountCtrl * factor);
                    } else if (fps > targetFps * 1.12 && this._bandCountCtrl > 1) {
                        // Headroom → fewer bands, one at a time (slow reclaim).
                        this._bandCountCtrl = Math.max(1, this._bandCountCtrl - 1);
                    }
                }
            }
            this.bandScheduler.setBandCount(Math.round(this._bandCountCtrl));
            // Restart pass 0 ONLY when accumulation was ACTUALLY reset
            // (accumulationCount===0) — NEVER just because tiling re-entered. A
            // momentary exit/re-enter (e.g. a display-only slider that briefly flips
            // `interacting`, or any blip) must not restart accumulation on a settled
            // scene. `accumulationCount===0` also catches direct
            // pipeline.resetAccumulation() calls that bypass engine.resetAccumulation()
            // (ghosting fix). The buffer always holds the last frame (resize() blits
            // content forward), so pass-0 refines over it band-by-band — no seed.
            if (this.pipeline.accumulationCount === 0) {
                this.bandScheduler.reset();
            } else if (!wasTiling) {
                // Re-entering tiling after a full-frame interlude (a display-only /
                // no-reset param flips `interacting` for the gesture's duration). Those
                // full-frame frames advanced accumulationCount uniformly over the whole
                // screen; resume the scheduler from that count so the count stays
                // MONOTONIC. Otherwise the re-entry overwrites accumulationCount back
                // down to the frozen passIndex+1, which the adaptive accum-drop heuristic
                // misreads as a buffer-invalidating gesture → phantom downscale → reset →
                // the whole scene restarts accumulating on every no-reset param change.
                this.bandScheduler.resumeFrom(this.pipeline.accumulationCount);
            }
            const cap = this.pipeline.getSampleCap();
            if (cap > 0 && this.bandScheduler.passCount >= cap) {
                // Converged at the sample cap: stop advancing. Clearing the blend
                // override lets render()'s normal cap gate no-op (accumulationCount is
                // pinned at the cap), so the raymarch idles and the count stops climbing;
                // the display keeps showing the converged buffer.
                this.pipeline.setTiledBlend(null);
            } else {
                const band = this.bandScheduler.next();
                this.setRegion(0, band.y0, 1, band.y1);
                this.pipeline.accumulationCount = band.sampleCount;
                this.pipeline.setTiledBlend(band.blend);
            }
        } else if (this._tilingActive) {
            // Leaving tiled mode: clear the blend override, and restore the full region
            // unless another owner (bucket/export/preview/render-region) owns it now.
            this._tilingActive = false;
            this.pipeline.setTiledBlend(null);
            if (!this.state.isBucketRendering && !this.state.isExporting
                && !this.tilingSuppressed && !this.pipeline.convergenceNeeded) {
                this.setRegion(0, 0, 1, 1);
            }
        }

        // Apply Jitter
        if (this.pipeline.accumulationCount > 1) {
            const idx = (this.pipeline.accumulationCount % PRECOMPUTED_JITTER.length);
            const jitter = PRECOMPUTED_JITTER[idx];
            this.jitterVec.copy(jitter);
            this.mainUniforms.uJitter.value.copy(this.jitterVec);
        } else {
            this.mainUniforms.uJitter.value.set(0,0);
        }

        // SSAA: During bucket rendering at upscale > 1x, override uPixelSizeBase to viewport value.
        // UniformManager recomputes it from the upscaled resolution each frame, but we want the
        // same trace precision/normal epsilon/shadow bias as the viewport for true supersampling.
        if (this.state.isBucketRendering && bucketRenderer.savedPixelSizeBase > 0) {
            this.mainUniforms[Uniforms.PixelSizeBase].value = bucketRenderer.savedPixelSizeBase;
        }

        // Adaptive→idle handoff guard. When adaptive restores full resolution it
        // resizes the targets (one step, scale→1) on a frame where tiling may not yet
        // own the render — that lone full-RES full-screen raymarch is the hitch the
        // band renderer exists to avoid (the hold-extension that should cover it keys
        // off camera-use time, which slider-driven adaptive never updates). If the
        // resolution just grew and tiling isn't taking this frame, SKIP the draw: the
        // resize already blitted the previous frame forward so the display stays
        // valid, and next frame the band sweep starts at full res. Bucket/export own
        // their own resize cadence, so leave them alone.
        const resX = this.mainUniforms.uResolution.value.x;
        const resJustGrew = this._lastRenderResX > 0 && resX > this._lastRenderResX;
        this._lastRenderResX = resX;
        const skipForHandoff = resJustGrew && this.progressiveTilingEnabled && !tiling
            && !this.state.isBucketRendering && !this.state.isExporting;

        // Execute Render Pipeline
        if (!skipForHandoff) {
            this.pipelineRender(renderer);
        }
    }

    // Updated: Only used for legacy or explicit blit calls (e.g. video export)
    public render(renderer: THREE.WebGLRenderer) { 
        // Forward compat stub: If called directly, run compute then blit to default
        this.compute(renderer);
        
        // Blit to screen — used for Bucket/Export paths
        const outputTex = this.pipeline.getOutputTexture();
        if (outputTex) {
            this.materials.displayMaterial.uniforms.map.value = outputTex;
            renderer.setRenderTarget(null);
            renderer.render(this.sceneCtrl.displayScene, this.sceneCtrl.mainCamera);
        }
    }
    
    /**
     * Read the active env-map texture back from the GPU as a tonemapped
     * JPEG blob. Used by the gallery submission flow to externalize the
     * env as a separate accompanying image so the GMF stays small and
     * round-trips cleanly even when the source was HDR (which the browser
     * can't decode via createImageBitmap).
     *
     * The pipeline samples the equirect texture to a fixed-size render
     * target, applies ACES tonemap + sRGB encoding, reads back, and JPEG-
     * encodes via OffscreenCanvas. Aspect is intentionally not preserved
     * — env-lighting sample distribution is robust to mild stretching
     * and a square texture cuts file size further.
     *
     * Returns null if no env map is bound.
     */
    public async captureEnvMap(maxEdge: number = 1024, quality: number = 0.85): Promise<Blob | null> {
        if (!this.renderer) return null;
        const envTex = this.materials.getUniform('uEnvMapTexture') as THREE.Texture | null | undefined;
        if (envTex && !(envTex instanceof THREE.Texture)) return null;
        if (!envTex || !envTex.image) return null;

        // HDR sources (HalfFloat / Float DataTexture) round-trip via Radiance
        // RGBE rather than tonemapping to JPEG. Smaller max edge keeps the
        // raw RGBE bytes under ~1 MB without RLE.
        const texType = (envTex as any).type;
        if (texType === THREE.HalfFloatType || texType === THREE.FloatType) {
            return this.captureEnvMapAsHDR(envTex, 512);
        }

        const srcW = (envTex.image as any).width ?? maxEdge;
        const srcH = (envTex.image as any).height ?? maxEdge;
        const w = Math.min(srcW, maxEdge);
        const h = Math.min(srcH, maxEdge);

        // SRGBColorSpace on the render target → Three encodes the shader's
        // linear output to sRGB at write time. Without it we'd have to apply
        // gamma manually; with the wrong combination of source colorSpace
        // and manual gamma the result double-encodes and the JPEG comes
        // back too bright (which is what happens for HDR sources). Letting
        // Three own the encoding step is consistent with how the main
        // render target is set up.
        const target = new THREE.WebGLRenderTarget(w, h, {
            type: THREE.UnsignedByteType,
            format: THREE.RGBAFormat,
            colorSpace: THREE.SRGBColorSpace,
            stencilBuffer: false,
            depthBuffer: false,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
        });

        const scene = new THREE.Scene();
        const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const mat = new THREE.ShaderMaterial({
            uniforms: { uMap: { value: envTex } },
            vertexShader: `
                varying vec2 vUv;
                void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
            `,
            fragmentShader: `
                precision highp float;
                uniform sampler2D uMap;
                varying vec2 vUv;
                vec3 aces(vec3 x) {
                    float a=2.51, b=0.03, c=2.43, d=0.59, e=0.14;
                    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
                }
                void main() {
                    // Output linear; the render target's SRGBColorSpace
                    // handles the gamma encoding.
                    vec3 col = texture2D(uMap, vUv).rgb;
                    col = aces(col);
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            depthTest: false,
            depthWrite: false,
        });
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
        scene.add(quad);

        const originalTarget = this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(target);
        this.renderer.clear();
        this.renderer.render(scene, cam);
        const buffer = new Uint8Array(w * h * 4);
        this.renderer.readRenderTargetPixels(target, 0, 0, w, h, buffer);
        this.renderer.setRenderTarget(originalTarget);

        // Tear down throwaway resources
        target.dispose();
        mat.dispose();
        (quad.geometry as THREE.BufferGeometry).dispose();

        // Build a 2D canvas from the readback. Worker context = OffscreenCanvas;
        // host-app context = HTMLCanvasElement (kept for symmetry with snapshot).
        const canvas2d = (typeof document !== 'undefined')
            ? document.createElement('canvas')
            : new OffscreenCanvas(w, h);
        canvas2d.width = w;
        canvas2d.height = h;
        const ctx = canvas2d.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
        if (!ctx) return null;
        const imageData = ctx.createImageData(w, h);
        const stride = w * 4;
        for (let y = 0; y < h; y++) {
            const srcStart = y * stride;
            const destRowStart = (h - 1 - y) * stride;
            imageData.data.set(buffer.subarray(srcStart, srcStart + stride), destRowStart);
        }
        ctx.putImageData(imageData, 0, 0);
        if (canvas2d instanceof OffscreenCanvas) {
            return canvas2d.convertToBlob({ type: 'image/jpeg', quality });
        }
        return new Promise(resolve =>
            (canvas2d as HTMLCanvasElement).toBlob(resolve, 'image/jpeg', quality)
        );
    }

    /**
     * Re-encode an HDR env-map texture as a Radiance .hdr blob via GPU
     * readback. Preserves dynamic range > 1.0 (sun, etc.) so on-load
     * lighting matches the source — JPEG would tonemap-clip the highlights.
     *
     * Output format: Radiance HDR (RGBE), no RLE compression. At 512×W
     * (max edge clamped) the raw bytes land between ~256 KB and ~1 MB,
     * which is acceptable for the gallery. RLE compression would halve
     * that further but the encoder isn't worth the complexity yet.
     */
    private async captureEnvMapAsHDR(envTex: THREE.Texture, maxEdge: number): Promise<Blob | null> {
        if (!this.renderer) return null;
        const srcW = (envTex.image as any).width ?? maxEdge;
        const srcH = (envTex.image as any).height ?? maxEdge;
        const w = Math.min(srcW, maxEdge);
        const h = Math.min(srcH, maxEdge);

        // Float32 render target — preserves HDR values above 1.0 through
        // the readback. NoColorSpace because we want raw linear floats,
        // not sRGB-encoded ones.
        const target = new THREE.WebGLRenderTarget(w, h, {
            type: THREE.FloatType,
            format: THREE.RGBAFormat,
            colorSpace: THREE.NoColorSpace,
            stencilBuffer: false,
            depthBuffer: false,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
        });

        const scene = new THREE.Scene();
        const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const mat = new THREE.ShaderMaterial({
            uniforms: { uMap: { value: envTex } },
            vertexShader: `
                varying vec2 vUv;
                void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
            `,
            fragmentShader: `
                precision highp float;
                uniform sampler2D uMap;
                varying vec2 vUv;
                void main() {
                    // No tonemap, no gamma — preserve linear HDR values.
                    gl_FragColor = vec4(texture2D(uMap, vUv).rgb, 1.0);
                }
            `,
            depthTest: false,
            depthWrite: false,
        });
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
        scene.add(quad);

        const originalTarget = this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(target);
        this.renderer.clear();
        this.renderer.render(scene, cam);
        const floats = new Float32Array(w * h * 4);
        this.renderer.readRenderTargetPixels(target, 0, 0, w, h, floats);
        this.renderer.setRenderTarget(originalTarget);

        target.dispose();
        mat.dispose();
        (quad.geometry as THREE.BufferGeometry).dispose();

        return encodeRadianceHDR(floats, w, h);
    }

    public async captureSnapshot(): Promise<Blob | null> {
        if (!this.renderer) return null;
        const tex = this.pipeline.getOutputTexture();
        if (!tex) return null;
        
        const w = (tex.image as any).width;
        const h = (tex.image as any).height;
        const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, stencilBuffer: false, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
        const originalTarget = this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(target);
        this.renderer.clear();
        
        this.materials.displayMaterial.uniforms.map.value = tex;
        const oldRes = this.materials.displayMaterial.uniforms.uResolution.value.clone();
        this.materials.displayMaterial.uniforms.uResolution.value.set(w, h);
        const oldEncode = this.materials.displayMaterial.uniforms.uEncodeOutput.value;
        this.materials.displayMaterial.uniforms.uEncodeOutput.value = 1.0;

        this.renderer.render(this.sceneCtrl.displayScene, this.sceneCtrl.mainCamera);
        const buffer = new Uint8Array(w * h * 4);
        this.renderer.readRenderTargetPixels(target, 0, 0, w, h, buffer);
        this.renderer.setRenderTarget(originalTarget);
        this.materials.displayMaterial.uniforms.uResolution.value.copy(oldRes);
        this.materials.displayMaterial.uniforms.uEncodeOutput.value = oldEncode;
        target.dispose();
        
        // Use OffscreenCanvas in worker contexts, DOM canvas otherwise
        const canvas2d = (typeof document !== 'undefined')
            ? document.createElement('canvas')
            : new OffscreenCanvas(w, h);
        canvas2d.width = w;
        canvas2d.height = h;
        const ctx = canvas2d.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
        if (!ctx) return null;
        const imageData = ctx.createImageData(w, h);
        const stride = w * 4;
        for (let y = 0; y < h; y++) {
            const srcStart = y * stride;
            const destRowStart = (h - 1 - y) * stride;
            imageData.data.set(buffer.subarray(srcStart, srcStart + stride), destRowStart);
        }
        ctx.putImageData(imageData, 0, 0);
        if (canvas2d instanceof OffscreenCanvas) {
            return canvas2d.convertToBlob({ type: 'image/png' });
        }
        return new Promise(resolve => (canvas2d as HTMLCanvasElement).toBlob(resolve, 'image/png'));
    }

    public syncFrame(camera: THREE.Camera, state: any) {
        if (!this.state.optics && !this.state.lighting) return;
        this.uniformManager.syncFrame(camera, state, this.renderer, this.state, this.state.optics || {} as any, this.state.lighting || {} as any, this.modulations, this.materials, this.state.geometry);
    }

    public measureDistanceAtScreenPoint(x: number, y: number, renderer: THREE.WebGLRenderer, camera: THREE.Camera): number {
        return this.pickingCtrl.measureDistance(x, y, renderer, camera);
    }
    
    public pickWorldPosition(x: number, y: number): THREE.Vector3 | null {
        if (!this.renderer || !this.activeCamera) return null;
        return this.pickingCtrl.pickWorldPosition(x, y, this.renderer, this.activeCamera);
    }

    public pickWorldPositionFast(x: number, y: number): THREE.Vector3 | null {
        if (!this.renderer || !this.activeCamera) return null;
        return this.pickingCtrl.pickWorldPositionFast(x, y, this.renderer, this.activeCamera);
    }
    
    private getWebGLProgram(mat: THREE.Material | THREE.Material[]): any {
        if (!this.renderer) return null;
        const properties = (this.renderer as any).properties;
        const material = Array.isArray(mat) ? mat[0] : mat;
        const matProps = properties.get(material) as any;
        if (!matProps) return null;
        return matProps.program || matProps.currentProgram || null;
    }

    public getCompiledFragmentShader(): string | null {
        if (!this.renderer) return null;
        const mesh = this.sceneCtrl.mainMesh;
        if (!mesh || !mesh.material) return null;
        const programWrapper = this.getWebGLProgram(mesh.material);
        if (!programWrapper) return null;
        const gl = this.renderer.getContext();
        if (programWrapper.fragmentShader) {
            if (typeof programWrapper.fragmentShader === 'object') return gl.getShaderSource(programWrapper.fragmentShader);
            else if (typeof programWrapper.fragmentShader === 'string') return programWrapper.fragmentShader;
        }
        return null;
    }

    public getTranslatedFragmentShader(): string | null {
        if (!this.renderer) return null;
        const gl = this.renderer.getContext();
        const ext = gl.getExtension('WEBGL_debug_shaders');
        if (!ext) return null;
        const mesh = this.sceneCtrl.mainMesh;
        if (!mesh || !mesh.material) return null;
        const programWrapper = this.getWebGLProgram(mesh.material);
        if (!programWrapper || !programWrapper.fragmentShader) return null;
        const shaderObj = (typeof programWrapper.fragmentShader === 'object') ? programWrapper.fragmentShader : null;
        if (shaderObj) return ext.getTranslatedShaderSource(shaderObj);
        return null;
    }

    /**
     * Check if the GPU supports HalfFloat16 textures with alpha channel.
     * Delegates to `RenderPipeline.checkHalfFloatAlphaSupport()` (single
     * source of truth, cached). Worker-side: result is also published to
     * main via the `BOOTED` payload so `WorkerProxy` can mirror it.
     */
    public checkHalfFloatAlphaSupport(): boolean {
        const supported = this.pipeline.checkHalfFloatAlphaSupport();
        if (import.meta.env.DEV) console.log(`[GMT] HalfFloat16 Alpha Support: ${supported ? 'YES' : 'NO'}`);
        return supported;
    }
}

// Lazy singleton — allows future replacement with WorkerProxy for off-thread rendering
let _engine: FractalEngine | null = null;

/**
 * @invariant `getEngine()` is lazy, BUT the bottom-of-module
 *   `export const engine = getEngine()` forces construction on import.
 *   New code should prefer `getEngine()` rather than importing `engine`
 *   directly so test harnesses can swap the singleton.
 */
export function getEngine(): FractalEngine {
    if (!_engine) {
        _engine = new FractalEngine();
    }
    return _engine;
}

/** @deprecated Use getEngine() for new code. Kept for backward compatibility with existing imports. */
export const engine = getEngine();
