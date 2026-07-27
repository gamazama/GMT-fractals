# AGENTS.md

`gmt-engine` — a generic application engine (DDFS, animation, UI primitives,
save/load, shortcuts, undo, worker contract, plugin seams) with the GMT fractal
explorer (`app-gmt/`) and sibling apps built on top of it. **This tree is the
production checkout**; it serves app.gmt-fractals.com.

This file follows the [agents.md](https://agents.md/) convention: a thin
entry-point. It does not duplicate `CLAUDE.md` — it points at it.

## Start here

1. **[`CLAUDE.md`](CLAUDE.md)** — the operational rules. Documentation
   conventions, architecture rules, anti-patterns, automated checks.
2. **[`CODEBASE_MAP.md`](CODEBASE_MAP.md)** — where code lives.
3. **[`.claude/rules/`](.claude/rules/)** — per-subsystem rules. Claude Code loads
   these automatically when you open a matching file. **Other agents should read
   the rule matching their target path manually** — each names the JSDoc entry
   point, the governing ADRs, and the guard script for that area.

## Then

| Concern | Read |
|---|---|
| Why a decision was made | [`docs/adr/`](docs/adr/) — append-only, ~110 ADRs |
| Cross-cutting policy spanning many files | [`docs/policy/`](docs/policy/) |
| Full documentation tree | [`docs/DOCS_INDEX.md`](docs/DOCS_INDEX.md) |
| Session-by-session progress log | [`HANDOFF.md`](HANDOFF.md) |
| What to load, in what order, at what token cost | [`docs/policy/context-loading-protocol.md`](docs/policy/context-loading-protocol.md) |
| Pre-extraction historical reference (attic — may be stale) | [`docs/history/`](docs/history/) |

**Navigation policy: read source, not docs about source.** Default to reading
source files and grepping the annotation markers (`@invariant`, `@bug PRODUCTION:`,
`@see`, `@stale`, `@deprecated`). If you find yourself reading a doc that restates
code, stop and read the code. External docs are reference-of-last-resort for
context the code doesn't carry.

Before bulk-loading source for a subsystem, run a load plan:
`npm run context:cost -- <subsystem|tier|path|app:name>`.

## Apps in this repo

| Path | What |
|---|---|
| `app-gmt/` | The GMT fractal explorer — the product |
| `fluid-toy/` | 2D fluid sim sibling app (engine smoke test, also product-track) |
| `fractal-toy/` | Smaller fractal demo, engine smoke test |
| `gradient-explorer/` | Gradient/palette tool |
| `mesh-export/` | Mesh export tool (separate Vite entry) |
| `demo/` | Minimal reference add-on. Three-file contract. |

## Citations

Every architectural claim cites `path/to/file.ts:N` or `path/to/file.ts:N-M`.
If you can't cite it, you don't know it yet.

---

Last reviewed: 2026-07-27 (path-scoped rules added; stale `docs/modules/` and
`.clinerules` pointers removed).
