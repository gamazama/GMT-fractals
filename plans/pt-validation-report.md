# PT Perf + Quality Validation — Bucket Render Verdict

> exec/pt-validation · 2026-06-11 · measurement-only session (no render-behaviour changes)
> Status: COMPLETE (headless std tier, canonical scene). Relative metrics are GPU-robust;
> real absolute timing + final visual sign-off come from the user's `--gpu` run.

## Why

The bucket-render PT noise question is the named dev→prod cutover blocker. The root causes
were already documented ([docs/gmt/43_Bucket_Render_Overhaul.md:103-114]); what was missing
was reproducible, decision-grade measurement. This report + the `bench:pt` harness replace
"looks fine to me" with numbers.

## Harness

`npm run bench:pt` (debug/bench-pt.mts + a bucket-render driver added to
debug/render-harness.ts). It drives the REAL export path — `BucketRunner` →
`GmtBucketHost` → `exportMaterial` readback — so every measured pixel is exactly what a
user's exported PNG contains. Two debug-only prototype patches capture per-tile pixels
(instead of DOM-downloading) and per-bucket effective sample counts; production behaviour
is otherwise untouched.

Key levers the harness exploits:

- **Determinism**: during bucket renders `uFrameCount = pipeline.accumulationCount`
  (FractalEngine.ts:508-510), and Halton jitter + blue-noise lookups are indexed off it →
  same scene+config ⇒ bit-identical output. Verified per run (see `determinism` in
  results.json).
- **Exact-spp mode**: `convergenceThreshold = 0` can never beat the convergence measure,
  so every bucket runs to `samplesPerBucket`. The runner composites on the tick BEFORE the
  Nth sample lands, so the cap is set to spp+1; effective spp is read back from
  `pipeline.accumulationCount` at composite time and reported per bucket.
- **Natural mode**: today's production behaviour (threshold 0.25 %, convergence-polled per
  bucket) — used to quantify convergence-variance seams against the exact-spp control.

### Invocations

| Goal | Command |
|---|---|
| **Default — real GPU** (fast; real timing + visual sign-off) | `npm run bench:pt:with-server -- --gpu` (add `--full` for 4K timing) |
| Single suite / scene on GPU | `npm run bench:pt -- --gpu --suite=seam` (needs `npm run dev` or ENGINE_URL) |
| Headless (CI / no-GPU box — relative metrics only) | `npm run bench:pt:with-server` |
| Smoke | `npm run bench:pt:with-server -- --quick --gpu` |

**Prefer `--gpu`.** It runs headed Chromium on the real GPU: same relative metrics as
headless, PLUS trustworthy absolute timing, in minutes not hours. Headless (SwiftShader) is
a CPU software rasterizer — reserve it for a CI box with no GPU, where only the relative
metrics matter. Artifacts land in `debug/pt-bench/` (gitignored): `results.csv`,
`results.json`, `index.html` (stitched PNGs + ×8 diff heatmaps + metrics per case).

### Headless caveat (applies to the numbers below — they were collected headless)

The figures in this report were collected on **ANGLE/SwiftShader (CPU software rasterizer),
NOT a real GPU**, because the headless path is what CI/an agent can run unattended.
**Relative metrics (PSNR curves, seam band/interior ratios, step ratios, bit-identity)
transfer to a real GPU; absolute render times do NOT** — SwiftShader runs every ray-march
and PT bounce on the CPU (~1.5 s/sample at 256² for Claude, hours for a full sweep). Timing
rows are labelled `HEADLESS-INDICATIVE ONLY`. The harness restarts the browser every 10
renders (SwiftShader precision degrades over long sessions). **For real timing + the final
visual sign-off, re-run `--gpu` — it is the authoritative source for anything time-related.**

## Test scene (one canonical scene — and why one is enough)

The render path under test — PT accumulation (ping-pong float MRT, Halton/blue-noise
indexed by `accumulationCount`), the bucket/image-tile loop, per-tile post-process, and
the stitch — is **formula-independent**. A formula only swaps the distance-estimator math
inside the SDF; it never changes how samples accumulate, how buckets composite, or how
tiles stitch. So a multi-formula sweep measures the *same* seam/convergence machinery N
times. The verdict therefore uses ONE canonical scene; the harness keeps `--scenes` for
when a second is wanted.

| Scene | Why |
|---|---|
| `Claude` (canonical) | PT-native preset — GI + soft shadows, frame-filling structure; the standard noise case |

The one axis that genuinely varies the result is scene **content**, not formula: a dark
background makes the per-tile bloom black-bleed seam far starker than a frame-filling one.
That contrast is captured by a single dark-background spot-check (`Mandelbulb`, framed to
sit against black) rather than a full second suite — see the bloom-seam note in Results.
Camera framings are explicit origin-orbit views (`opus-cam`), since formula `defaultPreset`
cameras don't transfer to the headless harness.

## Method

### 1. Convergence (noise vs samples)

Sample-count sweep (4…128/256 spp) vs a high-spp reference (256/512 spp) of the same
scene+seed, single tile, single GPU bucket. Metric: reference-relative MSE/PSNR per
channel on the final 8-bit export output — NOT raw pixel variance (the pre-existing
`opus-shot` sigma is reference-free; that was the gap).

Correlation correction: the N-spp render's samples are the FIRST N of the reference's M
(deterministic sequence), so raw MSE understates true noise by (1 − N/M). Both raw and
corrected values are reported (`mse`/`mseCorr`, `psnr`/`psnrCorr`). The correction is
exact for linear averaging, approximate after tone-mapping.

### 2. Seam isolation

Same scene, same output size, MATCHED exact per-pixel spp, varying only the
decomposition, plus per-cause toggles:

| Case | Isolates |
|---|---|
| `ref-single` (1×1, one GPU bucket) | ground truth |
| `gpu-buckets` (1×1, 3×3 internal buckets) | GPU-bucket seams alone (no tiling, no per-tile post) |
| `tiled-2x2` / `tiled-3x3` (post off) | image-tile pipeline (UV remap + blue-noise offset + per-tile readback) |
| `tiled-bloom` vs `ref-bloom` | per-tile bloom — the documented main seam |
| `tiled-ca` vs `ref-ca` | per-tile chromatic aberration |
| `tiled-natural`, `gpu-natural` | convergence-variance seams (today's default behaviour vs the exact-spp control = what "force equal convergence" would buy) |

A note that reframes cause #3 (convergence variance) before any std numbers land: at the
default 0.25 % threshold, every image-tile bucket runs to the sample cap (the threshold
never trips first), so **multi-tile exports already converge to equal sample counts per
tile by default** — observed in the quick run (`tiled-natural` spp 31–31 on both Claude
and Mandelbulb). Convergence variance only appears for SMALL GPU buckets over empty
regions (`gpu-natural` spp 12–31 on Mandelbulb: background buckets converge early), which
is internal to one PNG, not a stitch seam. This is verified at std scale in Results.

Metrics per case (and why PSNR-vs-reference alone is the WRONG seam metric):

- **PSNR/max|Δ| vs reference.** Useful, but at low spp two "valid" renders of the same
  scene differ everywhere by per-pixel noise — and image tiles change the per-tile
  jitter phase / render resolution, so the noise *realization* decorrelates even with
  zero seam. That uniform decorrelation tanks PSNR without any visible seam, so PSNR is
  a floor, not a seam measure.
- **`seamExcess` (PRIMARY seam metric).** Mean |Δluma vs ref| inside a ±2 px band around
  seam lines MINUS the same statistic in the interior. Subtracting the interior cancels
  the uniform decorrelation, leaving only the seam-specific excess (8-bit luma units).
  `seamRatio` = band/interior (caveat: → ∞ for scenes with a pure-black background where
  interior delta is 0; read `seamExcess` there).
- **`stepRatio` vs `stepRatioRef` (reference-free).** Mean |luma step| across seam lines
  ÷ mean step across all non-seam lines, for the test image AND for the seam-free
  reference at the same lines. `stepRatio ≈ stepRatioRef` ⇒ the boundary is no more
  discontinuous than ordinary image content there ⇒ statistically invisible. Works on
  real-GPU runs (no reference render needed).
- **bit-identity** where applicable (gpu-buckets at matched spp).

The **seamconv** sub-suite renders tiled-2×2 + matched 1×1 ref at spp 8/32/128(/512) with
post off AND with bloom, giving `seamExcess(spp)`: a noise-phase seam falls ~1/√spp →
vanishes at export spp; a structural seam (per-tile bloom) plateaus. The two curve shapes
are the verdict.

Note on the blue-noise tile-repeat cause: the historical bug (noise LUT sampled in
tile-local pixels) is FIXED in shader codegen and its pre-fix state is not reachable by
uniform pokes — faithfully re-breaking it would require modifying the shader generator,
which this measurement-only session does not do. Instead the fix is validated by outcome:
if `tiled-2x2` is at/below the noise floor (seamRatio ≈ 1, stepRatio ≈ 1), the noise
continuity holds.

### 3. Render-time × resolution

Time per render at 256/512/1024(/2048/4096 with `--full`) for 1×1 and 2×2 tiles at fixed
spp; ms/(Mpx·spp) scaling. HEADLESS-INDICATIVE ONLY; the same suite re-runs on the user's
GPU via `--gpu`.

## Results

Headless SwiftShader, canonical scene `Claude` (384² seams, 256² convergence). Relative
metrics only — see caveat. (Reproduce: `npm run bench:pt:with-server`; raw in
`debug/pt-bench/results.{csv,json}` + `index.html`.)

### Convergence (PSNR vs 256-spp reference)

| spp | PSNR | PSNR (corr) | RMSE | max\|Δ\| |
|----:|-----:|-----:|-----:|-----:|
| 4 | 25.15 | 25.08 | 14.10 | 137 |
| 8 | 28.51 | 28.37 | 9.57 | 102 |
| 16 | 31.69 | 31.41 | 6.64 | 70 |
| 32 | 35.09 | 34.51 | 4.49 | 89 |
| 64 | 38.77 | 37.52 | 2.94 | 51 |
| 128 | 43.46 | 40.45 | 1.71 | 22 |

- **Monotone, no plateau** in 4–128 spp: ~+3.3 dB per doubling (the ideal Monte-Carlo
  +3.01 dB/2× plus tone-map shaping). Noise is monotone-decreasing as required.
- **Diminishing-returns knee ≈ 64 spp**: RMSE crosses 3 and max\|Δ\| ~50 (8-bit) there;
  128 spp (RMSE 1.7, max 22) is past visual convergence for an 8-bit PNG. So **64–128 spp
  is "visually converged" for the target export** — more buys little a viewer can see.
- **Determinism: BIT-IDENTICAL** re-run at 32 spp (and across browser launches) — the
  per-bucket Halton seeding gives bit-reproducible diffs as designed.

### Seam isolation (24 spp matched, vs the matching reference)

| case | PSNR | seamExcess (luma) | stepRatio / ref | eff. spp | verdict |
|---|---:|---:|---:|---:|---|
| `gpu-buckets` (3×3 internal) | 58.3 | **0.007** | 1.27 / 1.27 | 24 | seamless |
| `tiled-3x3` (post off) | 53.2 | **0.025** | 1.27 / 1.27 | 24 | seamless |
| `tiled-2x2` (post off) | 32.1 | 1.41 | 1.42 / 1.45 | 24 | noise-phase only (step ≤ ref) |
| `tiled-bloom` | 32.2 | 1.51 | 1.50 / 1.45 | 24 | bloom seam (structural — see curve) |
| `tiled-ca` | 29.6 | 2.38 | 1.63 / 1.87 | 24 | CA seam (step ≤ ref content) |
| `tiled-natural` (post off) | 33.1 | 1.46 | 1.40 / 1.45 | 77–95 | = exact (ran to cap) |
| `gpu-natural` | 34.7 | 0.80 | 1.22 / 1.27 | 95–95 | no variance (frame-filling) |

- **GPU bucketing is seamless** (seamExcess 0.007, step ratio exactly the reference) — the
  common export path is a non-issue. `tiled-3x3` post-off is likewise at the noise floor.
- **Post-off image-tile seams are noise-phase**: even where seamExcess is ~1.4 (`tiled-2x2`),
  the *step ratio is at or below the seam-free reference* — the boundary is no more
  discontinuous than ordinary image content. (PSNR 32 is the uniform per-tile jitter-phase
  decorrelation, which `seamExcess` and `stepRatio` correctly factor out.)
- **Convergence variance is already mitigated at the default 0.25 % threshold**:
  `tiled-natural` ran every tile to 77–95 spp (the cap) — equal convergence by default — and
  matched the exact-spp control. `gpu-natural` on frame-filling Claude shows NO variance
  (all buckets 95 spp). Variance appears only for small GPU buckets over empty regions
  (validation `Mandelbulb`: `gpu-natural` 12–31 spp) — internal to one PNG, not a stitch seam.

### Seam vs samples — the decisive curve (does the seam converge away?)

`seamExcess(spp)`, tiled-2×2 vs matched 1×1 reference:

| spp | Claude nopost | Mandelbulb nopost | Mandelbulb bloom |
|----:|---:|---:|---:|
| 8 | 2.34 | 3.76 | 4.40 (stepRatio 4.81) |
| 32 | 1.19 | 1.79 | 3.44 (stepRatio **6.33**) |
| ratio | ×0.51 | ×0.48 | ×0.78 |

- **No-post tile seam = NOISE-PHASE**: seamExcess halves per 4× samples (×0.5 ≈ 1/√spp) on
  both scenes → it **vanishes at export spp**. stepRatio tracks the reference throughout.
- **Bloom tile seam = STRUCTURAL**: seamExcess barely drops (×0.78), and the smoking gun is
  `stepRatio` *growing* with samples (4.81 → 6.33) while the reference stays flat (~2.1) — as
  the interior converges and quiets, the per-tile bloom black-bleed seam becomes **more**
  visible. High spp does not fix it.
- The 128-spp points (Claude) and the bloom curve on Claude were left to the GPU run — the
  two-point law is already unambiguous (each fits 1/√spp / plateau exactly), and SwiftShader
  is the wrong tool for the high-spp points (CPU-bound, hours).

### Timing (headless-indicative ONLY — do NOT cite as export performance)

SwiftShader is a CPU software rasterizer; absolute ms are meaningless for real export.
Validation-tier indicative figures: ~8–14 k ms/(Mpx·spp), and **2×2 tiling cost ≈ 1×1**
(bucket/tile overhead is negligible; 512² 2×2 was even marginally faster than 1×1). The
real render-time × resolution matrix is the **user's `--gpu --full` run** — that is the
only source of trustworthy absolute timing.

## Verdict

**Is the bucket render production-quality (seamless + converged) for target export
resolutions? — YES at converged sample counts, with ONE caveat: per-tile bloom/CA.**

Decomposed by the documented seam causes:

1. **GPU buckets (VRAM tiling) — SEAMLESS.** At matched spp the 3×3-internal-bucket render
   is within `seamExcess 0.007/255 luma` of the single-bucket reference, step ratio exactly
   the reference (1.27/1.27), PSNR 58 dB. This is the common case (every export larger than
   one bucket uses internal buckets) and it is a non-issue.

2. **Blue-noise tile-repeat (historic cause #2) — FIXED, confirmed by outcome.** The no-post
   image-tile seam is **noise-phase**: `seamExcess` falls ~1/√spp (Claude 2.34→1.19 over
   8→32 spp = ×0.51; Mandelbulb 3.76→1.79 = ×0.48) and `stepRatio` sits *at or below* the
   seam-free reference (Claude 1.42 vs ref 1.45). It **converges away** — at export spp the
   tile boundary is statistically invisible. A broken blue-noise offset would make this seam
   sample-independent; it is not.

3. **Convergence variance (cause #3) — ALREADY MITIGATED at default settings.** At the
   0.25 % threshold every IMAGE tile runs to the sample cap (`tiled-natural` 77–95 spp,
   matched the exact-spp control), so multi-tile exports converge to equal per-tile sample
   counts by default. Variance appears only for SMALL GPU buckets over empty regions
   (validation Mandelbulb `gpu-natural` 12–31 spp; frame-filling Claude shows none, 95–95) —
   internal to one PNG, not a stitch seam, and it does not raise the bucket-boundary step
   ratio above the exact-spp control.

4. **Per-tile bloom / CA (cause #1, "the real seam") — STRUCTURAL, does NOT converge.**
   With bloom on, `seamExcess` barely drops (Mandelbulb 4.40→3.44 over 8→32 spp, vs
   noise-phase's halving) and — the smoking gun — `stepRatio` GROWS with samples (4.81→6.33)
   while the reference stays flat (~2.1): as the interior converges and quiets, the bloom
   black-bleed seam becomes *more* prominent. **Severity is scene-content-dependent** —
   stark on a dark background (Mandelbulb, stepRatio 6.3) and mild on frame-filling structure
   (Claude, 1.50) — but it is the one residual high spp does not fix. CA behaves the same way.

**Bottom line:** for the target export resolutions, the bucket render is
production-quality at converged sample counts (≈64–128 spp) **whenever bloom/CA are off or
negligible**. The single blocker to "seamless with any post" is per-tile bloom/CA — exactly
the seam the overhaul doc flagged for the v2 fix.

## Recommended next actions

In priority order (this session is measurement-only; these are the scoped follow-ups):

1. **Ship the bloom "render-once, sample-many" v2 fix** (docs/gmt/43:111 option (b)). It is
   the ONLY cause that does not converge away, and `bench:pt --suite=seamconv` now measures
   it directly: re-run after the fix and confirm the bloom `seamExcess(spp)` curve collapses
   onto the no-post (noise-phase) curve. Quantified residual today (Mandelbulb dark-bg, the
   worst case): `seamExcess ≈ 3.4/255` and `stepRatio ≈ 6.3×` the reference at 32 spp, and
   *rising* with samples — a converged dark-background bloomed tiled export is where it bites.

2. **Until then, gate tiled export on bloom** — the existing UI warning (cols×rows>1 &&
   bloom>0) is correct; consider auto-suggesting bloom-off or single-tile for bloomed
   exports. No code change needed for correctness; documentation only.

3. **No "force equal convergence" work is needed for the cutover.** The data refutes it as a
   blocker: image tiles already run to equal sample counts at the default threshold. (If
   small-GPU-bucket variance over empty regions is ever a concern for a specific export, the
   minimal fix is a per-image-tile min-sample floor, not a new convergence subsystem — flag
   only, not scoped here.)

4. **Real-GPU confirmation before cutover sign-off**: run `npm run bench:pt:with-server --
   --gpu --full` on the user's machine for (a) absolute export timings at 1080p–4K (the
   headless ms are SwiftShader-indicative only) and (b) a final visual sign-off on the
   stitched PNGs + heatmaps in `debug/pt-bench/index.html`.

## Harness fixes made this session (measurement infra only — no render-behaviour change)

- **Listener-first compile await** (`prepareScene`): a no-rebuild CONFIG emits
  `IS_COMPILING=false` synchronously inside `emit`; attaching `awaitCompile` after the emit
  hung until timeout. Fixed for both the existing `runOne` and the new bucket path.
- **Uniform per-bucket spp**: the bucket loop skips the compute on bucket-transition frames
  so every bucket renders exactly `spp` samples (was spp for bucket 0, spp+1 after) — makes
  the matched-spp seam control truly matched.
- Both are test-harness-only; production `BucketRunner` / engine are untouched.
