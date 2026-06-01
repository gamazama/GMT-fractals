# Plan: Porting amoser's "Sine Fractal 3D" shading stack into GMT

> Drafted 2026-05-26. Companion to the `SineJulia3D` formula port (commit `1fe4afd`).
> Source: amoser's "Sine Fractal 3D" Shadertoy (2026, CC-BY-NC-SA 3.0).
> This is an *investigation + scoping* artifact, not an approved build order.

## What we're porting

Six shading techniques from the Shadertoy, ordered by the user's stated priority
("SSS + Minnaert together is the biggest lever"):

| # | Effect | Value | Effort | New pass? |
|---|--------|-------|--------|-----------|
| 1 | Minnaert diffuse | High | Low (~½ day) | No (shader edit) |
| 2 | Screen-space SSS | High | Med (~1 day, Path A) | No — display-composite feature |
| 3 | AO × orbit-trap modulation | Med | Low (~2 hr) | No (shader edit) |
| 4 | Halation blur | Med | Low (~½ day) | No (display-composite feature) |
| 5 | Grain + vignette | Low | Low (~3 hr) | No (display composite) |
| 6 | Mini-probe GI | Low | Med | No, but heavy at runtime |

> Revised after confirming `post_process.ts` exposes a per-feature `postShader`
> injection that runs on the accumulated image (color + depth-in-alpha) and can
> sample neighbors — so SSS/halation don't need new worker pass classes (Path A).

Bloom and ACES tonemap already exist (`engine/BloomPass.ts` MIP-based;
`shaders/chunks/post_process.ts` has ACES + AgX + Reinhard + Neutral), so #5's
bloom/ACES asks are already satisfied — only grain + vignette are missing.

## Architecture facts established by investigation

- **Two render modes**: Direct (`renderMode=0`) and Path Tracing (`renderMode=1`,
  full multi-bounce NEE GI). Direct shading lives in
  `shaders/chunks/lighting/shading.ts` → `getSurfaceMaterial()`
  (`material_eval.ts`) → `calculatePBRContribution()` (`lighting/pbr.ts`,
  Blinn-Phong + Cook-Torrance branches).
- **DDFS injection**: features declare `params` (auto-declared uniforms) and an
  `inject(builder, config, variant)` that pushes GLSL via builder hooks
  (`addFunction`, `addMaterialLogic`, `addShadingLogic`, `addPostProcessLogic`,
  `addDefine`). Pattern reference: `features/water_plane.ts`, `features/ao/`.
- **Orbit trap at shade time**: `result.yzw` carries trap data; `result.y` is the
  trap minimum. Available in `calculateShading()` and `getSurfaceMaterial()`.
- **Soft shadow + DE reuse**: `GetSoftShadow(ro, rd, k, dist, noise)` and
  `DE_Dist(p)` are callable from anywhere post-hit.
- **Post-processing pipeline is custom ping-pong FBO, NOT EffectComposer**
  (`engine/RenderPipeline.ts` + `engine-gmt/engine/worker/handleRenderTick.ts`).
  - Per-pixel `applyPostProcessing(col, d, glow, ...)` runs **inside the
    accumulation loop** (Position 16, `shaders/chunks/post.ts`). Good for effects
    that only need the local pixel + its depth `d`.
  - **Display-composite feature injection** (`shaders/chunks/post_process.ts`):
    features can supply `postShader.functions` + `postShader.main` that run once
    per **displayed** frame on the accumulated texture `map` (RGB color, **alpha =
    depth**) and can sample neighbor UVs. This is the cheap home for neighbor-
    reading screen-space effects — no new pass class needed. Grain/vignette and
    even SSS/halation can live here. Confirmed injection points: `injectedMainUV`,
    `injectedMainColor`, plus `injectedFunctions`/`injectedUniforms`.
  - Heavier multi-tap pyramid effects (like bloom) are a **separate worker-side
    pass** reading the final accumulated texture — `BloomPass`
    (`handleRenderTick.ts` calls `bloomPass.render(outputTex, ...)` then feeds the
    result to `displayMaterial` via `uBloomTexture`). Use this only if a single
    full-res gather is too expensive or a MIP pyramid is required.
- **Depth survives into the post chain**: written to the **alpha channel** of the
  Float32/Float16 RGBA accumulation target (`main.ts`: `outDepth = dot(...)`).
  A separate pass reading `outputTex` gets RGB color + alpha depth for free —
  this is what makes screen-space SSS viable without an MRT refactor.
- **Worker constraints**: all GPU work is worker-side; `engine.renderer`/`pipeline`
  are null on the main thread. New passes + render targets are allocated, resized,
  and disposed in the worker.

---

## Tier 1 — shader-only, cheap, high value

No new passes, no worker changes. Compile-gated booleans → zero cost when off.

### 1. Minnaert diffuse
- **Where**: `lighting/pbr.ts`, `calculatePBRContribution()`. Patch the diffuse
  term in **both** the Cook-Torrance branch (line ~91) and the Blinn-Phong branch
  (line ~99) — or gate Minnaert to a single model and document the limitation.
- **GLSL**: amoser's `minnaert(col, dark, ndotv) = col·clamp(pow(col·-ndotv, -dark)·(1-dark), 0, 4)`.
  Note sign convention: amoser's `ndotv` uses ray dir `rd` (clamped to `[-1, -0.001]`);
  GMT's `v = normalize(-rd)` is the *view* dir, so use `-dot(n, v)` to match, or
  reformulate. Minnaert wraps the whole diffuse, it is not just an `NdotL` multiply.
- **Param**: extend `features/lighting/index.ts` (or `materials.ts`) with a
  `diffuseModel` dropdown (`Lambert` / `Minnaert`, `onUpdate: 'compile'`) +
  `uDiffuseRough` float (runtime, 0–1, default 0.5). Compile gate via
  `builder.addDefine('DIFFUSE_MINNAERT', ...)`.
- **Effort**: ~½ day. **Risk**: two PBR models to keep consistent; energy
  non-conservation (acceptable — amoser flags it as non-physical).

### 3. AO × orbit-trap modulation
- **Where**: `lighting/shading.ts` after `float ao = GetAO(...)` (line 21), via
  `builder.addShadingLogic(...)`, before `ambient` is computed.
- **GLSL**: `ao *= clamp(uAoTrapScale / max(result.y, 1e-3), 0.0, 1.0);`
- **Param**: extend `features/ao/` with `aoTrapStrength`/`aoTrapScale` (runtime
  uniform, default 0 = off). Must be **opt-in** because `result.y` semantics vary
  per formula (SineJulia3D uses `min(|x|,|z|)`; others use `length`/`dot`) — so the
  scale needs to be tunable and default-off to avoid surprising existing formulas.
- **Effort**: ~2 hours. **Risk**: low; purely multiplicative, runtime-only.

### 5. Grain + vignette
- **Where**: display composite shader `shaders/chunks/post_process.ts` (already
  holds ACES + tonemap dispatch). Add after tonemap.
- **GLSL**: vignette = `smoothstep` on `length((uv-0.5)*aspect)`; grain = hash or
  blue-noise sample scaled by a tiny amount, `* uFrameCount` for animation.
  GMT already has `getBlueNoise4()` — reuse instead of amoser's 4-octave noise tex.
- **Param**: new small `features/film/` (or extend atmosphere) with
  `vignetteStrength`, `grainStrength` (runtime).
- **Effort**: ~3 hours. **Risk**: grain on an *accumulated* image must be applied
  at **display time** (post-accumulation) or it averages away — put it in the
  display composite, not `applyPostProcessing()`.

---

## Tier 2 — screen-space SSS (the headline effect)

This is the "translucent stone" lever. Two integration paths — investigation
revised this **down** from the original "must be a worker pass" estimate:

**Path A (preferred, cheaper): display-composite feature injection.**
- **New file**: `features/sss/index.ts` supplying `postShader.functions` (the disc
  gather + `sssProfile`) and `postShader.main` (the blend). Runs once per displayed
  frame in `post_process.ts` on the accumulated `map` (RGB) + `map.a` (depth).
- **Algorithm** (from amoser Buffer D): reconstruct view-space position from depth
  using the FOV uniform; Fibonacci-disc gather (reduce amoser's 200 taps to ~24–32
  for realtime); 3-Gaussian `sssProfile(dist, radiusRGB)`; blend `mix(orig, sss, 0.9)`.
- **Params**: `uSSSStrength` (float), `uSSSRadius` (vec3 RGB — per-channel scatter
  is what tints jade/coral/snow). Sampling `map` at neighbor UVs is already done by
  the box-filter loop in `post_process.ts`, so the pattern is proven.
- **Effort**: ~1 day. **Caveat**: runs *after* bloom in the composite, so bloom
  won't bloom the scattered light (amoser does SSS→bloom). Minor; revisit if it
  reads wrong.

**Path B (faithful ordering): separate worker pass.**
- `engine/SSSPass.ts` modeled on `engine/BloomPass.ts`; wired in
  `handleRenderTick.ts` **before** bloom so bloom sees scattered light; output fed
  to `displayMaterial` via a new `uSSSTexture` + composite line.
- **Effort**: ~1.5–2 days. Use only if Path A's ordering looks wrong.

**Shared risks**: depth in alpha is *view-space ray distance* (`dot(p-ro, rd)`),
not clip depth — confirm the view-space reconstruction matches GMT's projection
(FOV uniform). Per-material vs global SSS radius is an open question (below).

---

## Tier 3 — halation blur

Sibling to bloom/SSS: a cheap Fibonacci-disc blur kept in the R/G channels,
added back after vignette for the warm filmic fringe.

- **Option A (cheap)**: display-composite feature injection (`postShader`) — small
  disc gather of `map`, keep r/g, add after vignette. Same home as grain/vignette.
- **Option B (reuse bloom)**: sample a couple of `uBloomTexture` MIP levels (bloom
  already computed) weighted into r/g only — near-free once bloom is on.
- **Option C (faithful)**: dedicated `HalationPass.ts` (BloomPass sibling).
- **Recommendation**: Option A or B; the visual delta of a dedicated pass is small.
- **Effort**: ~½ day (A/B) / ~1 day (C).

---

## Tier 4 — mini-probe GI (optional, likely deferrable)

- **Verdict from investigation**: GMT's path tracer already does correct
  multi-bounce GI. Mini-probe GI only adds value in **Direct mode** as a cheap
  "GI-ish" fill; in PT mode it's redundant.
- **Where**: `lighting/shading.ts` post-hit, reusing `GetSoftShadow` + `DE_Dist`
  along the normal (structurally identical to the existing `GetAO` loop).
- **Cost**: 4 probes × a soft-shadow march each, **multiplied by accumulation
  samples** — the heaviest of the six. Gate to Direct mode + runtime strength +
  consider first-N-samples-only.
- **Recommendation**: defer. Ship Tiers 1–2 first; revisit only if Direct mode
  still looks flat next to the SSS/Minnaert result.

---

## Suggested sequencing

1. **Tier 1 batch** (Minnaert + AO×trap + grain/vignette) — one branch, all
   shader/DDFS edits, individually toggleable. Validates the look cheaply.
2. **Tier 2 SSS** — separate branch; the architecturally novel piece (new worker
   pass + display composite uniform). This + Minnaert is the user's headline combo.
3. **Tier 3 halation** — fold into bloom (Option A) once SSS lands.
4. **Tier 4 mini-probe GI** — only if wanted after seeing 1–2.

## Open questions for the user

- Should Minnaert be a **global material/lighting option** (applies to every
  formula) or scoped so it doesn't change the look of existing presets by default?
  (Recommendation: compile-gated, default Lambert — opt-in per scene.)
- SSS radius: expose as a **per-material** control (closer to amoser, more work) or
  a **global** scatter (simpler)? (Recommendation: global first, per-material later.)
- Are these GPL-compatible to ship? Source is CC-BY-NC-SA 3.0. **NC = non-commercial**
  — this conflicts with redistribution if GMT is ever monetized (see
  `project_monetization_strategy`). Techniques (Minnaert, iq SSS/AO) are general
  and independently implementable; a clean reimplementation from the *idea* rather
  than line-by-line port avoids the license entanglement. **Flag before shipping.**
