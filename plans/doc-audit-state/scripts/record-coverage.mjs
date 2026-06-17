#!/usr/bin/env node
// record-coverage.mjs
// Reads a single coverage entry as YAML from stdin and appends it to
// dev/plans/doc-audit-state/coverage.yaml under entries:.
//
// CHANGE (2026-05-19): dropped the .tmp + renameSync "atomic rename" pattern
// and the .lock sentinel. On Windows, renameSync to an existing target races
// intermittently with antivirus/indexer file handles and throws EPERM. Since
// the audit orchestrator drives iterations serially (one writer at a time),
// we can append directly with fs.appendFileSync. Assumption: NO concurrent
// writers. If that ever changes, restore locking (and prefer a real lockfile
// library over the wx-sentinel approach).
//
// Required entry fields: path, blob_sha, bytes, lines, read_range, agent_run_id,
//                        agent_model, timestamp, confidence, summary_ref.
// Optional: gaps (list).

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = resolve(__dirname, '..');
const COV = resolve(STATE_DIR, 'coverage.yaml');

const REQUIRED = ['path', 'blob_sha', 'bytes', 'lines', 'read_range', 'agent_run_id', 'agent_model', 'timestamp', 'confidence', 'summary_ref'];
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low', 'partial']);

function die(code, msg) {
  process.stderr.write(`record-coverage: ${msg}\n`);
  process.exit(code);
}

function readStdin() {
  return new Promise((res, rej) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => buf += c);
    process.stdin.on('end', () => res(buf));
    process.stdin.on('error', rej);
  });
}

function parseEntryYaml(text) {
  // Accepts either a single mapping (no leading `-`) or a single list item.
  const out = {};
  const lines = text.split(/\r?\n/);
  let started = false;
  for (const raw of lines) {
    if (!raw.trim()) continue;
    let line = raw;
    if (!started) {
      // First non-empty line may be `- key: value` (list item)
      const m1 = /^\s*-\s+([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
      if (m1) {
        out[m1[1]] = parseScalar(m1[2]);
        started = true;
        continue;
      }
    }
    const m2 = /^\s*([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (m2) {
      out[m2[1]] = parseScalar(m2[2]);
      started = true;
      continue;
    }
  }
  return out;
}

function parseScalar(v) {
  const s = v.trim();
  if (s === '') return '';
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map(x => x.trim().replace(/^["']|["']$/g, ''));
  }
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  return s.replace(/^["']|["']$/g, '');
}

function yamlString(s) {
  if (s === '' || s == null) return '""';
  const str = String(s);
  if (/^[A-Za-z0-9_./\-:+T]+$/.test(str)) return str;
  return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function emitEntry(e) {
  const lines = [];
  lines.push(`  - path: ${yamlString(e.path)}`);
  lines.push(`    blob_sha: ${yamlString(e.blob_sha)}`);
  lines.push(`    bytes: ${e.bytes}`);
  lines.push(`    lines: ${e.lines}`);
  if (Array.isArray(e.read_range)) {
    lines.push(`    read_range: [${e.read_range.join(', ')}]`);
  } else {
    lines.push(`    read_range: ${yamlString(e.read_range)}`);
  }
  lines.push(`    agent_run_id: ${yamlString(e.agent_run_id)}`);
  lines.push(`    agent_model: ${yamlString(e.agent_model)}`);
  lines.push(`    timestamp: ${yamlString(e.timestamp)}`);
  lines.push(`    confidence: ${yamlString(e.confidence)}`);
  const gaps = Array.isArray(e.gaps) ? e.gaps : (e.gaps ? [e.gaps] : []);
  if (gaps.length) {
    lines.push(`    gaps:`);
    for (const g of gaps) lines.push(`      - ${yamlString(g)}`);
  } else {
    lines.push(`    gaps: []`);
  }
  lines.push(`    summary_ref: ${yamlString(e.summary_ref)}`);
  return lines.join('\n');
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) die(1, 'empty stdin; expected a YAML entry');
  const entry = parseEntryYaml(raw);

  for (const k of REQUIRED) {
    if (!(k in entry) || entry[k] === '' || entry[k] == null) {
      die(1, `missing required field: ${k}`);
    }
  }
  if (!VALID_CONFIDENCE.has(entry.confidence)) {
    die(1, `confidence must be one of ${[...VALID_CONFIDENCE].join('|')}; got ${entry.confidence}`);
  }

  // Normalize read_range
  if (typeof entry.read_range === 'string') {
    const m = /^\[?(\d+)\s*[,\-]\s*(\d+)\]?$/.exec(entry.read_range);
    if (m) entry.read_range = [parseInt(m[1], 10), parseInt(m[2], 10)];
  }

  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });

  // Initialise the file with a header if it doesn't exist or is missing `entries:`.
  // Serial-writer assumption: no other process is touching this file right now.
  if (!existsSync(COV) || !readFileSync(COV, 'utf8').includes('entries:')) {
    const now = new Date().toISOString();
    const header =
`schema_version: 1
repo_root: h:/GMT/workspace-gmt/dev
audit_run: 2026-05-19-overnight
generated_at: ${now}
entries:
`;
    writeFileSync(COV, header, 'utf8');
  } else {
    // Ensure trailing newline so our append starts on a fresh line.
    const cur = readFileSync(COV, 'utf8');
    if (!cur.endsWith('\n')) appendFileSync(COV, '\n', 'utf8');
  }

  const block = emitEntry(entry) + '\n';
  appendFileSync(COV, block, 'utf8');

  process.stdout.write(`recorded ${entry.path}\n`);
}

main().catch(e => die(1, e.message));
