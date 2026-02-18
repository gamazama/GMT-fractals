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
    // MRT targets: texture[0] = Color, texture[1] = Depth
    // Double-buffered for temporal accumulation and async depth readback
    private mrtTargetA: THREE.WebGLRenderTarget | null = null;
    private mrtTargetB: THREE.WebGLRenderTarget | null = null;
    
    // Which target was written to last frame (0 = A, 1 = B)
    private writeIndex: number = 0;
    
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

    public isHolding: boolean = false;

    // Local State (Decoupled from Store)
    private _qualityState: QualityState | null = null;
    private _accumulationEnabled: boolean = true;
    
    // Reusable buffer for HalfFloat readback (avoid per-frame allocation)
    private _halfFloatBuffer: Uint16Array | null = null;
    
    public updateQuality(q: QualityState) {
        // Check if buffer precision changed
        const oldPrec = this._qualityState?.bufferPrecision;
        const newPrec = q.bufferPrecision;
        this._qualityState = q;
        
        if (this.mrtTargetA && oldPrec !== newPrec) {
            this.resize(this.mrtTargetA.width, this.mrtTargetA.height);
        }
    }

    public setAccumulationEnabled(enabled: boolean) {
        this._accumulationEnabled = enabled;
        if (!enabled) this.resetAccumulation();
    }
    
    /**
     * Get the color texture from the PREVIOUS frame (for history/accumulation)
     * Note: writeIndex is swapped AFTER render(), so it points to the NEXT target to write.
     * The "previous" frame is the one that was just written, which is the OPPOSITE target.
     */
    public getPreviousColorTexture(): THREE.Texture | null {
        // Inverted logic: when writeIndex=0, the last written target is B (not A)
        const target = this.writeIndex === 0 ? this.mrtTargetB : this.mrtTargetA;
        return target?.texture || null;
    }
    
    /**
     * Get the render target from the PREVIOUS frame (for physics probe readback)
     * This is safe to read without stalling the GPU
     * Note: writeIndex is swapped AFTER render(), so it points to the NEXT target to write.
     * The "previous" frame is the one that was just written, which is the OPPOSITE target.
     */
    public getPreviousRenderTarget(): THREE.WebGLRenderTarget | null {
        // Inverted logic: when writeIndex=0, the last written target is B (not A)
        return this.writeIndex === 0 ? this.mrtTargetB : this.mrtTargetA;
    }
    
    /**
     * Convert a 16-bit half-float to a 32-bit float
     */
    private halfToFloat(h: number): number {
        const sign = (h & 0x8000) >> 15;
        const exponent = (h & 0x7C00) >> 10;
        const mantissa = h & 0x03FF;
        
        if (exponent === 0) {
            if (mantissa === 0) return sign ? -0 : 0;
            // Subnormal - denormalize
            const e = Math.clz32(mantissa) - 21;
            return (sign ? -1 : 1) * (mantissa << e) * Math.pow(2, -24);
        }
        
        if (exponent === 31) {
            return mantissa ? NaN : (sign ? -Infinity : Infinity);
        }
        
        return (sign ? -1 : 1) * Math.pow(2, exponent - 15) * (1 + mantissa / 1024);
    }
    
    /**
     * Read pixels from the previous frame's color buffer
     * This reads from the bottom right corner where depth info is encoded
     */
    public readPixels(
        renderer: THREE.WebGLRenderer,
        x: number, y: number, 
        width: number, height: number,
        buffer: Float32Array
    ): boolean {
        // Don't attempt readback before targets are initialized or shader is compiled
        if (!this.mrtTargetA || !this.mrtTargetB) return false;
        
        const target = this.getPreviousRenderTarget();
        if (!target) return false;
        
        // Clear buffer before reading to detect failures
        buffer.fill(0);
        
        const useHalfFloat = (this._qualityState?.bufferPrecision ?? 0) > 0.5;
        
        try {
            if (useHalfFloat) {
                // For HalfFloat16 targets, use Uint16Array and convert to floats
                const pixelCount = width * height;
                
                // Reuse buffer to avoid per-frame allocation
                if (!this._halfFloatBuffer || this._halfFloatBuffer.length !== pixelCount * 4) {
                    this._halfFloatBuffer = new Uint16Array(pixelCount * 4);
                }
                
                renderer.readRenderTargetPixels(target, x, y, width, height, this._halfFloatBuffer);
                
                // Convert half-floats to floats
                for (let i = 0; i < pixelCount * 4; i++) {
                    buffer[i] = this.halfToFloat(this._halfFloatBuffer[i]);
                }
            } else {
                // For Float32 targets, read directly
                renderer.readRenderTargetPixels(target, x, y, width, height, buffer);
            }
            return true;
        } catch (e) {
            console.warn('Pixel readback failed:', e);
            return false;
        }
    }
    
    private initTargets(width: number, height: number) {
        const useHalfFloat = (this._qualityState?.bufferPrecision ?? 0) > 0.5;
        const floatType = useHalfFloat ? THREE.HalfFloatType : THREE.FloatType;
        
        // Single render target (color only) - no MRT needed
        const rtOpts = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            stencilBuffer: false,
            depthBuffer: false,
            generateMipmaps: false,
            format: THREE.RGBAFormat,
            type: floatType
        };
        
        // Create single render targets
        this.mrtTargetA = new THREE.WebGLRenderTarget(width, height, rtOpts);
        this.mrtTargetB = new THREE.WebGLRenderTarget(width, height, rtOpts);
        
        this.resetAccumulation();
    }
    

    
    private initConvergenceTools(floatType: THREE.TextureDataType) {
        if (!this.convergenceTarget) {
            this.convergenceTarget = new THREE.WebGLRenderTarget(64, 64, {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
                type: floatType,
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
        const useHalfFloat = (this._qualityState?.bufferPrecision ?? 0) > 0.5;
        const currentType = this.mrtTargetA?.texture.type;
        const desiredType = useHalfFloat ? THREE.HalfFloatType : THREE.FloatType;
        
        if (!this.mrtTargetA || this.mrtTargetA.width !== width || this.mrtTargetA.height !== height || currentType !== desiredType) {
            if (this.mrtTargetA) {
                this.mrtTargetA.dispose();
                this.mrtTargetB?.dispose();
            }
            this.initTargets(width, height);
        }
    }
    
    public setSampleCap(cap: number) {
        this.sampleCap = cap;
        if (cap > 0 && this.accumulationCount > cap) {
            this.resetAccumulation();
        }
    }
    
    public resetAccumulation() {
        this.accumulationCount = 0;
        this.lastCompleteDuration = 0;
        this.isHolding = false;
    }
    
    /**
     * Clear both render targets to prevent bucket bleeding.
     * Called by BucketRenderer when switching between buckets.
     */
    public clearTargets() {
        // We need a renderer to clear - check if engine has one
        if (!engine.renderer) return;
        
        const currentTarget = engine.renderer.getRenderTarget();
        
        if (this.mrtTargetA) {
            engine.renderer.setRenderTarget(this.mrtTargetA);
            engine.renderer.clear();
        }
        if (this.mrtTargetB) {
            engine.renderer.setRenderTarget(this.mrtTargetB);
            engine.renderer.clear();
        }
        
        engine.renderer.setRenderTarget(currentTarget);
    }
    
    public setHold(hold: boolean) {
        this.isHolding = hold;
    }

    public getCurrentFrameDuration(): number {
        if (this.accumulationCount === 0) return 0;
        
        if (this.sampleCap > 0 && this.accumulationCount >= this.sampleCap && this.lastCompleteDuration > 0) {
            return this.lastCompleteDuration;
        }
        
        return performance.now() - this.startTime;
    }
    
    public getOutputTexture(): THREE.Texture | null {
        if (!this.mrtTargetA) return null;
        // Return color texture from the target we just wrote to
        const target = this.writeIndex === 0 ? this.mrtTargetB : this.mrtTargetA;
        return target?.texture || null;
    }
    
    public measureConvergence(
        renderer: THREE.WebGLRenderer, 
        boundsMin: THREE.Vector2 = new THREE.Vector2(0,0), 
        boundsMax: THREE.Vector2 = new THREE.Vector2(1,1)
    ): number {
        if (!this.mrtTargetA || !this.mrtTargetB || !this.convergenceTarget || !this.convergenceMaterial || !this.convergenceScene || !this.convergenceCamera || !this.convergenceBuffer) return 1.0;
        
        if (this.accumulationCount <= 1) return 1.0;

        // Bind color textures from both render targets
            this.convergenceMaterial.uniforms.tA.value = this.mrtTargetA.texture;
            this.convergenceMaterial.uniforms.tB.value = this.mrtTargetB.texture;
        this.convergenceMaterial.uniforms.uBoundsMin.value.copy(boundsMin);
        this.convergenceMaterial.uniforms.uBoundsMax.value.copy(boundsMax);
        
        const currentTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(this.convergenceTarget);
        renderer.render(this.convergenceScene, this.convergenceCamera);
        
        renderer.readRenderTargetPixels(this.convergenceTarget, 0, 0, 64, 64, this.convergenceBuffer);
        renderer.setRenderTarget(currentTarget);
        
        let maxDelta = 0;
        for(let i = 0; i < this.convergenceBuffer.length; i += 4) {
            const val = this.convergenceBuffer[i];
            if (val > maxDelta) maxDelta = val;
        }
        
        return maxDelta;
    }

    public render(renderer: THREE.WebGLRenderer) {
        if (!this.mrtTargetA || !this.mrtTargetB) return;
        if (this.isHolding) return;

        if (this.sampleCap > 0 && this.accumulationCount >= this.sampleCap) {
            return;
        }

        if (this.accumulationCount === 0) {
            this.startTime = performance.now();
        }

        const accumEnabled = this._accumulationEnabled;
        
        if (!accumEnabled) {
            this.accumulationCount = 1;
        } else {
            if (this.accumulationCount === 0) this.accumulationCount = 1;
            else this.accumulationCount++;
        }
        
        const blend = 1.0 / this.accumulationCount;
        
        // Determine write/read targets (double-buffering)
        const writeTarget = this.writeIndex === 0 ? this.mrtTargetA : this.mrtTargetB;
        const readTarget = this.writeIndex === 0 ? this.mrtTargetB : this.mrtTargetA;
        
        // Set uniforms for temporal blending
        engine.mainUniforms[Uniforms.BlendFactor].value = blend;
        engine.mainUniforms[Uniforms.HistoryTexture].value = readTarget.texture; // Previous frame's color
        engine.mainUniforms[Uniforms.ExtraSeed].value = Math.random() * 100.0;
        
        const currentTarget = renderer.getRenderTarget();
        
        // SINGLE render to MRT - outputs both color (location 0) and depth (location 1)
        renderer.setRenderTarget(writeTarget);
        renderer.render(engine.mainScene, engine.mainCamera);
        
        renderer.setRenderTarget(currentTarget);
        
        // Swap buffers for next frame
        this.writeIndex = 1 - this.writeIndex;
        
        this.frameCount++;

        if (this.sampleCap > 0 && this.accumulationCount === this.sampleCap) {
            this.lastCompleteDuration = performance.now() - this.startTime;
        }
    }
}
