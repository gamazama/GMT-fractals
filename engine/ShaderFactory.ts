
import { featureRegistry } from './FeatureSystem';
import { ShaderBuilder, RenderVariant } from './ShaderBuilder';
import { LightingState } from '../features/lighting';

export interface ShaderConfig {
    formula: string;
    pipeline?: any[];
    graph?: any;
    pipelineRevision: number;
    msaaSamples?: number;
    previewMode?: boolean;
    maxSteps?: number;
    renderMode?: 'Direct' | 'PathTracing';
    compilerHardCap?: number;
    shadows?: boolean;
    [key: string]: any;
}

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
                // Modern DDFS Injection
                feat.inject(builder, config, variant);
            } else if (feat.shaderLibrary) {
                // Legacy Library Support (Backwards Compatibility)
                // This shouldn't be hit if migration is complete, but keeps system robust
                const lib = feat.shaderLibrary;
                let isEnabled = true;
                if (feat.engineConfig?.toggleParam) {
                    const featState = config[feat.id];
                    if (featState && featState[feat.engineConfig.toggleParam] === false) {
                        isEnabled = false;
                    }
                }
                
                if (isEnabled) {
                    if (lib.defineTrigger) builder.addDefine(lib.defineTrigger, '1');
                    builder.addFunction(lib.code);
                    if (lib.uniforms) builder.addHeader(lib.uniforms);
                } else if (lib.stubs) {
                    builder.addFunction(lib.stubs);
                }
            }
        });

        // 3. Assemble
        return builder.buildFragment();
    }
}
