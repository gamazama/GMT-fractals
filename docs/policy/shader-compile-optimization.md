# Shader Compile-Time Optimization

🚧 **Evolving** — this is the foundation doc for a multi-session effort to cut PT
shader compile time (cold PT compiles run ~10–20s). Session 1 (2026-06-19)
established the model, the measurement protocol, the research base, and the
backlog. Execution sessions update the backlog status and append measured
results. **No shader code was changed in session 1** — this doc exists to make
the execution sessions efficient.

This is the single authoritative compile-time doc. It folds in: the session-1
diagnostics + numbers, `profiles.ts` (`estCompileMs`/`estimateCompileTime`),
`CompileScheduler.ts`, ADRs 0040/0043/0044/0050/0055, the recent PT ADRs
0068–0072, `docs/BENCH_SHADER_HANDOFF.md`, and four behavioural memories. If you
find a second markdown file restating any of this, fold it here and delete it.

---

## 0. The core insight (read this first)

> **A cold PT compile costs ~11–20s. The *same* shader recompiled from a warm
> cache costs ~50ms.** The cache is ~200–400× cheaper than any compile.

That ratio is the *why*: it proves the cold compile itself is the expensive
thing, and it tells you that the warm path is already nearly free, so all the
cost is in the one-time fxc translation+link of the active shader.

**Scope decision (2026-06-19, user direction): the goal is to optimize the
*shader code itself so a given variant compiles faster* — with the same features
enabled. It is NOT to change defaults / load order / which features are on, and
NOT to engineer around the framework.** Two whole classes of "win" are therefore
out of scope:

- **Config / load-order changes** (e.g. flipping a default feature off so the
  default shader is smaller). That reduces *what gets compiled*, not *how fast a
  shader compiles*. Parked in §8 Appendix.
- **Framework workarounds** — cache-hit gaming, idle pre-warm, parallel-compile
  tuning. They dodge the cost rather than reduce it. Documented as context (§7),
  parked in §8 Appendix.

The work is shader-side: take the GLSL a variant emits and make fxc translate it
faster — **avoid the constructs fxc is slow on (constant-bounded loops it
unrolls, high register pressure), remove genuinely dead/redundant emitted GLSL
within a chunk, and simplify algorithmically** — feature set unchanged, each
change measured cold and reverted if it isn't a win (§5).

A caveat carried from prior sessions: per-compile micro-optimization of *straight-
line* GLSL on a code-reading hunch is low-yield and repeatedly falsified by
measurement (§5.3). "Make the shader compile faster" means **algorithmic +
structural** change (less emitted code, cheaper-to-translate constructs), not
hand-hoisting expressions ANGLE/fxc already optimizes (§4.3).

---

## 1. The compile pipeline model

### 1.1 "Compile time" is actually three phases

What users perceive as "compile time" is the `IS_COMPILING` true→false window in
[`CompileScheduler.ts`](../../engine-gmt/engine/CompileScheduler.ts). It
decomposes into three distinct costs — **and the current instrumentation only
isolates the first two:**

| Phase | What happens | Timer | Cost (cold) |
|---|---|---|---|
| **gen** | `buildFullMaterial()` assembles the GLSL string (JS, ShaderFactory iterates all features) | `gen=` in the `[Compile]` log | small (tens–hundreds ms) |
| **gpu** | `renderer.compileAsync()` → ANGLE translates GLSL→HLSL→DXBC via fxc, links the program | `gpu=` in the `[Compile]` log | **dominant — the ~11–20s** |
| **first-draw / "unfold"** | driver realizes the program object and does first-draw setup before pixels appear | `firstDraw=` in the two-stage `[Compile]` log (L7, 2026-06-19) | unknown; ANGLE is known to defer D3D program realization to first draw |

The third phase is real (empirically: there's a stall *after* compile before the
first frame draws, and a warm cache collapses it to ~instant alongside the
compile). It corresponds to ANGLE deferring final D3D program/PSO realization to
the first `draw` call — here, the post-swap `pipelineRender()` at
[`CompileScheduler.ts:363`](../../engine-gmt/engine/CompileScheduler.ts#L363).
**L7 (done 2026-06-19) wraps that render in a `tFirstDrawStart/End` timer and
appends `firstDraw=…ms` to the two-stage log line**, so the protocol can now
attribute fxc (`gpu=`) vs first-draw separately. Note: `firstDraw=` is emitted on
the **two-stage** path only — the single-stage path returns before the post-swap
render and has no isolated unfold phase.

> **L7 finding (2026-06-19, D3D11/ANGLE, session-2 machine):** across the full
> per-switch sweep, **`firstDraw` measured ~0–2ms** — i.e. the post-swap unfold
> is effectively free, and **the entire cold cost lives in `gpu=`**. The
> `compileAsync` call already runs a dummy render on the scratch scene, which
> realizes the D3D program/PSO *during* the `gpu=` window; by the time the
> post-swap `pipelineRender` draws to the real target the program is already hot.
> So the "third phase" the model hypothesized is, on this path, absorbed into
> `gpu=` (compileAsync), not deferred to first draw. **Practical consequence:**
> `gpu=` is the honest, complete cold-compile cost — optimize against it; don't
> chase first-draw.

### 1.2 The two-stage strategy (ADR-0040)

[`CompileScheduler.perform()`](../../engine-gmt/engine/CompileScheduler.ts#L172)
picks one of three strategies (`@see` ADR-0040):

- **`keepCurrent`** — already compiled + parallel-compile available + same
  formula. Keep the live shader on screen; build the new one async; hot-swap.
  Modular uniform sync deferred until *after* `swapFullMaterial` (syncing during
  the async window corrupts the still-rendering old shader's slot map — load-
  bearing invariant, [`CompileScheduler.ts:70-73`](../../engine-gmt/engine/CompileScheduler.ts#L70)).
- **`twoStage`** — first boot or formula change. Emit a lighting-off **preview**
  material (`compilePreview`, compiles <1s because fxc DCEs the formula copies
  out of the lighting paths), show "Loading Preview…", then compile the full
  material async on a hidden scratch scene and hot-swap.
- **`singleStage`** — no parallel compile (Firefox exposes the extension but
  compiles synchronously, so it's force-detected and downgraded) or lighting
  already off. One synchronous compile; viewport freezes for the duration.

The async compile runs `renderer.compileAsync(scene, camera)` on a reused
fullscreen-quad scratch scene
([`CompileScheduler.ts:304-328`](../../engine-gmt/engine/CompileScheduler.ts#L304)),
with a `renderer.compile()` sync fallback. A **generation counter** discards
in-flight compiles superseded by a newer one.

### 1.3 The canonical instrumentation (do not remove)

```
[Compile] Two-stage: 13459ms (Mandelbulb, gen=42ms, gpu=13366ms, firstDraw=110ms)
[Compile] Single-stage: 5200ms (GreatStellatedDodecahedron)
```

Emitted at [`CompileScheduler.ts:368`](../../engine-gmt/engine/CompileScheduler.ts#L368)
(two-stage) and [`:271`](../../engine-gmt/engine/CompileScheduler.ts#L271)
(single-stage), both marked "do not remove" — the diagnostics (§6) and
`debug/bench-shader.mts` parse these lines. Also: `CompileScheduler.lastDuration`
(seconds), `FRACTAL_EVENTS.COMPILE_TIME`, and `engine.lastCompileDuration`
(getter delegating here).

### 1.4 How shaders are assembled (compile-cost surface)

- **17-position assembly** (ADR-0043): `ShaderFactory.generateFragmentShader`
  iterates the feature registry and calls every feature's `inject()`
  **regardless of enabled state**; disabled features MUST emit empty stubs.
  `@see` [`ShaderFactory.ts`](../../engine-gmt/engine/ShaderFactory.ts),
  [`ShaderBuilder.ts`](../../engine-gmt/engine/ShaderBuilder.ts).
- **Compile-gated `#define`s** are the only mechanism for cutting code out of a
  variant. The PT path emits `PT_ENABLED`, `PT_ENV_MIS`, `PT_ENV_MIS_IS`,
  `PT_NEE_ALL_LIGHTS`, `PT_AREA_LIGHTS`, `PT_SOBOL_BOUNCE` from
  [`features/lighting/index.ts`](../../engine-gmt/features/lighting/index.ts);
  the gated bodies live in
  [`shaders/chunks/pathtracer.ts`](../../engine-gmt/shaders/chunks/pathtracer.ts).
  A gate only costs compile time **when its chunk is in the active shader**.
- **PT and Direct are mutually exclusive shaders** (`isPathTracing` if/else in
  `lighting/index.ts`). All the PT compile cost is invisible to the default
  Direct experience.
- **Compile vs runtime split** (ADR-0050 modular slot-order parity; ADR-0055
  `panelConfig` compile/runtime UI split): a feature param either recompiles
  (`onUpdate:'compile'`, discrete mode toggles) or flips a uniform at runtime
  (sliders). See §4 — this split is a hard constraint, not a tuning knob.

---

## 2. Measured cost facts (cold, D3D11/ANGLE, session-1 machine)

All numbers are **cold `gpu=` compile ms** unless noted. Methodology in §5.

### 2.1 Cold vs cached

| | Cost | Source |
|---|---|---|
| Cold PT compile (Mandelbulb) | ~11.3s | measure-pt-compile |
| Cold PT compile (Great Stellated Dodec.) | ~15.5–16s | measure-pt-compile |
| **Warm-cache recompile of the same shader** | **~50ms** | Chrome GPU program disk cache |
| Direct shader (no PT) | ~unaffected by all PT work | mutually-exclusive shader |

### 2.2 The session-1 PT default change (cold toll)

Defaults changed to `ptReflMode = 2` (Env MIS+IS) and `ptSobolBounce = on`:

| Formula | old (MIS off, Sobol off) | new (MIS+IS, Sobol on) | toll |
|---|---|---|---|
| Mandelbulb | 11366ms | 13459ms | **+2093ms (18%)** |
| MixPinski | 17259ms | 20357ms | **+3098ms (18%)** |
| GreatStellatedDodecahedron | 16013ms | 20088ms | **+4075ms (25%)** |

### 2.3 Per-switch marginal cold cost (Mandelbulb baseline 10341ms)

| Switch | marginal cold cost |
|---|---|
| **Env MIS+IS (reflMode=2)** | **+2579ms** ← biggest default-on cost |
| Area lights | ~~+2027ms~~ → **+345–977ms after ADR-0074** (session 3 single-march fix) |
| Env MIS (reflMode=1) | +1361ms |
| NEE all lights | +832ms |
| **Sobol bounce** | **+23ms (≈free)** |

The `+IS` (CDF importance-sampling) half of Env MIS+IS alone is ~1.2–2.4s
(2579 − 1361). On Great Stellated the same switches scale up roughly with
baseline (Env MIS+IS +7274ms on a 15140ms baseline).

> ⚠ **One session-1 switches run was contaminated** (thermal/contention): it
> reported "Sobol +2865ms" and "NEE +2828ms" on Great Stellated — Sobol is
> ~free, so that whole run is discarded. This is *why* the protocol uses a
> known-free control (§5).

### 2.4 ADRs 0068–0072 and the toll

These are the recent PT quality ADRs (VNDF reflections, env `textureLod` blur,
procedural-sun NEE, soft-knee firefly, camera-blur sky). Each ADR's "zero
compile cost" note is **scoped to the default/Direct branch only** — the work was
done in the PT branch, so it is *not* compile-neutral there; it is a contributor
to the PT default-change toll in §2.2. Read them as the *context* for why the PT
shader got more expensive (and as the code whose GLSL the shrink work in §8
targets), not as a backlog of features to remove.

---

## 3. The `estCompileMs` calibration gap

[`profiles.ts`](../../engine-gmt/features/engine/profiles.ts) has
`estimateCompileTime(state)` (≈L161–196): `BASE_COMPILE_MS = 4200` plus a sum of
per-param `estCompileMs` annotations for enabled `onUpdate:'compile'` params. It
feeds the Engine panel's predicted-compile-time readout.

**It under-counted PT switches badly — recalibrated to measured cold (L6, 2026-06-19):**

| Switch | old `estCompileMs` | measured cold | now annotated |
|---|---|---|---|
| `ptReflMode` Env MIS+IS | 650ms | ~2579ms (~4× low) | **2579ms** |
| `ptReflMode` Env MIS | 250ms | ~1361ms (~5× low) | **1361ms** |
| `ptAreaLights` | 600ms | ~2027ms (~3× low) | **2027ms** |
| `ptNEEAllLights` | *(unannotated)* | ~832ms | **832ms** |
| `ptSobolBounce` | 50ms | ~23ms | **25ms** |

The session-1 default change was annotated ~+700ms; the real cold toll was
+2–4s. The *direction* was PT-specific: `BENCH_SHADER_HANDOFF` shows the
Direct-scene base compiling *faster* than its estimate, so this was not a blanket
error — the annotations were calibrated for Direct and under-counted PT. The PT
switches now carry their measured marginal costs. `BASE_COMPILE_MS` was kept at
4200 (confirmed: 4200 base + ptEnabled 1500 + Robust shadows 3800 ≈ 11000 est vs
10341 measured PT baseline — within formula/noise variance). Refresh these as
L5/L4 wins land.

---

## 4. Hard constraints (non-negotiable — design within these)

From behavioural memories + ADRs. These bound the solution space; a lever that
violates one is out.

1. **Sliders stay runtime; only discrete mode toggles may compile-gate.**
   (`feedback_no_compile_gate_realtime`, ADR-0055.) A continuous control that
   recompiles mid-drag = ~3s stall per tick = broken UX. No `#define`-gating of
   any UI knob value.
2. **No variant cache / pre-baked permutation matrix.** ~20+ toggles × 2–3
   states each → >1024 combos × 3–6s each = unworkable to pre-build.
   (`feedback_no_compile_gate_realtime`.) Cache-*hit* maximization (deterministic
   source → Chrome program cache, §7) is a different thing and is allowed.
3. **ANGLE/D3D11/fxc is smarter than a code-reading audit assumes.**
   (`feedback_angle_d3d11_optimizer`.) LICM is aggressive, CSE catches
   `mix(x,y,0/1)`, uniform branches are predicated, DCE is excellent, and
   *define-bounded loops are already emitted `[loop]` (not unrolled)*. Manual
   hoists/conditional-wraps/constant-lowering are **no-ops**. Only *algorithmic*
   changes (early-outs, function swaps, IR shrinkage) and *removing emitted code*
   move the needle. ~4 of ~18 audited items were real wins.
4. **Benchmark on the real GPU (`--gpu`/headed Chrome + `--use-angle=d3d11`),
   not headless SwiftShader.** (`feedback_gpu_over_cpu_render_tests`.) CPU adds
   hours; relative metrics are identical but absolute compile timing is
   meaningless on the CPU rasterizer. One canonical scene suffices.
5. **`webglCompile` is the only fully-honest automated gate.**
   (`feedback_shader_testing_gates`.) It catches namespace collisions, missing
   uniforms, rewriter-prefix gaps — every compile-time failure. Numeric
   render-correctness gates are weak; validate correctness in-app/visually.

---

## 5. Measurement protocol (measure → attribute → validate)

The methodology the execution sessions run. Built on the diagnostics in §6.

### 5.1 Measure (cold, attributable)

- **Measure COLD.** The Chrome GPU program disk cache makes a *repeat* of the
  same shader ~50ms and lie. Launch with `--disable-gpu-shader-disk-cache`, and
  **compile each variant exactly once per process.** old/new and each switch are
  *distinct* shaders (different `#define`s) so each first compile is genuinely
  cold; never average repeats of one variant.
- **Use `--use-angle=d3d11`, headed Chrome.** This is the production ANGLE
  backend. Headless SwiftShader timing is meaningless (constraint §4.4).
- **Read `gpu=` from the `[Compile]` log**, not the wall-clock window — the
  window includes preview + RAF yields + first-draw. `gpu=` isolates the fxc/link
  cost (the dominant phase). The diagnostics already parse this.
- **Suppress throttling:** `--disable-renderer-backgrounding`,
  `--disable-background-timer-throttling`,
  `--disable-backgrounding-occluded-windows` (the scripts set these).

### 5.2 Attribute (deltas, not absolutes)

- **Use within-run deltas.** Baseline noise (thermal/contention) is correlated
  within a run; switch-minus-baseline cancels it. Absolute ms drifts run-to-run.
- **Noise floor ≈ 1s** on cold compiles. **Treat sub-~1s differences as noise.**
- **Keep a known-free control** (Sobol, +23ms). If the control reads non-zero
  (e.g. "+2865ms"), the whole run is contaminated — **discard it** (§2.3).
- **Isolate one switch at a time** (measure-pt-switches): baseline + each gate
  alone. The delta is that gate's marginal cost.

### 5.3 Validate (falsify before believing)

- **Always measure before/after; revert non-wins immediately.** A session-1
  hypothesis that the CDF binary-search loop unroll was the `+IS` hog was
  **falsified** — the cost is the straight-line trig + ~8 texture fetches +
  `sampleEnvAtCDFMip`, not the loop (which is already `[loop]`-bounded). Do not
  micro-optimize straight-line GLSL on a code-reading hunch (constraint §4.3).
- **Gate correctness on `webglCompile`** (constraint §4.5) + a visual check;
  numeric headless gates are unreliable.
- **For render-quality regressions** (any lever that changes output): bench
  against `BENCH_SHADER_HANDOFF` thresholds (PASS ≤0.5 MAE & ≤8 max).

### 5.4 Known environment pitfall (Windows)

`debug/runWithServer.mts` dies with `spawn EINVAL` on Windows. **Start
`npm run dev` separately**; the diagnostics wait for the port. They connect to
`localhost` (Vite binds `::1`/IPv6 on Windows), not `127.0.0.1`.

### 5.5 Render-perf side-metric: accumulated-frames FPS (secondary)

Compile time is the focus, but a GLSL change can also move *per-frame* render
cost. Both `measure-pt-*.mts` now report **accum-fps** alongside each compile so
wins/losses there surface too (added 2026-06-19).

- It measures the rate **progressive accumulation samples** are produced
  (`window.__gmtProxy.accumulationCount`, synced every `FRAME_READY`), **not a
  RAF-frame count** — the older raf-frame telemetry predates the progressive
  renderer and is meaningless for convergence throughput.
- **The scene must not converge during the window.** The default `sampleCap` is
  **64** → the PT image converges and the worker *halts* tracing within ~1s, so a
  passive window reads 0. The harnesses raise the cap
  (`__store.getState().setSampleCap(99999)`) once after boot so accumulation runs
  continuously; a fixed window then reads the steady rate. A short pre-roll waits
  for frames to flow so the window doesn't start during a post-compile stall.
- **Interpretation.** Under progressive *tiling* the band count adapts toward a
  target fps, so accum-fps is only a clean render-cost signal when render-bound
  (the harness scene sits ~2.7 fps ≪ the 30-fps target → max bands → render-bound,
  so it does track cost). Session-2 reading: env-MIS / area-light switches are
  ~flat at 2.7 fps across the board — they are **compile-heavy but runtime-cheap**
  (the fractal DE march dominates per-frame cost, not the env sampling). Treat
  accum-fps as a coarse regression tripwire; for authoritative full-frame render
  cost use `bench-shader.mts`'s GPU-timer p50 (not adaptive-confounded).

---

## 6. Tooling inventory

The measurement substrate. The two `measure-pt-*.mts` scripts are the protocol's
canonical tools (adopted this session — `@see` ADR-0073).

| Tool | Purpose |
|---|---|
| [`debug/measure-pt-compile.mts`](../../debug/measure-pt-compile.mts) | Cold PT compile per formula, old-vs-new defaults. `MEASURE_FORMULAS=…` override. Produces §2.2. Also reports `firstDraw=` (L7) and **accum-fps** (§5.5). |
| [`debug/measure-pt-switches.mts`](../../debug/measure-pt-switches.mts) | Per-switch marginal cold cost (baseline + each gate alone). Produces §2.3. Also reports `firstDraw=` (L7) and **accum-fps** (§5.5). |
| [`debug/bench-shader.mts`](../../debug/bench-shader.mts) | GPU timing + reference-image diff harness (render perf + compile; parses the `[Compile]` log). Quality-regression gate. See `docs/BENCH_SHADER_HANDOFF.md`. |
| [`debug/native-config-sweep.mts`](../../debug/native-config-sweep.mts) | Compiles every formula, gates on `webglCompile`, records per-formula `timeMs`. Whole-set correctness + timing regression guard. |
| [`debug/dump-pt-shader.mts`](../../debug/dump-pt-shader.mts) | Dumps the live-assembled maximal-PT fragment shader (`window.__gmtProxy._lastGeneratedFrag`) to a file. Source for the `DE_Dist`/heavy-body **inline census** that found the ADR-0074/0075 wins. NB: output retains `#ifdef` directives (pre-preprocessor) — grep counts include inactive branches. |
| `CompileScheduler` telemetry | `lastDuration`, `gen/gpu` split, `FRACTAL_EVENTS.COMPILE_TIME`, `engine.lastCompileDuration`. |

> **Stale flag:** `docs/BENCH_SHADER_HANDOFF.md` references `dev/debug/bench-shader.mts`
> — a retired `dev/` path (the tree is now `stable/`). Paths are `stable/debug/`.
> Fold or `@stale`-annotate on next touch (backlog L8).

---

## 7. Research findings (WebGL2 → ANGLE → D3D11/fxc), cited

Targeted research, session 1, adversarially cross-checked. The headline is that
the field confirms the §0 insight: **the cache is the lever.**

### 7.1 Program-binary caching in WebGL2 — *not app-controllable*

- **WebGL2 exposes no `getProgramBinary` to JS.** `OES_get_program_binary` is an
  ES/native extension used by Windows-Store ANGLE apps via `glGetProgramBinaryOES`;
  it is **not surfaced to the WebGL JS API.** A web app cannot save/restore
  program binaries itself. [ANGLE wiki](https://github.com/microsoft/angle/wiki/Caching-compiled-program-binaries)
- **The cache that makes warm loads instant is Chrome's GPU-process program disk
  cache** ([`shader_disk_cache.cc`](https://chromium.googlesource.com/chromium/chromium/+/trunk/content/browser/gpu/shader_disk_cache.cc),
  [GPU Program Caching design doc](https://docs.google.com/document/d/1Vceem-nF4TCICoeGSh7OMXxfGuJEJYblGXRgN9V9hcE/mobilebasic)).
  It transparently stores the ANGLE-translated + driver-compiled binary, **keyed
  on the untranslated shader source + driver version + translator version**,
  persists to disk, and is loaded into memory on browser startup. Clearing the
  browser cache clears it. `--disable-gpu-shader-disk-cache` turns it off (which
  is exactly what the cold-measurement diagnostics do).
- **Implication (load-bearing):** the only ways to "reduce cold compiles" in a
  web app are (a) **emit byte-identical shader source for identical configs** so
  the Chrome cache key matches (any nondeterminism in source generation — map
  ordering, float formatting, comment timestamps — silently misses the cache and
  forces a recompile), and (b) **actually compile the common variants once** so
  they enter the cache (idle pre-warm). There is no API to pre-populate it.

### 7.2 `KHR_parallel_shader_compile` — non-blocking, not necessarily faster

- The extension only enables a **non-blocking poll** (`COMPLETION_STATUS_KHR`);
  it moves compile off the main-thread critical path but **does not reduce
  wall-clock compile time, and may slightly increase it** (status checked once
  per frame). [Khronos spec](https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/),
  [MDN](https://developer.mozilla.org/en-US/docs/Web/API/KHR_parallel_shader_compile)
- `glLinkProgram` does the full PSO compilation/optimization — that's the work
  being polled.
- **Implication:** the engine already uses this via `compileAsync` + the two-
  stage preview (ADR-0040), which is the *correct* use — it hides latency, it
  doesn't remove it. There is **no further wall-time win available from parallel
  compile itself**; the win is purely UX (already captured). Don't chase it.

### 7.3 What makes fxc/D3D11 compile slow — loop unrolling + register allocation

- **Loop unrolling is the primary fxc cost**, with possible O(N²) behavior; the
  D3D runtime tries to unroll all loops and long loops are expensive. Manually
  controlling unroll (or keeping loops rolled) beats letting fxc unroll.
  [GameDev.net](https://gamedev.net/forums/topic/624349-speed-up-shader-compilation-hlsl/),
  [ANGLE project thread](https://groups.google.com/g/angleproject/c/eWaMGHqioXY)
- **Register allocation is the other slow part** of HLSL compilation.
- ANGLE can emit `[fastopt] [loop]` on GLSL→HLSL loop translation to prevent
  unrolling/optimization and cut compile time. ANGLE owns this translation, not
  the app — but it confirms **runtime-bounded loops (which ANGLE emits as
  `[loop]`) are cheaper to compile than constant-bounded ones (which fxc
  unrolls).** This *matches* `feedback_angle_d3d11_optimizer`: our define-bounded
  loops are already `[loop]`-emitted (not unrolled), which is why the +IS cost
  was straight-line code, not the CDF loop.
- **Implication:** per-compile cost reduction is mostly about **emitting less
  code into the active variant** (so fxc has less to translate/allocate) and
  **avoiding constant-bounded loops that fxc will unroll**. This is consistent
  with the only confirmed wins being IR shrinkage / dead-code removal, not
  hand-hoisting.

### 7.4 Net research conclusion

Two independent literature threads, with two different implications:

1. **Cache-is-king** (§7.1) — confirms the cold compile is genuinely expensive
   and the warm path is free. Per our scope decision (§0) we do **not** chase the
   framework-level cache/pre-warm levers this exploits; it's context, parked in
   §8 Appendix.
2. **fxc-cost-is-unroll + register-allocation** (§7.3) — this is the actionable
   thread for *our* goal. Making a shader compile faster means giving fxc **less
   to translate and allocate**: fewer instructions in the active variant, no
   constant-bounded loops it will unroll (O(N²)-ish), lower register pressure.
   This aligns with the only confirmed historical wins (IR shrinkage / dead-code
   removal / function swaps — `BENCH_SHADER_HANDOFF`, `feedback_angle_d3d11_optimizer`),
   **not** hand-hoisting or per-instruction micro-opt (which ANGLE/fxc already
   handle — §4.3).

So the prioritization is: **shrink and structurally simplify the active variant's
emitted code** (§8 Tier A/B). Parallel-compile is already correctly used for UX
latency-hiding and offers no further wall-time win (§7.2).

---

## 8. Prioritized backlog (levers → execution sessions)

**Scope (§0):** make a given shader variant's GLSL compile faster with the same
features on. Ranked by **expected payoff × applicability ÷ risk**. Payoff is
*cold `gpu=` ms saved* on a fixed-feature variant. Every lever is measured cold
per §5 and reverted if it isn't a win. Status: 🔲 not started.

### Tier A — the core work: make the expensive GLSL compile faster

These take the measured hogs (§2.3) and rewrite the GLSL so fxc translates it
faster — **feature set unchanged**. The win class is **algorithmic + structural
only** (§4.3): cheaper-to-translate constructs, less work for fxc — never hand-
hoisting expressions ANGLE/fxc already optimizes.

- 🟡 **L5 — Rewrite the biggest PT chunks to compile faster, hog-first.** Ordered
  by measured marginal cost: **Env MIS+IS (+2579ms)** → **Area lights (+2027ms)**
  → **Env MIS (+1361ms)** → **NEE (+832ms)**. In
  [`shaders/chunks/pathtracer.ts`](../../engine-gmt/shaders/chunks/pathtracer.ts)
  + the lighting chunks, with the feature *on*: simplify the algorithm, remove
  genuinely dead/redundant emitted GLSL *inside* the chunk, collapse duplicate
  helper emissions, swap heavy functions for lighter equivalents (DE→DE_Dist
  style). Measure each change cold (§5.3); revert non-wins; gate quality on
  `BENCH_SHADER` thresholds.

  **Session 2 (2026-06-19) — Env MIS+IS hog opened. Two structural levers tried,
  both measured cold, both sub-noise → reverted (no GLSL shipped):**
  - **Dedup the duplicated CDF-cell pdf reconstruction** (the 4-`textureLod` +
    successive-difference block is identical in `sampleEnvImportance` and
    `pdfEnvImportance`) — factored into shared `envCDFCellDiffs`/`envCellPdf`
    helpers. Env MIS+IS delta 2790→2526ms, within a run whose noise floor was
    demonstrably ≥1s (Env MIS read *higher* than Env MIS+IS — impossible since
    MIS+IS is a superset). **Verdict: no measurable win.** Re-confirms §4.3 — fxc
    inlines helpers, so "collapse duplicate emissions" is a no-op for translation
    cost on straight-line GLSL.
  - **Force the two CDF binary-search loops to a runtime `[loop]`** (bound on the
    uniform-derived `N`/`W` instead of `const ENV_CDF_SEARCH_STEPS=9`, so fxc
    can't unroll the constant-trip loop — the §7.3 "primary fxc cost" hypothesis).
    Env MIS+IS delta 2790→2161ms, but that run's **Sobol control read −496ms**
    (deltas biased ~500ms low); adjusted, indistinguishable from baseline. **No
    >1s drop → the loops were already emitted as `[loop]`; not unrolled.** This
    independently re-confirms session-1's falsification and the
    `feedback_angle_d3d11_optimizer` prior.

  **Conclusion for the +IS hog:** its ~1.2s marginal (Env MIS+IS − Env MIS) is the
  *irreducible* fxc translate+register cost of the texture-sampling + trig math —
  there is **no structural/algorithmic GLSL win available without changing what it
  computes** (quality regression). The only lever for that specific cost is the
  out-of-scope default change (reflMode→1; parked in the §8 Appendix).

  **Session 3 (2026-06-19) — Area lights hog localized + a real win shipped
  (ADR-0074).** Split `PT_AREA_LIGHTS` into measured sub-pieces via temporary
  sub-gates (bounce-side light-hit, NEE-side sphere sampling, env-NEE occlusion,
  and the sphere **shadow override**) and measured each cold (§5).
  - **Localization (Mandelbulb, baseline 11107ms):** the sphere shadow override
    alone = **+969ms** (>half the area-lights cost); bounce+nee+envocc together
    only ~+496ms (sub-noise individually). The override was the hog because it
    issued a **separate `GetHardShadow(...)` call** for sphere lights, wrapping the
    default `GetSoftShadow` march — two *different* functions, each a full 256-step
    `DE_Dist` raymarch, both inlined into the NEE loop. (This also explains why the
    first sub-gate run showed a non-additive ~1150ms floor across every subset: the
    override was still gated on `PT_AREA_LIGHTS`, present in all of them.)
  - **Fix (shipped):** fold the sphere case into the single march already present —
    soft variant drives `k=2000` (near-binary) for spheres and reuses the one
    `GetSoftShadow` call; stochastic variant points its (already-`GetHardShadow`)
    march at the sphere sample with no re-jitter. `GetHardShadow` then DCEs in the
    soft variant → one march, not two. **Same feature on**; non-sphere lights are
    byte-identical.
  - **Measured saving (within-run A/B, noise-canceled, Sobol control clean):**
    **−630ms Mandelbulb** (13055→12425ms total), **−1356ms Great Stellated Dodec.**
    (19044→17688ms total). The saving scales with DE weight = the signature of a
    removed `DE_Dist` march. Post-fix production marginal for `ptAreaLights`:
    **+345–977ms** (was +2027). Cold-compile variance is real here — the absolute
    marginal swings run-to-run; the within-run A/B is the trustworthy figure.
  - **Lesson:** unlike function-level dedup (§4.3, a fxc no-op), removing a
    *duplicated inlined `DE_Dist` march* is a real, large win. Prefer one
    parameterized march over a second near-identical inlined march — the cost is
    the inlined body, not the call.

  **Session 3 (cont.) — biggest L5 win: PT single normal estimator (ADR-0075).**
  Dumped the live assembled PT shader (new tool `debug/dump-pt-shader.mts` →
  `window.__gmtProxy._lastGeneratedFrag`, §6) and counted `DE_Dist` (heavy-body)
  inlines: 13 sites, the largest being the adaptive normal in `getSurfaceMaterial`:
  `if (highQuality) GetNormal(4 taps) else GetFastNormal(4 taps)` = **8 `DE_Dist`
  taps**. Both branches inline only in **PT**, where `highQuality = bounce==0` is
  *runtime* (fxc can't DCE either). In **Direct** every call site passes a constant
  `highQuality` → fxc already DCEs one branch (4 taps).
  - **Fix (shipped):** gate on `RENDER_MODE_PATHTRACING` — PT collapses to one
    `GetNormal(p, highQuality ? eps : eps*1.5)` call (4 taps, 8→4); Direct keeps its
    `if/else` (byte-identical). The win needs ONE call site — two sites of the same
    function still inline 8 taps.
  - **Measured (within-run A/B, cold; in-process program-cache hits identified +
    discarded):** **PT −0.9..−2.5s Mandelbulb, ~−4.6s Great Stellated Dodec.**
    (19963→15351ms); **Direct ~0** (≈50ms) — fxc already optimal there. Cross-run
    production PT-baseline confirmation: −994ms Mandelbulb (11003→10009), −2120ms
    Great Stellated (15822→13702). The PT saving scales with DE weight. PT bounce 0
    byte-identical; indirect bounces upgrade forward-diff → tetrahedron (better).
  - **Method for L4:** dump the assembled shader, count `DE_Dist`/heavy-body
    inlines, collapse any kept alive only because a *runtime* predicate keeps both
    `if/else` branches live in a variant.

  **Session-4 leads (3-agent shader-dump dig, 2026-06-19).** Ranked candidates for
  the next session; all need cold within-run A/B (§5) before believing. The cost
  model is confirmed: `DE_Dist` is a 1-line wrapper over `mapDist` (the geometry
  fractal march), and `map()` is the *full* fractal body (march + orbit-trap +
  decomposition + coloring snapshot, ~177 lines, `de.ts:26-198`) — the **heaviest
  body in the shader**. Census of LIVE heavy inlines in PT: `map()` ×6,
  `mapDist`/`DE_Dist` ×6.

  1. 🎯 **`traceScene` vs `traceSceneLean` — a 3×`map()` duplicate march (biggest
     lead).** `trace.ts`/`ShaderBuilder.ts:585-588` emit two near-identical trace
     functions (camera ray vs bounce ray) differing ONLY in injected volume code;
     each inlines **3 full `map()`** (march + refinement + recovery). That's the
     ADR-0074 "second inlined march" pattern on the heaviest body. **Experiment:**
     point `tracePTBounce` at a single shared trace fn (compile-gate the volume
     body) and measure cold `gpu=`. **Risk/uncertainty:** fxc *may* already share
     one translated body when the lean volume injection is empty (→ no-op, negative
     result) — the A/B settles it in one run. Watch: `traceScene` carries volume
     accum the bounce discards (DCE'd, harmless).
  2. ❌ **Dead heavy bodies emitted into PT — TESTED, NEGATIVE (session 3, 2026-06-19).**
     `GetAO` (32-trip loop + a `DE_Dist` tap) and `GetFastNormal` (4 `DE_Dist` taps)
     are emitted but never called in PT. Stripped both from PT builds (gated on
     `RENDER_MODE_PATHTRACING`) and A/B-measured cold: **Mandelbulb −467ms, Great
     Stellated −5ms** — both below the ~1s floor (the other two cells were
     in-process-cache flakes, discarded). **Verdict: fxc DCEs uncalled functions
     cheaply — there is no meaningful inline-before-DCE cost.** This closes the
     dead-body sub-tier AND confirms a load-bearing assumption for leads 1/3/4: the
     wins must come from *removing **live** duplicated heavy inlines*, not from
     stripping dead ones. Don't re-pursue dead-code stripping for compile time.
  3. **Env MIS (+1361ms): fold `envVisibility` into `GetHardShadow`.** `envVisibility`
     (`pathtracer.ts:437`) is a standalone `DE_Dist` march that is a near-clone of
     `GetHardShadow` (`shadows.ts:100`) — the only *new* heavy march Env MIS adds.
     ADR-0074 pattern. **Localize first** with sub-gates `…VIS / …EVAL / …BSDFSIDE /
     …DIRPDF` (march vs GGX-eval vs miss-side MIS vs dir-pdf); predict `…VIS` carries
     ≳1s. If `…VIS` is sub-noise → Env MIS is compile-tight like +IS; document + stop.
  4. **Refinement-loop `map()`→`mapDist()` (measure with care).** The surface-
     refinement loop (`trace.ts:131-143`) iterates on distance only (`h_ref.x`) but
     inlines the *full* `map()`. Swapping to `mapDist` + one final `map()` on hit
     trims a heavy inline. **But:** a prior map/mapDist *main-march* split was reverted
     (+5% runtime; `trace.ts:33-38`), and bounce shading may consume `result.yzw`
     coloring from the lean trace — verify before swapping; gate on BENCH render p50.
  5. **NEE-all-lights (+832ms): NOT a march — likely L4 (loop/register).** Adds no
     new heavy body; only flips the const-3 NEE loop (`pathtracer.ts:710`) from
     compile-peeled-1 to a runtime trip. The +832ms is most plausibly loop-realization
     / register pressure (§7.3), not march duplication. **Pre-check:** dump the shader
     gate-on vs gate-off and diff the `DE_Dist` count (expect identical → confirms no
     march to collapse). Sub-gate `…LOOPONLY` vs `…PDFONLY`; candidate rewrite: bound
     the loop on `neeCount` not the literal `3`. Lower priority.

  **Confirmed negatives (don't re-pursue):** the triplicated GGX specular eval
  (light-NEE / env-NEE / `pdfVNDF`) is straight-line ALU → dedup is a fxc no-op
  (§4.3); `intersectAreaLight` ×2 is a small analytic loop, not a march → no-op;
  CDF binary-search loops already `[loop]` (session 2); `GetNormal`/`GetSoftShadow`/
  `envVisibility` are each already a single march at the floor. **Sequencing
  (updated after lead 2 closed negative):** lead 1 first (biggest — the
  `traceScene`/`traceSceneLean` 3×`map()` duplicate), then lead 3
  (`envVisibility`→`GetHardShadow` fold), then lead 4 (refinement `map`→`mapDist`,
  with the render-perf caveat). Lead 5 (NEE) is L4-flavoured, lowest priority.
  **Payoff: high (lead 1); risk medium** (quality/correctness on leads 1+4).

  **Session 4 (2026-06-19) — RESULTS: two `map()`-inline wins shipped (ADR-0076);
  leads 1, 3 falsified; lead 5 deferred. The session corrected the cost model.**
  All measured cold, within-run A/B, clean Sobol controls.

  **The corrected cost model (load-bearing):** the duplicate-*function* premise
  was wrong; the right unit is the **`map()` *inline*.**
  - ANGLE/fxc **folds byte-identical functions.** `traceScene`/`traceSceneLean`
    are byte-identical when the volume injection is empty (the default — no
    glow/fog), so collapsing them (lead 1) was a measured **no-op** (Mandelbulb
    B−A +335ms / D−C −570ms; Great Stellated +134 / −297 — signs flip, control
    read ±700ms). The doc's "no-op risk when volume empty" was realized.
  - But fxc **inlines `map()` per call-site, each inline ≈2s of cold translate**
    (`map()` is the ~177-line heaviest body). Removing one genuine `map()`
    inline is a large win — *that* is what ADR-0074/0075 actually did (made a
    distinct body uncalled/DCE'd), not "dedup."
  - ✅ **Lead 4 — refine loop `map`→`mapDist` (SHIPPED).** The refinement loop
    converges on distance only, so it uses `mapDist` (geometry-only twin) and
    keeps `h.yzw` coloring from the hit-point `map()`. **−1986ms Mandelbulb /
    −2412ms Great Stellated** (B−A; D−C −1779 / −1553; control −339 / −449).
    Quality: byte-identical at the default (`refinementSteps`=0 → loop off);
    sub-pixel coloring shift only with Edge Polish on.
  - ✅ **Lead 4b — overstep-recovery reuses the captured candidate `map()`
    (SHIPPED, byte-identical).** The inner march already computes the full
    `map()` each step; candidate tracking now snapshots `h`→`candidateH` and the
    recovery block reuses it instead of re-evaluating `map(p_cand)` (same
    position → identical output). **−1650ms Mandelbulb / −2763ms Great Stellated**
    (B−A; D−C −1851 / −2099; control +123 / −319).
  - **Combined (ADR-0076): PT baseline ~13.4s→~10.0s Mandelbulb (−25%),
    ~17.2s→~12.8s Great Stellated (−26%).** Census: maximal-PT `map()` call-sites
    **6→2**. 44/44 formulas `webglCompile`-green. L6: `BASE_COMPILE_MS` 4200→3900
    (Direct-measurable trace saving; the PT-baseline drop is a PT-only effect the
    per-toggle model doesn't separately represent).
  - ❌ **Lead 3 — env-NEE visibility reuse GetSoftShadow (FALSIFIED).** Routing
    env-NEE through the already-live `GetSoftShadow` (high `k`) to DCE
    `envVisibility` was **sub-noise / marginally positive** (B−A +408 / +134;
    D−C −55 / −297; controls +378 / +749). Reusing GetSoftShadow's heavier
    penumbra body roughly cancels the `envVisibility` removal — unlike ADR-0074,
    where the removed march was a per-light NEE-loop inline. **Env MIS is
    compile-tight at this level** (matches session 2's +IS conclusion).
  - **Lead 5 (NEE-all-lights) — deferred to L4.** By inspection NEE-all flips
    `neeCount` 1→activeCount + the `lightIdx` source; it adds **no new `DE_Dist`
    site** (shadow march body unchanged), so there is no march to collapse. Its
    +832ms is loop-realization/register (an L4/fxc-construct item); the candidate
    "bound the loop on `neeCount` not literal 3" lever is predicted no-op by
    session 2's finding that define-bounded loops are already emitted `[loop]`.
  - **Confirmed negatives added:** collapsing byte-identical trace functions
    (fxc folds them — lead 1); env-NEE→shadow-march reuse (lead 3). **The
    remaining `map()` inlines are the 2 inner-march calls** — the inner-march
    `map`→`mapDist` split is the historically-reverted +5%-runtime one
    (`trace.ts:33-38`); don't touch. Future L5 wins must remove a genuine heavy
    inline or make a distinct heavy body uncalled (DCE) — not "dedup a function."

  **Session 4 (cont.) — Edge Polish + Step Relaxation removed (ADR-0077, owner
  decision; +~1.2–1.7s).** Two never-useful quality controls (`refinementSteps`,
  `stepRelaxation`), both default-0 and inert there, with no formula/preset
  setting them non-zero → removal is invisible. A cold within-run A/B (two runs,
  formula-paired) attributed each: **Step Relaxation −53/+55ms (Mandelbulb),
  −127/+97ms (Great Stellated) → ~0** (it's straight-line `smoothstep`/`mix` ALU
  in the march loop — the §4.3 fxc no-op, confirmed yet again); **Edge Polish
  −692/−1689ms / −1451/−1365ms → real ~1.2–1.7s** (its refine loop carried a live
  `mapDist` inline + the loop). The refine-loop removal **supersedes ADR-0076's
  refine `map`→`mapDist`** (loop gone); ADR-0076's recovery-reuse stands.
  maximal-PT `map()` sites **6→2**; 44/44 `webglCompile`-green; `BASE_COMPILE_MS`
  3900→3600. (Note: this is a feature *removal*, not the §0 "make the same
  variant compile faster" scope — but it removes genuinely dead, owner-retired
  controls, not a benchmark dodge. A re-confirmation of the relax=ALU=no-op model
  came free.)

- ⛔ **L4 — fxc-construct audit (avoid what fxc is slow on). WORKED, no win —
  every PT loop is already `[loop]`; the chunk is compile-tight at the construct
  level.** Find the GLSL constructs that make fxc slow (§7.3) inside the active
  shader: constant-bounded loops it will unroll, high register-pressure blocks,
  and code emitted into a variant that is provably unreachable for that variant.

  **Session 5 (2026-06-19) — RESULTS. All measured cold (Mandelbulb, within-run
  marginals + Sobol control); no GLSL shipped. The session confirms the §7.3
  unroll hypothesis is falsified for *every* loop in the PT shader, small and
  large.** Note: this session's machine baselined faster (PT baseline ~5.7s vs
  the session-1 ~10.3s), so absolute marginals are smaller than §2.3 — read the
  *deltas*, and the ~1s noise floor still applies.

  - ❌ **NEE-all-lights (+832ms §2.3) loop construct — FALSIFIED → compile-tight.**
    The const-3 NEE loop (`pathtracer.ts:710`: `for(nee_i<3){ if(nee_i>=neeCount)
    break; }`) carries one `GetSoftShadow` inline (the shadow march). Hypothesis:
    the literal-3 bound is unrolled → 3 march inlines when NEE-all flips
    `neeCount` 1→activeCount. **Two-run A/B (both Sobol-clean): NEE marginal
    +385ms (literal-3) → +218ms (loop rebounded on runtime `neeCount`), a 167ms
    swing that is deep sub-noise — and the control itself drifted 76ms run-to-run.
    Baseline byte-identical (5699↔5715ms), confirming the NEE-OFF peeled-1 case is
    unchanged.** Decisive magnitude argument: an unrolled 3× would add **two** full
    shadow marches ≈ +1.9s (cf. ADR-0074's single extra march = +969ms); the
    observed marginal is *below one march* → the body is inlined **once** → the
    loop is already `[loop]`. **NEE's marginal is loop-realization + register
    pressure (§7.3), irreducible by the construct change.** Reverted the
    `<neeCount` rewrite (a no-op, even if marginally cleaner) to keep the
    change-set to measured wins only — exactly as session 2 handled the +IS hog.

  - ❌ **The 8-bounce PT loop construct (the biggest, never-before-probed loop) —
    FALSIFIED.** Prior sessions only tested *small* loops (NEE ≤3, CDF ≤9, AO 32,
    shadow 256); a 3-agent dig on the live dump flagged the main bounce loop
    (`pathtracer.ts:561`: `for(bounce<8){ if(bounce>=maxBounces) break; }`,
    `maxBounces=uPTBounces`∈[1,8]) as the one untested big-ticket construct — its
    ~450-line body wraps the *entire* NEE / env-MIS / BSDF chunk, so an 8× unroll
    would be the single largest lever in the shader. **Rebounded it on runtime
    `maxBounces` (`for(bounce<maxBounces)`, behaviour-identical since uPTBounces is
    clamped ≤8) and measured the PT baseline: 5270ms (run 1, noisy — Sobol control
    +247ms) then 5651ms (run 2, clean — control +97ms) vs the literal-8 baselines
    5699/5715ms. The clean run is ~50ms below → sub-noise; the run-1 437ms drop was
    thermal noise flagged by its elevated control.** Decisive: an unrolled-8×
    bounce body collapsing to `[loop]` would drop the baseline by *seconds*, not
    ~50ms. **The bounce loop is already `[loop]` — its ~450-line body's many
    function calls (getSurfaceMaterial / tracePTBounce / GetSoftShadow) trigger
    ANGLE's `[loop]` emission, exactly as the cost model predicts.** This extends
    the "already `[loop]`" finding to the largest loop in the shader.

  - ❌ **Census for a new DCE-able heavy body — NEGATIVE (re-confirms the model).**
    Dumped the maximal-PT shader (`debug/dump-pt-shader.mts`) and censused every
    heavy-body call-site. **Live** heavy inlines in maximal PT: `map()` ×2 (the two
    inner-march calls, 1755/1956 — the historically-reverted `map`→`mapDist` split,
    don't touch), `mapDist` via `DE_Dist` (shadow/normal marches), one `GetNormal`
    (ADR-0075 single 4-tap), one `GetSoftShadow` (NEE), `envVisibility`,
    `intersectAreaLight`. Every **dead** heavy body (`DE()` coloring wrapper,
    `GetHardShadow`, `GetAO`, `GetFastNormal`-in-PT) is already uncalled → fxc DCEs
    it cheaply (S4 lead 2). No heavy body is kept live by a runtime double-branch
    that a compile-gate could collapse — the ADR-0075 normal-estimator collapse was
    the last such case. **Nothing left to harvest** — the win classes ADR-0074/75/
    76/77 exploited are exhausted.

  **Conclusion: the maximal-PT shader is compile-tight at the construct level.**
  Every loop is `[loop]`; there is no unrolled body to collapse, no live heavy
  body kept alive by a removable runtime branch, no dead body with meaningful
  inline-before-DCE cost. The remaining cold cost is the irreducible fxc
  translate + register-allocation of the genuinely-live IR. Further compile
  reduction would require either an *algorithmic* change to what the shader
  computes (a quality trade, e.g. fewer DE taps / cheaper sampling) or the
  out-of-scope §8-Appendix levers (default/load-order changes). **L4/L5 closed
  for structural wins.** **Payoff: none remaining at this level.**

### Tier B — measurement + hygiene (enables Tier A)

- ✅ **L7 — Instrument the first-draw/"unfold" phase.** *(Done 2026-06-19.)*
  Wrapped the post-swap `pipelineRender()` ([`CompileScheduler.ts:363`](../../engine-gmt/engine/CompileScheduler.ts#L363))
  in a `tFirstDrawStart/End` timer and appended `firstDraw=…ms` to the two-stage
  `[Compile]` log (§1.1). Both `measure-pt-*.mts` parsers now capture and print
  it. The protocol can now attribute fxc (`gpu=`) vs first-draw. Emitted on the
  two-stage path only (single-stage returns before the post-swap render).

- ✅ **L6 — Recalibrate `estCompileMs` against §2.3.** *(Done 2026-06-19;
  Area lights re-recalibrated session 3.)* PT switch annotations updated to
  measured cold marginals (Env MIS+IS 650→2579, Env MIS 250→1361, NEE +832 added,
  Sobol 50→25) on the lighting feature params; `@stale` cleared from
  [`profiles.ts`](../../engine-gmt/features/engine/profiles.ts). **Area lights:
  600→2027 (session 1/2) → 1230 (session 3, after ADR-0074's single-march fix
  removed the duplicate shadow march; ≈2027 × the within-run new/old marginal
  ratio 0.61).** **Session 4: `BASE_COMPILE_MS` 4200→3600** — ADR-0076 (refine→mapDist +
  recovery reuse) then ADR-0077 (Edge Polish refine loop removed entirely) cut the
  always-present trace code; the Direct-measurable trace saving drove the −600 (the
  much larger PT-baseline drop is a PT-only effect the per-toggle model can't
  separately represent). Refresh after each L5/L4 win.

- 🔲 **L8 — Fix the `BENCH_SHADER_HANDOFF.md` `dev/` path drift** (§6 stale
  flag). `@stale` / fold on next touch. **Trivial.**

### Suggested sequencing

1. ✅ **Session 2 (2026-06-19):** L7 (firstDraw timer — found first-draw ~0ms,
   all cost is `gpu=`) + L6 (estCompileMs recalibrated to measured) done. Opened
   L5 on the Env MIS+IS hog: dedup + loop-bound both measured sub-noise →
   reverted → hog confirmed compile-tight. Also added the accum-fps side-metric
   (§5.5).
2. ✅ **Session 3 (2026-06-19):** localized **Area lights (+2027ms)** via temporary
   sub-gates → the sphere shadow override (a *second* full `DE_Dist` march from a
   separate `GetHardShadow` call) was +969ms, >half the cost. Shipped the
   single-march fold (ADR-0074): within-run A/B saving −630ms (Mandelbulb) /
   −1356ms (Great Stellated). L6 re-recalibrated (2027→1230). **First real L5 win.**
3. ✅ **Session 4 (2026-06-19):** shipped **ADR-0076** — dropped two `map()`
   inlines from the trace template (refine→`mapDist`; recovery reuses the
   captured candidate `map()`). **PT baseline −25/26%** (Mandelbulb ~13.4→10.0s,
   Great Stellated ~17.2→12.8s). Falsified lead 1 (collapse `traceScene`/
   `traceSceneLean` — fxc folds identical functions → no-op) and lead 3
   (env-NEE→GetSoftShadow reuse — sub-noise; Env MIS compile-tight). **Corrected
   the cost model:** the unit is the `map()` *inline* (≈2s each), not the
   duplicate *function* — ADR-0074/0075 wins were "make a distinct body
   uncalled/DCE'd," not "dedup." Also removed two never-useful quality controls
   (Edge Polish + Step Relaxation, ADR-0077): +~1.2–1.7s, and re-confirmed
   Step Relaxation's ALU is a fxc no-op. L6: `BASE_COMPILE_MS` 4200→3600.
4. ⛔ **Session 5 (2026-06-19):** L4 (fxc-construct audit) — **worked, no win;
   L4/L5 closed for structural wins.** Falsified the NEE-all-lights loop construct
   (literal-3 → runtime `neeCount`: sub-noise; the loop is already `[loop]`, the
   +832ms is irreducible loop-realization/register) and — prompted by a 3-agent
   dump dig — the never-before-probed **8-bounce PT loop** (literal-8 → runtime
   `maxBounces`: ~50ms = sub-noise; the biggest loop is `[loop]` too, its
   function-call-laden body triggers ANGLE's `[loop]` emission). Census found no
   new DCE-able live heavy body (the ADR-0074/75/76/77 win classes are exhausted).
   **The maximal-PT shader is compile-tight at the construct level** — every loop
   is `[loop]`, the remaining cold cost is the irreducible fxc translate+register
   of live IR. Further reduction needs an *algorithmic* quality trade or the
   out-of-scope §8-Appendix levers. No GLSL shipped; no ADR (no change).
5. Re-run L6 after each landed win so the estimate tracks reality. *(No L6 refresh
   after session 5 — nothing shipped; the §2.3 marginals stand. Note the session-5
   machine baselined ~1.8× faster, so its absolute marginals aren't comparable to
   §2.3's — only its within-run deltas are.)*

### Appendix — out of scope (do NOT pursue under the current scope decision §0)

Documented so a future session doesn't re-derive these or mistake them for the
work. They either change *what* compiles (config/load-order) or *work around* the
compile rather than making the shader compile faster. Revisit only with a
deliberate scope change.

- **Changing feature defaults / load order** — e.g. defaulting `ptReflMode` to
  Env MIS so the default shader omits the +IS CDF chunk. Reduces *what gets
  compiled by default*, not how fast a shader compiles. **Explicitly not the
  work.**
- **Cache-hit determinism** — byte-identical source per config so the Chrome GPU
  program cache (§7.1) hits across reloads. Turns repeat colds warm; doesn't make
  any single compile faster.
- **Idle pre-warm** — compile common variants during idle so they enter the cache
  before the user reaches them. Hides cost; doesn't remove it.
- **Parallel-compile tuning** — already correctly used (ADR-0040); §7.2 confirms
  no further wall-time win is available.

---

## 9. See also

- ADR-0040 — two-stage shader compile (the async pipeline this builds on).
- ADR-0043/0044 — 17-position assembly, canonical uniform syncframe.
- ADR-0050/0055 — compile/runtime split (the constraint in §4.1).
- ADR-0070 — procedural-sun NEE (lives in the PT_ENV_MIS chunk L5 rewrites).
- ADR-0073 — adopts the measure-pt-* diagnostics as protocol tooling.
- ADR-0074 — area-light PT shadows fold into a single march (first L5 win).
- ADR-0075 — PT single normal estimator (8→4 DE_Dist taps; biggest L5 win).
- ADR-0076 — trace fn drops two `map()` inlines (refine→mapDist + recovery reuse;
  PT baseline −25/26%; corrected the cost model: fxc folds identical functions
  but inlines `map()` per-site ≈2s each).
- ADR-0077 — remove Edge Polish + Step Relaxation (never-useful, default-inert
  controls; +~1.2–1.7s from the refine loop; re-confirmed Step Relaxation's ALU
  is a fxc no-op).
- `docs/BENCH_SHADER_HANDOFF.md` — render-perf + quality bench harness (S1–S3
  optimization log; the proof-record for "ANGLE is smart, only algorithmic wins").
- Memories: `feedback_angle_d3d11_optimizer`, `feedback_no_compile_gate_realtime`,
  `feedback_shader_testing_gates`, `feedback_gpu_over_cpu_render_tests`.
