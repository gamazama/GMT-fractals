
import * as THREE from 'three';
import { ShaderConfig } from './ShaderFactory';
import { PreciseVector3, CameraState } from '../types';
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
import '../formulas'; 
import { VideoExporter } from './VideoExporter';
import { featureRegistry } from './FeatureSystem';

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
    
    public videoExporter: VideoExporter;
    
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
        bucketConfig: { bucketSize: 128, bucketUpscale: 1.0, convergenceThreshold: 0.1, accumulation: true }
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
    private compileTimer: any = null;
    private _pendingTeleport: CameraState | null = null;
    private _totalFrames: number = 0;
    public hasCompiledShader: boolean = false;
    
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
            // On mobile, default to Float32 to avoid HalfFloat16 compatibility issues
            // iOS Safari has issues with multiple WebGL contexts and HalfFloat16 support varies
            // Users can manually enable HalfFloat16 in quality settings if their device supports it
            initialConfig.quality.bufferPrecision = 0.0; // Float32 - safer for mobile
        }

        this.configManager = new ConfigManager(initialConfig as ShaderConfig);
        this.materials = new MaterialController(initialConfig as ShaderConfig);
        this.sceneCtrl = new SceneController(this.materials);
        this.pipeline = new RenderPipeline();
        this.pickingCtrl = new PickingController(this.materials, this.sceneCtrl, this.virtualSpace, this.pipeline);
        
        this.videoExporter = new VideoExporter(this);
        
        this.pipeline.updateQuality(initialConfig.quality as QualityState);

        this.uniformManager = new UniformManager(this.materials.mainUniforms, this.virtualSpace, this.pipeline);

        this.materials.setGradient([
            { id: '1', position: 0.0, color: '#000000' },
            { id: '2', position: 1.0, color: '#ffffff' }
        ], 1);
        
        this.bindEvents();
        this.isBooted = false;
        
        this.markInteraction();
    }

    public handleInput(event: any) {
        if (!this.activeCamera) return;
        const { type, dx, dy, delta } = event;
        this.markInteraction();

        if (type === 'wheel') {
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.activeCamera.quaternion);
            this.activeCamera.position.addScaledVector(forward, delta * this.inputState.zoomSpeed * this.lastMeasuredDistance);
            this.resetAccumulation();
        } else if (type === 'drag') {
            const up = new THREE.Vector3(0, 1, 0); 
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.activeCamera.quaternion);
            const qPitch = new THREE.Quaternion().setFromAxisAngle(right, dy * this.inputState.rotateSpeed);
            const qYaw = new THREE.Quaternion().setFromAxisAngle(up, -dx * this.inputState.rotateSpeed);
            this.activeCamera.quaternion.multiplyQuaternions(qYaw, this.activeCamera.quaternion);
            this.activeCamera.quaternion.multiplyQuaternions(this.activeCamera.quaternion, qPitch);
            this.resetAccumulation();
        }
    }
    
    public markInteraction() {
        this.lastInteractionTime = performance.now();
    }

    public bootWithConfig(config: ShaderConfig) {
        if (this.isBooted) return;
        console.log("⚡ FractalEngine: Booting...");
        
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
        FractalEvents.on(FRACTAL_EVENTS.GRADIENT, ({ stops, layer }) => { this.materials.setGradient(stops, layer); this.resetAccumulation(); });
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
    public setPreviewSampleCap(n: number) { this.pipeline?.setSampleCap(n); this.resetAccumulation(); }
    
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

        const { rebuildNeeded, uniformUpdate, modeChanged } = this.configManager.update(newConfig, this.state);

        if (newConfig.maxSteps !== undefined) {
             this.setUniform('uMaxSteps', newConfig.maxSteps);
        }
        
        if (modeChanged) {
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
                this.resetAccumulation();
            } else if (Object.keys(newConfig).length > 0) {
                this.resetAccumulation();
            }
        }
    }
    
    private scheduleCompile() {
        console.log("FractalEngine: scheduleCompile called");
        if (this.compileTimer) {
            clearTimeout(this.compileTimer);
        }
        this._isCompiling = true;
        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, "Compiling Shader...");
        
        // Wait for renderer to be available before compiling
        // Also add a small delay to allow React to render the spinner before blocking
        const waitForRenderer = async () => {
            // Give React a frame to render the spinner
            await new Promise(resolve => requestAnimationFrame(resolve));
            while (!this.renderer) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            this.performCompilation();
        };
        
        waitForRenderer();
    }

    private async performCompilation() {
        console.log("FractalEngine: performCompilation started");
        if (!this.renderer) {
            console.log("FractalEngine: No renderer available");
            return;
        }
        
        const startTime = performance.now();

        // Ensure pipeline is properly sized before compilation
        // Use default size if no resolution is set yet
        if (this.mainUniforms.uResolution.value.x === 0 || this.mainUniforms.uResolution.value.y === 0) {
            this.mainUniforms.uResolution.value.set(1024, 768);
        }
        console.log("FractalEngine: Resizing pipeline to", this.mainUniforms.uResolution.value.x, "x", this.mainUniforms.uResolution.value.y);
        this.pipeline.resize(
            Math.floor(this.mainUniforms.uResolution.value.x), 
            Math.floor(this.mainUniforms.uResolution.value.y)
        );

        console.log("FractalEngine: Updating materials");
        this.materials.updateConfig(this.configManager.config);
        this.materials.syncConfigUniforms(this.configManager.config);
        if (this.configManager.config.pipeline) this.materials.syncModularUniforms(this.configManager.config.pipeline);
        
        await new Promise(resolve => setTimeout(resolve, 0));

        const mode = this.configManager.config.renderMode || 'Direct';
        const mat = this.materials.getMaterial(mode);
        this.sceneCtrl.setMaterial(mat);

        this.resetAccumulation();
        
        // For first run, we need to render even if needsUpdate isn't set
        // This ensures the shader is actually compiled on first boot
        const currentMaterial = mode === 'Direct' ? this.materials.materialDirect : this.materials.materialPT;
        
        // Check if we need to compile the shader
        const needsCompile = !this.hasCompiledShader || currentMaterial.needsUpdate;
        
        if (needsCompile) {
            console.log("FractalEngine: Triggering GPU shader compilation");
            
            // CRITICAL: Render directly to MRT target to compile shader for MRT configuration
            // This ensures the shader is compiled with the correct output layout (including depth)
            // and prevents recompilation when physics probe reads from the depth buffer
            // We render twice to ensure the shader is fully compiled and cached
            this.pipeline.render(this.renderer);
            await new Promise(resolve => setTimeout(resolve, 20));
            this.pipeline.render(this.renderer);
            
            // Give renderer time to complete compilation and cache the shader
            await new Promise(resolve => setTimeout(resolve, 50));
            
            this.hasCompiledShader = true;
            currentMaterial.needsUpdate = false;
        } else {
            console.log("FractalEngine: Shader unchanged - skipping GPU compilation");
        }
        
        this._isCompiling = false;
        this.compileTimer = null;
        
        const duration = (performance.now() - startTime) / 1000;
        this.lastCompileDuration = duration;
        console.log(`[Shader Compiled] Time: ${duration.toFixed(3)}s`);

        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
        if (duration > 0.1) FractalEvents.emit(FRACTAL_EVENTS.COMPILE_TIME, duration);
        FractalEvents.emit(FRACTAL_EVENTS.SHADER_CODE, this.materials.getLastFrag());
        console.log("FractalEngine: performCompilation completed");
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
        const isOrbit = this.state.cameraMode === 'Orbit';

        this.virtualSpace.updateSmoothing(camera, targetFov, delta, isOrbit, this.shouldSnapCamera, isInteracting);
        
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

    // New: Compute Phase (Updates FBOs)
    public compute(renderer: THREE.WebGLRenderer) {
        if (!this.isBooted || this._isCompiling || this.state.isExporting) return;
        
        if (this.isPaused && !this.state.isBucketRendering) {
             const timeSinceInteraction = performance.now() - this.lastInteractionTime;
             if (timeSinceInteraction > 1000) return;
        }

        // Hold accumulation during camera interaction to prevent flickering
        const wasHolding = this.pipeline.isHolding;
        const shouldHold = this.state.isCameraInteracting || this.state.isGizmoInteracting;
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
        this.pipeline.render(renderer);
    }
    
    // Updated: Only used for legacy or explicit blit calls (e.g. video export)
    public render(renderer: THREE.WebGLRenderer) { 
        // Forward compat stub: If called directly, run compute then blit to default
        this.compute(renderer);
        
        // This part is now handled by MandelbulbScene for R3F, but kept for Bucket/Export
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
        this.materials.displayMaterial.uniforms.uResolution.value.set(w, h);
        const oldEncode = this.materials.displayMaterial.uniforms.uEncodeOutput.value;
        this.materials.displayMaterial.uniforms.uEncodeOutput.value = 1.0; 
        
        this.renderer.render(this.sceneCtrl.displayScene, this.sceneCtrl.mainCamera);
        const buffer = new Uint8Array(w * h * 4);
        this.renderer.readRenderTargetPixels(target, 0, 0, w, h, buffer);
        this.renderer.setRenderTarget(originalTarget);
        this.materials.displayMaterial.uniforms.uEncodeOutput.value = oldEncode;
        target.dispose();
        
        const canvas2d = document.createElement('canvas');
        canvas2d.width = w;
        canvas2d.height = h;
        const ctx = canvas2d.getContext('2d');
        if (!ctx) return null;
        const imageData = ctx.createImageData(w, h);
        const stride = w * 4;
        for (let y = 0; y < h; y++) {
            const srcStart = y * stride;
            const destRowStart = (h - 1 - y) * stride;
            imageData.data.set(buffer.subarray(srcStart, srcStart + stride), destRowStart);
        }
        ctx.putImageData(imageData, 0, 0);
        return new Promise(resolve => canvas2d.toBlob(resolve, 'image/png'));
    }

    public syncFrame(camera: THREE.Camera, state: any) {
        if (!this.state.optics && !this.state.lighting) return;
        this.uniformManager.syncFrame(camera, state, this.renderer, this.state, this.state.optics || {} as any, this.state.lighting || {} as any, this.modulations, this.materials);
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
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 1;
            testCanvas.height = 1;
            
            // Try WebGL2 first (Three.js uses WebGL2 by default)
            let gl: WebGLRenderingContext | WebGL2RenderingContext | null = testCanvas.getContext('webgl2');
            let halfFloatType: number;
            
            if (gl) {
                // WebGL2 has built-in HalfFloat support
                halfFloatType = (gl as WebGL2RenderingContext).HALF_FLOAT;
            } else {
                // Fallback to WebGL1 with extension
                gl = testCanvas.getContext('webgl') as WebGLRenderingContext | null;
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

            console.log(`[GMT] HalfFloat16 Alpha Support: ${isComplete ? 'YES' : 'NO'}`);
            return isComplete;
        } catch (e) {
            console.warn('[GMT] HalfFloat alpha support check failed:', e);
            return false;
        }
    }
}

export const engine = new FractalEngine();
