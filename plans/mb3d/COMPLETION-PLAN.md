# MB3D Importer — Completion Plan

**Date:** 2026-06-27 · **Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` · **HEAD:** `a3b0166`

A single staged path to take the MB3D importer to "complete." Synthesizes the full plan
surface: `ROADMAP.md` (front sequencing), `fidelity-pass-SESSION.md` (the live deepen plan),
`coverage-unlocks.md` (the U-series widen plan), `certification-handoff.md` (scene-by-scene
status), `converter-design.md` (architecture), and ADRs 0083/0084/0085.

> This is the **orchestrating** doc. The per-front specs above remain the detailed reference;
> this file defines *what "done" means* and *the order to get there*. It does not restate their
> file/line cites — follow the links.

---

## 1. Where it stands (the hard part is done)

Geometry is solid and green: **279 formulas decompile with 0 cross-check mismatches**, the
fused-hybrid weave is geometry-correct, **~19/20 bundled scenes certify on geometry+framing**.
Shipped on this branch since the last roadmap: **lighting L0–L3** (camera/lights/material/
palette), **surface-refinement DE** (ADR-0084, opt-in), and the **numerical finite-difference
DE estimator** (ADR-0085 — the real DsyneGrafix dust fix). HEAD is the docs commit; the
fidelity-pass work is planned but not started.

What remains is **not new R&D** — it is three orthogonal, well-scoped fronts (disjoint code,
one shared cert harness, none blocking another) plus a declared permanent ceiling.

## 2. Definition of "complete"

| Dimension | Bar | Out of scope (permanent ceiling) |
|---|---|---|
| **Coverage** | **target ~60/80 faithful (75%)** — re-baselined against real results each stage (see note) | weave modes 1/3 (0 scenes in corpus); the *irreducible* loop-blocked remainder, whatever it proves to be |
| **Fidelity** | imported scenes match the MB3D ref on geometry + framing + **lighting + DE quality + fog** | external `.map` palettes (unrecoverable — best-effort, flagged); deep-zoom interior scenes (spineJulia class) |
| **Hygiene** | dead code gone, decompiler-drift trap closed, scratch swept, docs honest | — |

Naming the ceiling is what makes "complete" reachable — external `.map` hue and interior/deep-zoom
scenes are declared known gaps in the ledger.

> **Coverage bar = 75%, calibrated empirically.** The user set ~60/80 (75%) as the goal. The
> U-series **as currently specced projects only ~48/80 (60%)** — cheap wins → ~33, M-tier → ~48,
> with ~12 loop-blocked formulas framed as the ceiling. So **75% is above the as-specced ceiling**:
> reaching it means Stage 3 must also pull in the deep tier (**U9** second-base/stack-array mem,
> ~41 formulas; **U7** weave-mode-2 compounding) and genuinely shrink the loop-blocked set rather
> than accept it. That may or may not be realistic — **re-baseline the faithful-scene count after
> each stage** (run the 80-scene corpus survey) and let the real trajectory set the final bar. If
> the honest ceiling lands at, say, 65%, we say so and stop there rather than chase diminishing
> returns. The 75% is the driving target, not a guaranteed deliverable.

## 3. The stages (recommended order)

### Stage 0 — Foundation hardening  ·  ½ day  ·  **IN PROGRESS**
Protects every later stage. Mostly the "debt warm-up" already scoped in `fidelity-pass-SESSION.md`.
- [ ] Delete superseded `engine-gmt/utils/mb3d/mapFormula.ts` + `mapScene.ts` + `debug/test-mb3d-map.mts`
      (dead since the weave path) and the `test:mb3d:map` package.json script. Confirm `npm run orphans`.
- [ ] **Close the decompiler-drift gotcha for good.** Canonical decompiler is `/h/tmp/mb3d-decomp/`;
      the repo `plans/mb3d/decompiler/` copy has silently drifted twice (cost real time both). Add a
      sync-check gate (diff the two `.mjs`, fail on mismatch) OR make the repo copy canonical
      (vendor `capstone-wasm`). Single highest-leverage infra fix.
- [ ] Sweep the ~80 untracked `debug/_*.mts` / `probe-*.mjs` scratch (gitignore the throwaway prefixes).
- [ ] Lock the calibration scene set (Torii, ABoxScale2, Hyperben2, AureliusCat, DsyneGrafix) as the
      standing cert harness — all later stages gate on it.

### Stage 1 — Fidelity pass  ·  the live `fidelity-pass-SESSION.md`
Make the scenes we *already* import look like the reference. Agent-driven (reads `Calc.pas`).
1. **De-empiricize the `.m3p → quality` mapping** — replace hand-tuned constants
   (`emitFusedHybrid.ts:270,298,303,308`) with source-grounded values; **fix `deOption 11 → estimator`
   (should be 2, not 1)** + the non-analytic fallback. Re-cert the 20 scenes.
2. **Finish numeric-DE lighting** — noisy normal + broken shadows (ADR-0085 over-claimed). Separate
   larger normal probe + smoother shadow path; reconcile the ADR.
3. **Apply fog** — `DepthCol/DynFog*` parsed but never written to `atmosphere.fog*`. The named
   **Hyperben2-Ozosphere** washout fix.

### Stage 2 — Coverage cheap wins  ·  `coverage-unlocks.md` U3 → U6 → U1 → U8
All S/S–M, cross-check-gated, **+~11 scenes (22 → ~33)**. U1 (PAligned16 `Cp` const-pack) is the
headline and **corrects the ADR-0083 misdiagnosis** — it's a compile-time table at
`DivUtils.pas:1616-1644`, not a runtime-dump problem.

### Stage 3 — Coverage M-tier  ·  U2 → U5 → U7 → U4
Biggest absolute breadth, **→ ~48 scenes (60%)**. U2 (dIFS `Cm88+` packer, +≥13) = best single ROI;
U5 (forward-branch structuring, ~53 formulas) likely makes U4 (`sphereIFS`, +7) nearly free; U7
(weave mode 2) compounds. **Re-baseline the corpus survey here** — this is the 60% checkpoint.

### Stage 3b — Deep tier (the 75% push)  ·  U9 + U7-compound + U10 re-triage
Only needed to clear the 60%→75% gap (the user's bar). **U9** (second-base register `[ebx]/[edx]` +
stack-array `[esp+edx+N]` tracking, ~41 formulas — Beth*/Msltoe/ducksIFS/gnarly*IFS) is the big
lever. **U10 re-triage:** the coverage spec found only ~12 formulas are *genuine* data-dependent
loops; ~54 "backward jumps" are structurable block-reorder gotos recoverable via the existing
`detectOOL` — so part of the "loop ceiling" is actually addressable. Pursue only as far as the
realistic trajectory justifies; if it stalls below 75%, declare the honest ceiling and stop.

### Stage 4 — UX / library finish  ·  optional polish
- Surface the import ledger (faithful / code-sub / unsupported per slot) in the modal.
- The user-flagged **in-app hybrid builder** (pick a base fractal + transforms → weave standalone,
  no `.m3p`) — natural next library feature now that 180 standalone formulas load.

## 4. Sequencing rationale

Stage 0 first (protects everything). Then **fidelity before coverage**: the scenes we already ship
should look right before we add more geometrically-correct-but-grey ones, and Stage 1 is the live,
fully-scoped plan. Stages 2/3 are independent and can run in either order relative to Stage 1 — the
fronts touch disjoint code (parse/preset vs decompiler/packer vs kernel). The one genuine fork is
**deepen-first vs widen-first**; it's a priority call, not a dependency.

## 5. Standing invariants (every stage)
- **Gates green:** `npm run typecheck`, `test:mb3d`(24) / `:weave`(42) / `:refine`(46), decompiler
  `corpus-check.mjs` (279/0), and `cert-render.mts` on **real GPU only** (headed Chrome → ANGLE),
  never headless SwiftShader.
- **No regression** on the ~19 certified scenes. Lighting gates on `lights.length > 0`; coverage is
  cross-check-gated; refinement compiles byte-identical when off.
- **Decompiler lockstep:** `decompile.mjs` + `xcheck.mjs` change together; regenerate from `/h/tmp`,
  copy back to `plans/` (until Stage 0 closes the drift trap).
- Write an ADR for any load-bearing mapping decision.
