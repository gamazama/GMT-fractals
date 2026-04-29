/**
 * BucketRenderer — GMT compatibility shim around the generic `BucketRunner`.
 *
 * The orchestration (image-tile loop, GPU-bucket spiral, composite buffer,
 * scissor copy, readback, save) lives in [engine/export/BucketRunner.ts]. The
 * GMT-specific bits (FractalEngine ref, BloomPass, MaterialController,
 * displayScene blit) live in [./GmtBucketHost.ts]. This file keeps the
 * pre-extraction public API so FractalEngine, renderWorker, and
 * handleRenderTick don't need to change.
 *
 * Re-exports `BucketRenderConfig` and `BucketEngineRef` for callers that
 * referenced them by their old import path.
 */

import * as THREE from 'three';
import { BucketRunner } from '../../engine/export/BucketRunner';
import type { BucketRunnerExportData } from '../../engine/export/BucketRunner';
import { GmtBucketHost, type BucketEngineRef } from './GmtBucketHost';
import { saveGMFScene } from '../utils/FormulaFormat';
import type { Preset } from '../types';

export type { BucketRenderConfig } from '../../engine/export/BucketRenderTypes';
export type { BucketEngineRef } from './GmtBucketHost';

import type { BucketRenderConfig } from '../../engine/export/BucketRenderTypes';

export class BucketRenderer {
    private runner = new BucketRunner();
    private host = new GmtBucketHost();

    public init(engineRef: BucketEngineRef): void {
        this.host.init(engineRef);
    }

    public setBloomPass(bp: import('./BloomPass').BloomPass): void {
        this.host.setBloomPass(bp);
    }

    public setDisplayRefs(scene: THREE.Scene, camera: THREE.Camera): void {
        this.host.setDisplayRefs(scene, camera);
    }

    public start(
        exportImage: boolean,
        config: BucketRenderConfig,
        exportData?: { preset: Preset; name: string; version: number },
    ): void {
        const runnerExportData: BucketRunnerExportData | undefined = exportData ? {
            metadataJson: saveGMFScene(exportData.preset),
            projectName: exportData.name,
            projectVersion: exportData.version,
        } : undefined;
        this.runner.start(this.host, config, exportImage, runnerExportData);
    }

    public stop(): void {
        this.runner.stop();
    }

    public update(_gl: THREE.WebGLRenderer, config: BucketRenderConfig): void {
        if (config) this.runner.updateConfig(config);
        this.runner.update();
    }

    public getIsRunning(): boolean { return this.runner.getIsRunning(); }
    public isHoldingFinalFrame(): boolean { return this.runner.isHoldingFinalFrame(); }
    public releaseHeldFinalFrame(): void { this.runner.releaseHeldFinalFrame(); }

    public blitHeldFinalFrame(): void {
        if (!this.runner.isHoldingFinalFrame()) return;
        const composite = this.runner.getCompositeTexture();
        if (composite) this.host.onTileBlitToScreen(composite);
    }

    public getCurrentTilePixelSize(): [number, number] {
        return this.runner.getCurrentTilePixelSize();
    }

    /**
     * SSAA: FractalEngine.compute() reads this each frame during bucket render
     * to override `uPixelSizeBase` so primary-ray density matches the viewport's
     * (not the larger render target's). Backed by the GMT host.
     */
    public get savedPixelSizeBase(): number {
        return this.host.getSavedPixelSizeBase();
    }
}

export const bucketRenderer = new BucketRenderer();
