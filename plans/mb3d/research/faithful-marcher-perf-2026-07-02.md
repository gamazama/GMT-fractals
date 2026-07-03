# Faithful-marcher perf benchmark — 2026-07-02

**Branch:** `feat/mb3d-importer` · **Question:** does the MB3D-faithful marcher (ADR-0088) cost
compile-time or FPS enough to keep it gated, or is it cheap enough to be GMT's **primary** marcher?
**Verdict:** **not a perf tax** — negligible compile cost, and GPU cost ranges from *free* (smooth DEs)
to *faster* (overshooting DEs, i.e. the import regime). Supports making it the default.

## Method

- Tool: [`debug/bench-shader.mts`](../../../debug/bench-shader.mts) — `EXT_disjoint_timer_query_webgl2`,
  measures **GPU time per draw** (not accumulation-FPS, which is governor-throttled). It snapshots the
  *live compiled* fragment shader + uniform set from the running app, then replays it in a bare
  `shader-bench.html`, so it benches the exact kernel the engine produced (mode toggles + active formula).
  It also reports the frag's `compileMs`/`linkMs` and a reference-image diff.
- Added four reusable flags to the harness (debug-only; no app/engine/importer code touched):
  `--mb3d-faithful=on|off` (the `quality.mb3dFaithful` compile gate, via `setQuality`), `--mb3d-stepdiv`
  / `--mb3d-desub` (the two runtime uniforms), and `--formula=<id>` (bench a non-default formula at *its*
  registry `defaultPreset`, so framing/camera/lights are authored, not degenerate).
- GPU: **NVIDIA RTX 2070 / ANGLE / D3D11** (Windows). 1280×720. **600 draws / 100 warmup.**
  - ⚠ The harness default (240 draws / 60 warmup) **under-warms**: the first ~60 draws include GPU
    clock-ramp + camera-spring settle, inflating the median ~2× (AmazingBox read 25 954 µs at 240/60 vs
    **10 117 µs** at 600/100). All headline numbers below are the 600/100 steady-state medians; discard
    any 240-draw figure.
- Two formulas bracket the DE-behaviour spectrum: **Mandelbulb** (smooth, tight-Lipschitz DE) and
  **AmazingBox / Mandelbox** (sharp, *overshooting* DE — a strong proxy for the hard-hybrid import regime).
- `StepDiv=1.0` isolates the faithful **algorithm** (damper + overstep-clamp + safety-sub) at *equal step
  count*; `StepDiv=0.5` is the authored import default (finer stepping, ~2× steps). `DEsub=0` throughout.

## Results (GPU median µs/draw, 600 draws)

| Formula | OFF (standard march) | ON @ StepDiv 1.0 | ON @ StepDiv 0.5 (authored) |
|---|---|---|---|
| **Mandelbulb** (smooth) | 4330 | 4335 · **+0.1 %** | 5308 · **+22.6 %** |
| **AmazingBox** (overshooting) | 10117 | 8581 · **−15.2 %** *(faster)* | 10000 · **−1.2 %** |

Stability: AmazingBox OFF/ON@1.0 held across 3 runs each (25954/26149/26046 → 10117 at HS; 19794/20076/19939 →
8581 at HS). Mandelbulb ON@1.0 was noisy at 240/60 (one −33 % outlier) but converged to **+0.1 %** at 600/100.

**Compile time — negligible.** GLSL compile stays **14–16 ms** both ways (+~1 ms). The ANGLE HLSL link
dominates (~1.9 s Mandelbulb / ~2.4–2.5 s AmazingBox) and swings ±100 ms run-to-run; the faithful blocks'
**+1209 chars (+1.3 %)** on an 88–90 KB shader is lost in that noise (AmazingBox ON even *linked faster* than
OFF on one run). Toggling the marcher in/out is as cheap as any other recompile.

**Image — unchanged.** Region-MAE matched off↔on to ~2 decimals on both formulas, so the speed deltas are
*not* from rendering less. The marcher only changes output where the standard one was overshooting into dust.

## Why "ON" can be *faster*

The faithful step's Lipschitz overstep-clamp `h.x = min(h.x, RLastDE + RLastStep)` (ADR-0088, from
`CalcThread.pas:223`) stops the sphere-tracer sailing **past** a thin/overshooting surface. On a smooth DE
(Mandelbulb) the clamp/damper never engage → +0.1 % (the extra ALU is free). On an overshooting DE (Mandelbox,
and by extension the hard-hybrid imports) the standard march wastes deep marches recovering from overshoot /
grinding to max-iterations; the clamp eliminates them → the march *terminates sooner* → **−15 %**, and even at
the finer authored StepDiv 0.5 the efficiency gain nearly cancels the 2× step count (**−1.2 %**, break-even).
The cost is highest exactly where the marcher has *no* work to do (already-tight DEs), and it pays for itself
where it *does* (the dust-prone imports it was built for).

## Verdict — primary-marcher question

**Yes, it can be primary.** At equal step size it's free-to-faster with no compile penalty. The natural policy
is what the importer already does: **native formulas default StepDiv 1.0 (free); imports carry their authored
StepDiv** (correct convergence, break-even-to-faster). The +22 % people would fear on Mandelbulb only appears
if you *choose* the finer step — which native scenes never need.

## Caveats

- Two formulas (smooth + overshooting) bracket the spectrum but neither is an actual fused MB3D import — the
  sample-scene loader (`sampleScenes.ts` / `decodeSampleScene`) isn't GMF-compatible with `--scene`, so
  Mandelbox stands in for the overshooting-DE regime. A real fused-import A/B would strengthen this (would need
  the sample-scene loader wired into the bench).
- Single GPU / driver (RTX 2070 / ANGLE D3D11). Magnitudes will vary elsewhere; the "fewer marches" mechanism is
  hardware-independent in *direction*. **Mobile untested** (see the mobile-render-regression thread).
- `DEsub` (safety-subtraction) was 0 here; scenes that set `iOptions` bit 2 add a small per-step subtraction that
  slightly increases step count — not measured.
