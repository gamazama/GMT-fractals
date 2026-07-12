# Handoff — Fractal color / accumulation / iteration audit + redesign (GX + fluid-toy)

> Paste the **"PROMPT FOR NEXT SESSION"** block at the bottom to start. The rest is reference.

## One-line mission
Audit how **accumulation (TSAA)**, **iteration count**, and **colour mapping** work across BOTH the Gradient Explorer fractal viewer (`FractalColorRenderer`) and fluid-toy (`FluidEngine`), then converge on **one correct, performant, comfortable** design — especially for deep zoom, where most colour modes currently look flat/noisy and the Repetition control needs absurd values (0.0001 for Iterations, 500+ for Stripe).

Priorities, in order: **correctness → performance → comfortable interaction.**

## Why now / symptoms (user-reported)
1. **Blocky / non-smooth background iteration updates** at deep zoom — converged tiles look chunky while the image refines. (Partly mitigated this session — see "Already done" #1 — but the TSAA refinement cadence itself should be reviewed.)
2. **Colour modes break at deep zoom.** Only two look good: **Iterations** (needs Repetition ≈ 0.0001) and **Stripe** (needs Repetition ≈ 500+). Every other mode goes **flat or pure noise** as you dive.
3. **Repetition is unusable across zoom** — the sane value swings ~7 orders of magnitude between modes/depths. Strongly suggests the per-mode colour scalar is **not depth-normalized** (needs logarithmic / zoom-aware normalization so Repetition ≈ 1 is sane everywhere).

## The key architectural fact
GX and fluid-toy **share the GPU kernel and the colour-mapping math**:
- `engine/fractal/shaders/fractalKernel.ts` — the iteration kernel (FRAG_JULIA). fluid-toy imports it via the shim `fluid-toy/fluid/shaders/julia.ts`.
- `engine/fractal/shaders/gradientSample.ts` → **`colorMappingT(j, aux)`** — THE per-mode scalar→gradient-t function. **This is the root of symptoms #2/#3.** e.g. mode 0 Iterations = `j.b * 0.05` (raw smooth-iter × fixed 0.05 — not depth-normalized), mode 9 Stripe = `aux.g`, traps = `1 - clamp(aux.r * k, 0, 1)`, potential = `fract(log2(log2(r2))*0.5)`. Fixing/normalizing here fixes BOTH apps at once.
- `engine/fractal/iterationPolicy.ts` — shared iteration policy (created this session). Single source of truth for shallow auto-iter + deep build/cap.

What is **NOT** shared (must be handled per-renderer):
- **TSAA / accumulation**: GX `FractalColorRenderer.render()` (its own TSAA_CAP, hash, jitter) vs fluid-toy `FluidEngine.renderJulia()/runTsaaBlend()/updateTsaaHash()`. These diverged; symptom #1 lives here.

## Already done this session (do NOT redo — build on it)
1. **Deep-pan accumulation reset** — `FluidEngine.updateTsaaHash()` now includes `centerLow` (`cL:`), so deep-zoom pans (which accumulate into the sub-f64 lo word) invalidate the accumulator. Was the cause of "pan-rmb not resetting accumulation" + a chunk of the blocky deep tiles.
2. **Auto-iterations** ported to the shared `iterationPolicy.ts`; GX refactored onto it (value-identical). fluid-toy: `deepZoom.autoIter` (default on) + `deepZoom.iterMul` ("Iteration ×" multiplier); `FluidEngine.effectiveMaxIter()` decides the cap (shallow `autoShallowIter(zoom,iterMul)`, deep = reference-orbit length). `syncDeepZoomToEngine` no longer fights over `maxIter`.
3. **uColorIter parity** — fluid-toy now binds `uColorIter = effectiveMaxIter` when autoIter on (GX binds `uColorIter = uMaxIter`); was starving trap/stripe/DE modes at the fixed 310 cap so iterMul had no effect on them.
4. **Copy-coords button** — bottom-left HUD in fluid-toy (`components/CoordsButton.tsx`), mirrors GX's. Dumps center/centerLow/zoom/juliaC/kind/power/colorMapping/repeat/phase/autoIter/iterMul/deepStats to clipboard+console. **Use it to capture the exact spots where modes break.** (No paste-back importer yet — a nice-to-have: reuse the GX→ft handoff `loadPreset` path in `fluid-toy/main.tsx`.)

All gates green: `tsc`, `smoke:fluid-toy`, `smoke:deep-zoom-orbit`, `smoke:deep-zoom-nucleus`.

## Memory + context to load FIRST (cheaply)
- Run the context-loading protocol before bulk-reading: `npm run context:map` / `npm run context:cost` (see memory `project_context_loading_protocol.md`, policy in `docs/policy/`). Build a cheapest-load plan; don't read whole files blind.
- Read memory hub: `project_fluid_toy_fractal_default_favients.md` (this session's full record), `project_deep_zoom_glitch_fixes.md` (ADR-0065), `project_deep_zoom_nucleus_reference.md` (ADR-0066), `reference_deep_zoom_literature.md` (mathr / FractalShark / Fraktaler refs for correct colouring).
- Default workspace is **dev/** (memory `feedback_workspace_default_dev`).

## Files map (read targeted, via the context plan)
Colour (shared — fix here, both apps benefit):
- `engine/fractal/shaders/gradientSample.ts` — `colorMappingT` (per-mode scalar) + `gradientForJuliaRgba` (`t = fract(t0*repeat + phase)`).
- `engine/fractal/shaders/fractalKernel.ts` — what each MRT channel holds (`j.b`=smooth iter, `aux.r`=trap minT, `aux.g`=stripe avg, `aux.b`=log|dz|, `aux.a`=trapIterN); the iteration loop + accumulator gating (`iter < uColorIter`).
Iteration (shared):
- `engine/fractal/iterationPolicy.ts`; consumers `FractalColorRenderer.effectiveMaxIter()` + `FluidEngine.effectiveMaxIter()`.
Accumulation (per-renderer):
- `engine/fractal/FractalColorRenderer.ts` (`render`, `updateHash`, TSAA_CAP, jitter).
- `fluid-toy/fluid/FluidEngine.ts` (`renderJulia`, `runTsaaBlend`, `updateTsaaHash`, `tsaaActive`, `tsaaSampleCap`).
Interaction:
- `fluid-toy/pointer/gestures/{pan,zoom,wheel}.ts` (DD pan/zoom; reset happens via the hash, not explicit calls).
- Repetition controls: fluid-toy `features/palette.ts` (`gradientRepeat`), GX `fullscreen/modes/fractalMode.tsx` (`REPEATS_MAPPING = createLogMapping(0.01,1024)`) + `fractal/fractalStore.ts`.

## Suggested protocol (research → design → sign-off → implement → verify)
1. **Audit (parallel, read-only agents):**
   - Agent A: document GX's accumulation+iteration+colour end-to-end (with file:line).
   - Agent B: document fluid-toy's equivalent; note every divergence from A.
   - Agent C: research correct Mandelbrot/Julia colouring under deep zoom (smooth/normalized iteration, exterior **distance estimation**, **logarithmic** potential, stripe-average, Koebe/atom-domain) and how SOTA renderers keep a *single* sane "density/repeat" across depth. Use `reference_deep_zoom_literature.md` + web.
2. **Synthesize** a short design doc (NEW artifact in `dev/plans/`): for EACH colour mode define a depth-normalized `t` so Repetition ≈ 1 is sane at any zoom; pick which modes to keep/fix/cut; define the TSAA refinement cadence for smooth (non-blocky) background convergence; define the Repetition control mapping. Cover correctness, perf cost, and interaction.
3. **Sign-off:** present the design + tradeoffs to the user BEFORE implementing (this is a look-changing, cross-app change — get explicit go-ahead, and confirm whether the *Iterations* mode should normalize by the cap, which would diverge from today's GX look).
4. **Implement** in the SHARED layer first (`gradientSample.ts` / `iterationPolicy.ts`) so both apps move together; per-renderer TSAA changes second. Keep a feature flag / A-B where a look change is risky.
5. **Verify:** `tsc`; `smoke:fluid-toy`; `smoke:deep-zoom-orbit|la|nucleus`; `smoke:gx-fractal-glitch` (needs `npm run dev` on :3400, drives `window.__fractalRenderer`). The user does the visual pass (memory `feedback_visual_smokes`) — give them Copy-coords spots to check. Default GPU for any render/perf harness (memory `feedback_gpu_over_cpu_render_tests`).

## Gotchas
- Don't fork the kernel — both apps share it; fix colour in `gradientSample.ts`.
- A passing render smoke can mask a dead uniform when the fallback ≈ the feature (ADR-0066 lesson) — verify uniforms are actually bound (FluidEngine collects uniforms from a hardcoded name list ~line 704).
- Headless SwiftShader wall-time is a red herring for perf — measure worker-internal build ms / GPU timer, not wall (memory `project_deep_zoom_glitch_fixes`).
- fluid-toy boots pure-fractal (sim off) now; the fractal viewer is fully usable without touching the fluid.

---

## PROMPT FOR NEXT SESSION (paste this)

```
We're auditing and redesigning how ACCUMULATION (TSAA), ITERATION count, and COLOUR
mapping work in the GMT fractal renderers, across BOTH the Gradient Explorer fractal
viewer (engine/fractal/FractalColorRenderer.ts) and fluid-toy (fluid-toy/fluid/FluidEngine.ts).
Workspace: dev/. Priorities in order: correctness, performance, comfortable interaction.

Start by loading context cheaply: run `npm run context:map` / `npm run context:cost` and
read memory project_fluid_toy_fractal_default_favients.md (full record of the prior session),
project_deep_zoom_glitch_fixes.md, project_deep_zoom_nucleus_reference.md, and
reference_deep_zoom_literature.md. Then read dev/plans/fractal-color-accumulation-iteration-handoff.md
in full — it has the file map, what's already done (don't redo), and the protocol.

The problems to solve (deep zoom especially):
1. Background iteration/accumulation updates look blocky / not smooth.
2. Most colour modes go flat or noisy at depth; only Iterations (Repetition ~0.0001) and
   Stripe (Repetition ~500+) look good. The per-mode colour scalar in
   engine/fractal/shaders/gradientSample.ts (colorMappingT) is not depth-normalized — likely
   needs logarithmic / zoom-aware normalization so Repetition ~1 is sane at any zoom.
3. Repetition is unusable across modes/zoom (7 orders of magnitude range).

Key fact: GX and fluid-toy SHARE the GPU kernel (engine/fractal/shaders/fractalKernel.ts) and
the colour math (gradientSample.ts) and the iteration policy (engine/fractal/iterationPolicy.ts),
so fix colour/iteration in the shared layer and both benefit. TSAA/accumulation is per-renderer.

Run it as: (A) parallel read-only audit agents documenting GX vs fluid-toy accumulation+iteration+
colour with file:line + a divergence table, plus one agent researching correct deep-zoom colouring
(distance estimate, normalized iteration, logarithmic potential, stripe) and how SOTA keeps one
sane density across depth; (B) synthesize a design doc in dev/plans/ defining depth-normalized t per
mode (Repetition ~1 sane everywhere), the TSAA cadence for smooth convergence, and the Repetition
control mapping — covering correctness/perf/interaction; (C) PRESENT the design + tradeoffs to me
for sign-off BEFORE implementing (it changes the look across both apps; confirm whether Iterations
mode should normalize by the cap, which diverges from today's GX look); (D) implement shared-layer
first; (E) verify: tsc, smoke:fluid-toy, smoke:deep-zoom-{orbit,la,nucleus}, smoke:gx-fractal-glitch
(needs `npm run dev`), and give me Copy-coords spots for a visual pass.

Use the fluid-toy bottom-left "Copy coords" button to capture exact spots where modes break.
```
