# Session: MB3D scene-unlock recon — which scenes can still be unlocked?

**Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` (NOT pushed). **MB3D source:** `/h/tmp/mb3d-src/`.
**Live tracker:** `plans/mb3d/EXECUTION-STATUS.md` (read the "▶ NEXT SESSION" banner first).

## Mission
Re-triage the MB3D corpus and answer: **which scenes can still be unlocked** (made to render faithfully),
what's the **specific fix** for each, and which are **hard walls**. Produce an updated coverage count +
a **prioritized unlock plan**. The previous "33/80 faithful" is STALE — this session's fixes (below)
recovered scenes, so **re-measure the corpus count as step 0.**

## What changed since the last triage (build on, don't re-derive)
- **Faithful marcher** (ADR-0088): imports march with MB3D's damped step (overstep clamp + RSFmul
  damper + msDEsub safety-sub). Compile-gated (`quality.mb3dFaithful`), auto-on for `.m3p` imports.
- **Euclidean metric** (`ac98603`): all imports now Euclidean `r` (was wrongly Chebyshev).
- **deBailout = rStop²** (`7bd6379`): un-clamped from 1000 (was bailing fold orbits at r²>1000, erasing
  structure). Recovered Recycledrelatives' fan + HalTenny-FoN + Jost1.

## The triage (the work)
0. **Re-measure.** Render the bundled set (`npx tsx debug/cert-render.mts` — real GPU, needs the dev
   server on :5173) and build the 3-way sheet (`node debug/mb3d-contact-sheet.mjs` →
   `H:/GMT/refSoftware/MB3D/cert/contact-sheet.html`). For the BROADER corpus (80 scenes) beyond the 32
   bundled, use the `.m3p` set + `scan-mb3d-scenes.mts` / `corpus-check`. (`gen-sample-scenes.mjs`
   regenerates the bundled list from the corpus — run it after any unlock so new faithful scenes reach
   the in-app list.)
1. **Categorize every scene** into:
   - ✅ **FAITHFUL** — renders + matches the MB3D ref (geometry + framing; colour differs by design).
   - ⚠ **RENDERS-WRONG** — imports but diverges. Record the symptom (dust / holes / over-fold / framing /
     colour) AND whether it's fixable + how.
   - ⛔ **BLOCKED** — doesn't import. Identify the GATE (decompiler op, const-pack, weave mode,
     indirect-call) from the ledger / `scan-mb3d-scenes`.
2. For each ⚠/⛔, name the **specific unlock** (the decompiler / importer / kernel change) and estimate
   **scenes-gained**.
3. **Prioritize:** cheapest-per-scene unlocks first; separate the **hard walls** (loop-blocked formulas,
   weave-mode DEcombine, the intern-AmBox convergence class).

## Known walls / banked (don't re-chase without NEW info)
- **Hyperben2 / Theli / QuatP4** — intern Amazing-Box (#4) **convergence gap**: GMT's intern AmBox keeps
  folding where MB3D's settles by ~40 iters, so box+Menger hybrids over-fold (extra planes) at the
  authored MaxIter=2000. BANKED with workarounds (`coreMath.iterations ~40` + `estimator 4`). It is NOT
  the c-add (removing `+c` from intern #4 was tried → regressed every AmBox scene → reverted; `c` is
  `inout`, added in-body, needed everywhere). The real dig (if attempted): orbit-by-orbit sim of GMT's
  intern #4 (`slotTranspiler.ts` INTERN[4]) vs MB3D's disassembled `_AmazingBox` `[CODE]`
  (`M3Formulas/_AmazingBox.m3f`, `dis.mjs`) to find why GMT's doesn't settle.
- **Oxnot — Shells** — suspected genuine math error (output saved). **DsyneGrafix — Getting Loopy** —
  renders as dust; user has a separate fix lead.
- **Decompiler/coverage gates** (`plans/mb3d/research/coverage-unlocks.md`): U9 second-base/stack-array
  mem (~41 formulas), weave **modes 1-3** (DEcombine = a two-orbit kernel, engine-core), HeightMapIFS
  **indirect-call** (`call [esi+0x10c]` → compiled sampler, not in `[CODE]`).

## Lessons to apply (this session paid for these)
- **Verify importer DE-param mappings against MB3D SOURCE + behavior** (metric / estimator / bailout /
  clamps / iterations) — NOT GMT's defaults or its own justifying comments. Both big bugs this session
  (Chebyshev metric, deBailout-clamp-1000) were wrong-but-uncaught because they were validated GMT-vs-GMT.
- **A body-level change to a SHARED intern formula needs VISUAL verification across ALL its scenes** (esp.
  standalone) before commit — `nbFraction` coverage is blind to over-fold / wrong-look.
- **When every computed value checks out but the render is wrong, question the clamps/caps** taken as given.
- The corpus cross-check (`xcheck`) has a blind spot (seeds consts identically both sides) → a
  wrong-but-consistent decode reads 0-mismatch yet renders wrong. GPU-cert any decode/const change.

## Output
- Updated corpus count (faithful / wrong / blocked) + a per-scene category table.
- A prioritized unlock list (scenes-gained per fix), separating cheap unlocks from hard walls.
- Commit the table + plan to `EXECUTION-STATUS.md` and a triage doc under `plans/mb3d/research/`.

## Gates
`typecheck`, `test:mb3d` (24), `test:mb3d:weave` (58), `corpus-check` (279/0), `check:mb3d-decompiler`,
`cert-render.mts` (real GPU — user/this-session-permitted). No render/importer behavior change without a
gate pass + (for shared-formula or DE-param changes) a GPU visual pass.
