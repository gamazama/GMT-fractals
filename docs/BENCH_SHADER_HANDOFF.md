# Shader perf bench — session handoff

**Last updated:** 2026-05-02 by Claude session focused on `formula_Mandelbulb`
shader optimization.

This is a working doc for the next session picking up shader-perf work. Read
the **Hard constraints** and **What didn't work** sections before suggesting
optimizations — most of the obvious-looking wins don't apply on this stack.

---

## TL;DR

- Bench tool: `dev/debug/bench-shader.mts` → GPU-only timing harness with
  diff against a locked reference image.
- Run with: `npx tsx debug/bench-shader.mts` (needs `npm run dev` on :3400).
- It snapshots the **live** shader + uniforms from a real engine boot, replays
  in a bare WebGL2 canvas, times via `EXT_disjoint_timer_query_webgl2`, then
  accumulates 256 jittered frames for visual fidelity and diffs against
  `debug/bench-shader-refs/GMT_Mandelbulb_v1.png`.
- Verdict thresholds: **PASS** ≤0.5 MAE & ≤8 max, **WARN** ≤2.0 MAE & ≤32 max,
  **FAIL** anything more.
- Three saved images per run: `<formula>-<WxH>.png` (bench output),
  `…-diff.png` (signed red/green delta), `…-compare.png` (side-by-side).

---

## Cumulative wins locked in this session

| Path | Baseline | Now | Δ |
|---|---|---|---|
| Default scene GPU p50 | 9,100 µs | ~7,800 µs | **-14%** |
| Raymarch GPU p50 | 14,548 µs | ~12,400 µs | **-15%** |
| Raymarch compile time | 6,078 ms | ~5,270 ms | **-13%** |

All at MAE 0.00 against the reference (pixel-perfect, max diff = accumulation
noise floor of 5/255).

### The four optimizations that stuck

1. **Shadow saturation early-out** in `GetSoftShadow`
   (`engine-gmt/shaders/chunks/lighting/shadows.ts`).
   `if (res < 0.005) return 0.0;` after the `min()` accumulator — once `res`
   saturates, more samples can't change the clamped output.
   **-14% on default scene.** Mathematically correct, no quality regression.

2. **Reflection refinement DE → DE_Dist**
   (`engine-gmt/features/reflections/shader.ts`).
   Skip the full orbit-trap recompute at reflection hit refinement; return
   `vec4(refinedT, 0, 0, 0)`. Trap data was only used for color, often unused.
   **-11% GPU, -10% compile on raymarch path.**

3. **L3 bump finite-difference gated on `highQuality`**
   (`engine-gmt/shaders/chunks/material_eval.ts`).
   The 3 `getLayer3Noise` taps were running unconditionally; only the
   *application* of the bump was gated on `highQuality`. Gate the computation
   too — saves work on reflection-bounce inlines.
   **-3% GPU, -5% compile on raymarch path.**

4. **3-tap forward-difference normals** (`shading.ts`, `material_eval.ts`).
   `GetFastNormal` instead of `GetNormal` (4-tap tetrahedron) for the primary
   surface eval. Statistical tie with 4-tap on the shadow-dominated default
   scene, but ~5% theoretical cheaper and visually indistinguishable.

### Plus infrastructure improvements

- Bench fast-fails on page errors (TS syntax / GLSL compile / HMR fail) instead
  of hanging at timeout.
- Diff auto-skips for scene-variant runs (`--reflection-mode=*`,
  `--material=*`) since the reference is calibrated for default scene only.
- Diff visualization is now signed (red = bench darker, green = bench brighter).
- 3-up `…-compare.png` produced — reference | bench | diff in one image.
- Per-quadrant MAE in console output catches localized regressions.
- PNG metadata (`tEXt` chunks) stamped with timing, MAE, scene config.

---

## Hard constraints — DO NOT VIOLATE

These came from the user explicitly, mid-session. They override audit
suggestions:

1. **NO compile-time gating of UI-toggleable features.**
   Sliders, intensity knobs, mode dropdowns the user might drag — must stay
   runtime. Recompile-on-slider-drag breaks UX. The user sliding a roughness
   slider 0.05 → 0.5 must NOT trigger a 3-second shader rebuild.

2. **Discrete mode toggles** (boolean checkboxes that swap behavior — formula
   choice, render mode, feature on/off via a checkbox) **CAN** trigger
   recompile. This is consistent with existing DDFS `mode: 'compile'` feature
   behavior. But sliders cannot.

3. **No shader-variant cache scheme.** With 20+ toggles in app-gmt, even 2-3
   variants per toggle explodes combinatorially. ~1024 variants × 5s compile
   each = unworkable. The user explicitly rejected this approach.

4. **Quality regressions need user verification.** Anything that moves MAE
   above 0 needs the user to eyeball the `*-compare.png` image. Don't quietly
   accept a WARN result.

---

## What DIDN'T work (and why) — please don't retry

Each was bench-verified neutral-or-worse on this stack. Reverted.

| Attempt | Result | Why |
|---|---|---|
| Splitting `map()` → `mapDist()` in primary march loop | +5% slower | Compiler already DCEs unused `h.y/z/w` fields; the redundant `map()` at hit cost more than the inner-loop saving. |
| Replacing `mix(z, abs(z), step(0.5, uBurn))` with `if (uBurn > 0.5) z = abs(z)` | neutral | ANGLE/D3D11 predicates uniform-driven branches — both paths execute. |
| AO saturation early-out (5-sample default) | neutral | Per-iter check overhead exceeds savings on 5 samples. |
| Predicted-radiance shadow gate | neutral | All 3 default lights have meaningful contribution; gate never fires. |
| Hoisting `worldOriginOffset = uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh` out of march loop | neutral | Compiler already loop-hoists uniform-only expressions. |
| Wrapping color-snapshot mix block behind `if (uColorIter > 0.5)` | neutral | Compiler already CSEs `mix(x, y, 0)` → `x`. |
| NdotL backface check before normalize/divide | marginal | Few backface lights in our 3-light scene; theoretical save didn't materialize. |
| Hoisting BRDF invariants (`shininess`, `specNorm`, `F0`, `NdotV`, `kD`, `diffuseTerm`) out of light loop | neutral | Compiler already loop-hoists. |
| Refinement loop full-`DE` → `DE_Dist` (mirror of raymarch reflection win) | n/a | `uRefinementSteps=0` in default bench scene — would only matter if user enables it. Pattern is sound, just not active. |
| Decomposition double-capture cleanup | n/a | Already correctly gated by `!decompCaptured`; only fires once total. The agent audit was wrong. |
| `MAX_HARD_ITERATIONS` literal `2000 → 256` | neutral | Maintainer comment was right — ANGLE doesn't unroll define-bounded loops. |
| `MAX_REFL_STEPS` `256 → 128` | neutral | Same reason. |
| `getMappingValue` switch reorder (fast-path if-chain for common modes) | neutral | fxc already produces efficient dispatch regardless of source order. |
| `acosFast` (Lagae-Dutré) + `atan2Fast` (Padé) in `formula_Mandelbulb` | **neutral GPU + WARN diff (MAE 0.03)** | ANGLE/D3D11 already lowers hardware `acos`/`atan2` efficiently. Quality cost (max diff 20/255) for zero gain. |

---

## Stack-specific learnings (Windows / ANGLE / D3D11 / fxc)

The pipeline is GLSL → ANGLE-translated HLSL → fxc.exe → DXBC. Things that
**don't** behave like the audit reports assume:

- **Loop-invariant code motion is aggressive.** Hand-hoisting uniform-only
  expressions out of loops produces no measurable win.
- **CSE catches `mix(x, y, 0/1)` patterns.** Wrapping in `if (uniform > 0.5)`
  is a no-op.
- **Uniform-driven branches are predicated, not skipped.** `if (uniform)` and
  `mix(a, b, step(0.5, uniform))` cost approximately the same. The "free
  uniform branch via warp coherence" trick that works on AMD/NVIDIA-native
  paths doesn't survive through ANGLE.
- **Define-bounded `for` loops are NOT unrolled** even at high constant
  bounds. `for (i=0; i<2000; i++) if (i >= limit) break;` doesn't generate
  2000 unrolled bodies — fxc emits a real loop. Lowering the bound is neutral.
- **DCE of unused vec4 fields is excellent.** Returning a vec4 from `map()`
  whose `.yzw` fields aren't read downstream produces the same compiled cost
  as if the function returned a float.
- **`acos`/`atan2` lower to compact instructions.** Polynomial substitutes
  produce neutral or worse results on this stack.

What **does** consistently win:
- **Algorithmic early-outs** that introduce control flow the compiler can't
  infer (saturation breaks, contribution-zero skips).
- **Shrinking the IR fed to fxc** by pruning dead-but-emitted code (the L3
  bump finite-difference gating helped compile time even though the result
  was already gated downstream).
- **Eliminating redundant calls** to large functions (the reflection
  refinement DE→DE_Dist swap was a real win because `DE` is significantly
  bigger than `DE_Dist`).

---

## Bench scene details

The bench captures from a live `app-gmt.html` boot and force-applies the
formula's `defaultPreset`:

- **Camera:** `(0, 0, 2.157)` looking at origin (Mandelbulb's preset).
- **Resolution:** 1280×720, DPR 1.
- **Lights:** 3 point lights (white intensity 3, orange #ff8800 intensity 0.5,
  blue #0088ff intensity 0.25). Lights 0+1 cast shadows, light 2 doesn't.
- **Shadow steps:** 128. Shadow softness: 16.
- **AO samples:** 5. AO intensity: 0.28.
- **Reflection mode:** ENV (Fresnel-weighted env map). `reflection=0.2`,
  `roughness=0.75`. Above the cutoff, so reflection ray DOESN'T trace in
  default scene — that's why scene-variant runs use `--reflection-mode=raymarch`
  to actually exercise the reflection path.
- **Render mode:** Direct (not PathTracing).
- **Accumulation:** 256 frames with Halton(2,3) jitter, averaged in JS post-pass
  (out of timing window). Single-frame timing remains pure shader cost.

### Critical bug history (now fixed, but flag for any future bench work)

**Nested-array uniforms produced silent NaN** through the worker snapshot
chain. `uLightDir`, `uLightColor`, `uLightPos` arrived as `[[x,y,z], …]` and
`Float32Array.from(nestedArray)` returns `[NaN, NaN, …]` not flattened values.
The shader then ran with all-zero lights and the bench was secretly measuring
**a shader without lights firing** for many sessions. Fixed in
`shader-bench.html` `setUniform()` by detecting nested arrays and flattening
before `Float32Array.from`. **If any future bench shows surprisingly-cheap
numbers and a dim image, check this first.**

This bug invalidated several earlier "wins" (e.g., what looked like -10% from
3-tap normals was measured under broken-lights conditions). Always verify
the bench image looks lit and matches the engine's appearance before
trusting numbers.

---

## How to run

```bash
# Pre-req: dev server on :3400
cd dev/
npm run dev   # in another terminal, leave running

# Default bench
npx tsx debug/bench-shader.mts

# Reuse cached snapshot (skip re-snapshot if shader unchanged)
npx tsx debug/bench-shader.mts --use-snapshot=debug/bench-shader-snapshot.json

# Snapshot only, don't run timing
npx tsx debug/bench-shader.mts --snapshot-only

# Bench an arbitrary saved frag (override snapshot's shader)
npx tsx debug/bench-shader.mts --frag=debug/shader-dump/some.frag

# Scene matrix — different reflection modes / material presets
npx tsx debug/bench-shader.mts --reflection-mode=raymarch --material=mirror --tag=rm-mirror
# Modes: off | env | raymarch
# Materials: default | matte | glossy | mirror

# Lockfile / queueing — bench-shader auto-waits behind bench-perf
# Override: --no-wait (fail if locked) or --force (steal lock)
```

Output:
- `debug/bench-shader-latest.json` — full data
- `debug/bench-shader-<stamp>.json` — archive
- `debug/bench-shader-refs/<formula>-<WxH>.png` — bench image
- `debug/bench-shader-refs/<formula>-<WxH>-diff.png` — signed diff
- `debug/bench-shader-refs/<formula>-<WxH>-compare.png` — 3-up panel
- `debug/bench-shader-snapshot.json` — captured live state (cached)

---

## Where to look next

**Promising areas not yet explored:**

- **Atmosphere volume body cost when glow=0.**
  `if (uGlowIntensity > 0.0001)` runs per march step inside the volumetric
  body. With glow off (default), the branch evaluation is essentially free on
  uniform-coherent warps... but the body emits `accColor += getGlowColor(...)`
  which references `h.yzw`. We changed `h` capture to `vec4(mapDist, 0,0,0)`
  conditionally; verify glow doesn't break when re-enabled.

- **`getSurfaceMaterial` as a separate `getSurfaceMaterialBounce()` function.**
  The minimal-version L3 bump gate already won. The full agent suggestion was
  to split into a lean function for the reflection inline site. Bigger refactor,
  could shrink raymarch DXBC further. Unmeasured.

- **Skip `applyDistanceFog` (line ~2005 of dump) — dead code.** Defined but
  never called; `applyPostProcessing` has the same logic inline. Shrinks
  source slightly, no runtime impact expected. Compile time test.

- **Shadow march starts at `t = noise * 0.01` then `max(t, 1e-5)` per step.**
  The `max` is only meaningful on the first step. Hoist to ensure invariant
  outside the loop. Marginal but free if it's not already CSE'd.

**High quality risk, save for last:**

- Aggressive AO-mode simplifications (cone-trace with fewer DE evals)
- Reduced shadow step count via early heuristic (e.g., distant lights get
  uShadowSteps/2)
- Custom tonemap path bypass for fast-preview render

**Maybe-pointless audit items:**

The original 4-agent audit produced ~30 items. After bench-verification, only
~4 actually moved the bench. Don't blindly implement audit suggestions — bench
each one and revert on neutral. The compiler is much smarter than the audits
assumed.

---

## Files modified this session

```
engine-gmt/shaders/chunks/lighting/shadows.ts          # shadow saturation early-out
engine-gmt/shaders/chunks/lighting/shading.ts          # 3-tap forward normal
engine-gmt/shaders/chunks/lighting/pbr.ts              # NdotL early-out + BRDF hoists
engine-gmt/shaders/chunks/material_eval.ts             # L3 bump gated on highQuality
engine-gmt/shaders/chunks/trace.ts                     # worldOriginOffset hoist
engine-gmt/shaders/chunks/de.ts                        # saved-state direct-assign
engine-gmt/features/reflections/shader.ts              # refinement DE → DE_Dist
engine-gmt/features/reflections/index.ts               # (no changes — touched + reverted)
engine-gmt/formulas/Mandelbulb.ts                      # cached trig (kept), fast-acos (reverted)

debug/bench-shader.mts                                 # diff thresholds, scene-variant skip,
                                                       # fast-fail on errors, PNG metadata
shader-bench.html                                      # nested-array flatten fix,
                                                       # accumulation pass, tonemap, compile timing
app-gmt/main.tsx                                       # window.__fractalRegistry export
engine-gmt/engine/worker/renderWorker.ts               # GET_UNIFORMS_SNAPSHOT handler
engine-gmt/engine/worker/WorkerProxy.ts                # getUniformsSnapshot()
engine-gmt/engine/worker/WorkerProtocol.ts             # protocol additions
debug/helpers/bench-lock.mts                           # cross-process bench mutex
```

---

## One last note

The bench's pixel-perfect baseline at MAE 0.00 / max 5 is **the primary asset
of this session.** Anything that moves it should be verified against the
3-up compare image and discussed with the user before being kept. The
infrastructure is calibrated; trust it.
