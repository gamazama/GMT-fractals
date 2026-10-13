# gmt-engine — Handoff

**Location:** `h:/GMT/workspace-gmt/stable/` on `main` — the working tree and the production checkout (Cloudflare Pages deploys on push).
**Origin:** forked from gmt-0.8.5; the engine extraction is complete and every app boots on it.

The per-session log that filled this file is retired. A change is recorded in its commit message
(`git log`), a decision in an ADR (`docs/adr/`); the log as it stood is in this file's history.

## How to resume

```bash
git log --oneline -30
npm run typecheck              # should exit 0
npm run dev                    # vite on localhost:3400
```

Checks and entry points: `CLAUDE.md` (Automated Checks) and `.claude/rules/`.
