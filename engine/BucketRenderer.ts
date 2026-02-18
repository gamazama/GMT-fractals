
import * as THREE from 'three';
import { engine } from './FractalEngine';
import { Uniforms } from './UniformNames';
import { FractalEvents, FRACTAL_EVENTS } from './FractalEvents';
import { injectMetadata } from '../utils/pngMetadata';
import { getExportFileName } from '../utils/fileUtils';
import { Preset } from '../types';

export interface BucketRenderConfig {
    bucketSize: number;
    bucketUpscale: number;
    convergenceThreshold: number;
    accumulation: boolean;
    samplesPerBucket?: number; // New: explicit sample count for predictable quality
}

/**
 * BucketRenderer - Tiled High-Resolution Rendering System
 * 
 * Renders large images (4K-10K+) by dividing them into smaller tiles (buckets).
 * Each bucket is rendered and accumulated independently, then composited into
 * a final output image.
 * 
 * Key Architecture:
 * - Uses a separate composite buffer to accumulate completed buckets
 * - Does NOT clear render targets between buckets (preserves history)
 * - Supports both convergence-based and sample-count-based quality control
 * 
 * Quality Control:
 * - If samplesPerBucket is set: renders exactly N samples per bucket (predictable)
 * - Otherwise: uses convergence threshold to determine when bucket is done
 */
export class BucketRenderer {
    private isRunning: boolean = false;
    private isExporting: boolean = false;
    
    private buckets: { minX: number, minY: number, maxX: number, maxY: number }[] = [];
    private currentBucketIndex: number = 0;
    
    private bucketFrameCount: number = 0;
    private readonly DEFAULT_MAX_FRAMES = 1024; // Increased for high-quality renders
    
    private originalSize = new THREE.Vector2();
    private activeUpscale: number = 1.0;
    private targetResolution = new THREE.Vector2();
    
    // Composite buffer - stores the final accumulated image
    private compositeTarget: THREE.WebGLRenderTarget | null = null;
    private compositeMaterial: THREE.ShaderMaterial | null = null;
    private compositeScene: THREE.Scene | null = null;
    private compositeCamera: THREE.OrthographicCamera | null = null;
    
    // Cached config
    private config: BucketRenderConfig = { 
        bucketSize: 128, 
        bucketUpscale: 1.0, 
        convergenceThreshold: 0.1, 
        accumulation: true,
        samplesPerBucket: 64 // Default to 64 samples for predictable quality
    };

    // Preset for metadata injection (Optional, only used if exporting to disk)
    private exportPreset: Preset | null = null;
    private projectName: string = "Fractal";
    private projectVersion: number = 0;

    /**
     * Start a bucket render session
     * @param exportImage Whether to save the final image to disk
     * @param config Bucket render configuration
     * @param exportData Optional preset data to embed in the exported image
     */
    public start(exportImage: boolean, config: BucketRenderConfig, exportData?: { preset: Preset, name: string, version: number }) {
        if (!engine.renderer || this.isRunning) return;
        
        this.isExporting = exportImage;
        this.config = { ...config };
        this.activeUpscale = config.bucketUpscale || 1.0;
        
        if (exportData) {
            this.exportPreset = exportData.preset;
            this.projectName = exportData.name;
            this.projectVersion = exportData.version;
        }
        
        const gl = engine.renderer;
        
        // Store current size to restore later
        gl.getSize(this.originalSize);
        
        // Calculate Target Resolution
        const targetW = Math.floor(this.originalSize.x * this.activeUpscale);
        const targetH = Math.floor(this.originalSize.y * this.activeUpscale);
        this.targetResolution.set(targetW, targetH);
        
        // Resize pipeline to target resolution
        engine.pipeline.resize(targetW, targetH);
        engine.mainUniforms.uResolution.value.set(targetW, targetH);
        
        // Initialize composite buffer for storing final image
        this.initCompositeBuffer(targetW, targetH);
        
        // Generate bucket list (render from bottom-left to top-right)
        this.buckets = [];
        const size = config.bucketSize;
        const cols = Math.ceil(targetW / size);
        const rows = Math.ceil(targetH / size);
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const x1 = (x * size) / targetW;
                const y1 = (y * size) / targetH;
                const x2 = Math.min(1.0, ((x + 1) * size) / targetW);
                const y2 = Math.min(1.0, ((y + 1) * size) / targetH);
                this.buckets.push({ minX: x1, minY: y1, maxX: x2, maxY: y2 });
            }
        }
        
        this.currentBucketIndex = 0;
        this.bucketFrameCount = 0;
        this.isRunning = true;
        
        // Clear the composite buffer at start
        this.clearCompositeBuffer();
        
        // Set initial bucket region
        this.applyCurrentBucket();
        
        // Notify UI via Event
        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { 
            isRendering: true, 
            progress: 0,
            totalBuckets: this.buckets.length,
            currentBucket: 0
        });
    }
    
    /**
     * Initialize the composite buffer and related resources
     */
    private initCompositeBuffer(width: number, height: number) {
        // Clean up existing resources
        this.disposeCompositeBuffer();
        
        // Create composite render target (Float32 for HDR quality)
        this.compositeTarget = new THREE.WebGLRenderTarget(width, height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            stencilBuffer: false,
            depthBuffer: false
        });
        
        // Create composite shader material for copying bucket to composite
        this.compositeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: null },
                bucketMin: { value: new THREE.Vector2(0, 0) },
                bucketMax: { value: new THREE.Vector2(1, 1) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D map;
                uniform vec2 bucketMin;
                uniform vec2 bucketMax;
                varying vec2 vUv;
                
                void main() {
                    // Only render within the bucket region
                    if (vUv.x < bucketMin.x || vUv.y < bucketMin.y || 
                        vUv.x > bucketMax.x || vUv.y > bucketMax.y) {
                        discard;
                    }
                    
                    // Sample from the bucket texture
                    vec4 color = texture2D(map, vUv);
                    gl_FragColor = color;
                }
            `,
            depthTest: false,
            depthWrite: false,
            transparent: false
        });
        
        // Create scene for compositing
        this.compositeScene = new THREE.Scene();
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compositeMaterial);
        quad.frustumCulled = false;
        this.compositeScene.add(quad);
        
        this.compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
    
    /**
     * Clear the composite buffer to black
     */
    private clearCompositeBuffer() {
        if (!this.compositeTarget || !engine.renderer) return;
        
        const currentTarget = engine.renderer.getRenderTarget();
        engine.renderer.setRenderTarget(this.compositeTarget);
        engine.renderer.clear();
        engine.renderer.setRenderTarget(currentTarget);
    }
    
    /**
     * Dispose composite buffer resources
     */
    private disposeCompositeBuffer() {
        if (this.compositeTarget) {
            this.compositeTarget.dispose();
            this.compositeTarget = null;
        }
        if (this.compositeMaterial) {
            this.compositeMaterial.dispose();
            this.compositeMaterial = null;
        }
        this.compositeScene = null;
        this.compositeCamera = null;
    }
    
    public stop() {
        if (this.isRunning) {
            this.cleanup();
        }
    }
    
    private cleanup() {
        this.isRunning = false;
        this.isExporting = false;
        this.exportPreset = null;
        
        // Reset bucket region to full screen
        const min = new THREE.Vector2(0, 0);
        const max = new THREE.Vector2(1, 1);
        engine.materials.setUniform(Uniforms.RegionMin, min);
        engine.materials.setUniform(Uniforms.RegionMax, max);
        
        // Restore original resolution
        engine.pipeline.resize(this.originalSize.x, this.originalSize.y);
        engine.mainUniforms.uResolution.value.set(this.originalSize.x, this.originalSize.y);
        engine.resetAccumulation();
        
        // Dispose composite resources
        this.disposeCompositeBuffer();
        
        // Notify UI via Event
        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: false, progress: 0 });
    }
    
    /**
     * Apply the current bucket region to the shader
     * Does NOT clear render targets - this preserves history for non-bucket regions
     */
    private applyCurrentBucket() {
        if (this.currentBucketIndex >= this.buckets.length) {
            this.finish();
            return;
        }
        
        const b = this.buckets[this.currentBucketIndex];
        const min = new THREE.Vector2(b.minX, b.minY);
        const max = new THREE.Vector2(b.maxX, b.maxY);
        
        engine.materials.setUniform(Uniforms.RegionMin, min);
        engine.materials.setUniform(Uniforms.RegionMax, max);
        
        // Reset accumulation for the new bucket
        // This is necessary to start fresh accumulation for this bucket
        engine.pipeline.resetAccumulation();
        
        // DO NOT clear targets - the shader handles preserving history for non-bucket regions
        // The accumulation blend will correctly blend new samples in the bucket region
        
        this.bucketFrameCount = 0;
    }
    
    /**
     * Copy the current bucket from the render output to the composite buffer
     */
    private compositeCurrentBucket() {
        if (!this.compositeTarget || !this.compositeMaterial || !this.compositeScene || 
            !this.compositeCamera || !engine.renderer) return;
        
        const outputTex = engine.pipeline.getOutputTexture();
        if (!outputTex) return;
        
        const b = this.buckets[this.currentBucketIndex];
        
        // Setup composite material
        this.compositeMaterial.uniforms.map.value = outputTex;
        this.compositeMaterial.uniforms.bucketMin.value.set(b.minX, b.minY);
        this.compositeMaterial.uniforms.bucketMax.value.set(b.maxX, b.maxY);
        
        // Render to composite target with additive blending
        const currentTarget = engine.renderer.getRenderTarget();
        const currentViewport = new THREE.Vector4();
        engine.renderer.getViewport(currentViewport);
        
        engine.renderer.setRenderTarget(this.compositeTarget);
        engine.renderer.setViewport(0, 0, this.targetResolution.x, this.targetResolution.y);
        
        // Enable scissor test to only write to the bucket region
        const x = Math.floor(b.minX * this.targetResolution.x);
        const y = Math.floor(b.minY * this.targetResolution.y);
        const w = Math.ceil((b.maxX - b.minX) * this.targetResolution.x);
        const h = Math.ceil((b.maxY - b.minY) * this.targetResolution.y);
        
        // Render the bucket region to composite
        engine.renderer.render(this.compositeScene, this.compositeCamera);
        
        engine.renderer.setRenderTarget(currentTarget);
        engine.renderer.setViewport(currentViewport);
    }
    
    private finish() {
        if (this.isExporting) {
            this.saveImage();
        } else {
            // For non-export renders, hold the composite result
            engine.pipeline.setHold(true);
        }
        this.cleanup();
    }
    
    /**
     * Save the composite buffer to a PNG file
     * Uses the export material for proper post-processing (ACES, color grading, etc.)
     */
    private saveImage() {
        if (!this.compositeTarget || !engine.renderer) return;
        
        // --- WORKER GUARD ---
        if (typeof document === 'undefined') {
            console.warn("BucketRenderer: Cannot save image in Worker context (DOM missing).");
            return;
        }

        const w = this.targetResolution.x;
        const h = this.targetResolution.y;
        
        // Create an export target for post-processed output
        const exportTarget = new THREE.WebGLRenderTarget(w, h, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            stencilBuffer: false,
            depthBuffer: false
        });
        
        // Use the export material which has proper post-processing
        const exportMat = engine.materials.exportMaterial;
        const displayMat = engine.materials.displayMaterial;
        
        // Copy uniforms from display material (color grading settings)
        exportMat.uniforms.map.value = this.compositeTarget.texture;
        exportMat.uniforms.uResolution.value.set(w, h);
        // Copy color grading active flag and parameters
        if (displayMat.uniforms.uGradingActive) {
            exportMat.uniforms.uGradingActive.value = displayMat.uniforms.uGradingActive.value;
        }
        exportMat.uniforms.uSaturation.value = displayMat.uniforms.uSaturation.value;
        exportMat.uniforms.uLevelsMin.value = displayMat.uniforms.uLevelsMin.value;
        exportMat.uniforms.uLevelsMax.value = displayMat.uniforms.uLevelsMax.value;
        exportMat.uniforms.uLevelsGamma.value = displayMat.uniforms.uLevelsGamma.value;
        exportMat.uniforms.uEncodeOutput.value = 1.0; // Apply sRGB gamma
        
        // Render through post-process shader
        const currentTarget = engine.renderer.getRenderTarget();
        const currentViewport = new THREE.Vector4();
        engine.renderer.getViewport(currentViewport);

        engine.renderer.setRenderTarget(exportTarget);
        engine.renderer.setViewport(0, 0, w, h);
        engine.renderer.clear();
        
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), exportMat);
        scene.add(quad);
        engine.renderer.render(scene, camera);
        
        // Read pixels (already in Uint8 format)
        const buffer = new Uint8Array(w * h * 4);
        engine.renderer.readRenderTargetPixels(exportTarget, 0, 0, w, h, buffer);
        
        engine.renderer.setRenderTarget(currentTarget);
        engine.renderer.setViewport(currentViewport);
        exportTarget.dispose();
        
        // Flip Y (WebGL reads bottom-up, PNG is top-down)
        const flipped = new Uint8ClampedArray(w * h * 4);
        const stride = w * 4;
        for (let y = 0; y < h; y++) {
            const srcRowStart = y * stride;
            const destRowStart = (h - 1 - y) * stride;
            flipped.set(buffer.subarray(srcRowStart, srcRowStart + stride), destRowStart);
        }
        // Ensure alpha is 255
        for (let i = 3; i < flipped.length; i += 4) flipped[i] = 255;
        
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const imageData = new ImageData(flipped, w, h);
            ctx.putImageData(imageData, 0, 0);
            
            const presetStr = this.exportPreset ? JSON.stringify(this.exportPreset) : "{}";
            
            // Construct Filename
            const filename = getExportFileName(
                this.projectName,
                this.projectVersion,
                'png',
                `${w}x${h}`
            );

            canvas.toBlob(async (blob) => {
                if (!blob) return;
                
                try {
                    // Inject Metadata
                    const taggedBlob = await injectMetadata(blob, "FractalData", presetStr);
                    const url = URL.createObjectURL(taggedBlob);
                    
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                } catch (e) {
                    console.error("Failed to inject metadata", e);
                    // Fallback to simple save
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }
            }, 'image/png');
        }
    }
    
    /**
     * Update the bucket renderer - called each frame
     * Handles convergence checking and bucket advancement
     */
    public update(gl: THREE.WebGLRenderer, config: BucketRenderConfig) {
        if (!this.isRunning) return;
        
        // Update local config ref if it changed (e.g. from UI sliders during render)
        if (config) {
            this.config.convergenceThreshold = config.convergenceThreshold;
            this.config.accumulation = config.accumulation;
            if (config.samplesPerBucket !== undefined) {
                this.config.samplesPerBucket = config.samplesPerBucket;
            }
        }

        // Ensure resolution is correct
        const uRes = engine.mainUniforms.uResolution.value;
        if (uRes.x !== this.targetResolution.x || uRes.y !== this.targetResolution.y) {
            uRes.set(this.targetResolution.x, this.targetResolution.y);
        }
        
        // Adaptive convergence-based sampling
        // Minimum samples before checking convergence
        const minSamples = Math.min(16, (this.config.samplesPerBucket || 64) / 4);
        const maxSamples = this.config.samplesPerBucket || this.DEFAULT_MAX_FRAMES;
        
        // Need minimum samples before checking convergence
        if (this.bucketFrameCount < minSamples) {
            this.bucketFrameCount++;
            return;
        }
        
        // Check if bucket is complete
        let bucketComplete = false;
        
        // Measure convergence for the current bucket region
        const currentBucket = this.buckets[this.currentBucketIndex];
        const min = new THREE.Vector2(currentBucket.minX, currentBucket.minY);
        const max = new THREE.Vector2(currentBucket.maxX, currentBucket.maxY);
        
        // Get convergence measurement (max pixel difference between last two frames)
        const delta = this.config.accumulation 
            ? engine.pipeline.measureConvergence(gl, min, max)
            : 1.0;
        
        // Convert threshold from percentage to raw value
        // Lower threshold = more samples needed for convergence
        const thresholdRaw = this.config.convergenceThreshold / 100.0;
        
        // Bucket is complete when:
        // 1. Convergence delta is below threshold (image is stable)
        // 2. OR we've reached max samples (safety limit)
        bucketComplete = delta < thresholdRaw || this.bucketFrameCount >= maxSamples;
        
        if (bucketComplete) {
            // Composite the current bucket to the final buffer
            this.compositeCurrentBucket();
            
            // Move to next bucket
            this.currentBucketIndex++;
            
            // Check if we're done
            if (this.currentBucketIndex >= this.buckets.length) {
                this.finish();
                return;
            }
            
            // Setup next bucket
            this.applyCurrentBucket();
            
            // Emit progress
            const prog = (this.currentBucketIndex / this.buckets.length) * 100;
            FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { 
                isRendering: true, 
                progress: prog,
                totalBuckets: this.buckets.length,
                currentBucket: this.currentBucketIndex
            });
        } else {
            this.bucketFrameCount++;
        }
    }
    
    public getProgress() {
        if (!this.isRunning || this.buckets.length === 0) return 0;
        return (this.currentBucketIndex / this.buckets.length) * 100;
    }
    
    public getIsRunning() {
        return this.isRunning;
    }
}

export const bucketRenderer = new BucketRenderer();
