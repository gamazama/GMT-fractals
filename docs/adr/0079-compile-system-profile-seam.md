# ADR-0079 — The "Compile" system: generic compile-switch mechanism + app-registered profiles

Status: Accepted
Date: 2026-06-20

## Context

Two parallel "quality" systems had grown up, plus a third, hidden divergence:

1. **Viewport Quality / Scalability** (`types/viewport.ts`) — per-subsystem tiers
   (`SUBSYSTEM_*`), master presets (`SCALABILITY_PRESETS`), applied destructively
   to the store via `scalabilitySlice.applyTierOverrides` (which calls each
   feature's `set${Feature}` setter). Tier-index estimator
   `estimateScalabilityCompileTime` (BASE 4200 + per-tier `estCompileMs`).
2. **Engine Profiles** (`engine-gmt/features/engine/profiles.ts`) — older
   monolithic `ENGINE_PROFILES` + the *live-state* per-param estimator
   `estimateCompileTime` (BASE 3600, sums each feature's `onUpdate:'compile'`
   param's `estCompileMs`). The latter is the **real** compile-progress estimator
   (wired via `setCompileEstimator` in app-gmt + ConfigManager's `compile_estimate`).
3. **A duplicated copy of system (1).** `engine-core/types/viewport.ts` (what
   `store/slices/scalabilitySlice.ts` actually imports + applies) had drifted
   stale — 4 shadow tiers, destructive `ptStochasticShadows`, no Path-Tracer
   subsystem, pre-L6 `estCompileMs` — while `engine-gmt/types/viewport.ts` (the
   modern copy: 3-tier shadows, PT subsystem, L6 costs) was imported by a single
   file (`ViewportQuality.tsx`). The recent shadow-quality viewport work all
   landed in the copy the store never reads.

Two consequences: the UI advertised tiers/estimates the store didn't apply, and
two estimators reported different numbers for the same thing.

The deeper problem named during review: the `SUBSYSTEM_*` definitions and
presets are **GMT-specific data** (they name `lighting.shadowAlgorithm`,
`lighting.ptReflMode`, `reflections.reflectionMode`…), yet they were hardcoded
in **engine-core** (`types/viewport.ts`, `store/`), violating the
domain-agnostic-engine-core rule (engine-fork-rules). The naive "merge the two
copies into engine-core" fix would deepen that violation.

Naming was also overloaded: `EnginePanel` / `EngineSettings` / Engine Profiles
all collide with the engine-core/engine-gmt *layer* names.

## Decision

Recognise one system — **Compile** — with a clean mechanism/data split, named for
what it actually governs: which features are baked into the shader at compile
time (a recompile + wait), as opposed to runtime sliders.

1. **Mechanism in engine-core, data in engine-gmt via a registration seam.**
   Engine-core owns the generic machinery: the `Subsystem*`/`ScalabilityPreset`/
   `ScalabilityState` interfaces, `scalabilitySlice` (already domain-agnostic —
   it applies overrides through `set${Feature}` setters), the helpers, and the
   single estimator. The GMT compile-switch subsystems + profiles + measured
   `estCompileMs` live in engine-gmt and register via
   `registerCompileProfiles({ subsystems, presets, default })` **before
   `createEngineStore()`** (alongside `featureRegistry.register`, in
   `app-gmt/registerFeatures.ts`). This is the same seam pattern as
   `setFormulaPresetResolver` / `setCompileEstimator`. The duplicate
   `engine-gmt/types/viewport.ts` dissolves into that registered data module.

2. **The switch layer already exists — it is the DDFS `onUpdate:'compile'` param
   set.** Every compile switch is a feature param marked `onUpdate:'compile'`;
   the feature registry *is* the switch registry. The Compile system formalises
   and surfaces this; it does not introduce a new registry.

3. **One estimator.** The per-param `estCompileMs` annotations (summed over live
   state) are the single source of compile-cost truth — it reflects exactly what
   is compiled, including manual overrides, and is what the real compile-progress
   uses. The tier-based estimate builds a synthetic state from the selected
   tiers' `overrides` and runs it through the same summer, so the two numbers
   agree by construction. The duplicate per-tier `estCompileMs` and the second
   BASE constant are removed.

4. **Retire `ENGINE_PROFILES` + the `applyPreset` action** (orphaned — the old
   SystemMenu profile dropdown was removed; the live profiles are the Viewport
   Quality set). Viewport Quality remains the user-facing quality control; it is
   a *consumer* that calls the Compile system to set switch bundles.

5. **Rename** `Engine{Panel,Settings,Profiles}` → `Compile*` to kill the overload.
   Viewport Quality keeps its name (it is a distinct consumer, not the mechanism).

## Consequences

- The store finally applies the modern tiers (3-tier shadows w/ runtime jitter,
  Path-Tracer subsystem, L6/2026-06-20 costs). This is a behaviour change for
  Viewport-Quality preset selection — verified visually. ("Balanced enables PT"
  via `lighting_quality:1` is pre-existing in both copies, not introduced here.)
- Registration MUST precede `createEngineStore` (same freeze-boundary constraint
  as features). Registered late → empty subsystems → quality UI inert. Enforced
  by placement in `registerFeatures.ts` (imported first).
- engine-core regains domain-agnosticism for the quality system: no fractal param
  names in `types/viewport.ts` / `store/` — only the mechanism + the seam.
- A second app (fluid-toy/fractal-toy) can adopt tier-based compile scaling by
  registering its own subsystems, for free.
