
// Compile system — per-subsystem compile-switch tiers ("Viewport Quality")
//
// The "Compile" system governs which features are baked into the shader at
// compile time (each change costs a recompile + wait), as opposed to runtime
// sliders. This module is the GENERIC MECHANISM only — the interfaces, the
// app-registered profile seam, and the helpers/estimator. The actual switch
// subsystems + profiles are GMT-specific DATA and are registered by the app
// (engine-gmt) via `registerShaderCompilerProfiles()` before `createEngineStore()`.
// @see docs/adr/0079-shader-compiler-profile-seam.md
//
// How tiers reach the shader:
//   1. Authored state (Zustand store) — the user's full-quality intent.
//   2. Tier overrides — `scalabilitySlice.applyTierOverrides` writes each
//      tier's `overrides` through the matching `set${Feature}` setter. These
//      are DESTRUCTIVE store writes, applied only on explicit preset/tier
//      selection (NOT at boot). (The old "non-destructive at
//      getShaderConfigFromState" model is gone.)
//   3. Hardware caps (device physical limits).

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
    /** Optional compile-time ADJUSTMENT (ms) for costs the per-param model can't
     *  express (e.g. a tier that strips the PBR pipeline). The bulk of the
     *  estimate comes from the per-param `estCompileMs` annotations summed over
     *  this tier's overrides — see estimateShaderCompilerCompileTime in
     *  engine-gmt/features/engine/profiles.ts. Default 0. @see docs/adr/0079 */
    estCompileMs?: number;
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

// ─── App-registered Compile profiles (the seam) ──────────────
//
// Engine-core owns the mechanism; the app registers the actual switch
// subsystems + profiles. The subsystem defs name app-specific feature params
// (GMT: lighting.shadowAlgorithm, reflections.reflectionMode, …) so they MUST
// NOT live in engine-core — they arrive here via registration, the same way
// formulas/resolvers/features do. Register BEFORE `createEngineStore()`
// (alongside `featureRegistry.register`); the scalability slice seeds its
// initial state from `getDefaultScalability()` at store-construction time, so a
// late registration leaves the quality UI inert.
// @see docs/adr/0079-shader-compiler-profile-seam.md

let _subsystems: SubsystemDefinition[] = [];
let _presets: ScalabilityPreset[] = [];
let _defaultScalability: ScalabilityState = { activePreset: null, subsystems: {}, isCustomized: false };

export interface ShaderCompilerProfileConfig {
    subsystems: SubsystemDefinition[];
    presets: ScalabilityPreset[];
    /** Initial scalability state (which preset/tiers are selected at boot). */
    default?: ScalabilityState;
}

/** App registers its compile-switch subsystems + profiles (call before createEngineStore). */
export function registerShaderCompilerProfiles(cfg: ShaderCompilerProfileConfig): void {
    _subsystems = cfg.subsystems;
    _presets = cfg.presets;
    if (cfg.default) _defaultScalability = cfg.default;
}

export const getShaderCompilerSubsystems = (): SubsystemDefinition[] => _subsystems;
export const getShaderCompilerPresets = (): ScalabilityPreset[] => _presets;
export const getDefaultScalability = (): ScalabilityState => _defaultScalability;

// ─── Helpers ────────────────────────────────────────────────

/** Get a preset by ID */
export function getScalabilityPreset(id: string): ScalabilityPreset | undefined {
    return getShaderCompilerPresets().find(p => p.id === id);
}

/** Check if subsystem tiers match a named preset */
export function detectScalabilityPreset(subsystems: Record<string, number>): string | null {
    for (const preset of getShaderCompilerPresets()) {
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
    for (const sub of getShaderCompilerSubsystems()) {
        const presetTier = preset.subsystems[sub.id];
        const actualTier = state.subsystems[sub.id];
        if (presetTier !== actualTier) {
            const tierDef = sub.tiers[actualTier];
            overrides.push(`${sub.label}=${tierDef?.label ?? '?'}`);
        }
    }
    return `${preset.label} (${overrides.join(', ')})`;
}

// The compile-time ESTIMATOR lives in engine-gmt/features/engine/profiles.ts
// (`estimateShaderCompilerCompileTime`) — it needs featureRegistry to sum the
// per-param `estCompileMs` annotations, the single source of per-switch cost
// truth, so it can't live in this engine-core leaf module. @see ADR-0079.
