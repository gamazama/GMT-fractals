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
| **first-draw / "unfold"** | driver realizes the program object and does first-draw setup before pixels appear | **not isolated** — absorbed into `totalElapsed − gen − gpu` along with the preview stage | unknown; ANGLE is known to defer D3D program realization to first draw |

The third phase is real (empirically: there's a stall *after* compile before the
first frame draws, and a warm cache collapses it to ~instant alongside the
compile). It corresponds to ANGLE deferring final D3D program/PSO realization to
the first `draw` call — here, the post-swap `pipelineRender()` at
[`CompileScheduler.ts:351`](../../engine-gmt/engine/CompileScheduler.ts#L351),
which runs *before* `totalElapsed` is taken at line 353 but *after* the `gpu=`
timer closes at line 329. **Attributing this phase requires a new timer around
the post-swap first render** — see backlog L7.

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
[Compile] Two-stage: 13459ms (Mandelbulb, gen=42ms, gpu=13366ms)
[Compile] Single-stage: 5200ms (GreatStellatedDodecahedron)
```

Emitted at [`CompileScheduler.ts:356`](../../engine-gmt/engine/CompileScheduler.ts#L356)
(two-stage) and [`:264`](../../engine-gmt/engine/CompileScheduler.ts#L264)
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
| Area lights | +2027ms |
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

**It under-counts PT switches badly:**

| Switch | annotated `estCompileMs` | measured cold | factor |
|---|---|---|---|
| `ptReflMode` Env MIS+IS | 650ms | ~2579ms | ~4× |
| `ptReflMode` Env MIS | 250ms | ~1361ms | ~5× |
| `ptAreaLights` | 600ms | ~2027ms | ~3× |
| `ptSobolBounce` | 50ms | ~23ms | ~ok (over) |

The session-1 default change was annotated ~+700ms; the real cold toll was
+2–4s. Note the *direction* is PT-specific: `BENCH_SHADER_HANDOFF` shows the
Direct-scene base compiling *faster* than its estimate, so this is not a blanket
error — the annotations are calibrated for Direct and under-count PT. Recalibrate
against §2.3 (backlog L6).

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

---

## 6. Tooling inventory

The measurement substrate. The two `measure-pt-*.mts` scripts are the protocol's
canonical tools (adopted this session — `@see` ADR-0073).

| Tool | Purpose |
|---|---|
| [`debug/measure-pt-compile.mts`](../../debug/measure-pt-compile.mts) | Cold PT compile per formula, old-vs-new defaults. `MEASURE_FORMULAS=…` override. Produces §2.2. |
| [`debug/measure-pt-switches.mts`](../../debug/measure-pt-switches.mts) | Per-switch marginal cold cost (baseline + each gate alone). Produces §2.3. |
| [`debug/bench-shader.mts`](../../debug/bench-shader.mts) | GPU timing + reference-image diff harness (render perf + compile; parses the `[Compile]` log). Quality-regression gate. See `docs/BENCH_SHADER_HANDOFF.md`. |
| [`debug/native-config-sweep.mts`](../../debug/native-config-sweep.mts) | Compiles every formula, gates on `webglCompile`, records per-formula `timeMs`. Whole-set correctness + timing regression guard. |
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

- 🔲 **L5 — Rewrite the biggest PT chunks to compile faster, hog-first.** Ordered
  by measured marginal cost: **Env MIS+IS (+2579ms)** → **Area lights (+2027ms)**
  → **Env MIS (+1361ms)** → **NEE (+832ms)**. In
  [`shaders/chunks/pathtracer.ts`](../../engine-gmt/shaders/chunks/pathtracer.ts)
  + the lighting chunks, with the feature *on*: simplify the algorithm, remove
  genuinely dead/redundant emitted GLSL *inside* the chunk, collapse duplicate
  helper emissions, swap heavy functions for lighter equivalents (DE→DE_Dist
  style). The session-1 finding localizes the Env MIS+IS hog to the straight-line
  trig + ~8 texture fetches + `sampleEnvAtCDFMip` (the CDF loop was already
  cheap) — that block is the first target. Measure each change cold (§5.3); revert
  non-wins; gate quality on `BENCH_SHADER` thresholds. **Payoff: ~10–30% of
  `gpu=` per BENCH_SHADER S2/S3 precedent; risk medium** (quality regressions).
  **~1–2 sessions, iterative.**

- 🔲 **L4 — fxc-construct audit (avoid what fxc is slow on).** Find the GLSL
  constructs that make fxc slow (§7.3) inside the active shader: constant-bounded
  loops it will unroll (convert to runtime/`[loop]`-bounded where correctness
  allows), high register-pressure blocks, and code emitted into a variant that is
  provably unreachable for that variant (remove it from the chunk — this is
  fixing the shader source, *not* gating a feature off by default). **Payoff:
  medium-high, compounds with L5; risk medium** (must not regress the
  compile/runtime split ADR-0055 or quality). **~1–2 sessions.** Depends on L7.

### Tier B — measurement + hygiene (enables Tier A)

- 🔲 **L7 — Instrument the first-draw/"unfold" phase.** Add a timer around the
  post-swap `pipelineRender()` ([`CompileScheduler.ts:351`](../../engine-gmt/engine/CompileScheduler.ts#L351))
  and add `firstDraw=` to the `[Compile]` log so the protocol can attribute the
  third compile phase (§1.1). Without this we can't tell whether a GLSL change
  helped fxc or first-draw. **Prerequisite for cleanly reading L5/L4 results;
  risk low.** **~¼ session.**

- 🔲 **L6 — Recalibrate `estCompileMs` against §2.3.** Make the Engine-panel
  estimate honest for PT (currently ~3–5× low). Pure data change in
  [`profiles.ts`](../../engine-gmt/features/engine/profiles.ts); no shader risk.
  Also recalibrate `BASE_COMPILE_MS`. **Payoff: trustworthy UX estimate (not
  compile time itself); risk ~none.** **~¼ session.** Refresh after each L5/L4
  win lands.

- 🔲 **L8 — Fix the `BENCH_SHADER_HANDOFF.md` `dev/` path drift** (§6 stale
  flag). `@stale` / fold on next touch. **Trivial.**

### Suggested sequencing

1. **Session 2:** L7 + L6 first (cheap; gives clean attribution + an honest
   estimate), then open L5 on the Env MIS+IS hog (the measured +2579ms).
2. **Session 3:** continue L5 down the hog list (Area lights → Env MIS → NEE).
3. **Session 4:** L4 (fxc-construct audit) once the per-chunk rewrites plateau.
4. Re-run L6 after each landed win so the estimate tracks reality.

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
- `docs/BENCH_SHADER_HANDOFF.md` — render-perf + quality bench harness (S1–S3
  optimization log; the proof-record for "ANGLE is smart, only algorithmic wins").
- Memories: `feedback_angle_d3d11_optimizer`, `feedback_no_compile_gate_realtime`,
  `feedback_shader_testing_gates`, `feedback_gpu_over_cpu_render_tests`.
