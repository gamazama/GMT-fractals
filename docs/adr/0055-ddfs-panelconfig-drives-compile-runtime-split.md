# ADR-0055: DDFS `panelConfig` drives the compile/runtime UI split

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/features/{geometry, volumetric, interlace}/index.ts`, `components/CompilableFeatureSection.tsx`

## Context

Several DDFS features have a HEAVYWEIGHT compile-time toggle (e.g. "Volumetric
scattering on/off" requires ~5500 ms of shader compile) paired with a
LIGHTWEIGHT runtime toggle (e.g. "show volumetrics this frame" is a uniform
flip with zero recompile cost). The UI must distinguish them so the user
understands which knobs require a recompile-pill confirmation and which take
effect instantly.

Hand-coding each panel's structure duplicates per-feature logic:

- Three first-party features today: geometry's Hybrid Box folds, volumetric
  scattering, interlace's secondary formula.
- Future features (water surfaces, atmospheric effects, etc.) will need the
  same pattern.

Alternatives considered:

- **Hand-coded panels per feature.** Already the situation we're moving
  away from; duplicates ~50 lines per feature.
- **One global "enable compile-toggle UI" flag** with hard-coded knowledge
  of which features have compile gates. Feature definitions don't drive
  their own UI shape — backwards.
- **A separate registry mapping `featureId -> { compileParam, runtimeToggle }`.**
  Splits state across two locations.

## Decision

Features expose `panelConfig` as a DDFS field on the `FeatureDefinition`:

```ts
panelConfig?: {
    compileParam: string;          // The param name that triggers recompile
    runtimeToggleParam: string;    // The runtime visibility/fade param
    compileSettingsParams: string[]; // Params hidden behind the compile gate
    runtimeGroup?: string;         // Runtime params group label
    label: string;
    compileMessage: string;        // Pill copy ("Apply changes?")
    helpId?: string;
}
```

`CompilableFeatureSection` (in engine-core's shared UI) reads `panelConfig`
and renders:

1. The recompile pill ("Apply changes? — N changes pending").
2. The compile-settings group, gated behind the compile toggle.
3. The runtime toggle.
4. The runtime params group.

Three first-party consumers today:

- Geometry's `hybridCompiled` (compile) + `hybridMode` (runtime) at
  `engine-gmt/features/geometry/index.ts:201-210`.
- Volumetric's `ptVolumetric` (compile, ~5500 ms) + `volEnabled` (runtime,
  instant) at `engine-gmt/features/volumetric/index.ts:39-45`.
- Interlace's `interlaceCompiled` (compile) + `interlaceEnabled` (runtime)
  at `engine-gmt/features/interlace/index.ts:132-139`.

## Consequences

- **Sliders on compile-gated settings re-render at runtime when the compile
  pill is unconfirmed, but the SHADER doesn't pick them up until the pill
  confirms.** This is confusing if the UI doesn't make it explicit. The
  pill copy ("Apply changes — N pending") is the user-facing affordance.
- **Boolean toggles labeled "runtime" that actually trigger compile bypass
  `panelConfig` entirely** and live as compile-toggle params. The
  empirical reason (ANGLE/D3D11 optimizer predicating both branches inside
  a runtime `if(...)`, defeating the runtime toggle's intent) is recorded
  in `feedback_angle_d3d11_optimizer.md` and applies to `AreaLights`
  (`engine-gmt/features/lighting/index.ts:288-431`) and similar.
- **Adding a new compile-toggle feature** = add `panelConfig` + ensure the
  feature's `inject` reads the compile param via `engineConfig.toggleParam`
  for DDFS's standard compile-vs-runtime branching.
- **`CompilableFeatureSection` is shared, not GMT-specific.** Other engine-
  consumers (fluid-toy, fractal-toy) can use the same pattern.
