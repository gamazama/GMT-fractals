/**
 * Guard: the frozen Fragmentarium catalog has not drifted HARD from the
 * importer pipelines it describes.
 *
 * `public/formulas/v3-v4-catalog.json` was generated once (2026-04-18) from
 * real-GPU snapshots and is a frozen artifact — `catalog:build` was stripped
 * in 77f6d66a. The Workshop auto-picks a pipeline from its `recommended`
 * column and the picker treats `recommended: 'none'` as "neither renders".
 * The importers keep changing underneath it, and nothing said so: three
 * months in, 87 of 511 rows disagreed with the pipelines in some column
 * (overnight audit, cycle 10).
 *
 * Only ONE direction is a proof of staleness, and that is what this gates:
 *   HARD — the catalog says `pass` for a pipeline that hard-errors on that
 *          source today (parse success is a prerequisite for a GPU pass, so
 *          a `pass` row that no longer parses is wrong, full stop).
 * The other direction (`fail`/`skip` in the catalog, parses today) is only
 * a candidate — parsing is not rendering — and is REPORTED, not gated.
 *
 * Run: `npm run test:frag:catalog-drift`   (node-only, ~10 s, no GPU)
 *      `-- --list` prints every soft candidate too.
 *
 * On red: do not "fix" the guard. Either the pipeline regressed (fix that),
 * or the catalog row is genuinely stale — demote the contradicted column to
 * `fail` with a `*FailGate` note and recompute `recommended` by the policy
 * in formula-library.ts (V3 if V3 passes, else V4 if V4 passes, else none),
 * and append the change to the catalog's `corrections` array so the frozen
 * artifact's history stays in the file.
 *
 * ── FALSIFIED 2026-09-02 ─────────────────────────────────────────────────
 *   Against the catalog as generated: red on exactly the two rows the audit
 *   named — `Experimental/Knot.frag` (v4 `pass`, errors `provides_color`
 *   today) and `kosalos/KIFS.frag` (`no_de_function`) — exit 1. Those two
 *   rows were then demoted in the catalog with a `corrections` entry, and
 *   the guard is green; flipping either back to `pass` reds it again.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { detectFormulaV3 } from '../engine-gmt/features/fragmentarium_import/v3/compat.ts';
import { processFormula as v4ProcessFormula } from '../engine-gmt/features/fragmentarium_import/v4/index.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const LIST = process.argv.includes('--list');
const rd = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const manifest = JSON.parse(rd('public/formulas/manifest.json'));
const decs = JSON.parse(rd('public/formulas/dec.json'));
const catalog = JSON.parse(rd('public/formulas/v3-v4-catalog.json'));
const decCode = new Map<string, string>(decs.map((d: any) => [d.id, d.code]));

interface Row { id: string; kind: 'frag' | 'dec'; v3ok: boolean; v4ok: boolean; v3err?: string; v4err?: string }
const rows: Row[] = [];
const firstLine = (s?: string) => (s ?? '').split('\n')[0].slice(0, 100);

function run(id: string, kind: 'frag' | 'dec', src: string, base: string) {
    let v3err: string | undefined, v4err: string | undefined;
    try { const r: any = detectFormulaV3(src, base); if ('error' in r) v3err = String(r.error); }
    catch (e: any) { v3err = 'THROW: ' + (e?.message ?? String(e)); }
    try { const r: any = v4ProcessFormula(src, base, base, base); if (!r.ok) v4err = `${r.error.kind}: ${r.error.message}`; }
    catch (e: any) { v4err = 'THROW: ' + (e?.message ?? String(e)); }
    rows.push({ id, kind, v3ok: !v3err, v4ok: !v4err, v3err, v4err });
}

for (const f of manifest.frags) {
    const p = path.join(ROOT, 'public/formulas/frag', f.id);
    if (!fs.existsSync(p)) { rows.push({ id: f.id, kind: 'frag', v3ok: false, v4ok: false, v3err: 'MISSING FILE', v4err: 'MISSING FILE' }); continue; }
    run(f.id, 'frag', fs.readFileSync(p, 'utf8'), path.basename(f.id, '.frag'));
}
for (const d of manifest.decs) {
    const code = decCode.get(d.id);
    if (code == null) { rows.push({ id: d.id, kind: 'dec', v3ok: false, v4ok: false, v3err: 'MISSING DEC CODE', v4err: 'MISSING DEC CODE' }); continue; }
    run(d.id, 'dec', code, d.id);
}

const hard: string[] = [];
const soft: string[] = [];
const uncatalogued: string[] = [];
let hiddenButParses = 0;
for (const r of rows) {
    const c = catalog.byId[r.id];
    if (!c) { uncatalogued.push(r.id); continue; }
    if (c.v3 === 'pass' && !r.v3ok) hard.push(`${r.id}  v3 catalog=pass, today: ${firstLine(r.v3err)}`);
    if (c.v4 === 'pass' && !r.v4ok) hard.push(`${r.id}  v4 catalog=pass, today: ${firstLine(r.v4err)}`);
    if (c.v3 !== 'pass' && r.v3ok) soft.push(`${r.id}  v3 catalog=${c.v3}, parses today`);
    if (c.v4 !== 'pass' && r.v4ok) soft.push(`${r.id}  v4 catalog=${c.v4}, processes today`);
    if ((c.recommended ?? 'v4') === 'none' && (r.v3ok || r.v4ok)) hiddenButParses++;
}

const ROW_FLOOR = 400; // 511 today; a manifest that shrank to nothing must not pass vacuously
console.log(`catalog-drift: ${rows.length} library entries re-derived (${rows.filter(r => r.kind === 'frag').length} frag, ${rows.filter(r => r.kind === 'dec').length} dec); catalog generated ${catalog.generated}${catalog.corrections?.length ? `, ${catalog.corrections.length} correction(s)` : ''}`);
console.log(`  soft candidates (catalog not-pass, parses today): ${soft.length}  — informational; parsing is not rendering`);
console.log(`  recommended:'none' rows that parse today: ${hiddenButParses}  — greyed in the picker, not hidden`);
if (uncatalogued.length) console.log(`  ⚠ ${uncatalogued.length} manifest entries have no catalog row: ${uncatalogued.slice(0, 5).join(', ')}${uncatalogued.length > 5 ? '…' : ''}`);
if (LIST) { console.log('\n-- soft candidates --'); soft.forEach(s => console.log('  ' + s)); }

let failures = 0;
if (rows.length < ROW_FLOOR) { failures++; console.log(`\n  ✗ only ${rows.length} entries re-derived (floor ${ROW_FLOOR}) — the manifest or the importers did not load`); }
if (hard.length) {
    failures++;
    console.log(`\n  ✗ HARD staleness: ${hard.length} catalog row(s) say pass for a pipeline that errors today`);
    hard.forEach(h => console.log('      ' + h));
} else {
    console.log('\n  ✓ no hard staleness: every catalog pass still parses under its pipeline');
}
console.log(failures ? `\nFAIL — the catalog contradicts the importers; see the header for what to do` : `\nPASS — catalog and importers agree on every pass row`);
process.exit(failures ? 1 : 0);
