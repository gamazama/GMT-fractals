# Session prompt — MB3D importer v1: review the GMT-shared surface + document direction + merge to main

**Prepared:** 2026-07-03 · **Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` (145 commits ahead of main, NOT pushed).

**Purpose.** Get the MB3D importer to a reviewed, documented **v1** and merge it to `main`, so the next initiative
(the N-formula weave unification, `S-nformula-weave-unification.md`) builds on a merged base instead of a long-lived
branch. This is a **merge-prep** session, not new features.

## Why this is safe to scope tightly

The branch changed **150 files**, but they split cleanly:
- **68 `mb3d/`-only files** (`engine-gmt/utils/mb3d/*`, `decompiled-formulas.ts`, `sampleScenes.ts`, the import modal) —
  isolated; they can't affect native GMT because nothing outside the importer path calls them. Review for quality, but
  they are **not** the merge-risk surface.
- **~17 GMT-SHARED files** — these change how *native* GMT compiles/renders, so they ARE the merge-risk surface and get
  the real scrutiny:
  - `engine/fractal/fractalKernel.ts`, `engine/fractal/iterationPolicy.ts`, `engine/fractal/GradientLutManager.ts`
    — the **domain-agnostic core** (`engine/`, not `engine-gmt/`). Highest sensitivity: an MB3D assumption leaking here
    violates the "no fractal language in engine/**" rule (CLAUDE.md).
  - `engine-gmt/shaders/chunks/trace.ts` (+108), `de.ts` (+266), `material_eval.ts` — the shader kernel (faithful marcher,
    4D-coord path, est7 numeric DE).
  - `engine-gmt/engine/ShaderBuilder.ts`, `engine-gmt/features/core_math.ts`, `engine-gmt/features/quality.ts` (+149) —
    the compile pipeline + the quality params.
  - `engine-gmt/utils/uniformSlots.ts` (+316, the LaneAllocator), `.../workshop/param-builder.ts` (+88),
    `.../transform/variable-renamer.ts` — the param/uniform machinery the N-formula work will build on.
  - `engine-gmt/panels.ts`, `.../FormulaParamsWidget.tsx`, `.../FormulaSelect.tsx`, `engine-gmt/types/fractal.ts`,
    `components/PerformanceMonitor.tsx` — UI/manifest surface.

## Prompt

Prepare the MB3D importer branch `feat/mb3d-importer` (at `h:/GMT/workspace-gmt/stable`) for a **v1 merge to main**.
Three parts; commit per logical step; don't push until I approve the merge.

### Part A — Review the GMT-shared surface (no GPU needed)
Run a code review of the **~17 GMT-shared files** the branch changed vs `main` (list them with
`git diff main...HEAD --name-only -- engine engine-gmt app-gmt components store | grep -vE 'utils/mb3d/|ImportMandelbulb3D|decompiled-formulas|sampleScenes|/mb3d/'`). Use the code-review skill — either invoke `/code-review`
or just review the diff directly. For each shared file answer, with evidence:
1. **Does it regress native (non-import) GMT?** The compile-gated additions (faithful marcher, est7 auto-route, 4D-coord
   path) all claim **byte-identical-off** — verify a native scene emits unchanged GLSL (the ADR-0088 / ADR-0085 guarantee).
2. **Did an MB3D assumption leak into generic code?** Especially the three `engine/fractal/*` files — `engine/**` must stay
   domain-agnostic (CLAUDE.md). Anything fractal-/MB3D-specific there is a finding.
3. **Are new shared exports (uniformSlots LaneAllocator, param-builder changes) clean and reusable**, since the N-formula
   work will consume them?
Fix what the review surfaces; anything requiring a render change → flag it for the GPU pass in Part C.

### Part B — Document the v1 direction (no GPU needed)
Write `plans/mb3d/V1-STATUS.md`: **what v1 ships** (deterministic parse→weave→fuse; x87+SSE2 decompiler at 333/0 corpus;
faithful marcher ADR-0088 perf-cleared; Euclidean metric + deBailout=rStop²; camera/lighting/material import; est7 no-ADE
auto-route; 38 bundled scenes; the standalone formula library) and the **clear remaining-work direction** (the DE-fidelity
front — 4D escape / Oxnot step-floor / Hydra z0 / U7 two-orbit, per `EXECUTION-STATUS.md`; the **N-formula weave
unification** as the next major initiative; colour/shading fidelity; the Tier-3 walls — texture pipeline, IEEE bit-model,
genuine-loop CFG). This is the on-record direction I want before the merge.

### Part C — Merge to main as v1 (needs my GPU glance + my merge-strategy call)
Only after A+B: run the full gate suite (`typecheck`, `test:mb3d` 24, `test:mb3d:weave` 58, `test:mb3d:refine` 46,
`corpus-check` 333/0, `check:mb3d-decompiler`). Then **ASK me** (a) to run the real-GPU regression glance — a few *native*
GMT scenes render unchanged + the 38 MB3D scenes still cert (I drive the GPU) — and (b) the merge strategy (squash the 145
commits into a coherent v1 history, or a merge-commit preserving it). Do **not** merge the untracked `debug/` probes or WIP
scratch — path-scope the merge to the importer feature + the reviewed shared changes. Merge only on my go.

**Gates:** as above + native-regression GPU glance + 38-scene cert before merge. Parts A+B are fully no-GPU (do them now);
Part C waits on my GPU availability.
