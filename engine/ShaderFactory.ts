
import { featureRegistry } from './FeatureSystem';
import { ShaderBuilder, RenderVariant } from './ShaderBuilder';
import { LightingState } from '../features/lighting';

import type { ShaderConfig } from './ShaderConfig';
export type { ShaderConfig } from './ShaderConfig';

export class ShaderFactory {
    
    public static generateFragmentShader(config: ShaderConfig): string {
        return this.buildShader(config, 'Main');
    }

    public static generatePhysicsShader(config: ShaderConfig): string {
        return this.buildShader(config, 'Physics');
    }

    public static generateHistogramShader(config: ShaderConfig): string {
        return this.buildShader(config, 'Histogram');
    }

    private static buildShader(config: ShaderConfig, variant: RenderVariant): string {
        const builder = new ShaderBuilder(variant);
        
        // 1. Configure Builder State
        const lighting = config.lighting as LightingState;
        const ptEnabled = lighting?.ptEnabled !== false;
        const isPathTracing = ptEnabled && (config.renderMode === 'PathTracing' || lighting?.renderMode === 1.0);
        
        builder.setRenderMode(isPathTracing ? 'PathTracing' : 'Direct');
        
        const quality = config.quality || {};
        builder.setQuality(
            quality.precisionMode === 1.0, // isLite
            quality.precisionMode ?? 0
        );

        // 2. Iterate Features and Inject
        const allFeatures = featureRegistry.getAll();
        
        allFeatures.forEach(feat => {
            if (feat.inject) {
                // Always call inject() — each feature's inject() is responsible for
                // injecting stubs when disabled. Skipping inject() entirely causes
                // undefined function errors when other code (e.g. calculateShading)
                // depends on functions that the feature would have stubbed out.
                feat.inject(builder, config, variant);
            }
        });

        // 3. Assemble
        return builder.buildFragment();
    }
}
