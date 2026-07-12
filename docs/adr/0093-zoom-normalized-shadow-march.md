# ADR-0093: Zoom-normalized shadow marches (footprint units + view-depth cone threshold)

**Status:** Accepted — 2026-07-10. Branch `feat/weave-core`. Complements ADR-0092 (which unified
the *step dynamics* of all marches; this ADR unifies their *units*).

> **Update 2026-07-12 (path move; decision unchanged):** the MB3D Pascal source checkout cited
> below moved from `h:/tmp/mb3d-probe/` to `H:/GMT/stuff/mb3d-probe/`.

## Context

The primary trace is fully zoom-aware: its hit threshold `finalEps` is cone-traced
(`pixelFootprint ∝ uPixelSizeBase · d`, floored by float precision — `trace.ts`). The shadow-like
marches were not. `GetSoftShadow` Lite used absolute world-unit constants (start `t = 0.05`, step
floor `0.05`, hit `0.005`), both soft paths jittered the start by an absolute `noise · 0.01`, the
surface bias was `uShadowBias` (default **0.002 absolute**) plus a non-depth-scaled pixel term, and
`GetHardShadow` / `envVisibility` used `thresh = max(1e-6, t · 2e-4)` — scaled by shadow-ray travel
from an absolute floor, not by what the camera can resolve. The volumetric fog-shadow origin offset
had another absolute `0.01`.

Consequence: once the viewport spanned less than a few hundredths of a world unit (any deep 3D
zoom), the shadow ray *started* beyond every visible occluder and its step floor stepped over
anything that remained. **Shadows silently vanished at high zoom** (owner-reported symptom).

The fix pattern comes from reading the Mandelbulb3D source (`h:/tmp/mb3d-probe/CalcHardShadow.pas`):

1. MB3D marches shadows in **stepWidth-normalized units** — stepWidth scales with zoom, so its
   hardcoded floors (min step `0.011`, acne offset `0.1`, step cap `0.4`) shrink automatically.
2. MB3D's shadow threshold is `msDEstop = DEstop · (1 + |ZZ2| · DEstopFactor)` where `ZZ2` is the
   ray position's **view-depth equivalent**, updated per step by `ZZ2mul = dot(marchDir, viewDir)`
   (`CalcHardShadow.pas:374,401-402`) — shadow resolution tracks primary-trace resolution at
   whatever screen depth the shadow ray currently sits.

## Decision

Every shadow-like march — `GetSoftShadow` (HQ + Lite), `GetHardShadow`, the PT env-NEE
`envVisibility`, and the volumetric fog-shadow ray — takes two new parameters:

- `surfEps` — the primary march's `finalEps` at the ray origin (cone-traced footprint at that
  point's camera distance, floored by float precision). Callers compute it: `pbr.ts` replicates the
  trace formula from `length(p)` (camera-local space), the path tracer reuses its existing NEE
  `biasEps`, the volumetric body uses the footprint at its scatter depth `d`.
- `epsRate` — footprint growth per world unit, projected onto the ray:
  `epsPerDist · dot(shadowDir, viewDir)` (0 for ortho). Since `d/dt |p + rd·t| = dot(rd, p̂)` this
  is exact for bounce rays too.

Inside the march the threshold is `eps(t) = max(0.1·surfEps, surfEps + epsRate·t)` — GMT's twin of
MB3D's ZZ2 threshold (signed: rays receding from the camera coarsen, rays approaching refine, floor
keeps it positive). **Every former absolute constant is now a multiple of eps**, preserving the
legacy ratios so normally-zoomed scenes look the same: Lite start/floor/hit `10×/10×/1×`, jitter
`2×`, HQ step floor `0.5×`, origin offsets `2×`.

**Shadow bias is footprint-relative:** `bias = surfEps · (2.0 + uShadowBias · 500)`. The stored
`shadowBias` param keeps its scale (legacy default `0.002` → ~1 footprint of extra bias; slider max
`1.0` → 500), so no scene migration is needed and old scenes keep their look at normal zoom while
gaining correct bias at depth.

## Consequences

- Shadows (Direct soft, PT hard, env-NEE, fog shadows) now resolve at every zoom level; verified
  live by the owner at previously-failing zoom depths on 2026-07-10.
- The `uShadowBias` slider's *meaning* changed from world units to footprint multiples (×500). A
  scene that cranked bias to fight acne on a rough DE keeps qualitatively similar behaviour but not
  the identical numeric offset.
- Shadow-ray cost at high zoom rises from ~0 (rays skipped everything, returning unshadowed) to
  normal shadow cost — this is the feature working, not a regression.
- The IQ/Aaltonen HQ penumbra guards lost their absolute `1e-5` clamps (now positivity-guarded via
  the eps-scaled start `t > 0`), so HQ penumbrae stay correct at any scale.
- `GetSoftShadow`/`GetHardShadow`/`envVisibility` signatures changed; the disabled/non-Main stubs in
  `features/lighting/index.ts` and `shaders/chunks/lighting/shadows.ts` must stay in sync.
