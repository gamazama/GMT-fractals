# Path Tracer Improvements — Session Plan

Status of the pass started 2026-06-18/19. Quick wins are **shipped**; the
remaining items are heavier or speculative. Denoiser / ReSTIR are **out of scope**
(user decision, 2026-06-19).

## Shipped (on `main`)
- **Reflections** — VNDF importance sampling + env/AO fill, `adceafc` (ADR-0068).
- **Env blur** — `texture(bias)` → `textureLod` + over-darkening cap, `4a65ad5` (ADR-0069).
- **PT pass** — procedural-sun NEE, shared bounded-VNDF (`vndf.ts`, PT + reflection),
  cheaper env-NEE visibility march, correct PT defaults (`ptReflMode = Env MIS+IS`,
  `ptSobolBounce = true`), `484c188` (ADR-0070, ADR-0068 update).
- **Env prefilter (approach A, average-blend form)** — solid-angle (sinθ) average
  computed in the CDF pass, blended into `GetEnvMap` toward the rough end so box
  mips no longer collapse to a dark pole-biased mean; LOD cap demoted to fallback,
  `d9cb18d` (ADR-0069 update). Full custom manual-mipmap chain deferred (see below).

## Remaining — honest assessment

The plan's substantive items are all shipped. What's left is deliberately not
pursued:

### Not pursuing (unless asked) — and why
- **Full GGX / manual-mipmap env prefilter** — the average-blend (shipped) fixes
  the top-of-chain darkening; a full sinθ-weighted custom mip chain (or PMREM
  GGX-convolved radiance + irradiance map/SH) would also correct the *mid-range*
  box mips, but needs finicky manual-mipmap upload (unverifiable without a GPU
  here) + heavy transient memory on large envs, for small extra visible gain.
- **Adaptive / variance-guided sampling** — conflicts with ADR-0067, which
  deliberately removed per-bucket convergence in favour of fixed spp (seams).
  Full-screen fragment shading can't cheaply skip converged pixels anyway.
- **Owen-scrambled Sobol on more dims** (shadow jitter / RR / light pick) —
  speculative ("if it wins"); a subtle variance change that can't be cleanly
  confirmed without a bench, and risks correlation artifacts. Low confidence.
- **Less-biased firefly handling** — the hard `clampByLuminance` already works;
  a soft-knee is a different bias curve, not principled, and median-of-means
  needs per-pixel sample history this progressive accumulator doesn't keep.
  Marginal / subjective.

## Conventions (unchanged)
`npm run typecheck` green; user does GPU/visual verification; ADR + `@see` for
load-bearing decisions; don't add Balanced-profile compile cost; check
`git rev-parse --abbrev-ref HEAD` before committing.
