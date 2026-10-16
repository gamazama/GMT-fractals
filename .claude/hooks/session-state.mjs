#!/usr/bin/env node
/**
 * SessionStart — prints the live state of this checkout into the session's context.
 *
 * Replaces status lines that used to live in memory notes ("N commits ahead",
 * "merged, unpushed", "What's New still Unreleased"). Those drifted the moment
 * they were written; git and the changelog files are the source of truth, so
 * memory says what a thing IS and this hook says where it STANDS.
 *
 * Reads only local refs (no fetch): "ahead of origin" is as of the last fetch.
 * Must stay fast and must never fail a session start — every probe is guarded
 * and the hook exits 0 whatever happens.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
// `raw` keeps leading whitespace: porcelain status lines start with a space (" M path").
const git = (args, raw = false) => {
  try {
    const out = execSync(`git ${args}`, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return raw ? out.trimEnd() : out.trim();
  } catch { return ''; }
};

const lines = ['## Live checkout state (SessionStart hook; trust this over memory notes)'];

const branch = git('rev-parse --abbrev-ref HEAD');
const head = git('log -1 --format=%h%x20%s');
lines.push(`- Branch: ${branch || '?'} at ${head || '?'}`);

const upstream = git('rev-parse --abbrev-ref @{u}');
if (upstream) {
  const ahead = git(`rev-list --count ${upstream}..HEAD`);
  const behind = git(`rev-list --count HEAD..${upstream}`);
  const pushed = git(`log -1 --format=%cs ${upstream}`);
  lines.push(`- vs ${upstream} (as of last fetch; last pushed commit ${pushed || '?'}): ${ahead || '?'} ahead, ${behind || '?'} behind` +
    (branch === 'main' && ahead !== '0' ? ' — a push deploys all of it to app.gmt-fractals.com' : ''));
}

const dirty = git('status --porcelain', true).split('\n').filter(Boolean);
lines.push(`- Uncommitted: ${dirty.length ? `${dirty.length} path(s): ${dirty.slice(0, 8).map((l) => l.slice(3)).join(', ')}${dirty.length > 8 ? ', …' : ''}` : 'none'}`);

// The What's New pages. A `## Unreleased` block means lines wait for the push session.
const changelogs = [
  ['GMT', 'data/help/topics/changelog.ts'],
  ['Gradient Explorer', 'gradient-explorer/v2/help/topics.ts'],
];
const pending = [];
for (const [name, rel] of changelogs) {
  const p = join(root, rel);
  if (!existsSync(p)) continue;
  try {
    if (/^## Unreleased\s*$/m.test(readFileSync(p, 'utf8'))) pending.push(name);
  } catch { /* unreadable: say nothing */ }
}
lines.push(`- What's New "## Unreleased" block present: ${pending.length ? pending.join(', ') : 'none'}`);

const worktrees = git('worktree list').split('\n').filter(Boolean).slice(1)
  .map((l) => l.replace(/\\/g, '/').replace(/^.*\/\.claude\/worktrees\//, '').replace(/\s+/g, ' '));
if (worktrees.length) lines.push(`- Worktrees: ${worktrees.join(' · ')}`);

process.stdout.write(lines.join('\n') + '\n');
process.exit(0);
