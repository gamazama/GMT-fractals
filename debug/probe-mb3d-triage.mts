/**
 * Render-triage every standalone MB3D catalog formula and bucket by how much it
 * actually renders (nonBlackFraction + per-channel sigma). Tells us which
 * faithful formulas read as standalone fractals vs. which are transform-style
 * building blocks that render sparse/empty alone. Requires vite:5173.
 * Run: npx tsx debug/probe-mb3d-triage.mts
 */
import { chromium } from 'playwright';
import { getMB3DCatalog } from '../engine-gmt/utils/mb3d/mb3dCatalog.ts';
import { DECOMPILED_DEFAULTS } from '../engine-gmt/utils/mb3d/decompiled-formulas.ts';
import type { MB3DScene, MB3DFormulaSlot } from '../engine-gmt/utils/mb3d/parseMB3D.ts';

function header() {
  return {
    mandId: 0, width: 256, height: 256, iterations: 24, iOptions: 0, zoom: 1, fovY: 0,
    midX: 0, midY: 0, midZ: 0, wRotX: 0, wRotY: 0, wRotZ: 0, isJulia: false,
    jx: 0, jy: 0, jz: 0, jw: 0, m3dVersion: 18, tilingOptions: 0,
  };
}
function scene(slot: MB3DFormulaSlot, title: string): MB3DScene {
  return {
    version: 18, header: header() as any, title, raw: new Uint8Array(0),
    addon: { version: 0, options1: 0, options2: 0, options3: 0, formulaCount: 1, hybOpt1: 0, hybOpt2: 0, slots: [slot] },
  };
}
function slotFor(e: any): MB3DFormulaSlot {
  if (e.kind === 'intern') {
    const ov: number[] = e.internDefaults ?? [];
    return { iterCount: 0, formulaIndex: e.ref, name: e.label, optionCount: ov.length, optionTypes: ov.map(() => 0), optionValues: ov };
  }
  const d = DECOMPILED_DEFAULTS[e.ref] ?? { optionTypes: [], optionValues: [], optionCount: 0 };
  return { iterCount: 0, formulaIndex: 20, name: e.ref, optionCount: d.optionCount, optionTypes: d.optionTypes, optionValues: d.optionValues };
}

const entries = getMB3DCatalog().flatMap((g) => g.entries.map((e) => ({ ...e, group: g.category })));
console.log(`triaging ${entries.length} formulas…`);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage();
page.on('pageerror', () => {});
await page.goto('http://localhost:5173/render-harness.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!(window as any).runMB3DWeaveTest, { timeout: 60000 });

const rows: { label: string; group: string; ok: boolean; nonBlack: number; sigma: number; err?: string }[] = [];
let i = 0;
for (const e of entries) {
  i++;
  const sc = scene(slotFor(e), e.label);
  const spec = { id: e.label, mode: 'single', size: [256, 256], timeoutMs: 30000 };
  try {
    const r: any = await page.evaluate(([s, sp]) => (window as any).runMB3DWeaveTest(s, sp), [sc, spec] as any);
    const nb = r?.render?.nonBlackFraction ?? 0;
    const sig = Array.isArray(r?.render?.sigma) ? r.render.sigma.reduce((a: number, b: number) => a + b, 0) : 0;
    rows.push({ label: e.label, group: e.group, ok: !!r?.ok, nonBlack: nb, sigma: sig, err: r?.error });
    if (i % 10 === 0) console.log(`  …${i}/${entries.length}`);
  } catch (err: any) {
    rows.push({ label: e.label, group: e.group, ok: false, nonBlack: 0, sigma: 0, err: String(err?.message ?? err) });
  }
}
await browser.close();

const cls = (r: typeof rows[0]) =>
  !r.ok ? 'ERROR' : r.nonBlack >= 0.04 && r.sigma >= 6 ? 'GOOD' : r.nonBlack >= 0.04 ? 'FLAT' : r.nonBlack > 0.003 ? 'SPARSE' : 'EMPTY';
const by: Record<string, typeof rows> = { GOOD: [], FLAT: [], SPARSE: [], EMPTY: [], ERROR: [] };
for (const r of rows) by[cls(r)].push(r);

console.log(`\n=== MB3D standalone render triage (${rows.length}) ===`);
for (const k of ['GOOD', 'FLAT', 'SPARSE', 'EMPTY', 'ERROR']) {
  const list = by[k].sort((a, b) => b.nonBlack - a.nonBlack);
  console.log(`\n[${k}] ${list.length}`);
  for (const r of list) console.log(`  ${r.nonBlack.toFixed(3)}  σ${r.sigma.toFixed(0).padStart(3)}  ${r.label}  (${r.group})${r.err ? '  ERR:' + r.err.slice(0, 60) : ''}`);
}
import fs from 'node:fs';
fs.writeFileSync('h:/tmp/mb3d-triage.json', JSON.stringify(rows, null, 2));
console.log('\nwrote h:/tmp/mb3d-triage.json');
