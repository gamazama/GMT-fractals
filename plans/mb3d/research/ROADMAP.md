# MB3D Importer — Unified Roadmap

**Date:** 2026-06-27 · **Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable`
**Synthesizes:** `binary-search-de-spec.md` (surface refinement) · `lighting-import-spec.md` (lighting/material/colour) · `coverage-unlocks.md` (scene-coverage). All three read in full; sequencing below is justified from those specs, not assumed.

> **STATUS UPDATE 2026-06-27 — three of the four fronts have shipped or shifted:**
> - **Lighting L0–L3 (camera/lights/material/palette): DONE** (`mapCamera.ts`/`mapLighting.ts`). Only **fog** remains unapplied.
> - **Binary-search surface-refinement DE: DONE but FALSIFIED as the dust fix** — shipped as a useful opt-in control (ADR-0084), but the DsyneGrafix dust is a DE-fidelity gap. The **actual** dust fix is the **numerical finite-difference DE estimator (ADR-0085)**, which postdates this roadmap.
> - **Coverage (U-series): unbuilt** — still the live "widen" front (`coverage-unlocks.md`, headline **U1**).
> - **Next chosen front = render-fidelity deepening:** see **`fidelity-pass-SESSION.md`** (quality-param de-empiricization from `Calc.pas` + numeric-DE lighting fix + fog). The global sequencing below is partly obsolete — read `fidelity-pass-SESSION.md` + `coverage-unlocks.md` for the live plan, not the order here.

---

## 1. State of the importer (one paragraph)

The geometry pipeline is solid: 279 formulas decompile faithfully with **0 cross-check mismatches**, and the fused-hybrid weave produces **geometry-correct** surfaces for every scene whose slots compile — 22/80 scenes import faithfully today (33/80 "supported" once the 11 default-param code-subs are counted), and the standing certification criterion was deliberately reduced to *geometry + framing* only. Two known geometry exceptions remain: **DsyneGrafix-class** hybrids render as *dust* because GMT sphere-traces a non-Lipschitz fused DE and accepts the first overshoot with no surface refinement (binary-search-DE spec), and **spineJulia** needs interior/deep-zoom and is out of scope. Everything else that fails is either *not yet importing* (47 scenes blocked at the decompiler/const-pack/weave-mode gates — coverage spec) or *importing but visually wrong*: every imported scene currently inherits GMT's `DEFAULT_LIGHTS` rig and a neutral grey gradient because `parseHeader` stops before the `TLightingParas9` block at offset 432 and `emitFusedHybrid` never writes `lighting`/`materials`/`coloring` (lighting spec). So the importer is **geometrically faithful but visually unfinished, and under-covered** — three orthogonal fronts, none blocking the others.

---

## 2. Recommended order of work (justified from the specs)

The decisive sequencing fact is **front independence with one shared verification harness**. The lighting front and the coverage front touch *disjoint* code (parse/preset wiring vs decompiler/packer), and the binary-search-DE front touches a *third* disjoint area (the kernel `trace.ts`). None blocks another. So the order is set by **payoff-per-effort × breadth**, not by dependency.

**Recommended order: Lighting (L1) → Coverage cheap wins (U3/U6/U1/U8) → Binary-search DE → Lighting L2/L3 → Coverage M-tier (U2/U5/U7/U4).** Rationale, front by front:

1. **Lighting L1 (lights → preset) goes first — it is the only front whose payoff lands on *every* scene at once.** The lighting spec is explicit: the neutral-grey gap is *universal* (every imported scene, present and future, inherits the default rig), and L1 "alone removes most of the neutral-grey complaint." Coverage unlocks and binary-search DE each improve a *subset* of scenes; L1 improves the entire imported corpus and every scene the other two fronts subsequently unlock. It is also the highest value-per-effort phase in its own spec (~1 day, "the big visible win"). Do it first so all later work is judged against correctly-lit renders, not grey ones — which also de-risks the binary-search-DE canary (a dust-vs-surface visual diff is far clearer under real lighting).

2. **Coverage cheap wins (U3, U6, U1, U8) go second — maximum scenes-gained-per-effort, all S/S–M, all cross-check-gated.** Per the coverage spec these are low-risk literal/case edits that move the faithful-scene floor **22 → ~33** (+50%). Critically, the spec **corrects a blocking misdiagnosis in ADR-0083/the handoff**: the `Cp<n>` const-pack gap (U1, ~80 formulas, ≥8 scenes) is *not* "ambiguous / needs a runtime MB3D dump" — it is the fully-specified `PAligned16` table at `DivUtils.pas:1616-1644`, copied per-formula at `CustomFormulas.pas:334`. That correction alone makes the headline coverage win a deterministic S–M edit instead of an open research question, so it should be banked early. U3 (`case 12` = 4×4 matrix, +3) and U6 (abs-via-multiply x87 fix, a U1 prerequisite) are trivial; U8 (intern #6, +3) is self-contained.

3. **Binary-search DE goes third — it is the *only* fix for an entire failure class (DsyneGrafix dust), but that class is a narrow subset, so it ranks below the universal-payoff and breadth fronts.** It is well-scoped (M, "roughly a focused session"), compile-gated so the 19+ certified scenes stay byte-identical, and the spec already resolved its one open correctness concern (the `g_difsDE` accumulator is per-call clean). It comes after L1 so the canary is judged under real lighting, and after the coverage cheap wins because those are cheaper per-scene — but before the coverage M-tier because it converts a hard *failure* (dust) into a surface, which is worth more than incremental breadth.

4. **Lighting L2/L3 (material + ambient + fog, then palette) go fourth — they close the *named* washout and the residual fidelity gap.** L2 specifically fixes **Hyperben2** (default rig over-lights a deep-zoom interior; importing MB3D's ambient + depth-fog grounds it). L3 (palette) is flagged *permanently approximate* (external `.map` is dropped; only `LCols` anchors survive), so it is the lowest-confidence lighting phase and correctly last within its front.

5. **Coverage M-tier (U2, U5, U7, U4) goes last — biggest absolute breadth, highest per-item effort.** U2 (dIFS `Cm88+` packer, +≥13 scenes) is the single best M-tier scene ROI; U5 (forward-branch structuring, ~53 formulas) is the biggest formula-count unlock and a likely prerequisite that makes U4 (`sphereIFS`, +7) nearly free; U7 (weave mode 2) compounds as the others land. Per the coverage spec this tier takes the corpus to **~48+ faithful scenes (60%+)**, with ~12 genuinely loop-blocked formulas as the narrow permanent ceiling.

---

## 3. Dependency / sequencing diagram (prose)

```
  THREE INDEPENDENT FRONTS  (disjoint code; one shared cert harness)

  FRONT A: LIGHTING            FRONT B: COVERAGE           FRONT C: BINARY-SEARCH DE
  (parse + preset wiring)      (decompiler + packer)       (kernel trace.ts)
  ───────────────────────      ────────────────────        ────────────────────────
  L0 parse block (foundation)  U6 abs-via-mul ──prereq──►   (no intra-front deps;
       │                            │                        single localized loop +
       ▼                            ▼                        compile gate + uniform)
  L1 lights ★ (universal win)  U1 PAligned16 Cp-table
       │                            │  (+U3, +U8 parallel)
       ▼                            ▼
  L2 material+ambient+fog      U2 dIFS Cm88+ packer
       │  (fixes Hyperben2)         │
       ▼                            ▼
  L3 palette (approx, flagged) U5 forward-branch struct ──►  U4 sphereIFS
                                    │                         (re-triage; may be free)
                                    ▼
                               U7 weave mode 2 (compounds w/ U1,U2,U4)

  GLOBAL TIME ORDER (payoff×breadth, not dependency):
  L1  →  [U3, U6, U1, U8]  →  FRONT C (bin-search DE)  →  L2  →  L3  →  [U2, U5, U7, U4]
   ▲           ▲                      ▲                    ▲                   ▲
  universal   cheap breadth      fixes a failure-class   named fix        deep breadth
```

Intra-front hard dependencies (the only real edges):
- **Front A:** L0 (parse) gates L1/L2/L3 — nothing reads the block until it's parsed.
- **Front B:** **U6 → U1** (the x87 abs-via-multiply fix is a prerequisite for the mask-leaking subset of U1). **U5 → U4** (forward-branch structuring likely unblocks `sphereIFS` for nearly free, so U4 is re-triaged *after* U5). U7 compounds with U1/U2/U4 (more slots supported ⇒ more mode-2 scenes recovered).
- **Front C:** none internal. Its only cross-front *soft* dependency is sequencing-for-clarity: run it *after* L1 so the dust→surface canary is judged under real lighting.

---

## 4. Per-front effort + single highest-leverage next action

| Front | Total effort | Phases | Highest-leverage next action |
|---|---|---|---|
| **A — Lighting** | **L** (~3.5 d) | L0 (0.5d) · L1 (1d) · L2 (1d) · L3 (1d) | **Ship L1.** It is the only single action whose payoff lands on *every* imported scene (kills the universal neutral-grey gap) and de-risks both the binary-search canary and all later cert renders. Prereq L0 is ~0.5d of byte-verifiable parse. |
| **B — Coverage** | **M overall** (cheap wins S/S–M; M-tier M; deep work L, deferred) | U1/U2/U3/U4/U5/U6/U7/U8 (U9/U10 deferred) | **Land U1 (PAligned16 `Cp` table) + its U6 prereq.** ~80 formulas, ≥8 scenes, S–M, and it **corrects the ADR-0083 misdiagnosis** that was framing this as an open runtime-dump problem — so it both unblocks scenes and fixes the docs. |
| **C — Binary-search DE** | **M** (one focused session) | single kernel change + gate + importer wiring + tests | **Implement the compile-gated damped-bisection loop at `trace.ts:116`** (with the one `dPrev` line before the advance) behind the `enableRefine` compile flag + `uRefineSteps` uniform, validated on the DsyneGrafix canary. |

**Single highest-leverage action across all three fronts: ship Lighting L1.** It is the only action that improves the entire corpus simultaneously, it is cheap (~1d after a ~0.5d parse foundation), and it raises the visual baseline that every subsequent coverage unlock and the binary-search canary are evaluated against.

---

## 5. Cross-front synergies and conflicts

**Synergies:**
- **Shared cert harness.** All three specs reuse the *same* MB3D-ref-vs-GMT-render certification harness and the same `npm run typecheck` / `test:mb3d` / corpus-cross-check gates. Standing up one calibration set (Torii, ABoxScale2, Hyperben2, AureliusCat, DsyneGrafix) serves all three fronts — build it once during L1.
- **Lighting multiplies coverage.** Every scene U1/U2/U4/U5/U7 unlock inherits L1's correct lighting automatically (the preset wiring is formula-agnostic). Doing lighting first means new scenes arrive already-lit, not grey.
- **Lighting clarifies the binary-search canary.** A dust→surface visual diff is far easier to certify under real key/fill lighting than under the flat default rig — another reason Front C follows L1.
- **U5 likely makes U4 free.** Forward-branch structuring (U5) is a probable prerequisite that unblocks `sphereIFS` (U4, +7 scenes) for near-zero extra work — re-triage U4 only after U5.
- **All three are byte-/source-identity-safe on certified scenes.** Front A gates on `lights.length > 0` (standalone loads keep DEFAULT_LIGHTS); Front B is fully cross-check-gated (nothing bad math ships); Front C compiles to *byte-identical* shader source when `enableRefine` is off. No front can regress the ~15-21 already-certified scenes.

**Conflicts / watch-items:**
- **Eligibility-flag leakage (Front C).** The `enableRefine` / `FractalDefinition.shader` flag MUST originate only from the MB3D importer's emitted defs. If it leaks onto a native formula, that scene recompiles with the refine loop and could shift pixels. The spec's registry-walk guard (assert no native def carries it) is mandatory.
- **Palette caveat is permanent (Front A, L3).** L3 maps only the in-header `LCols` anchors; the artist's external `.map` is dropped. L3 renders will *never* be fully faithful in colour — flag it in the import ledger and keep certification at "geometry + framing + lighting," not "pixel-faithful colour."
- **No code conflict, but converging on the same files at the seam.** Front A and Front C both wire through `emitFusedHybrid.ts` (lighting preset vs `refineSteps` quality override) and the importer's override block. They touch different keys, but land them on separate commits to keep the cross-check/cert diffs clean.
- **Calibration unknowns are isolated to Front A.** `K_LIGHT` (intensity factor) and the fog near/far trackbar math are INFERRED and need ref calibration — a Front-A risk only; it does not gate B or C.

---

## 6. One-line bottom line

Ship **Lighting L1** first (universal visual payoff, ~1d), bank the **coverage cheap wins** (U6→U1 + U3 + U8: +~11 scenes, corrects the ADR-0083 misdiagnosis), then the **binary-search DE** loop (fixes the DsyneGrafix dust failure-class), then **Lighting L2/L3** (closes Hyperben2) and the **coverage M-tier** (to ~60% faithful) — three independent fronts, one shared cert harness, none blocking another.
