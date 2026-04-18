# GLSL Shader Testing Suite

Autonomous verification harness for GMT shaders. Compiles formulas through the **real engine `ShaderFactory` path** in headless Chromium, samples the DE at 64 deterministic positions, renders thumbnails, and reports per-gate pass/fail. Usable far beyond the Fragmentarium importer — any shader source that plugs into a `FractalDefinition` can be verified.

## What it tests (gates)

| Gate | Check |
|---|---|
| `parse` | Skipped (disabled — false-positives on real 67KB engine shaders) |
| `webglCompile` | Real WebGL2 compile + link of the full engine shader |
| `sampleShaderCompile` | Compile of the sample-point eval shader (lightweight scaffold) |
| `sampleFinite` | ≥56/64 DE samples are finite non-NaN |
| `sampleNonConstant` | Distance range > 1e-3 across samples (rejects constant DEs) |
| `gradientFinite` | ≥48/64 samples have Lipschitz-reasonable numerical gradient |
| `renderNonDegenerate` | 64×64 thumbnail has σ ≥ 4 on any RGB channel AND ≤30% NaN pixels (orange) |

Full spec + thresholds: [26_Formula_Workshop_V4_Plan.md §9 A.1](26_Formula_Workshop_V4_Plan.md).

## Commands

### Run the corpus

```bash
# V4 pipeline (default), all formulas, ~350s
npx tsx debug/v4-verify.mts --pipeline=v4 --fresh

# V3 pipeline (legacy)
npx tsx debug/v4-verify.mts --pipeline=v3 --fresh

# Filter by name
npx tsx debug/v4-verify.mts Mandelbox --pipeline=v4 --fresh

# Single formula
npx tsx debug/v4-verify.mts --single mrange_mandelbox --pipeline=v4 --fresh

# Resume an interrupted run (append to existing jsonl)
npx tsx debug/v4-verify.mts --pipeline=v4           # no --fresh

# Timeout (default 10s per formula)
npx tsx debug/v4-verify.mts --pipeline=v4 --timeout=30000

# Show browser (non-headless) for debugging
npx tsx debug/v4-verify.mts --pipeline=v4 --show

# Verbose: stream browser console + per-failure error details
npx tsx debug/v4-verify.mts --pipeline=v4 --verbose
```

Outputs: `debug/v4-verify-results.jsonl` + `debug/thumbnails/<hash>.png`. Exit code non-zero if any failures.

### Live monitor (second terminal during a corpus run)

```bash
npx tsx debug/v4-monitor.mts
# opens http://localhost:3344 — auto-refreshing stats, ETA, recent failures, thumbnails
```

### Compare two runs

```bash
npx tsx debug/v4-bakeoff.mts         # current results vs checked-in baseline
npx tsx debug/v4-bakeoff.mts --all   # full regression/improvement lists
```

Baselines in `debug/v4-expected-passing.txt` (updatable) and `debug/v3-baseline-passing.txt` (frozen V3 reference).

### CI regression check

```bash
npx tsx debug/v4-diff-baseline.mts   # exit 0 clean, exit 1 if regressions vs v4-expected-passing.txt
npx tsx debug/v4-diff-baseline.mts --update-baseline   # commit current as new baseline
```

### Regenerate the passing-formulas library

```bash
npx tsx debug/build-v4-passing.mts   # reads v4-verify-results.jsonl → passing-formulas.ts
```

### Native formula compile sweeps (compile-only)

Three complementary tests run each native formula through the real `ShaderFactory` under a different engine-feature configuration:

| npm script | What it tests | Scale | Time |
|---|---|---|---|
| `npm run test:baseline`   | Every formula compiles with all features at defaults (no interlace, no hybrid box) | 42 formulas | ~8s |
| `npm run test:hybrid`     | Every formula + `hybridCompiled=true`, `hybridComplex=false` | 42 formulas | ~12s |
| `npm run test:hybrid-adv` | Every formula + `hybridCompiled=true`, `hybridComplex=true` (interleaved mode) | 42 formulas | ~13s |
| `npm run test:interlace`  | Every primary × secondary pair with interlacing enabled | 1600 pairs | ~100s |
| `npm run test:shader`     | All four tests in sequence | 1726 total cases | ~2.5 min |

These are **compile-only** checks — they catch GLSL errors, namespace collisions, missing uniform declarations, and rewriter bugs, but do not actually render anything.

### Full-engine render sweep (NEW)

`npm run test:render` runs the **real Three.js + FractalEngine pipeline** against each formula — not just a compile check. Boots the actual engine in headless Chromium (via the Vite dev server at `/render-harness.html`), positions the camera at each formula's `defaultPreset`, compiles + renders frames through the full pipeline (post-process, tone map, sRGB), and captures a PNG snapshot.

| npm script | Scope | Time | Output |
|---|---|---|---|
| `npm run test:render` | 42 native formulas, baseline mode only | ~3-5 min | `debug/render-sweep-phase1.jsonl` + `debug/thumbnails/render/<formula>__baseline.png` |
| `npm run test:render:matrix` | HTML grid view of the latest sweep | instant | `debug/render-matrix-phase1.html` |
| `npm run test:render:perf` | Perf subset — 10 formulas with warmup + FPS measurement (Phase 3, not built yet) | TBD | `debug/render-sweep-phase3.jsonl` |

**Prerequisite:** `npm run dev` must be running in another terminal. The sweep checks reachability at `http://localhost:3001/render-harness.html` and fails fast with a clear message if unreachable.

**Per-case measurements:**
- `compile.totalMs` — wall time from `CONFIG` emit to `IS_COMPILING=false` event
- `compile.logPreviewMs` / `compile.logGpuMs` — parsed from engine's `[Compile] Two-stage` console log (when available)
- `render.sigma` — per-channel σ of the thumbnail, for spotting blank/uniform output
- `render.nonBlackFraction` — % of pixels with R|G|B > 3 (rough fractal-visibility gauge)
- `render.nanFraction` — % of pixels matching the NaN orange sentinel

**What's currently tested:** baseline only (each formula with all features at defaults). The `hybrid`/`hybrid-adv`/`interlace` modes are wired up in `render-cases.ts` but commented out pending parameter-preset work — the default overrides produce scrambled renders because the param values aren't formula-tuned. The compile-only sweeps above still cover those paths at the GLSL level.

**Render harness files:**
- [render-harness.html](../render-harness.html) — served by Vite dev server at project root, not user-facing
- [debug/render-harness.ts](../debug/render-harness.ts) — browser-side driver (boots `FractalEngine`, exposes `window.runRenderTest(spec)`)
- [debug/render-cases.ts](../debug/render-cases.ts) — test case definitions
- [debug/render-sweep.mts](../debug/render-sweep.mts) — Playwright driver

### Native formula interlace sweep (detail)

Every eligible native formula (42 of 45 — Modular and the two `selfContainedSDE` formulas are excluded) compiled against every eligible secondary formula, through the real `ShaderFactory` with `interlace.interlaceCompiled=true`. Catches GLSL namespace collisions, missing uniform declarations, and numerical breakage in the hybrid loop across the full N×N combination space.

```bash
# Full sweep (~1600 pairs, ~100s) — use this as a regression check after any
# change to the interlace rewriter, feature uniforms, or formula preambles.
npm run test:interlace

# Render the pass/fail matrix as HTML (after a run)
npm run test:interlace:matrix

# Live dashboard (separate terminal, watches the jsonl as the sweep runs)
npm run test:interlace:watch
```

Lower-level invocations for debugging a specific pair/row:

```bash
# One row (one primary × all secondaries)
npx tsx debug/native-interlace-sweep.mts --primary=Mandelbulb --fresh

# One cell (single pair)
npx tsx debug/native-interlace-sweep.mts --pair=Mandelbulb,AmazingBox --fresh

# Drop identity pairs (primary == secondary)
npx tsx debug/native-interlace-sweep.mts --skip-self --fresh
```

**Regression behavior:** the sweep exits with code 1 if any pair fails to compile, so it can wire straight into CI or pre-push hooks without a separate diff step. Baseline is implicit — 1600/1600 currently compile cleanly, so any regression is a real failure (not an allowlisted one).

Outputs: `debug/native-interlace-sweep.jsonl` + `debug/thumbnails/interlace/*.png`. Resume-capable (no `--fresh` = append only untested pairs).

Render the pass/fail matrix:

```bash
npx tsx debug/native-interlace-matrix.mts              # compact color grid
npx tsx debug/native-interlace-matrix.mts --thumbs     # cells = rendered thumbnails
# opens debug/native-interlace-matrix.html
```

Gate semantics: `webglCompile` is the **only** hard gate. The engine's `map()` depends on a wide spread of runtime state (camera, scene offset, lighting, feature toggles) that the validator doesn't fully supply, so numeric DE-sample checks in this harness are noisy and unreliable. The compile gate alone catches what this sweep exists to find: GLSL namespace collisions and missing uniform declarations introduced by the interlace rewriter across primary × secondary pair combinations.

What's recorded per pair but NOT gated: thumbnail σ, NaN fraction (for visual browsing in the matrix).

**On thumbnail quality (important):** there's a hard architectural split in what the validator can render.

- **Self-contained formulas** (`shader.selfContainedSDE: true`, plus all frag imports V4-processed) produce varied, recognizable thumbnails — their DE function owns its own iteration loop internally, so it works correctly regardless of external engine state. v4-verify's nice-looking frag-import thumbnails are all in this category (verified: every passing row in `debug/v4-verify-results.jsonl` has `mode: v4-self-contained`).
- **Per-iteration formulas** (the default shape for native formulas — loopBody runs once per engine iteration, with `getDist` called after the outer loop completes) produce degenerate constant-valued thumbnails. The engine's outer iteration loop depends on a wide surface of runtime state (bailout thresholds, color-iter snapshots, precision offsets, feature injection, iteration counters) that cascades in ways the validator can't replicate with just a uniform dict. Setting uniforms to any combination tested — per-formula defaults, v4-verify's generic defaults, camera positions from the app's preset — does not save this.

Of 42 eligible natives, only 2 are `selfContainedSDE` (`JuliaMorph`, `MandelTerrain`) and another ~5 (some polyhedra) happen to produce varied DE through incidental math. The other ~35 per-iter natives render as uniform-colored tiles in the thumbnail grid. **This is not a preview-shader bug** — sphere-tracing, fixed-step raymarching, and DE-slice visualization all produce the same result because `map()` itself returns a constant.

Don't treat this as a task to fix by tweaking the preview shader. The fix, if ever needed, would be to run the test through the real in-app render pipeline (Three.js + worker + full uniform set) rather than a headless validator. Until then, thumbnails are supplementary inspection for the self-contained subset; the compile gate is what catches regressions, and it's solid.

## Architecture

- **Driver** ([debug/v4-verify.mts](../debug/v4-verify.mts)) — Node + Playwright. For each formula: runs the V3 or V4 pipeline to get a `FractalDefinition`, registers it in the real engine's `FractalRegistry`, builds the shader via `ShaderFactory.generateFragmentShader()` with a full per-feature config, ships it to the browser.
- **Harness page** ([debug/validator.html](../debug/validator.html)) — single WebGL2 context, two FBOs (4×4 for samples, 64×64 via default canvas for thumbnail). Exposes `window.runValidation({compileShader, sampleShader, uniforms})`.
- **Pipeline dispatch** — `--pipeline=v4` routes through `v4.processFormula`; `--pipeline=v3` uses `detectFormulaV3 + transformFormulaV3 + buildAndRegister`. Both converge to `ShaderFactory` for the real compile.

## Using the suite outside the importer

Any shader source that can produce a `FractalDefinition` can be tested:

1. Construct a `FractalDefinition` (or derive from a V3/V4 pipeline)
2. `registry.register(def)` on the main-thread registry
3. Build a config via `buildFullShaderConfig(def.id)` helper in [v4-verify.mts](../debug/v4-verify.mts) (mirrors `FractalEngine`'s feature init)
4. Call `ShaderFactory.generateFragmentShader(config)` → GLSL string
5. Ship to `validator.html` via Playwright, run gates

Use cases beyond the importer:
- Regression-check native formulas after engine changes (recompile all 42 `formulas/*.ts` via the harness; diff against baseline)
- Verify new GLSL chunks in `shaders/chunks/` don't break existing formulas
- Stress-test new engine features (e.g. a new coloring mode) across the full formula corpus
- Detect numerical regressions in precision-mode changes

## Harness honesty — what was learned

The V4 session discovered the harness was lying by using a **simplified WebGL scaffold** instead of the real engine shader. Specifically:

- scaffold had `g_orbitTrap` pre-declared at global scope; engine declares it mid-preamble via the `coloring` feature
- scaffold auto-injected `#version 300 es` and `vUv`; engine relies on Three.js to add those
- scaffold didn't include the engine's `vec4 DE(vec3)` coloring wrapper; user's `DE` names collided
- scaffold didn't enforce the `coreMath`/feature structure of `defaultPreset` the UI needs

The current harness uses the real `ShaderFactory` path. Any new test scenario you add should also go through `ShaderFactory`, not a custom scaffold. If you need a different main() (e.g. for numerical probing), replace only `main()` in the ShaderFactory output, don't rewrite the whole shader.

## Structural analysis tools

- [debug/v4-analyze-per-iter.mts](../debug/v4-analyze-per-iter.mts) — counts how many corpus formulas have DE shapes amenable to per-iteration emission (simple loop, no pre/post-loop mutations). Useful for architectural decisions, not pass/fail.

## Files map

| File | Role |
|---|---|
| [debug/v4-verify.mts](../debug/v4-verify.mts) | Playwright driver, pipeline dispatcher |
| [debug/validator.html](../debug/validator.html) | Browser-side WebGL2 harness, `window.runValidation()` |
| [debug/v4-monitor.mts](../debug/v4-monitor.mts) | Live dashboard (port 3344) |
| [debug/v4-bakeoff.mts](../debug/v4-bakeoff.mts) | Compare run vs baseline, 2×2 matrix |
| [debug/v4-diff-baseline.mts](../debug/v4-diff-baseline.mts) | CI regression check |
| [debug/build-v4-passing.mts](../debug/build-v4-passing.mts) | Regenerate `passing-formulas.ts` |
| [debug/v4-analyze-per-iter.mts](../debug/v4-analyze-per-iter.mts) | Structural eligibility analysis |
| [debug/test-v4-*.mts](../debug/) | Per-stage unit smoke tests |
| `debug/v4-verify-results.jsonl` | Latest run output, one row per formula |
| `debug/thumbnails/<hash>.png` | Rendered thumbnails |
| `debug/v4-expected-passing.txt` | Updatable regression baseline |
| `debug/v3-baseline-passing.txt` | Frozen V3 reference |

## Performance

- Single formula: ~300–800ms (compile + sample + render)
- Full corpus: ~5–10 min depending on CPU
- Per-formula timeout: 10s default, configurable

## Dependencies

- `playwright` (dev) — headless Chromium for WebGL2
- `@shaderfrog/glsl-parser` (already a dep) — for the now-disabled parse gate; can be removed if gate stays disabled
- Node 18+

## Suggestions

Per-session improvement notes. Append new sections at the end; keep prior notes as history.

### From the V4 build session (2026-04-17)

Things the harness would benefit from, ranked by pain-point I actually hit:

1. **Failure-thumbnail diffing.** When a formula regresses between two runs, seeing the before/after thumbnails side-by-side would be faster than reading jsonl. Add `v4-bakeoff.mts --thumbnails` that renders a two-column HTML page: V3 pass thumbnail vs V4 fail thumbnail (or vice versa). Debugging 80 regressions in text form is slow.

2. **Error-cluster auto-grouping.** The current `v4-bakeoff.mts --regressions` lists formulas flat. A small `v4-cluster-errors.mts` that groups `webglCompile` failures by the first `ERROR:` line prefix would turn "80 regressions" into "5 distinct error patterns with N formulas each" — much more actionable.

3. **Per-gate-only re-runs.** If I fix a rename bug, I only need to re-run `webglCompile`. A `--resume-from-gate=webglCompile` flag that reuses prior sample/gradient results and only re-runs the compile check would save 60–70% of wall time for iterative debugging.

4. **Worker-path parity check.** The harness runs `ShaderFactory` on the main thread. The app runs it on the worker. If they diverged (e.g. different extensions, different precision fallbacks), the harness would pass things that still break in-app. A periodic "run N formulas through the actual worker and diff the compiled shader text" would catch this.

5. **Per-feature-toggle sweeps.** Take one representative formula, compile it N times with each engine feature toggled on/off, assert no regressions. This would have caught the interlace/fold/burning silent breakage in V4 self-contained much earlier. ~30 min to write, huge safety net.

6. **Honest-harness enforcement.** The simplified-scaffold deception in this session came from a shortcut that "felt fine at the time." Add a `debug/harness-self-test.mts` that verifies the compile path uses `ShaderFactory` (grep the compiled shader for the engine's `#define MAX_LIGHTS` or similar unambiguous marker) and fails CI if the harness ever drifts back to a fake scaffold.

7. **Native-formula regression mode.** The suite currently runs imports. Add `--native` that iterates `formulas/*.ts` through the same gates — so engine-side changes can be regression-checked against the 42 curated formulas immediately.

8. **Thumbnail comparison key.** Currently thumbnail hue encodes state (orange=NaN, blue=exterior, green=interior). The monitor page should have a small legend. Took me longer than it should have to realise "mostly red/orange means the DE is NaNing."

### From the AI-skill direction discussion (2026-04-17)

9. **Skill-invocable single-formula verification.** The Claude skill (forward plan §3) will want to verify a candidate `.ts` conversion before saving. Expose a minimal `verifyFormula(def: FractalDefinition): VerificationResult` function from the harness core that a skill can call directly (without Playwright spin-up) for fast iteration. Could route through ShaderFactory + a node-side GLSL parse as a cheap proxy for compile; then final gate via real harness before commit.

### From the native-interlace sweep session (2026-04-18)

Built `native-interlace-sweep.mts` (see section above). Surfaced three concrete lessons:

10. **Render-σ is not a correctness gate.** Shipping the full engine shader (raymarch `main()`) to a validator that doesn't supply camera/lighting/history uniforms produces thumbnails that *often* look varied enough to pass a σ>4 threshold, but the varied output is incidental — it comes from WebGL zero-defaults hitting the bounding volume in some ray direction, NaN blotches, or formula-internal color logic — not from a correctly-rendered fractal. The same applies to `v4-verify.mts`'s `renderNonDegenerate` gate: it's a "shader produced something non-black" smoke test, not a "shader rendered the fractal" check. Treat those passing thumbnails as weak positive evidence, not proof of correctness.

11. **Numerically probing `map()` in a headless harness is unreliable too.** We tried swapping the engine's `main()` for a DE-slice preview that calls `map(p)` directly (the doc explicitly recommends this pattern). Compiles fine, but `map()` returns values that differ from an inlined-reference implementation — the engine's `map()` depends on a broad uniform surface (scene offset, color mode, interlace state, feature flags) we don't fully replicate. A value-based gate built on this is noisy. For interlace specifically: use `webglCompile` as the single hard gate. That's sufficient to catch the bugs this test exists to find (GLSL namespace collisions, missing uniform declarations, rewriter variable-prefix gaps). Save numeric DE validation for a path that actually runs inside the engine, not a lookalike.

12. **Sweep findings on first honest run (208 fails / 1600 pairs, 3 root causes):**
    - `uInterlaceVec4A` undeclared (118 pairs): the interlace rewriter emits `uInterlaceVec4A/B/C` references, but the interlace feature only declares `interlaceVec2A/B/C` and `interlaceVec3A/B/C` params. Formulas with `type: 'vec4'` params (KleinianJos, KleinianMobius, PseudoKleinian06) can't be secondary.
    - Phoenix's `z_prev`/`dr_prev` preamble vars not prefixed (39 pairs): the rewriter's preambleVars-prefix pass misses vars declared in the formula's custom preamble. Same class hits Bristorbrot's `rotX` (39 pairs).
    - Identity-pair function redefinitions (12 pairs): when primary == secondary, the rewriter generates the same prefix for both, producing duplicate definitions of helper functions (`planeToBulb`, `claude_Phi`, etc.). Either skip identity pairs (`--skip-self`) or collision-suffix the secondary prefix when it would match the primary's.

    All three are pure interlace-feature bugs — the app handles these formulas correctly as primary. Fixing them is tracked as follow-up work.