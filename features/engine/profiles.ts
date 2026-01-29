
// Centralized definition for Engine Quality Profiles
// This ensures Startup Logic and Runtime Switching use identical settings.

export const ENGINE_PROFILES = {
    fastest: {
        lighting: { 
            shadows: false, 
            shadowsCompile: false, // Disable Shadow Engine
            ptEnabled: false,      // Disable PT Engine
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
            enabled: false 
        },
        quality: { 
            precisionMode: 1.0, 
            bufferPrecision: 1.0, 
            // detail: 0.25, // Removed to allow formula-specific artistic overrides
            compilerHardCap: 128
        },
        atmosphere: { 
            glowEnabled: false 
        }
    },
    lite: {
        lighting: { 
            shadows: true, 
            shadowAlgorithm: 1.0, // Fast
            shadowSteps: 16,      // Matches Mobile Header Description
            ptStochasticShadows: false,
            shadowSoftness: 16.0,
            ptEnabled: false      // Disable Path Tracing Core
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
            preRotMaster: false,  // Disable Rotation Logic (Performance)
            preRotEnabled: false
        },
        reflections: { 
            enabled: false 
        },
        quality: { 
            precisionMode: 1.0, // Standard (1.0)
            bufferPrecision: 1.0, // HalfFloat (1.0)
            // detail: 0.5, // Removed to allow formula-specific artistic overrides
        },
        atmosphere: { 
            glowQuality: 1.0 // Fast Glow
        }
    },
    balanced: {
        lighting: { 
            shadows: true, 
            shadowAlgorithm: 0.0, // Robust
            shadowSoftness: 16.0, 
            ptStochasticShadows: false, 
            shadowSteps: 128 
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
            steps: 32, 
            bounces: 1 
        },
        quality: { 
            precisionMode: 0.0, // High
            bufferPrecision: 0.0, // Float32
            // detail: 1.0, // Removed
        },
        atmosphere: { 
            glowQuality: 0.0 // Accurate Glow
        }
    },
    ultra: {
        lighting: { 
            shadows: true, 
            shadowAlgorithm: 0.0, 
            shadowSoftness: 64.0, 
            ptStochasticShadows: true, 
            shadowSteps: 256 
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
            // detail: 1.0 // Removed
        },
        atmosphere: { 
            glowQuality: 0.0 
        }
    }
};

export const detectEngineProfile = (state: any): string => {
    for (const [name, profile] of Object.entries(ENGINE_PROFILES)) {
        let match = true;
        for (const [featureId, params] of Object.entries(profile)) {
            const slice = state[featureId];
            if (!slice) { match = false; break; }
            
            for (const [key, val] of Object.entries(params)) {
                // @ts-ignore
                const currentVal = slice[key];
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
