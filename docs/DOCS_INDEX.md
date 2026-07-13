# gmt-engine Documentation — Master Index

## Authority model

The source tree is the truth. In order of authority:

1. **Source JSDoc + greppable markers** (`@invariant`, `@bug PRODUCTION:`, `@see`, `@stale`, `@deprecated`) — freshest, most-trusted. The default navigation path for agents.
2. **ADRs** ([`adr/`](adr/)) — dated, append-only decision records; cited from source via `@see docs/adr/NNNN-*.md`.
3. **Policy docs** ([`policy/`](policy/)) — cross-cutting rules that span many files.

External narrative docs (the old `docs/engine/*` and `docs/gmt/*`) have been **archived to [`history/`](history/)** — pre-extraction reference, superseded by the three layers above. Don't navigate *from* them; navigate from **CLAUDE.md's "Read first" table**, which maps each subsystem to its authoritative source JSDoc + ADRs.

## Live layout

```
docs/
├── DOCS_INDEX.md        ← you are here
├── FEATURE_STATUS.md    engine snapshot (what works / what's missing)
├── CHANGELOG_DEV.md     running dev log
├── adr/                 architecture decision records — append-only, @see-cited from source
├── policy/              cross-cutting rules (engine-fork-rules, ddfs contracts, shader-compile, context-loading, …)
├── releases/            user-facing release notes (going-forward home)
├── specs/               spec-ish deep dives
├── research/            open investigations
├── modules/             sibling-app / subsystem overviews (fluid-toy, fractal-toy, gradient-explorer, mesh-export, palette)
└── history/             📦 archived — reference only (see below)
```

## Where to start

- **Any task** → [`CLAUDE.md`](../CLAUDE.md) — rules + the "Read first" table mapping each subsystem to its authoritative source JSDoc + ADRs.
- **New contributor** → [`../CONTRIBUTING.md`](../CONTRIBUTING.md), then the app README below.
- **Repo geography** → [`CODEBASE_MAP.md`](../CODEBASE_MAP.md).
- **What to load & at what token cost** → `npm run context:cost -- <subsystem|tier|path|app:name>` (see [`policy/context-loading-protocol.md`](policy/context-loading-protocol.md)).

Each app owns the canonical entry point for "I'm about to work on this app":

| App | README |
|---|---|
| `app-gmt` | [app-gmt/README.md](../app-gmt/README.md) |
| `fluid-toy` | [fluid-toy/README.md](../fluid-toy/README.md) |
| `demo` | [demo/README.md](../demo/README.md) |

## Decisions & policy

- [adr/](adr/) — Architecture Decision Records, append-only. The authority order (source JSDoc → ADRs → policy) is defined in [CLAUDE.md](../CLAUDE.md).
- [policy/](policy/) — engine-fork-rules, ddfs-string-contract, ddfs-auto-wiring, uniform-plugin-contract, shared-ui-coupling-rules, shader-compile-optimization, context-loading-protocol.

## History (reference only)

[`history/`](history/) holds what used to live directly under `docs/`:

- `engine/`, `gmt/` — pre-extraction narrative architecture docs. Superseded by source JSDoc + ADRs; kept for archaeology.
- `audit-2026-05-20/`, `doc-audit-state/` — the 2026-05-20 doc audit (surveys, followups, module-doc archive) that produced ADRs 0001-0058.
- `animation-refactor/`, `archive/`, `plans-archive/` — completed-refactor findings and retired design notes.

**Rule:** don't cite `history/` as a current contract. A source breadcrumb (`@see docs/history/…`) pointing at rationale is fine, but the authoritative answer lives in source JSDoc or an ADR.

## Style

- Markdown links for paths: `[text](path/to/file.ts)`; line refs `[FeatureSystem.ts:236](../engine/FeatureSystem.ts#L236)`.
- New decision (even rejected) → new ADR in `adr/` (append-only). New cross-cutting rule → a doc in `policy/`. A subsystem contract or invariant → JSDoc at the source site, **not** a new markdown file.

---

*Reorg 2026-07-13: external narrative (`docs/engine`, `docs/gmt`) + the 2026-05-20 audit apparatus moved to `docs/history/`; generated worklists (bugs.md / backlog.md / HEALTH.md) retired in favour of grepped `@bug`/`@stale` markers + `npm run context:cost`.*
