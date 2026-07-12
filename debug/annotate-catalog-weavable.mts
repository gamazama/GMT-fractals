/**
 * Annotate public/formulas/v3-v4-catalog.json with a `weavable` flag per entry.
 *
 * weavable = the entry's honest-harness `v3 === 'pass'` (standalone V3 def
 * compiled + rendered on real GPU) AND the V3 transform lands in
 * **per-iteration** mode (the only import shape the weave resolver accepts —
 * `full-de` and all V4 imports register `shape:self-contained` and are greyed
 * "can't weave" in the weave picker; see nativeSlotReject / ADR-0089 P4.3).
 *
 * The original catalog generator (debug/build-v3-v4-catalog.mts, `npm run
 * catalog:build`) was stripped with the prototype harnesses (77f6d66a), so the
 * catalog is a frozen artifact — this script annotates it in place and is
 * idempotent. Re-run after any V3 pipeline change that affects per-iteration
 * eligibility:
 *
 *   npx tsx debug/annotate-catalog-weavable.mts
 *
 * Consumed by isFormulaWeavable() (formula-library.ts) → the Workshop's
 * "Weavable only" browse filter.
 */
import * as fs from 'fs';
import { detectFormulaV3, transformFormulaV3 } from '../engine-gmt/features/fragmentarium_import/v3/compat.ts';

const CATALOG = 'public/formulas/v3-v4-catalog.json';

const decData = JSON.parse(fs.readFileSync('public/formulas/dec.json', 'utf8')) as Array<{ id: string; code: string }>;
const decById = new Map(decData.map((d) => [d.id, d.code]));
const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));

function sourceOf(id: string): string | null {
    const dec = decById.get(id);
    if (dec !== undefined) return dec;
    const fragPath = `public/formulas/frag/${id}`;
    return fs.existsSync(fragPath) ? fs.readFileSync(fragPath, 'utf8') : null;
}

/** True when the V3 import pipeline emits this source in per-iteration mode. */
function isPerIteration(source: string, id: string): boolean {
    try {
        const detected = detectFormulaV3(source, id);
        if ('error' in detected) return false;
        const regId = 'wv_' + id.replace(/[^a-zA-Z0-9_]/g, '');
        const result = transformFormulaV3(detected, detected.selectedFunction, detected.loopMode, regId, detected.params);
        return result?.mode === 'per-iteration';
    } catch {
        return false;
    }
}

let weavable = 0, total = 0, noSource = 0;
for (const [id, entry] of Object.entries(catalog.byId) as Array<[string, any]>) {
    total++;
    if (entry.v3 !== 'pass') { entry.weavable = false; continue; }
    const src = sourceOf(id);
    if (src === null) { entry.weavable = false; noSource++; continue; }
    entry.weavable = isPerIteration(src, id);
    if (entry.weavable) weavable++;
}

fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 1) + '\n');
console.log(`${CATALOG}: ${weavable}/${total} entries weavable (${noSource} v3-pass entries had no local source)`);
