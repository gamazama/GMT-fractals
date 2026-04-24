
import * as THREE from 'three';
import { Uniforms } from './UniformNames';
import { FractalEvents, FRACTAL_EVENTS } from './FractalEvents';
import { injectMetadata } from '../../utils/pngMetadata';
import { getExportFileName } from '../../utils/fileUtils';
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
    mainCamera: THREE.Camera;
    materials: MaterialController;
    resetAccumulation(): void;
    pipelineRender(renderer: THREE.WebGLRenderer): void;
}

export interface BucketRenderConfig {
    bucketSize: number;              // Internal GPU tile size (VRAM safety knob)
    outputWidth: number;             // Full output image width in pixels
    outputHeight: number;            // Full output image height in pixels
    tileCols: number;                // Image-tile grid columns (1 = single image)
    tileRows: number;                // Image-tile grid rows (1 = single image)
    convergenceThreshold: number;
    accumulation: boolean;
    samplesPerBucket?: number;
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

    // Inner (bucket) loop state — GPU tiles inside the current image tile
    private buckets: { minX: number, minY: number, maxX: number, maxY: number, pixelX: number, pixelY: number, pixelW: number, pixelH: number }[] = [];
    private currentBucketIndex: number = 0;
    private bucketFrameCount: number = 0;
    private readonly DEFAULT_MAX_FRAMES = 1024;
    private convergenceRequested: boolean = false;

    // Outer (image-tile) loop state — each image tile is saved as a separate PNG
    private imageTiles: { col: number, row: number, pixelX: number, pixelY: number, pixelW: number, pixelH: number }[] = [];
    private currentImageTileIndex: number = 0;
    private fullOutputSize = new THREE.Vector2();      // Full composed image pixel size
    private originalSize = new THREE.Vector2();        // Viewport size (restored on cleanup)
    private originalAspect: number = 1;                // cam.aspect before override
    private targetResolution = new THREE.Vector2();    // Current image-tile pixel size (what the pipeline renders at)

    // Composite buffer - stores the final accumulated image for the CURRENT image tile
    private compositeTarget: THREE.WebGLRenderTarget | null = null;
    private compositeMaterial: THREE.ShaderMaterial | null = null;
    private compositeScene: THREE.Scene | null = null;
    private compositeCamera: THREE.OrthographicCamera | null = null;
    private _readbackPass: FullscreenPass | null = null;

    // Cached config
    private config: BucketRenderConfig = {
        bucketSize: 512,
        outputWidth: 1920,
        outputHeight: 1080,
        tileCols: 1,
        tileRows: 1,
        convergenceThreshold: 0.25,
        accumulation: true,
        samplesPerBucket: 64
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
     * Start a bucket render session. Builds the image-tile grid from `config.tileCols × tileRows`
     * and kicks off the inner bucket loop. Refine View uses a 1×1 grid; Export Image uses the
     * user's chosen grid. Preview Region is a separate worker-side uniform-remap mechanism and
     * does NOT go through this path — see `PREVIEW_REGION_SET` / `PREVIEW_REGION_CLEAR` in
     * `renderWorker.ts`.
     *
     * @param exportImage Whether to save each tile to disk as a PNG
     * @param config Bucket render configuration
     * @param exportData Optional preset data to embed in the exported image
     */
    public start(
        exportImage: boolean,
        config: BucketRenderConfig,
        exportData?: { preset: Preset, name: string, version: number }
    ) {
        const gl = this.engine.renderer;
        if (!gl || this.isRunning) return;

        // Release any leftover held frame from a previous Refine session before
        // claiming the composite buffer for this new render.
        if (this._holdingFinalFrame) this.releaseHeldFinalFrame();

        this.isExporting = exportImage;
        this.config = { ...config };

        if (exportData) {
            this.exportPreset = exportData.preset;
            this.projectName = exportData.name;
            this.projectVersion = exportData.version;
        }

        // Store viewport size and aspect so we can restore them on cleanup.
        gl.getSize(this.originalSize);
        const cam = this.engine.mainCamera as THREE.PerspectiveCamera | undefined;
        this.originalAspect = cam?.aspect ?? (this.originalSize.x / Math.max(1, this.originalSize.y));

        // SSAA: save viewport pixelSizeBase — FractalEngine.compute() overrides uPixelSizeBase
        // each frame during bucket render to preserve viewport-relative precision.
        this.savedPixelSizeBase = this.engine.mainUniforms[Uniforms.PixelSizeBase]?.value ?? 0;

        const outW = Math.max(1, Math.floor(config.outputWidth));
        const outH = Math.max(1, Math.floor(config.outputHeight));
        this.fullOutputSize.set(outW, outH);

        // Override camera aspect to the full OUTPUT aspect. Primary-ray basis vectors
        // derive from cam.aspect via UniformManager; we need full-image aspect regardless
        // of viewport aspect so the composed image frames the scene as the user sees it.
        // UniformManager.syncFrame skips cam.aspect sync while bucket render is active.
        if (cam) {
            cam.aspect = outW / outH;
            cam.updateProjectionMatrix();
        }

        // Build image-tile grid. Last col/row absorbs pixel remainder so the full output
        // is covered exactly with no gaps.
        this.imageTiles = [];
        const cols = Math.max(1, Math.floor(config.tileCols));
        const rows = Math.max(1, Math.floor(config.tileRows));
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const px0 = Math.floor((col * outW) / cols);
                const py0 = Math.floor((row * outH) / rows);
                const px1 = (col === cols - 1) ? outW : Math.floor(((col + 1) * outW) / cols);
                const py1 = (row === rows - 1) ? outH : Math.floor(((row + 1) * outH) / rows);
                this.imageTiles.push({
                    col, row,
                    pixelX: px0,
                    pixelY: py0,
                    pixelW: px1 - px0,
                    pixelH: py1 - py0,
                });
            }
        }

        this.currentImageTileIndex = 0;
        this.isRunning = true;
        this.engine.pipeline.setBucketRendering(true);

        // Seed full-output resolution. Stays constant across all image tiles;
        // used by blue-noise lookups so patterns are continuous across tiles.
        this.engine.mainUniforms[Uniforms.FullOutputResolution].value.set(outW, outH);

        this.startImageTile();
    }

    /**
     * Begin rendering the image tile at currentImageTileIndex. Configures the pipeline,
     * uniforms, composite buffer, and bucket list for this tile and kicks off its inner
     * bucket loop. Called by start() and after each tile finishes.
     */
    private startImageTile() {
        const imgTile = this.imageTiles[this.currentImageTileIndex];
        const tileW = imgTile.pixelW;
        const tileH = imgTile.pixelH;
        this.targetResolution.set(tileW, tileH);

        // Resize pipeline to this tile's pixel size and point uResolution at it.
        this.engine.pipeline.resize(tileW, tileH);
        this.engine.mainUniforms.uResolution.value.set(tileW, tileH);

        // Image-tile uniforms: UV remap so the fullscreen quad draws this tile's
        // sub-rect of the full image, plus pixel origin for seamless blue-noise.
        const outW = this.fullOutputSize.x;
        const outH = this.fullOutputSize.y;
        const originUV = this.engine.mainUniforms[Uniforms.ImageTileOrigin].value as THREE.Vector2;
        const sizeUV = this.engine.mainUniforms[Uniforms.ImageTileSize].value as THREE.Vector2;
        const pixelOrigin = this.engine.mainUniforms[Uniforms.TilePixelOrigin].value as THREE.Vector2;
        originUV.set(imgTile.pixelX / outW, imgTile.pixelY / outH);
        sizeUV.set(tileW / outW, tileH / outH);
        pixelOrigin.set(imgTile.pixelX, imgTile.pixelY);

        // Composite buffer is per-tile (sized to the tile, not full output).
        this.initCompositeBuffer(tileW, tileH);
        this.clearCompositeBuffer();

        // Build inner bucket list for this tile: GPU tiles in pixel-grid order,
        // converted to tile-local UV for the region mask, then sorted center-first.
        this.buckets = [];
        const size = this.config.bucketSize;
        const cols = Math.ceil(tileW / size);
        const rows = Math.ceil(tileH / size);
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const px0 = x * size;
                const py0 = y * size;
                const px1 = Math.min(tileW, (x + 1) * size);
                const py1 = Math.min(tileH, (y + 1) * size);
                this.buckets.push({
                    minX: px0 / tileW,
                    minY: py0 / tileH,
                    maxX: px1 / tileW,
                    maxY: py1 / tileH,
                    pixelX: px0,
                    pixelY: py0,
                    pixelW: px1 - px0,
                    pixelH: py1 - py0,
                });
            }
        }
        this.buckets.sort((a, b) => {
            const aCx = (a.minX + a.maxX) * 0.5 - 0.5;
            const aCy = (a.minY + a.maxY) * 0.5 - 0.5;
            const bCx = (b.minX + b.maxX) * 0.5 - 0.5;
            const bCy = (b.minY + b.maxY) * 0.5 - 0.5;
            return (aCx * aCx + aCy * aCy) - (bCx * bCx + bCy * bCy);
        });

        this.currentBucketIndex = 0;
        this.bucketFrameCount = 0;
        this.applyCurrentBucket();

        this.emitProgress();
    }

    /** Progress across the full multi-tile render, 0..100. */
    private emitProgress() {
        const totalTiles = this.imageTiles.length;
        const bucketsPerTile = this.buckets.length;
        const outerDone = this.currentImageTileIndex;
        const innerDone = this.currentBucketIndex;
        const globalDone = outerDone * bucketsPerTile + innerDone;
        const globalTotal = totalTiles * bucketsPerTile;
        const pct = globalTotal > 0 ? (globalDone / globalTotal) * 100 : 0;
        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, {
            isRendering: true,
            progress: pct,
            totalBuckets: globalTotal,
            currentBucket: globalDone
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
        // An active render cleans up as usual. If we're only holding a final frame (not
        // running), release that so the next viewport render can draw fresh.
        if (this.isRunning) {
            this.cleanup();
        } else if (this._holdingFinalFrame) {
            this.releaseHeldFinalFrame();
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

        // Reset image-tile uniforms to no-op defaults. UniformManager.syncFrame will
        // resume copying uResolution → uFullOutputResolution once tileSize returns to (1,1).
        (this.engine.mainUniforms[Uniforms.ImageTileOrigin].value as THREE.Vector2).set(0, 0);
        (this.engine.mainUniforms[Uniforms.ImageTileSize].value as THREE.Vector2).set(1, 1);
        (this.engine.mainUniforms[Uniforms.TilePixelOrigin].value as THREE.Vector2).set(0, 0);

        // Restore original resolution
        this.engine.pipeline.resize(this.originalSize.x, this.originalSize.y);
        this.engine.mainUniforms.uResolution.value.set(this.originalSize.x, this.originalSize.y);
        this.engine.mainUniforms[Uniforms.FullOutputResolution].value.set(this.originalSize.x, this.originalSize.y);

        // Restore camera aspect to viewport aspect.
        const cam = this.engine.mainCamera as THREE.PerspectiveCamera;
        if (cam && Math.abs(cam.aspect - this.originalAspect) > 0.0001) {
            cam.aspect = this.originalAspect;
            cam.updateProjectionMatrix();
        }

        // Restore bloom pass to viewport dimensions
        if (this.bloomPass) {
            this.bloomPass.resize(this.originalSize.x, this.originalSize.y);
        }

        // Clear SSAA override — FractalEngine.compute() will stop overriding uPixelSizeBase
        this.savedPixelSizeBase = 0;

        this.engine.resetAccumulation();

        // Dispose composite resources — UNLESS holding the final frame for on-screen display,
        // in which case the composite stays alive until releaseHeldFinalFrame() is called.
        if (!this._holdingFinalFrame) {
            this.disposeCompositeBuffer();
        }

        // Notify UI via Event
        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: false, progress: 0 });
    }

    /**
     * Apply the current bucket region to the shader
     * Does NOT clear render targets - this preserves history for non-bucket regions
     */
    private applyCurrentBucket() {
        if (this.currentBucketIndex >= this.buckets.length) {
            this.finishImageTile();
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
     * Run full post-processing pipeline on the current image tile's composite HDR buffer.
     * Spatial effects (bloom, CA) operate on a single tile at a time — when rendering with
     * tileCols/tileRows > 1, visible seams may appear at tile boundaries (documented in
     * docs/43_Bucket_Render_Overhaul.md; opt-in v2 renders bloom from the viewport to
     * eliminate them).
     */
    private runPostProcessing() {
        const gl = this.engine.renderer;
        if (!this.compositeTarget || !gl) return;

        const w = this.targetResolution.x;
        const h = this.targetResolution.y;
        const outW = this.fullOutputSize.x;
        const outH = this.fullOutputSize.y;

        const bloomIntensity = this.engine.mainUniforms.uBloomIntensity?.value ?? 0;
        const exportMat = this.engine.materials.exportMaterial;

        if (bloomIntensity > 0.001 && this.bloomPass) {
            // When the output is larger than the viewport, bloom runs at viewport
            // resolution to stay visually consistent with the on-screen preview.
            // Otherwise it runs at the (tile) composite resolution.
            const outputUpsampled = outW > this.originalSize.x || outH > this.originalSize.y;
            const bloomW = outputUpsampled ? this.originalSize.x : w;
            const bloomH = outputUpsampled ? this.originalSize.y : h;
            this.bloomPass.resize(bloomW, bloomH);
            const threshold = this.engine.mainUniforms.uBloomThreshold?.value ?? 0.5;
            const radius = this.engine.mainUniforms.uBloomRadius?.value ?? 1.5;
            this.bloomPass.render(this.compositeTarget.texture, gl, threshold, radius);
            exportMat.uniforms.uBloomTexture.value = this.bloomPass.getOutput();
        } else {
            exportMat.uniforms.uBloomTexture.value = null;
        }

        // Set composite as input to post-process shader. Other uniforms (tone mapping,
        // color grading, CA, etc.) are shared-reference via mainUniforms.
        exportMat.uniforms.map.value = this.compositeTarget.texture;
        exportMat.uniforms.uResolution.value.set(w, h);
        exportMat.uniforms.uEncodeOutput.value = 1.0;
    }

    /**
     * Blit the post-processed composite to the screen canvas (Refine View / Preview Region).
     * Uses the displayMaterial so on-screen output matches what export would produce.
     *
     * The bucket render panel auto-switches the viewport to Fixed mode at output aspect while
     * open, so the canvas always matches the output's aspect and no letterboxing is needed.
     */
    private blitToScreen() {
        const gl = this.engine.renderer;
        if (!this.compositeTarget || !gl || !this.displayScene || !this.displayCamera) return;

        const displayMat = this.engine.materials.displayMaterial;

        const bloomIntensity = this.engine.mainUniforms.uBloomIntensity?.value ?? 0;
        if (bloomIntensity > 0.001 && this.bloomPass) {
            displayMat.uniforms.uBloomTexture.value = this.bloomPass.getOutput();
        } else {
            displayMat.uniforms.uBloomTexture.value = null;
        }
        displayMat.uniforms.map.value = this.compositeTarget.texture;

        gl.setRenderTarget(null);
        gl.clear();
        gl.render(this.displayScene, this.displayCamera);
        gl.getContext().flush();
    }

    // ─── Held Final Frame ─────────────────────────────────────────────
    // After a non-export bucket render (Refine View) finishes, we keep the composite alive
    // and re-blit it each frame until the user interacts. Preview Region is handled entirely
    // by worker-side uniform overrides (see renderWorker PREVIEW_REGION_SET/CLEAR) and
    // doesn't need this machinery.
    private _holdingFinalFrame: boolean = false;

    public isHoldingFinalFrame(): boolean { return this._holdingFinalFrame; }

    /** Called by the worker tick when holding — re-runs the letterboxed blit. */
    public blitHeldFinalFrame() {
        if (!this._holdingFinalFrame) return;
        this.blitToScreen();
    }

    /** Release the held frame and dispose its composite. Called on user interaction. */
    public releaseHeldFinalFrame() {
        if (!this._holdingFinalFrame) return;
        this._holdingFinalFrame = false;
        this.disposeCompositeBuffer();
    }

    /**
     * Finish the current image tile: run bloom/CA/tone-mapping on its composite, then
     * either save as PNG (export mode) or blit to screen (refine mode), then advance.
     */
    private finishImageTile() {
        this.runPostProcessing();

        if (this.isExporting) {
            this.saveImage();
        } else {
            // Refine View: only meaningful for single-tile renders. Blit current composite.
            this.blitToScreen();
        }

        this.currentImageTileIndex++;
        if (this.currentImageTileIndex >= this.imageTiles.length) {
            this.finalizeAll();
            return;
        }

        // Reset per-tile accumulation state and begin next tile.
        this.engine.resetAccumulation();
        this.startImageTile();
    }

    /** Final cleanup after all image tiles have been saved/blitted. */
    private finalizeAll() {
        const wasExporting = this.isExporting;
        if (!wasExporting) {
            // Refine / Preview mode: the composite is the final on-screen frame. Keep it
            // alive and let the worker tick keep re-blitting it every frame via
            // blitHeldFinalFrame() until user interaction releases it.
            this._holdingFinalFrame = true;
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

    /**
     * Build the per-tile filename. For 1x1 renders uses the full-output dimensions
     * and no suffix. For multi-tile renders appends zero-padded `_rXXcYY` (zero-padding
     * width matches the maximum row/col index, so sort order matches scan order).
     */
    private buildTileFilename(w: number, h: number): string {
        const outW = this.fullOutputSize.x;
        const outH = this.fullOutputSize.y;
        const rows = this.config.tileRows;
        const cols = this.config.tileCols;
        const imgTile = this.imageTiles[this.currentImageTileIndex];

        // Base tag uses full-output dimensions so the user can identify the intended size
        // regardless of how the output was sliced.
        const dimTag = `${outW}x${outH}`;

        if (rows * cols <= 1) {
            return getExportFileName(this.projectName, this.projectVersion, 'png', dimTag);
        }

        const pad = (n: number, width: number) => String(n).padStart(width, '0');
        const rPad = Math.max(2, String(rows - 1).length);
        const cPad = Math.max(2, String(cols - 1).length);
        const suffix = `_r${pad(imgTile.row, rPad)}c${pad(imgTile.col, cPad)}`;
        return getExportFileName(this.projectName, this.projectVersion, 'png', `${dimTag}${suffix}`);
    }

    private saveImage() {
        // In worker context (no DOM), emit pixel data for main thread to handle
        if (typeof document === 'undefined') {
            const result = this.readCompositePixels();
            if (!result) return;
            const presetStr = this.exportPreset ? saveGMFScene(this.exportPreset as Preset) : "{}";
            const filename = this.buildTileFilename(result.width, result.height);
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
            const filename = this.buildTileFilename(w, h);

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
            // Composite the current bucket into the current image tile's composite buffer
            this.compositeCurrentBucket();

            // Move to next bucket. applyCurrentBucket() will call finishImageTile()
            // automatically when the last bucket in this tile is done.
            this.currentBucketIndex++;
            this.applyCurrentBucket();

            // Emit global progress (covers all image tiles × all buckets per tile)
            if (this.isRunning) this.emitProgress();
        } else {
            this.bucketFrameCount++;
        }
    }

    public getProgress() {
        if (!this.isRunning || this.imageTiles.length === 0) return 0;
        const total = this.imageTiles.length * Math.max(1, this.buckets.length);
        const done = this.currentImageTileIndex * this.buckets.length + this.currentBucketIndex;
        return (done / total) * 100;
    }

    public getIsRunning() {
        return this.isRunning;
    }

    /**
     * Current image tile's pixel dimensions. Used by the worker's display tick to
     * letterbox the on-screen blit when the tile aspect doesn't match the canvas
     * aspect (common for non-square tile grids like 2×1 or 3×2). Returns (0,0) when
     * no bucket render is in flight.
     */
    public getCurrentTilePixelSize(): [number, number] {
        if (!this.isRunning) return [0, 0];
        return [this.targetResolution.x, this.targetResolution.y];
    }
}

export const bucketRenderer = new BucketRenderer();
