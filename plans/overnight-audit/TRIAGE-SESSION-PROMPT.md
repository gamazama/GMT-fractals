# Triage session — paste the block below into a fresh session

---

Read `plans/overnight-audit/PROTOCOL.md` first for context on how the work you are
triaging was produced. Do not re-run the audit — it is finished.

## Where things stand

An unattended multi-cycle audit of this repo ran 2026-07-27 → 2026-08-02. It is
complete: **33/33 subsystems audited, 76/76 guard scripts falsified.** Everything
lives on the branch `audit/overnight-2026-07-27`, which has **~261 commits and has
never been pushed**. `main` is untouched and auto-deploys to app.gmt-fractals.com,
so pushing is a production deploy.

The artifacts, in the order you will want them:

- `plans/overnight-audit/MERGE-REVIEW.md` — the 260 commits reduced to only what
  can change runtime behaviour: 62 shipping files, 529 code lines, ~300 of which
  are real logic. Comments, docs, rules and test harnesses stripped out. Organised
  by how much judgement each part needs.
- `plans/overnight-audit/PROPOSALS.md` — the Tier B backlog. **56 sections: 11
  HIGH, 28 MEDIUM, 17 LOW.** Each carries a claim, its evidence, the options and a
  recommendation. Nothing in it has been applied.
- `plans/overnight-audit/results/*.json` — 40 result files, one per subsystem or
  guard-sweep batch, with every finding and how it was verified.
- `plans/overnight-audit/journal.jsonl` — one entry per cycle, what happened and
  what it cost.
- `plans/overnight-audit/dashboard.html` — open in a browser for the overview.

Every **applied** finding is already a commit whose message states what was wrong
and how the fix was verified. **Do not re-read or re-derive those** — that work is
done and recorded. This session is about the things that were deliberately *not*
applied, and about whether to land the branch.

## Your job, in this order

### 1. Staleness pass over PROPOSALS.md — do this before reading it properly

The backlog accumulated over 13 cycles, and **later cycles resolved some of what
earlier cycles escalated.** At least one is known: `smoke:liquify`'s ~23% flakiness
was queued as Tier B in cycle 12, then actually fixed in batch 4 of the guard sweep
(commit `3690d09b`). There will be others.

For each of the 56 sections, check whether it is still open — by grep or by reading
the code it names, not by assuming. Mark the closed ones in place with a dated
`> **CLOSED YYYY-MM-DD — <commit>:** <one line>` block. **Do not delete anything**;
the record of what was once open is worth keeping.

Report the count: how many of the 56 are genuinely still open.

### 2. Triage what remains

For each still-open item, produce a one-line verdict: **do it now / do it later /
won't do**, with a reason. Group by verdict, not by severity. Where "do it now" is
a small, well-specified change with a guard already covering it, say so — several
are one-liners.

Three HIGH items I would look at first, because each is a real coverage hole rather
than a code defect:

- **Nothing in the repo fails when the Fragmentarium importer emits shaders that
  cannot compile.** Both guards the rule cites stay green. Closing it means deciding
  what to do about a pre-existing RecFold failure first — gate it wrong and you get
  a permanently-red guard, which is how `test:frag:integration` got into trouble.
- **The palette component layer — 6,257 lines including `PickerWall`'s index math
  and `FavientsPanel`'s drop logic — has zero automated coverage.** Breaking every
  gradient strip in the app leaves every guard green.
- **`engine-gmt`'s bucket accumulation path has no runtime guard at all.**

### 3. The merge decision

Read `MERGE-REVIEW.md` end to end. Its §1 is the only part a test cannot settle:
the seven `@keyframes` existed only inside `demo.html`'s inline `<style>`, so every
`animate-*` class in the deployed app resolved to nothing. Defining them in
`index.css` makes a lot of previously inert animation start firing. **That needs a
visual pass — boot the app and look.**

Verify before recommending anything: `npm run typecheck`, `npm run
check:rule-guards`, `npm run smoke:boot`, `npm run smoke:engine-gmt`. All four were
green when the review was written; confirm they still are. `npm run smoke:all`
(42 members, ~10 min) is the fuller check if you want it.

Then give a recommendation on merging, and **stop there.** See below.

## Hard constraints

- **Never `git push` and never commit to `main` without the owner explicitly saying
  so in this session.** `main` auto-deploys to production. Recommending a merge is
  your job; performing it is theirs to authorise.
- **Never delete a file.** Emptying, truncating and `git rm` all count.
- Do not edit `.claude/hooks/**`, `gmt-rs/**`, `node_modules/`, `dist/`, `.env*`.
- `docs/history/**` is append-only; a PreToolUse hook enforces it.
- ADRs are append-only: a dated `> **Update YYYY-MM-DD (...; decision unchanged):**`
  block is fine, rewriting a Decision body is not.
- Stage explicit paths and commit with the pathspec form —
  `git commit -F <msgfile> -- <path>`. The audit learned this twice: parallel agents
  share one git index, and `add` + `commit` is not atomic across processes.

## Two things worth carrying in

**The audit's central finding, in case it changes how you read the backlog:** the
dominant guard defect was not "no test exists" but **a test that could not fail** —
44 of 76 guards were defective, and the most common mode was *green because the
input vanished*: `test:frag` printed `0 passed 0 failed` and exited 0 with its
entire ~580-file corpus missing; `smoke:gx-fractal-glitch` printed its full
"glitch-free" banner on a completely blank render. Its cousin: **a negative
assertion must prove its subject exists first.** If you propose new coverage, hold
it to that bar — write the guard, break the code, watch it go red, then revert.

**Two cross-cutting sweeps remain unstarted** and are listed at the bottom of
`PROTOCOL.md`: the `@invariant` → `@assumption` pass across ~152 files, and the
NUL-byte scan (three instances found so far, all incidentally — one of them made a
whole file invisible to grep for an entire audit run). Neither is urgent. Do not
start either in this session unless the triage finishes early and the owner asks.

---

**Pace over throughput. Verify before you assert. If you cannot check a claim, say
so rather than assuming it still holds — several of these were written days ago
against code that has since moved.**
