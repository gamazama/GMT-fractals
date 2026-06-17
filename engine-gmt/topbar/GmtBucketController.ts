/**
 * GmtBucketController — wraps WorkerProxy + GMT preset state for the
 * generic BucketRenderPanel.
 *
 * Builds the GMT-specific exportData (preset + project name + version)
 * just-in-time when an export render starts, so the generic panel doesn't
 * need to know about preset/scene serialization.
 */

import { useEngineStore } from '../../store/engineStore';
import { getProxy } from '../engine/worker/WorkerProxy';
import type {
    BucketRenderController,
    BucketPreviewRegion,
} from '../../engine/plugins/topbar/BucketRenderController';
import type { BucketRenderConfig } from '../../engine/export/BucketRenderTypes';

export class GmtBucketController implements BucketRenderController {
    private proxy = getProxy();

    startBucketRender(exportImage: boolean, config: BucketRenderConfig): void {
        if (exportImage) {
            const state = useEngineStore.getState() as {
                getPreset?: (opts: { includeScene: boolean }) => object;
                prepareExport?: () => number;
                projectSettings?: { name?: string };
            };
            const preset = state.getPreset?.({ includeScene: true }) ?? {};
            const version = state.prepareExport?.() ?? 0;
            const name = state.projectSettings?.name ?? 'Fractal';
            this.proxy.startBucketRender(true, config, { preset, name, version });
        } else {
            this.proxy.startBucketRender(false, config);
        }
    }

    stopBucketRender(): void {
        this.proxy.stopBucketRender();
    }

    setPreviewRegion(
        region: BucketPreviewRegion,
        outputWidth: number,
        outputHeight: number,
        sampleCap: number,
    ): void {
        this.proxy.setPreviewRegion(region, outputWidth, outputHeight, sampleCap);
    }

    clearPreviewRegion(): void {
        this.proxy.clearPreviewRegion();
    }

    get accumulationCount(): number {
        return this.proxy.accumulationCount;
    }
}
