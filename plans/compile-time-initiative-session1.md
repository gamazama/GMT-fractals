# Compile-Time Initiative — Session 1: Consolidate · Research · Design Protocol

This is the **planning/foundation** session for a multi-session effort to cut
shader **compile time**. Do NOT optimize shader code this session. Produce three
things: (1) a consolidated, de-duplicated knowledge base of what the codebase
already "knows" about shaders + optimization, (2) researched compile-time
techniques that actually apply to WebGL2/ANGLE/D3D11, and (3) a repeatable
**protocol** + prioritized **backlog** so execution sessions run efficiently.

---

## PROMPT (paste this)

> I'm starting a multi-session effort to reduce **shader compile time** in
> gmt-engine (PT cold compiles are ~10–20s). This first session is foundation
> only — no shader optimization yet. Deliver:
>
> 1. **Consolidate** the scattered shader/optimization learnings in the repo into
>    one authoritative doc (propose `docs/policy/shader-compile-optimization.md`).
>    Gather from: ADRs (0040 two-stage compile, 0043/0044 assembly+uniform sync,
>    0050/0055 compile-runtime split, and this session's 0068–0072), source JSDoc
>    + greppable markers (`ShaderBuilder.ts`, `ShaderFactory.ts`,
>    `CompileScheduler.ts`, the shader chunks), `estCompileMs` annotations +
>    `estimateCompileTime` (profiles.ts), `docs/BENCH_SHADER_HANDOFF.md`, and the
>    behavioural memories (`feedback_angle_d3d11_optimizer`,
>    `feedback_shader_testing_gates`, `feedback_no_compile_gate_realtime`,
>    `feedback_gpu_over_cpu_render_tests`). Fold duplicates, fix/flag stale notes.
>
> 2. **Research** (web + deep-research) compile-time reduction for WebGL2 →
>    ANGLE → D3D11/DXBC: variant reduction, program/binary caching limits in
>    WebGL2, `KHR_parallel_shader_compile`, two-stage/async compile, loop-unroll
>    control, register-pressure / shader-complexity reduction, `#define` hygiene,
>    and — critically — *reducing the number of cold compiles* vs reducing
>    per-compile cost. Adversarially verify claims; cite sources.
>
> 3. **Design a protocol**: a reliable measure→attribute→validate methodology
>    (built on the diagnostics already written — see below), plus a prioritized
>    backlog of candidate levers with expected payoff and risk, sized into
>    execution sessions.
>
> Work the established way: read code before reasoning; `npm run typecheck` green;
> ADRs for load-bearing decisions with `@see` from source; don't proliferate
> markdown (one policy doc); check `git rev-parse --abbrev-ref HEAD` before
> committing; commit only when I ask. Confirm the consolidation outline + research
> scope with me before writing the full doc.

---

## Supporting context — what THIS session established (don't re-derive)

### The numbers (real, cold, D3D11/ANGLE, this machine)
- A **cold** PT compile is huge: baseline PT ~11.3s (Mandelbulb), ~15.5s
  (Great Stellated Dodec.). A **cached** recompile of the *same* shader is
  ~50ms — i.e. the D3D11 DXBC cache is ~**200–400× faster**. Caching / variant
  reduction is therefore the highest-conceivable lever; per-compile micro-opt is
  low-yield.
- This session's PT-default change (ptReflMode → Env MIS+IS, ptSobolBounce → on)
  added **+2.1s / +3.1s / +4.1s cold** (Mandelbulb / MixPinski / GreatStellated;
  +18–25%).
- Per-switch cold cost (marginal, Mandelbulb baseline 11.3s): **Env MIS+IS
  +2.8s**, Env MIS +1.6s, Area lights +1.4s, NEE-all +0.2s, **Sobol +0.02s
  (free)**. Env MIS+IS is the single biggest default-on cost; its +IS (CDF) half
  alone is ~1.2–2.4s.

### Hard-won methodology pitfalls (bake into the protocol)
- **Measure COLD, not cached.** The DXBC cache makes a *repeat* of the same
  shader read ~50ms and lie. Compile each variant exactly once per process;
  launch Chrome with `--disable-gpu-shader-disk-cache`; never average repeats.
- **Noise floor ~1s** on cold compiles (thermal/contention). Use *within-run*
  deltas (they cancel baseline noise) and/or multiple runs; treat sub-~1s
  differences as noise. One contaminated run this session showed "Sobol +2865ms"
  (it's ~0) — discard runs where a known-free control is non-zero.
- **`estCompileMs` under-counts ~4–8×.** Annotations said +700ms for the default
  change; real cost was +2–4s. The estimate (shown in the Engine panel) should be
  recalibrated against measured data — list this as a cleanup item.
- **Don't micro-optimize straight-line GLSL blindly.** A hypothesis that the CDF
  binary-search loop unroll was the hog was **falsified** by measurement (the +IS
  cost is the straight-line trig + ~8 texture fetches + `sampleEnvAtCDFMip`, not
  the loop). Always measure before/after; revert non-wins.

### The real lever already identified (candidate for an execution session)
- Default `ptReflMode` → **Env MIS (1)** instead of Env MIS+IS (2): removes the
  +IS cold compile (~1.2–2.4s) for the default procedural/gradient sky (which
  doesn't use the CDF), `+IS` only when an HDR texture env is loaded. Sobol stays
  on (free). One-line change in `engine-gmt/features/lighting/index.ts` + ADR-0070
  note. (Not yet applied — left for a decision/execution session.)

### Tools already built (the measurement substrate)
- `debug/measure-pt-compile.mts` — cold PT compile per formula, old-vs-new
  defaults. `MEASURE_FORMULAS=...` env override.
- `debug/measure-pt-switches.mts` — per-switch marginal cold compile cost.
- Both: boot app-gmt in real Chrome (ANGLE/D3D11), drive `window.__store`
  setters, time the proxy's `isCompiling` window + parse the worker
  `[Compile] Two-stage: …ms (…, gen=…, gpu=…)` log. **Caveat:** Windows —
  `debug/runWithServer.mts` dies with `spawn EINVAL`; start `npm run dev`
  separately and let the script wait for the port (it connects to `localhost`,
  not `127.0.0.1`, for the IPv6/Vite case). These are **untracked** — the
  consolidation session should adopt/commit them as the protocol's tooling.
- Engine-side: `CompileScheduler` records `lastDuration` + gen/gpu split and
  emits `FRACTAL_EVENTS.COMPILE_TIME`; `FractalEngine.lastCompileDuration` getter.
- `debug/native-config-sweep.mts` — compiles every formula, gates on
  `webglCompile`, records per-formula `timeMs` (correctness + timing across the
  whole formula set; good regression guard).

### Architectural facts relevant to compile time
- **Two-stage compile** (ADR-0040): a fast preview material, then the full
  material via `renderer.compileAsync` on a dummy scene (the "gpu=" timer is the
  real DXBC cost). Async — worth researching `KHR_parallel_shader_compile` usage.
- PT and Direct integrators are **mutually exclusive** shaders (`isPathTracing`
  if/else in `lighting/index.ts`); compile-gated `#define`s only cost when their
  chunk is in the active shader. Default Direct experience is ~unaffected by all
  the PT work.
- Compile is gated/triggered per `onUpdate:'compile'` param; mode toggles
  recompile, sliders don't (`feedback_no_compile_gate_realtime`).

## Deliverables (definition of done for session 1)
1. `docs/policy/shader-compile-optimization.md` — consolidated knowledge:
   compile pipeline model, the cache/cold facts, measurement protocol, the
   `estCompileMs` inaccuracy, per-switch cost table, tools, and pitfalls.
2. A researched techniques section (cited) — what actually reduces ANGLE/D3D11
   compile, ranked by applicability to this engine.
3. A prioritized **backlog** of compile-time levers (variant reduction, default
   tuning, caching strategy, two-stage/parallel-compile tuning, shader
   simplification, `estCompileMs` recalibration), each with expected payoff,
   risk, and rough session sizing.
4. The two diagnostic scripts committed (or a decision to) as the protocol's
   measurement tooling.

Do NOT change shader code for optimization this session — that's the execution
sessions, which this protocol exists to make efficient.
