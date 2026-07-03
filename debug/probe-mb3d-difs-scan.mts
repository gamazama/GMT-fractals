/**
 * Render-triage the MB3D dIFS family (DEoption 20 → estimator 6, the orbit-trap
 * IFS DE) standalone, on the real GPU. Before the dIFS estimator landed these all
 * rendered EMPTY; this counts how many now read as coherent geometry.
 * Each formula renders as a single-slot scene at its decompiled defaults.
 * Requires the harness server at vite:5173. Run: npx tsx debug/probe-mb3d-difs-scan.mts
 */
import { chromium } from 'playwright';
import { DECOMPILED_DE_META, DECOMPILED_DEFAULTS } from '../engine-gmt/utils/mb3d/decompiled-formulas.ts';
import type { MB3DScene, MB3DFormulaSlot } from '../engine-gmt/utils/mb3d/parseMB3D.ts';

const difsNames = Object.entries(DECOMPILED_DE_META)
  .filter(([, m]) => (m as any).deOption === 20)
  .map(([name]) => name)
  .filter((name) => DECOMPILED_DEFAULTS[name]); // need defaults to build a scene

function header() {
  return {
    mandId: 0, width: 256, height: 256, iterations: 32, iOptions: 0, zoom: 1, fovY: 0,
    midX: 0, midY: 0, midZ: 0, wRotX: 0, wRotY: 0, wRotZ: 0, isJulia: false,
    jx: 0, jy: 0, jz: 0, jw: 0, m3dVersion: 18, tilingOptions: 0,
  };
}
function scene(name: string): MB3DScene {
  const d = DECOMPILED_DEFAULTS[name];
  const slot: MB3DFormulaSlot = {
    iterCount: 0, formulaIndex: 20, name, optionCount: d.optionCount,
    optionTypes: d.optionTypes, optionValues: d.optionValues,
  };
  return {
    version: 18, header: header() as any, title: name, raw: new Uint8Array(0),
    addon: { version: 0, options1: 0, options2: 0, options3: 0, formulaCount: 1, hybOpt1: 0, hybOpt2: 0, slots: [slot] },
  };
}

console.log(`scanning ${difsNames.length} dIFS formulas on GPU…`);
const browser = await chromium.launch({
  headless: false,
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage();
page.on('pageerror', () => {});
await page.goto('http://localhost:5173/render-harness.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!(window as any).runMB3DWeaveTest, { timeout: 60000 });

const rows: { name: string; ok: boolean; nb: number; sigma: number; err?: string }[] = [];
for (const name of difsNames) {
  const spec = { id: name, mode: 'single', size: [256, 256], timeoutMs: 30000 };
  try {
    const r: any = await page.evaluate(([s, sp]) => (window as any).runMB3DWeaveTest(s, sp), [scene(name), spec] as any);
    const nb = r?.render?.nonBlackFraction ?? 0;
    const sig = Array.isArray(r?.render?.sigma) ? r.render.sigma.reduce((a: number, b: number) => a + b, 0) : 0;
    rows.push({ name, ok: !!r?.ok, nb, sigma: sig, err: r?.error });
  } catch (err: any) {
    rows.push({ name, ok: false, nb: 0, sigma: 0, err: String(err?.message ?? err) });
  }
}
await browser.close();

const cls = (r: typeof rows[0]) =>
  !r.ok ? 'ERROR' : r.nb >= 0.04 && r.sigma >= 6 ? 'GOOD' : r.nb >= 0.04 ? 'FLAT' : r.nb > 0.003 ? 'SPARSE' : 'EMPTY';
const by: Record<string, typeof rows> = { GOOD: [], FLAT: [], SPARSE: [], EMPTY: [], ERROR: [] };
for (const r of rows) by[cls(r)].push(r);

console.log(`\n=== dIFS standalone render scan (${rows.length}) ===`);
for (const k of ['GOOD', 'FLAT', 'SPARSE', 'EMPTY', 'ERROR']) {
  const list = by[k].sort((a, b) => b.nb - a.nb);
  console.log(`\n[${k}] ${list.length}`);
  for (const r of list) console.log(`  ${r.nb.toFixed(3)}  σ${r.sigma.toFixed(0).padStart(3)}  ${r.name}${r.err ? '  ERR:' + r.err.slice(0, 50) : ''}`);
}
import fs from 'node:fs';
fs.writeFileSync('h:/tmp/mb3d-difs-scan.json', JSON.stringify(rows, null, 2));
console.log('\nwrote h:/tmp/mb3d-difs-scan.json');
