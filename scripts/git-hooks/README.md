# Git hooks

Tracked copies of the hooks this repo relies on. `.git/hooks/` is **not**
version-controlled, so anything living only there is invisible to review and
vanishes on a fresh clone — these are the source of truth.

## Install

```sh
cp scripts/git-hooks/pre-commit scripts/git-hooks/commit-msg .git/hooks/
chmod +x .git/hooks/pre-commit .git/hooks/commit-msg
```

(Or point git at this directory wholesale with
`git config core.hooksPath scripts/git-hooks` — note that this replaces
`.git/hooks` entirely, so every hook you want must live here.)

## What they do

**`pre-commit`** — refuses commits that don't typecheck. Skips itself when no
`.ts`/`.tsx` is staged, so doc-only and audit-state commits stay instant; ~9s
otherwise.

It exists because of a specific failure on 2026-07-28. A comment containing
backticks was added *inside* a GLSL template literal in
`mesh-export/gpu/gpu-pipeline.ts`; a backtick terminates a template literal, so
the file stopped parsing. It was committed anyway, because the verification
command was `npm run typecheck 2>&1 | tail -2 && git commit`. **A pipeline's exit
status is the last command's**, so `tail` returning 0 masked tsc's failure and the
`&&` ran regardless. tsc printed its errors; nothing acted on them.

The general lesson, which the hook encodes: reading piped output is not the same
as checking an exit code. When you must pipe, check `${PIPESTATUS[0]}`.

**`commit-msg`** — strips stray PowerShell here-string wrappers (`@'` / `'@`) that
appear when that syntax is run in a POSIX shell.
