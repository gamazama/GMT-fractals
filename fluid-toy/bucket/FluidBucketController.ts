/**
 * FluidBucketController — fluid-toy adapter for the generic bucket-render panel.
 *
 * Two nested loops, GMT-style:
 *   1. Image-tile loop — splits the output into separate PNG files when the
 *      user picks a tile grid > 1×1. Each tile becomes one saved file.
 *   2. GPU sub-bucket loop — within each image tile, the canvas/sim grid is
 *      held at the FULL TILE size and sub-buckets are rendered in-place via
 *      `uRegionMin`/`uRegionMax` discard. The shader writes only inside the
 *      current sub-bucket; outside is left untouched. Once a sub-bucket
 *      converges we read just its pixel rect off the canvas into a tile-sized
 *      2D composite.
 *
 * Why we hold the canvas at tile size (vs. resizing per sub-bucket): when the
 * canvas is tile-sized, `simW/simH` matches the tile's pixel grid and the
 * shader's UV→world mapping is consistent across every sub-bucket. Plus
 * `uAspect` is forced to the FULL OUTPUT aspect via `setBucketOutputSize`, so
 * the fractal sampled by every sub-bucket comes from the same world rect
 * regardless of how the tile/sub-bucket grids divide it. The previous
 * sub-bucket-sized canvas approach made every sub-bucket use its own
 * (incorrect) aspect, garbling tile boundaries.
 *
 * Skipped vs GMT: no Float32 HDR composite — fluid-toy has no bloom/CA, so
 * RGBA8 stitch via the canvas's preserveDrawingBuffer is sufficient. If we
 * eventually port GMT's bloom, the composite would need to be Float32.
 */

import type {
    BucketRenderController,
} from '../../engine/plugins/topbar/BucketRenderController';
import type { BucketRenderConfig } from '../../engine/export/BucketRenderTypes';
import type { FluidEngine } from '../fluid/FluidEngine';
import { useEngineStore } from '../../store/engineStore';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { getExportFileName } from '../../utils/fileUtils';

interface ImageTile {
    col: number;
    row: number;
    pixelX: number;
    pixelY: number;
    pixelW: number;
    pixelH: number;
}

interface SubBucket {
    /** Pixel offset within the image tile. */
    pixelX: number;
    pixelY: number;
    /** Pixel size of this sub-rect (last col/row may be smaller). */
    pixelW: number;
    pixelH: number;
}

/**
 * Tile-sized 2D canvas for compositing sub-bucket renders. Uses OffscreenCanvas
 * when available (Chrome, Edge, Firefox, Safari ≥ 16.4); falls back to a hidden
 * `<canvas>` element on older browsers. Returned objects expose a unified
 * `convertToBlob()` so the loop doesn't branch on type.
 */
interface TileComposite {
    canvas: OffscreenCanvas | HTMLCanvasElement;
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
    convertToBlob(): Promise<Blob>;
}

function createTileComposite(w: number, h: number): TileComposite {
    if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
        return {
            canvas,
            ctx,
            convertToBlob: () => canvas.convertToBlob({ type: 'image/png' }),
        };
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    return {
        canvas,
        ctx,
        convertToBlob: () => new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('canvas.toBlob returned null'));
            }, 'image/png');
        }),
    };
}

export class FluidBucketController implements BucketRenderController {
    private engineRef: () => FluidEngine | null;
    private cancelled = false;
    private running = false;

    constructor(getEngine: () => FluidEngine | null) {
        this.engineRef = getEngine;
    }

    get accumulationCount(): number {
        return this.engineRef()?.getAccumulationCount() ?? 0;
    }

    startBucketRender(exportImage: boolean, config: BucketRenderConfig): void {
        if (this.running) return;
        const engine = this.engineRef();
        if (!engine) return;
        this.running = true;
        this.cancelled = false;
        // Fire-and-forget — the panel polls progress via FRACTAL_EVENTS.BUCKET_STATUS.
        void this.runLoop(engine, exportImage, config);
    }

    stopBucketRender(): void {
        this.cancelled = true;
    }

    /** Build the image-tile grid (mirrors BucketRunner.start logic). */
    private buildTiles(outW: number, outH: number, cols: number, rows: number): ImageTile[] {
        const tiles: ImageTile[] = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const px0 = Math.floor((col * outW) / cols);
                const py0 = Math.floor((row * outH) / rows);
                const px1 = (col === cols - 1) ? outW : Math.floor(((col + 1) * outW) / cols);
                const py1 = (row === rows - 1) ? outH : Math.floor(((row + 1) * outH) / rows);
                tiles.push({
                    col, row,
                    pixelX: px0,
                    pixelY: py0,
                    pixelW: px1 - px0,
                    pixelH: py1 - py0,
                });
            }
        }
        return tiles;
    }

    /**
     * Build the GPU sub-bucket grid for an image tile. Sub-rects tile the tile
     * pixel space at `bucketSize` granularity; right/bottom edges absorb the
     * remainder. Center-spiral sort so the user sees the middle of the tile
     * fill first (matches BucketRunner's order).
     */
    private buildSubBuckets(tileW: number, tileH: number, bucketSize: number): SubBucket[] {
        const size = Math.max(64, Math.floor(bucketSize));
        const cols = Math.ceil(tileW / size);
        const rows = Math.ceil(tileH / size);
        const list: SubBucket[] = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const px0 = x * size;
                const py0 = y * size;
                const px1 = Math.min(tileW, (x + 1) * size);
                const py1 = Math.min(tileH, (y + 1) * size);
                list.push({
                    pixelX: px0,
                    pixelY: py0,
                    pixelW: px1 - px0,
                    pixelH: py1 - py0,
                });
            }
        }
        // Center-spiral: sort by squared distance from the tile center in UV.
        list.sort((a, b) => {
            const aCx = (a.pixelX + a.pixelW * 0.5) / tileW - 0.5;
            const aCy = (a.pixelY + a.pixelH * 0.5) / tileH - 0.5;
            const bCx = (b.pixelX + b.pixelW * 0.5) / tileW - 0.5;
            const bCy = (b.pixelY + b.pixelH * 0.5) / tileH - 0.5;
            return (aCx * aCx + aCy * aCy) - (bCx * bCx + bCy * bCy);
        });
        return list;
    }

    private buildFilename(projectName: string, version: number, fullW: number, fullH: number, tile: ImageTile, cols: number, rows: number): string {
        const dimTag = `${fullW}x${fullH}`;
        if (cols * rows <= 1) return getExportFileName(projectName, version, 'png', dimTag);
        const pad = (n: number, width: number) => String(n).padStart(width, '0');
        const rPad = Math.max(2, String(rows - 1).length);
        const cPad = Math.max(2, String(cols - 1).length);
        const suffix = `_r${pad(tile.row, rPad)}c${pad(tile.col, cPad)}`;
        return getExportFileName(projectName, version, 'png', `${dimTag}${suffix}`);
    }

    private emitStatus(progress: number, isRendering: boolean, total = 0, current = 0) {
        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, {
            isRendering,
            progress,
            totalBuckets: total,
            currentBucket: current,
        });
    }

    private async runLoop(engine: FluidEngine, exportImage: boolean, config: BucketRenderConfig): Promise<void> {
        const canvas = engine.getCanvas();
        const savedW = canvas.width;
        const savedH = canvas.height;
        const savedJuliaOnly = engine.isForceJuliaOnly();
        const savedFluidPaused = engine.isForceFluidPaused();
        const savedSampleCap = engine.getTsaaSampleCap();

        const outW = Math.max(1, Math.floor(config.outputWidth));
        const outH = Math.max(1, Math.floor(config.outputHeight));
        const cols = Math.max(1, Math.floor(config.tileCols));
        const rows = Math.max(1, Math.floor(config.tileRows));
        const sampleCap = Math.max(1, config.samplesPerBucket ?? 64);
        const bucketSize = Math.max(64, Math.floor(config.bucketSize ?? 512));

        const tiles = this.buildTiles(outW, outH, cols, rows);
        // Sub-bucket count varies slightly per tile only when the last col/row
        // is shorter than bucketSize; first tile's count is good enough for the
        // global progress total. Recomputed per-tile during the inner loop.
        const subBucketsPerTile = this.buildSubBuckets(tiles[0].pixelW, tiles[0].pixelH, bucketSize).length;
        const totalSubBuckets = tiles.length * subBucketsPerTile;
        let doneSubBuckets = 0;

        const projectState = useEngineStore.getState() as { projectSettings?: { name?: string } };
        const projectName = projectState.projectSettings?.name ?? 'fluid-toy';
        const projectVersion = 1;

        // Bucket-render mode: julia only, sim frozen, full-output aspect locked
        // in so every sub-bucket samples the same world rect.
        engine.setForceJuliaOnly(true);
        engine.setForceFluidPaused(true);
        engine.setBucketOutputSize(outW, outH);
        // Converge each sub-bucket to the EXPORT's sample count. The live
        // viewport TSAA cap (driven by the topbar Samples control) is usually
        // lower; without this override accumulation clamps below the target and
        // the wait below can never complete — it bails under-converged, which
        // leaves a noise step at sub-bucket boundaries (seams/"cuts").
        engine.setParams({ tsaaSampleCap: sampleCap });

        this.emitStatus(0, true, totalSubBuckets, 0);

        try {
            for (let i = 0; i < tiles.length; i++) {
                if (this.cancelled) break;
                const tile = tiles[i];
                const tileW = tile.pixelW;
                const tileH = tile.pixelH;

                // Image-tile UV span in full output (constant across this tile's sub-buckets).
                const imageTileOriginUV: [number, number] = [tile.pixelX / outW, tile.pixelY / outH];
                const imageTileSizeUV:   [number, number] = [tileW / outW,       tileH / outH];

                // Hold the canvas at the full tile size for the whole tile.
                // setRenderSize is a heavyweight op (FBO realloc + blit) so we
                // run it once per tile, not per sub-bucket.
                engine.setRenderSize(tileW, tileH);
                engine.setBucketImageTile(imageTileOriginUV, imageTileSizeUV);

                const composite = exportImage ? createTileComposite(tileW, tileH) : null;
                const subBuckets = this.buildSubBuckets(tileW, tileH, bucketSize);

                for (const sb of subBuckets) {
                    if (this.cancelled) break;

                    // Sub-bucket region in tile-local vUv. Note Y flip: sb.pixelY
                    // is DOM-top-down (row 0 = top), but vUv.y is bottom-up
                    // (gl_FragCoord convention), so the bottom of the bucket in
                    // DOM corresponds to the LOW end of vUv.y. The shader's
                    // discard test uses vUv directly.
                    const uMin: [number, number] = [
                        sb.pixelX / tileW,
                        (tileH - sb.pixelY - sb.pixelH) / tileH,
                    ];
                    const uMax: [number, number] = [
                        (sb.pixelX + sb.pixelW) / tileW,
                        (tileH - sb.pixelY) / tileH,
                    ];
                    engine.setBucketRegion(uMin, uMax);

                    engine.resetAccumulation();

                    // Wait for this sub-rect to reach the export sample cap.
                    // Gate on accumulation PROGRESS, not a fixed frame/wall-clock
                    // budget: large or shader-heavy renders run slower per frame,
                    // so the old fixed budget (`sampleCap * 4 + 32` frames) timed
                    // slow renders out mid-convergence — and detail-heavy
                    // sub-buckets (slower) stopped at fewer samples than empty ones,
                    // leaving a visible noise step at every sub-bucket boundary
                    // ("cuts" in the tile). Now we keep waiting as long as the count
                    // keeps climbing and only bail on a genuine stall (no progress
                    // for a few seconds — e.g. a lost context), so every sub-bucket
                    // reaches the SAME sample count regardless of render speed.
                    if (sampleCap <= 1) {
                        // TSAA off — a single direct sample, nothing accumulates.
                        // Give the region a couple of frames to draw, then read.
                        await sleep(16);
                        await sleep(16);
                    } else {
                        let lastCount = -1;
                        let stalledMs = 0;
                        // No-progress bail-out only — generous enough that a single
                        // very heavy frame on a large render isn't mistaken for a
                        // stall. A real hang (lost context / paused) still recovers.
                        const STALL_LIMIT_MS = 8000;
                        while (engine.getAccumulationCount() < sampleCap) {
                            if (this.cancelled) break;
                            await sleep(16);
                            const c = engine.getAccumulationCount();
                            if (c > lastCount) { lastCount = c; stalledMs = 0; }
                            else { stalledMs += 16; if (stalledMs >= STALL_LIMIT_MS) break; }
                        }
                    }
                    if (this.cancelled) break;

                    // drawImage is safe because preserveDrawingBuffer:true is set
                    // on fluid-toy's gl context. Source/dest rects are DOM
                    // top-down — the Y flip above is what bridges them with vUv.
                    if (composite) {
                        composite.ctx.drawImage(
                            canvas,
                            sb.pixelX, sb.pixelY, sb.pixelW, sb.pixelH,
                            sb.pixelX, sb.pixelY, sb.pixelW, sb.pixelH,
                        );
                    }

                    doneSubBuckets++;
                    this.emitStatus(
                        (doneSubBuckets / totalSubBuckets) * 100,
                        true, totalSubBuckets, doneSubBuckets,
                    );
                }
                if (this.cancelled) break;

                if (exportImage && composite) {
                    const blob = await composite.convertToBlob();
                    const filename = this.buildFilename(projectName, projectVersion, outW, outH, tile, cols, rows);
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = url;
                    // Attach to the DOM before clicking — some browsers ignore a
                    // click() on a detached anchor. Defer revokeObjectURL well past
                    // the click so the browser has finished reading the blob (an
                    // immediate revoke can cancel the download, which is what dropped
                    // tile files on multi-tile exports).
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                }
            }
        } finally {
            engine.setBucketImageTile([0, 0], [1, 1]);
            engine.setBucketRegion([0, 0], [1, 1]);
            engine.setBucketOutputSize(0, 0);
            engine.setRenderSize(savedW, savedH);
            engine.setForceJuliaOnly(savedJuliaOnly);
            engine.setForceFluidPaused(savedFluidPaused);
            engine.setParams({ tsaaSampleCap: savedSampleCap });
            engine.resetAccumulation();
            this.running = false;
            this.cancelled = false;
            this.emitStatus(0, false);
        }
    }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
