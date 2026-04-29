/**
 * Generic bucket-render types and host contract.
 *
 * The runner ([BucketRunner.ts]) drives a two-level loop:
 *   - outer loop = image tiles (each saved as its own PNG)
 *   - inner loop = GPU buckets (sub-rects of an image tile, accumulated
 *     into a per-tile Float32 HDR composite for VRAM safety)
 *
 * The runner is host-agnostic. Each app (app-gmt, fluid-toy) implements
 * `BucketRenderHost` to plug its renderer's primitives in. See
 * [docs/gmt/43_Bucket_Render_Overhaul.md] for the design.
 */

import * as THREE from 'three';

export interface BucketRenderConfig {
    bucketSize: number;              // GPU sub-tile size in pixels (VRAM-safety knob)
    outputWidth: number;             // Full output image width  (composed across image tiles)
    outputHeight: number;            // Full output image height (composed across image tiles)
    tileCols: number;                // Image-tile grid columns (1 = single PNG)
    tileRows: number;                // Image-tile grid rows    (1 = single PNG)
    convergenceThreshold: number;    // Per-bucket convergence threshold (host-interpreted)
    accumulation: boolean;           // Whether the host's pipeline accumulates samples
    samplesPerBucket?: number;       // If set, hard cap on samples per bucket
}

export interface BucketImageTile {
    col: number;
    row: number;
    pixelX: number;
    pixelY: number;
    pixelW: number;
    pixelH: number;
}

export interface BucketUvRect {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export interface BucketPixelRect {
    pixelX: number;
    pixelY: number;
    pixelW: number;
    pixelH: number;
}

export interface BucketSize2D {
    w: number;
    h: number;
}

/**
 * Host contract — implemented per-app.
 *
 * Lifecycle (one render session):
 *   beginRender(outW, outH)
 *   for each image tile:
 *     beginImageTile(tile, fullOutput)
 *     for each GPU bucket:
 *       beginGpuBucket(uvRect, pixelRect)
 *       resetAccumulation()
 *       (host's normal render loop runs frames against the new region)
 *       runner ticks per frame; when isCurrentBucketConverged() returns true,
 *       runner scissor-copies getOutputTexture() into composite
 *     readbackMaterial = getReadbackMaterial(composite, tileSize, fullOutput)
 *     (runner renders that material to RGBA8 + readPixels + saves PNG)
 *   endRender()
 */
export interface BucketRenderHost {
    /** WebGL renderer the runner uses for scissor copies and readback. */
    getRenderer(): THREE.WebGLRenderer | null;

    /**
     * Save viewport state, override camera/projection for the output aspect,
     * mark internal "bucket-rendering" mode, etc. Called once at session start.
     */
    beginRender(outputW: number, outputH: number): void;

    /**
     * Resize the host's render targets to render at this image-tile's size.
     * The runner calls this once per image tile (between beginImageTile and
     * the first GPU-bucket render).
     */
    setRenderSize(width: number, height: number): void;

    /**
     * Image-tile entry. Host writes uImageTileOrigin / uImageTileSize /
     * uTilePixelOrigin / uFullOutputResolution and any other per-tile uniforms.
     */
    beginImageTile(tile: BucketImageTile, fullOutput: BucketSize2D): void;

    /**
     * GPU-bucket entry. Host writes uRegionMin / uRegionMax (in tile-local UV).
     * The runner expands uvRect by half a pixel before calling — host should
     * use the values as-is.
     */
    beginGpuBucket(uvRect: BucketUvRect, pixelRect: BucketPixelRect): void;

    /** Reset the host's per-bucket accumulator. */
    resetAccumulation(): void;

    /**
     * Returns true when the current GPU bucket's accumulation is "good enough."
     * GMT polls async convergence; fluid-toy compares sample count to cap.
     * `frameCount` is the number of times `renderOneFrame()` has been called
     * for the current bucket (≥ 1 by the time this is asked).
     */
    isCurrentBucketConverged(frameCount: number, config: BucketRenderConfig): boolean;

    /**
     * Texture the runner scissor-copies into the per-tile composite buffer.
     * Typically the host's accumulator output.
     */
    getOutputTexture(): THREE.Texture | null;

    /**
     * Provide the material the runner uses to render the post-processed
     * composite into a RGBA8 readback target. The host should configure
     * `composite` as `map` plus any post-FX uniforms (bloom, CA, tone map,
     * grade, sRGB encode). Return null to use a passthrough copy.
     *
     * Called once per image tile after all GPU buckets are done.
     */
    getReadbackMaterial(
        composite: THREE.Texture,
        tileSize: BucketSize2D,
        fullOutput: BucketSize2D,
    ): THREE.ShaderMaterial | null;

    /**
     * Hook called after the runner blits the per-tile composite to the screen
     * (Refine View). No-op for headless / export-only contexts.
     */
    onTileBlitToScreen?(composite: THREE.Texture): void;

    /** Restore viewport state. Called once at session end (or stop). */
    endRender(): void;
}
