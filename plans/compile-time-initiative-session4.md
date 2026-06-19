# Compile-Time Initiative — Session 4: live duplicate-march removal (L5 cont.)

Execution session. Continue cutting PT cold compile time (the cost is entirely
`gpu=` / fxc translate; first-draw ~0, proven session 2). Sessions 1–3 built the
protocol + shipped **two real L5 wins** by removing a **live, duplicated, inlined
`DE_Dist`/`map()` body** kept alive by a runtime predicate:

- **ADR-0074** — sphere-light shadow `if/else` inlined TWO 256-step `DE_Dist`
  marches; folded to one. Area-lights marginal +2027 → +345–977ms.
- **ADR-0075** — PT normal `if(bounce==0) GetNormal else GetFastNormal` inlined
  BOTH 4-tap estimators (8 `DE_Dist` taps); collapsed to one `GetNormal` call.
  PT cold −0.9..−2.5s (Mandelbulb) / **−4.6s (Great Stellated)**. Cumulative
  default-PT cold compile now ~12.8s / 16.3s / 17.3s (was ~13.5 / 20.1 / 20.4).

Session 3 also **falsified Lead 2** (stripping dead `GetAO`/`GetFastNormal` from
PT): −467ms / −5ms, sub-floor → **fxc DCEs uncalled functions cheaply**. So the
remaining wins must remove **live** duplicated heavy inlines, not dead bodies.

**Read first:** `docs/policy/shader-compile-optimization.md` — §0 (scope: make a
variant's GLSL compile faster, same features on), §4 (hard constraints + the
ANGLE-is-smart priors), §5 (measure→attribute→validate; within-run A/B + Sobol
control; in-process program-cache hits read ~20–50ms — identify + discard),
§7.3 (what fxc is slow on), and **§8 L5 "Session-4 leads"** (the ranked plan
below, with file:line). Then read the code: `engine-gmt/shaders/chunks/trace.ts`
(traceScene/traceSceneLean), `pathtracer.ts` (envVisibility, the bounce loop),
`de.ts` (`map` vs `mapDist`), `ShaderBuilder.ts:585-588` (trace fn emission).

**Method that works:** dump the live PT shader (`npx tsx debug/dump-pt-shader.mts`
→ `h:/tmp/pt-*.frag`; NB retains `#ifdef` directives — reason about LIVE code
only), census `DE_Dist`/`map()` inlines, collapse any kept alive by a runtime
predicate. Measure each change cold via within-run A/B (`debug/measure-pt-switches.mts`
or a small toggle script), Sobol control every run, discard cache-flake cells.

---

## PROMPT (paste this)

> Continue the shader compile-time initiative (L5), session 4. Two wins shipped
> (ADR-0074/0075) by removing live duplicated inlined `DE_Dist`/`map()` marches;
> Lead 2 (dead-body strip) was falsified. Read
> `docs/policy/shader-compile-optimization.md` §0/§4/§5/§7.3/§8-L5 first, then the
> code, before reasoning. Work the ranked leads, hog-first:
>
> 1. **`traceScene` vs `traceSceneLean` — the 3×`map()` duplicate (biggest).**
>    `trace.ts` / `ShaderBuilder.ts:585-588` emit two near-identical trace
>    functions (camera ray vs bounce ray) differing ONLY in injected volume code;
>    each inlines 3 full `map()` (march + refinement + recovery) — `map()` is the
>    heaviest body in the shader. Collapse PT to a single shared trace function
>    (compile-gate the volume body so the lean path is the same fn with empty
>    injection). **Risk:** fxc may already share one translated body when the lean
>    volume injection is empty → no-op; the within-run A/B settles it in one cold
>    run (point `tracePTBounce` at the shared fn; measure `gpu=`, Sobol control).
>    Watch quality: traceScene carries volume accum the bounce discards (DCE'd).
>
> 2. **Env MIS (+1.4s): fold `envVisibility` into `GetHardShadow`.**
>    `envVisibility` (`pathtracer.ts:437`) is a standalone `DE_Dist` march that is
>    a near-clone of `GetHardShadow` (`shadows.ts:100`) — the only NEW heavy march
>    Env MIS adds. ADR-0074 pattern. **Localize first** with temporary sub-gates
>    (`…VIS` / `…EVAL` / `…BSDFSIDE` / `…DIRPDF`); predict `…VIS` carries ≳1s. If
>    `…VIS` is sub-noise, Env MIS is compile-tight like +IS — document + stop.
>
> 3. **Refinement loop `map()`→`mapDist()` (measure with care).** The surface-
>    refinement loop (`trace.ts:131-143`) converges on distance only (`h_ref.x`)
>    but inlines the full `map()`. Swap to `mapDist` + one final `map()` on hit.
>    **But:** a prior map/mapDist main-march split was reverted (+5% runtime,
>    `trace.ts:33-38`) and bounce shading may consume `result.yzw` coloring from
>    the lean trace — verify before swapping; gate on BENCH_SHADER render p50, not
>    just compile.
>
> 4. **NEE-all-lights (+0.8s) — lowest priority, L4-flavoured.** No new march; the
>    const-3 NEE loop (`pathtracer.ts:710`) goes from compile-peeled-1 to a runtime
>    trip → likely loop-realization/register cost. Pre-check: dump gate-on vs
>    gate-off and diff the `DE_Dist` count (expect identical). Only if leads 1–3
>    plateau.
>
> **Confirmed negatives (don't re-pursue):** dead-body strip (Lead 2, session 3);
> GGX-eval dedup and `intersectAreaLight` dedup (straight-line/ALU, fxc no-ops,
> §4.3); CDF-loop bounds (already `[loop]`, session 2); forcing define-bounded
> loops runtime.
>
> Protocol (non-negotiable): `npm run dev` running separately (Windows
> `runWithServer.mts` dies EINVAL); measure COLD with the headed-Chrome harness
> (`--use-angle=d3d11 --disable-gpu-shader-disk-cache`); use within-run A/B deltas;
> keep the Sobol known-free control and discard contaminated/cache-flake cells
> (~20–50ms reads = in-process cache hit). `npm run typecheck` green; write an ADR
> (with `@see` from source) for any load-bearing GLSL-structure change that SHIPS;
> `git rev-parse --abbrev-ref HEAD` before committing; commit only when I ask.
> Record measured before/after in the doc §8 L5, and re-run L6 (estCompileMs) for
> any switch whose cost changes. Gate correctness on `webglCompile` + a visual
> check; quality regressions on BENCH_SHADER thresholds (PASS ≤0.5 MAE & ≤8 max).
> Falsify before believing — don't hand-hoist GLSL ANGLE/fxc already optimizes.
