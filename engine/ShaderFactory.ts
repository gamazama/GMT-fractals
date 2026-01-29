import { featureRegistry } from './FeatureSystem';
import { ShaderBuilder, RenderVariant } from './ShaderBuilder';
import { FORMULA_ID_GENERIC, FORMULA_ID_MODULAR } from '../data/constants';
import { LightingState } from '../features/lighting';
import { GeometryState } from '../features/geometry';

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
    
    private static getFormulaID(f: string): number {
        if (f === 'Modular') return FORMULA_ID_MODULAR;
        return FORMULA_ID_GENERIC;
    }

    public static getDefines(config: ShaderConfig) {
        const hardCap = config.compilerHardCap || 500;
        const lighting = config.lighting as LightingState;
        const ptEnabled = lighting?.ptEnabled !== false;
        const isPathTracing = ptEnabled && (config.renderMode === 'PathTracing' || lighting?.renderMode === 1.0);
        
        const defines: any = {
            FORMULA_ID: this.getFormulaID(config.formula),
            MAX_HARD_ITERATIONS: hardCap,
            MAX_LIGHTS: 8, // Kept constant for array sizing
        };
        
        // Legacy defines kept for compatibility with chunks that might check them directly
        // Ideally these should be injected via features, but getting them here ensures compatibility
        const shadowsCompiled = lighting?.shadowsCompile !== false;
        if (!shadowsCompiled && config.shadows === false) {
             defines['DISABLE_SHADOWS'] = 1;
        } else {
             defines['SHADOW_QUALITY'] = 2;
        }
        
        if (ptEnabled) defines['PT_ENABLED'] = 1;
        if (isPathTracing) defines['RENDER_MODE_PATHTRACING'] = 1;
        if (config.formula === 'Modular') defines['PIPELINE_REV'] = config.pipelineRevision;

        const isAnalytic = ['JuliaMorph', 'MandelTerrain'].includes(config.formula);
        if (isAnalytic) defines['SKIP_PRE_BAILOUT'] = 1;

        return defines;
    }

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