# Volumetric scatter — session handoff

**Last updated:** 2026-05-03
**Status:** Shipped on dev branch.
**Companion docs:**
- [`docs/gmt/02_Rendering_Internals.md`](gmt/02_Rendering_Internals.md) §2.6 — current architecture, params, performance, gotchas (authoritative reference).
- [`docs/BENCH_SHADER_HANDOFF.md`](BENCH_SHADER_HANDOFF.md) — bench harness, optimization log, ANGLE/D3D11 stack rules.

---

## TL;DR

Volumetric scatter went from "53 fps cap with vol on" to "FPS-uncapped during interaction with vol on, same converged image" via four changes:

1. **`uVolQuality` slider** (default 0 = 1/128 sampling, 1 = 1/8 full rate). Both endpoints converge to the same image; slider only trades per-frame cost vs frames-to-converge.
2. **Interaction clamp** (`uBlendFactor >= 0.99 → P ≤ 1/32`). Even at `Quality=1`, navigation frames cap at 1/32 sampling so high-quality settings can't tank interactive FPS.
3. **`needNoise` clause for `uVolEnabled`** in [ray.ts](../engine-gmt/shaders/chunks/ray.ts). Without this, during nav the volumetric gate hash collapsed to a function of `d` alone and produced screen-wide bands. This was the actual root cause of perceived banding — not a gate-mixing problem.
4. **`DIR_LIGHT_DIST` cleanup** for the volumetric shadow ray's `_ld` value (was 10000.0, now matches the surface-shadow convention of 100). Bench-invisible on point-light scenes; saves shadow-march iterations on directional-light scenes.

Bench (1280×720, RTX 2070, ANGLE/D3D11):

| Configuration | p50 GPU |
|---|---|
| vol off | 6,670 µs |
| vol on, **Quality=0 (default), accumulating** | ~7,500 µs |
| vol on, **Quality=1, accumulating** | ~18,800 µs |
| vol on, **Quality=any, navigation frame** (clamped) | ~7,500 µs |

Default workflow: artist works with vol on at Quality=0, image converges over a few seconds of accumulation, looks identical to Quality=1 result.

---

## What we tried that didn't pan out

Logged so future sessions don't re-attempt:

| Attempt | Result | Reason |
|---|---|---|
| Loop-invariant hoists (world-pos sum cached, `pow(_hgD, 1.5) → _hgD * sqrt(_hgD)`) | bench-neutral | ANGLE already CSEs the world-pos add across the two `if` branches and lowers `pow` efficiently. Same lesson as the S1/S2 bench-shader history. |
| Stronger gate-hash mixing (`fract(_volSeed * 127.1 + d * 31.7)`) | **2.4× slower AND visually worse** | Decorrelating the gate firings broke warp coherence (warps fan out across the shadow-ray cost), and the larger d-multiplier produced visible slabbing bands at d-period 1/31.7 ≈ 0.032. The "weak" hash with constants 7.43/1.0 was load-bearing — its spatial coherence is a perf feature. |
| Per-frame phase shift (`+ float(uFrameCount) * 0.137` in the gate hash) | rejected by user | Design rule per the volume's original authoring: per-pixel jitter, not per-frame. Per-frame produces visible flicker without helping convergence (history-replace at uBlendFactor=1.0). |
| **B-set audit items** — `applyPrecisionOffset` for emissive lookup, smoothstep `_jScale`, blue-noise shadow-ray jitter (`getBlueNoise4`) | reverted | +1.5–3.3% perf cost for visual change that was within accumulation noise floor. Not earning the cost. |
| Binary nav-skip (vol body skipped entirely during interaction) | implemented then replaced | Gave full FPS during nav but **no visual feedback when tweaking volumetric/light params** — sliders are also "interaction" per uBlendFactor. Replaced with subsampled preview (current `uVolQuality` design). |
| Bench harness `uBlendFactor=0.5` override for vol scenes | reverted | Changing uBlendFactor in the bench triggers `trace.ts:181`'s stochastic step jitter for the primary march, which adds warp divergence to the entire pipeline (3× regression on the test). Bench keeps `uBlendFactor=1.0`; the interaction clamp means we measure interaction-frame cost cleanly. |

---

## The real bug we found

The audit predicted that improving the gate hash would fix the visible banding the user saw during interaction. **It didn't, because the bug wasn't in the gate hash.** It was in [ray.ts](../engine-gmt/shaders/chunks/ray.ts):

```glsl
// Direct mode noiseLogic
if (uDOFStrength > 0.00001) needNoise = true;
if (!isMoving) needNoise = true;
if (uAreaLights > 0.5) needNoise = true;
// ← uVolEnabled clause was missing here
```

During navigation in Direct mode with DOF and area lights both off, `needNoise` stayed false → `stochasticSeed` defaulted to 0.5 for every pixel. With `uVolStepJitter=1.0` (default), `_volSeed = mix(0.5, 0.5, 1.0) = 0.5`. The gate hash `fract(0.5 * 7.43 + d * 1.0)` then depends only on `d`, which is identical across pixels at the same iter (during nav, primary march is deterministic — see `trace.ts:181`). Whole screen fires/skips together → bands.

Fix is one line:

```glsl
if (uVolEnabled > 0.5) needNoise = true;  // Volumetric gate hash needs per-pixel jitter
```

**Lesson for future feature additions:** any feature whose body relies on `stochasticSeed` for spatial decorrelation needs a corresponding `needNoise` clause in `ray.ts`. The default `0.5` value is a footgun.

---

## Bench harness extension

Added in this session — see [`debug/bench-shader.mts`](../debug/bench-shader.mts):

```bash
npx tsx debug/bench-shader.mts \
    --volumetric=on \
    --vol-density=0.01 \
    --vol-emissive=2 \
    --vol-lights=1 \
    --vol-anisotropy=0.5 \
    --tag=my-experiment
```

Flags map to the volumetric feature's runtime params. The compile gate (`ptVolumetric`) is flipped automatically when `--volumetric=on`. Vol scenes auto-skip the reference diff (the locked `GMT_Mandelbulb_v1.png` is calibrated for vol off). Each tagged run saves a separate PNG for side-by-side comparison.

Also added a 4xx/5xx fail-fast clause to the harness's fatal-pattern regex so chunk-load failures (TS syntax error → Vite returns 500) surface in <1s instead of timing out at 30s.

---

## Files touched

```
engine-gmt/features/volumetric/index.ts                # uVolQuality slider param
engine-gmt/shaders/chunks/lighting/volumetric_scatter.ts  # gate logic, DIR_LIGHT_DIST
engine-gmt/shaders/chunks/ray.ts                       # uVolEnabled → needNoise clause
debug/bench-shader.mts                                 # --volumetric=* flags, fatal regex
docs/gmt/02_Rendering_Internals.md                     # §2.6 rewrite
data/help/topics/rendering.ts                          # render.volumetric helpfile
docs/VOLUMETRIC_HANDOFF.md                             # this doc
```

---

## Open / deferred

Items from the original audit that are still unimplemented and deferred:

- **Beer-Lambert attenuation on shadow rays.** NEE shadow ray returns binary visibility; physically correct would multiply by `exp(-σ·distToLight)`. Light-through-thick-fog reads brighter than physically correct. Would need bench validation of the cost of an extra `exp()` per shadow ray.
- **Unified σ with atmosphere fog.** The Beer-Lambert in volumetric uses only `uVolDensity`; atmosphere has separate `uFogDensity`. Scenes with both thick atmosphere fog and volumetric scatter under-attenuate the scatter. Design call: keep them independent, or unify. Not a bug — just a possible cleanup.
- **Compile-gate sweep on `uVolEnabled`** — confirmed dead in the compiled shader for non-vol scenes (per S2 BENCH_SHADER_HANDOFF.md, `uVolEnabled` is declared but never referenced when `ptVolumetric=false`, so ANGLE strips it). Good as-is.

---

## When to revisit

Re-bench if:
- ANGLE / Chrome / D3D11 stack changes (new browser version with different fxc lowering rules).
- A directional-light default scene gets added (would surface the `DIR_LIGHT_DIST` cap's effect).
- Someone proposes "let's make the gate hash use proper PRNG mixing" — point them at the entry under "didn't pan out" first; this one keeps coming up because the audit reports flag it.

For accumulation-frame measurement (currently bench can only show interaction-frame cost cleanly), would need a harness extension that overrides `uBlendFactor` AND patches `trace.ts:181`'s step jitter to be deterministic. Not worth the work unless we're optimizing the steady-state path specifically.
