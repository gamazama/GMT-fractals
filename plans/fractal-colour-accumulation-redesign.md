# Fractal Colour + Iteration + TSAA Accumulation Redesign

**Status:** SIGNED OFF 2026-06-13 — Phases 0–4 IMPLEMENTED + gate-verified (tsc, fluid-toy, deep-zoom orbit/la/nucleus, gx-fractal-glitch all green; v1 byte-identical to baseline). Phases 5–6 queued pending the visual A/B pass. See sign-off + implementation record below.

## Implementation status (2026-06-13)
| Phase | What | Status |
|---|---|---|
| 0 | `uColorNormV2` + `uLogPixelScale` uniforms in shared kernel/gradientSample/display; bound in GX (`FractalColorRenderer`) + fluid-toy (`FluidEngine`); both reset-hashes updated | ✅ done |
| 1+2 | `colorMappingT` v2 branch (gated by `uColorNormV2`): Iterations `=count/cap`, Hard Bands `=N-quantized/cap`, Magnitude+Potential `=log2(log2|z|²)`, orbit traps `=log2(1/minT)·scale` (dynamical-plane, NOT pixel-scaled), DE `=in-pixels via log-space` (fixes the `exp(aux.b)` overflow), Derivative `=log|dz|/depth`; kernel stripe-freq `s_eff = s/ln(colorIter)` | ✅ done |
| 3 | Repetition→**Density**: GX + fluid-toy slider relabel + `createLogMapping(0.1,100)`; per-mode default seeds collapse to 1.0 under v2 (legacy seeds kept under v1); **Norm v1/v2 A/B toggle** in both apps' controls | ✅ done |
| 4 | Shared TSAA per-pixel sub-cell offset `hash22(pixel,round)` replacing the global per-round offset (dissolves the grid-aligned blocky convergence; benefits both renderers) | ✅ done |
| 5 | Per-renderer cadence: GX 8×8 grid; fluid-toy blue-noise-when-idle | ⏳ queued (after visual pass) |
| 6 | LA-tile reference-frame stat accumulation (fluid-toy deep faint square) | ⏳ queued (after visual pass) |

**Key implementation note:** orbit-trap distance lives in the *dynamical z-plane* and is camera-zoom-INDEPENDENT, so traps are NOT divided by pixel scale (the design's B1 assumption holds only for DE, which is a c-plane distance). Traps break at depth because the rising iteration cap saturates `minT→0`; v2 fixes that with a log mapping. DE genuinely needs the pixel scale and is computed entirely in log space (`uLogPixelScale = ln(world-units/px)`, computed in JS f64 so it survives deep zoom where `uScale` underflows f32). Everything is gated by `uColorNormV2` (ships OFF) so v1 renders byte-identical until you flip the toggle.

---



## Sign-off record (2026-06-13)
- **D1 Iterations normalization:** APPROVED `smoothIter/uMaxIterF`, behind A/B flag `colorNormV2`, ship OFF, flip default after visual pass.
- **D2 DE flagship:** APPROVED — add DE (if absent), make it a selectable default. User emphasis: SOTA offers *many* colour modes; today only Iterations + Stripe look decent at depth — the goal is the broad normalization making the **whole mode set** usable at depth, not just adding DE.
- **D3 rename Repetition→Density:** APPROVED (UI label only; keep `uGradientRepeat` uniform/save-field).
- **D4 drop per-mode Repetition defaults:** APPROVED (universal 1.0; old saves keep stored value).
- **D5 fluid-toy blue-noise idle:** APPROVED (grid stays for K>1 preview).
- **D6 LA-tile reference-frame stats:** APPROVED — fix now.
- **D7 atom-domain:** backlog (unchanged).

---

**Original status:** DESIGN — for human sign-off. Not an implementation ticket.
**Scope:** the shared fractal colour/iteration/accumulation layer used by **two** renderers that share the GPU kernel, colour math, and iteration policy:
- **GX** — Gradient Explorer `FractalColorRenderer` (`engine/fractal/FractalColorRenderer.ts`), driven by `gradient-explorer/fullscreen/modes/fractalMode.tsx`.
- **fluid-toy** — `FluidEngine` (`fluid-toy/.../FluidEngine.ts`).

Shared sources (changes here hit both): `engine/fractal/shaders/gradientSample.ts`, `engine/fractal/shaders/fractalKernel.ts`, `engine/fractal/shaders/tsaaBlend.ts`, `engine/fractal/iterationPolicy.ts`.

---

## 1. Problem statement

Three observed symptoms, one shared root cause class.

1. **Blocky background convergence.** As TSAA refines, the background updates in grid-aligned quarter-screen "blocks" that step every few frames. Root: the round-based sub-cell jitter offset is a single globally-uniform offset per round (deterministic R2 tap), applied identically to every pixel — so all pixels on a colour/iteration boundary cross it in lockstep, producing correlated per-round colour jumps. (GX `fractalKernel.ts:791–836`, blend `tsaaBlend.ts:38–40`.) fluid-toy adds a second cause: the LA-acceleration tile (an L∞ square where `dc ≤ threshold`) integrates per-iter colour stats over a different path than surrounding PO-only pixels, so a faint square refines over seconds.

2. **Modes go flat or noisy at depth.** Discrete modes (Iterations bands, Hard Bands) collapse to a single band when most pixels hit `uMaxIter`; clamp-based modes (Magnitude, Derivative) saturate; potential/DE modes get precision-noisy. The per-iter stat modes (Stripe, traps) over-pack as orbit length grows.

3. **Repetition is unusable across ~7 orders of magnitude.** The control is a log mapping over `0.0001..1024` (`fractalMode.tsx:60`). A value that frames Iterations at the home view (~1) needs ~`1e-4` at deep zoom; Stripe needs ~`500`. Each mode has a different magic constant baked into `colorMappingT` (`gradientSample.ts:65–91`: `*0.05`, `*0.0625`, `*0.6/0.8/1.2`, `*0.08`...), so one slider means a different thing per mode and per depth.

**Root cause (from SOTA research):** the practical iteration cap grows ~linearly with zoom decades (`maxIter ≈ k·log10(1/pixel_scale)`; see `autoShallowIter` in `iterationPolicy.ts:34–38` and `deepRefIter:41–44`). Only the **fractional** part of smooth-iter is bounded; the integer part drifts. Feeding any **raw count × const** into a cyclic palette therefore drifts with depth. SOTA renderers never do this — they map each per-pixel value into a **depth-decoupled coordinate first** (divide distances by `pixel_spacing`; index counts/potentials by a **log** with a zoom-coupled period), then expose **one** density control (~1) on top.

---

## 2. GX vs fluid-toy divergence table

| Aspect | GX `FractalColorRenderer` | fluid-toy `FluidEngine` | Diverges? |
|---|---|---|---|
| **Colour math** | `colorMappingT` in shared `gradientSample.ts:64–92` | re-exports `FRAG_JULIA`/`colorMappingT` from same `gradientSample.ts` (julia.ts:11) | **No — shared** |
| **Iteration policy** | `iterationPolicy.ts:24–53`; `effectiveMaxIter()` `FractalColorRenderer.ts:651–670` | same module; `effectiveMaxIter` `FluidEngine.ts:1270–1276` | **No — shared module, mirrored callers** |
| **uColorIter binding** | always `= effectiveMaxIter()` (`FractalColorRenderer.ts:728`) | `autoIter ? maxIt : min(maxIt, params.colorIter)` (`FluidEngine.ts:1337–1340`) | **Yes** — fluid-toy exposes a manual colorIter knob; GX hard-couples |
| **Accumulation K** | K=1 sample/frame, hardcoded (`TSAA_PER_FRAME=1` `FractalColorRenderer.ts:163`) | `tsaaPerFrameSamples` (default 1, configurable) — K jittered evals raw-averaged per frame | **Yes** — fluid-toy supports K>1 |
| **TSAA cap** | `TSAA_CAP=128` (`FractalColorRenderer.ts:163`) | `tsaaSampleCap` (0=∞, 1=off, >1=cap) `FluidEngine.ts:1293–1298` | **Yes** — GX fixed 128; fluid-toy configurable + can pause-skip |
| **Jitter mode** | grid hardcoded (`uJitterMode=1` `fractalMode.tsx:748`) | `'grid'` or `'bluenoise'` (`FluidEngine.ts:1366`) | **Yes** — fluid-toy has blue-noise option |
| **Blend** | `mix(hist,cur,1/N)` shared `tsaaBlend.ts:38–40` | same shared `FRAG_TSAA_BLEND` | **No — shared** |
| **Hash / reset** | 21 params, `updateHash()` `FractalColorRenderer.ts:695–708`; any mismatch → index←0 | `updateTsaaHash()` `FluidEngine.ts:1505–1517`; adds `colorIter`, `autoIter`, `iterMul`, `deepMaxIter`, collision | **Yes** — fluid-toy hashes more (esp. `centerLow` Dekker pan) |
| **Blocky cause** | per-round global sub-cell offset (no per-pixel decorrelation) | same + LA-tile vs PO-tile path divergence | Partly shared |

**Implication for the redesign:** all colour-field and normalization work lands in the **shared** `gradientSample.ts` + `iterationPolicy.ts` and benefits both renderers for free. TSAA cadence is **partly forked** (GX hardcoded vs fluid-toy configurable) and must be addressed per-renderer.

---

## 3. Per-colour-mode redesign

Goal: **Repetition ≈ 1 is a sane density at ANY zoom for EVERY kept mode.** Achieved by defining a normalized field per mode and computing `colorMappingT = fract(density · field)` where today's per-mode magic constant is replaced by a depth-decoupled normalizer. New uniforms required into `gradientSample.ts`: `uPixelScale` (fractal units / pixel — already computed in `deepZoom/deepZoomWorker.ts`; bind in shallow path too) and `uMaxIterF` (float `effectiveMaxIter`).

Normalization bases (from research):
- **B1 distance-relative** — divide a distance-like quantity by `pixel_spacing`; dimensionless, scale-INVARIANT (Fraktaler-3 default DE shader; FractalShades DEM_pp; Wikibooks demm).
- **B2 log-of-count with zoom-coupled period** — `field = log(1+x)` and/or `x / maxIter`; divides out the ~linear iter-cap growth (Wikibooks color_mandelbrot `(i/maxIter)^S`; exponential-map proof that `log|radius|` is the even-band axis).
- **B3 structural / bounded** — already in [0,1] independent of depth (angle, decomposition, atom-domain period).

| Mode | Current `t` (gradientSample.ts) | Proposed depth-normalized `t` (pre-`fract(density·…)`) | Basis | Keep / Fix / Cut |
|---|---|---|---|---|
| 0 Iterations | `j.b * 0.05` | `smoothIter / uMaxIterF` (opt `^S`), **or** `log(1+smoothIter)/log(1+uMaxIterF)` | **B2** | **FIX** (flagship; see §7 decision — diverges from today's look) |
| 1 Angle | `atan(j.g,j.r)*0.159+0.5` | unchanged | B3 (bounded) | **KEEP** |
| 2 Magnitude | `clamp(len(j.rg)*0.08,0,1)` | `fract(log2(log2(max(dot,1.0001))))` shares mode-12 math; demote to alias | B2 | **FIX** (fold into Potential look; or keep as-is, low value) |
| 3 Decomposition | `step(0,j.g)*0.5+0.25` | unchanged | B3 (topological) | **KEEP** |
| 4 Hard Bands | `floor(j.b)*0.0625` | `floor(smoothIter · density · k/uMaxIterF)·(1/N)` — band count tied to depth | B2 | **FIX** (band count must track maxIter or it collapses) |
| 5–8 Orbit Trap (point/circle/cross/line) | `1-clamp(aux.r*{0.6,0.8,1.2,0.8},0,1)` | `log(1 + trapDist / uPixelScale)` — distance/pixel, then log even bands | **B1** | **KEEP + FIX** (normalize trap dist by pixel_spacing; single density transfers across depth) |
| 9 Stripe Average | `clamp(aux.g,0,1)` | keep `aux.g` value, but drive **effective stripe freq** `s_eff = s0/log(uMaxIterF)` in kernel so spatial freq stays constant; output stays [0,1] | B2 (freq normalize) | **KEEP + FIX** (no more Repetition~500; auto-fade weight at extreme depth optional) |
| 10 Distance Estimate | `1-exp(-d*4)` with d from `aux.b` | `tanh(density · DE / uPixelScale)` **or** `log(1 + DE/uPixelScale)`; DE = `2|z|ln|z|/|dz|` | **B1** | **PROMOTE to flagship** (SOTA default; retune-free at all depths) |
| 11 Derivative (log\|dz\|) | `clamp(aux.b*0.25,0,1)` | keep; it is a slope proxy — pairs as lighting, not primary palette index | B2 | **KEEP** (demote to lighting/aux layer) |
| 12 Continuous Potential | `fract(log2(log2(r2))*0.5)` | `log(max(potential,tiny))` with `potential = log(\|z\|)/2^n`; even bands under zoom | **B2** | **KEEP + FIX** (the clean even-band mode for zoom videos) |
| 13 Trap Iteration | `aux.a` (`trapIter/maxIter`) | unchanged (already /maxIter) | B2 (already normalized) | **KEEP** |
| — DE Normal / Slope (Blinn-Phong on DEX/DEY) | — (new) | lighting layer over any mode; cheap (derivative already computed) | B1 | **ADD** |
| — Atom Domain / period label | — (new) | categorical colour by detected atom period (depth-INDEPENDENT) | B3 | **CONSIDER** (great for minibrot location; categorical not gradient) |

**Recommended SOTA-relevant mode set:** flagship **Distance Estimate (B1)** + **Iterations (fixed, B2)** as the two defaults; **Stripe (normalized)**, **Log Potential**, **Orbit Traps (normalized)** as texture/structure layers; **Angle / Decomposition / Trap-Iteration** kept as cheap structural modes; **DE-Normal slope** added as a lighting layer; **Atom-Domain** as a stretch add. **Cut/demote** any mode that feeds a raw unbounded count linearly (the current failure class) — modes 0 and 4 are the offenders and are being FIXED rather than removed.

Every kept mode exposes the SAME `density` multiplier on a pre-normalized field, so `density≈1` means one thing everywhere at every depth.

---

## 4. Repetition control redesign

Today: `createLogMapping(0.01, 1024)` (`fractalMode.tsx:60`), hard bounds `0.0001..1024` (`fractalStore.ts:85`), mode-dependent defaults (Mode 0→1, Mode 4→4, Mode 9→4 `fractalStore.ts:69–77`). These per-mode defaults are a band-aid for the un-normalized fields.

**Proposed.** Because §3 makes every field depth-decoupled and O(1) in magnitude, the slider becomes a true **density** control with one meaning across all modes/depths:
- Rename intent to **Density** (label can stay "Repetition" if preferred — see §7).
- Mapping: `createLogMapping(0.1, 100)` — a ~3-decade log axis centered on 1. Default **1.0 for every mode** (drop the per-mode defaults `fractalStore.ts:69–77`). A user who wants 8 stripe cycles dials to 8; one who wants broad bands dials to 0.3.
- `colorMappingT = fract(density · field)` (the `fract` stays; `field` is the §3 normalized scalar).
- **Phase** (`uGradientPhase`) is unchanged: a [0,1) additive offset on `t` after the density multiply (`fract(density·field + phase)`) — rotates the palette without changing band count. Keep as-is.

Net: one slider, default 1, sane everywhere. The 7-orders-of-magnitude problem disappears because the depth growth is divided out in the field, not chased by the slider.

---

## 5. TSAA refinement cadence redesign (per renderer)

Target: smooth, **non-blocky** convergence to the same converged image, no shimmer at rest.

**Blocky-cause recap.** (GX & fluid-toy) per-round sub-cell offset is one global R2 tap applied to every pixel → boundary pixels cross in lockstep → correlated per-round colour jump, visible as quarter-screen blocks stepping every ~16 frames (`fractalKernel.ts:791–836`). (fluid-toy extra) LA-tile vs PO-tile path divergence in per-iter stats.

**Shared fix — per-pixel offset decorrelation.** Replace the globally-uniform per-round offset with a **per-pixel** sub-cell offset seeded by `hash(pixelCoord, round)` (cheap integer hash, still deterministic so no frame-to-frame shimmer once `sampleIndex` passes the round). This keeps "same offset per pixel across the life of a round" (no shimmer) while making neighbouring pixels' offsets **anti-correlated** — boundary pixels no longer jump in lockstep, so blocks dissolve into per-pixel noise that the `1/N` blend averages out smoothly. This is a kernel change in shared `fractalKernel.ts`, benefits both.

**GX cadence.** K=1 fixed, cap 128 (`FractalColorRenderer.ts:163`). Keep K=1 (interaction-friendly). Recommend: more rounds with finer per-round stepping (e.g. 8×8 = 64-cell lattice over the same 128 budget → 2 rounds) so each round's correction is smaller-magnitude → less visible stepping even before the per-pixel fix. Keep `TSAA_CAP=128` (~2.1s @60fps).

**fluid-toy cadence.** Already configurable (K, cap, grid/bluenoise). Recommend: default to **blue-noise jitter** for the fractal layer when not interacting (per-sample decorrelated taps already implemented `FluidEngine.ts:1824–1836`) — it converges without the round-block structure. Keep grid for the K>1 fast-preview path. For the **LA-tile** secondary cause: this is a structural path divergence, not a jitter artifact; the per-pixel fix does not remove it. Mitigation is to ensure LA and PO accumulate the SAME per-iter colour stats (accumulate stats in the un-accelerated reference frame, or fall back to PO inside the active per-iter-colour modes — note `fractalKernel.ts:475` already disables LA/AT when `perIterColor=true`). **Decision flagged in §7.**

---

## 6. Tradeoffs: correctness vs performance vs interaction

| Lever | Correctness / look | GPU cost | Interaction feel |
|---|---|---|---|
| DE field (`2\|z\|ln\|z\|/\|dz\|`) | best depth stability; SOTA default | derivative recurrence already tracked (`uTrackDeriv`); ~+1 mul/iter — cheap | unchanged |
| Log-potential field | clean even bands | one `log(log)` per pixel (not per iter) — negligible | unchanged |
| `smoothIter/maxIter` for Iterations | depth-stable | trivial (1 divide) | unchanged |
| Stripe `s_eff = s0/log(maxIter)` | stays readable deep | trivial | unchanged |
| Per-pixel TSAA offset | kills blocks | one integer hash/pixel/frame — negligible | unchanged |
| 8×8 grid (GX) | finer steps | none (same budget) | slightly slower full convergence per-cell pass |
| Blue-noise default (fluid-toy) | no round-blocks | none | per-sample taps already decorrelated |
| LA-stats-in-reference-frame | removes LA-tile square | LA pixels lose some acceleration when per-iter color on (already the case via `fractalKernel.ts:475`) | deep zoom slightly slower in trap/stripe modes |

The expensive items (DE, potential) are **per-pixel post-loop**, not per-iteration, so cost is negligible vs the march itself. The only real perf tradeoff is LA disablement under per-iter colour modes, which already exists.

---

## 7. Decisions needing the user

| # | Decision | Recommendation | Tradeoff | Needs user call? |
|---|---|---|---|---|
| D1 | **Default Iterations mode: normalize by iteration cap?** `smoothIter/maxIter` (depth-stable, Repetition≈1 everywhere) **vs** today's `smoothIter*0.05` (drifts but is the established GX look). | Normalize, behind an A/B flag; ship normalized as new default after visual sign-off. | Changes the look of every existing GX scene at depth; saved scenes' Repetition values become wrong. | **YES** |
| D2 | Make DE the flagship default colour mode (vs Iterations)? | Offer DE as a one-click default but keep Iterations as the boot default to avoid surprising existing users. | DE look is crisper/monochrome-ish; different brand feel. | YES |
| D3 | Rename "Repetition" → "Density"? | Rename in UI; keep `uGradientRepeat` uniform name for save-compat. | Doc/label churn; saved-scene field name unchanged so no migration. | YES |
| D4 | Drop per-mode Repetition defaults (`fractalStore.ts:69–77`) in favour of universal 1.0? | Drop them once §3 lands; they become redundant. | Old saves load with their stored value (fine); fresh scenes change default. | YES |
| D5 | fluid-toy: default jitter to blue-noise for the fractal layer? | Yes when idle; grid for K>1 preview. | Minor change to fluid-toy convergence character. | low |
| D6 | LA-tile fix: accumulate per-iter stats in the reference frame (correctness) vs leave the faint square (perf)? | Fix it — visual artifact outweighs the deep-zoom-only perf cost (LA already off under per-iter color). | Slight deep-zoom slowdown in trap/stripe modes. | YES |
| D7 | Atom-domain / period-label mode — add now or backlog? | Backlog; it is categorical (not gradient) and needs period-detection plumbing (partly exists via nucleus reference). | Net-new feature surface. | low |

**Iterations-normalization question (called out for sign-off):** Should the default Iterations mode divide smooth-iter by the iteration cap (`smoothIter/uMaxIterF`, depth-stable so Repetition≈1 works at any zoom) even though it **diverges from today's GX look** and invalidates the Repetition value stored in existing GX scenes? Recommendation: yes, behind an A/B feature flag, with the normalized path becoming default only after visual sign-off.

---

## 8. Phased implementation outline

**Shared-layer first, then per-renderer TSAA.** Each phase gated.

- **Phase 0 — Plumbing.** Bind `uPixelScale` (reuse `deepZoom/deepZoomWorker.ts` pixel-scale; add to shallow path) and `uMaxIterF` into the shared fractal program; thread into `gradientSample.ts`. No look change. Gate: `tsc`, `smoke:fluid-toy`, `smoke:deep-zoom-{orbit,la,nucleus}`, `smoke:gx-fractal-glitch`.
- **Phase 1 — Distance-relative modes (B1).** Rework DE (10) and Orbit Traps (5–8) to `…/uPixelScale` + log/tanh. Low look-risk (these modes are already proximity-shaded). Gate: full smoke set + visual glance fluid-toy.
- **Phase 2 — Log/count normalization (B2), behind A/B flag.** Iterations (0), Hard Bands (4), Stripe `s_eff`, Potential (12). **Feature-flagged** (`colorNormV2`) because Iterations is the established look — ship flag OFF, A/B, flip default after sign-off (D1). Gate: smokes + side-by-side render-matrix old vs new at home + 1e-4 + deep.
- **Phase 3 — Repetition→Density mapping.** New `createLogMapping(0.1,100)`, default 1.0, drop per-mode defaults (D3/D4). Gate: tsc + smokes; confirm old saves still load.
- **Phase 4 — TSAA per-pixel offset (shared kernel).** Replace global per-round offset with `hash(pixel,round)`. Kills blocks for both renderers. Gate: `smoke:gx-fractal-glitch` (primary), `smoke:fluid-toy`, visual convergence glance.
- **Phase 5 — Per-renderer cadence.** GX 8×8 grid; fluid-toy blue-noise idle default (D5). Gate: smokes + visual.
- **Phase 6 — LA-tile stats fix (D6).** Reference-frame stat accumulation. Gate: `smoke:deep-zoom-la` (primary) + render-matrix square-check.
- **Phase 7 (stretch) — DE-Normal slope layer; Atom-domain (D7).**

**Verification gates (every phase):** `tsc`; `smoke:fluid-toy`; `smoke:deep-zoom-orbit`; `smoke:deep-zoom-la`; `smoke:deep-zoom-nucleus`; `smoke:gx-fractal-glitch`. Look-risky phases (1,2,5) additionally regenerate the render-matrix for old-vs-new side-by-side at home / `1e-4` / deep zoom before flipping any default.
