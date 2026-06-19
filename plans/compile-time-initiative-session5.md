# Compile-Time Initiative — Session 5: L4 fxc-construct audit (post-inline-model)

Execution session. The PT cold compile cost is entirely `gpu=` (fxc translate;
first-draw ~0, proven session 2). Sessions 1–4 built the protocol and shipped
four L5 wins, then **corrected the cost model** — which now drives L4.

## What sessions 1–4 established

- **ADR-0073** — measurement protocol + the `measure-pt-*` / `dump-pt-shader` tools.
- **ADR-0074** (S3) — area-light shadow single march (−0.6s Mb / −1.4s GSD).
- **ADR-0075** (S3) — PT single normal estimator, 8→4 `DE_Dist` taps (−0.9…2.5s Mb
  / −4.6s GSD).
- **ADR-0076** (S4) — trace fn drops a `map()` inline: overstep-recovery reuses the
  candidate `map()` already computed during marching (byte-identical; −1.7s Mb /
  −2.1…2.8s GSD). (Its refine `map`→`mapDist` half was superseded by ADR-0077.)
- **ADR-0077** (S4) — removed two never-useful, default-inert quality controls
  (Edge Polish + Step Relaxation). Edge Polish's refine loop carried a live
  `mapDist` inline → −1.2…1.7s; Step Relaxation was straight-line ALU → ~0.

**The corrected cost model (load-bearing — read before reasoning):** fxc compile
cost is driven by **distinct live function bodies + per-site heavy inlines**, NOT
by call-site count of shared functions and NOT by straight-line ALU:
- fxc **folds byte-identical functions** (so collapsing `traceScene`/`traceSceneLean`
  was a measured no-op — S4 lead 1).
- fxc **inlines `map()` per call-site, each inline ≈2s** (so removing a genuine
  `map()` inline is a big win — ADR-0076).
- **straight-line ALU is free** to remove (Step Relaxation = no-op; the triplicated
  GGX eval, `intersectAreaLight`, CDF math — all fxc no-ops, §4.3).
- **define-bounded loops are already emitted `[loop]`** (not unrolled), so forcing
  a runtime bound is a no-op (S2 CDF loops).

So a win must **(a) remove a genuine heavy inline** (`map`/`mapDist`/a full march
loop) **or (b) make a distinct live heavy body uncalled → DCE'd** (what
ADR-0074/0075 did). NOT function-dedup, NOT ALU micro-opt, NOT loop-bound forcing.

**Read first:** `docs/policy/shader-compile-optimization.md` — §0 (scope), §4
(hard constraints + ANGLE-is-smart priors), §5 (measure→attribute→validate;
within-run A/B + Sobol control; **watch the control — discard contaminated runs**),
§7.3 (what fxc is slow on: loop unroll + register allocation), and **§8 L4 + the
L5 session-4 results** (the model above, with the confirmed-negatives list). Then
read the code: `engine-gmt/shaders/chunks/pathtracer.ts` (the bounce loop + NEE),
`trace.ts` (the 2 remaining inner-march `map()` inlines), `de.ts` (`map` vs `mapDist`).

## PROMPT (paste this)

> Continue the shader compile-time initiative, session 5 — **L4 (fxc-construct
> audit)**, now that L5's duplicate-inline leads are exhausted. Read
> `docs/policy/shader-compile-optimization.md` §0/§4/§5/§7.3/§8-L4 and the
> §8-L5 session-4 results (the corrected cost model) first, then the code, before
> reasoning. The model: fxc folds byte-identical functions and inlines `map()`
> per-site (~2s each); straight-line ALU and runtime loop-bound forcing are
> no-ops. So a win removes a genuine heavy *inline* or makes a distinct live heavy
> *body* uncalled (DCE'd) — never function-dedup or ALU micro-opt.
>
> Work these, measured cold (within-run A/B + Sobol control), hog-first:
>
> 1. **NEE-all-lights (+832ms) — register/loop-realization, not a march.** Confirmed
>    (S4, by inspection): gate-on vs gate-off emit the *same* `DE_Dist`/march sites
>    — NEE-all only flips `neeCount` 1→activeCount and the `lightIdx` source
>    (`pathtracer.ts:705-718`). So the +832ms is the const-peeled-1 NEE loop
>    becoming a real ≤3-trip loop carrying the shadow march + GGX eval (register
>    pressure, §7.3). Pre-check the §7.3 angle: is the `for(nee_i<3)` loop emitted
>    `[loop]` or unrolled? (S2 found define-bounded loops already `[loop]` → forcing
>    `<neeCount` is likely a no-op — falsify it cheaply, don't assume.) If there's no
>    construct lever, document NEE as compile-tight like +IS and stop.
>
> 2. **Census the live dump for a distinct heavy body that can be made uncalled.**
>    `dump-pt-shader.mts` → grep function defs that are *defined AND called* in
>    maximal-PT and carry a march/heavy body. ADR-0074/0075 found theirs this way
>    (`GetFastNormal`, the override `GetHardShadow`). Likely slim pickings now, but
>    one DCE-able distinct body = a real win.
>
> 3. **Inner-march `map()` (the 2 remaining inlines) — DO NOT touch naively.** The
>    `map`→`mapDist` split there is the historically-reverted +5%-runtime one
>    (`trace.ts:33-38`). Only revisit if you find a *runtime-neutral* way to avoid
>    the full `map()` per step (e.g. a way the hit-point coloring can come from the
>    last step without a second eval). Gate on BENCH render p50, not just compile.
>
> **Confirmed negatives (don't re-pursue):** function-dedup / collapsing identical
> trace fns (fxc folds — S4 lead 1); env-NEE→shadow-march reuse (S4 lead 3);
> dead-body strip (S3 lead 2); GGX-eval + `intersectAreaLight` ALU dedup (§4.3);
> CDF binary-search loop unroll + forcing runtime loop bounds (S2, already `[loop]`);
> straight-line ALU removal (Step Relaxation, S4); Env MIS+IS reducible without
> changing what it computes (S2, compile-tight).
>
> **Harness gotcha (cost me a run in S4):** `setLighting` MERGES — in a multi-cell
> A/B, reset every toggled flag explicitly in each cell or later cells inherit
> prior flags (a control cell that doesn't reset reads as "contaminated").
>
> Protocol (non-negotiable): `npm run dev` running separately (Windows
> `runWithServer.mts` dies EINVAL); measure COLD headed-Chrome
> (`--use-angle=d3d11 --disable-gpu-shader-disk-cache`); within-run A/B deltas;
> **keep the Sobol known-free control and DISCARD any run whose control reads
> non-zero** (S4 had two drifty runs — the control is what saved them). `npm run
> typecheck` green; `native-config-sweep --fresh` 44/44 `webglCompile`; write an ADR
> (+ `@see` from source) for any GLSL-structure change that SHIPS; re-run L6
> (`BASE_COMPILE_MS`/`estCompileMs`) for anything whose cost changes;
> `git rev-parse --abbrev-ref HEAD` before committing; commit only when I ask.
> Falsify before believing — three sessions running, the no-ops outnumber the wins.
