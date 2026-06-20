
// Centralized definition for Engine Quality Profiles
// This ensures Startup Logic and Runtime Switching use identical settings.
//
// Compile time estimates (Windows/ANGLE/fxc):
//   Fastest: ~3-4s | Lite: ~5-6s | Balanced: ~7-8s | Ultra: ~17s+
//
// estCompileMs annotations recalibrated against measured cold data (L6 2026-06-19;
// ptEnabled re-measured 2026-06-20) — see docs/policy/shader-compile-optimization.md
// §2.5. The per-switch numbers live on the feature params (features/*), not here.
// BASE_COMPILE_MS (3600) is the calibrated core-trace cost after the ADR-0076/0077
// trace-template work; the engine-core tier estimator (types/viewport.ts) shares
// this BASE so its preview agrees with this live estimate.
// @see docs/adr/0079-compile-system-profile-seam.md (the unified "Compile" system)

export const ENGINE_PROFILES = {
    fastest: {
        lighting: {
            shadows: false,
            shadowsCompile: false,
            ptEnabled: false,
            specularModel: 0.0,     // Blinn-Phong
        },
        ao: {
            aoEnabled: false,
            aoStochasticCp: false
        },
        geometry: {
            hybridComplex: false,
            preRotMaster: false,
            preRotEnabled: false
        },
        reflections: {
            enabled: true,
            reflectionMode: 0.0,    // Off
            bounceShadows: false,
        },
        quality: {
            precisionMode: 1.0,
            bufferPrecision: 1.0,
            compilerHardCap: 128
        },
        atmosphere: {
            glowEnabled: false
        }
    },
    lite: {
        lighting: {
            shadows: true,
            shadowsCompile: true,
            shadowAlgorithm: 2.0,   // Hard Only (fastest shadow)
            shadowSteps: 32,
            ptStochasticShadows: false,
            areaLights: true,
            shadowSoftness: 16.0,
            ptEnabled: false,
            specularModel: 0.0,     // Blinn-Phong
        },
        ao: {
            aoEnabled: true,
            aoSamples: 2,
            aoStochasticCp: false,
            aoMode: false,
            aoMaxSamples: 16
        },
        geometry: {
            hybridComplex: false,
            preRotMaster: false,
            preRotEnabled: false
        },
        reflections: {
            enabled: true,
            reflectionMode: 1.0,    // Environment Map
            bounceShadows: false,
        },
        quality: {
            precisionMode: 1.0,
            bufferPrecision: 1.0,
        },
        atmosphere: {
            glowQuality: 1.0
        }
    },
    balanced: {
        lighting: {
            shadows: true,
            shadowsCompile: true,
            shadowAlgorithm: 0.0,   // Robust Soft
            shadowSoftness: 16.0,
            ptStochasticShadows: true,  // Area lights compiled
            areaLights: true,
            shadowSteps: 64,
            ptEnabled: false,
            specularModel: 0.0,     // Blinn-Phong
        },
        ao: {
            aoEnabled: true,
            aoSamples: 5,
            aoStochasticCp: true,
            aoMode: true,
            aoMaxSamples: 32
        },
        geometry: {
            hybridComplex: false,
            preRotMaster: true,
            preRotEnabled: true
        },
        reflections: {
            enabled: true,
            reflectionMode: 1.0,    // Environment Map
            bounceShadows: false,
        },
        quality: {
            precisionMode: 0.0,
            bufferPrecision: 0.0,
        },
        atmosphere: {
            glowQuality: 0.0
        }
    },
    ultra: {
        lighting: {
            shadows: true,
            shadowsCompile: true,
            shadowAlgorithm: 0.0,   // Robust Soft
            shadowSoftness: 64.0,
            ptStochasticShadows: true,
            areaLights: true,
            shadowSteps: 256,
            ptEnabled: true,
            specularModel: 1.0,     // Cook-Torrance
        },
        ao: {
            aoEnabled: true,
            aoSamples: 8,
            aoStochasticCp: true,
            aoMode: true,
            aoMaxSamples: 64
        },
        reflections: {
            enabled: true,
            reflectionMode: 3.0,    // Raymarched
            bounceShadows: true,
            steps: 64,
            bounces: 2
        },
        geometry: {
            hybridComplex: true,
            preRotMaster: true,
            preRotEnabled: true
        },
        quality: {
            precisionMode: 0.0,
            bufferPrecision: 0.0,
        },
        atmosphere: {
            glowQuality: 0.0
        }
    }
};

import { featureRegistry, type ParamConfig, type ParamOption } from '../../engine/FeatureSystem';

/**
 * Estimate total shader compile time (ms) from current engine state.
 * Uses estCompileMs annotations on feature params.
 * Base cost (~4200ms) covers the core trace + shading pipeline.
 */
export const estimateCompileTime = (state: any): number => {
    // Core shader without optional features. Session-4 trace-template work cut the
    // always-present march code: 4200→3900 (ADR-0076: refine→mapDist + recovery
    // reuse) →3600 (ADR-0077: Edge Polish + Step Relaxation removed — the refine
    // loop is gone entirely). These are Direct-measurable core-trace savings; the
    // PT-baseline drop is larger (the same trace code lives in traceSceneLean too)
    // but is a PT-only effect the per-toggle model can't separately represent.
    // @see docs/policy/shader-compile-optimization.md §8 L5 (session 4)
    const BASE_COMPILE_MS = 3600;
    let total = BASE_COMPILE_MS;

    for (const feat of featureRegistry.getAll()) {
        const slice = state[feat.id];
        if (!slice) continue;

        for (const [paramKey, paramConfig] of Object.entries(feat.params)) {
            const pc = paramConfig as ParamConfig;
            if (!pc.onUpdate || pc.onUpdate !== 'compile') continue;

            const value = slice[paramKey];

            // Boolean params: add estCompileMs when truthy
            if (pc.type === 'boolean' && value && pc.estCompileMs) {
                total += pc.estCompileMs;
            }

            // Dropdown params: find the matching option's estCompileMs
            if (pc.options) {
                const match = pc.options.find((o: ParamOption) => {
                    if (typeof o.value === 'number' && typeof value === 'number') {
                        return Math.abs(o.value - value) < 0.001;
                    }
                    return o.value === value;
                });
                if (match?.estCompileMs) {
                    total += match.estCompileMs;
                }
            }
        }
    }

    return total;
};

export const detectEngineProfile = (state: any): string => {
    for (const [name, profile] of Object.entries(ENGINE_PROFILES)) {
        let match = true;
        for (const [featureId, params] of Object.entries(profile)) {
            const slice = state[featureId];
            if (!slice) { match = false; break; }
            
            for (const [key, val] of Object.entries(params)) {
                const currentVal = (slice as Record<string, unknown>)[key];
                if (typeof val === 'number' && typeof currentVal === 'number') {
                     // Fuzzy match for floats
                     if (Math.abs(val - currentVal) > 0.001) { match = false; break; }
                } else if (val !== currentVal) {
                    match = false; break;
                }
            }
            if (!match) break;
        }
        if (match) return name;
    }
    return 'custom';
};
