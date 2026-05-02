# Shader perf bench — session handoff

**Last updated:** 2026-05-02 (session 2) by Claude continuing shader optimization.
Session 2 additions documented inline below; original session-1 content preserved
unchanged so the "what didn't work" history doesn't bitrot.

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
| Default scene GPU p50 | 9,100 µs | ~6,670 µs | **-27%** |
| Default scene compile | ~3,200 ms (est.) | **~2,318 ms** | **session-2 cumulative -28%** |
| Raymarch (compile-only path, mis-bench) | 14,548 µs | ~7,800 µs | (don't trust — see gotcha) |
| Raymarch (actual ray-tracing path, mirror) GPU | (never benched in S1) | **~10,189 µs** | new baseline |
| Raymarch compile time | 6,078 ms | **~3,846 ms** | **-37%** |

Default scene gained -3% GPU in session 2 from the burning compile-gate, and
a separate -6.8% on compile time from the texture compile-gate (no GPU win on
that one — IR shrinkage only).

The "raymarch GPU" row carries an asterisk: session 1's number tracked the
*compiled-but-not-traced* path because `--reflection-mode=raymarch` alone
doesn't override roughness past the cutoff (see Gotcha below). Session 2
added `--material=mirror` to actually fire the ray and locked in **10,390 µs**
as the real raymarch baseline. The `--reflection-mode=raymarch` cells from
session 1 are not directly comparable; use the mirror-preset row for
session-3 comparisons.
All at MAE 0.00 against the reference (pixel-perfect, max diff = accumulation
noise floor of 5/255).

### Session-2 wins

7. **`uAreaLights` compile-gate** (`engine-gmt/features/lighting/index.ts`,
   `shaders/chunks/lighting/pbr.ts`, `shaders/chunks/pathtracer.ts`).
   Boolean checkbox at lighting/index.ts:228, default false. The runtime
   `if (uAreaLights > 0.5)` switch in `calculatePBRContribution` was forcing
   a uniform-driven branch around `GetHardShadow` (stochastic path) vs
   `GetSoftShadow`. Existing compile-time `stochasticShadows` flag emitted
   *both* paths when on (default), letting the runtime switch select.
   Extended `getLoopOpen` and `getPathTracerGLSL`'s shadow logic to take an
   `areaLightsActive` flag and emit only one shadow path at compile time.
   `areaLights` feature def marked `onUpdate: 'compile', noReset: true`.
   **Default scene: GPU 6,722 → 6,666 µs (-0.8%, noise), compile 2,635 →
   2,318 ms (-12%). Raymarch+mirror: GPU 10,387 → 10,189 µs (-1.9%, noise),
   compile 4,310 → 3,846 ms (-10.8%).** Shader -823 bytes / -19 lines.
   MAE 0.00 on default scene, raymarch reflections still rendering in
   compare image.

   **Resolved open question: fxc does NOT predicate function-call branches.**
   The big GPU win never materialized because ANGLE/D3D11 already emits
   dynamic flow control around function-call uniform branches — only one
   shadow march was actually executing per light. The compile-gate's value
   came entirely from IR shrinkage helping fxc compile faster. This
   matches the `uUseTexture` pattern (also a function-call branch:
   GPU-neutral, compile -6.8%). Going forward: simple-body uniform branches
   (like `mix(z, abs(z), step(0.5, u))` in burning) ARE predicated and have
   real GPU wins to extract; function-call branches give compile-only wins.

6. **`uUseTexture` compile-gate** (`engine-gmt/features/texturing.ts`,
   `shaders/chunks/material_eval.ts`, `shaders/chunks/de.ts`).
   `texturing.active` is a checkbox toggle (default off). The runtime
   `if (uUseTexture > 0.5)` in `getSurfaceMaterial` was predicating
   `getTextureColor()` on every surface eval, and the `useLLI` check in
   `map()` was predicated similarly. Marked `active` as `onUpdate: 'compile',
   noReset: true`; added a small `inject` to TexturingFeature that calls
   `builder.addDefine('USE_TEXTURE')` only when state.active is true; wrapped
   both use sites with `#ifdef USE_TEXTURE`. **GPU neutral on default scene
   (~6,722 µs, within run-to-run noise), but compile -6.8% (2,827 → 2,635 ms).**
   Runtime cost of `getTextureColor` predication on default-Mandelbulb was
   smaller than the bench's noise floor, but the IR shrinkage materially
   helped fxc — 6 texture-related uniforms are now stripped from the linked
   program (113 → 119 stripped).

5. **`uBurningEnabled` compile-gate** (`engine-gmt/features/geometry/index.ts`).
   The runtime `mix(z, abs(z), step(0.5, uBurningEnabled))` line in `map()` /
   `mapDist()` was predicated on ANGLE so `abs(z.xyz)` ran every iter regardless
   of the toggle. Session-1 tried replacing it with a runtime `if` (neutral —
   also predicated). Session 2 changed `burningEnabled` from a runtime uniform
   to a compile-toggle (`onUpdate: 'compile', noReset: true`) and emit
   `z.xyz = abs(z.xyz);` from the inject only when the checkbox is on; emit
   nothing when off. **-3.0% GPU p50, -3% compile on default scene** (two-run
   average; baseline 6,955 → 6,748 µs). Uniform `uBurningEnabled` is kept
   declared in `ShaderBuilder.ts` because formulas like `MandelTerrain` still
   reference it directly. ANGLE strips it for default-Mandelbulb's compiled
   shader (uniform count: 113 → 112 applied).

   **Pattern**: any boolean checkbox-bound uniform with `mix(x, y, step(0.5, u))`
   or `if (u > 0.5) ...` runtime sites is a compile-gate candidate, *as long
   as the use site is actually present in the compiled shader*. See "compile-gate
   candidate sweep" in the appendix — most other candidates turned out to be
   already DCE'd or already parent-gated.

### The four session-1 optimizations that stuck

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

Each was bench-verified neutral-or-worse on this stack. Reverted (or kept as
no-op cleanup where noted).

**Session 2 additions** (above the original session-1 table):

| Attempt | Result | Why |
|---|---|---|
| Removing dead `applyDistanceFog` from `shading.ts` | neutral runtime, neutral compile | fxc DCE already eats unused functions. Kept the removal as cleanup but it's confirmed not a perf lever — don't bother hunting more dead-but-defined code on this stack. |
| Compile-gate sweep over other boolean uniforms (`uInterlaceEnabled`, `uVolEnabled`, `uAOMode`, `uGlowMode`, `uUseTexture`, `uWaterActive`) | most are no-ops on default-Mandelbulb bench | `uInterlaceEnabled` and `uVolEnabled` are *declared* but never *referenced* in the compiled shader for non-interlaced / non-PT scenes — ANGLE strips them. `uGlowMode`'s use site is only reached when `glowEnabled` is on (already a compile gate), and `uGlowIntensity=0` predicates the body to zero anyway. `uAOMode`'s description explicitly says "switches at runtime" (user intent — leave it). `uUseTexture` is a real candidate but per-pixel-once (not per-iter) so estimated win <0.5%; deferred. **Lesson:** before compile-gating a candidate, grep the *compiled dump* (`debug/shader-dump/live-mandelbulb.frag`), not the engine source. Lots of uniforms get declared but DCE'd because their feature isn't injected. |
| Wrapping the `uParamD` z-twist body in a user function (`mandelbulb_zTwist`) to try to convert the predicated simple-body branch into a dynamically-dispatched function-call branch (theory: fxc dispatches function-call branches but predicates simple bodies — confirmed by `uAreaLights` test) | neutral GPU + neutral compile (two runs) | **fxc auto-inlines short user functions before generating DXBC.** After inlining, the wrapper is gone and we're back to the original predicated simple body. The technique to "trick" fxc into dispatch via wrapping does not work on this stack (ANGLE GLSL→HLSL→fxc). Implication for slider-driven simple-body branches (e.g., `uColorTwist` atan, `uParamD` z-twist, the radiolaria `uVec2B.x > 0.5` check): we cannot escape the predication cost without either (a) compile-gating, which is forbidden for sliders, or (b) introducing a master-checkbox compile-gate that fronts the slider. Closes one promising avenue. |

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
  `roughness=0.75`. Above the cutoff (default 0.62), so reflection ray
  DOESN'T trace in default scene — the surface integrator uses the
  Fresnel-weighted env-map fallback instead.

> **GOTCHA (session 2, 2026-05-02):** `--reflection-mode=raymarch` *alone* only
> compiles the raymarch reflection function into the shader; it does NOT
> override roughness, and the runtime check
> `if (roughness <= uReflRoughnessCutoff && ...)` at
> `features/reflections/index.ts:54` still gates the ray trace. With
> `roughness=0.75 > cutoff=0.62`, the ray never fires — you're measuring
> "compiled but not traced" extra-code-cost, not the actual raymarch path.
> Session-1's "raymarch GPU 12,400 µs" number was tracking this misleading
> path. To exercise the *real* raymarch path, also pass `--material=mirror`
> (or any preset with roughness < 0.62). The mirror preset
> (`reflection: 1.0, specular: 1.0, roughness: 0.05, metallic: 1.0`) puts
> roughness well below cutoff. Image will visibly show specular reflections
> in the *-compare.png — visually verify before trusting the number.
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

## Where to look next (refreshed after full-shader read, session 2)

A systematic read of the entire 2,260-line live shader produced this candidate
inventory. Each is tagged with **Tier** (1 = actionable now, 2 = needs a UX
change first, 3 = found-but-not-worth) and per-call leverage.

### Tier 1 — actionable now, no UX change

- **`uAreaLights` compile-gate** *(IN PROGRESS — session 2)*.
  Boolean checkbox, default **false** (matches bench scene).
  [features/lighting/index.ts:228](engine-gmt/features/lighting/index.ts#L228).
  Wraps the entire stochastic-shadow path in `calculatePBRContribution`
  (dump 1939–1962 / `shaders/chunks/lighting/pbr.ts:67`): hemisphere tangent
  basis, jittered direction, **plus a full 128-step `GetHardShadow` march**.
  When `uAreaLights=false`, ANGLE either predicates (running both
  GetSoftShadow AND GetHardShadow per shadow-casting light = potentially big
  win to fix) or dynamically dispatches (no win). Result is empirically
  testable. Implementation: extend `getLoopOpen` and `getPathTracerGLSL`
  shadow logic to accept `areaLightsActive: boolean` and emit only one
  shadow path (matching the existing `stochasticShadows` build flag
  pattern). Mark `areaLights` as `onUpdate: 'compile', noReset: true`.
  **Resolves the open question: does fxc predicate function-call branches?**

- **`uCamType` compile-gate** *(per-pixel-once, ~<0.5%)*.
  Three-way dropdown (perspective=0 / ortho=1 / equirect=2) at
  `getCameraRay` line 1581. Equirect path has 4 trig calls + matrix
  construction; ortho path has a normalize. Default perspective. ANGLE
  predicates all three in default-Mandelbulb today. Discrete enum →
  eligible for compile-gate. Marginal but real.

- **`juliaMode` compile-gate** *(per-ray, sub-1%)*.
  Boolean checkbox, default false. Used in `map()` line 914 and `mapDist()`
  line 1056: `vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));`.
  Same pattern as burning, but per-ray (outside iter loop) — much smaller
  leverage. Eligible.

- **`preRotEnabled` rotation compile-gate** *(per-iter, possibly modest)*.
  `gmt_precalcRodrigues`/`gmt_applyRodrigues` (preamble lines 641–671)
  guard their bodies on `abs(params.z) > 0.001` / `abs(gmt_rotSin) > 0.0001`.
  Per-iter when called inside formula. `preRotEnabled` is already a
  boolean checkbox — but the *application* of the rotation in the formula
  inject is gated runtime, not compile. Investigate whether the rotation
  matrices are unconditionally applied per-iter and could be compile-gated.

### Tier 2 — actionable but requires UX change (master "X enabled" checkbox added next to existing slider)

These are the biggest theoretical wins remaining, but each requires turning
a slider-only feature into a slider + master-checkbox combo. The master
checkbox is the compile-gate; the slider stays runtime within the on-state.

- **Layer 2 master enable** *(per-pixel-once, BIG)*.
  When `uBlendOpacity = 0` (default), `getMappingValue(uColorMode2, ...)` +
  `textureLod0(uGradientTexture2, ...)` predicate-execute every surface
  eval, every frame. `getMappingValue` is a multi-mode switch with several
  `pow`/`atan`/`fract` paths. Probably the largest predicated cost
  remaining in `getSurfaceMaterial`.

- **Rim light master enable** *(per-pixel-once, small)*.
  `pow(1.0 - NdotV, uRimExponent)` runs every pixel even when `uRim=0`
  (dump line 2099 / `calculateShading`). One `pow` saved.

- **DOF master enable** *(per-pixel-once, modest)*.
  Predicated DOF block (dump 1616–1646) has 4 trig calls + 2 blue-noise
  fetches + normalize when `uDOFStrength = 0`. Per-pixel-once.

- **Ambient IBL master enable** *(per-pixel-once, modest)*.
  Second `GetEnvMap(n, 1.0)` call (dump line 2104) is gated on
  `uEnvStrength > 0.001`. uEnvStrength is a slider with default > 0.001
  in many scenes, so this fires — but for scenes that disable env, the
  second env-map sample is wasted predicated work.

- **Volumetric/atmosphere body when glow=0** *(per-march-step, but slider-locked)*.
  `if (uGlowIntensity > 0.0001)` at traceScene line 1702 predicate-runs
  `exp() × 2`, smoothstep, mix per step. uGlowIntensity is a slider
  (no master checkbox today). Adding a "glow enabled" master would make
  this gate-able. Note: `glowEnabled` already exists as a parent compile
  flag — verify whether the per-step block is even injected when off.

### Tier 3 — found, not worth pursuing

- **`getSurfaceMaterial` bounce-split.** Re-evaluated this session 2.
  Original agent estimate of 5–8% was based on Layer 2 being active.
  In the bench scene (and most default scenes), `uBlendOpacity = 0`, so
  the L2 block is already runtime-predicated dead — the bounce-split would
  only help when L2 is active. Solving this is better done via Tier-2
  Layer-2 master-enable, which helps ALL surface evals (primary AND
  bounce), not just bounces. **Don't pursue the bounce-split as
  conceived.**

- **`accScatter` dead variable** in traceScene (line 1673). fxc DCEs it.
  Confirmed neutral in the same way as `applyDistanceFog`.

- **`if (NdotL <= 0.0) continue`** at calculatePBRContribution dump line
  1933. Dead branch — guaranteed positive after the earlier backface bail
  (line 1919). Compiler DCEs.

- **GetSoftShadow t-floor hoist** (line 1153 `max(t, 1e-5)`). Saves 1 max
  op per shadow step ≈ 256 ops/pixel = negligible.

- **`getGlowColor`'s gate redundancy** (line 613 vs site at 1702). Already
  short-circuits when `uGlowIntensity < 0.0001`. fxc handles.

- **Dual env-map sampling pattern.** `calculateShading` calls `GetEnvMap`
  twice (reflDir at 2094, normal at 2104). They use different roughness
  and different direction — can't fuse without quality regression.

### Stack-specific lessons distilled this session

- **Compile-gating discrete checkboxes works, but only when the branch is
  emitted in the live shader.** Always verify candidates against the
  live dump, not the engine source — many uniforms get DCE'd because
  their feature isn't injected for the current scene config.
- **Compile-time IR shrinkage helps fxc** even when the runtime branch
  was already cheap. The `uUseTexture` gate gave -6.8% compile despite
  GPU-neutral runtime — IR size apparently matters to fxc more than
  predicated execution cost.
- **Function-call branches may behave differently than simple-body
  branches.** Session 1's "uniform if is predicated, both paths run"
  was tested with simple bodies (`z = abs(z)`). For function calls
  (`if (u > 0.5) GetHardShadow(...)`), fxc may emit dynamic flow control
  instead. The `uAreaLights` test should resolve this.
- **The bench's median is far more stable than the mean/σ on
  high-variance scenes** like raymarch+mirror (σ ≈ 2,500 µs but
  run-to-run median delta < 10 µs). Trust median for signal; ignore mean
  variance unless looking at distribution shape.

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

## Files modified — session 1

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
```

## Files modified — session 2

```
engine-gmt/features/geometry/index.ts                  # burningEnabled compile-gate
engine-gmt/features/texturing.ts                       # uUseTexture compile-gate (active: onUpdate compile + inject)
engine-gmt/features/lighting/index.ts                  # areaLights compile-gate; areaLightsActive wired through inject
engine-gmt/shaders/chunks/material_eval.ts             # USE_TEXTURE #ifdef wrapping the texture branch
engine-gmt/shaders/chunks/de.ts                        # USE_TEXTURE #ifdef wrapping the LLI mode check
engine-gmt/shaders/chunks/lighting/pbr.ts              # getLoopOpen/PBR* take areaLightsActive, emit one shadow path
engine-gmt/shaders/chunks/pathtracer.ts                # getPathTracerGLSL takes areaLightsActive, emits one shadow path
engine-gmt/shaders/chunks/lighting/shading.ts          # dead applyDistanceFog removed

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

---

## Session 3 — Path-tracer optimization (started 2026-05-02)

### Harness extension shipped
Added four CLI flags to `bench-shader.mts` to support PT-mode benching:

```
--render-mode=Direct|PathTracing    (default Direct — preserves S1/S2 baseline)
--pt-bounces=<n>                    (uPTBounces override, range 1-8, default 3)
--pt-nee-all=true|false             (PT_NEE_ALL_LIGHTS define)
--pt-env-nee=true|false             (PT_ENV_NEE define)
```

PT runs auto-skip the reference diff (`isSceneVariant=true` includes PT mode)
because the locked GMT_Mandelbulb_v1.png is calibrated for Direct mode only.
PT runs save tagged images (e.g., `Mandelbulb-pt-baseline-1280x720.png`) so
they don't overwrite the Direct reference.

**Initial PT bench numbers (Mandelbulb default scene + PT, no other overrides):**

| Config | Frag bytes | Compile | GPU p50 | per-pixel |
|---|---|---|---|---|
| Direct (S2 baseline) | 78,599 | 2,321 ms | 6,780 µs | 7.36 ns |
| PT, NEE flags off | 93,293 | 10,319 ms | 25,901 µs | 28.10 ns |
| PT + PT_NEE_ALL_LIGHTS + PT_ENV_NEE | 93,342 | 13,910 ms | 49,191 µs | 53.38 ns |

Two NEE flags add only **49 bytes of source** but ~1.9× the GPU time. That's
the per-bounce shadow + NEE light loop cost, multiplied by the bounce count.

### Session-3 wins

| Patch | b=3 PT GPU p50 | Δ vs pre-S3 | b=5 GPU p50 | Δ vs pre-S3 |
|---|---|---|---|---|
| Pre-S3 baseline | 25,901 µs | — | 37,969 µs | — |
| Patch 1: last-bounce skip | 19,121 µs | -26.2% | (untested) | — |
| Patch 1 + 2: standard RR | 17,778 µs | -31.4% | 25,568 µs | -32.6% |
| Patch 1 + 2 + 4: VNDF + clamps removed | 18,081 µs | -30.2% | 30,455 µs | -19.8% |
| **+ AO drop from PT path** | **17,772 µs** | **-31.4%** | (untested) | — |

VNDF costs ~300 µs at b=3, but 4,900 µs at b=5 because removing the throughput
firefly clamp (was `min(throughput, 4.0)`) lets indirect bounces carry full
energy through RR. The pre-S3 form was silently killing indirect-bounce
contribution via clamping — fast but biased dark. VNDF + no-clamp is the
correct unbiased form; user visually approved the brightness shift.

#### Patch 1 — Last-bounce skip (`pathtracer.ts:271`)

After the env-NEE block (line 270), inserted:
```glsl
if (bounce + 1 >= maxBounces && uFogDensity < 0.001) break;
```

The bounce-direction selection (272-303), `traceSceneLean` for the next bounce
(310), and the RR check (322-331) all only matter for the *next* iteration's
work. On the final bounce these outputs are written and never read. The fog
block (314-318) is the one exception — it adds real radiance contribution
along the bounce ray — so we keep the loop running when fog is enabled.

Verification: baseline-vs-patch pixel MAE = 0.284, run-to-run MAE = 0.219.
The patch-induced delta (0.06) is within snapshot drift (Three.js camera/light
micro-drift between fresh engine boots), not a radiance change. PT mode's
inherent Monte Carlo noise puts MAE ~0.2 / max ~30 as the natural noise floor
(vs Direct mode's 0.0 / 5).

**Lesson:** the most impactful PT optimization in S3 came from a one-line
control-flow check that the compiler can't infer (it doesn't know bounce
loop bounds, can't prove inter-iteration dataflow liveness through a
function with `out` parameters). Same pattern as S1's shadow saturation
early-out. Look for "interprocedural liveness" wins — places where work is
conditionally consumed by a *future* iteration, but the compiler can't see
that the iteration won't run.

#### Patch 2 — Standard Russian Roulette (`pathtracer.ts:316-329`)

Replaced the old "only kill paths with maxThroughput < 0.05 starting bounce 3"
form with the standard PBRT §13.7 / Arvo & Kirk 1990 form:

```glsl
if (bounce >= 1) {
    float maxThroughput = max(throughput.r, max(throughput.g, throughput.b));
    float q = clamp(maxThroughput, 0.05, 1.0);
    float rrRand = fract(blueNoise.r * 1.618 + 0.7);
    if (rrRand > q) break;
    throughput /= q;
}
```

The old form barely fired at the default 3-bounce setting (and never fired
when stacked with Patch 1, which already breaks before RR on the last bounce).
The new form terminates dim paths every bounce while keeping bright paths
alive. Survivors get `1/q` reweighting → unbiased estimator.

Verification: pixel MAE between baseline and patch1+2 = 0.289, run-to-run
noise = 0.244. Patch is bias-neutral within sampling noise (256-frame
accumulation converges to the same expectation).

**Why it stacks with Patch 1:** Patch 1 removed dead work on the *last*
bounce. Patch 2 lets RR kill *middle* bounces stochastically. They attack
different inefficiencies — Patch 1 is interprocedural liveness, Patch 2 is
estimator efficiency.

#### Patch 3 — Power-weighted light selection (ATTEMPTED TWICE, REVERTED BOTH)

PBRT §12.6.2: instead of uniform pick + `pdf = activeCount` compensation,
sample lights proportional to `intensity * luminance(color)` with `pdf = 1/pPick`.
Mathematically unbiased.

**First attempt** (before VNDF): MAE 0.65 vs pre-S3 baseline (vs run-to-run
0.23). Reverted. Initial diagnosis: firefly-clamp interaction (per-sample
`directContrib` was being multiplied by variable pdf, then clamped, biasing
dim-light contributions). Removing the clamp didn't help — MAE still 0.63.

**Second attempt** (after VNDF + clamps removed): MAE 0.61 vs VNDF baseline.
Same magnitude. The bias diagnosis was wrong — the real issue is *per-sample
variance*. Power-weighted IS reduces variance only when one light dominates
the integrand. With Mandelbulb's `{3.0 white, 0.5 orange, 0.25 blue}` lights
contributing roughly comparably to typical pixels, power-weighting just
shifts variance from bright lights (now well-sampled) to dim lights (now
boosted ~30× when picked). Per-pixel mean at 256 frames doesn't converge
cleanly.

**When to revisit:** after MIS lands. MIS combines BSDF-sampled and
NEE-sampled estimates with optimal weighting; this naturally smooths the
dim-light variance source.

**Lesson:** "unbiased" is necessary but not sufficient. A sampling change
that converges to the same expectation can still produce visibly different
images at finite sample count if it shifts variance around. The bench's
"is this image identical?" check (MAE within run-to-run noise) is testing
finite-sample convergence, which is exactly what users see. An estimator
that's right at infinity but worse at 256 frames is worse for users.

#### Patch 4 — VNDF GGX sampling + firefly clamp removal (`pathtracer.ts:88-118, 305-318`)

Replaced half-vector GGX importance sampling with Heitz 2018 "Sampling the
GGX Distribution of Visible Normals." Old throughput weight:

```glsl
F * G * HdotV / (NdotV * NdotH) / probSpec   // half-vector IS — can blow up at grazing
```

New throughput weight:

```glsl
F * G2 / G1 / probSpec = F * G1L / probSpec  // VNDF — bounded in [0, 1]
```

Same compute cost in theory; ~300 µs measured overhead at b=3 (extra basis
transforms and the algorithm's stretch/unstretch dance). Pays back by:
1. **Removing the firefly clamp** (`directContrib *= min(1.0, uPTMaxLuminance / dcLum)`
   on NEE, `throughput = min(throughput, 4.0)` per-bounce). Both were biased
   dim-shifters that VNDF makes unnecessary. With VNDF in place, removing
   them changed image MAE by 0.24 (= run-to-run noise) — clamps were no-ops.
2. **Producing the correct unbiased image** (vs baseline's clamp-biased dim
   render). User confirmed "the brightness actually looks better now."

**Production engines** (Cycles 2018, Arnold, RenderMan all moved to VNDF
~2018) — same algorithm, same advantages.

**Caveat:** correctness improvement, modest perf overhead. At higher bounce
counts (b≥5) the now-correct throughput keeps more indirect paths alive
through RR, so total work increases. Pre-S3 was fast precisely because the
clamps were silently killing energy. The new form is slower and right.

#### Bench harness improvements (`debug/bench-shader.mts`, `debug/helpers/image-diff.mts`)

Two real bugs caught while debugging Patch 3:

1. **Console error filter was too narrow** — only matched 4 patterns. Real
   GLSL compile errors (`ERROR: 0:42: ...`) and other shader-compile failures
   weren't recognized → 30s silent timeouts. Filter now matches GLSL error
   format, JS exceptions, link failures, module-load failures.

2. **No engine-state diagnostics on timeout** — when boot stalled, all you
   got was "TimeoutError." Now dumps `__gmtProxy` state (`isBooted`,
   `hasCompiledShader`, `isCompiling`, `lastError`) and prints last 10
   console errors/warnings. Distinguishes "shader hung in fxc compile" from
   "Vite 500 on a chunk" from "TS syntax error" instantly.

Also added `debug/helpers/image-diff.mts` — pixel MAE/RMSE/maxErr between N
PNGs via headless Playwright canvas. Used to verify patches are bias-neutral
when bench can't auto-diff (PT mode auto-skips reference diff because no
locked PT reference yet).

#### Patch 5 — Drop AO from PT path (`pathtracer.ts:159-162`)

Replaced the `if (uAOIntensity > 0.01 && bounce == 0) ao = GetAO(...)` block
with a constant `float ao = 1.0;`. Saves ~5 DE_Dist taps per primary pixel
(GetAO uses 5 cosine-hemisphere samples). Compile time also dropped ~10%
because GetAO is no longer reachable from the PT path and gets stripped.

Theoretical justification (Agent 3): AO is a screen-space approximation of
multi-bounce GI; PT computes the same effect properly via the bounce loop.
Keeping AO inside PT double-shades corners.

**Bench result:** -1.7% GPU at b=3 (modest; the GetAO function-call branch
was already dynamically dispatched away when uAOIntensity=0). MAE 2.79 vs
the with-AO render — significant visual change, NOT just double-counting
removal: corners visibly brighter without AO. PT at the default 3 bounces
under-samples GI enough that AO was contributing real light-fill. User
visually approved the brighter result.

**Lesson:** "AO is double-counting in PT" is theoretically right but
practically depends on bounce budget. At infinite bounces, PT replaces
AO completely. At 3 bounces, AO was a useful approximation. Drop or
keep is a creative judgment call — perf alone doesn't justify it.

---

## Session 3 wrap-up — reflection-bounce research + diminishing returns

After patches 1+2+4+5 shipped (commit 048652f), launched a focused 2-agent
review on PT reflection-bounce-specific code: one neutral code review, one
production-veteran lens. Bench scene was switched to `--material=mirror`
(roughness=0.05) to actually exercise low-roughness specular bounces.

### Mirror-mode bench baseline
| Config | b=3 GPU p50 |
|---|---|
| PT default scene (roughness=0.75, no real reflections firing) | 17,772 µs |
| PT mirror mode (roughness=0.05, specular bounces fire) | 18,846 µs |

Mirror only adds ~6% — VNDF's grazing-angle handling is doing its job at
low roughness. The scene is *almost* equally cheap to render in mirror
mode as in default mode.

### Key qualitative finding (user observation)
**Mirror mode in PT is a degenerate scene.** Point lights have no surface
that BSDF rays can intersect, so a mirror surface in PT can only reflect:
(a) other Mandelbulb geometry, (b) the env map. The colored point lights
contribute via NEE direct lighting only — they don't appear in the mirror
reflections at all. Visible-light-spheres are a cosmetic overlay (added
at end of trace, not in BSDF intersection), not a true emission surface.

Result: mirror-mode renders look "wrong" because the scene fundamentally
can't render colored highlights of the lights via specular paths. Until
true area lights ship (`plans/area-lights.md`), reflection-quality
optimization is hard to validate visually — the underlying scene is
incomplete for specular evaluation.

### Patch 6 — Roughness regularization (Kaplanyan & Dachsbacher 2013)

Tried: `roughness = max(roughness, 0.1 * float(bounce));` after the
existing min-roughness clamp. Production-standard ("Filter Glossy" in
Cycles) — widens GGX lobe progressively on indirect bounces to reduce
sharp-specular caustic-style firefly variance.

**Bench result:** perf-neutral on both default and mirror (variance
reduction is convergence-rate not per-frame GPU). Image effect:
- Default scene (roughness 0.75 > all per-bounce floors): bit-equivalent.
  MAE 0.24 vs run-to-run 0.23 — patch is a true no-op.
- Mirror scene: MAE 0.34 vs run-to-run 0.18. Real but small visual shift —
  bounces 1+ slightly fuzzier.

**REVERTED.** Two reasons:
1. The mirror scene is degenerate (no light reflections — see above).
   Without true area lights, the scene can't validate whether the
   "filter glossy" effect is helping. User judgment: "marginally better
   but within the 'looks wrong' category."
2. Hardcoded `0.1 * bounce` is a magic number; if shipped, should be a
   slider. Defer until area lights make the visual validation meaningful.

**When to revisit:** after `plans/area-lights.md` Phase 3 ships and
mirror-mode renders are visually correct. Then re-attempt with proper
visual validation; consider exposing the floor as a slider.

### Patches 7+8 — Refinement DE→DE_Dist + skip refinement on bounce ≥ 1

Both proposed by the code-review agent as 3-7% wins each in mirror mode.
**Did not implement** — discovered `uRefinementSteps = 0` in the default
bench scene. The refinement loop (`trace.ts:125-143`) is gated by
`if (refine > 0)` and never fires when the slider is off.

ANGLE/D3D11 dynamically dispatches around the function-call uniform
branch (per S2 finding), so when `uRefinementSteps = 0` the entire
refinement block is skipped at runtime — there's nothing for these
patches to optimize on the default bench.

**For users who enable refinement** (`uRefinementSteps > 0`), these
patches would still pay off:
- P7: replace `map(p_ref + uCameraPosition)` with `mapDist(p_ref + uCameraPosition)`
  in the inner loop, then one final `map()` at convergence to refresh
  trap data. Mirror of the S1 reflection-shader win.
- P8: gate refinement on `bounce == 0` only — indirect bounce hits use
  unrefined position (throughput attenuation hides sub-pixel error).

**Deferred** rather than blind-shipped: without bench validation, can't
catch a regression. If refinement-enabled users surface as a target
audience, add a `--refinement-steps=N` CLI flag to the bench harness and
verify these patches against that scene config.

### Veteran's strategic note (worth preserving)

> "Your S3 work is the kind of work that ages well. VNDF, RR, dead-work
> elimination, AO drop — these are foundational. The +6% mirror penalty
> over diffuse tells me you're already in the 'diminishing returns'
> regime for specular. The next 30% will come from architectural changes
> (a real area-light + MIS pass, or a guided-importance scheme), not
> from squeezing the bounce loop. Don't let perfectionism on items 1+4
> burn a week — they're worth a day, total."

### Production false-starts the veteran agent flagged to NOT pursue

Recorded so future sessions don't waste time exploring:
- **Manifold NEE / Newton-solve specular connectors** — needs SDF
  derivatives + per-iteration state. Mitsuba uses 200+ lines of C++ per
  closure. Forbidden by the single-shader fragment-shader constraint.
- **Caustic detection (photon mapping / SPPM)** — multi-pass with spatial
  structure. Forbidden.
- **Bidirectional path tracing, MLT, ERPT** — multi-pass.
- **"Bounce 0 uses VNDF, bounces 1+ use cheaper half-vector IS"** — would
  re-introduce the firefly bug VNDF just fixed.
- **Per-bounce light-PDF caching across pixels** — wavefront-only.
- **Splitting specular lobe into sharp + rough sub-BRDFs** (Disney style) —
  fxc inlines and predicates them anyway; net neutral.
- **Halton sequences instead of blue-noise + golden-ratio decorrelation** —
  Halton needs per-bounce dimension tracking → more uniform-indexed
  array reads, which ANGLE flattens poorly.
- **Hero wavelength sampling for chromatic dispersion** — out of scope
  unless prism caustics become a feature.
- **RR by path contribution instead of throughput** — requires per-bounce
  expected-radiance tracking. Throughput-RR is the right call for a
  fragment shader.

### Where this goes next

The clear architectural step is `plans/area-lights.md`:
- Phase 3 (BSDF rays detect sphere hits) makes mirror-mode rendering
  correct (lights become visible in reflections).
- Phase 4 (MIS power-heuristic) unlocks the textbook variance reduction
  agents identified — actually applies once area lights exist.
- Phase 5 (re-attempt power-weighted lights) becomes viable post-MIS.
- Reattempting Patch 6 (roughness regularization) becomes meaningfully
  validatable post-Phase 3.

For shader-perf squeezing on the default scene, **we're done.** The
remaining options are creative-judgment knobs (P6 with sliders) or
refinement-loop work that only helps a niche user population (P7+P8).
Both deferred pending architectural changes that make their value
measurable.

### Final shipped state (commit 048652f)

```
pathtracer.ts:
  + last-bounce dead-work skip (P1)
  + standard PBRT Russian Roulette (P2)
  + VNDF GGX sampling (P4) — Heitz 2018
  + firefly clamps removed (alongside VNDF)
  + AO dropped from PT path (P5)
```

Total cumulative: **-31% PT GPU at b=3** (25,901 → 17,772 µs).
Image now mathematically correct (vs prior clamp-biased dim baseline).

### Procedure (set in stone — follow this for any further PT/volumetric work)

The session-1/2 history has ~30 plausible-looking optimizations of which only
~4 actually moved the bench. Reading code first biases candidates toward what
*looks* slow, not what *is* slow on this stack. So the procedure is:
**measure → read → hypothesize → bench-verify**, in that order.

1. **Cost ablation matrix.** Bench permutations of existing flags before
   changing any code. For PT this means: `--pt-bounces={1,2,3,5}`,
   `--no-shadows`, `--no-env`, NEE flag combinations. Result: a cost
   breakdown — "X% shadow, Y% NEE light loop, Z% bounce-loop overhead." This
   tells us *which file to read first*, instead of letting code-reading
   bias us toward whatever happens to look ugly.

2. **Read the live PT shader dump**, not the source. Source-grep is
   misleading (e.g., session 2's `uVolEnabled` was declared but DCE'd in
   default-Mandelbulb's compiled shader). Always verify candidates against
   the live dump — it's what fxc actually sees.

3. **Identify candidates ranked by per-bounce-leverage.** Per-bounce code
   runs `maxBounces` times — a 5% saving × 3 bounces ≈ 15% total. Per-pixel-
   once costs (setup before the loop) are ~3× smaller leverage. Both S1 and
   S2 wins concentrated on per-iter / per-bounce work for this reason.

4. **For each candidate: form a hypothesis about WHY it should win on this
   stack** (ANGLE/D3D11/fxc), not "it looks slow." History table of failures
   is full of "this looked slow." Hypotheses that worked:
   - "Saturation early-out introduces control flow fxc can't infer."
   - "DE → DE_Dist eliminates a redundant orbit-trap recompute."
   - "Compile-gating shrinks IR fed to fxc, helps compile time even when GPU is neutral."

5. **Bench-verify each candidate independently.** One change at a time,
   two-run average to filter noise. Median is rock-stable on this bench
   (±10 µs even at σ=2,500 µs) — trust median deltas above ~0.5%, ignore
   below as noise.

6. **Revert on neutral.** Not "keep just in case." Actually revert. The
   code stays clean and the next reader trusts the file.

### Rules from S1/S2 that still apply to PT work

All four hard constraints from sessions 1-2 (no compile-gating sliders, no
shader-variant cache, MAE 0.00 quality bar, etc.) carry forward unchanged.

PT-specific additions:
- **`uPTBounces` is a slider** (range 1-8). Per the no-compile-gate-sliders
  rule, it must stay runtime. The compile-time `for (int bounce = 0; bounce
  < 8; bounce++) if (bounce >= maxBounces) break;` pattern is correct as-is
  and not eligible for unrolling-via-define.
- **`uReflRoughnessCutoff` interaction:** the default Mandelbulb preset has
  roughness=0.75 > cutoff=0.62 so reflection rays don't trace in the *Direct*
  bench. In *PT* the cutoff doesn't apply — every bounce traces. The PT
  bench therefore measures what reflection users will see in raymarch mode
  too. Reflection-quality scene variant for PT work needs `--material=mirror`
  or a roughness override.
