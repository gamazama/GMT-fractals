/**
 * Shared helper for building a fresh ShaderConfig from feature-registry defaults.
 *
 * Single source of truth for "start from scratch" config construction.
 * Used by:
 *   - FractalEngine constructor (initial config at boot)
 *   - debug/render-harness.ts (per-test case baseline)
 *   - debug/native-interlace-sweep.mts, native-config-sweep.mts, v4-verify.mts
 *     (verification harnesses' buildFullShaderConfig)
 *
 * Prior to extraction this logic was duplicated across 5 call sites. Any
 * feature-registry shape change now only needs updating here.
 */

import { featureRegistry } from './FeatureSystem';
import type { ShaderConfig } from './ShaderFactory';
import { DEFAULT_HARD_CAP } from '../data/constants';

export function createDefaultShaderConfig(formulaId: string = 'Mandelbulb'): ShaderConfig {
    const cfg: any = {
        formula: formulaId,
        pipelineRevision: 0,
        msaaSamples: 1,
        previewMode: false,
        maxSteps: 300,
        renderMode: 'Direct',
        compilerHardCap: DEFAULT_HARD_CAP,
        shadows: true,
    };

    for (const feat of featureRegistry.getAll()) {
        const featConfig: any = {};
        for (const [key, param] of Object.entries(feat.params)) {
            if (!(param as any).composeFrom) featConfig[key] = (param as any).default;
        }
        const clean: any = {};
        for (const k of Object.keys(featConfig)) {
            const v = featConfig[k];
            if (v && typeof v === 'object') {
                if ((v as any).clone) clean[k] = (v as any).clone();
                else if (Array.isArray(v)) clean[k] = JSON.parse(JSON.stringify(v));
                else clean[k] = { ...v };
            } else {
                clean[k] = v;
            }
        }
        cfg[feat.id] = clean;
    }

    return cfg as ShaderConfig;
}
