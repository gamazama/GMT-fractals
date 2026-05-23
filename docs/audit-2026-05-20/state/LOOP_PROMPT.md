# Doc Audit Loop — Iteration Instructions

**Read these EVERY iteration.** This file is the source of truth. You (the iteration runner) execute one subsystem per tick, then schedule the next.

## Working directory

`h:/GMT/workspace-gmt/dev/` — all paths in subsystems.json / file-inventory.yaml are relative to here.

## State files

- `plans/doc-audit-state/subsystems.json` — 37 entries. Each has `status: pending|in_progress|written|verified|failed`.
- `plans/doc-audit-state/progress.json` — append-only log.
- `plans/doc-audit-state/coverage.yaml` — file coverage manifest.
- `plans/doc-audit-state/survey/` — Phase 1 survey outputs.
- `dev/docs/modules/` — Phase 2 module doc outputs (NOT yet created — create on first write).

## Iteration steps (atomic — complete all or none)

### 1. Pick next subsystem

Read `subsystems.json`. Filter to `status == "pending"`. Sort by `priority` field in order: `primary` → `docs-existing` → `secondary`. Within a tier, take the first by `id` alpha. If none pending: STOP THE LOOP — call out completion in your final response and do NOT ScheduleWakeup.

If any entry is `status == "in_progress"` and the timestamp in progress.json shows it's been >30 minutes: flag it as `status: "failed"` with reason `"abandoned by previous session"` and skip to the next pending. Do NOT auto-retry — a human reviews stuck entries.

### 2. Mark in_progress

Atomically update the chosen subsystem entry: `status: "in_progress"`, `started_at: <ISO>`. Use Edit on subsystems.json (read-modify-write is fine since iterations are serial — no concurrent writes).

Append to progress.json: `{id, action: "start", timestamp}`.

### 3. Dispatch by action

Three action types — handle each differently. **Each spawns ONE agent. Wait for its result. Do not parallelize.**

#### Action: `audit` or `create` (Phase 1 survey for module docs)

Spawn a **general-purpose** agent (NOT Explore — Explore lacks Write access) with this brief (interpolate `<files>` from `files_claimed`, `<existing_doc>` from `existing_doc_ref`, `<id>` from `id`):

> Read every file in `<files>` top-to-bottom. To record current blob SHAs, run `node plans/doc-audit-state/scripts/blob-sha.mjs <path1> <path2> …` — the script accepts one or more paths and prints `<path><TAB><sha>` per line (single-arg form still works and prints the bare sha). Produce a survey doc at `plans/doc-audit-state/survey/<id>.md` with the exact shape below. The `files:` block MUST use block YAML (one `- path:` entry per file with two-space indented `blob_sha:` and `lines_read:` keys) — flow syntax (`{ path: ..., blob_sha: ... }`) is rejected by the orchestrator's frontmatter parser and will record zero files:
>
> ```
> ---
> subsystem_id: <id>
> audited_at: <ISO>
> files:
>   - path: <relative path>
>     blob_sha: <sha>
>     lines_read: [1, <total lines actually read>]
>   - path: <next file>
>     blob_sha: <sha>
>     lines_read: [1, <total>]
>   ... (block-style YAML, NOT flow syntax — one entry per file, indented 2 spaces under `files:`)
> ---
>
> ## Public API surface
> <list of exported symbols across the file set, each with file:line citation>
>
> ## Architecture (10-25 bullets)
> <each bullet ends with a file:line citation. No claim without a citation.>
>
> ## Invariants and gotchas
> <things a future contributor would get wrong if they didn't know>
>
> ## Drift from existing doc (if existing_doc_ref is set)
> <three-column table: Doc claim | Current code | Severity (info/warn/break)>
> If the table would have >10 rows OR every row is `break`, add a one-line "Recommendation: rewrite | migrate-target | minor-edits" at the end of the table so the Phase 2 writer has a planner-level steer.
>
> ## Open questions
> <things you weren't sure about — flag, don't guess>
> ```
>
> Constraints: every architectural claim cites file:line. If a file is >800 lines, read it in chunks but report read_range honestly — do NOT skim. If you found things outside `files_claimed` that belong to this subsystem, note them under "Open questions" with the exact prefix `Orphan-sweep candidate: <path>` (capital O, full prefix, file path first — not a topic tag), followed by a one-line reason they belong here. One entry per file. Don't expand scope unilaterally, but DO surface them so a later orphan-sweep phase can pick them up via grep. Existing doc at `<existing_doc>` is for cross-reference only — do NOT edit it. Report PASS or FAIL with reason. If you need to report back something to update our working protocol, say so outside the report.

After agent returns: read the survey file briefly (just frontmatter + headings to confirm shape). If missing or malformed, mark subsystem `status: "failed"` with reason `"survey malformed"`.

For each file in `files_claimed`, append a coverage entry via `record-coverage.mjs`:
```yaml
- path: <relative path>
  blob_sha: <from agent>
  bytes: <wc -c>
  lines: <wc -l>
  read_range: [1, <total lines>]   # or partial if agent reported partial
  agent_run_id: <id>-survey
  agent_model: claude-opus-4-7
  timestamp: <ISO>
  confidence: high
  gaps: <from agent if any>
  summary_ref: plans/doc-audit-state/survey/<id>.md
```

Then mark subsystem `status: "survey_done"` and append progress.json `{id, action: "survey_done", timestamp, files_covered: <count>}`.

**Note: Phase 2 (writing module docs from surveys) happens AFTER all surveys complete.** In this iteration just stop at survey_done and pick the next subsystem.

#### Action: `summarize-existing` (existing docs batch)

Spawn a **general-purpose** agent(s) (has Write access) with this brief:

> Read every existing doc in `<files>` top-to-bottom. The frontmatter `files:` block MUST use block YAML with one full entry per file (`path:`, `blob_sha:` from blob-sha.mjs, `lines_read: [1, N]` as a TWO-ELEMENT ARRAY — NOT a scalar like `lines_read: N`). Bare path lists, flow syntax, missing blob_sha/lines_read, or scalar lines_read all cause zero files recorded. Use this exact shape (replace SHAs and line counts with real values):
>
> ```yaml
> files:
>   - path: docs/example/alpha.md
>     blob_sha: 8ad65e438e116f6f0580c3834bb45c1c4d1b7479
>     lines_read: [1, 988]
>   - path: docs/example/beta.md
>     blob_sha: f344a2ccfb9eb0e555526cc1383da3d61a4fd893
>     lines_read: [1, 1228]
> ```
>
> For each doc, produce a 3-6 sentence summary capturing: what the doc covers, key decisions or invariants it records, anything that looks stale relative to current code (flag with "MAY BE STALE: …" but don't verify against code in this pass).
>
> **Critical: also extract preservable signal** — content NOT derivable from code that future writers should keep:
> - Architectural decisions and the rationale behind them (the *why*)
> - Research notes, paper references, prior-art comparisons
> - Aspirations / "what we wanted to achieve" — even if not implemented, these document desired future state
> - Historical context about why something is the way it is
>
> Mark each such item with `Preservable:` so Phase 2 writers can find them quickly. Aspirations that contradict current code are valuable signal (they document intent), NOT bugs to fix.
>
> Output to `plans/doc-audit-state/survey/_docs/<id>.md` as:
>
> ```
> ---
> batch_id: <id>
> audited_at: <ISO>
> ---
>
> ## <doc filename 1>
> <3-6 sentence summary>
> Key decisions: <bullets if any>
> Preservable: <decisions / research / aspirations worth carrying into Phase 2>
> MAY BE STALE: <flagged items if any>
>
> ## <doc filename 2>
> ...
> ```
>
> Do NOT edit any doc. Read-only summarization. Report PASS or FAIL. If you need to report back something to update our working protocol, say so outside the report.


After agent returns: same coverage-recording flow as audit/create, with `agent_run_id: <id>-summary` and `confidence: partial` (note: `record-coverage.mjs` validates confidence ∈ {high, medium, low, partial}; the legacy `catalog` value is rejected). Mark `status: "summarized"`.

### 4. Verify (only for action: audit/create — skip for summarize-existing)

In Phase 1 the survey IS the verification — frontmatter shape + file:line citations. The `verify-doc.mjs` script is for Phase 2 module docs (not surveys), so skip in this phase.

### 5. Cost / safety guards

- **If the iteration spawned >3 agents:** something is wrong. Mark subsystem failed, do not retry.
- **If the iteration has run >25 minutes wall-clock:** stop spawning, finalize whatever you have, mark partial.
- **Do NOT read source files yourself in this orchestrator context.** Always delegate to a subagent. Your context is precious across the night.

### 6. Capture protocol feedback

Survey agents are explicitly asked to surface protocol issues OUTSIDE their PASS/FAIL report — meaning issues with the audit loop itself (brief wording, output shape, missing fields, ambiguous instructions). Code bugs and doc drift discovered during a survey are NOT protocol feedback — they belong in the survey's own "Invariants and gotchas" or "Drift from existing doc" sections and will be picked up by Phase 2 writers. If the agent emitted a protocol-shaped note, append it to `plans/doc-audit-state/protocol-feedback.json` (create if missing) with shape:

```json
{
  "id": "f-001",
  "raised_by": "<subsystem id>",
  "raised_at": "<ISO>",
  "note": "<verbatim agent text>",
  "status": "open|addressed|wont-fix"
}
```

This is signal for the self-review tick (see below). Do NOT act on individual notes mid-iteration — the review tick aggregates them.

### 7. Decide: normal iteration or self-review?

Before scheduling the next wakeup, check whether a **self-review tick** is due. A review tick is due if EITHER:
- The number of normal (non-review) iterations since the last review is ≥ 5 (or ≥ 10 if the loop is currently in Phase 1.5 Sub-phase B — see below), OR
- The number of `status: "open"` entries in `protocol-feedback.json` is ≥ 3.

**Sub-phase-B cadence relaxation:** Sub-phase B (resolve open questions, one per iteration) is structurally homogeneous — same brief, same input shape, same output shape, every iteration. While `open-questions.json` exists AND any of its entries have `status: "pending"` (i.e. Sub-phase B is the active mode), the iterations-≥5 threshold relaxes to ≥10. The open-feedback-≥3 trigger is unchanged — any genuine protocol issue still surfaces within three iterations. The global iterations-≥5 trigger applies everywhere else (Phase 1, Phase 1.5 Sub-phase A, Phase 2 when authored).

If due: the next iteration is a review tick (Section 8). Otherwise: normal next iteration (Section 9).

Track this via `plans/doc-audit-state/review-state.json`:
```json
{ "iterations_since_review": <int>, "last_review_at": "<ISO|null>" }
```
Increment `iterations_since_review` after each normal iteration; reset to 0 after each review tick.

### 8. Self-review tick (when due)

A review tick does NOT advance any subsystem or open question. It reflects on the loop itself.

1. Read `protocol-feedback.json` (open entries), the last 10 entries of `progress.json`, and the current `LOOP_PROMPT.md`.
2. Spawn a general-purpose agent with this brief:

> Review the gmt-engine doc audit loop's recent performance.
>
> Inputs:
> - `plans/doc-audit-state/protocol-feedback.json` (filter to `status: "open"`)
> - Last 10 entries of `plans/doc-audit-state/progress.json`
> - The current `plans/doc-audit-state/LOOP_PROMPT.md`
>
> Identify patterns: repeated failure modes, recurring agent complaints, drift between intent and behavior, missing instructions agents needed.
>
> Output a review doc at `plans/doc-audit-state/reviews/review-<ISO date>.md`:
>
> ```
> ---
> review_id: review-YYYY-MM-DD-N
> generated_at: <ISO>
> feedback_items_reviewed: [f-001, f-002, ...]
> ---
>
> ## Patterns observed
> <2-5 bullets with evidence from feedback or progress entries>
>
> ## Proposed LOOP_PROMPT.md edits
> For each proposed edit:
> - **Where:** section name + paragraph anchor
> - **Current text:** <verbatim snippet>
> - **Proposed text:** <verbatim replacement>
> - **Why:** which feedback items this addresses (f-NNN refs)
> - **Risk:** what could break if applied
>
> ## Feedback items to mark wont-fix
> <list with one-line reason each>
>
> ## Skip list — feedback that should remain open
> <one-line reason each>
> ```
>
> Constraints: do NOT propose edits that change resumption logic, the iteration step structure, or the priority/sort order. Those are load-bearing. Stick to clarifications, missing rules, fixing instructions agents misunderstood. If an edit would require restructuring a section, flag it and stop — the orchestrator will surface to a human.
>
> Report PASS or FAIL with reason.

3. Orchestrator applies proposed edits:
   - For each proposed edit: confirm the "Current text" still matches LOOP_PROMPT.md (use Edit tool). If it doesn't match (drift), skip that edit and log to review doc.
   - Apply edits one at a time. If any Edit fails, stop applying further edits this tick and surface to a human.
4. Mark addressed `protocol-feedback.json` entries as `status: "addressed"` with `addressed_by: <review_id>`; mark wont-fix entries with `status: "wont-fix"`.
5. Reset `iterations_since_review: 0`, set `last_review_at: <ISO>`.
6. Append to `plans/doc-audit-state/review-log.md` (create if missing): one-line summary of what changed.
7. ScheduleWakeup at 90s — next iteration resumes normal work.

### 9. Schedule next

If at least one subsystem still has `status: "pending"`: call `ScheduleWakeup` with:
- `delaySeconds: 90` (short — agents do the work; orchestrator just dispatches; keep cache warm)
- `prompt`: `<<autonomous-loop-dynamic>>` (sentinel — runtime re-injects the /loop instructions)
- `reason`: a one-line summary like "next: e02-tick-registry — engine tick phases (3 files)"

If all `status` are done (no more pending): do NOT ScheduleWakeup. Print a completion message listing total files covered + remaining work for Phase 2.

## Phase 1.5 — Open Question Resolution

**Triggered when** every subsystem in `subsystems.json` is `survey_done`, `summarized`, or `failed` (no `pending` left in Phase 1).

Surveys end with an `## Open questions` section — items the surveyor couldn't confidently answer from their bounded file set. These are signal. This phase resolves them before module docs are written, so writers have full ground truth instead of forwarding uncertainty.

State for Phase 1.5 lives in `plans/doc-audit-state/open-questions.json` (created on first iteration of this phase). Entry shape:

```json
{
  "id": "q-001",
  "source_subsystem": "a01-boot-shell",
  "question": "<verbatim text from survey>",
  "target_hint": "<files or topics the question points at, filled by triage>",
  "priority": "primary|low",
  "status": "pending|investigating|answered|unresolvable|duplicate",
  "duplicate_of": null,
  "answer_ref": null,
  "investigated_by": null,
  "completed_at": null
}
```

### Sub-phase A — Gather (one iteration, runs once)

If `open-questions.json` does NOT exist yet:

1. Read every file in `plans/doc-audit-state/survey/*.md` (NOT `_docs/` — those don't have open questions).
2. For each survey, extract the `## Open questions` section (regex: between `## Open questions` and the next `## ` or EOF).
3. Parse out individual questions (each numbered bullet, OR each blank-line-separated paragraph).
4. Assign sequential IDs `q-001`, `q-002`, … in survey-sort order.
5. Write `open-questions.json` with all entries `status: "pending"`, `target_hint: null`, `priority: "primary"`.
6. **Triage in the same iteration:** spawn ONE general-purpose agent with this brief:

> Read `plans/doc-audit-state/open-questions.json`. For each question:
> - Fill `target_hint` with a 1-2 word hint (file path, module name, or topic) of what to investigate. Do not read code yet — base the hint on the question text alone.
> - Identify near-duplicate questions (same target, same uncertainty). Mark the later one `status: "duplicate"`, `duplicate_of: "q-XYZ"` (the earlier).
> - Mark `priority: "low"` for questions that are obviously curiosity-only ("why did the author choose X over Y?") and not architecturally load-bearing. Keep `priority: "primary"` for anything that would change a module doc's structure.
> Write the updated JSON back. Report: counts of primary, low, duplicate, total.

Then ScheduleWakeup as normal — the next iteration picks up Sub-phase B.

### Sub-phase B — Resolve (one iteration per pending question)

In each iteration of this sub-phase:

1. Read `open-questions.json`. Filter to `status == "pending"` AND `priority == "primary"` first. If none, fall back to `priority == "low"` pending.
2. If no pending: Phase 1.5 is done — log it and proceed to Phase 2 (see "Phase transition" below). Print completion stats: total answered, unresolvable, duplicates skipped.
3. Pick the first pending by `id` alpha. Mark `status: "investigating"`, `investigated_by: <iso ts>`.
4. Spawn a general-purpose agent with this brief (interpolate `<id>`, `<question>`, `<target_hint>`, `<source_survey>`):

> Open question `<id>` from subsystem `<source_subsystem>`:
>
> > <question>
>
> Target hint: `<target_hint>`. Source survey: `plans/doc-audit-state/survey/<source_subsystem>.md`.
>
> Investigate. Read only the files you need (Glob/Grep/Read). Stay tight — aim for ≤8 file reads total. Produce an answer doc at `plans/doc-audit-state/survey/_followups/<id>.md` with this EXACT frontmatter shape. Use **these four field names verbatim**: `question_id`, `source_subsystem`, `investigated_at`, `files_consulted`. Do NOT use `id`, `parent`, `parent_survey`, `subsystem_id`, `target`, `status`, `verdict`, `files_read`, `target_hint` — those are alternative names that have appeared in past agent output and the orchestrator's resumption logic will not recognise them. **If your draft frontmatter contains ANY of `id:`, `parent:`, `status:`, `verdict:`, `files_read:` at the top level, you are almost certainly producing the old shape — stop, copy the four-name template below verbatim, and re-fill the values.** The `files_consulted` block must be present even for pointer-back answers (cite the survey or prior followup you're pointing at, with its blob_sha or the literal string `audit-snapshot` if you genuinely did not re-fetch the sha):
>
> ```
> ---
> question_id: <id>
> source_subsystem: <source_subsystem>
> investigated_at: <ISO — use the actual UTC timestamp when you started the investigation, not a midnight placeholder like 2026-05-20T00:00:00Z>
> files_consulted:
>   - path: <file>
>     blob_sha: <sha from blob-sha.mjs>
>   - path: <next file>
>     blob_sha: <sha>
> ---
>
> ## Question
> > <verbatim question>
>
> ## Answer
> <direct answer in 1-4 paragraphs. Every claim cites file:line.>
>
> ## Confidence
> high | medium | low — and why
>
> ## Related findings
> <anything you noticed that's worth surfacing to the writer in Phase 2, with file:line>
> ```
>
> If the question is genuinely unresolvable from code (requires historical context not in the repo), write the doc anyway with `## Answer\nUNRESOLVABLE: <reason>` and return FAIL with that reason. Orchestrator marks `status: "unresolvable"`.
>
> Report PASS or FAIL with reason. Outside the report, flag anything about the protocol that should change.

5. After agent returns:
   - PASS → `status: "answered"`, `answer_ref: "plans/doc-audit-state/survey/_followups/<id>.md"`, `completed_at: <iso>`.
   - FAIL with UNRESOLVABLE → `status: "unresolvable"` with reason; keep `answer_ref` (the doc still has value).
   - FAIL other → log to progress.json, mark `status: "unresolvable"` with reason, do NOT retry blindly.
6. For each file in the answer's `files_consulted`: append a coverage entry (same direct-append pattern as Phase 1) with `agent_run_id: <id>-followup`, `confidence: high` (or `partial` if the followup only read a portion of the file; `record-coverage.mjs` validates confidence ∈ {high, medium, low, partial} — the legacy `targeted` value is rejected). Overlap with Phase 1 coverage is fine — the file gets a second entry attesting a deeper look.
7. ScheduleWakeup with `delaySeconds: 90`.

### Cost guard for Phase 1.5

If a single question's agent burns >40k tokens, mark it `unresolvable` with reason `"exceeded budget"`. Hard cap on the phase: if total Phase 1.5 iterations exceed 200, stop and surface the remainder for human review. (Most repos this size resolve in 30-80 follow-ups after triage merges duplicates.)

## Phase transition (Phase 1 → Phase 1.5 → Phase 2)

- **Phase 1 → 1.5:** When every subsystem is `survey_done`, `summarized`, or `failed`, Sub-phase A runs (gather + triage). Loop continues automatically into Sub-phase B.
- **Phase 1.5 → 2:** When every open question is `answered`, `unresolvable`, or `duplicate`, Phase 2 begins — writing module docs from surveys + follow-ups. **The Phase 2 writer iteration brief lives at `plans/doc-audit-state/phase-2-brief-draft.md`** (canonical reference; was originally drafted here as TBD and lifted out to its own file for reuse). Phase 2 was executed 2026-05-20 across two parallel sessions; outputs are under `dev/docs/modules/`. If a partial re-run is ever needed, drive iterations from that brief.

## Failure handling

- Agent returns FAIL with reason → mark subsystem `status: "failed"` with the reason verbatim, log to progress.json, move on.
- Script error (verify-doc, record-coverage) → log to progress.json with stderr, mark `status: "failed"`, move on.
- Network/transient errors → retry the same subsystem ONCE on next iteration; if it fails twice mark failed.

A human reviews `status: failed` entries at the end. The loop does not retry blindly.

## Agent feedback

Survey and follow-up agents are prompted to flag protocol issues outside their PASS/FAIL report (see Section 6 of "Iteration steps"). Every protocol note goes into `plans/doc-audit-state/protocol-feedback.json` and is aggregated by the self-review tick (Section 8). Do NOT act on individual notes mid-iteration — they need batching to spot patterns. If a note is so urgent it blocks the next iteration (e.g. "the survey path is wrong"), surface it immediately rather than waiting for the next review tick.

## What "done" looks like

### Phase 1
- `progress.json` shows 37 entries with terminal status (survey_done, summarized, or failed).
- `coverage.yaml` contains entries for ~837 files (failed subsystems may leave gaps — visible via coverage-check.mjs).
- `survey/` has 28 module survey files + `survey/_docs/` has 9 batch summaries.

### Phase 1.5
- `open-questions.json` shows every question with terminal status (answered, unresolvable, duplicate).
- `survey/_followups/` has one answer doc per non-duplicate question.
- `coverage.yaml` gained `agent_run_id: q-NNN-followup` entries for files touched by follow-ups (overlap with Phase 1 is expected and OK).

### Self-review
- `protocol-feedback.json` exists with feedback items mostly in `addressed` or `wont-fix` status (a few `open` is fine if no review tick is yet due).
- `reviews/` contains one review doc per tick.
- `review-log.md` summarizes what each review changed.

### Phase 2
- `dev/docs/modules/` populated with one module doc per audit/create subsystem (plus cross-cutting docs like `engine-fork-rules.md`, `ddfs-auto-wiring.md`, etc).
- Every subsystem in `subsystems.json` has `status: "verified"` and a `module_doc_path` set, OR `status: "summarized"` for docs-existing batches that don't get module docs.
- `verify-doc.mjs` passes against every module doc.
- `extract-bugs.mjs` (and `extract-backlog.mjs` if used) regenerate the cross-cutting indexes (`bugs.md`, etc).

Final iteration after Phase 1.5 completes: print summary (files covered, questions answered/unresolvable, review ticks fired, LOOP_PROMPT edits applied, gaps remaining). If Phase 2 brief at `plans/doc-audit-state/phase-2-brief-draft.md` is in scope (orchestrator authority), continue; otherwise exit.
