# doc-audit-state — overnight audit working state

This directory is the persistent state for the overnight documentation audit
driven by [`../doc-audit-overnight.md`](../doc-audit-overnight.md). Nothing in
`dev/docs/` should be edited; everything the loop produces is rooted either here
or under `dev/docs/modules/` (a new tree).

## Layout

| Path | Owner | Purpose |
|---|---|---|
| `README.md` | human | this file |
| `scripts/` | tooling | mechanical scripts the loop calls (see below) |
| `subsystems.json` | scaffold + loop | partition of the codebase into 28 iterations. Loop updates `status`. |
| `progress.json` | loop | append-only log of completed iterations. Resume = read this first. |
| `file-inventory.yaml` | `build-inventory.mjs` | canonical list of files that must be covered. **Do not hand-edit.** |
| `coverage.yaml` | `record-coverage.mjs` | what each iteration verified, with `blob_sha` + confidence. Append-only via the script (uses `.lock` sentinel). |
| `survey/` | loop | per-subsystem survey notes from Phase 1. Short, grounded, file:line-cited. |

## Scripts

All scripts are `.mjs`, Node ESM, no npm deps. Cross-platform (Windows + WSL).

| Script | Use |
|---|---|
| `scripts/build-inventory.mjs` | Walks `git ls-files`, applies the exclusion ruleset (debug/, dist/, public/, node_modules/, /reference/, binaries, locks, >500KB), writes `file-inventory.yaml`. **Run once at Phase 0.5 start.** |
| `scripts/blob-sha.mjs <path>` | Prints `git hash-object` for a file. Survey/writer agents call this to record the SHA they verified against. |
| `scripts/verify-doc.mjs <doc.md>` | Post-write verification for a module doc: frontmatter completeness, public_api grep in source, file:line anchor reachability, declared read-range vs actual file length. Exit codes: 0 PASS, 2 frontmatter, 3 symbol, 4 anchor, 5 partial. |
| `scripts/record-coverage.mjs` | Reads a single coverage entry as YAML from stdin and appends it atomically (with `.lock`) to `coverage.yaml`. |
| `scripts/coverage-check.mjs` | Diffs `file-inventory.yaml` vs `coverage.yaml`. Reports uncovered files, orphan claims, partial entries, and percentage. |

## Resuming after a session reset

If `/loop` is restarted (e.g. after the 11pm Claude Max reset):

1. Read `progress.json`. It lists every completed iteration with `subsystem_id`, `phase`, `status`.
2. Read `subsystems.json`. Find the first entry whose `status` is `pending`.
3. Skip anything marked `in_progress` — a previous session may have crashed mid-iteration; those go to a human-review pile rather than retrying blindly.
4. Resume from the first pending subsystem.

The model's memory holds nothing. All state is on disk in this directory.

## Where to look if something failed

- **A coverage write looks lost.** Check for `coverage.yaml.lock`. If it exists with no live process, the previous `record-coverage.mjs` was killed mid-write. Inspect `coverage.yaml.tmp` if present, decide whether to commit it manually, then delete the lock.
- **`verify-doc.mjs` keeps failing the same doc.** Run it locally and read stderr. Exit 2 = frontmatter bug, 3 = the agent invented a symbol that isn't in source, 4 = the agent invented a file:line citation, 5 = the agent only read part of the source (file goes back into the queue for a continuation pass).
- **A subsystem is stuck on `in_progress`.** That's the signal that a previous iteration crashed. Mark it `pending` again only after a human spot-check confirms no partial output was left in `survey/<id>.md` or in `dev/docs/modules/...`.
- **`coverage-check.mjs` reports orphan claims.** A doc was recorded against a file path not in the inventory. Usually a typo or a path drift since the inventory was built. Either rebuild the inventory or fix the doc.
- **Token-cap or re-read watchdog tripped.** The plan flags the subsystem for human review rather than retry. Look in `progress.json` for `status: "flagged-for-human-review"`.

## Phase order (cheat sheet)

```
Phase 0      manual: this scaffold + subsystem partition (done)
Phase 0.5    one-shot: build-inventory.mjs
Phase 1      loop: survey/  (per subsystem, in order)
Phase 1.5    orphan sweep: any file in inventory not claimed by any subsystem
Phase 2      loop: write dev/docs/modules/<area>/<file>.md per surveyed subsystem
Phase 3      reconcile: refresh DOCS_INDEX.md + CODEBASE_MAP.md deltas + audit summary doc
```
