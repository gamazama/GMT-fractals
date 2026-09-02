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
 *   - a composite      -> the union of its `npm run` members' entries
 * walks the import graph from there, and reports guards whose reachable set does
 * not intersect the rule's own paths.
 *
 * The composite case was added 2026-07-29 by the guard sweep, and it had the
 * tool's own bug in it: a script like `test:shader` or `test:gate` contains no
 * filename, so the resolver found nothing, classified it 'opaque' and accepted
 * it — unchecked, and not printed in either mode, so it looked identical to a
 * verified citation. `gmt-renderer.md` cites `test:shader` and had been passing
 * that way. Falsified in both directions: citing `test:shader` on
 * `layers-zindex.md` now reports "test:shader (4 members) imports none of this
 * rule's 12 scoped files" and exits 1, where the previous version exited 0 and
 * said nothing.
 *
 * Per-row scoping was added 2026-09-02 (blind spot 1 of the same finding). A
 * guards table whose first column names a path — sibling-apps.md's
 * `| \`fluid-toy/\` | npm run smoke:fluid-toy, … |` — now holds that row's
 * citations to the frontmatter globs under that path only; citations outside
 * such rows stay rule-wide. Falsified the way the finding was: moving
 * `npm run smoke:fluid-toy` into sibling-apps.md's gradient-explorer row now
 * reports "sibling-apps.md [gradient-explorer/] :: smoke:fluid-toy — boots
 * fluid-toy.html; that entry's import graph contains none of the N files this
 * scopes" and exits 1, where the previous version's output was identical to
 * the clean run. The first clean run after the change caught a real one:
 * sibling-apps.md's fluid-toy row said "**Not** `npm run smoke:orbit`" as a
 * warning, and the parser read it as a citation — correctly, since nothing
 * distinguishes a negative mention from a positive one. Write negatives
 * without the `npm run` prefix; the row now does.
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
    // Per-row scoping. A guards table whose first column names a path
    // (`| \`fluid-toy/\` | npm run … |`) scopes the citations in that row to
    // the frontmatter globs under that path; citations outside such rows stay
    // rule-wide. Without this, a multi-app rule's citations were matched
    // against its ENTIRE paths: set, so one fluid-toy smoke "covered"
    // mesh-export — blind spot 1 of the 2026-07-29 finding, closed 2026-09-02.
    const rows = [];
    const rowGuards = new Set();
    for (const line of text.split('\n')) {
        const m = line.match(/^\|\s*`([^`]+?)`\s*\|(.*)\|\s*$/);
        if (!m) continue;
        const guards = [...new Set([...m[2].matchAll(/npm run ([a-z0-9:_-]+)/gi)].map((x) => x[1]))];
        if (!guards.length) continue;
        const prefix = m[1].replace(/\/+$/, '') + '/';
        rows.push({ prefix, scope: paths.filter((g) => g.startsWith(prefix)), guards });
        for (const g of guards) rowGuards.add(g);
    }
    const all = [...new Set([...text.matchAll(/npm run ([a-z0-9:_-]+)/gi)].map((m) => m[1]))];
    const guards = all.filter((g) => !rowGuards.has(g));
    return { name, paths, guards, rows };
}

/**
 * Import-graph entries for ONE harness file. A browser smoke's real subject is
 * whatever its URL serves, so it resolves to that app's entry points; a node
 * harness resolves to itself. Returns [] when the URL maps to no known app,
 * which is how a member of a composite is skipped without sinking the whole
 * union (an `unknown-url` is still reported for single-file scripts below).
 */
function entriesForFile(file, cmd) {
    const src = rd(file);
    const envM = cmd.match(/ENGINE_URL=(\S+)/);
    const url = envM?.[1]
        ?? src.match(/ENGINE_URL\s*\|\|\s*['"]([^'"]+)['"]/)?.[1]
        ?? src.match(/['"](https?:\/\/localhost:\d+[^'"]*)['"]/)?.[1];
    if (!url) return [file];
    const app = appForUrl(url);
    return app ? APP_ENTRYPOINTS[app] : [];
}

/** Resolve a guard to an import-graph entry, or explain why it has none. */
function entryFor(script, seen = new Set()) {
    const cmd = pkg.scripts?.[script];
    if (!cmd) return { kind: 'missing' };
    if (WHOLE_TREE.has(script)) return { kind: 'whole-tree' };

    // A COMPOSITE — `npm run a && npm run b` — owns no source file, so the regex
    // below found nothing and it fell through to 'opaque': accepted unchecked
    // AND never printed, in either mode. That is precisely the failure this tool
    // exists to catch, hiding inside the tool. `test:shader` is cited by
    // gmt-renderer.md and was passing that way. A composite's reach is the union
    // of its members' reach, so expand it; `seen` stops a self-referential
    // script from recursing forever.
    const members = [...cmd.matchAll(/npm run ([a-z0-9:_-]+)/gi)].map((m) => m[1]);
    if (members.length && !seen.has(script)) {
        seen.add(script);
        const entries = new Set();
        for (const m of members) {
            const e = entryFor(m, seen);
            // One whole-tree member (typecheck, orphans) covers everything, so
            // the composite does too and there is nothing left to check.
            if (e.kind === 'whole-tree') return { kind: 'whole-tree' };
            for (const f of e.entries ?? []) entries.add(f);
        }
        if (entries.size) {
            return { kind: 'node', entries: [...entries], file: `${script} (${members.length} members)` };
        }
        return { kind: 'opaque', cmd };
    }

    // A DIRECT-FILE COMPOSITE — `tsx debug/a.mts && tsx debug/b.mts` — has no
    // `npm run` for the branch above to find, so the single-file regex below
    // matched only the FIRST filename and the other members were invisible.
    // `smoke:all` is 42 members and resolved to member 1; `test:palette` is 16
    // and resolved to member 1, which is why a `test:palette` citation could
    // never reach debug/test-liquify-mesh.mts (batch 9 recorded that as a known
    // blind spot and could not fix it from where it stood). Wrong in both
    // directions: it invents miscitations for guards that DO reach the files,
    // and it waves through a citation verified against 1/42 of the real reach.
    // Same treatment as the `npm run` case — the union of the members.
    const fileMs = [...new Set(
        [...cmd.matchAll(/([\w./-]+\.(?:mts|mjs|ts|js))/g)].map((m) => m[1].replace(/^\.\//, '')),
    )].filter((f) => tracked.has(f));
    if (fileMs.length > 1) {
        const entries = new Set();
        for (const f of fileMs) for (const e of entriesForFile(f, cmd)) entries.add(e);
        if (entries.size) {
            return { kind: 'node', entries: [...entries], file: `${script} (${fileMs.length} members)` };
        }
        return { kind: 'opaque', cmd };
    }

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

/**
 * Check one set of guards against one set of scoped files. `label` is the rule
 * name, or `rule [row-prefix/]` for a table row scoped to a sub-path.
 */
function evaluate(label, scoped, guards) {
    const live = [];
    for (const g of guards) {
        const e = entryFor(g);
        if (e.kind === 'missing') { problems.push({ rule: label, guard: g, kind: 'missing', detail: 'not a script in package.json' }); continue; }
        if (e.kind === 'whole-tree' || e.kind === 'opaque') { live.push(g); continue; }
        if (e.kind === 'unknown-url') { problems.push({ rule: label, guard: g, kind: 'unknown-url', detail: `ENGINE_URL ${e.url} maps to no known app entry` }); continue; }

        const reach = reachFor(e.entries);
        // A static analyser (check:zindex, check:mb3d-decompiler) reads its targets as
        // TEXT, so it has no import edges into the code it covers and an import-graph
        // verdict would be meaningless — reporting it either way would be a guess. The
        // reliable tell is that its reachable set contains no repo source at all, which
        // is more robust than sniffing the source for readdirSync: test:frag:integration
        // scans a directory AND imports the importer, and must still be import-checked.
        if (e.kind === 'node' && ![...reach].some((f) => !TOOLING.test(f))) {
            live.push(g); scanners.push({ rule: label, guard: g, file: e.file }); continue;
        }
        checked++;
        const hit = scoped.filter((f) => reach.has(f));
        if (!hit.length) {
            problems.push({
                rule: label, guard: g, kind: 'no-overlap',
                detail: e.kind === 'browser'
                    ? `boots ${e.url} (${e.app}); that entry's import graph contains none of the ${scoped.length} files this scopes`
                    : `${e.file} imports none of the ${scoped.length} files this scopes`,
            });
        } else { live.push(g); if (VERBOSE) console.log(`  ok  ${label} :: ${g} -> ${hit.length}/${scoped.length} scoped files reachable`); }
    }
    if (!live.length && guards.length) {
        problems.push({ rule: label, guard: '(all)', kind: 'rule-uncovered', detail: `all ${guards.length} cited guards fail to reach these files` });
    }
}

for (const rule of rules) {
    if (!rule.paths.length) { orphanRules.push({ rule: rule.name, why: 'no paths: globs — this rule never auto-loads' }); continue; }
    const res = rule.paths.map(globToRe);
    const scoped = [...tracked].filter((f) => res.some((r) => r.test(f)));
    if (!scoped.length) { orphanRules.push({ rule: rule.name, why: `paths: match 0 tracked files (${rule.paths.join(', ')})` }); continue; }

    // Rule-wide citations are held to the whole paths: set, as before.
    evaluate(rule.name, scoped, rule.guards);

    // A guards-table row is held to the sub-path it names, and only that.
    for (const row of rule.rows) {
        const label = `${rule.name} [${row.prefix}]`;
        if (!row.scope.length) {
            problems.push({ rule: label, guard: '(row)', kind: 'row-unscoped', detail: `the table row names ${row.prefix} but no paths: glob starts with it` });
            continue;
        }
        const rowRes = row.scope.map(globToRe);
        const rowScoped = [...tracked].filter((f) => rowRes.some((r) => r.test(f)));
        if (!rowScoped.length) {
            problems.push({ rule: label, guard: '(row)', kind: 'row-unscoped', detail: `its globs (${row.scope.join(', ')}) match 0 tracked files` });
            continue;
        }
        evaluate(label, rowScoped, row.guards);
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
    ['row-unscoped', 'guards-table row names a path the rule does not scope', Y],
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
