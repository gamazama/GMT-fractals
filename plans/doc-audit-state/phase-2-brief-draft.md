# Phase 2 — Module Doc Writer Brief (DRAFT)

This file is the scratch draft of the spawn brief that will eventually replace
the "TBD" Phase 2 section in `LOOP_PROMPT.md` once Sub-phase B finishes. Until
then it lives here so concurrent edits in Sub-B-session don't collide with
Phase-2-session.

---

## Phase 2 iteration shape (orchestrator)

### 1. Pick next subsystem

Read `subsystems.json`. Filter to `status == "survey_done"` OR `status == "summarized"`. Sort by `priority` (`primary` → `docs-existing` → `secondary`), within tier by `id` alpha. If none: Phase 2 complete — print summary and STOP (no ScheduleWakeup).

If any entry is `status == "writing"` and `started_at` in `progress.json` shows >40 minutes: flag as `status: "write_failed"` with reason `"abandoned by previous session"` and pick the next. Do NOT auto-retry — human reviews stuck entries.

### 2. Mark writing

Atomically update the chosen entry: `status: "writing"`, `started_at: <ISO>`. Append `progress.json`: `{id, action: "write_start", timestamp}`.

### 3. Spawn writer agent

Spawn a **general-purpose** agent (NOT Explore — Explore lacks Write access) with this brief (interpolate `<id>`, `<existing_doc_ref>`, `<target_doc>`, `<files_claimed>` from the subsystem entry; resolve `<disposition>` and `<carry_in>` from the two indexes below):

> Author the module doc for subsystem `<id>` (area: `<area>`). Working dir: h:/GMT/workspace-gmt/dev/. Output path: `<target_doc>` (typically `dev/docs/modules/<area-or-id>.md`).
>
> **Pre-read MUST be in this exact order** — each layer constrains the next:
>
> 1. **Disposition lookup** — read `plans/doc-audit-state/phase-2-disposition.json` and find the entry for `<existing_doc_ref>`. The `disposition` field tells you how to treat the old doc:
>    - `rewrite` — new module doc supersedes; preserve_signal items must be referenced ("See <old_doc> for original design rationale.")
>    - `migrate-target` — new doc replaces; redirect-pointer in the new doc
>    - `preserve-with-pointer` — new doc is fresh; cross-link to old doc as "design rationale / aspirations"
>    - `minor-edits` — new doc captures current state; old doc remains supplementary reference
>    - `keep-as-is` — only minor module-doc skeleton needed; rely on existing doc
>    The `preservable_signal` field names what's worth preserving from the old doc.
>
> 2. **Docs-existing summary** — read `plans/doc-audit-state/survey/_docs/d0X-*.md` entries that mention the docs in `<existing_doc_ref>`. These are 3-6 sentence summaries with `Preservable:` blocks. Pull rationale, research, aspirations — never code claims.
>
> 3. **Survey** — read `plans/doc-audit-state/survey/<id>.md`. This is the code-truth snapshot from Phase 1: Public API surface, Architecture (10-25 bullets each with file:line), Invariants and gotchas, Drift table. Treat survey as truth-as-of-audit; verify against current code in step 5.
>
> 4. **Followups** — read every `plans/doc-audit-state/survey/_followups/q-NNN.md` where `source_subsystem == "<id>"`. Followups OVERRULE surveys on facts they investigated (review #12 contract). Also read `plans/doc-audit-state/phase-2-carry-in.json` under `by_subsystem["<id>"]` for cross-cutting items (production bugs, doc-rewrite targets, cleanups, drifts) — surface these in the module doc's "Known issues" or "Phase 2 carry-in" section as appropriate.
>
> 5. **Code** — re-Read every file in `<files_claimed>` to capture any drift since the audit. Use `node plans/doc-audit-state/scripts/blob-sha.mjs <path>` to get current blob SHAs (these go in the frontmatter as `last_verified_sha`). If a file is >800 lines, read in chunks but read every line — do NOT skim.
>
> **Produce the module doc** at `<target_doc>` with this EXACT frontmatter (verified by `scripts/verify-doc.mjs`):
>
> ```
> ---
> source: <primary source file, REPO_ROOT-relative — e.g. engine/FeatureSystem.ts, NOT dev/engine/...>
> lines: <line count of primary source>
> last_verified_sha: <blob_sha of primary source>
> additional_sources:        # OPTIONAL — list every other file in files_claimed that exports public symbols. Verifier searches all of these when validating public_api.
>   - <e.g. engine/plugins/RenderLoop.tsx>
> audited: <ISO timestamp — REAL UTC wall-clock at time you author this doc, not a placeholder>
> audited_by: claude-opus-4-7
> public_api:
>   - <ExportedSymbol1>
>   - <type SomeType>
>   - <default>  # if any source file has a default export
> depends_on:                # [] is VALID for leaf substrates (TickRegistry etc); do NOT manufacture phantom dependencies
>   - <sibling-subsystem-id-1>
>   - <sibling-subsystem-id-2>
> ---
>
> # <Subsystem human-readable title>
>
> <1-paragraph what+why summary>
>
> ## Public API
> <Each exported symbol with one-paragraph purpose + a file:line citation to its definition site.>
>
> ## Architecture
> <10-25 bullets. Each bullet ends with a file:line citation. No claim without a citation. This is the load-bearing content for future contributors.>
>
> ## Invariants
> <Bullet list of things a future contributor would get wrong if they didn't know. Cite file:line for each.>
>
> ## Interactions with other subsystems
> <Outgoing dependencies + incoming dependencies (who imports us). Match `depends_on` frontmatter.>
>
> ## Known issues / Phase 2 carry-in
> <Pull from phase-2-carry-in.json by_subsystem["<id>"] + any followup-flagged bugs. Categorize: production bug | cleanup | drift | doc-rewrite-target. Each entry cites file:line and references the originating followup.>
>
> ## Historical context
> <Pointer-back to <existing_doc_ref> as "see X for design rationale / aspirations" if disposition is preserve-with-pointer or rewrite. Quote any preservable signal that future writers should know.>
> ```
>
> **Constraints:**
> - Every architectural claim cites file:line. NO claim without a citation.
> - All `public_api` symbols must exist as identifiers (word-boundary match) in `source` OR any file in `additional_sources`. Put every `files_claimed` entry that exports public symbols into `additional_sources`. Use `export` keyword search to enumerate.
> - All `path:N` and `path:N-M` line anchors must reference real files with in-range lines. **All citation paths are REPO_ROOT-relative — do NOT prepend `dev/` even though the working directory IS `dev/`.** REPO_ROOT for verify-doc.mjs is `h:/GMT/workspace-gmt/dev/`; `dev/docs/foo.md` resolves to `dev/dev/docs/foo.md` and fails. Write `engine/TickRegistry.ts:42` and `docs/engine/01_Architecture.md:90`, not `dev/engine/...` or `dev/docs/...`.
> - `depends_on` should name OTHER subsystem ids (e.g. `e01-feature-system`), not file paths. `depends_on: []` is valid for leaf substrates — do not invent phantom dependencies. Look at `plans/doc-audit-state/subsystems.json` to find valid ids.
> - Existing `dev/docs/` files are READ-ONLY. Do NOT edit them. Reference them as `docs/...` (REPO_ROOT-relative) in the "Historical context" section.
> - If you find drift between survey and current code, the current code wins. Note the drift in "Known issues".
> - The `Write` tool auto-creates intermediate directories — no `mkdir -p` needed before writing `dev/docs/modules/engine/foo.md`.
> - **Line anchors must point at files that EXIST TODAY.** If you want to mention a future rename target (e.g. "should be renamed to `GmtShaderBuilder.ts`"), cite the existing file at its current path and reference the rename by name only — do NOT cite a `:N` anchor against the future filename.
> - **For catalog-style sections with >3 instances of a pattern** (cross-cuts, indexes, drift tables): tables render the comparative metadata better than bullet lists. Use markdown tables.
> - If a followup's frontmatter `files_consulted` block already has a blob_sha for a file you cite, that SHA is fresh enough (followups are days old at most). Skip the re-run of `blob-sha.mjs` for those files. Only re-run for files the followups didn't touch.

> **Note on brief-suggested symbol names:** the brief may suggest example public_api symbols for guidance, but symbol names in the wild often differ (e.g. `detectHardware` vs `detectHardwareProfile`). ALWAYS verify each symbol you list against the actual cited files via grep/Read — verify-doc will fail you if a name doesn't match.

> **Bare-filename anchors trap verify-doc.** The line-anchor regex matches any `filename.ext:N` pattern in prose, then tries to resolve `filename.ext` from REPO_ROOT. A casual mention like "see `main.tsx:42`" 404s because `main.tsx` isn't a REPO_ROOT path — it lives at `app-gmt/main.tsx`. **Always prefix the directory** (`app-gmt/main.tsx:42`, `engine/plugins/Undo.tsx:42`) even in prose. Before invoking verify-doc, grep your draft for `\b\w+\.[tj]sx?:` anchors without a path prefix and fix them.

> **Some followups may be `status: pending`** — Sub-B hasn't answered them yet. If a followup file (`_followups/q-NNN.md`) doesn't exist, skip it defensively and add a one-line note in the module doc's Known Issues section: "q-NNN is pending; this doc may need a regeneration pass once it lands." Do NOT block on missing followups.

> **`depends_on` semantics:** list any subsystem whose code you import — types-only counts (e.g. importing `RenderVariant` type from another subsystem means depends_on includes that subsystem). The distinction "runtime coupling only" is too strict and inconsistent across the codebase. `[]` is valid for leaf substrates with no imports from sibling subsystems.

> **"No existing doc" subsystems (`existing_doc_ref: null`):** use the "Historical context" section to anchor IN-SOURCE design-rationale comment blocks by file:line so future audits don't lose them when the code is reformatted. (Example: `Navigation.tsx:1-97` header, `modifiers.ts:1-6`.) If there are no rationale comments either, the section can be a single sentence: "No existing doc covered this subsystem; this is the canonical reference going forward."
>
> Report PASS or FAIL with one-line reason. If you flagged something that the brief should change, say so outside the PASS/FAIL line.

### 4. Verify

After writer returns:
```bash
node plans/doc-audit-state/scripts/verify-doc.mjs <target_doc>
```

Exit codes:
- `0` PASS — proceed
- `2` frontmatter missing/malformed — mark `status: "write_failed"`, reason from stderr
- `3` symbol verification failure — public_api list doesn't match source; mark `status: "write_failed"`
- `4` line-anchor failure — citation references missing file or out-of-range line; mark `status: "write_failed"`
- `5` partial read-range — WARNING only, accept

On `write_failed`: log the reason in progress.json with the agent's PASS/FAIL line. Do NOT auto-retry; the human reviews.

### 5. Record coverage

For each file in `<files_claimed>`, append a coverage entry (re-blob-sha'd since Phase 1):
```yaml
- path: <file>
  blob_sha: <fresh sha from blob-sha.mjs>
  bytes: <wc -c>
  lines: <wc -l>
  read_range: [1, <total>]
  agent_run_id: <id>-write
  agent_model: claude-opus-4-7
  timestamp: <ISO>
  confidence: high
  summary_ref: <target_doc>
```
Pipe via stdin to `record-coverage.mjs`. **Required confidence values: high|medium|low|partial** (NOT "full").

### 6. Mark verified

Atomically update subsystem: `status: "verified"`, `verified_at: <ISO>`, `module_doc_path: <target_doc>`. Append `progress.json`: `{id, action: "write_done", timestamp, doc_path}`.

### 7. ScheduleWakeup

90s cadence (same as Phase 1.5). Next iteration picks the next pending subsystem.

---

## Notes for the orchestrator (not the writer agent)

- **Cross-cutting deliverables** (per `phase-2-carry-in.json` `cross_cutting` array) are NOT subsystem-bound. After all subsystem module docs are verified, the orchestrator authors a "cross-cutting" pass — one doc per theme. Top priority cross-cuts:
  1. `dev/docs/modules/engine-fork-rules.md` — the engine/ vs engine-gmt/ divergence theme (consolidates q-096..q-102, q-099).
  2. `dev/docs/modules/uniform-plugin-contract.md` — the "no uniform plugin contract" finding from e07.
  3. `dev/docs/modules/ddfs-string-contract.md` — the DDFS `set${FeatureId}` + `${featureId}.${paramKey}_<axis>` pair (q-013, q-014).
- **Cleanup pass** (Phase 1.6 or merged into Phase 2 writer pass per review #7's recommendation): 11 cleanup items in `phase-2-carry-in.json`. Either bundle into module-doc author's "Known issues" section (default) or stand up a separate Phase 2.5 if the count grows.
- **Bug pass**: 5 production bugs in carry-in. The module-doc writer should surface them in "Known issues" but NOT fix them — code changes are out of audit scope. Generate a separate `bugs.md` index summarizing them.
- **Two new subsystems** (e09b, g11) must be added to `subsystems.json` before Phase 2 launch. `phase-2-new-subsystems.json` has the profiled entries. **Open question for the human**: dual-claim or carve-out for `engine-gmt/features/camera_manager/index.ts` (currently in g05 glob, would also be in g11).
- **d03 re-blob-sha**: deferred from review #7. Run after Sub-B finishes (the coverage.yaml race window closes).
