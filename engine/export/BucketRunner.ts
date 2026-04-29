/**
 * BucketRunner — generic two-level loop for tiled high-resolution rendering.
 *
 * Outer loop (image tiles): each saved as its own PNG via FRACTAL_EVENTS.BUCKET_IMAGE.
 * Inner loop (GPU buckets): scissor-copied into a per-tile Float32 HDR composite for
 * VRAM safety. Final post-processing runs once per image tile on the composite.
 *
 * Renderer-specific concerns (convergence policy, region uniforms, post-process
 * material, accumulator) live behind the `BucketRenderHost` interface. The runner
 * itself imports nothing from any specific app — it works for any host that can
 * accumulate into a render target and honour region uniforms.
 *
 * See [docs/gmt/43_Bucket_Render_Overhaul.md] for the original design discussion.
 */

import * as THREE from 'three';
import { FractalEvents, FRACTAL_EVENTS } from '../FractalEvents';
import { createFullscreenPass, type FullscreenPass } from '../utils/FullscreenQuad';
import { injectMetadata } from '../../utils/pngMetadata';
import { getExportFileName } from '../../utils/fileUtils';
import type {
    BucketRenderConfig,
    BucketRenderHost,
    BucketImageTile,
} from './BucketRenderTypes';

interface GpuBucket {
    minX: number; minY: number; maxX: number; maxY: number;
    pixelX: number; pixelY: number; pixelW: number; pixelH: number;
}

export interface BucketRunnerExportData {
    metadataJson: string;        // raw string embedded as PNG iTXt (e.g. saveGMFScene output)
    projectName: string;
    projectVersion: number;
}

export class BucketRunner {
    private host: BucketRenderHost | null = null;
    private isRunning_: boolean = false;
    private isExporting: boolean = false;

    // Inner loop — GPU buckets within the current image tile
    private buckets: GpuBucket[] = [];
    private currentBucketIndex: number = 0;
    private bucketFrameCount: number = 0;
    private readonly DEFAULT_MAX_FRAMES = 1024;

    // Outer loop — image tiles
    private imageTiles: BucketImageTile[] = [];
    private currentImageTileIndex: number = 0;

    private fullOutputSize = new THREE.Vector2();
    private targetResolution = new THREE.Vector2();   // current image-tile pixel size

    // Composite buffer (per image tile, sized to the tile)
    private compositeTarget: THREE.WebGLRenderTarget | null = null;
    private compositeMaterial: THREE.ShaderMaterial | null = null;
    private compositePass: FullscreenPass | null = null;
    private readbackPass: FullscreenPass | null = null;

    // Cached config
    private config: BucketRenderConfig = {
        bucketSize: 512,
        outputWidth: 1920,
        outputHeight: 1080,
        tileCols: 1,
        tileRows: 1,
        convergenceThreshold: 0.25,
        accumulation: true,
        samplesPerBucket: 64,
    };

    // Export metadata (preset + filename ingredients)
    private exportData: BucketRunnerExportData | null = null;

    // Hold-final-frame for Refine View (host opts in by polling these)
    private holdingFinalFrame_: boolean = false;

    // ─── Public API ────────────────────────────────────────────────────

    public start(
        host: BucketRenderHost,
        config: BucketRenderConfig,
        exportImage: boolean,
        exportData?: BucketRunnerExportData,
    ): void {
        const gl = host.getRenderer();
        if (!gl || this.isRunning_) return;

        if (this.holdingFinalFrame_) this.releaseHeldFinalFrame();

        this.host = host;
        this.isExporting = exportImage;
        this.config = { ...config };
        this.exportData = exportData ?? null;

        const outW = Math.max(1, Math.floor(config.outputWidth));
        const outH = Math.max(1, Math.floor(config.outputHeight));
        this.fullOutputSize.set(outW, outH);

        host.beginRender(outW, outH);

        // Build image-tile grid. Last col/row absorbs pixel remainder so the
        // full output is covered exactly with no gaps.
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
        this.isRunning_ = true;

        this.startImageTile();
    }

    public stop(): void {
        if (this.isRunning_) {
            this.cleanup();
        } else if (this.holdingFinalFrame_) {
            this.releaseHeldFinalFrame();
        }
    }

    /**
     * Honour in-flight edits to convergence threshold / accumulation toggle /
     * sample cap — the bucket-render UI's sliders update these during a render.
     * Tile geometry, output dimensions, and bucketSize are fixed at start time.
     */
    public updateConfig(config: BucketRenderConfig): void {
        this.config.convergenceThreshold = config.convergenceThreshold;
        this.config.accumulation = config.accumulation;
        if (config.samplesPerBucket !== undefined) {
            this.config.samplesPerBucket = config.samplesPerBucket;
        }
    }

    /**
     * Tick the bucket state machine. Called once per frame *after* the host's
     * normal render loop has run a frame with the current region uniforms set.
     * The runner does not drive rendering — it observes convergence and
     * advances buckets / image tiles. Setting region uniforms for the *next*
     * frame happens in `applyCurrentBucket()` via `host.beginGpuBucket()`.
     */
    public update(): void {
        if (!this.isRunning_ || !this.host) return;

        this.bucketFrameCount++;

        const minSamples = Math.min(16, (this.config.samplesPerBucket || 64) / 4);
        if (this.bucketFrameCount < minSamples) return;

        const maxSamples = this.config.samplesPerBucket || this.DEFAULT_MAX_FRAMES;
        const converged = this.host.isCurrentBucketConverged(this.bucketFrameCount, this.config);
        const capped = this.bucketFrameCount >= maxSamples;

        if (converged || capped) {
            this.compositeCurrentBucket();
            this.currentBucketIndex++;
            this.applyCurrentBucket();
            if (this.isRunning_) this.emitProgress();
        }
    }

    public getIsRunning(): boolean { return this.isRunning_; }
    public isHoldingFinalFrame(): boolean { return this.holdingFinalFrame_; }

    /** Current image-tile pixel dimensions. (0,0) when no render is in flight. */
    public getCurrentTilePixelSize(): [number, number] {
        if (!this.isRunning_) return [0, 0];
        return [this.targetResolution.x, this.targetResolution.y];
    }

    public getProgress(): number {
        if (!this.isRunning_ || this.imageTiles.length === 0) return 0;
        const total = this.imageTiles.length * Math.max(1, this.buckets.length);
        const done = this.currentImageTileIndex * this.buckets.length + this.currentBucketIndex;
        return (done / total) * 100;
    }

    public getCompositeTexture(): THREE.Texture | null {
        return this.compositeTarget?.texture ?? null;
    }

    public releaseHeldFinalFrame(): void {
        if (!this.holdingFinalFrame_) return;
        this.holdingFinalFrame_ = false;
        this.disposeCompositeBuffer();
    }

    // ─── Internal: image-tile lifecycle ───────────────────────────────

    private startImageTile(): void {
        if (!this.host) return;
        const imgTile = this.imageTiles[this.currentImageTileIndex];
        const tileW = imgTile.pixelW;
        const tileH = imgTile.pixelH;
        this.targetResolution.set(tileW, tileH);

        this.host.setRenderSize(tileW, tileH);
        this.host.beginImageTile(imgTile, { w: this.fullOutputSize.x, h: this.fullOutputSize.y });

        this.initCompositeBuffer(tileW, tileH);
        this.clearCompositeBuffer();

        // Build inner GPU-bucket list. Center-spiral order so the user sees the
        // middle of the tile first.
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

    private finishImageTile(): void {
        if (!this.host) return;
        this.runFinalPostProcessAndSave();

        this.currentImageTileIndex++;
        if (this.currentImageTileIndex >= this.imageTiles.length) {
            this.finalizeAll();
            return;
        }

        this.host.resetAccumulation();
        this.startImageTile();
    }

    private finalizeAll(): void {
        const wasExporting = this.isExporting;
        if (!wasExporting) {
            // Refine / Preview: keep composite alive so host can re-blit it.
            this.holdingFinalFrame_ = true;
        }
        this.cleanup();
    }

    // ─── Internal: GPU-bucket lifecycle ───────────────────────────────

    private applyCurrentBucket(): void {
        if (!this.host) return;
        if (this.currentBucketIndex >= this.buckets.length) {
            this.finishImageTile();
            return;
        }

        const b = this.buckets[this.currentBucketIndex];
        // Expand by half a pixel in UV space so boundary pixels are always
        // rendered. Composite uses integer scissor for exact clipping.
        const halfPixelU = 0.5 / this.targetResolution.x;
        const halfPixelV = 0.5 / this.targetResolution.y;
        const uvRect = {
            minX: b.minX - halfPixelU,
            minY: b.minY - halfPixelV,
            maxX: b.maxX + halfPixelU,
            maxY: b.maxY + halfPixelV,
        };
        const pixelRect = {
            pixelX: b.pixelX,
            pixelY: b.pixelY,
            pixelW: b.pixelW,
            pixelH: b.pixelH,
        };

        this.host.beginGpuBucket(uvRect, pixelRect);
        this.host.resetAccumulation();
        this.bucketFrameCount = 0;
    }

    private compositeCurrentBucket(): void {
        if (!this.host) return;
        const gl = this.host.getRenderer();
        if (!gl || !this.compositeTarget || !this.compositeMaterial || !this.compositePass) return;

        const outputTex = this.host.getOutputTexture();
        if (!outputTex) return;

        const b = this.buckets[this.currentBucketIndex];
        this.compositeMaterial.uniforms.map.value = outputTex;

        const currentTarget = gl.getRenderTarget();
        const currentViewport = new THREE.Vector4();
        gl.getViewport(currentViewport);

        gl.setRenderTarget(this.compositeTarget);
        gl.setViewport(0, 0, this.targetResolution.x, this.targetResolution.y);

        const prevScissor = gl.getScissorTest();
        gl.setScissorTest(true);
        gl.setScissor(b.pixelX, b.pixelY, b.pixelW, b.pixelH);

        const prevAutoClear = gl.autoClear;
        gl.autoClear = false;
        gl.render(this.compositePass.scene, this.compositePass.camera);
        gl.autoClear = prevAutoClear;

        gl.setScissorTest(prevScissor);
        gl.setRenderTarget(currentTarget);
        gl.setViewport(currentViewport);
    }

    // ─── Internal: composite buffer ──────────────────────────────────

    private initCompositeBuffer(width: number, height: number): void {
        this.disposeCompositeBuffer();

        // Float32 HDR composite — preserves linear values for post-processing.
        this.compositeTarget = new THREE.WebGLRenderTarget(width, height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            stencilBuffer: false,
            depthBuffer: false,
        });

        // Bucket clipping uses GL scissor for exact integer pixel boundaries —
        // shader-based UV discard caused 1px black stripes in the past.
        this.compositeMaterial = new THREE.ShaderMaterial({
            uniforms: { map: { value: null } },
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
            transparent: false,
        });

        this.compositePass = createFullscreenPass(this.compositeMaterial);
    }

    private clearCompositeBuffer(): void {
        if (!this.host) return;
        const gl = this.host.getRenderer();
        if (!this.compositeTarget || !gl) return;
        const currentTarget = gl.getRenderTarget();
        gl.setRenderTarget(this.compositeTarget);
        gl.clear();
        gl.setRenderTarget(currentTarget);
    }

    private disposeCompositeBuffer(): void {
        if (this.compositeTarget) {
            this.compositeTarget.dispose();
            this.compositeTarget = null;
        }
        if (this.compositeMaterial) {
            this.compositeMaterial.dispose();
            this.compositeMaterial = null;
        }
        this.compositePass = null;
    }

    // ─── Internal: final post-process + save ─────────────────────────

    private runFinalPostProcessAndSave(): void {
        if (!this.host) return;
        if (!this.compositeTarget) return;

        const tileSize = { w: this.targetResolution.x, h: this.targetResolution.y };
        const fullOutput = { w: this.fullOutputSize.x, h: this.fullOutputSize.y };

        const readbackMat = this.host.getReadbackMaterial(this.compositeTarget.texture, tileSize, fullOutput)
            ?? this.compositeMaterial!;  // passthrough fallback uses the simple copy material

        if (this.isExporting) {
            this.saveImage(readbackMat);
        } else {
            this.host.onTileBlitToScreen?.(this.compositeTarget.texture);
        }
    }

    private readCompositePixels(readbackMat: THREE.ShaderMaterial)
        : { pixels: Uint8ClampedArray; width: number; height: number } | null
    {
        if (!this.host) return null;
        const gl = this.host.getRenderer();
        if (!this.compositeTarget || !gl) return null;

        const w = this.targetResolution.x;
        const h = this.targetResolution.y;

        const exportTarget = new THREE.WebGLRenderTarget(w, h, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            stencilBuffer: false,
            depthBuffer: false,
        });

        const currentTarget = gl.getRenderTarget();
        const currentViewport = new THREE.Vector4();
        gl.getViewport(currentViewport);

        gl.setRenderTarget(exportTarget);
        gl.setViewport(0, 0, w, h);
        gl.clear();

        if (!this.readbackPass) this.readbackPass = createFullscreenPass(readbackMat);
        else this.readbackPass.mesh.material = readbackMat;
        gl.render(this.readbackPass.scene, this.readbackPass.camera);

        const buffer = new Uint8Array(w * h * 4);
        gl.readRenderTargetPixels(exportTarget, 0, 0, w, h, buffer);

        gl.setRenderTarget(currentTarget);
        gl.setViewport(currentViewport);
        exportTarget.dispose();

        // Y-flip (WebGL bottom-up → PNG top-down) and force opaque alpha.
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

    private buildTileFilename(): string {
        const projectName = this.exportData?.projectName ?? 'Fractal';
        const projectVersion = this.exportData?.projectVersion ?? 0;
        const outW = this.fullOutputSize.x;
        const outH = this.fullOutputSize.y;
        const rows = this.config.tileRows;
        const cols = this.config.tileCols;
        const imgTile = this.imageTiles[this.currentImageTileIndex];
        const dimTag = `${outW}x${outH}`;

        if (rows * cols <= 1) {
            return getExportFileName(projectName, projectVersion, 'png', dimTag);
        }

        const pad = (n: number, width: number) => String(n).padStart(width, '0');
        const rPad = Math.max(2, String(rows - 1).length);
        const cPad = Math.max(2, String(cols - 1).length);
        const suffix = `_r${pad(imgTile.row, rPad)}c${pad(imgTile.col, cPad)}`;
        return getExportFileName(projectName, projectVersion, 'png', `${dimTag}${suffix}`);
    }

    private saveImage(readbackMat: THREE.ShaderMaterial): void {
        const result = this.readCompositePixels(readbackMat);
        if (!result) return;
        const presetStr = this.exportData?.metadataJson ?? '{}';
        const filename = this.buildTileFilename();

        // Worker context: emit pixel data, main thread handles DOM save.
        if (typeof document === 'undefined') {
            FractalEvents.emit(FRACTAL_EVENTS.BUCKET_IMAGE, {
                pixels: result.pixels,
                width: result.width,
                height: result.height,
                presetJson: presetStr,
                filename,
            });
            return;
        }

        // DOM fallback (legacy / non-worker path).
        const { pixels: flipped, width: w, height: h } = result;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = new ImageData(flipped as unknown as Uint8ClampedArray<ArrayBuffer>, w, h);
        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            try {
                const tagged = await injectMetadata(blob, 'FractalData', presetStr);
                const url = URL.createObjectURL(tagged);
                const link = document.createElement('a');
                link.download = filename;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error('[BucketRunner] Failed to inject metadata', e);
                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        }, 'image/png');
    }

    // ─── Internal: progress + cleanup ────────────────────────────────

    private emitProgress(): void {
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
            currentBucket: globalDone,
        });
    }

    private cleanup(): void {
        const wasHolding = this.holdingFinalFrame_;
        this.isRunning_ = false;
        this.isExporting = false;
        this.exportData = null;

        if (this.host) this.host.endRender();

        // Keep composite alive for hold-final-frame; otherwise dispose.
        if (!wasHolding) this.disposeCompositeBuffer();

        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: false, progress: 0 });
    }
}
