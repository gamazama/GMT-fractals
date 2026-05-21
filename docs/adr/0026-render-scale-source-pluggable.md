# ADR-0026: Render-scale pill source is pluggable, not hard-wired

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/plugins/viewport/ViewportModeControls.tsx`, app render-scale registrations

## Context

The default in-canvas render-scale pill reads/writes
`viewportSlice.renderScale` (fluid-toy / fractal-toy consume that
field). GMT's actual internal-pixel multiplier lives at
`quality.aaLevel`, so the pill must target a different field.

## Decision

`setRenderScaleSource(source)` registers a
`{ use, steps, formatLabel? }` triplet at boot. `RenderScaleControl`
picks `DefaultScalePill` vs `CustomScalePill` once (no conditional
hook calls) and never changes the choice at runtime.

## Consequences

- GMT's `app-gmt/main.tsx:152` is the only caller registering a
  custom source today.
- The two-component split is load-bearing because `source.use()` is
  itself a hook — conditional invocation would violate React rules.
