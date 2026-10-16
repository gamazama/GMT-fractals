/**
 * check:steering — CLAUDE.md's prose rules that a script can see, as a ratchet.
 *
 * Rules (ids are the baseline's keys):
 *   bare-as-any   `as any` with no comment on its line or the line above, in product code
 *                 (CLAUDE.md anti-pattern 7: "No `as any` without a comment saying why").
 *                 `debug/` and `plans/` are harness and tooling code and are not checked.
 *   todo-port     a "TODO port" marker naming GMT, anywhere (anti-pattern 6). The pattern is
 *                 built from parts below so this file does not match itself.
 *   app-import    engine/**, store/**, components/** importing from an app or plugin
 *                 library folder (APP_DIRS). Engine-core must not depend on its apps.
 *   app-names     GMT formula and feature names in engine/**, store/**, components/**
 *                 code (anti-pattern 1: "No app-specific names in engine-core").
 *
 * It is a RATCHET, like check:zindex. `debug/check-steering-baseline.json` holds each
 * file's hit count per rule as of 2026-10-16 (576 bare casts, 12 components importing
 * engine-gmt, 7 files naming GMT things). A file fails when a count RISES or a file
 * not in the baseline gains a hit. When a count falls, `--update` writes it down;
 * `--update` refuses to raise a count unless `--allow-raise` is given too, which is the
 * owner's call, not a way to make a red check green.
 *
 * Integration seams:
 *   - `npm run check:steering` (whole tree; tracked + untracked-not-ignored files, so a
 *     file a session just created is checked before it is `git add`ed).
 *   - `.claude/hooks/steering.mjs` (PostToolUse) imports `scanSource` + `loadBaseline`
 *     and reports a rise on the file just edited.
 *
 * Pitfalls:
 *   - Comment text is not code: lines inside block comments and lines starting with
 *     `*` or `//` are skipped for every rule except todo-port (which IS a comment).
 *   - app-import resolves relative specifiers against the importing file, so a
 *     sub-folder that happens to share an app's name inside components/ is not a hit.
 *   - app-names is a word list, not a parser. A legitimate engine-core use belongs in the
 *     baseline with the owner's yes; widen the list when a new formula family lands.
 *
 * @see CLAUDE.md "Anti-Patterns to Avoid"
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

export const BASELINE_PATH = 'debug/check-steering-baseline.json';

const CODE_EXT = /\.(ts|tsx|mts|js|jsx|mjs)$/;
const ENGINE_CORE = /^(engine|store|components)\//;
// App and plugin-library folders engine-core must not import from.
const APP_DIRS = new Set(['engine-gmt', 'app-gmt', 'deep-zoom', 'fluid-toy', 'fractal-toy',
  'gradient-explorer', 'mesh-export', 'palette', 'demo']);
const APP_NAMES = /\b(Mandelbulb|Mandelbox|AmazingBox|Kleinian|Menger|MB3D|mb3d|juliaX|juliaY|juliaZ)\b|['"`]geometry\.\w|\bformula\s*[!=]==\s*['"]/;
const TODO_PORT = new RegExp(['TODO', 'port', 'from', 'GMT'].join('\\s+'), 'i');
const HARNESS = /^(debug|plans)\//;
const IMPORT_SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]/g;

export const RULES = ['bare-as-any', 'todo-port', 'app-import', 'app-names'];

/** Hits per rule for one file. `rel` is repo-relative with forward slashes. */
export function scanSource(rel, src) {
  const hits = Object.fromEntries(RULES.map((r) => [r, []]));
  if (!CODE_EXT.test(rel)) return hits;
  const lines = src.split(/\r?\n/);
  const core = ENGINE_CORE.test(rel);
  const harness = HARNESS.test(rel);
  let inBlock = false;
  let prevIsComment = false;

  lines.forEach((line, i) => {
    const at = { line: i + 1, text: line.trim().slice(0, 120) };
    if (TODO_PORT.test(line)) hits['todo-port'].push(at);

    // Comment tracking: a line wholly inside /* ... */ or led by * or // is prose.
    const startsInBlock = inBlock;
    const opens = line.lastIndexOf('/*');
    const closes = line.lastIndexOf('*/');
    if (opens > closes) inBlock = true;
    else if (closes > -1 && (startsInBlock || opens > -1)) inBlock = false;
    const isComment = (startsInBlock && (closes === -1 || closes === line.trimEnd().length - 2))
      || /^\s*(\*|\/\/|\/\*)/.test(line);
    const commentBefore = prevIsComment;
    prevIsComment = isComment;
    if (isComment) return;
    const code = line.replace(/\/\/.*$/, '');

    if (!harness && /\bas any\b/.test(code) && !/\/\/|\/\*/.test(line) && !commentBefore) hits['bare-as-any'].push(at);

    if (!core) return;
    if (APP_NAMES.test(code)) hits['app-names'].push(at);
    for (const m of code.matchAll(IMPORT_SPEC)) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      const target = posix.normalize(posix.join(posix.dirname(rel), spec));
      if (APP_DIRS.has(target.split('/')[0])) { hits['app-import'].push(at); break; }
    }
  });
  return hits;
}

export function loadBaseline(root = process.cwd()) {
  const p = join(root, BASELINE_PATH);
  if (!existsSync(p)) return {};
  return JSON.parse(readFileSync(p, 'utf8')).counts ?? {};
}

/** Rules whose count in `hits` exceeds the baseline for `rel`. */
export function rises(rel, hits, baseline) {
  return RULES.filter((r) => hits[r].length > (baseline[r]?.[rel] ?? 0));
}

function listFiles(root) {
  const out = execSync('git ls-files --cached --others --exclude-standard', { cwd: root, encoding: 'utf8' });
  return out.split('\n').filter((f) => f && CODE_EXT.test(f)
    && !f.startsWith('docs/history/') && !f.startsWith('.claude/') && !f.includes('node_modules/') && !f.endsWith('.d.ts')
    && existsSync(join(root, f)));
}

function main() {
  const root = process.cwd();
  const args = new Set(process.argv.slice(2));
  const baseline = loadBaseline(root);
  const counts = Object.fromEntries(RULES.map((r) => [r, {}]));
  const failures = [];
  let lowered = 0;

  for (const rel of listFiles(root)) {
    const hits = scanSource(rel, readFileSync(join(root, rel), 'utf8'));
    for (const r of RULES) {
      const n = hits[r].length;
      const was = baseline[r]?.[rel] ?? 0;
      if (n) counts[r][rel] = n;
      if (n > was) failures.push({ rel, rule: r, n, was, hits: hits[r] });
      if (n < was) lowered++;
    }
  }

  if (args.has('--update')) {
    if (failures.length && !args.has('--allow-raise')) {
      console.error(`✗ --update would RAISE ${failures.length} count(s); fix them, or pass --allow-raise on the owner's word.`);
    } else {
      const sorted = Object.fromEntries(RULES.map((r) => [r, Object.fromEntries(Object.entries(counts[r]).sort())]));
      writeFileSync(join(root, BASELINE_PATH), JSON.stringify({
        note: 'Ratchet for npm run check:steering (debug/check-steering.mjs). Counts may only fall; see that file before editing.',
        counts: sorted,
      }, null, 2) + '\n');
      console.log(`✓ baseline written (${lowered} count(s) lowered${failures.length ? `, ${failures.length} raised` : ''})`);
      process.exit(0);
    }
    process.exit(1);
  }

  for (const r of RULES) {
    const files = Object.keys(counts[r]).length;
    const total = Object.values(counts[r]).reduce((a, b) => a + b, 0);
    console.log(`ℹ ${r.padEnd(12)} ${String(total).padStart(4)} in ${files} file(s) (baseline debt)`);
  }
  if (lowered) console.log(`ℹ ${lowered} count(s) fell below the baseline: run \`npm run check:steering -- --update\` to lock them in.`);

  if (failures.length) {
    console.error(`\n✗ ${failures.length} new violation(s) of CLAUDE.md rules:`);
    for (const f of failures) {
      console.error(`  ${f.rule}  ${f.rel}  (${f.was} → ${f.n})`);
      for (const h of f.hits.slice(0, 5)) console.error(`      :${h.line}  ${h.text}`);
    }
    console.error('\nbare-as-any: add a comment saying why on the line or the line above. app-import / app-names:');
    console.error('express it through a registry, resolver or predicate (CLAUDE.md "Plugin seams over hardcoded paths").');
    process.exit(1);
  }
  console.log('\n✓ no new violations of the rules check:steering covers');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
