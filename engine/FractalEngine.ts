
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

export interface EngineRenderState {
    cameraMode: 'Orbit' | 'Fly';
    isExporting: boolean;
    isBucketRendering: boolean;
    isGizmoInteracting: boolean;
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

export class FractalEngine {
    public materials: MaterialController;
    private sceneCtrl: SceneController;
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
        isMobile: false,
        optics: null,
        lighting: null,
        quality: null,
        bucketConfig: { bucketSize: 128, bucketUpscale: 1.0, convergenceThreshold: 0.1, accumulation: true }
    };

    public get isGizmoInteracting() { return this.state.isGizmoInteracting; }
    public set isGizmoInteracting(v: boolean) { this.state.isGizmoInteracting = v; }

    // New flag for camera interaction (Orbit/Fly)
    public isCameraInteracting: boolean = false;

    // Pause Control
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

        const initialConfig: ShaderConfig = { 
            formula: 'Mandelbulb', 
            pipelineRevision: 0, 
            msaaSamples: 1, 
            previewMode: false, 
            maxSteps: 300,
            renderMode: 'Direct',
            compilerHardCap: 500,
            shadows: true,
            quality: {
                precisionMode: isMobile ? 1.0 : 0.0,
                bufferPrecision: isMobile ? 1.0 : 0.0,
                maxSteps: 300,
                distanceMetric: 0.0,
                dynamicScaling: false,
                interactionDownsample: 2,
                estimator: 0
            },
            geometry: { 
                hybridComplex: false,
                preRotMaster: true
            },
            lighting: { 
                shadows: true, 
                shadowSteps: 128,
                ptBounces: 3,
                ptStochasticShadows: false
            },
            ao: {
                aoEnabled: true,
                aoSamples: 5,
                aoStochasticCp: true
            },
            reflections: {
                enabled: true,
                steps: 64,
                bounces: 1
            }
        };
        
        this.configManager = new ConfigManager(initialConfig);
        this.materials = new MaterialController(initialConfig);
        this.sceneCtrl = new SceneController(this.materials);
        this.pickingCtrl = new PickingController(this.materials, this.sceneCtrl, this.virtualSpace);
        this.pipeline = new RenderPipeline();
        
        this.uniformManager = new UniformManager(this.materials.mainUniforms, this.virtualSpace, this.pipeline);

        this.materials.setGradient([
            { id: '1', position: 0.0, color: '#000000' },
            { id: '2', position: 1.0, color: '#ffffff' }
        ], 1);
        
        this.bindEvents();
        this.isBooted = false;
        
        // Initialize interaction timer
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
    
    // Smart Idle Trigger: Call this whenever user changes params or camera
    public markInteraction() {
        this.lastInteractionTime = performance.now();
    }

    public bootWithConfig(config: ShaderConfig) {
        if (this.isBooted) return;
        console.log("⚡ FractalEngine: Booting...");
        
        // Setup initial config map
        this.configManager.config = { ...config };
        this.configManager.rebuildMap();
        
        this.isBooted = true;
        this.scheduleCompile(); 
    }

    public get mainMaterial() { return this.materials.mainMaterial; }
    public get physicsMaterial() { return this.materials.physicsMaterial; }
    public get histogramMaterial() { return this.materials.histogramMaterial; }
    public get mainUniforms() { return this.materials.mainUniforms; }
    public get physicsUniforms() { return this.materials.physicsUniforms; }
    public get histogramUniforms() { return this.materials.histogramUniforms; }
    public get mainScene() { return this.sceneCtrl.mainScene; }
    public get mainCamera() { return this.sceneCtrl.mainCamera; }
    public get mainMesh() { return this.sceneCtrl.mainMesh; }
    public get physicsRenderTarget() { return this.sceneCtrl.physicsRenderTarget; }
    public get physicsScene() { return this.sceneCtrl.physicsScene; }
    public get physicsCamera() { return this.sceneCtrl.physicsCamera; }
    public get physicsMesh() { return this.sceneCtrl.physicsMesh; }
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
        this.dirty = true; 
        this.markInteraction(); // Any reset implies an interaction
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
        this.markInteraction(); // Config change is an interaction
        
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
            // Render Mode change requires re-fetch of material but NOT full rebuild if already cached
            const mode = this.configManager.config.renderMode;
            const mat = this.materials.getMaterial(mode || 'Direct');
            this.sceneCtrl.setMaterial(mat);
            this.resetAccumulation();
            FractalEvents.emit(FRACTAL_EVENTS.SHADER_CODE, this.materials.getLastFrag());
        }

        if (rebuildNeeded) {
            this.scheduleCompile();
        } else {
            // CRITICAL FIX: Centralized spinner cleanup. 
            // If a config change came in (e.g. from UI) but no rebuild is needed (cached or simple update),
            // we must clear the spinner here. But ONLY if a compile isn't already pending/running.
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
        if (this.compileTimer) {
            clearTimeout(this.compileTimer);
        }

        // 1. SIGNAL UI IMMEDIATELY
        this._isCompiling = true;
        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, "Compiling Shader...");

        // 2. Double-RAF Debounce logic
        // This ensures the browser has painted the "Compiling..." spinner before we lock the thread.
        this.compileTimer = setTimeout(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.performCompilation();
                });
            });
        }, 50);
    }

    private async performCompilation() {
        if (!this.renderer) return;
        
        const startTime = performance.now();

        // 1. Heavy CPU Work: Generate GLSL Strings
        this.materials.updateConfig(this.configManager.config);
        this.materials.syncConfigUniforms(this.configManager.config);
        if (this.configManager.config.pipeline) this.materials.syncModularUniforms(this.configManager.config.pipeline);
        
        // 2. YIELD to Main Thread
        // Allow the browser one last chance to update the UI/Spinner if the CPU work was heavy
        await new Promise(resolve => setTimeout(resolve, 0));

        // 3. Heavy GPU Work: Compile & Link
        const mode = this.configManager.config.renderMode || 'Direct';
        const mat = this.materials.getMaterial(mode);
        this.sceneCtrl.setMaterial(mat);

        // FORCE COMPILE: Render 1 pixel to force driver linking
        // This is the step that locks the browser
        const pixel = new Float32Array(4);
        const originalTarget = this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(this.sceneCtrl.physicsRenderTarget);
        this.renderer.render(this.sceneCtrl.mainScene, this.sceneCtrl.mainCamera);
        this.renderer.readRenderTargetPixels(this.sceneCtrl.physicsRenderTarget, 0,0,1,1, pixel); 
        this.renderer.setRenderTarget(originalTarget);

        this.resetAccumulation();
        this._isCompiling = false;
        this.compileTimer = null;
        
        const duration = (performance.now() - startTime) / 1000;
        this.lastCompileDuration = duration;
        console.log(`[Shader Compiled] Time: ${duration.toFixed(3)}s`);

        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
        if (duration > 0.1) FractalEvents.emit(FRACTAL_EVENTS.COMPILE_TIME, duration);
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
        
        if (isInteracting) this.markInteraction();

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

        if (sPos.distanceToSquared(this.lastRenderState.pos) > 1e-6 || sQuat.angleTo(this.lastRenderState.quat) > 1e-5 || Math.abs(sFov - this.lastRenderState.fov) > 0.001 || offsetChanged || this.dirty) {
            this.pipeline.resetAccumulation(); this.dirty = false;
            this.lastRenderState.pos.copy(sPos); this.lastRenderState.quat.copy(sQuat);
            this.lastRenderState.offset = { ...currentOffsetState };
            this.lastRenderState.fov = sFov;
        }

        const cam = camera as THREE.PerspectiveCamera;
        this.sceneCtrl.updateFallback(sPos, sQuat, sFov, cam.aspect);
        this.syncFrame(this.sceneCtrl.fallbackCamera, state);
    }

    public render(renderer: THREE.WebGLRenderer) { 
        if (!this.isBooted || this._isCompiling) return;
        
        // --- SMART IDLE LOGIC ---
        // If manually paused, stop rendering unless:
        // 1. User interacted within last 1s (Smart Idle override)
        // 2. We are in special modes (Bucket / Export)
        // 3. We are forcing a compile/update
        if (this.isPaused && !this.state.isBucketRendering && !this.state.isExporting) {
            const timeSinceInteraction = performance.now() - this.lastInteractionTime;
            // Allow 1 second of rendering after any interaction
            if (timeSinceInteraction > 1000) {
                // SKIP PIPELINE RENDER
                // We proceed to Blit below to keep the canvas alive (anti-flicker)
            } else {
                this.runPipelineRender(renderer);
            }
        } else {
             this.runPipelineRender(renderer);
        }
        
        // 3. Blit to Screen (Final Display)
        const outputTex = this.pipeline.getOutputTexture();
        if (outputTex) {
            this.materials.displayMaterial.uniforms.map.value = outputTex;
            
            // Render to null target (Screen)
            renderer.setRenderTarget(null);
            renderer.render(this.sceneCtrl.displayScene, this.sceneCtrl.mainCamera);
        }
    }
    
    private runPipelineRender(renderer: THREE.WebGLRenderer) {
        // --- DYNAMIC RESOLUTION SCALING ---
        if (!this.state.isBucketRendering && !this.state.isExporting) {
            const q = this.state.quality;
            if (q && q.dynamicScaling && this.isGizmoInteracting) {
                const downsample = Math.max(1, q.interactionDownsample || 2);
                if (downsample > 1) {
                     const canvas = renderer.domElement;
                     const w = Math.ceil(canvas.width / downsample);
                     const h = Math.ceil(canvas.height / downsample);
                     
                     this.pipeline.resize(w, h);
                     this.mainUniforms.uResolution.value.set(w, h);
                }
            }
        }

        // 1. Jitter
        if (this.pipeline.accumulationCount > 1) {
            const idx = (this.pipeline.accumulationCount % 16) + 1;
            const jX = halton(idx, 2);
            const jY = halton(idx, 3);
            this.jitterVec.set(jX * 2.0 - 1.0, jY * 2.0 - 1.0);
            this.mainUniforms.uJitter.value.copy(this.jitterVec);
        } else {
            this.mainUniforms.uJitter.value.set(0,0);
        }

        // 2. Render to FBO
        this.pipeline.render(renderer); 
    }
    
    // --- SNAPSHOT FUNCTIONALITY ---
    public async captureSnapshot(): Promise<Blob | null> {
        if (!this.renderer) return null;
        
        // 1. Get current output texture (Float32 / HalfFloat)
        const tex = this.pipeline.getOutputTexture();
        if (!tex) return null;
        
        const w = (tex.image as any).width;
        const h = (tex.image as any).height;
        
        // 2. Create offscreen target for readback
        // Use UnsignedByteType to get standard 8-bit color compatible with Canvas
        const target = new THREE.WebGLRenderTarget(w, h, {
            type: THREE.UnsignedByteType,
            format: THREE.RGBAFormat,
            stencilBuffer: false,
            depthBuffer: false,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter
        });
        
        const originalTarget = this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(target);
        this.renderer.clear();
        
        // 3. Render Post-Process (Tone Mapping & Color Grading) to Target
        // We reuse displayMaterial but force sRGB output to ensure correct file colors
        this.materials.displayMaterial.uniforms.map.value = tex;
        this.materials.displayMaterial.uniforms.uResolution.value.set(w, h);
        
        const oldEncode = this.materials.displayMaterial.uniforms.uEncodeOutput.value;
        this.materials.displayMaterial.uniforms.uEncodeOutput.value = 1.0; // Force sRGB
        
        this.renderer.render(this.sceneCtrl.displayScene, this.sceneCtrl.mainCamera);
        
        // 4. Read Pixels
        const buffer = new Uint8Array(w * h * 4);
        this.renderer.readRenderTargetPixels(target, 0, 0, w, h, buffer);
        
        // Restore state
        this.renderer.setRenderTarget(originalTarget);
        this.materials.displayMaterial.uniforms.uEncodeOutput.value = oldEncode;
        target.dispose();
        
        // 5. Transfer to 2D Canvas (Flip Y)
        const canvas2d = document.createElement('canvas');
        canvas2d.width = w;
        canvas2d.height = h;
        const ctx = canvas2d.getContext('2d');
        if (!ctx) return null;
        
        const imageData = ctx.createImageData(w, h);
        const stride = w * 4;
        
        // WebGL reads pixels from bottom-up, Canvas expects top-down
        for (let y = 0; y < h; y++) {
            const srcStart = y * stride;
            const destStart = (h - 1 - y) * stride;
            imageData.data.set(buffer.subarray(srcStart, srcStart + stride), destStart);
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        return new Promise(resolve => canvas2d.toBlob(resolve, 'image/png'));
    }

    public syncFrame(camera: THREE.Camera, state: any) {
        if (!this.state.optics && !this.state.lighting) {
            return;
        }
        
        this.uniformManager.syncFrame(
            camera, 
            state, 
            this.renderer, 
            this.state,
            this.state.optics || {} as any,
            this.state.lighting || {} as any,
            this.modulations,
            this.materials
        );
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
}

export const engine = new FractalEngine();
