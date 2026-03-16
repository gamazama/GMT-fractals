
import * as THREE from 'three';
import { ShaderConfig } from './ShaderFactory';
import { CameraState } from '../types';
import { Uniforms } from './UniformNames';
import { VirtualSpace } from './PrecisionMath';
import { FractalEvents, FRACTAL_EVENTS } from './FractalEvents';
import { RenderPipeline } from './RenderPipeline';
import { MaterialController } from './MaterialController';
import { SceneController } from './SceneController';
import { PickingController } from './controllers/PickingController';
import { bucketRenderer, BucketRenderConfig } from './BucketRenderer';
import { UniformManager } from './managers/UniformManager';
import { ConfigManager } from './managers/ConfigManager';
import { OpticsState } from '../features/optics';
import { LightingState } from '../features/lighting';
import { QualityState } from '../features/quality';
import type { GeometryState } from '../features/geometry';
import '../formulas';
import { featureRegistry } from './FeatureSystem';

/** Custom input event passed to FractalEngine.handleInput() from viewport interaction handlers. */
export type EngineInputEvent =
    | { type: 'wheel'; delta: number }
    | { type: 'drag'; dx: number; dy: number };

export interface EngineRenderState {
    cameraMode: 'Orbit' | 'Fly';
    isExporting: boolean;
    isBucketRendering: boolean;
    isGizmoInteracting: boolean;
    isCameraInteracting: boolean;
    isMobile: boolean;
    optics: OpticsState | null;
    lighting: LightingState | null;
    quality: QualityState | null;
    geometry: GeometryState | null;
    bucketConfig: BucketRenderConfig;
}

const halton = (index: number, base: number) => {
    let result = 0;
    let f = 1 / base;
    let i = index;
    while (i > 0) {
        result = result + f * (i % base);
        i = Math.floor(i / base);
        f = f / base;
    }
    return result;
};

// Precompute 64 jitter values using Halton sequence for faster access
const PRECOMPUTED_JITTER: THREE.Vector2[] = [];
for (let i = 1; i <= 2048; i++) {
    const jX = halton(i, 2) * 2.0 - 1.0;
    const jY = halton(i, 3) * 2.0 - 1.0;
    PRECOMPUTED_JITTER.push(new THREE.Vector2(jX, jY));
}

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
        isGizmoInteracting: false,
        isCameraInteracting: false,
        isMobile: false,
        optics: null,
        lighting: null,
        quality: null,
        geometry: null,
        bucketConfig: { bucketSize: 128, bucketUpscale: 1.0, convergenceThreshold: 0.1, accumulation: true, samplesPerBucket: 64 }
    };

    public get isGizmoInteracting() { return this.state.isGizmoInteracting; }
    public set isGizmoInteracting(v: boolean) { this.state.isGizmoInteracting = v; }

    public get isCameraInteracting() { return this.state.isCameraInteracting; }
    public set isCameraInteracting(v: boolean) { this.state.isCameraInteracting = v; }
    public isPaused: boolean = false;
    private lastInteractionTime: number = 0;

    public shouldSnapCamera: boolean = false;
    public lastMeasuredDistance: number = 10.0;
    public dirty: boolean = true;
    
    public lastCompileDuration: number = 0;
    public isBooted: boolean = false;

    private _isCompiling: boolean = false;
    private _pendingTeleport: CameraState | null = null;
    private _totalFrames: number = 0;
    public hasCompiledShader: boolean = false;

    // Two-stage compile: generation counter to cancel stale async compiles
    private _compileGeneration: number = 0;
    // Dummy scene for async compilation of full shader (reused across compiles)
    private _compileScene: THREE.Scene | null = null;
    private _compileMesh: THREE.Mesh | null = null;
    private _compileCamera: THREE.OrthographicCamera | null = null;
    // Whether the GPU supports KHR_parallel_shader_compile (Chrome/ANGLE: yes, Firefox: no)
    private _hasParallelCompile: boolean | null = null;
    // Debounce timer for scheduleCompile — coalesces rapid config updates into one compile
    private _compileTimer: ReturnType<typeof setTimeout> | null = null;
    // Last compiled formula — used to detect formula changes vs engine setting changes
    private _lastCompiledFormula: string | null = null;

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
        const isMobile = (typeof window !== 'undefined' && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768));
        this.state.isMobile = isMobile;

        // --- DYNAMIC CONFIG GENERATION ---
        const initialConfig: any = { 
            formula: 'Mandelbulb', 
            pipelineRevision: 0, 
            msaaSamples: 1, 
            previewMode: false, 
            maxSteps: 300,
            renderMode: 'Direct',
            compilerHardCap: 500,
            shadows: true
        };

        const allFeatures = featureRegistry.getAll();
        allFeatures.forEach(feat => {
            const featConfig: any = {};
            Object.entries(feat.params).forEach(([key, config]) => {
                if (!config.composeFrom) {
                    featConfig[key] = config.default;
                }
            });
            const cleanConfig: any = {};
            Object.keys(featConfig).forEach(k => {
                const val = featConfig[k];
                if (val && typeof val === 'object') {
                    if (val.clone) cleanConfig[k] = val.clone();
                    else if (Array.isArray(val)) cleanConfig[k] = JSON.parse(JSON.stringify(val));
                    else cleanConfig[k] = { ...val };
                } else {
                    cleanConfig[k] = val;
                }
            });

            initialConfig[feat.id] = cleanConfig;
        });
        
        if (isMobile && initialConfig.quality) {
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

        this.materials.setGradient([
            { id: '1', position: 0.0, color: '#000000' },
            { id: '2', position: 1.0, color: '#ffffff' }
        ], 1);
        
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
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.activeCamera.quaternion);
            this.activeCamera.position.addScaledVector(forward, event.delta * this.inputState.zoomSpeed * this.lastMeasuredDistance);
            this.resetAccumulation();
        } else if (event.type === 'drag') {
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
        this.scheduleCompile();
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
    public get isCompiling() { return this._isCompiling; }
    public get sceneOffset() { return this.virtualSpace.state; }
    public get isExporting() { return this.state.isExporting; }
    public get isBucketRendering() { return this.state.isBucketRendering; }

    private bindEvents() {
        FractalEvents.on(FRACTAL_EVENTS.UNIFORM, ({ key, value, noReset }) => { this.setUniform(key, value, noReset); });
        FractalEvents.on(FRACTAL_EVENTS.CONFIG, (newConfig) => { this.updateConfigInternal(newConfig); });
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

    public resetAccumulation() { 
        // NOTE: Removed setting 'this.dirty = true' because it was causing an infinite loop
        // in the update() method where accumulation was constantly being reset
        this.markInteraction(); 
        this.pipeline?.resetAccumulation(); 
    }
    public setPreviewSampleCap(n: number) { this.pipeline?.setSampleCap(n); }
    
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
            this.scheduleCompile();
        } else {
            if (!this._isCompiling) {
                FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
            }

            if (uniformUpdate) {
                this.materials.syncConfigUniforms(this.configManager.config);
                if (this.configManager.config.pipeline) {
                    this.materials.syncModularUniforms(this.configManager.config.pipeline);
                }
                // Only reset accumulation if a non-noReset param actually changed.
                // Post-process params (bloom, CA, color grading) are noReset and should
                // not disrupt the accumulated buffer.
                if (needsAccumReset) {
                    this.resetAccumulation();
                }
            } else if (Object.keys(newConfig).length > 0 && needsAccumReset) {
                this.resetAccumulation();
            }
        }
    }
    
    private scheduleCompile() {
        this._isCompiling = true;
        this._compileGeneration++;
        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, "Compiling Shader...");

        // Debounce: coalesce rapid config updates (e.g. loadPreset fires many feature setters)
        // into a single compile. Each call resets the timer; only the last one fires.
        if (this._compileTimer !== null) {
            clearTimeout(this._compileTimer);
        }
        this._compileTimer = setTimeout(() => {
            this._compileTimer = null;
            void (async () => {
                // Wait for renderer if not yet available (initial boot)
                while (!this.renderer) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                try {
                    await this.performCompilation();
                } catch (e) {
                    console.error('[FractalEngine] performCompilation failed:', e);
                    this._isCompiling = false;
                    FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
                }
            })();
        }, 0);
    }

    private async performCompilation() {
        if (!this.renderer) return;
        const t0 = performance.now();
        const generation = this._compileGeneration;

        if (this.mainUniforms.uResolution.value.x === 0 || this.mainUniforms.uResolution.value.y === 0) {
            this.mainUniforms.uResolution.value.set(1024, 768);
        }
        this.pipeline.resize(
            Math.floor(this.mainUniforms.uResolution.value.x),
            Math.floor(this.mainUniforms.uResolution.value.y)
        );

        const config = this.configManager.config;
        if (config.pipeline) this.materials.syncModularUniforms(config.pipeline);
        // Derive mode from DDFS lighting state (same logic as MaterialController)
        const lighting = config.lighting as any;
        const mode: 'Direct' | 'PathTracing' = (lighting && lighting.renderMode === 1.0) ? 'PathTracing' : (config.renderMode || 'Direct');

        // Lazy-detect KHR_parallel_shader_compile (Chrome/ANGLE: yes, Firefox: no).
        // Without it, compileAsync degrades to synchronous — two-stage gives no benefit.
        // Firefox also doesn't use fxc, so its shader compiler is fast enough for single-stage.
        if (this._hasParallelCompile === null) {
            const gl = this.renderer.getContext();
            this._hasParallelCompile = !!gl.getExtension('KHR_parallel_shader_compile');
        }

        // Decide compile strategy:
        // - keepCurrent: have a compiled shader, same formula → keep it on screen,
        //   build full shader async, swap when done. No preview downgrade.
        // - twoStage: first boot or formula change → show preview while full compiles
        // - singleStage: no parallel compile or lighting already off → synchronous
        const formulaChanged = config.formula !== this._lastCompiledFormula;
        const keepCurrent = this.hasCompiledShader && this._hasParallelCompile && !formulaChanged;

        if (!keepCurrent) {
            // compilePreview returns false if lighting is already off (preview === full)
            const useTwoStage = this._hasParallelCompile && this.materials.compilePreview(config);
            if (!useTwoStage) {
                // Single-stage synchronous: no parallel compile or lighting already off
                this.materials.updateConfig(config);
            }

            const needsCompile = !this.hasCompiledShader || this.materials.shaderDirty;
            await new Promise(resolve => setTimeout(resolve, 0));

            // Sync uniforms so preview shader renders with correct parameters
            // (fractal power, iterations, colors, etc.) instead of defaults.
            this.materials.syncConfigUniforms(config);
            const activeMat = this.materials.getMaterial(mode);
            this.sceneCtrl.setMaterial(activeMat);
            this.resetAccumulation();

            if (needsCompile) {
                this.pipelineRender(this.renderer);
                await new Promise(resolve => setTimeout(resolve, 20));
                this.pipelineRender(this.renderer);
                if (useTwoStage) await new Promise(resolve => setTimeout(resolve, 50));

                this.hasCompiledShader = true;
                this._lastCompiledFormula = config.formula;
                this.materials.shaderDirty = false;
                this.lastCompileDuration = (performance.now() - t0) / 1000;
            }

            if (!useTwoStage) {
                // Single-stage done
                this.lastCompileDuration = (performance.now() - t0) / 1000;
                if (import.meta.env.DEV) console.log(`[Compile] Single-stage: ${(this.lastCompileDuration * 1000).toFixed(0)}ms`);
                this._isCompiling = false;
                FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
                FractalEvents.emit(FRACTAL_EVENTS.SHADER_CODE, this.materials.getLastFrag());
                if (this.lastCompileDuration > 0.1) FractalEvents.emit(FRACTAL_EVENTS.COMPILE_TIME, this.lastCompileDuration);
                return;
            }
        } else {
            // keepCurrent: sync uniforms so current shader has up-to-date values,
            // but don't touch the active material or scene mesh
            this.materials.syncConfigUniforms(config);
            this.resetAccumulation();
        }

        // Current or preview shader is live. Proceed to async Stage 2.
        this._isCompiling = false;
        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, keepCurrent ? "Compiling Shader..." : "Compiling Lighting...");

        // Yield 3 animation frames — each lets handleRenderTick run (compute + blit + flush).
        for (let i = 0; i < 3; i++) {
            if (typeof requestAnimationFrame === 'function') {
                await new Promise(resolve => requestAnimationFrame(resolve));
            } else {
                await new Promise(resolve => setTimeout(resolve, 16));
            }
        }

        // Check if a newer compile was triggered while we were yielding
        if (generation !== this._compileGeneration) {
            // Ensure IS_COMPILING false is emitted so BOOTED can fire
            this._isCompiling = false;
            FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
            return;
        }

        // ── STAGE 2: Full shader (async compile on dummy scene) ──
        const tGenStart = performance.now();
        const fullMat = this.materials.buildFullMaterial(config);
        const tGenEnd = performance.now();
        if (import.meta.env.DEV) console.log(`[Compile] JS generation: ${(tGenEnd - tGenStart).toFixed(0)}ms`);

        // Lazy-init the dummy compile scene (reused across compiles)
        if (!this._compileScene) {
            this._compileScene = new THREE.Scene();
            this._compileMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
            this._compileMesh.frustumCulled = false;
            this._compileScene.add(this._compileMesh);
            this._compileCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        }
        this._compileMesh!.material = fullMat;

        const tGpuStart = performance.now();
        try {
            const compileTarget = this.pipeline.getCompileTarget();
            if (compileTarget) this.renderer.setRenderTarget(compileTarget);
            await this.renderer.compileAsync(this._compileScene!, this._compileCamera!);
            if (compileTarget) this.renderer.setRenderTarget(null);
        } catch (e) {
            console.warn('[Compile] compileAsync failed, falling back to sync:', e);
            this.renderer.setRenderTarget(null);
            this.renderer.compile(this._compileScene!, this._compileCamera!);
        }
        const tGpuEnd = performance.now();
        if (import.meta.env.DEV) console.log(`[Compile] GPU compile: ${(tGpuEnd - tGpuStart).toFixed(0)}ms`);

        // Check if a newer compile was triggered while we were compiling
        if (generation !== this._compileGeneration) {
            fullMat.dispose();
            this._isCompiling = false;
            FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
            return;
        }

        // Hot-swap: replace preview/current material with fully compiled material
        this.materials.swapFullMaterial(fullMat);
        this.sceneCtrl.setMaterial(this.materials.getMaterial(mode));
        this.resetAccumulation();
        this.materials.shaderDirty = false;
        this._lastCompiledFormula = config.formula;
        this.pipelineRender(this.renderer);

        const totalElapsed = performance.now() - t0;
        this.lastCompileDuration = totalElapsed / 1000;
        if (import.meta.env.DEV) console.log(`[Compile] Done — two-stage: ${totalElapsed.toFixed(0)}ms`);
        if (totalElapsed / 1000 > 0.1) FractalEvents.emit(FRACTAL_EVENTS.COMPILE_TIME, totalElapsed / 1000);

        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
        FractalEvents.emit(FRACTAL_EVENTS.SHADER_CODE, this.materials.getLastFrag());
    }

    public setUniform(key: string, value: any, noReset: boolean = false) {
        this.materials.setUniform(key, value);
        this.configManager.syncUniform(key, value);
        if (!noReset) this.resetAccumulation(); 
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
        this.mainUniforms[Uniforms.FrameCount].value = this._totalFrames;

        if (this.renderer && this.state.isBucketRendering) {
            bucketRenderer.update(this.renderer, this.state.bucketConfig);
        }
        
        const targetFov = this.state.optics?.camFov ?? 60.0;

        this.virtualSpace.updateSmoothing(camera, targetFov, delta, this.shouldSnapCamera, isInteracting);
        
        if (this.shouldSnapCamera) {
            this.shouldSnapCamera = false;
            this.pipeline.resetAccumulation();
        }

        const currentOffsetState = this.sceneOffset;
        const prevRenderOffset = this.lastRenderState.offset;
        const offsetChanged = Math.abs(currentOffsetState.x - prevRenderOffset.x) > 1e-9 || Math.abs(currentOffsetState.y - prevRenderOffset.y) > 1e-9 || Math.abs(currentOffsetState.z - prevRenderOffset.z) > 1e-9;
        
        const sPos = this.virtualSpace.smoothedPos;
        const sQuat = this.virtualSpace.smoothedQuat;
        const sFov = this.virtualSpace.smoothedFov;

        if (sPos.distanceToSquared(this.lastRenderState.pos) > 1e-4 || sQuat.angleTo(this.lastRenderState.quat) > 1e-3 || Math.abs(sFov - this.lastRenderState.fov) > 0.1 || offsetChanged || this.dirty) {
            this.pipeline.resetAccumulation(); this.dirty = false;
            this.lastRenderState.pos.copy(sPos); this.lastRenderState.quat.copy(sQuat);
            this.lastRenderState.offset = { ...currentOffsetState };
            this.lastRenderState.fov = sFov;
        }

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
        
        if (this.isPaused && !this.state.isBucketRendering) {
             const timeSinceInteraction = performance.now() - this.lastInteractionTime;
             if (timeSinceInteraction > 1000) return;
        }

        // Hold accumulation during camera interaction ONLY if DOF is disabled
        // If DOF is enabled, continue rendering to show blur preview (with stable per-pixel noise)
        const dofEnabled = (this.state.optics?.dofStrength ?? 0) > 0.0001;
        const wasHolding = this.pipeline.isHolding;
        const shouldHold = !dofEnabled && (this.state.isCameraInteracting || this.state.isGizmoInteracting);
        this.pipeline.setHold(shouldHold);
        
        // If we just started holding, reset accumulation for clean frame
        if (shouldHold && !wasHolding) {
            this.pipeline.resetAccumulation();
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

        // Execute Render Pipeline
        this.pipelineRender(renderer);
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
     * Some mobile GPUs don't properly support alpha in half-float render targets.
     */
    public checkHalfFloatAlphaSupport(): boolean {
        // Create a temporary canvas to test WebGL capabilities
        try {
            // Use OffscreenCanvas in worker contexts, DOM canvas otherwise
            const testCanvas = (typeof document !== 'undefined')
                ? document.createElement('canvas')
                : new OffscreenCanvas(1, 1);
            testCanvas.width = 1;
            testCanvas.height = 1;
            
            // Try WebGL2 first (Three.js uses WebGL2 by default)
            let gl = testCanvas.getContext('webgl2') as WebGL2RenderingContext | null;
            let halfFloatType: number;

            if (gl) {
                // WebGL2 has built-in HalfFloat support
                halfFloatType = gl.HALF_FLOAT;
            } else {
                // Fallback to WebGL1 with extension
                const gl1 = testCanvas.getContext('webgl') as WebGLRenderingContext | null;
                gl = gl1 as any;
                if (!gl) return false;
                
                const halfFloatExt = gl.getExtension('OES_texture_half_float');
                if (!halfFloatExt) return false;
                halfFloatType = halfFloatExt.HALF_FLOAT_OES;
            }

            // Try to create a half-float render target with alpha
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, halfFloatType, null);

            const framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            const isComplete = status === gl.FRAMEBUFFER_COMPLETE;

            // Cleanup
            gl.deleteFramebuffer(framebuffer);
            gl.deleteTexture(texture);

            if (import.meta.env.DEV) console.log(`[GMT] HalfFloat16 Alpha Support: ${isComplete ? 'YES' : 'NO'}`);
            return isComplete;
        } catch (e) {
            console.warn('[GMT] HalfFloat alpha support check failed:', e);
            return false;
        }
    }
}

// Lazy singleton — allows future replacement with WorkerProxy for off-thread rendering
let _engine: FractalEngine | null = null;

export function getEngine(): FractalEngine {
    if (!_engine) {
        _engine = new FractalEngine();
    }
    return _engine;
}

/** @deprecated Use getEngine() for new code. Kept for backward compatibility with existing imports. */
export const engine = getEngine();
