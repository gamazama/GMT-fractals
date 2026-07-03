// What's unique about Aexion vs the working scenes? For every .m3p in the corpus:
// list its slot formulas + merged deOption + which slots produce a derivative, then
// build cross-references: formula usage frequency, deOption distribution, no-deriv scenes.
import fs from 'node:fs';
import path from 'node:path';
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { AmazingBox } from '../engine-gmt/formulas/AmazingBox.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';
import { DECOMPILED_DE_META, DECOMPILED_FORMULAS, DECOMPILED_SCRATCH } from '../engine-gmt/utils/mb3d/decompiled-formulas.ts';

registry.register(AmazingBox);
const dir = 'h:/tmp/mb3d-src/M3Parameter';
const INTERN_NAMES = ['Integer Power', 'Amazing Surf', 'Quaternion', 'Tricorn', 'Amazing Box', 'Bulbox', 'Folding Int Pow'];

// A formula "produces a derivative" if its decompiled body writes a derivative
// (mb3dDr1) OR is an intern with a dr update (interns #0..#4,#6 all write dr).
// Aexion1 uses `w` purely as a 4th coordinate → NO derivative.
function producesDeriv(name: string, fIndex: number): boolean | null {
  if (fIndex >= 0 && fIndex <= 6 && fIndex !== 5) return true; // interns write dr (except #5 stub)
  const body = DECOMPILED_FORMULAS[name];
  if (!body) return null; // unknown
  // decompiled bodies thread the MB3D `w` (derivative in 3D path) — a formula that
  // WRITES w a nontrivial derivative shows as reads/writes of w beyond `f0 = w` seed.
  // Heuristic: does it write mb3dDr1, OR assign to w after arithmetic (not just pass-through)?
  const scratch = DECOMPILED_SCRATCH[name] ?? [];
  if (scratch.includes('mb3dDr1')) return true;
  // Count writes to `w` that aren't the trivial identity. Bodies end by writing w back;
  // a deriv-producer multiplies/accumulates w. Crude but discriminating for this corpus.
  const wWrites = (body.match(/(^|\n)\s*w\s*=(?!=)/g) ?? []).length;
  // A pure-coordinate formula (Aexion1) writes w from coords (folds), not a scaled deriv.
  // We can't perfectly tell — return the write count signal.
  return wWrites > 0 ? (name === 'Aexion1' ? false : null) : false;
}

const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.m3p')).sort();
const usage = new Map<string, string[]>();      // formula -> scenes using it
const rows: any[] = [];
for (const f of files) {
  const name = f.replace(/\.m3p$/i, '');
  try {
    const scene = parseMB3DBinary(new Uint8Array(fs.readFileSync(path.join(dir, f))), name);
    const { def, ledger } = emitFusedHybrid(scene);
    if (!def) continue;
    const slots = ledger.slotFlags;
    let merged = -1;
    // reuse mergedDeOption logic loosely: collect deOptions
    const deOpts = slots.map((s) => DECOMPILED_DE_META[s.name]?.deOption ?? (s.formulaIndex === 2 ? '4D-quat' : 'intern'));
    const anyDeriv = slots.some((s) => producesDeriv(s.name, s.formulaIndex) === true);
    for (const s of slots) {
      if (!usage.has(s.name)) usage.set(s.name, []);
      usage.get(s.name)!.push(name);
    }
    rows.push({ name, formulas: slots.map((s) => s.name).join(' → '), deOpts: JSON.stringify(deOpts), anyDeriv, has4DQuat: slots.some((s) => s.formulaIndex === 2) });
  } catch {}
}

console.log(`\n=== ${rows.length} scenes emit a def ===`);
console.log('\n--- Aexion 10bulbs profile ---');
const aex = rows.find((r) => r.name === 'Aexion 10bulbs');
console.log(JSON.stringify(aex, null, 1));

console.log('\n--- Formula usage for Aexion\'s slots (is any UNIQUE to Aexion?) ---');
for (const fm of ['_PolyFolding', '_updateC', 'Aexion1']) {
  const users = usage.get(fm) ?? [];
  console.log(`  ${fm}: used by ${users.length} scene(s): ${users.join(', ')}`);
}

console.log('\n--- deOption-4 scenes (the doHybrid4DDEPas julia-bulb DE) ---');
for (const r of rows) if (r.deOpts.includes('4') && !r.deOpts.includes('4D-quat')) console.log(`  ${r.name}: ${r.deOpts}  formulas=${r.formulas}`);

console.log('\n--- ACCURATE DE class per scene: estimator + does the fused GLSL ever WRITE dr? ---');
console.log('  (est 6 = dIFS/g_difsDE, dr irrelevant · est 0/2 + dr-never-written = the no-derivative problem class)');
const cls: Record<string, string[]> = {};
for (const f of files) {
  const name = f.replace(/\.m3p$/i, '');
  let scene, def;
  try { scene = parseMB3DBinary(new Uint8Array(fs.readFileSync(path.join(dir, f))), name); ({ def } = emitFusedHybrid(scene)); } catch { continue; }
  if (!def) continue;
  const est = def.defaultPreset.features.quality?.estimator ?? 0;
  const difs = !!(def.shader as any).supportsDifs;
  const fn = (def.shader as any).function as string;
  // count NON-seed dr writes inside slot bodies (dr = <expr involving dr or r or math>)
  const drWrites = (fn.match(/\bdr\s*=\s*[^;]*(dr|pow|\*|r\b)[^;]*/g) ?? []).filter((m) => !/dr\s*=\s*w;|dr\s*=\s*mb3dDr1;/.test(m)).length;
  const est4dGetDist = !!(def.shader as any).getDist;
  const key = difs ? 'dIFS (est6, g_difsDE — no dr needed)'
    : drWrites > 0 ? `HAS real dr (est ${est})`
    : est4dGetDist ? `4D bulb getDist (est ${est}), dr NEVER written`
    : `dr NEVER written (est ${est})`;
  (cls[key] ??= []).push(name);
}
for (const [k, v] of Object.entries(cls).sort((a, b) => a[1].length - b[1].length)) {
  console.log(`\n  [${v.length}] ${k}:`);
  for (const s of v) console.log(`       ${s}`);
}

console.log('\n--- formulas used by ONLY ONE scene (unique) that appear in Aexion ---');
for (const fm of ['_PolyFolding', '_updateC', 'Aexion1']) {
  const u = usage.get(fm) ?? [];
  if (u.length === 1) console.log(`  ${fm} is UNIQUE to ${u[0]}`);
}
