
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

// ─── Adaptive Resolution Config ─────────────────────────────
//
// Single source of truth for the @engine/viewport adaptive loop's
// configuration shape. Lives here (a leaf type module) so the store
// state shape and the plugin's installer signature can both reference
// it without an import cycle. See engine/AdaptiveResolution.ts for the
// algorithm and engine/plugins/Viewport.tsx for the installer.

export interface ViewportAdaptiveConfig {
    /** Master adaptive toggle. When false, qualityFraction stays at 1. */
    enabled: boolean;
    /** Target FPS the adaptive loop aims for. 0 = manual mode (uses
     *  interactionDownsample as a fixed factor). Typical: 30 for heavy
     *  apps (fractal raymarching), 45-60 for lighter ones. */
    targetFps: number;
    /** Floor for qualityFraction; ensures the app never drops below
     *  legibility. Typical: 0.25 (max scale 4x) to 0.4. */
    minQuality: number;
    /** Manual-mode fallback: qualityFraction when targetFps === 0.
     *  Typical: 0.5 = half-resolution. */
    interactionDownsample: number;
    /** Default hold duration multiplier for `holdAdaptive(durationMs?)`:
     *  when called with no argument, hold = activityGraceMs * 4.
     *  Note: the post-activity grace window itself is FPS-scaled inside
     *  engine/AdaptiveResolution.ts (1fps → 2s, 30fps+ → 100ms), so this
     *  field tunes hold duration only — not settling time. */
    activityGraceMs: number;
    /** When true, adaptive runs always — for apps with no idle state
     *  (live sims like fluid-toy). When false (default, GMT-style),
     *  adaptive settles to full-res when the mouse is on the canvas
     *  and the user hasn't interacted recently. */
    alwaysActive: boolean;
    /** When true, adaptive engages ONLY when the renderer's accumCount
     *  drops (= camera/param change actually invalidated the result).
     *  isInteracting and mouseOverCanvas no longer trigger adaptive on
     *  their own. Use for apps where the accumulator is the truth
     *  signal (e.g. fluid-toy, where dragging the vorticity slider
     *  shouldn't drop fractal resolution). */
    engageOnAccumOnly?: boolean;
}

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
            estCompileMs: 500,
        },
        {
            label: 'Soft',
            overrides: {
                lighting: { shadows: true, shadowsCompile: true, shadowAlgorithm: 0.0, ptStochasticShadows: false },
            },
            estCompileMs: 3000,
        },
        {
            label: 'Full',
            overrides: {
                lighting: { shadows: true, shadowsCompile: true, shadowAlgorithm: 0.0, ptStochasticShadows: true },
            },
            estCompileMs: 3800,
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
            estCompileMs: 7500,
        },
        {
            label: 'Full',
            overrides: { reflections: { reflectionMode: 3.0, bounceShadows: true, bounces: 2 } },
            estCompileMs: 12000,
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
            estCompileMs: 200,
        },
        {
            label: 'Color Glow',
            overrides: {
                atmosphere: { glowEnabled: true, glowQuality: 0.0 },
                volumetric: { ptVolumetric: false },
            },
            estCompileMs: 400,
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
        },
    },
    {
        id: 'fastest',
        label: 'Fastest',
        description: 'Path traced lighting with fast glow.',
        subsystems: {
            shadows: 0,              // Off
            reflections: 0,          // Off
            lighting_quality: 1,     // Path Traced
            atmosphere_quality: 1,   // Fast Glow
        },
    },
    {
        id: 'lite',
        label: 'Lite',
        description: 'Hard shadows, env map reflections, color glow.',
        subsystems: {
            shadows: 1,              // Hard
            reflections: 1,          // Env Map
            lighting_quality: 1,     // Path Traced
            atmosphere_quality: 2,   // Color Glow
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
        },
    },
    {
        id: 'full',
        label: 'Full',
        description: 'Full shadows, raymarched reflections, volumetric.',
        subsystems: {
            shadows: 3,              // Full
            reflections: 3,          // Full (raymarched + bounce shadows)
            lighting_quality: 1,     // Path Traced
            atmosphere_quality: 3,   // Volumetric
        },
    },
    {
        id: 'ultra',
        label: 'Ultra',
        description: 'Full + PT NEE. Experimental.',
        isAdvanced: true,
        subsystems: {
            shadows: 3,              // Full
            reflections: 3,          // Full
            lighting_quality: 2,     // PT + NEE
            atmosphere_quality: 3,   // Volumetric
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
