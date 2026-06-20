
// GMT Compile profiles — the app-specific DATA for the engine-core "Compile"
// system (engine-core owns the mechanism; this registers GMT's switch
// subsystems + profiles). The subsystem defs name GMT feature params
// (lighting.shadowAlgorithm, reflections.reflectionMode, …) so they live here,
// not in engine-core. Registered via `registerGmtShaderCompilerProfiles()` from
// app-gmt/registerFeatures.ts, BEFORE createEngineStore().
// @see docs/adr/0079-compile-system-profile-seam.md
//
// User-facing name: "Viewport Quality" (the topbar dropdown). The switches it
// flips are baked into the shader at compile time (recompile + wait) vs runtime
// sliders. estCompileMs values: docs/policy/shader-compile-optimization.md
// §2.5/§2.6 (L6) + the 2026-06-20 re-measure.

import type { SubsystemDefinition, ScalabilityPreset, ScalabilityState } from '../../types/viewport';
import { registerShaderCompilerProfiles } from '../../types/viewport';

// ─── Subsystem Definitions ──────────────────────────────────

export const SUBSYSTEM_SHADOWS: SubsystemDefinition = {
    id: 'shadows',
    label: 'Shadows',
    renderContext: 'direct',
    controlledParams: [
        'lighting.shadowsCompile',
        'lighting.shadowAlgorithm',
    ],
    tiers: [
        {
            label: 'Off',
            overrides: {
                lighting: { shadows: false, shadowsCompile: false },
            },
            estCompileMs: 0,
        },
        {
            label: 'Hard',
            overrides: {
                lighting: { shadows: true, shadowsCompile: true, shadowAlgorithm: 2.0 },
            },
            estCompileMs: 300,   // 2026-06-20 re-measure: Hard march +267 cold (Mandelbulb §2.6)
        },
        {
            // Analytic IQ penumbra. The jitter ALU is compiled in unconditionally
            // with the shadow march now (every tier pays the ~44ms), so "Shadow
            // Jitter" (areaLights) is a RUNTIME toggle available at any tier ≥ Hard
            // — there is no separate compile tier for it. This collapsed the old
            // "Full" tier. Tiers no longer set areaLights — it persists as the
            // user's runtime toggle.
            label: 'Soft',
            overrides: {
                lighting: { shadows: true, shadowsCompile: true, shadowAlgorithm: 0.0 },
            },
            estCompileMs: 350,   // 2026-06-20 re-measure: Robust soft +304, +jitter ALU +44 = ~348 cold (§2.6)
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
                // Shadow params are owned solely by SUBSYSTEM_SHADOWS — the PT tier
                // must NOT set shadows/shadowsCompile/shadowAlgorithm or it clobbers
                // the shadow tier (pathtracer is last in the merge → last-assign-wins).
                lighting: {
                    ptReflMode: 0.0, ptAreaLights: false, ptNEEAllLights: true, ptSobolBounce: true,
                },
            },
            estCompileMs: 100,   // NEE (~80) only; shadows counted by SUBSYSTEM_SHADOWS
        },
        {
            // Env MIS+IS (importance sampling for HDR sun discs) + area lights +
            // NEE + max shadows. The full-quality PT look.
            label: 'Full',
            overrides: {
                // Shadow params owned solely by SUBSYSTEM_SHADOWS (see Balanced note).
                lighting: {
                    ptReflMode: 2.0, ptAreaLights: true, ptNEEAllLights: true, ptSobolBounce: true,
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
// User-facing quality bundles (the "Viewport Quality" dropdown). They set all
// subsystem tiers at once. Users can override individual subsystems, which marks
// the state as "customized."

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

/** Register GMT's compile-switch subsystems + profiles into the engine-core
 *  Compile system. MUST be called before createEngineStore() (the scalability
 *  slice seeds its state from getDefaultScalability() at construction time). */
export function registerGmtShaderCompilerProfiles(): void {
    registerShaderCompilerProfiles({
        subsystems: ALL_SUBSYSTEMS,
        presets: SCALABILITY_PRESETS,
        default: DEFAULT_SCALABILITY,
    });
}
