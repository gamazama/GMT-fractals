
// Viewport Quality System — Per-subsystem scalability tiers
//
// The store always holds the user's full-quality authored intent.
// The viewport quality layer applies non-destructive overrides at
// getShaderConfigFromState() to control what actually compiles.
//
// Three layers:
//   1. Authored state (Zustand store)
//   2. Subsystem tier overrides (this system)
//   3. Hardware caps (device physical limits)

// ─── Core Types ──────────────────────────────────────────────

/** A single quality level within a rendering subsystem */
export interface SubsystemTierDef {
    label: string;
    /** Sparse override map: featureId → { param → value } */
    overrides: Record<string, Record<string, any>>;
    /** Estimated compile time contribution (ms) for this tier */
    estCompileMs: number;
}

/** A rendering subsystem with ordered quality tiers */
export interface SubsystemDefinition {
    id: string;
    label: string;
    /** Ordered from cheapest (index 0) to most expensive */
    tiers: SubsystemTierDef[];
    /** Params this subsystem controls — "featureId.paramKey" paths */
    controlledParams: string[];
    /** Only show in advanced mode */
    isAdvanced?: boolean;
    /** If set, this subsystem only affects the specified render path */
    renderContext?: 'direct' | 'pathtracer';
}

/** A named master preset that sets all subsystem tiers at once */
export interface ScalabilityPreset {
    id: string;
    label: string;
    description: string;
    /** Per-subsystem tier index */
    subsystems: Record<string, number>;
    /** Only show in advanced mode */
    isAdvanced?: boolean;
}

/** Active viewport quality state */
export interface ScalabilityState {
    /** Named preset last applied, or null if set individually */
    activePreset: string | null;
    /** Per-subsystem tier index */
    subsystems: Record<string, number>;
    /** True if any subsystem deviates from activePreset */
    isCustomized: boolean;
}

/** Device capability profile, detected at boot */
export interface HardwareProfile {
    tier: 'low' | 'mid' | 'high';
    isMobile: boolean;
    supportsFloat32: boolean;
    caps: {
        precisionMode: number;      // 0=High, 1=Standard
        bufferPrecision: number;    // 0=Float32, 1=HalfFloat16
        compilerHardCap: number;    // device max loop iterations
    };
}

// ─── Subsystem Definitions ──────────────────────────────────

export const SUBSYSTEM_SHADOWS: SubsystemDefinition = {
    id: 'shadows',
    label: 'Shadows',
    renderContext: 'direct',
    controlledParams: [
        'lighting.shadowsCompile',
        'lighting.shadowAlgorithm',
        'lighting.ptStochasticShadows',
    ],
    tiers: [
        {
            label: 'Off',
            overrides: {
                lighting: { shadows: false, shadowsCompile: false, ptStochasticShadows: false },
            },
            estCompileMs: 0,
        },
        {
            label: 'Hard',
            overrides: {
                lighting: { shadows: true, shadowsCompile: true, shadowAlgorithm: 2.0, ptStochasticShadows: false },
            },
            estCompileMs: 300,   // L6: measured ~250-425 cold (§2.6); was 500
        },
        {
            // Analytic IQ penumbra + the jitter ALU compiled in, so "Shadow Jitter"
            // (areaLights) is a RUNTIME toggle within this tier — there is no longer
            // a separate compile tier for jittered shadows. This collapsed the old
            // "Full" tier: once areaLights became a runtime uniform, jitter stopped
            // being a compile distinction (the ALU is ~70ms, sub-noise). Tiers no
            // longer set areaLights — it persists as the user's runtime toggle.
            label: 'Soft',
            overrides: {
                lighting: { shadows: true, shadowsCompile: true, shadowAlgorithm: 0.0, ptStochasticShadows: true },
            },
            estCompileMs: 400,   // Robust soft + jitter ALU (~70ms over plain soft, sub-noise; §2.6)
        },
    ],
};

export const SUBSYSTEM_REFLECTIONS: SubsystemDefinition = {
    id: 'reflections',
    label: 'Reflections (Direct)',
    renderContext: 'direct',
    controlledParams: [
        'reflections.reflectionMode',
        'reflections.bounceShadows',
        'reflections.bounces',
    ],
    tiers: [
        {
            label: 'Off',
            overrides: { reflections: { reflectionMode: 0.0, bounceShadows: false } },
            estCompileMs: 0,
        },
        {
            label: 'Env Map',
            overrides: { reflections: { reflectionMode: 1.0, bounceShadows: false } },
            estCompileMs: 0,
        },
        {
            label: 'Raymarched',
            overrides: { reflections: { reflectionMode: 3.0, bounceShadows: false, bounces: 1 } },
            estCompileMs: 1500,  // L6: measured ~1500-2000 cold (§2.6.1); was 7500 (~4x high)
        },
        {
            label: 'Full',
            overrides: { reflections: { reflectionMode: 3.0, bounceShadows: true, bounces: 2 } },
            estCompileMs: 1600,  // L6: bounceShadows is ~free (+42ms); was 12000 (~7x high) (§2.6)
        },
    ],
};

export const SUBSYSTEM_LIGHTING: SubsystemDefinition = {
    id: 'lighting_quality',
    label: 'Lighting',
    isAdvanced: true,
    controlledParams: [
        'lighting.specularModel',
        'lighting.ptEnabled',
        'lighting.ptNEEAllLights',
        'lighting.ptEnvNEE',
    ],
    tiers: [
        {
            // Preview-only: strips advanced lighting for instant compile.
            // Used by the Preview preset — not normally selectable standalone.
            label: 'Preview',
            overrides: { lighting: { advancedLighting: false, ptEnabled: false } },
            estCompileMs: -2500,  // Saves ~2.5s by stripping PBR/shading pipeline
        },
        {
            label: 'Path Traced',
            overrides: { lighting: { specularModel: 1.0, ptEnabled: true, advancedLighting: true, ptNEEAllLights: false, ptEnvNEE: false } },
            estCompileMs: 1900,
        },
        {
            // NEE may not provide visible benefit — needs further research.
            label: 'PT + NEE',
            overrides: { lighting: { specularModel: 1.0, ptEnabled: true, advancedLighting: true, ptNEEAllLights: true, ptEnvNEE: true } },
            estCompileMs: 2500,
        },
    ],
};

// Path Tracer quality — the PT analogue of SUBSYSTEM_REFLECTIONS (which is the
// Direct-render reflection tier). Active only when PT is the render mode; dims
// in Direct (mirror of how the 'direct' subsystems dim in PT). Each tier bundles
// the PT-specific compile switches + max shadows so picking one tier sets up a
// complete PT look. Placed LAST in ALL_SUBSYSTEMS so its lighting overrides win
// over SUBSYSTEM_LIGHTING's (single owner of ptNEEAllLights in PT).
//
// Cost basis: docs/policy/shader-compile-optimization.md §2.5 (per-switch map).
// Only THREE PT switches are >1s: the PT module itself and the two Env-sampling
// modes. So Balanced (no Env MIS) is cheap; Full adds Env MIS+IS (+~1.7s) and
// area lights (+~0.4s). NEE / Sobol / shadow-tier are all sub-second.
export const SUBSYSTEM_PATHTRACER: SubsystemDefinition = {
    id: 'pathtracer',
    label: 'Path Tracer',
    renderContext: 'pathtracer',
    controlledParams: [
        'lighting.ptReflMode',
        'lighting.ptAreaLights',
        'lighting.ptNEEAllLights',
    ],
    tiers: [
        {
            // NEE + max shadows. Env still REFLECTS (bounce rays hit the sky);
            // reflMode 0 just drops the env MIS/importance-sampling — cheap, and
            // the only visible loss is slower convergence on bright sun discs.
            label: 'Balanced',
            overrides: {
                lighting: {
                    ptReflMode: 0.0, ptAreaLights: false, ptNEEAllLights: true, ptSobolBounce: true,
                    // Shadow march config. "Shadow Jitter" (areaLights) is a RUNTIME
                    // toggle now, so tiers don't set it — it persists across presets.
                    shadows: true, shadowsCompile: true, shadowAlgorithm: 0.0, ptStochasticShadows: true,
                },
            },
            estCompileMs: 100,   // NEE (~80) only; shadows counted by SUBSYSTEM_SHADOWS
        },
        {
            // Env MIS+IS (importance sampling for HDR sun discs) + area lights +
            // NEE + max shadows. The full-quality PT look.
            label: 'Full',
            overrides: {
                lighting: {
                    ptReflMode: 2.0, ptAreaLights: true, ptNEEAllLights: true, ptSobolBounce: true,
                    // Shadow march config. "Shadow Jitter" (areaLights) is a RUNTIME
                    // toggle now, so tiers don't set it — it persists across presets.
                    shadows: true, shadowsCompile: true, shadowAlgorithm: 0.0, ptStochasticShadows: true,
                },
            },
            estCompileMs: 2200,  // Env MIS+IS (~1700) + area lights (~400) + NEE (~80)
        },
    ],
};

export const SUBSYSTEM_ATMOSPHERE: SubsystemDefinition = {
    id: 'atmosphere_quality',
    label: 'Atmosphere',
    controlledParams: [
        'atmosphere.glowEnabled',
        'atmosphere.glowQuality',
        'volumetric.ptVolumetric',
    ],
    tiers: [
        {
            label: 'Off',
            overrides: {
                atmosphere: { glowEnabled: false },
                volumetric: { ptVolumetric: false },
            },
            estCompileMs: 0,
        },
        {
            label: 'Fast Glow',
            overrides: {
                atmosphere: { glowEnabled: true, glowQuality: 1.0 },
                volumetric: { ptVolumetric: false },
            },
            estCompileMs: 650,   // L6: Fast Glow measured +635/774 — costs MORE than Color (§2.6); was 200
        },
        {
            label: 'Color Glow',
            overrides: {
                atmosphere: { glowEnabled: true, glowQuality: 0.0 },
                volumetric: { ptVolumetric: false },
            },
            estCompileMs: 200,   // L6: Color Glow measured +205/198 (§2.6); was 400
        },
        {
            label: 'Volumetric',
            overrides: {
                atmosphere: { glowEnabled: true, glowQuality: 0.0 },
                volumetric: { ptVolumetric: true },
            },
            estCompileMs: 5900,
        },
    ],
};

/** All subsystems in display order */
export const ALL_SUBSYSTEMS: SubsystemDefinition[] = [
    SUBSYSTEM_SHADOWS,
    SUBSYSTEM_REFLECTIONS,
    SUBSYSTEM_LIGHTING,
    SUBSYSTEM_ATMOSPHERE,
    // LAST: its lighting overrides (ptReflMode/ptAreaLights/ptNEEAllLights) win
    // over SUBSYSTEM_LIGHTING's in the applyTierOverrides merge (last-assign-wins).
    SUBSYSTEM_PATHTRACER,
];

// ─── Master Presets ─────────────────────────────────────────
// These replace ENGINE_PROFILES as the user-facing quality bundles.
// They set all subsystem tiers at once. Users can override individual
// subsystems, which marks the state as "customized."

export const SCALABILITY_PRESETS: ScalabilityPreset[] = [
    {
        id: 'preview',
        label: 'Preview',
        description: 'Instant preview shader — navigate without waiting for compile.',
        subsystems: {
            shadows: 0,              // Off
            reflections: 0,          // Off
            lighting_quality: 0,     // Preview (no advanced lighting)
            atmosphere_quality: 0,   // Off
            pathtracer: 0,           // Balanced (inert until PT mode active)
        },
    },
    {
        id: 'fastest',
        label: 'Fastest',
        description: 'Hard shadows, path traced lighting with fast glow.',
        subsystems: {
            shadows: 1,              // Hard
            reflections: 0,          // Off
            lighting_quality: 1,     // Path Traced
            atmosphere_quality: 1,   // Fast Glow
            pathtracer: 0,           // Balanced
        },
    },
    {
        id: 'lite',
        label: 'Lite',
        description: 'Soft shadows, env map reflections, color glow.',
        subsystems: {
            shadows: 2,              // Soft
            reflections: 1,          // Env Map
            lighting_quality: 1,     // Path Traced
            atmosphere_quality: 2,   // Color Glow
            pathtracer: 0,           // Balanced
        },
    },
    {
        id: 'balanced',
        label: 'Balanced',
        description: 'Soft shadows, env map reflections, color glow.',
        subsystems: {
            shadows: 2,              // Soft
            reflections: 1,          // Env Map
            lighting_quality: 1,     // Path Traced
            atmosphere_quality: 2,   // Color Glow
            pathtracer: 0,           // Balanced (PT: NEE + max shadows)
        },
    },
    {
        id: 'full',
        label: 'Full',
        description: 'Soft shadows, raymarched reflections, volumetric.',
        subsystems: {
            shadows: 2,              // Soft
            reflections: 3,          // Full (raymarched + bounce shadows)
            lighting_quality: 1,     // Path Traced
            atmosphere_quality: 3,   // Volumetric
            pathtracer: 1,           // Full (PT: Env MIS+IS + area lights + NEE)
        },
    },
    {
        id: 'ultra',
        label: 'Ultra',
        description: 'Full + PT NEE. Experimental.',
        isAdvanced: true,
        subsystems: {
            shadows: 2,              // Soft
            reflections: 3,          // Full
            lighting_quality: 2,     // PT + NEE
            atmosphere_quality: 3,   // Volumetric
            pathtracer: 1,           // Full
        },
    },
];

/** Default scalability state (desktop) */
export const DEFAULT_SCALABILITY: ScalabilityState = {
    activePreset: 'balanced',
    subsystems: { ...SCALABILITY_PRESETS[3].subsystems },
    isCustomized: false,
};

// ─── Helpers ────────────────────────────────────────────────

/** Get a preset by ID */
export function getScalabilityPreset(id: string): ScalabilityPreset | undefined {
    return SCALABILITY_PRESETS.find(p => p.id === id);
}

/** Check if subsystem tiers match a named preset */
export function detectScalabilityPreset(subsystems: Record<string, number>): string | null {
    for (const preset of SCALABILITY_PRESETS) {
        const match = Object.keys(preset.subsystems).every(
            k => preset.subsystems[k] === subsystems[k]
        );
        if (match) return preset.id;
    }
    return null;
}

/** Build a human-readable label for current scalability state */
export function getScalabilityLabel(state: ScalabilityState): string {
    if (!state.activePreset) return 'Custom';
    const preset = getScalabilityPreset(state.activePreset);
    if (!preset) return 'Custom';
    if (!state.isCustomized) return preset.label;

    // Build override description
    const overrides: string[] = [];
    for (const sub of ALL_SUBSYSTEMS) {
        const presetTier = preset.subsystems[sub.id];
        const actualTier = state.subsystems[sub.id];
        if (presetTier !== actualTier) {
            const tierDef = sub.tiers[actualTier];
            overrides.push(`${sub.label}=${tierDef?.label ?? '?'}`);
        }
    }
    return `${preset.label} (${overrides.join(', ')})`;
}

/** Estimate compile time for a given scalability + authored state.
 *  Uses subsystem tier costs + the existing DDFS-based estimator for creative params. */
export const BASE_COMPILE_MS = 4200;

export function estimateScalabilityCompileTime(subsystems: Record<string, number>): number {
    let total = BASE_COMPILE_MS;
    for (const sub of ALL_SUBSYSTEMS) {
        const tierIndex = subsystems[sub.id] ?? 0;
        const tier = sub.tiers[tierIndex];
        if (tier) total += tier.estCompileMs;
    }
    return total;
}
