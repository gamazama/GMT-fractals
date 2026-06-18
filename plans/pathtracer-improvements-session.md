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

## Remaining — honest assessment

### Recommended next: proper GGX / irradiance env prefilter
The only large, clearly-worthwhile item. ADR-0069 currently blurs by selecting
box-filtered equirect mips with a `-4` LOD cap to dodge the dark, pole-biased
top mips — a cheap stand-in, not energy-correct. A real prefilter removes the
cap and makes **every env-lit surface** (Direct + PT + reflections, since all go
through `GetEnvMap`) correct. Two approaches:

- **A. Custom solid-angle-correct mip chain** (cheaper, lower blast radius):
  replace Three's box `generateMipmaps` with a downsample weighted by sin(θ) so
  high mips are honest averages; drop the `-4` cap. Fixes the darkening; still
  not GGX-convolved (a roughness lobe is approximated by mip selection).
- **B. Full GGX split-sum prefilter** (gold standard, higher blast radius):
  PMREM-style GGX-convolved radiance mips + an irradiance map/SH for the diffuse
  ambient. Three.js `PMREMGenerator` exists but changes the env texture format
  `GetEnvMap` samples (needs care across the main thread + worker upload paths).

Either touches all three env upload sites (`MaterialController`, `renderWorker`
TEXTURE / TEXTURE_HDR) and `GetEnvMap`. **Confirm A vs B before building** — it's
cross-cutting with visual-only verification.

### Not pursuing (unless asked) — and why
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
