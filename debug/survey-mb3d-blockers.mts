// Survey ALL M3Parameter scenes: categorize by blocker, and for mode-0 (ALTERNATE,
// the supported mode) scenes rank which MISSING formula would unlock the most.
// Run: npx tsx debug/survey-mb3d-blockers.mts
import fs from 'node:fs';
import path from 'node:path';
import { registry } from '../engine-gmt/engine/FractalRegistry';
import { AmazingBox } from '../engine-gmt/formulas/AmazingBox';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D';
import { buildWeaveSequence, stepSlot } from '../engine-gmt/utils/mb3d/weaveSequencer';
import { transpileSlot } from '../engine-gmt/utils/mb3d/slotTranspiler';
registry.register(AmazingBox);

const MODE = ['0 ALTERNATE', '1 interpolate', '2 DEcombine', '3 KIFS'];
const dir = 'h:/tmp/mb3d-src/M3Parameter';
const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.m3p')).sort();

type Row = { scene: string; mode: number; slots: { name: string; ok: boolean }[]; missing: string[] };
const rows: Row[] = [];
for (const f of files) {
  const name = f.replace(/\.m3p$/i, '');
  try {
    const scene = parseMB3DBinary(new Uint8Array(fs.readFileSync(path.join(dir, f))), name);
    if (!scene.addon) { rows.push({ scene: name, mode: -1, slots: [], missing: [] }); continue; }
    const plan = buildWeaveSequence(scene.addon);
    const usedIdx = [...new Set(plan.order.map(stepSlot))];
    const slots = usedIdx.map((idx) => {
      const sl = scene.addon!.slots[idx];
      const t = transpileSlot(sl, idx, `s${idx}`, { parametric: usedIdx.length === 1 });
      return { name: sl.name || `#${sl.formulaIndex}`, ok: t.tier !== 'unsupported' };
    });
    rows.push({ scene: name, mode: plan.mode, slots, missing: [...new Set(slots.filter((s) => !s.ok).map((s) => s.name))] });
  } catch (e: any) { rows.push({ scene: name, mode: -2, slots: [], missing: [`PARSE_ERR:${e?.message}`] }); }
}

const mode0 = rows.filter((r) => r.mode === 0);
const renderable = mode0.filter((r) => r.missing.length === 0);
const fmlBlocked = mode0.filter((r) => r.missing.length > 0);
const modeBlocked = rows.filter((r) => r.mode >= 1);
const oddball = rows.filter((r) => r.mode < 0);

console.log(`\n=== ${files.length} scenes: ${renderable.length} mode-0 renderable · ${fmlBlocked.length} mode-0 formula-blocked · ${modeBlocked.length} mode 1-3 (blend, not formula) · ${oddball.length} no-addon/err ===`);

// The ask: for mode-0 (ALTERNATE) scenes, which MISSING formula unlocks the most?
const blockerCount = new Map<string, number>();
for (const r of fmlBlocked) for (const m of r.missing) blockerCount.set(m, (blockerCount.get(m) ?? 0) + 1);
console.log(`\n=== mode-0 formula blockers (port these → unlock scenes) ===`);
[...blockerCount.entries()].sort((a, b) => b[1] - a[1]).forEach(([n, c]) => console.log(`  ${String(c).padStart(2)} scene(s)  ${n}`));

const oneAway = fmlBlocked.filter((r) => r.missing.length === 1);
console.log(`\n=== mode-0 scenes ONE formula away (${oneAway.length}) ===`);
oneAway.sort((a, b) => a.missing[0].localeCompare(b.missing[0])).forEach((r) => console.log(`  ${r.scene}  →  ${r.missing[0]}`));

console.log(`\n=== mode-0 scenes blocked by 2+ formulas (${fmlBlocked.length - oneAway.length}) ===`);
fmlBlocked.filter((r) => r.missing.length > 1).forEach((r) => console.log(`  ${r.scene}  →  ${r.missing.join(', ')}`));

console.log(`\n=== mode 1-3 scenes (blocked by BLEND semantics, formula-port won't help) ===`);
for (const r of modeBlocked) console.log(`  [${MODE[r.mode]}]  ${r.scene}  {${r.slots.map((s) => s.name + (s.ok ? '' : '✗')).join(', ')}}`);

fs.writeFileSync('h:/tmp/mb3d-blocker-survey.json', JSON.stringify(rows, null, 2));
console.log('\nwrote h:/tmp/mb3d-blocker-survey.json');
