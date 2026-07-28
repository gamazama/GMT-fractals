#!/usr/bin/env node
/**
 * Rule-guard coverage checker.
 *
 * Every file in `.claude/rules/` names a `paths:` glob set and a Guards block of
 * `npm run <script>` lines. The promise a reader takes from that pairing is
 * "these commands can fail if you break these files." The 2026-07-27 audit found
 * that promise broken about ten times — a rule scoping `engine-gmt/navigation/**`
 * citing a smoke that boots `fractal-toy.html`, which never imports it. Nothing
 * detected it because a healthy guard passing looks exactly like a guard that
 * cannot see the code.
 *
 * That is an import-graph question, so it is checkable. For each cited guard this
 * resolves an ENTRY:
 *   - a browser smoke  -> its ENGINE_URL default -> the app whose HTML serves it
 *   - a node test      -> the test module itself
 * walks the import graph from there, and reports guards whose reachable set does
 * not intersect the rule's own paths.
 *
 * Reports rather than gates: a zero-overlap guard is usually a miscitation, but a
 * rule may legitimately cite a broad guard (typecheck, orphans) that covers
 * everything without importing anything. Those are listed as EXEMPT, not failures.
 *
 * Usage: node debug/check-rule-guards.mjs [--verbose]
 * @see .claude/rules/, CLAUDE.md "Documentation Conventions"
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { computeReachable, APP_ENTRYPOINTS } from '../plans/context-protocol/scripts/reachability.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');
const rd = (p) => readFileSync(join(REPO_ROOT, p.split('/').join(sep)), 'utf8');

/** Guards that legitimately cover everything without importing anything. */
const WHOLE_TREE = new Set(['typecheck', 'orphans', 'build', 'lint']);

/** Harness/tooling trees — reaching only these means the guard imports no product code. */
const TOOLING = /^(debug|plans|scripts)\//;

/** Which app entry serves a given dev-server URL. */
function appForUrl(url) {
    const file = (url.split('/').pop() || '').split('?')[0] || 'index.html';
    if (file === '' || file === 'index.html') return 'app-gmt';  // root serves /app-gmt/main.tsx
    const stem = file.replace(/\.html$/, '');
    if (stem === 'demo') return 'demo';
    return APP_ENTRYPOINTS[stem] ? stem : null;
}

// ---------------------------------------------------------------- inputs
const tracked = new Set(
    execSync('git ls-files', { cwd: REPO_ROOT, maxBuffer: 64 * 1024 * 1024 })
        .toString().split('\n').map((s) => s.trim()).filter(Boolean),
);
const pkg = JSON.parse(rd('package.json'));

/** Glob -> RegExp. `*` stops at a separator, `**` crosses them. */
function globToRe(g) {
    let re = '';
    for (let i = 0; i < g.length; i++) {
        const c = g[i];
        if (c === '*') {
            if (g[i + 1] === '*') { re += '.*'; i++; if (g[i + 1] === '/') i++; }
            else re += '[^/]*';
        } else if (c === '.') re += '\\.';
        else if (c === '?') re += '[^/]';
        else if ('+^${}()|[]\\'.includes(c)) re += '\\' + c;
        else re += c;
    }
    return new RegExp('^' + re + '$');
}

/** Pull `paths:` globs and `npm run X` guards out of one rule file. */
function parseRule(name) {
    const text = rd('.claude/rules/' + name);
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const paths = [];
    if (fm) {
        const pm = fm[1].match(/paths:\s*([\s\S]*?)(?=\n\w+:|$)/);
        if (pm) {
            for (const line of pm[1].split('\n')) {
                const one = line.match(/^\s*-\s*["']?([^"'\s#]+)["']?/);
                if (one) { paths.push(one[1]); continue; }
                const inline = line.match(/^\s*\[(.+)\]\s*$/);
                if (inline) for (const g of inline[1].split(',')) paths.push(g.trim().replace(/^["']|["']$/g, ''));
            }
        }
    }
    const guards = [...new Set([...text.matchAll(/npm run ([a-z0-9:_-]+)/gi)].map((m) => m[1]))];
    return { name, paths, guards };
}

/** Resolve a guard to an import-graph entry, or explain why it has none. */
function entryFor(script) {
    const cmd = pkg.scripts?.[script];
    if (!cmd) return { kind: 'missing' };
    if (WHOLE_TREE.has(script)) return { kind: 'whole-tree' };

    const fileM = cmd.match(/([\w./-]+\.(?:mts|mjs|ts|js))/);
    if (!fileM) return { kind: 'opaque', cmd };
    const file = fileM[1].replace(/^\.\//, '');
    if (!tracked.has(file)) return { kind: 'opaque', cmd };

    const src = rd(file);
    // A browser smoke drives Playwright; what it really exercises is whatever the
    // URL it opens serves. Prefer an explicit ENGINE_URL in the npm command over
    // the module's own default.
    const envM = cmd.match(/ENGINE_URL=(\S+)/);
    const url = envM?.[1]
        ?? src.match(/ENGINE_URL\s*\|\|\s*['"]([^'"]+)['"]/)?.[1]
        ?? src.match(/['"](https?:\/\/localhost:\d+[^'"]*)['"]/)?.[1];
    if (url) {
        const app = appForUrl(url);
        if (!app) return { kind: 'unknown-url', url, file };
        return { kind: 'browser', app, url, entries: APP_ENTRYPOINTS[app], file };
    }
    return { kind: 'node', entries: [file], file };
}

// ---------------------------------------------------------------- run
const reachCache = new Map();
const reachFor = (entries) => {
    const key = entries.join('|');
    if (!reachCache.has(key)) reachCache.set(key, computeReachable(entries, REPO_ROOT, tracked).reachable);
    return reachCache.get(key);
};

const rules = readdirSync(join(REPO_ROOT, '.claude', 'rules'))
    .filter((f) => f.endsWith('.md')).map(parseRule);

const problems = [];
const orphanRules = [];
const scanners = [];
let checked = 0;

for (const rule of rules) {
    if (!rule.paths.length) { orphanRules.push({ rule: rule.name, why: 'no paths: globs — this rule never auto-loads' }); continue; }
    const res = rule.paths.map(globToRe);
    const scoped = [...tracked].filter((f) => res.some((r) => r.test(f)));
    if (!scoped.length) { orphanRules.push({ rule: rule.name, why: `paths: match 0 tracked files (${rule.paths.join(', ')})` }); continue; }

    const live = [];
    for (const g of rule.guards) {
        const e = entryFor(g);
        if (e.kind === 'missing') { problems.push({ rule: rule.name, guard: g, kind: 'missing', detail: 'not a script in package.json' }); continue; }
        if (e.kind === 'whole-tree' || e.kind === 'opaque') { live.push(g); continue; }
        if (e.kind === 'unknown-url') { problems.push({ rule: rule.name, guard: g, kind: 'unknown-url', detail: `ENGINE_URL ${e.url} maps to no known app entry` }); continue; }

        const reach = reachFor(e.entries);
        // A static analyser (check:zindex, check:mb3d-decompiler) reads its targets as
        // TEXT, so it has no import edges into the code it covers and an import-graph
        // verdict would be meaningless — reporting it either way would be a guess. The
        // reliable tell is that its reachable set contains no repo source at all, which
        // is more robust than sniffing the source for readdirSync: test:frag:integration
        // scans a directory AND imports the importer, and must still be import-checked.
        if (e.kind === 'node' && ![...reach].some((f) => !TOOLING.test(f))) {
            live.push(g); scanners.push({ rule: rule.name, guard: g, file: e.file }); continue;
        }
        checked++;
        const hit = scoped.filter((f) => reach.has(f));
        if (!hit.length) {
            problems.push({
                rule: rule.name, guard: g, kind: 'no-overlap',
                detail: e.kind === 'browser'
                    ? `boots ${e.url} (${e.app}); that entry's import graph contains none of this rule's ${scoped.length} scoped files`
                    : `${e.file} imports none of this rule's ${scoped.length} scoped files`,
            });
        } else { live.push(g); if (VERBOSE) console.log(`  ok  ${rule.name} :: ${g} -> ${hit.length}/${scoped.length} scoped files reachable`); }
    }
    if (!live.length && rule.guards.length) {
        problems.push({ rule: rule.name, guard: '(all)', kind: 'rule-uncovered', detail: `all ${rule.guards.length} cited guards fail to reach this rule's files` });
    }
}

// ---------------------------------------------------------------- report
const R = '\x1b[31m', Y = '\x1b[33m', G = '\x1b[32m', D = '\x1b[2m', X = '\x1b[0m';
console.log(`\n${D}rule-guard coverage — ${rules.length} rules, ${checked} guard citations resolved to an import graph${X}\n`);

for (const o of orphanRules) console.log(`${Y}  orphan ${X} ${o.rule}${D} — ${o.why}${X}`);

if (scanners.length) {
    console.log(`${D}  ${scanners.length} static analyser citation(s) not import-checkable — they read files as text.`);
    for (const s of scanners) console.log(`${D}    ${s.rule} :: npm run ${s.guard} (${s.file}) — verify its scan paths by hand${X}`);
}

const byKind = (k) => problems.filter((p) => p.kind === k);
for (const [kind, label, colour] of [
    ['rule-uncovered', 'NO LIVE GUARD', R],
    ['no-overlap', 'cannot fail on these files', R],
    ['missing', 'script does not exist', Y],
    ['unknown-url', 'URL maps to no app', Y],
]) {
    const list = byKind(kind);
    if (!list.length) continue;
    console.log(`\n${colour}${label}${X} (${list.length})`);
    for (const p of list) console.log(`  ${p.rule} :: ${D}npm run ${X}${p.guard}\n    ${D}${p.detail}${X}`);
}

const bad = problems.length + orphanRules.length;
console.log(bad
    ? `\n${R}${bad} issue(s).${X} A guard that cannot fail on the code it is cited for is worse than no guard —\nit reads as coverage. Fix the citation or the rule's paths, then re-run.\n`
    : `\n${G}All rule guard citations reach the files their rule scopes.${X}\n`);
process.exit(bad ? 1 : 0);
