# gmt-engine — Code Health Worklists

_Auto-regenerated: 2026-05-23T15:49:51.571Z_

Six pools of actionable code-health work. Each has a paste-ready session-starter prompt.
Pick a pool, paste the prompt into a fresh session, work for ~30-90 min, report back.

**Run `npm run health` to refresh counts** before starting a session.

| # | Pool | Best for | Session length |
|---|---|---|---|
| 1 | Routine cleanup | Quick wins, file-local fixes | ~30 min |
| 2 | Production bugs | Has a UX/design decision ready | ~30-60 min |
| 3 | Stale doc rewrites | Retire pre-extraction docs that no longer match code | ~45-60 min per doc |
| 4 | Coverage gap closure | Surface hidden invariants from unaudited files | ~1-2 hours |
| 5 | Fragility audit follow-through | Pre-extraction-era known fragilities | varies; status-check first |
| 6 | Refactor recommendations | Structural changes from audit findings | hours, often a full session |

---

## Pool 1 — Routine cleanup

_Count: 91 + 75 secondary | Source: docs/modules/backlog.md | Last regen: 2026-05-23T15:49:51.571Z_

Auto-extracted from module docs' "Known Issues" sections + Phase 1 surveys' orphan-sweep candidates. Each entry is file:line-cited and tagged by type (`cleanup` / `drift` / `dead-code` / `doc-rewrite-target` / `unused` / `vestigial`).

**Session-starter prompt:**

> Working dir: `h:/GMT/workspace-gmt/dev/`. Read `CLAUDE.md` first (Documentation Conventions especially).
>
> `docs/modules/backlog.md` lists cleanup items + orphan-sweep candidates. Run `npm run health` first to refresh.
>
> Do a focused cleanup pass. Pick ~10-15 highest-impact items by:
> 1. **Dead code** safe to remove (verify via `npm run orphans` + grep)
> 2. **Drift** where comments contradict code (stale JSDoc, wrong paths)
> 3. **Cleanup-opportunity** items localized to one file
>
> Skip: items needing design decisions, items spanning >2 files, items in `docs/audit-2026-05-20/archive/` Known Issues that say "needs UX decision."
>
> Per item:
> 1. Read the file:line cited.
> 2. **Verify the finding is still accurate** — the backlog can carry stale entries (audit was 2026-05-20).
> 3. If accurate and safe: apply the fix. Run `npm run typecheck` between items.
> 4. If stale or already-done: annotate the source entry (in `docs/audit-2026-05-20/archive/**/*.md` or wherever the Known Issues row lives) with `(VERIFIED CLEAN YYYY-MM-DD)` or `(FIXED YYYY-MM-DD)` so the next `npm run health` drops it. See CLAUDE.md "Annotation maintenance."
> 5. If you touch a file with a `@stale` annotation and your work resolves it, REMOVE the `@stale`. See CLAUDE.md.
>
> At end: report items done, items marked stale/clean, anything found that wasn't in the backlog, anything that should be promoted to a refactor task.

---

## Pool 2 — Production bugs

_Count: 2 | Source: docs/modules/bugs.md | Last regen: 2026-05-23T15:49:51.571Z_

Production bugs surfaced by audit, tagged with `@bug PRODUCTION:` in source. Each typically needs a small design decision before code fix.

**Session-starter prompt:**

> Working dir: `h:/GMT/workspace-gmt/dev/`. Read `CLAUDE.md` first.
>
> `docs/modules/bugs.md` lists open production bugs (auto-generated from `@bug PRODUCTION:` markers + module docs' Known Issues). Run `npm run health` first to refresh.
>
> For each open bug:
> 1. Read the cited file:line and the originating followup at `plans/doc-audit-state/survey/_followups/q-NNN.md` if linked.
> 2. **State the design choice the bug requires** before coding (e.g. error UI shape, fallback behaviour) and confirm with me if non-trivial.
> 3. Apply the fix. Add a regression note in the relevant module doc Known Issues with `(FIXED YYYY-MM-DD)`.
> 4. Remove the `@bug PRODUCTION:` annotation at the source site.
> 5. `npm run typecheck` clean before moving on.
>
> At end: report fixes applied, design choices made, and any bugs you couldn't address without more input.

---

## Pool 3 — Stale doc rewrites

_Count: 8 | Source: plans/doc-audit-state/phase-2-disposition.json | Last regen: 2026-05-23T15:49:51.571Z_

Pre-extraction docs in `docs/engine/*` and `docs/gmt/*` that the audit's disposition matrix classified as `rewrite` or `migrate-target`. These docs no longer match current code (e.g. aspirational APIs that don't exist, wrong path references, removed features). Rewriting them is its own work stream — not bug-fix, not cleanup.

**Session-starter prompt:**

> Working dir: `h:/GMT/workspace-gmt/dev/`. Read `CLAUDE.md` first.
>
> Pick ONE doc from `plans/doc-audit-state/phase-2-disposition.json` entries with `disposition: "rewrite"`. Each entry has `preservable_signal` listing what to carry forward and `evidence_refs` pointing at survey + summary that justify the rewrite.
>
> Decide first: rewrite in place, or archive + write a fresh JSDoc/ADR replacement and mark the old doc `@stale`. The audit's recommendation is the latter (don't edit pre-extraction docs); your call per-doc.
>
> If rewriting: pull preservable_signal as a "Historical context" / "Design rationale" appendix in the new artifact. Then update CLAUDE.md if any "Read first" row pointed at the old doc.
>
> Stop after one doc. Report what you did and why.

---

## Pool 4 — Coverage gap closure

_Count: 219 + 70 secondary | Source: plans/doc-audit-state/scripts/reconcile-coverage.mjs | Last regen: 2026-05-23T15:49:51.571Z_

Files no Phase 1 subsystem ever audited. Sample of 8 found 5 with hidden invariants — gap is real but unevenly distributed. Larger areas: `components/*` (40), `engine-gmt/components/*` (25), `utils/*` (23), `engine-gmt/gallery/*` (12), `data/help/*` (17). See `docs/audit-2026-05-20/state/coverage-sample-report.md` for prior sample findings.

**Session-starter prompt:**

> Working dir: `h:/GMT/workspace-gmt/dev/`. Read `CLAUDE.md` first.
>
> Run `node plans/doc-audit-state/scripts/reconcile-coverage.mjs` and identify a clustered area to close (e.g. `components/*` flat files, or `engine-gmt/gallery/*`).
>
> For the chosen area:
> 1. Read each file top-to-bottom.
> 2. For each load-bearing file: add top-of-file JSDoc with purpose, invariants, integration seams. Use `@invariant`, `@bug PRODUCTION:`, `@see docs/adr/NNNN` markers per CLAUDE.md conventions.
> 3. For pure tertiary files (icon catalogs, type-only modules, barrel files): note in a single sentence at the top and move on; no per-export JSDoc.
> 4. If you find a real bug, add `@bug PRODUCTION:` and surface in your final report.
> 5. If you find a missing-subsystem-level gap (e.g. an entire area that needs its own design doc), surface it for design review — don't try to write one inline.
>
> At end: report files closed, surprises found (hidden invariants, bugs, design gaps), and any subsystem-level proposals for human review.

---

## Pool 5 — Fragility audit follow-through

_Count: 18 | Source: docs/engine/20_Fragility_Audit.md | Last regen: 2026-05-23T15:49:51.571Z | note: pre-audit tracker — status mixed; per-entry re-audit needed before action_

The engine's own pre-extraction tracker (F1-F18). Status mixed — some addressed during the extraction, some still open. Per-entry status hasn't been re-audited since the 2026-05-20 doc audit.

**Session-starter prompt:**

> Working dir: `h:/GMT/workspace-gmt/dev/`. Read `CLAUDE.md` first.
>
> `docs/engine/20_Fragility_Audit.md` tracks pre-extraction fragility findings (F1-F18). Status mixed and possibly stale.
>
> Phase 1: **re-audit** the status of each F-entry. For each:
> 1. Read what the entry claims (problem + proposed fix).
> 2. Check current source code to see if it's fixed, partially fixed, or still open.
> 3. Annotate the doc inline with `(VERIFIED FIXED YYYY-MM-DD)`, `(STILL OPEN YYYY-MM-DD)`, or `(PARTIAL — <what's left> YYYY-MM-DD)`.
>
> Phase 2 (optional, only after Phase 1): pick 1-2 STILL OPEN entries and address them. Don't try to close all in one session.
>
> At end: report the status map (how many of F1-F18 are verified-fixed vs. still-open vs. partial) and whether anything looks more urgent than the doc framed it.

---

## Pool 6 — Refactor recommendations

_Count: 5 | Source: HEALTH.md (inline list under Pool 6) | Last regen: 2026-05-23T15:49:51.571Z | note: WorkerProxy<TRenderState>, drop cameraSlots as any, relocate LoadingRenderer*, relocate ViewportRefs.ts, split PreviewCanvas.tsx_

Structural changes surfaced by the audit's Sub-B summary. Each is hours of work; pick ONE per session.

1. **`WorkerProxy<TRenderState>` generic param** (q-081) — `engine/worker/WorkerProxy.ts` is currently `any`-typed for the render state slot; making it generic would propagate stronger types through the worker boundary.
2. **Drop `cameraSlots as any` cast** (q-066) — `engine/plugins/camera/presetField.ts` carries an `as any` cast that the new type-augmentation rules (`docs/engine/16_Type_Augmentation.md`) should obviate. Audit-then-fix.
3. **Relocate `LoadingRenderer*` to app-gmt** (q-091) — currently in engine-gmt; the loading splash is app-specific and belongs in `app-gmt/`. Refactor path: move files, update imports, run smoke tests.
4. **Relocate `ViewportRefs.ts` to engine/viewport/** (q-080) — currently floating at `engine/worker/ViewportRefs.ts`; belongs with the viewport plugin code. Pure file-move + import update.
5. **Partial split of `PreviewCanvas.tsx`** (q-116) — `mesh-export/preview/PreviewCanvas.tsx` is a 3-mode mega-component; followup proposes splitting one mode out (probably the SDF-eval debug mode) to a sibling file.

**Session-starter prompt:**

> Working dir: `h:/GMT/workspace-gmt/dev/`. Read `CLAUDE.md` first.
>
> Pick ONE of the 5 refactors from HEALTH.md Pool 6. Each is hours of work and structural — don't try multiple in one session.
>
> Process:
> 1. Read the cited followup at `plans/doc-audit-state/survey/_followups/q-NNN.md` (if linked) for the proposed shape.
> 2. Read the file(s) involved + all importers (`npm run orphans` or grep for the symbol).
> 3. Propose the refactor as a 3-5 step plan BEFORE editing. Confirm with me if any step is non-obvious.
> 4. Execute step-by-step. `npm run typecheck` between steps.
> 5. Run smoke tests at the end (`npm run smoke:boot` + relevant area smoke).
> 6. If the refactor surfaces an ADR-worthy decision (e.g. why you chose A over B), write a new ADR.
>
> At end: report what shipped, smoke results, and any follow-on items surfaced for the backlog.

---

## How to add a new pool

If a new code-health source emerges (e.g. a new pre-existing audit, a security review, a perf-regression backlog), add:

1. A new `## Pool N — <name>` section to this file with: count line, "Best for" / "Session length" entries in the table at top, source pointer, and a session-starter prompt.
2. A `poolXxx()` function in `plans/doc-audit-state/scripts/extract-health.mjs` that counts entries from the source.
3. A `patchPool('xxx', '##\\s*Pool N')` call in `extract-health.mjs`.

Keep the pool count manageable (≤8). If you find yourself splitting one pool into many, the original was probably the right grain.

## How to retire a pool

If a pool empties durably (e.g. all bugs fixed, full coverage closure), drop its section and the corresponding `extract-health.mjs` function. Don't keep empty pools around — they're discovery noise.
