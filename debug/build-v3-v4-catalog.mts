/**
 * Build public/formulas/v3-v4-catalog.json from the latest V3 + V4 harness snapshots.
 *
 * This catalog ships to the browser; the FormulaWorkshop library browser uses it to
 *   - auto-pick the right pipeline per formula when the user selects from the menu
 *   - badge each entry with its V3/V4 compatibility
 *   - filter out formulas that neither pipeline can render
 *
 * Inputs:
 *   debug/v3-honest-snapshot.jsonl    (from: npx tsx debug/v4-verify.mts --pipeline=v3 --fresh)
 *   debug/v4-honest-snapshot.jsonl    (from: npx tsx debug/v4-verify.mts --pipeline=v4 --fresh)
 *                                     — or debug/v4-verify-results.jsonl if that's fresher
 *
 * Output:
 *   public/formulas/v3-v4-catalog.json
 *
 * Recommendation policy (see docs/research/hybrid-formula-architecture-comparison.md):
 *   - Both pipelines pass → V3 (engine-feature compat: interlace, hybrid fold)
 *   - V3 only → V3
 *   - V4 only → V4
 *   - Neither → 'none' (formula hidden in "working only" filter)
 *
 * Usage:
 *   npx tsx debug/build-v3-v4-catalog.mts              # default paths
 *   npx tsx debug/build-v3-v4-catalog.mts --v4=debug/v4-verify-results.jsonl
 *   npm run catalog:build
 */

import * as fs from 'fs';
import * as path from 'path';

const argPath = (prefix: string, fallback: string) => {
    const arg = process.argv.find(a => a.startsWith(prefix + '='));
    return arg ? arg.slice(prefix.length + 1) : fallback;
};

const V3_PATH = argPath('--v3', 'debug/v3-honest-snapshot.jsonl');
const V4_PATH = argPath('--v4', 'debug/v4-honest-snapshot.jsonl');
const OUT_PATH = argPath('--out', 'public/formulas/v3-v4-catalog.json');

interface HarnessRow {
    name: string;
    category?: 'frag' | 'dec' | 'default';
    fragPath?: string;
    overall: 'pass' | 'fail' | 'skip';
    failFirstGate?: string;
}

function readJsonl(p: string): Map<string, HarnessRow> {
    if (!fs.existsSync(p)) {
        console.error(`Missing: ${p}`);
        console.error(`  Run \`npx tsx debug/v4-verify.mts --pipeline=v3 --fresh\` (or --pipeline=v4) to generate.`);
        process.exit(2);
    }
    const out = new Map<string, HarnessRow>();
    for (const line of fs.readFileSync(p, 'utf8').trim().split('\n')) {
        if (!line.trim()) continue;
        try { const r = JSON.parse(line) as HarnessRow; out.set(r.name, r); } catch { /* skip */ }
    }
    return out;
}

const v3 = readJsonl(V3_PATH);
const v4 = readJsonl(V4_PATH);

// ── Load manifest to get the ID mapping ──
const manifestPath = 'public/formulas/manifest.json';
if (!fs.existsSync(manifestPath)) {
    console.error(`Missing: ${manifestPath}`);
    process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    frags: Array<{ id: string; name: string; category: string }>;
    decs: Array<{ id: string; name: string; category: string }>;
};

type State = 'pass' | 'fail' | 'skip' | 'missing';
type Recommended = 'v3' | 'v4' | 'none';

interface CatalogEntry {
    id: string;
    v3: State;
    v4: State;
    recommended: Recommended;
    /** First failing gate when that side failed — useful for tooltips. */
    v3FailGate?: string;
    v4FailGate?: string;
}

function harnessNameFor(libId: string, kind: 'frag' | 'dec'): string {
    if (kind === 'dec') return libId;
    // frag: harness name is basename without .frag extension
    return libId.split('/').pop()!.replace(/\.frag$/i, '');
}

function stateOf(row: HarnessRow | undefined): State {
    if (!row) return 'missing';
    return row.overall;
}

function chooseRecommended(v3state: State, v4state: State): Recommended {
    // User's framing 2026-04-17: V3 output is GMT-engine-compatible (per-iteration
    // formulas compose with interlace / hybrid fold / burning ship). V4 output is
    // self-contained SDE with explicit feature opt-out. So when V3 works, prefer it.
    if (v3state === 'pass') return 'v3';
    if (v4state === 'pass') return 'v4';
    return 'none';
}

function buildEntry(id: string, kind: 'frag' | 'dec'): CatalogEntry {
    const name = harnessNameFor(id, kind);
    const v3row = v3.get(name);
    const v4row = v4.get(name);
    const v3state = stateOf(v3row);
    const v4state = stateOf(v4row);
    return {
        id,
        v3: v3state,
        v4: v4state,
        recommended: chooseRecommended(v3state, v4state),
        v3FailGate: v3state === 'fail' ? v3row?.failFirstGate : undefined,
        v4FailGate: v4state === 'fail' ? v4row?.failFirstGate : undefined,
    };
}

const byId: Record<string, CatalogEntry> = {};
let matched = 0, unmatched = 0;

for (const f of manifest.frags) {
    const entry = buildEntry(f.id, 'frag');
    byId[f.id] = entry;
    if (entry.v3 !== 'missing' || entry.v4 !== 'missing') matched++;
    else unmatched++;
}
for (const d of manifest.decs) {
    const entry = buildEntry(d.id, 'dec');
    byId[d.id] = entry;
    if (entry.v3 !== 'missing' || entry.v4 !== 'missing') matched++;
    else unmatched++;
}

// ── Summary ──
const summary = { v3Only: 0, v4Only: 0, bothPass: 0, bothFail: 0, hidden: 0, recommended: { v3: 0, v4: 0, none: 0 } };
for (const e of Object.values(byId)) {
    if (e.recommended === 'v3') summary.recommended.v3++;
    else if (e.recommended === 'v4') summary.recommended.v4++;
    else summary.recommended.none++;

    if (e.v3 === 'pass' && e.v4 === 'pass') summary.bothPass++;
    else if (e.v3 === 'pass' && e.v4 !== 'pass') summary.v3Only++;
    else if (e.v4 === 'pass' && e.v3 !== 'pass') summary.v4Only++;
    else summary.bothFail++;  // conservative: includes skip/missing

    if (e.recommended === 'none') summary.hidden++;
}

const payload = {
    generated: new Date().toISOString().slice(0, 10),
    sources: { v3: V3_PATH, v4: V4_PATH, manifest: manifestPath },
    policy: 'V3 preferred when V3 passes (engine-feature compat); else V4 if V4 passes; else none',
    summary,
    byId,
};

fs.mkdirSync(path.dirname(path.resolve(OUT_PATH)), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), 'utf8');

console.log(`── V3/V4 catalog built → ${OUT_PATH}`);
console.log(`   ${Object.keys(byId).length} formulas  (matched: ${matched}, unmatched: ${unmatched})`);
console.log(`   recommended V3:   ${summary.recommended.v3}`);
console.log(`   recommended V4:   ${summary.recommended.v4}`);
console.log(`   hidden ('none'):  ${summary.recommended.none}`);
console.log(`   both pipelines pass: ${summary.bothPass}`);
console.log(`   V3-only pass:     ${summary.v3Only}`);
console.log(`   V4-only pass:     ${summary.v4Only}`);
