# ADR-0078: Split the overloaded `noReset` flag into `noAccumReset` + `preserveOnApply`

- **Status:** Accepted
- **Date:** 2026-06-20
- **Supersedes / amends:** none (clarifies the `ParamConfig` contract introduced alongside the partial-apply utility)

## Context

`ParamConfig.noReset` had grown to mean two unrelated things, and a single flag
was being read on both axes:

1. **Accumulation axis** — "changing this param at runtime must NOT clear the
   path-trace accumulation buffer." Read by `createFeatureSlice`,
   `FractalEngine.setUniform`, `ConfigManager`, the UNIFORM event payload, and the
   `OFFSET_SET` worker message. This is the original, dominant meaning and it was
   correct almost everywhere.

2. **Bulk-copy axis** — "a bulk slice apply/reset (`applyPartialPreset`) must NOT
   overwrite this param." Read only by `applyPartialPreset` via its
   `respectNoReset` option, used by three consumers: the per-feature **Reset**
   button, the **New Scene** shading copy, and the **look-only Load** filter.

The two axes were entangled by coincidence: the params worth protecting from a
bulk copy (the `lights` array, drawn shapes, modulation rules, open-panel flags,
webcam/audio session config) already carried `noReset` for the *accumulation*
reason, so the author reused that flag instead of adding a second one. The option
name (`respectNoReset`) and its docstring ("pass false only for explicit
scrub-everything use cases (rare)") admitted the reuse.

The overlap is **partial**, and it broke on **post-process params**. Bloom,
chromatic aberration, colour-grading and the Droste UV-remap are display-only
(correctly `noReset` on the accumulation axis) yet are genuine "look" settings
that a Reset/copy *should* touch. Because they were skipped on the bulk-copy axis:

- The per-feature **Reset button was a no-op** for features whose params are all
  display-only — Colour Grading, Post Effects, Droste, Drawing, Webcam.
- **New Scene "copy shading"** brought only runtime scalars, never the lighting
  *setup* (render mode, PT on/off, shadow algorithm…).
- **loadFilter** had to pass `respectNoReset: false` (an apologetic
  force-everything hack) to get the look-load to copy the light rig.

A third concept — `userScoped` ("a loaded scene must never overwrite this", for
device perf prefs like adaptive resolution) — already existed as its own flag, so
two of the three axes were already separated; only the bulk-copy axis was homeless.

## Decision

Give each axis its own flag and stop cross-reading them.

- **`noAccumReset`** (renamed from `noReset`) — accumulation axis only. Every
  axis-A site renamed verbatim; zero behaviour change in that pass.
- **`preserveOnApply`** (new) — bulk-copy axis. `applyPartialPreset` now skips a
  param when `userScoped || preserveOnApply` (option renamed
  `respectNoReset` → `respectPreserve`). `noAccumReset` is **deliberately not
  consulted** by `applyPartialPreset`.

`preserveOnApply` is set only on authored content / session / device state:
`lighting.lights`, all `drawing.*`, `modulation.rules`/`selectedRuleId`,
`debugTools.*Open`, `engineSettings.showEngineTab`, all `webcam.*`, all
`audioMod.*`, and `quality.physicsProbeMode`/`manualDistance` (the rest of
quality's prefs ride `userScoped`). Post-process and compile-gated "look" params
keep `noAccumReset` but get **no** `preserveOnApply`, so they once again flow
through Reset/copy (compile params still gated by the existing
`includeCompileParams`).

Separately, `water_plane.active` lost its flag entirely: it is a *runtime*
`uWaterActive` toggle that adds/removes the water surface from the SDF `map()`, so
it changes the converged image and must reset accumulation — matching its sibling
runtime params and the `areaLights` precedent.

## Consequences

- Per-feature **Reset** now correctly restores defaults for Colour Grading, Post
  Effects, Droste, and lighting/geometry/ao/reflections/volumetric mode switches.
- **New Scene "copy shading"** now carries the source's full post-process +
  lighting/material setup (gated by `includeCompileParams`).
- **loadFilter** look-only load drops the `respectNoReset: false` hack; it passes
  `respectPreserve: false` only to include the light rig (the lone
  `preserveOnApply` member among the look groups).
- Toggling the water plane resets accumulation cleanly instead of cross-fading a
  stale buffer.
- The two flags are now orthogonal and self-documenting. Many params legitimately
  carry **both** `noAccumReset` and `preserveOnApply` for unrelated reasons; that
  is expected, not redundancy.

`debug/test-partial-apply.mts` test 3 asserts both directions: a `preserveOnApply`
param survives a reset while a `noAccumReset`-but-not-preserved param resets.
