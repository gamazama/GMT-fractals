/**
 * Find frag formulas that live in the reference corpus but were excluded from
 * the curated public library — and, using the latest honest-snapshot data,
 * figure out which ones SHOULD now be restored given the relaxed
 * webglCompile-only scoring policy.
 *
 * Buckets (for the 580 reference frags minus 178 already curated):
 *   a) "candidates to restore"   — webglCompile passes in V3 or V4 → usable today
 *   b) "architectural skip"      — V3/V4 correctly reject (2D / providesColor / no DE / donotrun / buffer / vertex)
 *   c) "truly broken"            — neither pipeline compiles; not worth surfacing
 */

import * as fs from 'fs';
import * as path from 'path';

const REF_DIR = path.resolve('features/fragmentarium_import/reference/Examples');
const PUB_DIR = path.resolve('public/formulas/frag');

function walk(dir: string): string[] {
    const out: string[] = [];
    function recur(d: string) {
        if (!fs.existsSync(d)) return;
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const f = path.join(d, e.name);
            if (e.isDirectory()) recur(f);
            else if (e.name.endsWith('.frag')) out.push(f);
        }
    }
    recur(dir);
    return out;
}

// Relative path keys matching the manifest's `id` field for frags
const refs = walk(REF_DIR).map(p => path.relative(REF_DIR, p).replace(/\\/g, '/'));
const pubs = new Set(walk(PUB_DIR).map(p => path.relative(PUB_DIR, p).replace(/\\/g, '/')));

const excluded = refs.filter(r => !pubs.has(r));
console.log(`Reference corpus: ${refs.length} frags`);
console.log(`Curated public:   ${pubs.size} frags`);
console.log(`Excluded:         ${excluded.length} frags`);
console.log();

// Load both snapshots
interface Row { name: string; overall: string; failFirstGate?: string; webglCompile?: { ok: boolean }; v3Transform?: { ok: boolean; error?: string } }
function readJsonl(p: string): Map<string, Row> {
    const m = new Map<string, Row>();
    for (const line of fs.readFileSync(p, 'utf8').trim().split('\n')) {
        try { const r = JSON.parse(line); m.set(r.name, r); } catch {}
    }
    return m;
}
const v3 = readJsonl('debug/v3-honest-snapshot.jsonl');
const v4 = readJsonl('debug/v4-verify-results.jsonl');

const compilesSomewhere = (name: string) =>
    (v3.get(name)?.webglCompile?.ok === true) || (v4.get(name)?.webglCompile?.ok === true);

const archSkip = (name: string) => {
    const v3r = v3.get(name);
    const v4r = v4.get(name);
    // Skip when both sides explicitly reject the formula (overall=skip) AND nothing compiled —
    // i.e. architectural reason (2D / providesColor / etc), not just downstream gate fails.
    return (v3r?.overall === 'skip' && v4r?.overall === 'skip');
};

const candidates: string[] = [];
const skips: string[] = [];
const broken: string[] = [];
const noData: string[] = [];

for (const rel of excluded) {
    const basename = rel.split('/').pop()!.replace(/\.frag$/, '');
    const v3r = v3.get(basename);
    const v4r = v4.get(basename);
    if (!v3r && !v4r) { noData.push(rel); continue; }
    if (archSkip(basename)) { skips.push(rel); continue; }
    if (compilesSomewhere(basename)) { candidates.push(rel); continue; }
    broken.push(rel);
}

console.log(`── classification of excluded ──`);
console.log(`  candidates to restore (compile in at least one pipeline): ${candidates.length}`);
console.log(`  architectural skips (both sides skip): ${skips.length}`);
console.log(`  truly broken (neither compiles):       ${broken.length}`);
console.log(`  no harness data (untested):            ${noData.length}`);
console.log();

console.log(`── candidates (first 40 of ${candidates.length}) ──`);
for (const c of candidates.slice(0, 40)) console.log(`  ${c}`);
if (candidates.length > 40) console.log(`  ... +${candidates.length - 40} more`);

if (process.argv.includes('--out')) {
    const outArg = process.argv.find(a => a.startsWith('--out='))?.slice('--out='.length) ?? 'debug/recoverable-frags.txt';
    fs.writeFileSync(outArg, candidates.join('\n') + '\n', 'utf8');
    console.log(`\n→ ${candidates.length} paths written to ${outArg}`);
}

if (process.argv.includes('--list-broken')) {
    console.log(`\n── truly broken (for reference) ──`);
    for (const b of broken) console.log(`  ${b}`);
}

if (process.argv.includes('--list-nodata')) {
    console.log(`\n── no harness data (never verified, ${noData.length}) ──`);
    for (const n of noData.slice(0, 20)) console.log(`  ${n}`);
    if (noData.length > 20) console.log(`  ... +${noData.length - 20} more`);
}
