# Audit 2026-05-20 — archived process state

This directory contains the audit's working artifacts — process state, harvests, reviews, and one-off mapping docs that served their purpose during the run and don't need to remain on the working path.

**Contents:**

- `audit-overnight-kickoff.md` — original plan that kicked off the overnight audit
- `LOOP_PROMPT.md` — Phase 1 / 1.5 iteration protocol (each loop iteration ran against this)
- `HANDOFF_2026-05-20-0835.md` — interim handoff doc written when session-budget was running low mid-audit
- `phase-2-brief-draft.md` — Phase 2 module-doc writer brief (used by 5+ writer agents)
- `phase-2-new-subsystems.json` — profiled e09b + g11 (and later g12) entries; integrated into `subsystems.json`
- `phase-2-carry-in.json` — cross-cutting signal index used during writer iteration
- `claude-md-additions.md` — coordination file harvested by application agents
- `coverage-sample-report.md` — spot-check of 8 uncovered files
- `related-findings-map.md` — late-stage mapping of Related findings → known-issue trackers
- `harvest/` — 5 harvest files produced during the JSDoc/ADR/CLAUDE.md migration
- `reviews/` — 19 self-review docs (review-2026-05-19-1 through review-2026-05-20-19)
- `review-log.md` — append-only summary of every review tick
- `review-state.json` — Sub-B review-cadence state at audit-end
- `protocol-feedback.json` — audit's own protocol-feedback channel (f-001 through f-005)
- `open-questions.json` — Sub-B's 120 questions (all terminal: 119 answered + 1 duplicate)
- `progress.json` — append-only progress log

**What's NOT here (still live at `plans/doc-audit-state/`):**

- `scripts/` — reusable tooling (`npm run health` and others)
- `subsystems.json` — referenced by `reconcile-coverage.mjs`
- `coverage.yaml`, `file-inventory.yaml` — referenced by coverage tooling
- `phase-2-disposition.json` — read by `extract-health.mjs` for the "stale doc rewrites" pool
- `survey/` — 28 surveys + 119 followups + 9 docs-existing summaries; linked from `docs/modules/bugs.md` and `backlog.md`

If you need to look up the audit's history, start with `audit-overnight-kickoff.md` and `LOOP_PROMPT.md`. The `reviews/` series shows decision-making during the run.
