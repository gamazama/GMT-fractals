## review-2026-05-19-1 — 2026-05-19T20:26:17.167Z

- 2 LOOP_PROMPT.md edits applied: clarify protocol-feedback scope (Section 6); add Recommendation escalation line to Drift table (Section 3).
- f-001 closed as wont-fix (addressed by Edit 2; planner decision deferred to Phase 2).
- f-002 closed as wont-fix (code bug, not protocol).
- Counter reset. Next review at iter_since_review>=5 or open_feedback>=3.
- Human note: existing engine/ docs likely have widespread drift; planner-level call needed on rewrite-vs-migration-target.

## review-2026-05-19-2 — 2026-05-19T20:58:49.739Z

- Zero LOOP_PROMPT edits proposed. System healthy after review #1 changes.
- Verified: protocol-feedback channel now clean (no code/doc findings mis-filed).
- Verified: Recommendation: slot used with discrimination (3 emissions, no overuse).
- Pattern: 3 primary subsystems (e01, e06, e07) flag same rewrite-vs-migrate planner question. User has confirmed Path A.
- Pattern: cross-subsystem theme — "no uniform plugin contract" — worth carrying into Phase 2.
- Counter reset.

## review-2026-05-19-3 — 2026-05-19T21:30:56.640Z

- 2 edits applied: extend blob-sha.mjs to multi-arg (Edit 1); add Orphan-sweep candidate: prefix to Open Questions guidance (Edit 2).
- f-003 closed addressed (Edit 2; formal orphan-sweep deferred to post-Phase-1).
- f-004 closed addressed (Edit 1; brief + script extension).
- Counter reset.
- Human note: three planner items now stacked for Phase 2 kickoff (Path A confirmed; no-uniform-plugin-contract theme from e07; Phase 1.6 orphan-sweep design).

## review-2026-05-20-4 — 2026-05-19T22:10:28.227Z

- 2 edits applied: tighten Orphan-sweep prefix wording (Edit 1); surface YAML block-syntax consequence in preamble (Edit 2).
- 0 open protocol-feedback items entering tick; 0 changes.
- Inline orchestrator fix this window: parser extended to handle YAML flow syntax; brief updated to require block.
- Pattern: orphan-sweep nominations flowing (16 canonical + 4 lowercase variant from g04 — Edit 1 prevents recurrence).
- Pattern: engine-gmt drift materially larger than engine-core drift (expected — pre-extraction docs).
- Human note: 4 aspirational docs now recommend rewrite (02 Feature, 04 Core Plugins, 05 Shared UI, 10 Viewport). Path A confirmed earlier, decision still applies.

## review-2026-05-20-5 — 2026-05-19T22:47:17.603Z

- Zero LOOP_PROMPT edits proposed. Loop self-improvement cycle closing cleanly.
- Orphan-sweep prefix discipline now 100% canonical (25/25 in g05-g09 window) — Edit 1 from review #4 fully effective.
- 22 of 37 subsystems done. 34 total orphan-sweep candidates (29 canonical + 5 pre-edit variants).
- Phase 1.5 projection: ~80-120 raw open questions, ~45-60 orphan-sweep entries at Phase 1 end.
- Counter reset.

## review-2026-05-20-6 — 2026-05-19T23:25:23.774Z

- Zero LOOP_PROMPT edits. Second clean tick in a row.
- Inline orchestrator fix this window: summarize-existing brief tightened after d03 bare-paths issue.
- Pattern: g04 yaml-flow + d03 bare-paths = same root cause (frontmatter spec variance). Watchlist for review #7.
- Operational caveat: d03 blob_shas were synthesized from disk post-hoc; Phase 2 should re-snapshot or annotate.
- Human note: 5+ aspirational doc rewrites stacked; Phase 1 will end in ~7 more iterations.
- Counter reset.

## review-2026-05-20-7 — 2026-05-20T00:05:50.464Z

- 1 edit applied: positive frontmatter example block in summarize-existing brief (pivots from negative enumeration after 3 shape variants).
- 0 protocol-feedback changes.
- Inline orchestrator fix this window: d08 scalar-lines_read parser tolerance.
- Phase 1 at 34/37 (92%). t01/t02 next, then Phase 1.5 begins automatically.
- Human action sequence captured in review for Phase 2 prep (5 steps).
- Counter reset.

## review-2026-05-20-8 — 2026-05-20T00:43:39.671Z

- 1 edit applied: Sub-phase B cadence relaxation from iters>=5 to iters>=10 (conditional, reversible, preserves open-feedback-3 backstop).
- 0 protocol-feedback changes.
- Phase 1 wall-clock: ~4.5 hours (a01 19:56Z → t02 00:19Z). Well inside overnight target.
- Sub-phase A overshot primary projection by 10% (76 vs 70 upper bound); triage calibration looks fine per q-001/q-002 quality.
- Sub-phase B remaining wall-clock projection: 4-7h (76 primary + 43 low at ~3-4 min each).
- Pattern noted in q-001+q-002: _isSceneReady dead param, isHydrated misnomer, 30s silent-timeout UX bug — Phase 2 carry-ins.
- Counter reset.

## review-2026-05-20-9 — 2026-05-20T01:27:49.077Z

- Zero edits. First review under relaxed Sub-phase B cadence (>=10) validated.
- Cadence saved ~10-14 min wall-clock + one agent-context spend; nothing went undetected.
- Frontmatter shape variance in followups (2/10 deviants) absorbed by orchestrator path-extractor regex; no brief tightening needed.
- Question quality genuine: file:line citations, cross-cut insights, tight 35-96 line followups.
- No cost-guard hits (all <=7 files except q-013 at 9).
- Counter reset.
- Phase 2 signal captured: set-FeatureId action convention, featureId.paramKey_axis track-id convention, two-registry boot pattern.

## review-2026-05-20-10 — 2026-05-20T02:12:25.720Z

- Zero edits. Second clean Sub-phase B cycle at >=10 cadence.
- 8/10 followups produced Phase 2 carry-in signal (PanelManifest API + freeze workaround, presetFieldRegistry surface, stale anchors, backingOnly enforcement).
- q-019 remains the only real production bug found (DuplicatePresetFieldError on app-gmt double-register).
- Avg ~3.7 min/iter (faster than projected).
- Cadence extension to >=15 not warranted; q-019-visibility argues for keeping current cadence.
- Counter reset.

## review-2026-05-20-11 — 2026-05-20T02:55:00Z

- 1 edit applied (Edit 2): tightened Sub-B frontmatter brief — enumerate all 9 known wrong field names, require `files_consulted` even for pointer-backs. Frontmatter variance returned to 4-5/10 this window after a clean prior window (agent did NOT self-stabilise).
- 1 edit proposed but NOT applied (Edit 1): Sub-A retrospective — detect explicit-defer questions ("reserved for X", "out of scope here") at triage and annotate with `defer:<id>` so Sub-B agents produce pointer-backs cheaply. Surfaced as human-action candidate (one-shot re-triage pass over remaining 87 pending could collapse 10-15 iterations).
- 0 protocol-feedback changes.
- Phase 2 carry-in density holds at ~8/10 (q-029 silent uniform collisions in two paths, q-040 caught wrong field names in e06 survey, q-041 viewportSlice ownership map, q-034+q-037 BloomPass two-site composition, q-032 17-position shader contract).
- Zero new production bugs this window — q-019 still the sole find. Bug-surface rate now 1 in 22 followups.
- Pattern: followups catching survey errors is recurring (q-040 = 2nd instance after q-019-class corrections). Phase 2 should prefer `_followups/*.md` over survey field-name lists where they overlap.
- Counter reset.

## review-2026-05-20-12 — 2026-05-20T03:43:20.617Z

- Zero edits. Three clean ticks in a row. Cadence held at >=10.
- Edit 2 from review #11 fully worked: 10/10 canonical frontmatter this window.
- Correction rate 50% (5/10 followups corrected surveyor errors): q-052, q-053, q-056, q-060, q-061.
- Phase 2 carry-in density ~8/10 steady; q-054 (SceneIO loader) is highest-value followup of the run.
- Bug rate 1 in 32 (q-019 still sole production bug).
- Recommendation: hold >=10 for #13; if clean, extend to >=12 for #14.
- Human action: q-061 recommends new audit slice e09b-state-library-ui for the 3 generic UI primitives.


## review-2026-05-20-13 — 2026-05-20T04:32:00Z

- 1 edit applied (Edit 1): added self-check sentence to the frontmatter blacklist paragraph at LOOP_PROMPT.md:307. "If your draft contains ANY of `id:`, `parent:`, `status:`, `verdict:`, `files_read:` at the top level — stop and start over with the four-name template."
- Frontmatter variance regressed to 1/10 after three clean windows (q-070 full pre-Edit-2 revert).
- First case of followup-correcting-followup: q-071 → q-068 on componentRegistry ownership. Verification working as designed.
- Phase 2 carry-in cumulative: 2 production bugs (q-019, q-064), 2 new uncovered subsystems (e09b, g11-gmt-camera-manager 592L — strongest Phase 1-completion case yet), ~30 doc-rewrite targets, ~15 cleanups, ~5 drift.
- Bug rate trues up to 1 in ~26 followups; expect 2-3 more before Sub-B end.
- Cadence HOLD at >=10. Re-evaluate >=12 at #14 only if all three lagging indicators (variance, bugs, fup-correcting-fup) come back clean.
- Sub-B finish projection: 67 × 3.95 min = ~4.4h wall-clock.
- Counter reset.

## review-2026-05-20-14 — 2026-05-20T07:25:00Z

- 1 edit applied (Edit 1): fixed stale confidence values in LOOP_PROMPT.md — `catalog` → `partial` (line 142, summarize-existing flow) and `targeted` → `high` (line 342, Sub-B coverage append). Inline note added at both sites: `record-coverage.mjs` validates confidence ∈ {high, medium, low, partial}; legacy values are rejected.
- f-005 closed as **addressed** (primary observation was in the orchestrator spawn brief, not LOOP_PROMPT.md — already fixed by orchestrator; secondary observation about confidence values addressed by Edit 1).
- Frontmatter variance held at 0/10 (second clean window after the q-070 regression; Edit 1 from review #13 working).
- Window timing: 4.16 min/iter (slightly slower than prior 3.7-3.95 — heavier-investigation tranche, mean 3.6 files_consulted vs ~2.5 last window). Sub-B remaining ≈3.95h.
- Followup-corrects-survey rate 4/10 — in-band. Three of those are dead-code/vestigial-code identifications (q-094 probe chain, q-095 ShaderBuilder profile block, q-092 typed-optional-but-always-set). Engine-gmt cleanup carry-in now ~18-20 items — recommend dedicated Phase 2 cleanup pass.
- New sub-pattern: shared-UI-primitive coupling to GMT-app concepts (q-088 Knob vs Slider context, q-089 AutoFeaturePanel hardcoded `movePanel('Engine')` + `engine_queue` route). Coherent Phase 2 story for `docs/engine/05_Shared_UI.md`.
- Zero new production bugs (rate stays 2-in-62 = 1-in-31).
- Cadence HOLD at >=10 for #15. Conditions for >=12 at #16: (a) frontmatter 0/10 (third clean window), (b) no new f-NNN, (c) no followup-correcting-followup.
- Phase 2 carry-in signals: q-096 (`docs/gmt/08_File_Structure.md:20` path-vs-semantics mismatch + pending `GmtShaderBuilder` rename from 21_Code_Review:168), q-093 (Fragility Audit gap for `renderer.properties` private Three API + WEBGL_debug_shaders dependency), q-083 (new "claim-graph verifier" correction kind — survey misframed already-claimed files as out-of-scope).
- Counter reset.

## review-2026-05-20-15 — 2026-05-20T08:25:00Z

- Zero LOOP_PROMPT edits. Protocol in stable steady state — three reviews of natural deceleration (#13 self-check sentence, #14 confidence-value cleanup, #15 nothing).
- Frontmatter variance held at 0/10 — third consecutive clean window. Variance solved at protocol level.
- **One new production bug: q-112 `MAX_SKY_DISTANCE` divergence.** `WorkerDepthReadback.ts:151,169` uses `< 1000` for focus-pick while auto-readback uses `< MAX_SKY_DISTANCE` (=50.0). Currently unreachable for shipped formulas but real code drift; doc at `02_Rendering_Internals.md:664` already asserts the constant is shared. One-line fix per site. Running production bug count: 3 (q-019, q-064, q-112), rate 1-in-24.
- No followup-correcting-followup case (q-071→q-068 remains the unique instance).
- Cadence HOLD at >=10 for #16. Re-evaluate at #17 — review #13's condition (ii) "zero new bug surfaces" failed this window (q-112 is real).
- **Dominant content theme: engine vs engine-gmt fork divergence** (6 of 10 followups: q-097..q-102). New cross-cutting Phase 2 deliverable proposal — one consolidated "engine-vs-engine-gmt fork audit" doc covering: parametrisation hooks that look like duplication (q-097), intentional coupling deltas (q-098), doc-path drops (q-099 — 6 sites), stale TODOs in engine-gmt (q-100), optional-vs-required type tightening drift (q-101), hand-maintained union drift (q-102).
- New sub-pattern: "claim revision" framing in q-097 — cite survey claim verbatim, then revise. Recommended as preferred shape for surveyor-flagged item corrections.
- Phase 2 carry-in tally: 3 bugs, 2 uncovered subsystems, ~32-33 doc rewrites, ~18-20 cleanups, ~6-7 drift findings, 1 new cross-cutting deliverable.
- Sub-B progress: ~72 of 76 primary answered (~95%); ~3.5-4.5h projected remaining at the heavier 5-5.5 min/iter timing for cross-fork investigations.
- Counter reset.

## review-2026-05-20-16 (2026-05-20T09:25Z)
- Quiet feedback funnel (0 open, third clean tick). Sub-B fully on low-priority now (primary cleared).
- Applied edit 1: tighten `investigated_at: <ISO>` placeholder text so agents stop emitting midnight-of-day timestamps (55% of followups carried `2026-05-20T00:00:00Z`).
- No feedback items closed (none open).
- Counter reset.

## review-2026-05-20-17 (2026-05-20T09:42Z)
- f-006 (orchestrator anchored q-031 on q-030 paraphrase) marked wont-fix: protocol doesn't document sibling-context handoff — orchestrator stops the ad-hoc pattern. Pass file paths via target_hint instead of paraphrases.
- No LOOP_PROMPT edits this tick. Followups clean (10/10 sampled).
- Counter reset.

## review-2026-05-20-18 (2026-05-20T16:19Z)
- 4th consecutive clean tick (zero open feedback). Midnight-placeholder fix from #16 verified: 7/7 sampled followups carry realistic UTC timestamps.
- Frontmatter shape clean across all samples; orphan-sweep prefix discipline 100%; 8 new candidates flagged this window.
- Cumulative orphan-sweep backlog (~40 candidates) reinforces the deferred post-Phase-1 sweep noted since #3.
- No LOOP_PROMPT edits. Counter reset.

## review-2026-05-20-19 (2026-05-20T17:01Z)
- 5th consecutive clean tick. f-006 wont-fix from #17 verified holding (no sibling-context anchoring in 10 sampled briefs).
- Sub-B end-of-phase signal: q-105 surfaced real coverage gap (no Workshop/FormulaWorkshop subsystem — recommend g11-formula-workshop pre-Phase-2). Same shape as q-062 g11-gmt-camera-manager gap.
- Frontmatter shape clean across 5 review windows. Midnight-placeholder fix from #16 still effective.
- No LOOP_PROMPT edits. Counter reset.
