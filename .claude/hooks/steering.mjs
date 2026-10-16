#!/usr/bin/env node
/**
 * PostToolUse — runs check:steering's rules on the file just edited and says so at
 * once when its count for a rule rises above the baseline (a new bare `as any`, an
 * engine-core import from an app folder, a GMT name in engine-core, a TODO-port marker).
 *
 * Blocks nothing: the edit has landed; this puts the violation in front of the model
 * while the file is still open. `npm run check:steering` is the whole-tree gate.
 * Shares its scanner and baseline with debug/check-steering.mjs, so the two cannot drift.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

let payload;
try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const filePath = payload?.tool_input?.file_path;
if (!filePath || !existsSync(filePath)) process.exit(0);

const rel = relative(root, filePath).split(String.fromCharCode(92)).join('/');
if (rel.startsWith('..') || rel.startsWith('.claude/') || rel.startsWith('docs/history/')) process.exit(0);

try {
  const { scanSource, loadBaseline, rises } = await import(pathToFileURL(join(root, 'debug/check-steering.mjs')).href);
  const hits = scanSource(rel, readFileSync(filePath, 'utf8'));
  const baseline = loadBaseline(root);
  const up = rises(rel, hits, baseline);
  if (!up.length) process.exit(0);
  const lines = up.flatMap((r) => [
    `  ${r}: ${baseline[r]?.[rel] ?? 0} → ${hits[r].length}`,
    ...hits[r].slice(0, 4).map((h) => `      ${rel}:${h.line}  ${h.text}`),
  ]);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        `check:steering: this edit raised ${up.length} rule count(s) above the baseline:\n${lines.join('\n')}\n` +
        'A bare `as any` needs a comment saying why (line or line above). Engine-core (engine/, store/, ' +
        'components/) must not import app folders or name GMT formulas / features: use a registry, resolver ' +
        'or predicate. Fix it now; `npm run check:steering` fails the same way.',
    },
  }));
} catch { /* the hook must never break an edit */ }
process.exit(0);
