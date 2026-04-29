/**
 * BucketRenderController — UI-side adapter for the bucket-render panel.
 *
 * The generic `BucketRenderPanel` calls these methods to drive its host
 * app's renderer. Each app provides an implementation:
 *   - app-gmt → GmtBucketController wraps WorkerProxy + reads GMT preset state
 *   - fluid-toy → FluidBucketController drives BucketRunner directly + skips
 *     the optional preview-region methods
 *
 * Distinct from `BucketRenderHost` (the runner-side adapter) — the host
 * plugs into BucketRunner; the controller plugs into the panel UI. An app
 * normally has both: same renderer, two adapters, different concerns.
 */

import type { BucketRenderConfig } from '../../export/BucketRenderTypes';

export interface BucketPreviewRegion {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export interface BucketRenderController {
    /**
     * Begin a bucket render. The implementation collects any host-specific
     * export metadata (preset, scene state, project name/version) — the
     * panel doesn't need to know about it.
     */
    startBucketRender(exportImage: boolean, config: BucketRenderConfig): void;

    /** Stop an in-flight bucket render. Safe to call when not running. */
    stopBucketRender(): void;

    /**
     * Live preview-region mode: zooms into a sub-rect at export pixel
     * density, capped at `sampleCap` samples. Optional — apps that don't
     * support live preview omit this and `clearPreviewRegion`.
     */
    setPreviewRegion?(
        region: BucketPreviewRegion,
        outputWidth: number,
        outputHeight: number,
        sampleCap: number,
    ): void;

    /** Exit preview-region mode and resume normal viewport rendering. */
    clearPreviewRegion?(): void;

    /** Live sample count of the current accumulator (read-only). */
    readonly accumulationCount: number;
}
