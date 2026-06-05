# context-protocol

Tooling for the **context-loading protocol** — measure what every file costs to
read, classify what's worth reading, and produce cheapest-first load plans for
any subsystem, tier, or path.

Policy lives in
[`docs/policy/context-loading-protocol.md`](../../docs/policy/context-loading-protocol.md).
This folder is the measurement half.

## Layout

```
plans/context-protocol/
├── README.md                 ← you are here (ops + roadmap)
├── context-map.json          generated — per-file cost map + rollups + reachability
├── context-report.md         generated — human summary
├── symbol-index.json         generated — heavy-file slice anchors
├── profiles.json             canned task bundles for --profile
└── scripts/
    ├── tokens.mjs            calibrated zero-dep token estimator (pluggable)
    ├── classify.mjs          tier / context-class / load-policy taxonomy
    ├── reachability.mjs      import-graph walker (per-app reachable sets)
    ├── symbols.mjs           top-level symbol + line-range extractor
    ├── build-context-map.mjs walks git ls-files → context-map.json + report
    ├── build-symbol-index.mjs heavy source files → symbol-index.json
    ├── context-cost.mjs      query: layered plan / packed list / reachable set
    └── context-check.mjs     CI gate: staleness / classification drift
```

No npm dependencies — `git` + Node fs only. Generated artifacts are committed so
load plans reproduce without a rebuild.

## Commands

```bash
# from dev/
npm run context:map                          # rebuild map + report
npm run context:symbols                      # rebuild heavy-file slice index
npm run context:check                        # CI gate (--strict to fail on warnings)
npm run context:cost -- --list               # profiles, apps, subsystems, tiers
npm run context:cost -- app:app-gmt          # import-graph reachable set
npm run context:cost -- e01-feature-system   # subsystem load plan
npm run context:cost -- engine-core          # tier load plan (+ its docs)
npm run context:cost -- engine/plugins       # path load plan
npm run context:cost -- e03-animation --pack --budget 60000  # packed reading list
npm run context:cost -- --profile ddfs-feature   # canned bundle → packed list
npm run context:cost -- mesh-export --json   # machine-readable
```

A load plan has three layers — **0 orientation** (assume loaded), **1
architecture/docs** (read first, cheap), **2 source of truth** (targeted,
expensive) — each with a running token total and a cheap-path-vs-full-path
ratio. Stop at the cheapest layer that answers your question; heavy files come
with line-range slice anchors so you read sections, not the whole file.

## Gotchas

- **New files are invisible until tracked.** `build-context-map.mjs` enumerates via
  `git ls-files`, so a freshly written doc (or any new file) won't appear in a load
  plan — and a subsystem's `module_doc_path` will still read as a "⚠ doc-coverage gap"
  — until you `git add` it. Stage new files *before* `npm run context:map`.

## Snapshot (regenerate with `npm run context:map`)

| Metric | Tokens | Files |
|---|--:|--:|
| Total tracked | 8.65M | 2,241 |
| **Context-worthy** | **3.30M** | ~1,231 |
| Orientation (`read-first`) | 29k | 14 |
| Architecture (`read-for-area`) | 1.11M | 365 |
| Source of truth (`on-demand`) | 2.16M | 852 |
| Reachable union (all apps) | 1.88M | 744 |
| app-gmt reachable | 1.56M | 605 |
| Dead context (reached by none) | 74k | 14 |
| Skipped data / legacy / generated | 5.34M | 1,010 |

Symbol index: 1,285 symbols across 142 heavy source files.

## How it was validated

- Builder runs clean over all 2,241 tracked files; rollups reconcile to totals;
  `context:check` reports 0 errors / 0 warnings.
- Taxonomy corrected until no data snapshot (debug/plans `.json`/`.yaml`) leaks
  into source, no `/reference/` corpus counts as source, `LICENSE`/legal files
  are classified (the `fallback` gate caught this), and orientation holds only
  the nav/rules core (heavy logs demoted to `read-for-area`).
- Estimator cross-checked against an independent word/punctuation count: ~5–12%
  agreement on code, ~25% on prose — consistent with the ±10–15% claim.
- Reachability cross-checked against `knip`: knip's 2 app-source orphans both
  appear in dead-context; the extra entries are engine-core stubs shadowed by
  engine-gmt (verified via `FractalEngine.ts` imports) — a correct, narrower
  "reached by a shipping app" question.
- `context:cost` exercised across `app:` / subsystem / tier / path / `--pack` /
  `--profile` / `--budget` / `--json` / bad-target / `--list`, and via `npm run`.

---

## Roadmap

The goal beyond v1 ("filter, cost, plan") was to **load large sections of context
efficiently and smoothly.** Phases 2–6a are now built:

- ✅ **Phase 2 — Reachability.** Import-graph walk (`reachability.mjs`) gives
  per-app reachable sets (`app:<name>`) and a dead-context list. Walks static +
  dynamic + `?raw`/`?url` + worker-URL imports; cross-checked against knip.
- ✅ **Phase 3 — Sub-file slicing.** `symbols.mjs` + `symbol-index.json` anchor
  the largest symbols in heavy files; load plans and `--pack` emit line ranges.
- ✅ **Phase 4 — Budgeter & profiles.** `--pack` packs a cheap-first reading list
  into `--budget`, slicing heavy files; `--profile` expands canned task bundles.
- ✅ **Phase 5 — Honesty gate.** `context:check` fails on file-set drift, warns on
  stale map / `fallback` classification, reports doc-coverage + dead context.
- ✅ **Phase 6a — Discoverability.** Pointers added to `AGENTS.md` + `CLAUDE.md`.

Remaining:
- **One-time real calibration.** Measure the orientation bundle's real Claude
  token count once and set `CONTEXT_CPT_SCALE = real / estimate` to pin the
  estimator; `context:check` prints the hint. (Needs a real-usage measurement.)
- **Phase 6b — Cross-repo.** The scripts resolve their own repo root, so they're
  copy-portable; generalise the tier/entrypoint tables so `gmt-rs/` (and others)
  can run them without edits. (Deferred — `stable/` intentionally out of scope.)
- **Wire `context:check` into CI / a pre-push hook** once the map is committed,
  so drift fails fast.
