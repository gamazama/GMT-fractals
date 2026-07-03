// Item-2 Oxnot: which scenes use each of Oxnot's slots (PseudoXDB / _PolyFold-sym / Riemann2)?
// A formula that appears in another faithfully-rendering scene is decode-exonerated; one unique
// to Oxnot (or only in other broken scenes) is the prime mis-port suspect.
import fs from 'node:fs';
import path from 'node:path';
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { AmazingBox } from '../engine-gmt/formulas/AmazingBox.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';

registry.register(AmazingBox);
const dir = 'h:/tmp/mb3d-src/M3Parameter';
// Bundled = faithfully-rendering (curated); everything else is unbundled/unverified.
import { MB3D_SAMPLE_SCENES } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
const BUNDLED = new Set(MB3D_SAMPLE_SCENES.map((s) => s.name));

const usage = new Map<string, string[]>();
const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.m3p')).sort();
for (const f of files) {
  const name = f.replace(/\.m3p$/i, '');
  try {
    const scene = parseMB3DBinary(new Uint8Array(fs.readFileSync(path.join(dir, f))), name);
    const { def, ledger } = emitFusedHybrid(scene);
    if (!def) continue;
    for (const s of ledger.slotFlags) {
      if (!usage.has(s.name)) usage.set(s.name, []);
      usage.get(s.name)!.push(name);
    }
  } catch {}
}

for (const fm of ['PseudoXDB', '_PolyFold-sym', 'Riemann2']) {
  const users = usage.get(fm) ?? [];
  console.log(`\n${fm}: used by ${users.length} scene(s)`);
  for (const u of users) console.log(`   ${BUNDLED.has(u) ? '✅ BUNDLED (renders)' : '·  unbundled'}  ${u}`);
  const otherBundled = users.filter((u) => u !== 'Oxnot - Shells' && BUNDLED.has(u));
  console.log(`   → decode ${otherBundled.length ? 'EXONERATED by ' + otherBundled.join(', ') : 'SUSPECT (no other bundled scene uses it)'}`);
}
