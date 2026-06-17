/**
 * Shared helper for building a fresh ShaderConfig from feature-registry defaults.
 *
 * Single source of truth for "start from scratch" config construction.
 * Used by the engine constructor and by any tooling (test harnesses,
 * verification scripts) that needs a clean config seed. Prior to extraction
 * this iteration was duplicated across several call sites; any feature-
 * registry shape change now only needs updating here.
 */

import { featureRegistry } from './FeatureSystem';
import type { ShaderConfig } from './ShaderFactory';
import { DEFAULT_HARD_CAP } from '../data/constants';

/**
 * Builds a fresh ShaderConfig seeded from the feature registry's default
 * param values. Apps pass their own formula identifier (or omit entirely
 * for an app that has no formula concept).
 *
 * Engine-level defaults are kept to the bare minimum; everything else
 * comes from the feature registry, making this factory data-driven.
 */
export function createDefaultShaderConfig(formulaId?: string): ShaderConfig {
    const cfg: any = {
        pipelineRevision: 0,
        msaaSamples: 1,
        previewMode: false,
        compilerHardCap: DEFAULT_HARD_CAP,
    };
    if (formulaId !== undefined) cfg.formula = formulaId;

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
