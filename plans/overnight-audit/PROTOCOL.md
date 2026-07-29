# Overnight audit — orchestration protocol

Read this in full at the start of every cycle. It is the contract for the whole run.

## What this run is

An unattended, multi-cycle audit and cleanup of the GMT engine. It runs while the
owner sleeps, applies what it can prove, escalates what it cannot, and queues what
needs a human. Everything lands on a branch; nothing is pushed.

**Pace over throughput.** The owner's standing instruction: *doing it right is
always better than rushing — for the agents too.* A subsystem that yields two
findings you have actually verified is a better result than ten you merely
suspect. Unverified findings are worse than no findings: they cost trust and the
morning is spent disproving them. If a claim cannot be checked, it is Tier B or it
is dropped — never applied.

## Hard boundaries (Tier C — never, under any circumstance)

- **Never `git push`.** `main` auto-deploys to app.gmt-fractals.com on push. An
  unattended push is an unattended production deploy.
- **Never commit to `main`** or check it out. All work is on the audit branch.
- **Never edit `.claude/hooks/**`.** The run must not modify its own guardrails.
- **Never delete a file.** Emptying, truncating, or `git rm` are all deletion.
- **Never touch** `node_modules/`, `dist/`, `.env*`, credentials, or anything under
  `docs/history/**` beyond appending (a hook enforces the last one).
- **Never edit `gmt-rs/`** — explicitly out of scope for this run.
- **ADRs: append-only, and now editable during the run.** See the amendment below
  — the cycle-1 blanket ban is LIFTED.
- If a change would require any of the above to verify it, the finding is Tier B.

> **Amendment, cycle 1 (2026-07-27):** two ADR commits landed before the ADR rule
> existed — `652fb61c` and `8842a839`. Both are verified append-only Update blocks.
> **Superseded by the amendment below: they are correct and stay.**

> **Amendment, run 2 (2026-07-29) — ADRs are no longer Tier B.** The cycle-1 ban
> existed because `guard.mjs` escalated *every* ADR write to an interactive
> prompt, on the stated grounds that a sanctioned Update block could not be told
> from a body rewrite. It can: both sanctioned edits only ADD lines, and a rewrite
> necessarily drops some. The hook now classifies mechanically — additive edits
> pass silently, anything that would delete existing text still asks. Falsified in
> both directions before shipping.
>
> So an auditor MAY now prepend a dated
> `> **Update YYYY-MM-DD (...; decision unchanged):**` block during the run, and
> that is Tier A when a grep proves the drift. Still forbidden: rewriting a
> Decision body, and stamping `Status: Superseded` (that deletes "Accepted", so it
> asks — leave it Tier B). The 11 corrections queued from run 1 were all applied
> by hand on 2026-07-28; do not re-derive them.
>
> **Cite grep targets, not line numbers.** Five of those eleven were pure
> line-drift and one had rotted into pointing at unrelated code. `grep for
> DOUBLE_RUN_WINDOW_MS` still resolves in a year; `TickRegistry.ts:89-94` does not.

## The four tiers

Every finding is classified before anything is written to disk.

### Tier A — self-verifying
An existing guard script covers the change, and it passes afterwards.

Requirements, all of them:
1. The change is made.
2. A **named existing** `npm run test:*` / `smoke:*` / `check:*` / `typecheck`
   exercises the changed behaviour. Not a guard that merely happens to pass —
   one that would plausibly *fail* if the change were wrong.
3. That guard is run and passes.
4. `npm run typecheck` passes (9s — run it after every applied change, always).
5. Committed to the audit branch, one commit per finding, message naming the guard.

Record `guard` and `guardPass` in the finding. This is the tier to aim for.

> **A `pre-commit` hook now typechecks before every commit that stages TypeScript**
> (added 2026-07-28, tracked at `scripts/git-hooks/`). A broken tree can no longer
> be committed, so requirement 4 is enforced rather than trusted. Two consequences
> for the run: a commit that stages `.ts`/`.tsx` costs ~9s more, and if a commit is
> refused, READ THE ERRORS — do not reach for `--no-verify`.
>
> Why it exists is itself the lesson: a broken tree was committed on 2026-07-28
> because the verification command was `npm run typecheck 2>&1 | tail -2 && git
> commit`. **A pipeline's exit status is the last command's**, so `tail` returning
> 0 masked tsc's failure. Never infer a command succeeded from its piped output —
> check the exit code, and if you must pipe, check `${PIPESTATUS[0]}`.

### Tier V — orchestrator-verified
The change is sound but no existing guard covers it. The agent **must not apply it
alone.** It returns the finding with `tier: "V"` and a `verificationRequest`
describing exactly what claim needs checking.

The orchestrator then — in a **separate step, after all auditors have returned**,
never nested inside them — spawns an **independent verifier** that:
- has not seen the first agent's reasoning,
- re-derives the claim from source itself,
- writes and runs a throwaway check where one is possible (a `node -e` probe, a
  grep that must return empty, a temporary `debug/*.mts` run and then reverted),
- and returns confirm / refute / cannot-determine.

Confirmed → apply, run typecheck, commit, record how it was checked in
`verification`. Refuted or cannot-determine → demote to Tier B with the verifier's
reasoning attached. **Default to refuting when uncertain.**

### Tier B — needs the owner
Product behaviour, visual design, performance tradeoffs, anything touching what
the app *should* do rather than whether it does what it claims. Also: anything
Tier V could not settle.

Not applied. Appended to `PROPOSALS.md` with enough context to decide in the
morning without re-reading the code — the claim, the evidence, the options, and a
recommendation.

### Tier C — never
See above. Refuse, and note it in the finding as `tier: "C"` if it is worth the
owner knowing the opportunity exists.

## Concurrency — the rule that keeps the run affordable

**Maximum 2–3 agents in flight, and the agent tree is exactly one level deep.**

This is empirical, from how this account's 5-hour allotment actually behaves:
2–3 parallel agents sustain comfortably; **nested fan-out drains the window fast.**

Therefore:
- Use flat `Agent` calls from the orchestrator turn. Do **not** use the `Workflow`
  tool for this run — its pipeline/parallel nesting is exactly the pattern that
  burns the allotment.
- A spawned agent **never spawns another agent.** Auditors audit; verifiers verify;
  neither delegates. State this in every prompt you give them.
- Auditing and verifying are separate sequential steps, each with its own flat
  batch of at most 2–3.
- Prefer a smaller batch that finishes over a larger one that gets rate-limited
  halfway.

If a cycle comes back cheap and clean, `state.batchSize` may rise to 3. It must
never exceed 3.

## Per-cycle procedure

1. **Check `STOP`.** If `plans/overnight-audit/STOP` exists, write a final
   dashboard and stop the loop. Also stop if `state.deadline` has passed or
   `state.cycle >= state.maxCycles`.
2. **Confirm the branch.** `git rev-parse --abbrev-ref HEAD` must equal
   `state.branch`. If it does not, stop — do not guess.
3. **Take the next batch** of `pending` subsystems from `worklist.json`
   (`state.batchSize`, default 2). Mark them `in-progress`.
4. **Spawn one auditor per subsystem as flat, parallel `Agent` calls** — see the
   concurrency rule below. Each auditor:
   - runs `npm run context:cost -- <id>` first to scope its reading,
   - reads the source, not docs about the source,
   - runs the guards that cover its area,
   - classifies every finding into A / V / B before touching anything,
   - applies only Tier A itself,
   - **writes `results/<id>.json` itself, before it returns** — see the durability
     note under "Result file". This is not optional and not the orchestrator's job.
   - returns its findings as JSON too. It does **not** spawn agents of its own.
5. **Verify Tier V** as a *separate, subsequent* step — collect the V findings from
   both auditors, then spawn up to 2 verifiers as flat parallel `Agent` calls.
   Never inside the auditor step.
6. **Apply confirmed Tier V**, typecheck, commit. The orchestrator does this
   itself, in its own turn — not via another agent.
7. **Confirm every `results/<id>.json` exists** — the auditors wrote them in step 4.
   Write any that is missing from the returned JSON, add the Tier V verdicts from
   steps 5–6, then update `worklist.json` and append a line to `journal.jsonl`.
8. **Rebuild the dashboard** — `node plans/overnight-audit/scripts/build-dashboard.mjs`
   — and commit it. **Do NOT publish it via the Artifact tool.** Owner decision,
   cycle 1: publishing triggers an interactive permission prompt, which stalls an
   unattended run. The dashboard is a self-contained local file; open
   `plans/overnight-audit/dashboard.html` in a browser to read it. The artifact at
   `state.dashboardUrl` is **frozen at cycle 1** and should be ignored — or
   republished by hand in the morning, when a prompt costs nothing.
9. **Schedule the next cycle.**

If a cycle fails partway, the next cycle picks up from `worklist.json` — subsystems
left `in-progress` are reset to `pending` at the start of each cycle.

## What to audit, per subsystem

In priority order. Stop when the subsystem is genuinely covered, not when the list
is exhausted.

0. **Guard health FIRST, before anything else in the subsystem.** Run 1 found
   TWELVE guards that could not do the job they were named for, and it found them
   incidentally, one per subsystem, over ten cycles. Every Tier A finding rests on
   "the guard is green", so a dead guard silently devalues everything downstream
   of it. Four failure modes, all seen: **cannot fail at all** (`test:frag`
   counted failures and exited 0; `test:frag:scan` has no assertion whatsoever),
   **permanently red** (a guard that has never been green cannot distinguish a
   regression from its baseline), **collects values but asserts nothing**, and
   **healthy but cited for the wrong thing** (~9 instances — a rule citing a smoke
   whose `ENGINE_URL` boots a sibling app that never imports the governed files).
   `npm run check:rule-guards` now catches that last mode mechanically — run it
   once per cycle and treat any output as a finding. For the others: read the
   guard's `ENGINE_URL` default, confirm your files are in that entry's import
   graph, and **falsify it** — break the code it governs, watch it go red, revert
   with a targeted Edit. A guard you did not falsify is a guess about a guard.

1. **`@invariant` verification.** 152 files carry one. Does the code still satisfy
   what the annotation claims? This is the highest-value pass and nothing else
   checks it. A broken invariant is usually Tier V (write a probe to prove it).
   Roughly a THIRD of those checked in run 1 were false — and they were exactly
   the ones with no guard behind them. Per CLAUDE.md, an `@invariant` now carries
   the command that would go red if it were wrong; one that cannot name such a
   command is an `@assumption`. **Downgrading an unprovable `@invariant` to
   `@assumption` is a legitimate Tier A finding**, not a cop-out — it makes the
   absence of proof greppable instead of invisible.
2. **Citation drift.** Do paths, symbols and line refs in `.claude/rules/`, ADRs and
   JSDoc still resolve? Dead citations are Tier A when a grep proves it.
3. **Doc-vs-code contradiction.** Claims that are simply false — the kind where a
   rule describes a directory but only holds for a subdirectory.
4. **Guard health.** Which of the 81 guard scripts still pass; which reference
   `debug/*.mts` files that no longer exist. A dead script is Tier A to fix or
   Tier B to remove.
5. **Dead code and orphans.** `npm run orphans` (knip, real import-graph walk).
   Removal is deletion — Tier B, always. Propose, never act.
6. **Refactor opportunities.** Duplication between `engine/` and `engine-gmt/`,
   near-identical siblings, copy-pasted config. Tier V if a guard can prove
   equivalence, Tier B otherwise.
7. **Rule coverage.** Subsystems with no matching `.claude/rules/` entry. Writing
   one is Tier A (documentation, and the rule's own claims are grep-checkable).

## Finding schema

```json
{
  "tier": "A | V | B | C",
  "severity": "high | medium | low",
  "file": "engine/FeatureSystem.ts",
  "line": 120,
  "summary": "One sentence: what is wrong.",
  "change": "What was actually changed. Omit for B and C.",
  "verification": "How it was proved. REQUIRED for A and V.",
  "guard": "npm run test:modulation-parity",
  "guardPass": true,
  "commit": "abc1234",
  "rationale": "For B: the options and your recommendation.",
  "verificationRequest": "For V before checking: the exact claim to verify."
}
```

`verification` is not optional on anything applied. It is what the owner reads in
the morning to decide whether to trust the change. "Ran the tests" is not a
verification; "`test:param-mapping` covers the display-curve path and fails if the
resolver is bypassed — ran it, green" is.

## Result file

**The auditor writes this itself, before it returns.** Not the orchestrator
afterwards.

Why, and it is worth reading once: on 2026-07-29 the orchestrator turn ended the
instant the last auditor's result was delivered and never produced another turn.
Nothing external explains it — the machine logged events for another 2h39m and was
demonstrably fine, and there was no rate limit, no error entry and no crash in the
OS log. Cycle 11's committed work survived because it was in git. One auditor's
**return value** existed only in that turn's context, and it is gone:
`results/a03-tutorial.json` had to be reconstructed from commit messages, and the
Tier B and Tier V findings that auditor produced are unrecoverable — real work,
done correctly, lost to a mechanism that had nothing to do with the work.

An auditor that writes its own result file costs the run nothing and makes the
findings independent of the orchestrator surviving to the end of a long turn. Keep
returning the JSON as well — that is the orchestrator's input for the verify step.
The file on disk is the system of record.

`results/<subsystem-id>.json`:

```json
{
  "id": "e01-feature-system",
  "cycle": 3,
  "guards": [{ "script": "npm run typecheck", "pass": true, "subsystem": "e01-feature-system" }],
  "findings": [ ... ]
}
```

## Commit convention

One commit per applied finding, on the audit branch:

```
audit(<subsystem-id>): <what changed>

<why it was wrong>
Verified: <guard or verifier method>

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

**Stage explicit paths. Never `git add -A`, `git add .`, or `git commit -a`.**
Auditors run in parallel against ONE shared working tree, so a broad stage sweeps
up whatever the other agents happen to have unsaved at that instant. On 2026-07-29
it did: the a03-tutorial auditor staged broadly and carried 54 lines of the gx01
auditor's `docs/modules/gradient-explorer/app.md` work into commit `50d18282`,
whose message is about the tutorial runner. No content was lost and history was not
rewritten, but the finding is mis-attributed in the log permanently — the audit's
own record of who proved what is now wrong at that commit. Use
`git add <path> [<path>…]` and check `git status --porcelain` before committing.

## Throughput, not budget

This runs on a Max subscription. There is **no per-token cost and no dollar
ceiling** — the only real constraint is the rolling 5-hour usage window. Do not
ration work to save money; there is no money to save. Ration it to stay inside the
window and to keep quality high.

Windows reset every 5 hours. For this run: **22:50 → 03:50 → 08:50 SAST**, with the
`state.deadline` of 09:54 SAST landing in the third. That is two full resets across
the night, which is enough to reach the end of the worklist if cycles stay lean.

The governors, in order:
1. `plans/overnight-audit/STOP` exists → stop.
2. `state.deadline` passed → stop.
3. `state.cycle >= state.maxCycles` → stop.
4. Worklist empty → stop, and say so prominently on the dashboard.

**Rate limits are not failures and not a reason to degrade.** If the window is
exhausted mid-cycle, finish writing whatever is already verified, update the
dashboard so the owner sees real progress, and wait for the reset. Never respond to
a rate limit by lowering the verification bar, skipping guards, or applying
unverified findings to "get more done" — that inverts the whole point of the run.

Log per-cycle wall time and whether the window was hit in `journal.jsonl`, so the
morning read shows where the night actually went.

---

## Run 2 — 2026-07-29

Run 1 covered 28 of 33 subsystems in 10 cycles. **Its findings are in `results/`
and `PROPOSALS.md` — read before auditing, and do not re-derive them.**

### Five subsystems remain

`a03-tutorial` (7f) · `gx01-gradient-explorer` (6f) · `t01-fluid-toy` (1f) ·
`t02-fractal-toy` (1f) · `p01-palette-suite` (61f)

Take the four small ones first — they finish quickly and `p01` is 61 files that
wants a cycle of its own rather than a third of one.

### After those, the work is cross-cutting, not per-subsystem

Run 1's remaining value is in sweeps that span the tree. In rough priority:

1. **Guard sweep.** Falsify EVERY `npm run test:*` / `smoke:*` / `check:*` in
   `package.json` — break what it governs, confirm it goes red, revert. Twelve
   were found broken incidentally in run 1; a systematic pass would find the rest
   in one go, and it raises the trustworthiness of every Tier A finding that cites
   one. Highest value in the queue.
2. **`@invariant` → `@assumption` sweep.** Any invariant that cannot name a
   command which would fail if it were wrong is an assumption. Downgrading is
   Tier A. ~152 files carry one; a third of those checked in run 1 were false.
3. **`check:rule-guards` follow-through.** It reports 4 miscitations today
   (3 deep-zoom smokes on `gmt-formulas-and-graph.md`, `test:bucket-convergence`
   on `gmt-renderer.md`). Also note `engine/fractal/deepZoom/**` is scoped by NO
   rule at all — that subsystem is rule-orphaned.
4. **NUL-byte / unsearchable-file scan.** `components/CategoryPickerMenu.tsx`
   carried a literal NUL inside a React key, which made grep classify it binary
   and SKIP it — so it was invisible to the whole of run 1. One file today, but
   the class is silent blindness and the check is cheap.

### Open threads worth picking up

- **`loadScene`'s post-boot branch is unreachable in app-gmt** (the module-scope
  stub capture). The undo half was measured and is masked; this half was NOT
  re-measured and may be user-visible. See the `@bug` on `setProxy`.
- **ShaderFactory fork-back is blocked by a seam**, not by effort: engine-core
  constructs the `ShaderBuilder` internally and never exposes it, so engine-gmt
  cannot configure it before the feature loop and had to reimplement. An optional
  `configure?: (b: ShaderBuilder) => void` on core would unblock it. Separately,
  engine-gmt's ADR-0043 `@invariant` (inject() runs for every feature regardless
  of enabled state) is a GENERIC contract that core relies on and does not state —
  copying that comment across is the highest value-per-risk item in the area.
- **`mesh-export/` has no runtime guard of any kind.** Per-axis export bounds is
  a known live bug deferred to v2 integration; do not attempt it unattended.

### Standing reminders

Owner is asleep; the morning is spent disproving unverified claims, so pace over
throughput still applies. Never push, never touch `main`, never delete a file.
The dashboard is built every cycle but **never published** — publishing prompts.
