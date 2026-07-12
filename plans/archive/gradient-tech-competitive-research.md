# Gradient Technology — Competitive Research & Roadmap Input

**Date:** 2026-06-06
**Status:** Research complete. Verdicts are analyst recommendations; underlying claims verified (see Methodology).
**Context:** Benchmarks the GMT Gradient Explorer against the most advanced color-gradient
tech in high-end/paid software, to inform roadmap. Companion scoping doc:
[gradient-v1-additions-scope.md](gradient-v1-additions-scope.md).
Relates to the Gradient Explorer amendment plan + execution kit (`plans/execution/`).

---

## TL;DR

GMT already nails the hard part — OKLCh polar perceptual interpolation, CSS-Color-4-style
gamut-safe chroma clipping, multi-format pro export, and image→gradient extraction. The three
researched frontiers are **not catch-up work**; they split into one skip, one validation, and two
cheap wins.

| Frontier | Verdict | v1? |
|---|---|---|
| **1. 2D / mesh / freeform gradients** | Different product, not a feature port | ❌ Deferred indefinitely (possibly in scope later; not v1) |
| **2. Curve & stop models** | Our architecture is industry-standard & validated | ✅ One gap to close: richer per-segment interpolation bases |
| **3a. ColorBox per-channel easing** | Cheap, high-synergy generation mode | ✅ Adopt (port in OKLCh, not HSV) |
| **3b. Leonardo contrast-target ramps** | Cheap, niche differentiator | 🟡 Optional (UI/data-viz export, not fractal-core) |
| **3c. Colorgorical categorical palettes** | Different goal (discrete swatches) | ❌ Skip unless adding a categorical generator |
| **3d. ML palette gen (Huemint / Palette2Image)** | Novel but heavy & divergent | ❌ Not requested / not relevant |

---

## Frontier 1 — 2D / Mesh / Freeform Gradients → **DEFER (not v1)**

**What the best tech does.** Two rendering families dominate:

- **Analytic per-pixel inverse-bilinear** (meshgradient.com, Burak Aslan). Fragment shader defines
  4 corner control points, recovers patch coords `(u,t)` per pixel by solving a quadratic
  `A·u² + B·u + C = 0` whose coefficients are 2D cross-products of corner geometry
  (`A = S.x*R.y − R.x*S.y`, …, with an `abs(A) < 0.0001` linear fallback), then bilinearly mixes
  4 corner colors. Runs on a single quad, **no tessellation**. Matches the canonical bilinear-patch
  inversion (Quilez `ibilinear`, Nathan Reed's quadrilateral-interpolation derivation).
- **Coons/tensor-patch subdivision** (Illustrator, SVG2 mesh, Inkscape). Grid of cubic-Bézier curves
  forming Coons patches; recursive De Casteljau subdivision while interpolating new corner colors;
  rasterize at ~1px sub-patches.

**The one real quality insight (transferable):** naive Coons patches with **linear** color
interpolation are only **C0** (value-continuous), not C1 — color *derivatives* jump across shared
edges, producing visible **Mach-band "bright lines"** and "star" artifacts at patch corners.
Illustrator's fix is **cubic** color interpolation + **mirroring control values** across boundaries
(`rc(v) = 2·bc(v) − lc(v)`, analogous to SVG smooth-curve S/T reflection).

**Freeform Gradients (Illustrator 2019)** are a third thing: arbitrary 2D color *nodes* (points or
lines) fed through a **diffusion** model — not a bent grid. Exact algorithm is proprietary/unpublished.

**Verdict.** All of this produces a 2D color *field* that needs 2D authoring coordinates. GMT's
output is a 1D ramp → 256×8-bit LUT → fractal shader, which has no 2D gradient-space to author
against. This is a separate product surface, not a feature port. The only transferable lesson
(C1/derivative continuity) is already effectively covered by our smooth/cubic 1D interpolation modes.
**Decision: defer indefinitely.** The *only* context that would justify building it is a deliberate
2D authoring surface (e.g. tied to mesh-export / texture-baking) — an open product question, not a v1 item.

**Sources:** meshgradient shader (gist mirror), W3C CSSWG #7648, jaspervdg mesh-transitions,
tkalmi.dev mesh-gradient-generator, Quilez ibilinear.

---

## Frontier 2 — Curve & Stop Models → **VALIDATED + one gap to close**

**What the pros do.**

- **Houdini ramps:** 7 interpolation bases — Constant, Linear, Catmull-Rom, **Monotone-Cubic**,
  Bézier, B-spline, Hermite — settable **per-segment OR globally**. SideFX officially *recommends
  setting interpolation globally*.
- **Blender Color Ramp:** a **single global** Color Interpolation mode (B-Spline / Cardinal / Linear
  / Ease / Constant) + a Color Mode selector (RGB vs HSV/HSL — HSV/HSL mixing maintains saturation
  across hues that RGB would desaturate). Each stop carries **only position + color (+alpha)** — **no
  per-stop Bézier handles**.
- **Nuke ColorLookup:** per-channel input→output transfer curve (horizontal = input, vertical =
  output) with points + tangent handles, plus a master curve ganging all channels — the canonical
  per-channel curve-overlay paradigm.

**Key takeaway.** Across these flagship tools, **none attaches per-stop Bézier color handles to
gradient stops.** They use either (a) a global/per-segment interpolation *mode*, or (b) per-channel
overlay curves — which is **exactly GMT's model** (per-channel L/C/h overlay curves + per-stop bias +
per-segment linear/step/smooth/cubic). Our architecture choice is the industry-standard, higher-
quality one — confirmed, not a compromise.

**The gap.** Our per-segment `interpolation` field already exists (`linear|step|smooth|cubic`), so
we're not stuck on a single global mode. What's missing is the richer **spline bases** — especially
**monotone-cubic** (guaranteed *no overshoot*, which matters for perceptual ramps where an overshoot
pushes a color out of gamut), and optionally Catmull-Rom / B-spline. **Decision: add these (v1).**
Scoped in the companion doc.

**Sources:** sidefx.com/docs ramps + `hou.rampBasis`, Blender Color Ramp manual,
Foundry Nuke ColorLookup reference.

---

## Frontier 3 — Generation & Harmony Engines → **two cheap wins**

### 3a. Lyft ColorBox → **ADOPT (port in OKLCh)**
Generates a palette by interpolating each channel **independently** across N steps, each channel
driven by its own **easing curve** (params per channel: `start`, `end`, `curve`, plus `rate` for
saturation), built via `chroma.hsv()`. Supports 25 named easings (easeIn/Out/InOut × Quad/Quart/Sine/
Cubic/Expo/Quint/Circ/Back + linear).

**Verdict.** Small, open-source-documented algorithm that maps perfectly onto a 1D ramp generator and
onto GMT's existing per-channel L/C/h thinking. **Port it in OKLCh instead of Lyft's HSV — strictly
better** than their own implementation. Highest effort:value ratio in the whole report.

### 3b. Adobe Leonardo → **OPTIONAL (niche)**
Inverts the workflow: `generateContrastColors()` takes target **WCAG contrast ratios as the input**
(`new Color({ colorKeys:[…], ratios:[3, 4.5] })`) and generates colors meeting them — contrast is the
starting point, not an after-the-fact check.

**Verdict.** Cheap, differentiated, but accessibility matters less for fractal aesthetics than for
UI/data-viz. Worth it only as a *palette-export* mode, not fractal-core.
⚠️ **Unverified:** Leonardo's exact interpolation color space — a claim that it offers a fixed set
(LCH/LAB/CAM02/HSL/HSLuv/HSV/RGB, *not* OKLCh) was **refuted** in verification, so don't assume any
particular space; the contrast-ratio-as-input mechanism itself is solidly confirmed.

### 3c. Colorgorical → **SKIP**
Research-grade *categorical* palette generator (Gramazio et al., IEEE TVCG 2016): iterative
semi-random sampling from a discretized D65 CIELAB space (8,325 colors), scored by Perceptual Distance
(**CIEDE2000**, not Euclidean) + Name Difference + Name Uniqueness + Pair Preference, with JND
filtering, L∈[25,85] clamp, and the disliked dark-yellow region removed.

**Verdict.** Targets *discriminable distinct swatches* (chart colors) — a different goal from a
continuous fractal ramp, where our perceptual interpolation already subsumes most of it. Skip unless
we add a dedicated categorical-swatch generator.

### 3d. ML palette generation (2024-2025) → **NOT PURSUING**
Genuinely novel frontier, flagged for completeness:
- **Huemint** ships three models — an encoder-decoder transformer (4096-token K-means codebook,
  top-p sampling), a **DDPM** (adapted from OpenAI Improved DDPM, category/adjacency embeddings,
  early-stop diversity control), and a non-ML random baseline — all trained on ~1.2M design images
  curated to remove photos/gradients.
- **Palette2Image** (CyberAgent, ACM MM 2025, arXiv 2508.08754): diffusion method using an extracted
  palette as a *separate conditioning signal* (learned palette embeddings fused with CLIP text
  embeddings via cross-attention) to control whole-image color schemes.

**Verdict.** Real, current, primary-sourced — but Huemint makes discrete *palettes* (not continuous
ramps) and needs a trained transformer/diffusion model + curated million-image dataset; Palette2Image
is palette→*image*, orthogonal to our image→gradient direction. Heavy infra for marginal benefit over
our algorithmic + OKLCh pipeline. Realistic path *if ever* wanted: an optional cloud/API "AI palette
suggest" mode, never in-shader. **Not requested — dropped.**

**Sources:** github.com/lyft/coloralgorithm, github.com/adobe/leonardo, Colorgorical paper
(vrl.cs.brown.edu) + repo, huemint.com/about, github.com/CyberAgentAILab/Palette2Image, arXiv 2508.08754.

---

## Roadmap decisions (from this research)

**In for v1:**
1. **ColorBox-style per-channel easing generator mode, in OKLCh** — high synergy, small add.
2. **Richer per-segment interpolation bases** — monotone-cubic (no-overshoot) first; Catmull-Rom /
   B-spline if cheap.

**Optional / later:**
- Leonardo contrast-target generator as a palette-*export* mode.

**Deferred / out:**
- 2D / mesh / freeform authoring (possibly in scope eventually; **not v1**).
- Colorgorical categorical generator (only if a distinct-swatch use case appears).
- ML palette generation (not requested / not relevant).

---

## Open questions

1. **2D demand:** Is there any real demand for a 2D/freeform authoring surface (e.g. for the
   mesh-export / texture-baking path)? That's the only context that makes Frontier-1 worth building.
2. **Learned image→palette extraction:** Does any ML extractor measurably beat our
   saliency-k-means + tone-spine + path-trace on *fractal* source images (synthetic, high-frequency,
   non-photographic)? No source benchmarked this — only an empirical A/B would settle it.
3. **Leonardo color space:** Exact interpolation space is unverified (claim refuted). Would a
   Leonardo-style contrast-target generator in OKLCh produce smoother accessible ramps than
   Leonardo's own spaces?

---

## Methodology & caveats

Deep-research harness: 5 search angles → 23 sources fetched → 77 claims extracted → top 25 verified
by 3-vote adversarial verification (need 2/3 to kill). **24 confirmed, 1 killed.** Frontiers 1 & 3
rest almost entirely on primary sources (vendor docs, official repos, peer-reviewed papers, the actual
meshgradient.com shader); Frontier-1 C1-continuity claims lean partly on technical blogs (jaspervdg,
tkalmi.dev) but are corroborated by SVG WG materials and canonical derivations.

**Caveats:**
- ML claims (Huemint, Palette2Image) describe what developers say their systems do; quality-vs-
  algorithmic superiority **for fractal ramps specifically was not independently benchmarked**.
- The meshgradient.com shader claims come from a third-party gist mirror, though the code matches
  independent canonical derivations.
- One Leonardo color-space claim was **refuted** and excluded — exact space remains unverified.
- "Worth porting" verdicts are analyst judgments grounded in the 1D-LUT shader-output constraint, not
  claims that survived voting — treat as recommendations, not verified facts.
- Illustrator Gradient Mesh and Freeform Gradient internals are proprietary; the freeform diffusion
  model is described only conceptually.
