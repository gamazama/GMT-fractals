
import * as THREE from 'three';
import { engine } from './FractalEngine';
import { Uniforms } from './UniformNames';
import { VERTEX_SHADER } from '../shaders/chunks/vertex';
import { QualityState } from '../features/quality';

const CONVERGENCE_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D tA;
uniform sampler2D tB;
uniform vec2 uBoundsMin;
uniform vec2 uBoundsMax;

void main() {
    // Remap UV to the specific region we are measuring
    vec2 uv = mix(uBoundsMin, uBoundsMax, vUv);
    
    vec3 a = texture2D(tA, uv).rgb;
    vec3 b = texture2D(tB, uv).rgb;
    
    // Calculate max component difference (L-inf norm) for brightness change
    vec3 diff = abs(a - b);
    float maxDiff = max(diff.r, max(diff.g, diff.b));
    
    gl_FragColor = vec4(maxDiff, 0.0, 0.0, 1.0);
}
`;

export class RenderPipeline {
    private targetA: THREE.WebGLRenderTarget | null = null;
    private targetB: THREE.WebGLRenderTarget | null = null;
    
    public frameCount: number = 0;
    public accumulationCount: number = 0; // Public for UI monitoring
    private sampleCap: number = 0; // 0 = Infinite
    
    public lastCompleteDuration: number = 0;
    private startTime: number = 0;
    
    // Convergence Measurement Resources
    private convergenceTarget: THREE.WebGLRenderTarget | null = null;
    private convergenceMaterial: THREE.ShaderMaterial | null = null;
    private convergenceBuffer: Float32Array | null = null;
    private convergenceScene: THREE.Scene | null = null;
    private convergenceCamera: THREE.Camera | null = null;

    private isHolding: boolean = false;

    // Local State (Decoupled from Store)
    private _qualityState: QualityState | null = null;
    private _accumulationEnabled: boolean = true;
    
    public updateQuality(q: QualityState) {
        // Check if buffer precision changed
        const oldPrec = this._qualityState?.bufferPrecision;
        const newPrec = q.bufferPrecision;
        this._qualityState = q;
        
        if (this.targetA && oldPrec !== newPrec) {
            this.resize(this.targetA.width, this.targetA.height);
        }
    }

    public setAccumulationEnabled(enabled: boolean) {
        this._accumulationEnabled = enabled;
        if (!enabled) this.resetAccumulation();
    }
    
    private initTargets(width: number, height: number) {
        // Default to Float32 (High) if undefined
        const useHalfFloat = (this._qualityState?.bufferPrecision ?? 0) > 0.5;
        
        const opts = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: useHalfFloat ? THREE.HalfFloatType : THREE.FloatType, 
            stencilBuffer: false,
            depthBuffer: false,
            generateMipmaps: false
        };
        this.targetA = new THREE.WebGLRenderTarget(width, height, opts);
        this.targetB = new THREE.WebGLRenderTarget(width, height, opts);
        
        // Initialize Convergence Tools (64x64 Probe)
        if (!this.convergenceTarget) {
            this.convergenceTarget = new THREE.WebGLRenderTarget(64, 64, {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
                type: useHalfFloat ? THREE.HalfFloatType : THREE.FloatType,
                depthBuffer: false,
                stencilBuffer: false,
                generateMipmaps: false
            });
            this.convergenceBuffer = new Float32Array(64 * 64 * 4);
            
            this.convergenceMaterial = new THREE.ShaderMaterial({
                vertexShader: VERTEX_SHADER,
                fragmentShader: CONVERGENCE_FRAG,
                uniforms: {
                    tA: { value: null },
                    tB: { value: null },
                    uBoundsMin: { value: new THREE.Vector2(0, 0) },
                    uBoundsMax: { value: new THREE.Vector2(1, 1) }
                },
                depthTest: false,
                depthWrite: false
            });
            
            this.convergenceScene = new THREE.Scene();
            const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.convergenceMaterial);
            quad.frustumCulled = false;
            this.convergenceScene.add(quad);
            
            this.convergenceCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        }
        
        this.resetAccumulation();
    }
    
    public resize(width: number, height: number) {
        // Check dimension OR type change
        const useHalfFloat = (this._qualityState?.bufferPrecision ?? 0) > 0.5;
        const currentType = this.targetA?.texture.type;
        const desiredType = useHalfFloat ? THREE.HalfFloatType : THREE.FloatType;
        
        if (!this.targetA || this.targetA.width !== width || this.targetA.height !== height || currentType !== desiredType) {
            if (this.targetA) {
                this.targetA.dispose();
                this.targetB?.dispose();
            }
            this.initTargets(width, height);
        }
    }
    
    public setSampleCap(cap: number) {
        this.sampleCap = cap;
        // If we apply a cap lower than current, reset to see effect immediately
        if (cap > 0 && this.accumulationCount > cap) {
            this.resetAccumulation();
        }
    }
    
    public resetAccumulation() {
        this.accumulationCount = 0;
        this.lastCompleteDuration = 0;
        this.isHolding = false;
    }
    
    public setHold(hold: boolean) {
        this.isHolding = hold;
    }

    public getCurrentFrameDuration(): number {
        if (this.accumulationCount === 0) return 0;
        
        // If cap is set and reached, return the final recorded time
        if (this.sampleCap > 0 && this.accumulationCount >= this.sampleCap && this.lastCompleteDuration > 0) {
            return this.lastCompleteDuration;
        }
        
        // Otherwise return live elapsed time
        return performance.now() - this.startTime;
    }
    
    public getOutputTexture(): THREE.Texture | null {
        if (!this.targetA) return null;
        const isOdd = this.frameCount % 2 !== 0;
        return isOdd ? this.targetA.texture : this.targetB!.texture;
    }
    
    public measureConvergence(
        renderer: THREE.WebGLRenderer, 
        boundsMin: THREE.Vector2 = new THREE.Vector2(0,0), 
        boundsMax: THREE.Vector2 = new THREE.Vector2(1,1)
    ): number {
        if (!this.targetA || !this.targetB || !this.convergenceTarget || !this.convergenceMaterial || !this.convergenceScene || !this.convergenceCamera || !this.convergenceBuffer) return 1.0;
        
        // Don't measure on first frame (no history)
        if (this.accumulationCount <= 1) return 1.0;

        // Bind textures
        this.convergenceMaterial.uniforms.tA.value = this.targetA.texture;
        this.convergenceMaterial.uniforms.tB.value = this.targetB.texture;
        this.convergenceMaterial.uniforms.uBoundsMin.value.copy(boundsMin);
        this.convergenceMaterial.uniforms.uBoundsMax.value.copy(boundsMax);
        
        // Render Difference Pass
        const currentTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(this.convergenceTarget);
        renderer.render(this.convergenceScene, this.convergenceCamera);
        
        // Read Back
        renderer.readRenderTargetPixels(this.convergenceTarget, 0, 0, 64, 64, this.convergenceBuffer);
        renderer.setRenderTarget(currentTarget);
        
        // Find Max Delta on CPU (Fast for 4096 pixels)
        let maxDelta = 0;
        // Stride is 4 (RGBA), Red channel has the diff
        for(let i = 0; i < this.convergenceBuffer.length; i += 4) {
            const val = this.convergenceBuffer[i];
            if (val > maxDelta) maxDelta = val;
        }
        
        return maxDelta;
    }

    public render(renderer: THREE.WebGLRenderer) {
        if (!this.targetA || !this.targetB) return;
        if (this.isHolding) return;

        // PREVIEW CAP LOGIC
        if (this.sampleCap > 0 && this.accumulationCount >= this.sampleCap) {
            return;
        }

        // Start timing
        if (this.accumulationCount === 0) {
            this.startTime = performance.now();
        }

        const isOdd = (this.frameCount + 1) % 2 !== 0;
        const writeBuffer = isOdd ? this.targetA : this.targetB;
        const readBuffer = isOdd ? this.targetB : this.targetA;
        
        const accumEnabled = this._accumulationEnabled;
        
        if (!accumEnabled) {
            this.accumulationCount = 1;
        } else {
            if (this.accumulationCount === 0) this.accumulationCount = 1;
            else this.accumulationCount++;
        }
        
        const blend = 1.0 / this.accumulationCount;
        
        engine.mainUniforms[Uniforms.BlendFactor].value = blend;
        engine.mainUniforms[Uniforms.HistoryTexture].value = readBuffer.texture;
        engine.mainUniforms[Uniforms.ExtraSeed].value = Math.random() * 100.0;
        
        const currentTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(writeBuffer);
        renderer.render(engine.mainScene, engine.mainCamera);
        renderer.setRenderTarget(currentTarget);
        
        this.frameCount++;

        // Measure completion time
        if (this.sampleCap > 0 && this.accumulationCount === this.sampleCap) {
            this.lastCompleteDuration = performance.now() - this.startTime;
        }
    }
}
