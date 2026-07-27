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
- If a change would require any of the above to verify it, the finding is Tier B.

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
   - returns its findings as JSON. It does **not** spawn agents of its own.
5. **Verify Tier V** as a *separate, subsequent* step — collect the V findings from
   both auditors, then spawn up to 2 verifiers as flat parallel `Agent` calls.
   Never inside the auditor step.
6. **Apply confirmed Tier V**, typecheck, commit. The orchestrator does this
   itself, in its own turn — not via another agent.
7. **Write results** to `results/<id>.json` (schema below), update `worklist.json`,
   append a line to `journal.jsonl`.
8. **Rebuild and republish the dashboard**:
   `node plans/overnight-audit/scripts/build-dashboard.mjs`, then publish
   `plans/overnight-audit/dashboard.html` via the Artifact tool passing
   `url: state.dashboardUrl` so the URL stays stable.
9. **Schedule the next cycle.**

If a cycle fails partway, the next cycle picks up from `worklist.json` — subsystems
left `in-progress` are reset to `pending` at the start of each cycle.

## What to audit, per subsystem

In priority order. Stop when the subsystem is genuinely covered, not when the list
is exhausted.

1. **`@invariant` verification.** 152 files carry one. Does the code still satisfy
   what the annotation claims? This is the highest-value pass and nothing else
   checks it. A broken invariant is usually Tier V (write a probe to prove it).
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
