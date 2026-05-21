#!/usr/bin/env node
// blob-sha.mjs <path> [<path>...]
// Prints `git hash-object <path>` for each given file. Used by survey/writer
// agents to record the exact source SHA they verified against.
//
// Single arg: prints bare SHA on stdout (one line).
// Multi arg:  prints `<path>\t<sha>` per line, one line per input path.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

const args = process.argv.slice(2);
if (args.length === 0) {
  process.stderr.write('usage: blob-sha.mjs <path> [<path>...]\n');
  process.exit(1);
}

// Validate all paths up front so we fail fast before invoking git.
const resolved = args.map((arg) => {
  const abs = resolve(arg);
  if (!existsSync(abs)) {
    process.stderr.write(`blob-sha: not found: ${arg}\n`);
    process.exit(1);
  }
  return { arg, abs };
});

const multi = resolved.length > 1;

for (const { arg, abs } of resolved) {
  try {
    const out = execFileSync('git', ['hash-object', '--', abs], { cwd: REPO_ROOT, encoding: 'utf8' });
    const sha = out.trim();
    if (multi) {
      process.stdout.write(`${arg}\t${sha}\n`);
    } else {
      process.stdout.write(`${sha}\n`);
    }
  } catch (e) {
    process.stderr.write(`blob-sha: ${e.message}\n`);
    process.exit(1);
  }
}
