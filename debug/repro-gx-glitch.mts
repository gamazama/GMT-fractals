/**
 * Repro / verification harness for the residual deep-zoom "wrong-coloured square"
 * artifact (ADR-0065 auto-reference fix).
 *
 * Renders a set of deep views with LA ON and LA OFF, writes PNGs to h:/tmp, and
 * computes a programmatic SQUARE-DETECTOR metric: the largest fraction any single
 * (5-bit-quantised) colour occupies in the central region. A wrong-coloured square
 * is a coherent flat block → that fraction spikes; a correct render is busy → low.
 *
 * Usage: tsx debug/repro-gx-glitch.mts [tag]
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
const TAG = process.argv[2] ? `-${process.argv[2]}` : '';
const OUT = process.env.OUT_DIR || 'h:/tmp';
const WAIT_MS = Number(process.env.WAIT_MS || 9000);

interface View { name: string; center: [number, number]; zoom: number; iterMul: number; colorMapping: number; }
const VIEWS: View[] = [
  // User-reported glitch: reference orbit escapes early (orbitLen ~588).
  { name: 'glitch', center: [-0.8647752352263411, 0.2422927873189491], zoom: 6.869923567136315e-8, iterMul: 3.25, colorMapping: 0 },
  // Seahorse valley — well-behaved deep view; no-regression control (should NOT relocate).
  { name: 'seahorse', center: [-0.743643887037151, 0.13182590420533], zoom: 1e-9, iterMul: 1, colorMapping: 0 },
  // Exterior-heavy deep view near the spike — likely escapes early → relocate.
  { name: 'spike', center: [-1.7497591451303665, 0.0000000003835], zoom: 5e-8, iterMul: 2.5, colorMapping: 0 },
  // Elephant valley deep — another region, escapes early on the exterior.
  { name: 'elephant', center: [0.2825020025, -0.01000508], zoom: 8e-8, iterMul: 2.5, colorMapping: 0 },
];

function fail(msg: string): never { console.error(`✗ ${msg}`); process.exit(1); }

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 900, height: 760 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    const cfg = { colorSpace: 'srgb', blendSpace: 'oklab', stops: [
      { id: 'a', position: 0, color: '#000000' }, { id: 'b', position: 0.35, color: '#3a86ff' },
      { id: 'c', position: 0.6, color: '#ffbe0b' }, { id: 'd', position: 0.85, color: '#ff006e' },
      { id: 'e', position: 1, color: '#ffffff' },
    ] };
    (s as any).openFullscreen(cfg, 'Glitch repro');
    (s as any).setFullscreenGeom('fractal');
  });
  await page.waitForTimeout(1500);

  // Render a view with LA forced on/off → { stats, dataUrl, metric }. The metric
  // is the largest single-colour fraction inside the central 40% box (the square's
  // home) — high == a flat block (artifact); low == busy detail (correct).
  const renderView = async (v: View, useLA: boolean) => {
    const stats = await page.evaluate(async ({ v, useLA }) => {
      const r = (window as any).__fractalRenderer;
      if (!r) throw new Error('no __fractalRenderer handle');
      r.setDeepZoomEnabled(true);
      r.setParams({ center: v.center, centerLow: [0, 0], zoom: v.zoom, iterMul: v.iterMul, colorMapping: v.colorMapping, useLA });
      await r.rebuildDeepZoom();
      return r.lastDeepStats;
    }, { v, useLA });
    await page.waitForTimeout(WAIT_MS);
    const probe = await page.evaluate(() => {
      const ov = document.querySelector('[data-testid="fullscreen-gradient-overlay"]');
      const canvas = ov?.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) return null;
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width; tmp.height = canvas.height;
      const c2 = tmp.getContext('2d')!;
      c2.drawImage(canvas, 0, 0);
      const W = tmp.width, H = tmp.height;
      const { data } = c2.getImageData(0, 0, W, H);
      // Central 40% box.
      const x0 = Math.floor(W * 0.3), x1 = Math.floor(W * 0.7);
      const y0 = Math.floor(H * 0.3), y1 = Math.floor(H * 0.7);
      const central = new Map<string, number>();
      let centralN = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * W + x) * 4;
        const k = (data[i] >> 3) + ',' + (data[i + 1] >> 3) + ',' + (data[i + 2] >> 3);
        central.set(k, (central.get(k) ?? 0) + 1); centralN++;
      }
      let maxFrac = 0;
      for (const c of central.values()) maxFrac = Math.max(maxFrac, c / centralN);
      const full = new Set<string>();
      for (let i = 0; i < data.length; i += 4) full.add((data[i] >> 3) + ',' + (data[i + 1] >> 3) + ',' + (data[i + 2] >> 3));
      return { dataUrl: canvas.toDataURL('image/png'), centralDominant: maxFrac, centralDistinct: central.size, fullDistinct: full.size };
    });
    return { stats, ...(probe ?? { dataUrl: null, centralDominant: 1, centralDistinct: 0, fullDistinct: 0 }) };
  };

  const save = (name: string, dataUrl: string | null) => {
    if (!dataUrl) { console.error(`no canvas for ${name}`); return; }
    writeFileSync(`${OUT}/${name}${TAG}.png`, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
  };

  for (const v of VIEWS) {
    const on = await renderView(v, true);
    const off = await renderView(v, false);
    save(`${v.name}-la-on`, on.dataUrl);
    save(`${v.name}-la-off`, off.dataUrl);
    console.log(`\n=== ${v.name} ===`);
    console.log(`  LA ON : ${JSON.stringify(on.stats)}`);
    console.log(`          centralDominant=${on.centralDominant.toFixed(3)} centralDistinct=${on.centralDistinct} fullDistinct=${on.fullDistinct}`);
    console.log(`  LA OFF: centralDominant=${off.centralDominant.toFixed(3)} centralDistinct=${off.centralDistinct} fullDistinct=${off.fullDistinct}`);
    const delta = on.centralDominant - off.centralDominant;
    console.log(`  Δ centralDominant (on-off) = ${delta.toFixed(3)}  ${delta > 0.15 ? '⚠ SQUARE?' : 'ok'}`);
  }

  if (errors.length) console.error('runtime errors:\n  ' + errors.join('\n  '));
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });