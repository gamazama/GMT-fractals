/**
 * FluidBucketController — fluid-toy adapter for the generic bucket-render panel.
 *
 * Drives the image-tile loop *directly* against `FluidEngine` rather than
 * going through `BucketRunner`. Reasons (recorded in plans/bucket-render-port-
 * handoff.md § D):
 *   - FluidEngine uses raw WebGL2; BucketRunner is hardcoded to THREE
 *   - fluid-toy is single-threaded (no worker proxy save path needed)
 *   - v1 doesn't need the Float32 HDR composite buffer — no bloom/CA
 *
 * Per image tile: setRenderSize → set image-tile uniforms → forceJuliaOnly +
 * forceFluidPaused → resetAccumulation → poll until convergence → readPixels →
 * canvas.toBlob → download. Repeat for next tile. Restore state at end.
 *
 * Skipped vs GMT: GPU sub-bucketing within a tile (so a single image tile
 * must fit in VRAM — fluid-toy has no multi-target ping-pong, so this is
 * fine for the print sizes we care about). Adding sub-bucketing later would
 * need a Three-context wrapper or a WebGL2-native composite path.
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
        // Save state for restoration.
        const canvas = engine.getCanvas();
        const savedW = canvas.width;
        const savedH = canvas.height;
        const savedJuliaOnly = engine.isForceJuliaOnly();
        const savedFluidPaused = engine.isForceFluidPaused();

        const outW = Math.max(1, Math.floor(config.outputWidth));
        const outH = Math.max(1, Math.floor(config.outputHeight));
        const cols = Math.max(1, Math.floor(config.tileCols));
        const rows = Math.max(1, Math.floor(config.tileRows));
        const sampleCap = Math.max(1, config.samplesPerBucket ?? 64);

        const tiles = this.buildTiles(outW, outH, cols, rows);
        const total = tiles.length;

        const projectState = useEngineStore.getState() as { projectSettings?: { name?: string } };
        const projectName = projectState.projectSettings?.name ?? 'fluid-toy';
        const projectVersion = 1;

        // Bucket-render mode: julia only, sim frozen, viewport at output aspect.
        engine.setForceJuliaOnly(true);
        engine.setForceFluidPaused(true);

        this.emitStatus(0, true, total, 0);

        try {
            for (let i = 0; i < tiles.length; i++) {
                if (this.cancelled) break;
                const tile = tiles[i];
                const tileW = tile.pixelW;
                const tileH = tile.pixelH;

                // Image-tile UV remap: this tile's slice of full output.
                const originUV: [number, number] = [tile.pixelX / outW, tile.pixelY / outH];
                const sizeUV: [number, number]   = [tileW / outW,       tileH / outH];
                engine.setBucketImageTile(originUV, sizeUV);
                engine.setBucketRegion([0, 0], [1, 1]); // single GPU bucket per tile

                engine.setRenderSize(tileW, tileH);
                engine.resetAccumulation();

                // Wait for TSAA convergence. The live render loop is still running
                // (forceFluidPaused only blocks sim, not the julia pass), so frames
                // accumulate naturally.
                const maxWaitFrames = sampleCap * 4 + 32; // safety cap
                let frames = 0;
                while (engine.getAccumulationCount() < sampleCap && frames < maxWaitFrames) {
                    if (this.cancelled) break;
                    await sleep(16);
                    frames++;
                }
                if (this.cancelled) break;

                if (exportImage) {
                    await this.savePngFromCanvas(canvas, tileW, tileH, projectName, projectVersion, outW, outH, tile, cols, rows);
                }

                this.emitStatus(((i + 1) / total) * 100, true, total, i + 1);
            }
        } finally {
            // Restore state.
            engine.setBucketImageTile([0, 0], [1, 1]);
            engine.setBucketRegion([0, 0], [1, 1]);
            engine.setRenderSize(savedW, savedH);
            engine.setForceJuliaOnly(savedJuliaOnly);
            engine.setForceFluidPaused(savedFluidPaused);
            engine.resetAccumulation();
            this.running = false;
            this.cancelled = false;
            this.emitStatus(0, false);
        }
    }

    /** Read pixels from the live canvas and save as PNG. */
    private async savePngFromCanvas(
        canvas: HTMLCanvasElement,
        w: number, h: number,
        projectName: string, projectVersion: number,
        fullW: number, fullH: number,
        tile: ImageTile, cols: number, rows: number,
    ): Promise<void> {
        const filename = this.buildFilename(projectName, projectVersion, fullW, fullH, tile, cols, rows);
        // canvas was rendered with preserveDrawingBuffer:true, so toBlob is safe.
        await new Promise<void>((resolve) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                }
                resolve();
            }, 'image/png');
        });
        // Suppress unused warnings — w/h are passed for API symmetry with future
        // uses (e.g. metadata embedding); the canvas already matches the tile size.
        void w; void h;
    }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
