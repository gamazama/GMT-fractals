#!/usr/bin/env node
/**
 * PostToolUse — surfaces @stale annotations on files you just edited.
 *
 * CLAUDE.md commits us to removing a @stale marker when the work that touches
 * that file resolves what the marker points at. That was pure honour-system;
 * this makes it impossible to miss. Blocks nothing.
 */
import { readFileSync, existsSync } from 'node:fs';

let payload;
try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }

const filePath = payload?.tool_input?.file_path;
if (!filePath || !existsSync(filePath)) process.exit(0);

// Source files only. The annotation contract is about in-source JSDoc; prose that
// merely discusses "@stale" (docs, memory notes, this file) is not a worklist entry.
if (!/\.(ts|tsx|js|jsx|mjs|cjs|glsl|frag|vert|css)$/i.test(filePath)) process.exit(0);

let lines;
try { lines = readFileSync(filePath, 'utf8').split('\n'); } catch { process.exit(0); }

const found = [];
lines.forEach((l, i) => {
  // The marker must be the FIRST token after a comment leader, which is how the
  // convention is actually written (`* @stale <text>`). Prose that mentions the
  // marker mid-sentence is discussing it, not raising one.
  const m = l.match(/^\s*(?:\*|\/\/|\/\*\*?|#)\s*@stale\b\s*(.*)$/);
  if (!m) return;
  found.push(`  ${filePath.split(String.fromCharCode(92)).join('/')}:${i + 1} — ${m[1].trim().replace(/\s*\*\/\s*$/, '') || '(no description)'}`);
});
if (!found.length) process.exit(0);

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext:
      `This file carries ${found.length} @stale annotation(s):\n${found.join('\n')}\n` +
      `Per CLAUDE.md: if the work you just did resolves what a marker points at, REMOVE it. ` +
      `Leaving it produces ghost worklist entries. If it is still accurate, leave it alone.`,
  },
}));
