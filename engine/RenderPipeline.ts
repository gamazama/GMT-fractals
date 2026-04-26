import * as THREE from 'three';
import { Uniforms } from './UniformNames';
import { VERTEX_SHADER } from '../shaders/chunks/vertex';
// Quality state was a fractal-feature type; treat as a structural shape
// here — only fields RenderPipeline actually reads. Apps with a richer
// quality plugin (engine-gmt/features/quality) supply types that satisfy
// this shape; declaration merging not required.
type QualityState = {
    bufferPrecision?: number;
    precisionMode?: number;
    compilerHardCap?: number;
};
import { createFullscreenPass } from './utils/FullscreenQuad';

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
    
    // ── Convergence Measurement ────────────────────────────────────────
    // Shared by both bucket rendering and viewport accumulation.
    // Renders a diff pass between ping-pong targets, then reads back the
    // max delta. Async path uses a GPU fence to avoid stalling the pipeline.
    private convergenceTarget: THREE.WebGLRenderTarget | null = null;
    private convergenceMaterial: THREE.ShaderMaterial | null = null;
    private convergenceBuffer: Float32Array | null = null;
    private convergenceScene: THREE.Scene | null = null;
    private convergenceCamera: THREE.Camera | null = null;

    // Async convergence readback (fence-based, avoids GPU stall)
    private convergenceFence: WebGLSync | null = null;
    private convergencePending: boolean = false;
    private lastConvergenceResult: number = 1.0;

    // Viewport convergence: periodic measurement during normal accumulation.
    // Skipped during bucket rendering (BucketRenderer manages its own).
    private static readonly VIEWPORT_CONVERGENCE_INTERVAL = 8;
    private _isBucketRendering: boolean = false;

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

    // Tiny 1x1 render target for compile-time program hash matching.
    // Shares the same float type / format as the real MRT targets so Three.js
    // generates identical program params, but is a separate FBO so compileAsync
    // doesn't interfere with the live render loop.
    private _compileTarget: THREE.WebGLRenderTarget | null = null;

    /** Get a render target for compile-time context (so Three.js generates matching program params) */
    public getCompileTarget(): THREE.WebGLRenderTarget | null {
        if (!this._compileTarget && this.mrtTargetA) {
            this._compileTarget = new THREE.WebGLRenderTarget(1, 1, {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                stencilBuffer: false,
                depthBuffer: false,
                generateMipmaps: false,
                format: THREE.RGBAFormat,
                type: this.mrtTargetA.texture.type
            });
        }
        return this._compileTarget;
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
        
        // Initialize convergence measurement tools
        this.initConvergenceTools(floatType);
        
        this.resetAccumulation();
    }
    

    
    // Current convergence target dimensions (resized to match measured area)
    private convergenceW: number = 0;
    private convergenceH: number = 0;
    private static readonly CONVERGENCE_MAX_DIM = 256; // Cap readback size for CPU scan performance

    private initConvergenceTools(floatType: THREE.TextureDataType) {
        if (!this.convergenceTarget) {
            // Initial size — will be resized by ensureConvergenceSize() before each measurement
            this.convergenceTarget = new THREE.WebGLRenderTarget(64, 64, {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
                type: floatType,
                depthBuffer: false,
                stencilBuffer: false,
                generateMipmaps: false
            });
            this.convergenceW = 64;
            this.convergenceH = 64;
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
            
            const convPass = createFullscreenPass(this.convergenceMaterial);
            this.convergenceScene = convPass.scene;
            this.convergenceCamera = convPass.camera;
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

    public getSampleCap(): number {
        return this.sampleCap;
    }
    
    public resetAccumulation() {
        this.accumulationCount = 0;
        this.lastCompleteDuration = 0;
        this.lastConvergenceResult = 1.0;
        this.isHolding = false;
    }
    
    /**
     * Clear both render targets to prevent bucket bleeding.
     * Called by BucketRenderer when switching between buckets.
     */
    public clearTargets(renderer: THREE.WebGLRenderer) {
        const currentTarget = renderer.getRenderTarget();

        if (this.mrtTargetA) {
            renderer.setRenderTarget(this.mrtTargetA);
            renderer.clear();
        }
        if (this.mrtTargetB) {
            renderer.setRenderTarget(this.mrtTargetB);
            renderer.clear();
        }

        renderer.setRenderTarget(currentTarget);
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
    
    /**
     * Resize convergence target to match the pixel dimensions of the region being measured.
     * Capped at CONVERGENCE_MAX_DIM to keep CPU readback scan fast.
     */
    private ensureConvergenceSize(regionPixelW: number, regionPixelH: number) {
        const max = RenderPipeline.CONVERGENCE_MAX_DIM;
        const w = Math.min(max, Math.max(1, regionPixelW));
        const h = Math.min(max, Math.max(1, regionPixelH));
        if (w === this.convergenceW && h === this.convergenceH) return;
        if (this.convergenceTarget) {
            this.convergenceTarget.setSize(w, h);
        }
        this.convergenceW = w;
        this.convergenceH = h;
        this.convergenceBuffer = new Float32Array(w * h * 4);
    }

    /**
     * Synchronous convergence measurement (legacy — used by non-bucket paths).
     * Causes a GPU stall due to immediate readRenderTargetPixels.
     */
    public measureConvergence(
        renderer: THREE.WebGLRenderer,
        boundsMin: THREE.Vector2 = new THREE.Vector2(0,0),
        boundsMax: THREE.Vector2 = new THREE.Vector2(1,1)
    ): number {
        if (!this.mrtTargetA || !this.mrtTargetB || !this.convergenceTarget || !this.convergenceMaterial || !this.convergenceScene || !this.convergenceCamera || !this.convergenceBuffer) return 1.0;

        if (this.accumulationCount <= 1) return 1.0;

        // Resize convergence target to match measured region pixel dimensions
        const regionW = Math.round((boundsMax.x - boundsMin.x) * this.mrtTargetA.width);
        const regionH = Math.round((boundsMax.y - boundsMin.y) * this.mrtTargetA.height);
        this.ensureConvergenceSize(regionW, regionH);

        // Bind color textures from both render targets
        this.convergenceMaterial.uniforms.tA.value = this.mrtTargetA.texture;
        this.convergenceMaterial.uniforms.tB.value = this.mrtTargetB.texture;
        this.convergenceMaterial.uniforms.uBoundsMin.value.copy(boundsMin);
        this.convergenceMaterial.uniforms.uBoundsMax.value.copy(boundsMax);

        const currentTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(this.convergenceTarget);
        renderer.render(this.convergenceScene, this.convergenceCamera);

        renderer.readRenderTargetPixels(this.convergenceTarget, 0, 0, this.convergenceW, this.convergenceH, this.convergenceBuffer);
        renderer.setRenderTarget(currentTarget);

        let maxDelta = 0;
        for(let i = 0; i < this.convergenceBuffer.length; i += 4) {
            const val = this.convergenceBuffer[i];
            if (val > maxDelta) maxDelta = val;
        }

        return maxDelta;
    }

    /**
     * Start an async convergence measurement. Renders the diff pass and inserts
     * a GPU fence. Call pollConvergenceResult() on subsequent frames to check
     * if readback data is available without stalling the GPU.
     */
    public startAsyncConvergence(
        renderer: THREE.WebGLRenderer,
        boundsMin: THREE.Vector2,
        boundsMax: THREE.Vector2
    ): void {
        if (!this.mrtTargetA || !this.mrtTargetB || !this.convergenceTarget ||
            !this.convergenceMaterial || !this.convergenceScene || !this.convergenceCamera) return;
        if (this.convergencePending) return; // Already waiting for a result
        if (this.accumulationCount <= 1) { this.lastConvergenceResult = 1.0; return; }

        // Resize convergence target to match measured region pixel dimensions
        const regionW = Math.round((boundsMax.x - boundsMin.x) * this.mrtTargetA.width);
        const regionH = Math.round((boundsMax.y - boundsMin.y) * this.mrtTargetA.height);
        this.ensureConvergenceSize(regionW, regionH);

        this.convergenceMaterial.uniforms.tA.value = this.mrtTargetA.texture;
        this.convergenceMaterial.uniforms.tB.value = this.mrtTargetB.texture;
        this.convergenceMaterial.uniforms.uBoundsMin.value.copy(boundsMin);
        this.convergenceMaterial.uniforms.uBoundsMax.value.copy(boundsMax);

        const currentTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(this.convergenceTarget);
        renderer.render(this.convergenceScene, this.convergenceCamera);
        renderer.setRenderTarget(currentTarget);

        // Insert GPU fence after the convergence render
        const gl2 = renderer.getContext() as WebGL2RenderingContext;
        if (gl2.fenceSync) {
            // Delete previous fence if it exists
            if (this.convergenceFence) gl2.deleteSync(this.convergenceFence);
            this.convergenceFence = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
            gl2.flush(); // Ensure fence is submitted to the GPU command queue
            this.convergencePending = true;
        } else {
            // Fallback: no fence support, do synchronous readback
            this.lastConvergenceResult = this.measureConvergence(renderer, boundsMin, boundsMax);
        }
    }

    /**
     * Poll for async convergence result. Returns the result if ready,
     * or null if the GPU hasn't finished yet (no stall).
     */
    public pollConvergenceResult(renderer: THREE.WebGLRenderer): number | null {
        if (!this.convergencePending || !this.convergenceFence || !this.convergenceBuffer) return null;

        const gl2 = renderer.getContext() as WebGL2RenderingContext;
        const status = gl2.clientWaitSync(this.convergenceFence, 0, 0); // Non-blocking (timeout = 0)

        if (status === gl2.ALREADY_SIGNALED || status === gl2.CONDITION_SATISFIED) {
            // GPU is done — readback is fast now (data already in driver buffer)
            renderer.readRenderTargetPixels(this.convergenceTarget!, 0, 0, this.convergenceW, this.convergenceH, this.convergenceBuffer);

            let maxDelta = 0;
            for (let i = 0; i < this.convergenceBuffer.length; i += 4) {
                const val = this.convergenceBuffer[i];
                if (val > maxDelta) maxDelta = val;
            }

            gl2.deleteSync(this.convergenceFence);
            this.convergenceFence = null;
            this.convergencePending = false;
            this.lastConvergenceResult = maxDelta;
            return maxDelta;
        }

        if (status === gl2.WAIT_FAILED) {
            // Fence failed — clean up and return last known result
            gl2.deleteSync(this.convergenceFence);
            this.convergenceFence = null;
            this.convergencePending = false;
            return this.lastConvergenceResult;
        }

        // TIMEOUT_EXPIRED — GPU not done yet, try again next frame
        return null;
    }

    /** Get the last convergence result (useful when polling returns null) */
    public getLastConvergenceResult(): number {
        return this.lastConvergenceResult;
    }

    /** Tell pipeline whether bucket rendering is active (disables viewport convergence) */
    public setBucketRendering(active: boolean) {
        this._isBucketRendering = active;
    }


    public render(renderer: THREE.WebGLRenderer, uniforms?: { [key: string]: THREE.IUniform }, scene?: THREE.Scene, camera?: THREE.Camera) {
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
        if (uniforms) {
            uniforms[Uniforms.BlendFactor].value = blend;
            uniforms[Uniforms.HistoryTexture].value = readTarget.texture;
        }

        const currentTarget = renderer.getRenderTarget();

        // SINGLE render to MRT - outputs both color (location 0) and depth (location 1)
        renderer.setRenderTarget(writeTarget);
        if (scene && camera) {
            renderer.render(scene, camera);
        }

        renderer.setRenderTarget(currentTarget);

        // Swap buffers for next frame
        this.writeIndex = 1 - this.writeIndex;

        this.frameCount++;

        if (this.sampleCap > 0 && this.accumulationCount === this.sampleCap) {
            this.lastCompleteDuration = performance.now() - this.startTime;
        }

        // Viewport convergence: periodic async measurement during normal accumulation.
        // Same startAsyncConvergence/pollConvergenceResult as bucket rendering uses.
        // Skipped during bucket rendering (BucketRenderer manages its own measurements).
        // Measures the active render region (or full viewport if no region set).
        // Cost: one convergence diff pass every 8 frames + non-blocking fence poll.
        if (accumEnabled && !this._isBucketRendering && this.accumulationCount > 2) {
            // Poll any pending result first
            if (this.convergencePending) {
                this.pollConvergenceResult(renderer);
            }
            // Start new measurement every N frames (if none pending)
            if (!this.convergencePending && this.accumulationCount % RenderPipeline.VIEWPORT_CONVERGENCE_INTERVAL === 0) {
                // Read active render region from uniforms (defaults to full viewport)
                const regionMin = uniforms?.[Uniforms.RegionMin]?.value as THREE.Vector2 | undefined;
                const regionMax = uniforms?.[Uniforms.RegionMax]?.value as THREE.Vector2 | undefined;
                const min = regionMin ?? new THREE.Vector2(0, 0);
                const max = regionMax ?? new THREE.Vector2(1, 1);
                this.startAsyncConvergence(renderer, min, max);
            }
        }
    }
}
