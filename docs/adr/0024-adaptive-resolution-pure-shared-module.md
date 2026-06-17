# ADR-0024: Pure adaptive-resolution decision module shared by worker + main thread

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/AdaptiveResolution.ts`, `engine-gmt/engine/managers/UniformManager.ts`, `store/slices/viewportSlice.ts`

> **Update 2026-06-18 (mobile adaptive ceiling; decision unchanged):** The
> GMT worker's `tickAdaptiveResolution` call previously omitted `minQuality`,
> so it used the module default `0.25` → a 4× max downscale on every device.
> On a retina phone the base render is full DPR (kept sharp when settled by
> design), and 4× only reaches ~0.75× CSS while interacting — not enough for
> the GPU, forcing users to set the downsample by hand. `UniformManager`
> now passes `minQuality: runtimeState.isMobile ? 1/6 : undefined`, raising
> the mobile smart-mode ceiling to ~6× (≈0.5× CSS) while leaving desktop and
> the settled/idle full-DPR render untouched. Only the smart-mode
> (`adaptiveTarget > 0`) scale is bounded by `minQuality`; manual-mode
> `interactionDownsample` is independent. The base DPR was deliberately NOT
> capped (a separate option) so idle frames stay full-retina sharp.

## Context

GMT's worker had a downsample feedback loop in
`UniformManager.syncFrame`; main-thread apps (fluid-toy, fractal-toy)
needed the same algorithm without the worker substrate.

## Decision

Extract `engine/AdaptiveResolution.ts` as a pure module — no DOM, no
THREE, no worker assumptions — and call it verbatim from both
`UniformManager` and `viewportSlice`. State is per-caller, mutated in
place; caller owns buffer resize and accumulation reset.

## Consequences

- One algorithm to maintain.
- The caller-owns-`selfResized` contract is load-bearing — without it,
  the caller's own accumulation reset reads as scene activity and
  adaptive re-engages immediately.
- Only `UniformManager.ts:137` writes it today; the main-thread slice
  doesn't need it because it doesn't synchronously reset accumulation
  in response to scale changes (followup q-042).
