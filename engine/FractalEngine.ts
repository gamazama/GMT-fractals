
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

// CPU Halton Sequence Generator
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
    
    // High-frequency modulation buffer (AnimationSystem -> UniformManager)
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

    public shouldSnapCamera: boolean = false;
    public lastMeasuredDistance: number = 10.0;
    public dirty: boolean = true;
    
    public lastCompileDuration: number = 0; 

    public _isCompiling: boolean = false; 
    private _shaderUpdated: boolean = false; 
    private _compileStartTime: number = 0;
    private _compileTimeout: any = null;
    private _pendingTeleport: CameraState | null = null;
    
    public isBooted: boolean = false;

    private lastRenderState = {
        pos: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        offset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 },
        fov: 60.0
    };
    
    private jitterVec = new THREE.Vector2();

    constructor() {
        const isMobile = (typeof window !== 'undefined' && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768));
        this.state.isMobile = isMobile;

        // SAFE DEFAULT: This config is just for initialization of objects.
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
                distanceMetric: 0.0
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
    }

    public bootWithConfig(config: ShaderConfig) {
        if (this.isBooted) return;
        
        console.log("⚡ FractalEngine: Booting with Config...");
        
        // 1. Ingest Config
        this.configManager.config = { ...config };
        // Rebuild uniform map now that all features are definitely registered
        this.configManager.rebuildMap();
        
        // 2. Mark as Booted and Compiling
        this.isBooted = true;
        this._isCompiling = true;
        this._compileStartTime = performance.now();
        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, "Initializing Shader...");

        // 3. Trigger Compilation immediately (Synchronous start, may block slightly)
        this.materials.updateConfig(this.configManager.config);
        
        // 4. Sync Uniforms
        this.materials.syncConfigUniforms(this.configManager.config);
        if (this.configManager.config.pipeline) {
             this.materials.syncModularUniforms(this.configManager.config.pipeline);
        }
        
        // 5. Finish
        this.resetAccumulation();
        this._shaderUpdated = true;
        this._isCompiling = false;
        
        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
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
            if (this.compileTimeout) {
                clearTimeout(this.compileTimeout);
                this.compileTimeout = null;
            }

            this.compileStartTime = performance.now();
            this._isCompiling = true;
            this._shaderUpdated = false;
            FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, true);

            this.compileTimeout = setTimeout(() => {
                requestAnimationFrame(() => {
                     this.materials.updateConfig(this.configManager.config);
                     this.materials.syncConfigUniforms(this.configManager.config);
                     if (this.configManager.config.pipeline) this.materials.syncModularUniforms(this.configManager.config.pipeline);
                     
                     const mode = this.configManager.config.renderMode;
                     const mat = this.materials.getMaterial(mode || 'Direct');
                     this.sceneCtrl.setMaterial(mat);

                     this.resetAccumulation();
                     this._shaderUpdated = true;
                     this.compileTimeout = null;
                });
            }, 150);
        } else if (uniformUpdate) {
            this.materials.syncConfigUniforms(this.configManager.config);
            if (this.configManager.config.pipeline) {
                this.materials.syncModularUniforms(this.configManager.config.pipeline);
            }
            this.resetAccumulation();
        } else if (Object.keys(newConfig).length > 0) {
            this.resetAccumulation();
        }
    }
    
    private get compileTimeout() { return this._compileTimeout; }
    private set compileTimeout(v: any) { this._compileTimeout = v; }
    private get compileStartTime() { return this._compileStartTime; }
    private set compileStartTime(v: number) { this._compileStartTime = v; }

    public setUniform(key: string, value: any, noReset: boolean = false) {
        this.materials.setUniform(key, value);
        this.configManager.syncUniform(key, value);
        if (!noReset) this.resetAccumulation(); 
    }
    
    public setRenderState(partial: Partial<EngineRenderState>) {
        Object.assign(this.state, partial);
    }
    
    public update(camera: THREE.Camera, delta: number, state: any, isInteracting: boolean = false) {
        if (!this.isBooted) return;

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
        if (!this.isBooted) return;

        if (this.pipeline.accumulationCount > 1) {
            const idx = (this.pipeline.accumulationCount % 16) + 1;
            const jX = halton(idx, 2);
            const jY = halton(idx, 3);
            this.jitterVec.set(jX * 2.0 - 1.0, jY * 2.0 - 1.0);
            this.mainUniforms.uJitter.value.copy(this.jitterVec);
        } else {
            this.mainUniforms.uJitter.value.set(0,0);
        }

        this.pipeline.render(renderer); 
        
        if (this._isCompiling && this._shaderUpdated) {
            this._isCompiling = false;
            const duration = performance.now() - this._compileStartTime;
            this.lastCompileDuration = duration / 1000;
            
            console.log(`[Shader Compiled] Update | Time: ${this.lastCompileDuration.toFixed(3)}s`);

            FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
            
            if (duration > 100) {
                FractalEvents.emit(FRACTAL_EVENTS.COMPILE_TIME, this.lastCompileDuration);
            }
        }
    }

    public syncFrame(camera: THREE.Camera, state: any) {
        if (!this.state.optics || !this.state.lighting) return; 
        
        this.uniformManager.syncFrame(
            camera, 
            state, 
            this.renderer, 
            this.state,
            this.state.optics,
            this.state.lighting
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
