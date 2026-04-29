/**
 * GmtBucketHost — implements the generic `BucketRenderHost` for GMT's
 * path-traced FractalEngine.
 *
 * Owned state:
 *   - viewport size + camera aspect + uPixelSizeBase, restored on endRender
 *   - BloomPass reference (set externally by the worker)
 *   - display scene/camera refs for Refine View blit
 *   - per-bucket convergence-poll state (async readback)
 *
 * The companion file [BucketRenderer.ts] keeps the original public API by
 * delegating to a `BucketRunner` driven by this host.
 */

import * as THREE from 'three';
import { Uniforms } from './UniformNames';
import type { RenderPipeline } from './RenderPipeline';
import type { MaterialController } from './MaterialController';
import type { BloomPass } from './BloomPass';
import type {
    BucketRenderHost,
    BucketImageTile,
    BucketUvRect,
    BucketSize2D,
    BucketRenderConfig,
} from '../../engine/export/BucketRenderTypes';

export interface BucketEngineRef {
    renderer: THREE.WebGLRenderer | null;
    pipeline: RenderPipeline;
    mainUniforms: { [key: string]: THREE.IUniform };
    mainCamera: THREE.Camera;
    materials: MaterialController;
    resetAccumulation(): void;
    pipelineRender(renderer: THREE.WebGLRenderer): void;
}

export class GmtBucketHost implements BucketRenderHost {
    private engine: BucketEngineRef | null = null;
    private bloomPass: BloomPass | null = null;
    private displayScene: THREE.Scene | null = null;
    private displayCamera: THREE.Camera | null = null;

    // Saved state, restored on endRender
    private originalSize = new THREE.Vector2();
    private originalAspect: number = 1;
    private savedPixelSizeBase_: number = 0;

    // Current image-tile and GPU-bucket state — needed for async convergence polling
    private currentTileSize = new THREE.Vector2();
    private currentBucketUv: BucketUvRect = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    private convergenceRequested: boolean = false;
    private cachedConvergenceResult: number | null = null;

    public init(engineRef: BucketEngineRef): void {
        this.engine = engineRef;
    }

    public setBloomPass(bp: BloomPass): void { this.bloomPass = bp; }
    public setDisplayRefs(scene: THREE.Scene, camera: THREE.Camera): void {
        this.displayScene = scene;
        this.displayCamera = camera;
    }

    /**
     * SSAA: FractalEngine.compute() reads this each frame during bucket render
     * to override `uPixelSizeBase` so primary-ray density matches the viewport's
     * (not the larger render target's). Exposed for the engine to read.
     */
    public getSavedPixelSizeBase(): number { return this.savedPixelSizeBase_; }

    // ─── BucketRenderHost ────────────────────────────────────────────

    public getRenderer(): THREE.WebGLRenderer | null {
        return this.engine?.renderer ?? null;
    }

    public beginRender(outputW: number, outputH: number): void {
        if (!this.engine) return;
        const gl = this.engine.renderer;
        if (!gl) return;

        gl.getSize(this.originalSize);
        const cam = this.engine.mainCamera as THREE.PerspectiveCamera | undefined;
        this.originalAspect = cam?.aspect ?? (this.originalSize.x / Math.max(1, this.originalSize.y));

        this.savedPixelSizeBase_ = this.engine.mainUniforms[Uniforms.PixelSizeBase]?.value ?? 0;

        // Override camera to full-output aspect — primary-ray basis vectors derive
        // from cam.aspect via UniformManager, and we need full-image aspect regardless
        // of viewport aspect. UniformManager.syncFrame skips cam.aspect sync while
        // `state.isBucketRendering` is true.
        if (cam) {
            cam.aspect = outputW / outputH;
            cam.updateProjectionMatrix();
        }

        this.engine.pipeline.setBucketRendering(true);

        // Seed full-output resolution (constant across all image tiles).
        const fullRes = this.engine.mainUniforms[Uniforms.FullOutputResolution]?.value as THREE.Vector2 | undefined;
        fullRes?.set(outputW, outputH);
    }

    public setRenderSize(width: number, height: number): void {
        if (!this.engine) return;
        this.engine.pipeline.resize(width, height);
        (this.engine.mainUniforms.uResolution.value as THREE.Vector2).set(width, height);
        this.currentTileSize.set(width, height);
    }

    public beginImageTile(tile: BucketImageTile, fullOutput: BucketSize2D): void {
        if (!this.engine) return;
        const u = this.engine.mainUniforms;
        const originUV = u[Uniforms.ImageTileOrigin]?.value as THREE.Vector2 | undefined;
        const sizeUV = u[Uniforms.ImageTileSize]?.value as THREE.Vector2 | undefined;
        const pixelOrigin = u[Uniforms.TilePixelOrigin]?.value as THREE.Vector2 | undefined;
        originUV?.set(tile.pixelX / fullOutput.w, tile.pixelY / fullOutput.h);
        sizeUV?.set(tile.pixelW / fullOutput.w, tile.pixelH / fullOutput.h);
        pixelOrigin?.set(tile.pixelX, tile.pixelY);
    }

    public beginGpuBucket(uvRect: BucketUvRect, _pixelRect: { pixelX: number; pixelY: number; pixelW: number; pixelH: number }): void {
        if (!this.engine) return;
        const min = new THREE.Vector2(uvRect.minX, uvRect.minY);
        const max = new THREE.Vector2(uvRect.maxX, uvRect.maxY);
        this.engine.materials.setUniform(Uniforms.RegionMin, min);
        this.engine.materials.setUniform(Uniforms.RegionMax, max);
        this.currentBucketUv = uvRect;
        this.convergenceRequested = false;
        this.cachedConvergenceResult = null;
    }

    public resetAccumulation(): void {
        // Per-bucket reset uses pipeline (preserves global engine accumulation
        // identity). Engine-level resetAccumulation is reserved for cleanup.
        this.engine?.pipeline.resetAccumulation();
    }

    public isCurrentBucketConverged(_frameCount: number, config: BucketRenderConfig): boolean {
        if (!this.engine) return false;
        const gl = this.engine.renderer;
        if (!gl) return false;
        if (!config.accumulation) return false;

        const min = new THREE.Vector2(this.currentBucketUv.minX, this.currentBucketUv.minY);
        const max = new THREE.Vector2(this.currentBucketUv.maxX, this.currentBucketUv.maxY);
        const thresholdRaw = config.convergenceThreshold / 100.0;

        // Poll a pending request first.
        if (this.convergenceRequested) {
            const result = this.engine.pipeline.pollConvergenceResult(gl);
            if (result !== null) {
                this.convergenceRequested = false;
                this.cachedConvergenceResult = result;
                if (result < thresholdRaw) return true;
            }
        }

        // Start a new measurement — result will be available on the next tick.
        if (!this.convergenceRequested) {
            this.engine.pipeline.startAsyncConvergence(gl, min, max);
            this.convergenceRequested = true;
        }

        return false;
    }

    public getOutputTexture(): THREE.Texture | null {
        return this.engine?.pipeline.getOutputTexture() ?? null;
    }

    public getReadbackMaterial(
        composite: THREE.Texture,
        tileSize: BucketSize2D,
        fullOutput: BucketSize2D,
    ): THREE.ShaderMaterial | null {
        if (!this.engine) return null;
        const gl = this.engine.renderer;
        if (!gl) return null;

        const exportMat = this.engine.materials.exportMaterial;
        const bloomIntensity = this.engine.mainUniforms.uBloomIntensity?.value ?? 0;

        if (bloomIntensity > 0.001 && this.bloomPass) {
            // Bloom runs at viewport resolution when output is upscaled (visual
            // consistency with on-screen preview); otherwise at tile composite
            // resolution.
            const outputUpsampled = fullOutput.w > this.originalSize.x || fullOutput.h > this.originalSize.y;
            const bloomW = outputUpsampled ? this.originalSize.x : tileSize.w;
            const bloomH = outputUpsampled ? this.originalSize.y : tileSize.h;
            this.bloomPass.resize(bloomW, bloomH);
            const threshold = this.engine.mainUniforms.uBloomThreshold?.value ?? 0.5;
            const radius = this.engine.mainUniforms.uBloomRadius?.value ?? 1.5;
            this.bloomPass.render(composite, gl, threshold, radius);
            exportMat.uniforms.uBloomTexture.value = this.bloomPass.getOutput();
        } else {
            exportMat.uniforms.uBloomTexture.value = null;
        }

        exportMat.uniforms.map.value = composite;
        (exportMat.uniforms.uResolution.value as THREE.Vector2).set(tileSize.w, tileSize.h);
        exportMat.uniforms.uEncodeOutput.value = 1.0;
        return exportMat;
    }

    public onTileBlitToScreen(composite: THREE.Texture): void {
        // Refine View: blit the post-processed composite to the canvas using
        // displayMaterial. The bucket render panel auto-switches the viewport
        // to Fixed mode at output aspect while open, so no letterboxing is needed.
        if (!this.engine || !this.displayScene || !this.displayCamera) return;
        const gl = this.engine.renderer;
        if (!gl) return;

        const displayMat = this.engine.materials.displayMaterial;
        const bloomIntensity = this.engine.mainUniforms.uBloomIntensity?.value ?? 0;
        if (bloomIntensity > 0.001 && this.bloomPass) {
            displayMat.uniforms.uBloomTexture.value = this.bloomPass.getOutput();
        } else {
            displayMat.uniforms.uBloomTexture.value = null;
        }
        displayMat.uniforms.map.value = composite;

        gl.setRenderTarget(null);
        gl.clear();
        gl.render(this.displayScene, this.displayCamera);
        gl.getContext().flush();
    }

    public endRender(): void {
        if (!this.engine) return;

        this.engine.pipeline.setBucketRendering(false);

        // Reset region uniforms to full screen.
        this.engine.materials.setUniform(Uniforms.RegionMin, new THREE.Vector2(0, 0));
        this.engine.materials.setUniform(Uniforms.RegionMax, new THREE.Vector2(1, 1));

        // Reset image-tile uniforms to no-op defaults. UniformManager.syncFrame
        // resumes copying uResolution → uFullOutputResolution once tileSize == (1,1).
        const u = this.engine.mainUniforms;
        (u[Uniforms.ImageTileOrigin]?.value as THREE.Vector2 | undefined)?.set(0, 0);
        (u[Uniforms.ImageTileSize]?.value as THREE.Vector2 | undefined)?.set(1, 1);
        (u[Uniforms.TilePixelOrigin]?.value as THREE.Vector2 | undefined)?.set(0, 0);

        // Restore viewport pipeline size and resolution uniforms.
        this.engine.pipeline.resize(this.originalSize.x, this.originalSize.y);
        (u.uResolution.value as THREE.Vector2).set(this.originalSize.x, this.originalSize.y);
        (u[Uniforms.FullOutputResolution]?.value as THREE.Vector2 | undefined)
            ?.set(this.originalSize.x, this.originalSize.y);

        // Restore camera aspect to viewport aspect.
        const cam = this.engine.mainCamera as THREE.PerspectiveCamera;
        if (cam && Math.abs(cam.aspect - this.originalAspect) > 0.0001) {
            cam.aspect = this.originalAspect;
            cam.updateProjectionMatrix();
        }

        // Restore bloom pass to viewport dimensions.
        if (this.bloomPass) {
            this.bloomPass.resize(this.originalSize.x, this.originalSize.y);
        }

        this.savedPixelSizeBase_ = 0;
        this.engine.resetAccumulation();
    }
}
