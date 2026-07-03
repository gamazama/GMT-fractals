/**
 * Scan the cloned MB3D scenes (M3Parameter/*.m3p) and report which our importer
 * can render faithfully (all-intern, mode 0) vs which need [CODE] externals.
 * Run: npx tsx debug/scan-mb3d-scenes.mts [/path/to/M3Parameter]
 */
import fs from 'node:fs';
import path from 'node:path';
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { AmazingBox } from '../engine-gmt/formulas/AmazingBox.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';

registry.register(AmazingBox);

const dir = process.argv[2] || 'h:/tmp/mb3d-src/M3Parameter';
const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.m3p')).sort();

const renderable: string[] = [];
const bestEffort: string[] = [];
const unsupported: { f: string; reason: string }[] = [];
const errored: string[] = [];

for (const f of files) {
  try {
    const scene = parseMB3DBinary(new Uint8Array(fs.readFileSync(path.join(dir, f))), f.replace(/\.m3p$/i, ''));
    const { def, ledger, substitute } = emitFusedHybrid(scene);
    const slots = ledger.slotFlags.map((s) => s.name).join(' + ') || '(none)';
    if (def) renderable.push(`${f}  →  ${slots}`);
    else if (substitute) bestEffort.push(`${f}  →  GMT ${substitute.formulaId}  (sub for "${ledger.slotFlags[0]?.name}")`);
    else unsupported.push({ f, reason: ledger.reasons[0] || 'unsupported' });
  } catch (e: any) {
    errored.push(`${f}: ${e?.message ?? e}`);
  }
}

console.log(`\n=== FAITHFUL (intern transpile, mode 0): ${renderable.length} ===`);
renderable.forEach((x) => console.log('  ' + x));
console.log(`\n=== BEST-EFFORT (GMT substitute for single [CODE] external): ${bestEffort.length} ===`);
bestEffort.forEach((x) => console.log('  ' + x));
console.log(`\n=== unsupported: ${unsupported.length} ===`);
const byReason = new Map<string, number>();
for (const u of unsupported) {
  const key = u.reason.replace(/Slot \d+ \([^)]*\): /, '').replace(/"[^"]*"/, '"…"').slice(0, 70);
  byReason.set(key, (byReason.get(key) ?? 0) + 1);
}
[...byReason.entries()].sort((a, b) => b[1] - a[1]).forEach(([r, n]) => console.log(`  ${n}×  ${r}`));
console.log(`\n=== parse errors: ${errored.length} ===`);
errored.slice(0, 8).forEach((x) => console.log('  ' + x));
console.log(`\ntotals: ${files.length} scenes | ${renderable.length} renderable | ${unsupported.length} unsupported | ${errored.length} errors`);
