# Context-Loading Protocol

🚧 **Evolving** — the taxonomy and CPT ratios are under active tuning; the load-order policy and script contract are stable.

## Why this exists

`dev/` is one git repo holding the engine plus several apps: **2,241 tracked
files, ~8.65M tokens** of text if you loaded everything. No agent should ever
load "everything." This protocol is how we decide *what is worth reading, in
what order, and at what token cost* — so a task pulls in the ~30k–150k tokens it
actually needs instead of drowning in fixtures, snapshots, and legacy reference.

It has two halves:

- **Policy** (this doc) — the taxonomy that classifies every file and the
  load-order rules that follow from it.
- **Measurement** ([`plans/context-protocol/`](../../plans/context-protocol/)) —
  zero-dependency scripts that cost every file and answer "what does it cost to
  understand X."

## The three classification axes

Every tracked file gets three labels, computed purely from its path by
[`classify.mjs`](../../plans/context-protocol/scripts/classify.mjs).

### 1. Tier — *which part of the system*

`engine-core` · `engine-gmt` · `gmt-app` (root `components/ store/ hooks/
utils/ data/ types/`) · `app-gmt` · `fluid-toy` · `fractal-toy` · `demo` ·
`mesh-export` · `docs` · `tooling` (`debug/`, `plans/`) · `public` · `root`.

Drives the per-tier cost rollup. (Mirrors [`CODEBASE_MAP.md`](../../CODEBASE_MAP.md).)

### 2. Context class — *what kind of context it is*

`orient` · `architecture` · `reference-legacy` · `source` · `source-tooling` ·
`config` · `data` · `asset` · `generated`.

### 3. Load policy — *how an agent should treat it* (the filter)

This is the heart of the protocol — the "good context vs not necessary" call.

| Policy | Meaning | Examples |
|---|---|---|
| `read-first` | Orientation. Load once at the start of (almost) any task. | `CLAUDE.md`, `CODEBASE_MAP.md`, `AGENTS.md`, `docs/DOCS_INDEX.md`, `FEATURE_STATUS.md`, app `README.md` |
| `read-for-area` | Architecture/design docs for the subsystem you touch. | `docs/engine/*`, `docs/modules/*`, `docs/specs/*`, `docs/adr/*`, `docs/policy/*`, in-tree `plans/*.md` |
| `on-demand` | Source of truth. Load **targeted**; prefer the area's doc first. | `engine/**/*.ts(x)`, `engine-gmt/**`, shaders, tooling scripts, config |
| `reference-only` | Legacy/historical. Load only if explicitly relevant. | `docs/gmt/*`, `docs/archive/*`, `**/reference/**` import corpora |
| `skip` | Data/fixtures/snapshots. Not context unless the task is about the data. | `public/**`, `*.gmf`, `*.json`/`*.yaml` snapshots & manifests, `debug/*.json` probe dumps |
| `never` | Generated/binary. Never load as text. | `dist/`, `node_modules/`, `*-lock.json`, `*.tsbuildinfo`, images/fonts/media |

**Rule:** classification is path-based and deterministic — no per-file
annotation, no drift. Extend the rules in `classify.mjs`, never tag files
individually.

**Why:** 2,241 files cannot be hand-curated and stay correct. Path rules are
the only thing that survives the repo changing under us.

## Token-cost model

`tokens ≈ ceil(chars / CPT(filetype))`, where CPT (chars-per-token) varies by
content type — code and JSON are punctuation-dense (low CPT, more tokens/char),
prose is word-dense (high CPT). See
[`tokens.mjs`](../../plans/context-protocol/scripts/tokens.mjs) for the table
(code 3.4, shader 3.2, json 2.9, prose 3.9, …).

**Accuracy:** ±10–15%. There is no official local tokenizer for Claude, so this
is a heuristic by design — accurate enough for *budgeting and ranking*, which is
all the protocol needs. Cross-validated against an independent
word/punctuation-run count: the two methods agree within ~5–12% for code (the
dominant source type) and ~25% for prose, bracketing the truth.

**Calibration / swap-in:** set `CONTEXT_CPT_SCALE` (e.g. `1.05`) to scale all
estimates once you measure the headline against real Claude usage. To swap in a
real tokenizer later, replace `estimateTokens()` — every caller goes through it.

## The load-order protocol

For any task, collect context in layers, cheapest-leverage-first, and **stop as
soon as you can answer the question**:

```
Layer 0  Orientation  (~29k, once per session)
         CLAUDE.md · CODEBASE_MAP.md · AGENTS.md · docs/DOCS_INDEX.md
         + the README of the app you're in.
            ↓
Layer 1  Architecture / docs for the area  (typically +2k–30k)
         The module doc or engine doc that covers the subsystem.
         >> Most questions are answered here, for a fraction of source cost. <<
            ↓
Layer 2  Source of truth  (the expensive layer)
         Targeted code only. Heavy files (≥4k tokens) read in SECTIONS.
```

**Rule:** never open Layer 2 source before checking whether a Layer 1 doc
answers the question. **Why:** across the repo the cheap path (orientation +
docs) is routinely 30–65% of the full path's token cost — and often 100% of what
you needed.

**Rule:** files ≥ **4,000 tokens** are read in sections (by line range or
symbol), never whole. The map flags 247 such context-worthy files. **Why:** a
single 20k-token file can blow a focused budget for no marginal understanding.

## Using the scripts

From `dev/`:

```bash
npm run context:map                       # rebuild the cost map + report
npm run context:cost -- <target>          # layered load plan
npm run context:cost -- --list            # list profiles, apps, subsystems, tiers
npm run context:cost -- <target> --budget 60000   # cut the plan at 60k tokens
npm run context:cost -- <target> --pack   # compact ordered reading list (sliced)
npm run context:cost -- --profile <name>  # canned task bundle → packed list
npm run context:cost -- <target> --json   # machine-readable plan
npm run context:symbols                   # symbol-index.json for heavy files
npm run context:check [-- --strict]       # CI gate: staleness / classification
```

`<target>` is one of:
- **`app:<name>`** — the import-graph **reachable set** from an app entrypoint
  (`app:app-gmt`, `app:fluid-toy`, …). The code the running app actually pulls
  in — far smaller than its tiers.
- **subsystem id** — `e01-feature-system`, from
  [`subsystems.json`](../../plans/doc-audit-state/subsystems.json) (`--list`).
- **tier** — `engine-core`, `fluid-toy`, … (also pulls the tier's design docs).
- **path / prefix / substring** — `engine/plugins`, `FormulaWorkshop`, `animation`.

The plan resolves the area's docs first, then its source, with a running
cumulative budget and a cheap-path-vs-full-path ratio. Worked examples —
`engine-core`: **~60k via docs, ~311k to read all source**; `app:app-gmt`:
**605 reachable files, ~1.56M of source** (vs ~3.2M if you loaded its tiers).

### Reachability (Phase 2)

`build-context-map` walks each app's import graph (`reachability.mjs`) — static
`import`/`export-from`, dynamic `import()`, `?raw`/`?url` queries, and worker
`new URL(..., import.meta.url)` — and annotates every file with the apps that
reach it. From this:
- **`app:<name>`** costs exactly the reachable set.
- **Dead context** — app-tier source reached by *no* app entrypoint (14 files,
  ~74k) — is listed in the report. These are never worth loading and are
  deletion candidates; this surfaces the engine-core/engine-gmt dual-tree
  shadowing (e.g. `engine/ConfigDefaults.ts`, shadowed by the engine-gmt copy).
  **`npm run orphans` (knip) is the authority for true deletion** — it also
  counts debug/test entrypoints, which this deliberately does not.

### Sub-file slicing (Phase 3)

Heavy files get **slice anchors**: `symbols.mjs` extracts top-level symbols and
line ranges, so a load plan can say *read `FeatureSystem.ts:413-656`
(`FeatureRegistry`)* instead of the whole 9k-token file. `--pack` uses this to
fit big files into a budget by reading only their largest symbol. Browse the
full index at [`symbol-index.json`](../../plans/context-protocol/symbol-index.json).

### Budgeter & profiles (Phase 4)

- `--pack` emits a copy-pasteable checklist ordered cheap-first (docs → source),
  cut at `--budget`, with heavy files sliced. Excluded items are summarised.
- `--profile <name>` expands a canned `(target, budget, note)` from
  [`profiles.json`](../../plans/context-protocol/profiles.json) into a packed
  list. E.g. `--profile ddfs-feature` → a ~13k reading list for adding a feature.

### Honesty gate (Phase 5)

`context:check` fails CI when the committed map's file set drifts from
`git ls-files`, warns when the map predates the latest commit or when a file
falls through to `fallback` classification (an unhandled type — add a rule in
`classify.mjs`), and reports the doc-coverage gap and dead-context count. It also
prints the calibration hint (below). Note: the map covers **tracked** files
only; brand-new untracked files are measured after they're committed + remapped.

Outputs (regenerable, not hand-edited):
- [`context-map.json`](../../plans/context-protocol/context-map.json) — full per-file detail + rollups + per-app reachability.
- [`context-report.md`](../../plans/context-protocol/context-report.md) — human summary.
- [`symbol-index.json`](../../plans/context-protocol/symbol-index.json) — heavy-file slice anchors.

## Current snapshot

Regenerate with `npm run context:map`; treat as ±10–15%.

| Metric | Tokens | Files |
|---|--:|--:|
| Total tracked | 8.65M | 2,241 |
| **Context-worthy** (orient + architecture + source) | **3.31M** | 1,231 |
| &nbsp;&nbsp;Orientation (`read-first`) | 29k | 14 |
| &nbsp;&nbsp;Architecture (`read-for-area`) | 1.11M | 365 |
| &nbsp;&nbsp;Source of truth (`on-demand`) | 2.16M | 852 |
| Skipped data / fixtures | 3.50M | 248 |
| Legacy reference | 1.71M | 648 |
| Generated / binary | 132k | 114 |

Per-app reachable source (import-graph from entrypoint):

| App | Files | Tokens |
|---|--:|--:|
| app-gmt | 605 | 1.56M |
| fluid-toy | 403 | 922k |
| demo | 323 | 739k |
| fractal-toy | 301 | 679k |
| mesh-export | 233 | 571k |
| **union** | 744 | 1.88M |
| dead (reached by none) | 14 | 74k |

The headline: **orienting on the whole repo costs ~29k tokens; comprehending all
live source + design docs costs ~3.30M; the largest app's actual code is ~1.56M.**
The protocol keeps most tasks within one or two subsystem bundles of the first
number — a `--profile` reading list for a typical feature task is ~13k.

## Maintenance

**Rule:** regenerate `context:map` after material structure changes (new tiers,
new doc trees, large file moves). The map is committed so plans are reproducible
without a rebuild; `context:cost` warns when the map predates the latest commit.

**Rule:** when a file is misclassified, fix the *rule* in `classify.mjs` and
note the case here — do not special-case the file.

## Decisions

- **Whole-repo scope, tiered.** "Cost for the app" means every tracked file,
  grouped by tier — so we can budget loading *any* part, not just app-gmt.
- **Zero-dependency heuristic over a tokenizer dep.** No official Claude
  tokenizer exists; third-party ones only approximate it too. A calibrated
  char-ratio is faster, deterministic, dependency-free, and accurate enough for
  budgeting. Pluggable if that ever changes.
- **Path-based classification, no per-file tags.** The only approach that stays
  correct as the repo evolves.
- **`subsystems.json` is the curated-bundle source.** Reused rather than
  duplicated; it already maps files → docs from the 2026-05-19 doc audit.

## Status & remaining roadmap

Built: classification + costing (v1), import-graph reachability + dead context
(Phase 2), sub-file slicing (Phase 3), `--pack` budgeter + profiles (Phase 4),
`context:check` drift gate (Phase 5), discoverability pointers (Phase 6a). See
[`plans/context-protocol/README.md`](../../plans/context-protocol/README.md).

Remaining: a one-time real-token calibration of `CONTEXT_CPT_SCALE`, and
generalising the path rules so `stable/` and `gmt-rs/` can run the same scripts.
