
// GMT Shader Compiler profiles — the app-specific DATA for the engine-core
// Shader Compiler system (engine-core owns the mechanism; this registers GMT's
// switch subsystems + profiles). The subsystem defs name GMT feature params
// (lighting.shadowAlgorithm, reflections.reflectionMode, …) so they live here,
// not in engine-core. Registered via `registerGmtShaderCompilerProfiles()` from
// app-gmt/registerFeatures.ts, BEFORE createEngineStore().
// @see docs/adr/0079-shader-compiler-profile-seam.md
//
// User-facing name: "Viewport Quality" (the topbar dropdown). The switches it
// flips are baked into the shader at compile time (recompile + wait) vs runtime
// sliders. Per-switch COST lives on the feature params' `estCompileMs`
// annotations (features/*) — the single source the estimator sums; tiers carry
// only the OVERRIDES + an optional non-per-param adjustment (the Preview strip).

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
        },
        {
            // Lite soft (shadowAlgorithm 1.0) — step-floored march. MEASURED ~2×
            // faster than Hard (2026-06-20: ~2.1–3.0ms vs Hard ~4.8–5.9ms @1280×720
            // Mandelbulb) AND it has a penumbra, so it dominates Hard on both speed
            // and looks. The old "Hard" tier was dropped as redundant; Hard
            // (shadowAlgorithm 2.0, crisp/binary) stays a manual shadowAlgorithm
            // option for the sharp-shadow aesthetic. The jitter ALU is compiled in
            // with the march (runtime "Shadow Jitter" uAreaLights toggle).
            label: 'Soft',
            overrides: {
                lighting: { shadows: true, shadowsCompile: true, shadowAlgorithm: 1.0 },
            },
        },
        {
            // Robust soft (shadowAlgorithm 0.0) — analytic IQ+Aaltonen penumbra,
            // the accurate (slowest) option.
            label: 'Soft HQ',
            overrides: {
                lighting: { shadows: true, shadowsCompile: true, shadowAlgorithm: 0.0 },
            },
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
        },
        {
            label: 'Env Map',
            overrides: { reflections: { reflectionMode: 1.0, bounceShadows: false } },
        },
        {
            label: 'Raymarched',
            overrides: { reflections: { reflectionMode: 3.0, bounceShadows: false, bounces: 1 } },
        },
        {
            label: 'Full',
            overrides: { reflections: { reflectionMode: 3.0, bounceShadows: true, bounces: 2 } },
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
            // Non-per-param adjustment: stripping advancedLighting drops the whole
            // PBR/shading pipeline (~2.5s) that BASE_COMPILE_MS bakes in — the
            // per-param model can't express it, so it lives here. @see ADR-0079.
            estCompileMs: -2500,
        },
        {
            label: 'Path Traced',
            overrides: { lighting: { specularModel: 1.0, ptEnabled: true, advancedLighting: true, ptNEEAllLights: false, ptEnvNEE: false } },
        },
        {
            // NEE may not provide visible benefit — needs further research.
            label: 'PT + NEE',
            overrides: { lighting: { specularModel: 1.0, ptEnabled: true, advancedLighting: true, ptNEEAllLights: true, ptEnvNEE: true } },
        },
    ],
};

// Path Tracer quality — the PT analogue of SUBSYSTEM_REFLECTIONS (which is the
// Direct-render reflection tier). Active only when PT is the render mode; dims
// in Direct (mirror of how the 'direct' subsystems dim in PT). Each tier bundles
// the PT-specific compile switches so picking one tier sets up a complete PT
// look. Placed LAST in ALL_SUBSYSTEMS so its lighting overrides win over
// SUBSYSTEM_LIGHTING's (single owner of ptNEEAllLights in PT).
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
        },
        {
            // Env MIS+IS (importance sampling for HDR sun discs) + area lights +
            // NEE. The full-quality PT look.
            label: 'Full',
            overrides: {
                // Shadow params owned solely by SUBSYSTEM_SHADOWS (see Balanced note).
                lighting: {
                    ptReflMode: 2.0, ptAreaLights: true, ptNEEAllLights: true, ptSobolBounce: true,
                },
            },
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
        },
        {
            label: 'Fast Glow',
            overrides: {
                atmosphere: { glowEnabled: true, glowQuality: 1.0 },
                volumetric: { ptVolumetric: false },
            },
        },
        {
            label: 'Color Glow',
            overrides: {
                atmosphere: { glowEnabled: true, glowQuality: 0.0 },
                volumetric: { ptVolumetric: false },
            },
        },
        {
            label: 'Volumetric',
            overrides: {
                atmosphere: { glowEnabled: true, glowQuality: 0.0 },
                volumetric: { ptVolumetric: true },
            },
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
        // Highest FPS that still has shadows (it's the VJ preset — shadows are
        // wanted). Uses Lite soft shadows (the measured-fastest shadow, ~2× Hard),
        // no reflection march, no glow. Keeps full PBR lighting + the path-tracer
        // capability (ptEnabled, free in Direct). Preview is the bare/instant one;
        // this is the fast-but-lit-with-shadows one. Compile time ≈ the others
        // (that's fine — the differentiation here is FPS, not compile).
        description: 'Highest FPS — Lite soft shadows, no reflections / glow.',
        subsystems: {
            shadows: 1,              // Soft (Lite) — fastest shadow, ~2× faster than Hard
            reflections: 0,          // Off
            lighting_quality: 1,     // Path Traced (PBR + ptEnabled capability)
            atmosphere_quality: 0,   // Off
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

/** Default scalability state (desktop) — Balanced. Referenced by id (not index)
 *  so preset list edits (e.g. removing 'lite') don't silently shift the default. */
export const DEFAULT_SCALABILITY: ScalabilityState = {
    activePreset: 'balanced',
    subsystems: { ...(SCALABILITY_PRESETS.find(p => p.id === 'balanced')!.subsystems) },
    isCustomized: false,
};

/** Register GMT's compile-switch subsystems + profiles into the engine-core
 *  Shader Compiler system. MUST be called before createEngineStore() (the
 *  scalability slice seeds its state from getDefaultScalability() at construction). */
export function registerGmtShaderCompilerProfiles(): void {
    registerShaderCompilerProfiles({
        subsystems: ALL_SUBSYSTEMS,
        presets: SCALABILITY_PRESETS,
        default: DEFAULT_SCALABILITY,
    });
}
