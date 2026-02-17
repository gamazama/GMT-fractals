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
    private mrtTargetA: THREE.WebGLMultipleRenderTargets | null = null;
    private mrtTargetB: THREE.WebGLMultipleRenderTargets | null = null;
    
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

    private isHolding: boolean = false;

    // Local State (Decoupled from Store)
    private _qualityState: QualityState | null = null;
    private _accumulationEnabled: boolean = true;
    
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
     */
    public getPreviousColorTexture(): THREE.Texture | null {
        const target = this.writeIndex === 0 ? this.mrtTargetA : this.mrtTargetB;
        return target?.texture?.[0] || null;
    }
    
    /**
     * Get the depth texture from the PREVIOUS frame (for physics probe)
     * This is safe to read without stalling the GPU
     */
    public getPreviousDepthTexture(): THREE.Texture | null {
        const target = this.writeIndex === 0 ? this.mrtTargetA : this.mrtTargetB;
        return target?.texture?.[1] || null;
    }
    
    /**
     * Get the MRT target from the PREVIOUS frame (for physics probe readback)
     */
    public getPreviousDepthTarget(): THREE.WebGLMultipleRenderTargets | null {
        return this.writeIndex === 0 ? this.mrtTargetA : this.mrtTargetB;
    }
    
    /**
     * Read depth values from the previous frame's depth texture (MRT texture[1])
     * This uses raw WebGL2 to read from the second color attachment
     */
    public readDepthPixels(
        renderer: THREE.WebGLRenderer,
        x: number, y: number, 
        width: number, height: number,
        buffer: Float32Array
    ): boolean {
        const mrtTarget = this.getPreviousDepthTarget();
        if (!mrtTarget) return false;
        
        // Get WebGL2 context
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl.readBuffer) {
            console.warn('WebGL2 required for MRT depth readback');
            return false;
        }
        
        // Get the framebuffer for this MRT target
        const fbInfo = renderer.properties.get(mrtTarget);
        if (!fbInfo?.__webglFramebuffer) {
            return false;
        }
        
        // Save current framebuffer
        const prevFb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
        
        try {
            // Bind MRT framebuffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbInfo.__webglFramebuffer);
            
            // Read from COLOR_ATTACHMENT1 (depth texture)
            gl.readBuffer(gl.COLOR_ATTACHMENT1);
            
            // Read pixels
            gl.readPixels(x, y, width, height, gl.RGBA, gl.FLOAT, buffer);
            
            return true;
        } catch (e) {
            console.warn('Depth readback failed:', e);
            return false;
        } finally {
            // Restore previous framebuffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, prevFb);
        }
    }
    
    private initTargets(width: number, height: number) {
        const useHalfFloat = (this._qualityState?.bufferPrecision ?? 0) > 0.5;
        const floatType = useHalfFloat ? THREE.HalfFloatType : THREE.FloatType;
        
        // MRT targets: [0] = Color (RGBA), [1] = Depth (RGBA, depth in .r)
        const mrtOpts = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            stencilBuffer: false,
            depthBuffer: false,
            generateMipmaps: false
        };
        
        // Create MRT with 2 outputs
        this.mrtTargetA = new THREE.WebGLMultipleRenderTargets(width, height, 2, mrtOpts);
        this.mrtTargetB = new THREE.WebGLMultipleRenderTargets(width, height, 2, mrtOpts);
        
        // Configure texture formats for target A
        // Texture 0: Color (RGBA)
        this.mrtTargetA.texture[0].format = THREE.RGBAFormat;
        this.mrtTargetA.texture[0].type = floatType;
        this.mrtTargetA.texture[0].minFilter = THREE.LinearFilter;
        this.mrtTargetA.texture[0].magFilter = THREE.LinearFilter;
        
        // Texture 1: Depth (RGBA for readPixels compatibility, depth in .r)
        this.mrtTargetA.texture[1].format = THREE.RGBAFormat;
        this.mrtTargetA.texture[1].type = THREE.FloatType; // Always float for depth precision
        this.mrtTargetA.texture[1].minFilter = THREE.NearestFilter;
        this.mrtTargetA.texture[1].magFilter = THREE.NearestFilter;
        
        // Same for target B
        this.mrtTargetB.texture[0].format = THREE.RGBAFormat;
        this.mrtTargetB.texture[0].type = floatType;
        this.mrtTargetB.texture[0].minFilter = THREE.LinearFilter;
        this.mrtTargetB.texture[0].magFilter = THREE.LinearFilter;
        
        this.mrtTargetB.texture[1].format = THREE.RGBAFormat;
        this.mrtTargetB.texture[1].type = THREE.FloatType;
        this.mrtTargetB.texture[1].minFilter = THREE.NearestFilter;
        this.mrtTargetB.texture[1].magFilter = THREE.NearestFilter;
        
        this.resetAccumulation();
    }
    
    /**
     * Pre-warm MRT framebuffers to avoid first-use delay
     * This forces WebGL to validate the framebuffer configuration
     * AND triggers GPU driver to compile shader for MRT configuration
     * Call this after shader compilation is complete
     */
    public preWarmMRT(renderer: THREE.WebGLRenderer) {
        if (!this.mrtTargetA || !this.mrtTargetB) return;
        
        const currentTarget = renderer.getRenderTarget();
        
        // Create a minimal dummy scene with a simple shader
        // This triggers the GPU driver to validate the MRT framebuffer
        // WITHOUT doing expensive raymarching
        const dummyScene = new THREE.Scene();
        const dummyCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        // Simple shader that outputs to both MRT locations
        const dummyMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                layout(location = 0) out vec4 color;
                layout(location = 1) out vec4 depth;
                void main() {
                    color = vec4(0.0);
                    depth = vec4(0.0);
                }
            `,
            glslVersion: THREE.GLSL3
        });
        
        const dummyMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dummyMaterial);
        dummyMesh.frustumCulled = false;
        dummyScene.add(dummyMesh);
        
        // Render to both MRT targets to trigger validation
        renderer.setRenderTarget(this.mrtTargetA);
        renderer.render(dummyScene, dummyCam);
        
        renderer.setRenderTarget(this.mrtTargetB);
        renderer.render(dummyScene, dummyCam);
        
        renderer.setRenderTarget(currentTarget);
        
        // Clean up
        dummyMesh.geometry.dispose();
        dummyMaterial.dispose();
        
        console.log('[MRT Pre-warmed] Framebuffers validated');
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
        const currentType = this.mrtTargetA?.texture[0].type;
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
        return target?.texture?.[0] || null;
    }
    
    public measureConvergence(
        renderer: THREE.WebGLRenderer, 
        boundsMin: THREE.Vector2 = new THREE.Vector2(0,0), 
        boundsMax: THREE.Vector2 = new THREE.Vector2(1,1)
    ): number {
        if (!this.mrtTargetA || !this.mrtTargetB || !this.convergenceTarget || !this.convergenceMaterial || !this.convergenceScene || !this.convergenceCamera || !this.convergenceBuffer) return 1.0;
        
        if (this.accumulationCount <= 1) return 1.0;

        // Bind color textures from both MRT targets
        this.convergenceMaterial.uniforms.tA.value = this.mrtTargetA.texture[0];
        this.convergenceMaterial.uniforms.tB.value = this.mrtTargetB.texture[0];
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
        engine.mainUniforms[Uniforms.HistoryTexture].value = readTarget.texture[0]; // Previous frame's color
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
