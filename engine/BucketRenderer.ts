
import * as THREE from 'three';
import { Uniforms } from './UniformNames';
import { FractalEvents, FRACTAL_EVENTS } from './FractalEvents';
import { injectMetadata } from '../utils/pngMetadata';
import { getExportFileName } from '../utils/fileUtils';
import { saveGMFScene } from '../utils/FormulaFormat';
import { Preset } from '../types';
import type { RenderPipeline } from './RenderPipeline';
import type { MaterialController } from './MaterialController';
import { createFullscreenPass, type FullscreenPass } from './utils/FullscreenQuad';
import type { BloomPass } from './BloomPass';
// Note: BucketEngineRef is implemented by FractalEngine - avoids circular import

/** Minimal interface for the engine dependency — avoids circular import */
export interface BucketEngineRef {
    renderer: THREE.WebGLRenderer | null;
    pipeline: RenderPipeline;
    mainUniforms: { [key: string]: THREE.IUniform };
    materials: MaterialController;
    resetAccumulation(): void;
    pipelineRender(renderer: THREE.WebGLRenderer): void;
}

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
 * Post-Processing Architecture (offline renderer pattern):
 * - Each bucket accumulates raw linear HDR data (no tone mapping, no bloom)
 * - Completed buckets are composited into a full-resolution HDR buffer
 * - After ALL buckets complete, the full post-processing chain runs on the complete image:
 *   Bloom (full-image) → CA → Color Grading → Tone Mapping → sRGB Encode
 * - This ensures spatial effects (bloom, CA) operate correctly across the entire image
 *
 * Quality Control:
 * - If samplesPerBucket is set: renders exactly N samples per bucket (predictable)
 * - Otherwise: uses convergence threshold to determine when bucket is done
 */
export class BucketRenderer {
    private engine!: BucketEngineRef;
    private isRunning: boolean = false;
    private isExporting: boolean = false;

    private buckets: { minX: number, minY: number, maxX: number, maxY: number, pixelX: number, pixelY: number, pixelW: number, pixelH: number }[] = [];
    private currentBucketIndex: number = 0;

    private bucketFrameCount: number = 0;
    private readonly DEFAULT_MAX_FRAMES = 1024; // Increased for high-quality renders
    private convergenceRequested: boolean = false; // Async convergence state

    private originalSize = new THREE.Vector2();
    private activeUpscale: number = 1.0;
    private targetResolution = new THREE.Vector2();

    // Composite buffer - stores the final accumulated image
    private compositeTarget: THREE.WebGLRenderTarget | null = null;
    private compositeMaterial: THREE.ShaderMaterial | null = null;
    private compositeScene: THREE.Scene | null = null;
    private compositeCamera: THREE.OrthographicCamera | null = null;
    private _readbackPass: FullscreenPass | null = null;

    // Cached config
    private config: BucketRenderConfig = {
        bucketSize: 128,
        bucketUpscale: 1.0,
        convergenceThreshold: 0.25,
        accumulation: true,
        samplesPerBucket: 64 // Default to 64 samples for predictable quality
    };

    // Preset for metadata injection (Optional, only used if exporting to disk)
    private exportPreset: Preset | null = null;
    private projectName: string = "Fractal";
    private projectVersion: number = 0;

    // BloomPass for full-image bloom on the complete composite
    private bloomPass: BloomPass | null = null;

    // Display scene/camera refs for Refine View blit
    private displayScene: THREE.Scene | null = null;
    private displayCamera: THREE.Camera | null = null;

    // SSAA: saved viewport pixelSizeBase before upscale resize
    public savedPixelSizeBase: number = 0;

    /** Bind to engine instance (called once from FractalEngine constructor) */
    public init(engineRef: BucketEngineRef) {
        this.engine = engineRef;
    }

    /** Set BloomPass reference (called from renderWorker after BloomPass creation) */
    public setBloomPass(bp: BloomPass) {
        this.bloomPass = bp;
    }

    /** Set display scene/camera refs for Refine View blit */
    public setDisplayRefs(scene: THREE.Scene, camera: THREE.Camera) {
        this.displayScene = scene;
        this.displayCamera = camera;
    }

    /**
     * Start a bucket render session
     * @param exportImage Whether to save the final image to disk
     * @param config Bucket render configuration
     * @param exportData Optional preset data to embed in the exported image
     */
    public start(exportImage: boolean, config: BucketRenderConfig, exportData?: { preset: Preset, name: string, version: number }) {
        const gl = this.engine.renderer;
        if (!gl || this.isRunning) return;

        this.isExporting = exportImage;
        this.config = { ...config };
        this.activeUpscale = config.bucketUpscale || 1.0;

        if (exportData) {
            this.exportPreset = exportData.preset;
            this.projectName = exportData.name;
            this.projectVersion = exportData.version;
        }

        // Store current size to restore later
        gl.getSize(this.originalSize);

        // SSAA: Save viewport pixelSizeBase before resolution change.
        // FractalEngine.compute() will override uPixelSizeBase each frame to this value,
        // keeping trace precision/normal epsilon/shadow bias at viewport levels.
        this.savedPixelSizeBase = this.engine.mainUniforms[Uniforms.PixelSizeBase]?.value ?? 0;

        // Calculate Target Resolution
        const targetW = Math.floor(this.originalSize.x * this.activeUpscale);
        const targetH = Math.floor(this.originalSize.y * this.activeUpscale);
        this.targetResolution.set(targetW, targetH);

        // Resize pipeline to target resolution
        this.engine.pipeline.resize(targetW, targetH);
        this.engine.mainUniforms.uResolution.value.set(targetW, targetH);

        // Initialize composite buffer for storing final image
        this.initCompositeBuffer(targetW, targetH);

        // Generate bucket list in center-first spiral order.
        // Renders the most visually important region first, giving faster feedback.
        this.buckets = [];
        const size = config.bucketSize;
        const cols = Math.ceil(targetW / size);
        const rows = Math.ceil(targetH / size);

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // Compute pixel boundaries first, then convert to UV.
                // This ensures adjacent buckets share exact pixel edges with no gaps.
                const px0 = x * size;
                const py0 = y * size;
                const px1 = Math.min(targetW, (x + 1) * size);
                const py1 = Math.min(targetH, (y + 1) * size);
                this.buckets.push({
                    minX: px0 / targetW,
                    minY: py0 / targetH,
                    maxX: px1 / targetW,
                    maxY: py1 / targetH,
                    // Integer pixel bounds for scissor compositing
                    pixelX: px0,
                    pixelY: py0,
                    pixelW: px1 - px0,
                    pixelH: py1 - py0,
                });
            }
        }

        // Sort by distance from center — center buckets render first
        this.buckets.sort((a, b) => {
            const aCx = (a.minX + a.maxX) * 0.5 - 0.5;
            const aCy = (a.minY + a.maxY) * 0.5 - 0.5;
            const bCx = (b.minX + b.maxX) * 0.5 - 0.5;
            const bCy = (b.minY + b.maxY) * 0.5 - 0.5;
            return (aCx * aCx + aCy * aCy) - (bCx * bCx + bCy * bCy);
        });

        this.currentBucketIndex = 0;
        this.bucketFrameCount = 0;
        this.isRunning = true;
        this.engine.pipeline.setBucketRendering(true);

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

        // Simple fullscreen copy material — bucket clipping is done via GL scissor
        // to guarantee exact integer pixel boundaries with no float precision gaps
        this.compositeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: null },
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
                varying vec2 vUv;

                void main() {
                    gl_FragColor = texture2D(map, vUv);
                }
            `,
            depthTest: false,
            depthWrite: false,
            transparent: false
        });

        // Create scene for compositing
        const compPass = createFullscreenPass(this.compositeMaterial);
        this.compositeScene = compPass.scene;
        this.compositeCamera = compPass.camera;
    }

    /**
     * Clear the composite buffer to black
     */
    private clearCompositeBuffer() {
        const gl = this.engine.renderer;
        if (!this.compositeTarget || !gl) return;

        const currentTarget = gl.getRenderTarget();
        gl.setRenderTarget(this.compositeTarget);
        gl.clear();
        gl.setRenderTarget(currentTarget);
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

        this.engine.pipeline.setBucketRendering(false);

        // Reset bucket region to full screen
        const min = new THREE.Vector2(0, 0);
        const max = new THREE.Vector2(1, 1);
        this.engine.materials.setUniform(Uniforms.RegionMin, min);
        this.engine.materials.setUniform(Uniforms.RegionMax, max);

        // Restore original resolution
        this.engine.pipeline.resize(this.originalSize.x, this.originalSize.y);
        this.engine.mainUniforms.uResolution.value.set(this.originalSize.x, this.originalSize.y);

        // Restore bloom pass to viewport dimensions
        if (this.bloomPass && this.activeUpscale > 1.0) {
            this.bloomPass.resize(this.originalSize.x, this.originalSize.y);
        }

        // Clear SSAA override — FractalEngine.compute() will stop overriding uPixelSizeBase
        this.savedPixelSizeBase = 0;

        this.engine.resetAccumulation();

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
        // Expand render region by half a pixel in UV space so boundary pixels
        // are always rendered. The composite step uses integer scissor for
        // exact clipping, so any slight over-render is harmless.
        const halfPixelU = 0.5 / this.targetResolution.x;
        const halfPixelV = 0.5 / this.targetResolution.y;
        const min = new THREE.Vector2(b.minX - halfPixelU, b.minY - halfPixelV);
        const max = new THREE.Vector2(b.maxX + halfPixelU, b.maxY + halfPixelV);

        this.engine.materials.setUniform(Uniforms.RegionMin, min);
        this.engine.materials.setUniform(Uniforms.RegionMax, max);

        // Reset accumulation for the new bucket
        // This is necessary to start fresh accumulation for this bucket
        this.engine.pipeline.resetAccumulation();

        // DO NOT clear targets - the shader handles preserving history for non-bucket regions
        // The accumulation blend will correctly blend new samples in the bucket region

        this.bucketFrameCount = 0;
        this.convergenceRequested = false;
    }

    /**
     * Copy the current bucket from the render output to the composite buffer
     */
    private compositeCurrentBucket() {
        const gl = this.engine.renderer;
        if (!this.compositeTarget || !this.compositeMaterial || !this.compositeScene ||
            !this.compositeCamera || !gl) return;

        const outputTex = this.engine.pipeline.getOutputTexture();
        if (!outputTex) return;

        const b = this.buckets[this.currentBucketIndex];

        // Setup composite material — simple fullscreen copy
        this.compositeMaterial.uniforms.map.value = outputTex;

        const currentTarget = gl.getRenderTarget();
        const currentViewport = new THREE.Vector4();
        gl.getViewport(currentViewport);

        gl.setRenderTarget(this.compositeTarget);
        gl.setViewport(0, 0, this.targetResolution.x, this.targetResolution.y);

        // Use GL scissor to clip to exact integer pixel boundaries.
        // This avoids float precision issues that caused 1px black stripes
        // between adjacent buckets when using shader-based UV discard.
        const prevScissor = gl.getScissorTest();
        gl.setScissorTest(true);
        gl.setScissor(b.pixelX, b.pixelY, b.pixelW, b.pixelH);

        const prevAutoClear = gl.autoClear;
        gl.autoClear = false;
        gl.render(this.compositeScene, this.compositeCamera);
        gl.autoClear = prevAutoClear;

        // Restore scissor state
        gl.setScissorTest(prevScissor);

        gl.setRenderTarget(currentTarget);
        gl.setViewport(currentViewport);
    }

    /**
     * Run full post-processing pipeline on the complete composite HDR buffer.
     * Called once after ALL buckets are done — ensures spatial effects (bloom, CA)
     * operate on the complete image, matching the offline renderer pattern.
     */
    private runPostProcessing() {
        const gl = this.engine.renderer;
        if (!this.compositeTarget || !gl) return;

        const w = this.targetResolution.x;
        const h = this.targetResolution.y;

        // 1. Run bloom on the full composite (spatial effect — must see entire image)
        const bloomIntensity = this.engine.mainUniforms.uBloomIntensity?.value ?? 0;
        const exportMat = this.engine.materials.exportMaterial;

        if (bloomIntensity > 0.001 && this.bloomPass) {
            // Bloom is a screen-space effect — run at viewport resolution so it looks
            // identical regardless of upscale. The UV-based sampling in the post-process
            // shader bilinearly upsamples the bloom texture to target resolution.
            const bloomW = this.activeUpscale > 1.0 ? this.originalSize.x : w;
            const bloomH = this.activeUpscale > 1.0 ? this.originalSize.y : h;
            this.bloomPass.resize(bloomW, bloomH);
            const threshold = this.engine.mainUniforms.uBloomThreshold?.value ?? 0.5;
            const radius = this.engine.mainUniforms.uBloomRadius?.value ?? 1.5;
            this.bloomPass.render(this.compositeTarget.texture, gl, threshold, radius);
            exportMat.uniforms.uBloomTexture.value = this.bloomPass.getOutput();
        } else {
            exportMat.uniforms.uBloomTexture.value = null;
        }

        // 2. Set composite as input to post-process shader.
        //    All other uniforms (tone mapping, color grading, CA, etc.) are already
        //    synced via shared mainUniforms references from createPostProcessMaterial().
        exportMat.uniforms.map.value = this.compositeTarget.texture;
        exportMat.uniforms.uResolution.value.set(w, h);
        exportMat.uniforms.uEncodeOutput.value = 1.0;
    }

    /**
     * Blit the post-processed composite to the screen canvas (Refine View).
     * Uses the displayMaterial so on-screen output matches what export would produce.
     */
    private blitToScreen() {
        const gl = this.engine.renderer;
        if (!this.compositeTarget || !gl || !this.displayScene || !this.displayCamera) return;

        const displayMat = this.engine.materials.displayMaterial;

        // Sync bloom texture to display material
        const bloomIntensity = this.engine.mainUniforms.uBloomIntensity?.value ?? 0;
        if (bloomIntensity > 0.001 && this.bloomPass) {
            displayMat.uniforms.uBloomTexture.value = this.bloomPass.getOutput();
        } else {
            displayMat.uniforms.uBloomTexture.value = null;
        }

        // Set composite HDR as display input
        displayMat.uniforms.map.value = this.compositeTarget.texture;

        // Blit to screen (null render target = canvas)
        gl.setRenderTarget(null);
        gl.clear();
        gl.render(this.displayScene, this.displayCamera);
        gl.getContext().flush();
    }

    private finish() {
        // Run full post-processing on the complete composite
        this.runPostProcessing();

        if (this.isExporting) {
            this.saveImage();
        } else {
            // Refine View: blit the post-processed composite to screen,
            // then hold the pipeline so the canvas retains the frame.
            this.blitToScreen();
            this.engine.pipeline.setHold(true);
        }
        this.cleanup();
    }

    /**
     * Read the post-processed composite buffer into a flipped Uint8ClampedArray.
     * runPostProcessing() must be called first to set up bloom + export material.
     * Shared by both DOM save and worker transfer paths.
     */
    private readCompositePixels(): { pixels: Uint8ClampedArray; width: number; height: number } | null {
        const gl = this.engine.renderer;
        if (!this.compositeTarget || !gl) return null;

        const w = this.targetResolution.x;
        const h = this.targetResolution.y;

        const exportTarget = new THREE.WebGLRenderTarget(w, h, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            stencilBuffer: false,
            depthBuffer: false
        });

        const exportMat = this.engine.materials.exportMaterial;
        // exportMat is already configured by runPostProcessing() — map, bloom, resolution, encode

        const currentTarget = gl.getRenderTarget();
        const currentViewport = new THREE.Vector4();
        gl.getViewport(currentViewport);

        gl.setRenderTarget(exportTarget);
        gl.setViewport(0, 0, w, h);
        gl.clear();

        if (!this._readbackPass) this._readbackPass = createFullscreenPass(exportMat);
        else this._readbackPass.mesh.material = exportMat;
        gl.render(this._readbackPass.scene, this._readbackPass.camera);

        const buffer = new Uint8Array(w * h * 4);
        gl.readRenderTargetPixels(exportTarget, 0, 0, w, h, buffer);

        gl.setRenderTarget(currentTarget);
        gl.setViewport(currentViewport);
        exportTarget.dispose();

        // Flip Y (WebGL reads bottom-up, PNG is top-down)
        const flipped = new Uint8ClampedArray(w * h * 4);
        const stride = w * 4;
        for (let y = 0; y < h; y++) {
            const srcRowStart = y * stride;
            const destRowStart = (h - 1 - y) * stride;
            flipped.set(buffer.subarray(srcRowStart, srcRowStart + stride), destRowStart);
        }
        for (let i = 3; i < flipped.length; i += 4) flipped[i] = 255;

        return { pixels: flipped, width: w, height: h };
    }

    private saveImage() {
        // In worker context (no DOM), emit pixel data for main thread to handle
        if (typeof document === 'undefined') {
            const result = this.readCompositePixels();
            if (!result) return;
            const presetStr = this.exportPreset ? saveGMFScene(this.exportPreset as Preset) : "{}";
            const filename = getExportFileName(this.projectName, this.projectVersion, 'png', `${result.width}x${result.height}`);
            FractalEvents.emit(FRACTAL_EVENTS.BUCKET_IMAGE, {
                pixels: result.pixels,
                width: result.width,
                height: result.height,
                presetJson: presetStr,
                filename
            });
            return;
        }

        // DOM path — main thread only (legacy / non-worker fallback)
        const result = this.readCompositePixels();
        if (!result) return;

        const { pixels: flipped, width: w, height: h } = result;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const imageData = new ImageData(flipped as unknown as Uint8ClampedArray<ArrayBuffer>, w, h);
            ctx.putImageData(imageData, 0, 0);

            const presetStr = this.exportPreset ? saveGMFScene(this.exportPreset as Preset) : "{}";
            const filename = getExportFileName(this.projectName, this.projectVersion, 'png', `${w}x${h}`);

            canvas.toBlob(async (blob) => {
                if (!blob) return;
                try {
                    const taggedBlob = await injectMetadata(blob, "FractalData", presetStr);
                    const url = URL.createObjectURL(taggedBlob);
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                } catch (e) {
                    console.error("Failed to inject metadata", e);
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
        const uRes = this.engine.mainUniforms.uResolution.value;
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

        // Check if bucket is complete using async convergence (no GPU stall)
        let bucketComplete = false;
        const currentBucket = this.buckets[this.currentBucketIndex];
        const min = new THREE.Vector2(currentBucket.minX, currentBucket.minY);
        const max = new THREE.Vector2(currentBucket.maxX, currentBucket.maxY);

        // Convert threshold from percentage to raw value
        const thresholdRaw = this.config.convergenceThreshold / 100.0;

        if (this.config.accumulation) {
            // Try to poll a pending async result first
            if (this.convergenceRequested) {
                const result = this.engine.pipeline.pollConvergenceResult(gl);
                if (result !== null) {
                    this.convergenceRequested = false;
                    bucketComplete = result < thresholdRaw;
                }
                // If result is null, GPU isn't ready yet — continue accumulating
            }

            // If no measurement is pending, start one (result arrives next frame)
            if (!this.convergenceRequested && !bucketComplete) {
                this.engine.pipeline.startAsyncConvergence(gl, min, max);
                this.convergenceRequested = true;
            }
        }

        // Safety limit: bucket is complete if we've hit max samples
        if (this.bucketFrameCount >= maxSamples) {
            bucketComplete = true;
            this.convergenceRequested = false;
        }

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
