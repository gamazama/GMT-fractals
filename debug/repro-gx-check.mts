/** One-off: render a user-supplied coord LA-on vs LA-off, flag a square. */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
const OUT = 'h:/tmp';
const WAIT_MS = Number(process.env.WAIT_MS || 9000);
const V = {
  center: [-0.6396519243564869, 0.447970190714411] as [number, number],
  centerLow: [-3.662917280078923e-17, -9.391336225550338e-18] as [number, number],
  zoom: 5.244358778813348e-8, colorMapping: 0, iterMul: Number(process.env.ITERMUL || 1), gradientRepeat: 0.03,
};
const ONLY_ON = process.env.ONLY_ON === '1';

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 900, height: 760 } })).newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    (s as any).openFullscreen({ colorSpace: 'srgb', blendSpace: 'oklab', stops: [
      { id: 'a', position: 0, color: '#000000' }, { id: 'b', position: 0.3, color: '#3a0ca3' },
      { id: 'c', position: 0.6, color: '#4cc9f0' }, { id: 'd', position: 1, color: '#f72585' } ] }, 'Check');
    (s as any).setFullscreenGeom('fractal');
  });
  await page.waitForTimeout(1500);

  const render = async (useLA: boolean) => {
    const stats = await page.evaluate(async ({ V, useLA }) => {
      const r = (window as any).__fractalRenderer;
      if (!r) throw new Error('no handle');
      r.setDeepZoomEnabled(true);
      r.setParams({ center: V.center, centerLow: V.centerLow, zoom: V.zoom, iterMul: V.iterMul, colorMapping: V.colorMapping, gradientRepeat: V.gradientRepeat, gradientPhase: 0, useLA });
      await r.rebuildDeepZoom();
      return r.lastDeepStats;
    }, { V, useLA });
    await page.waitForTimeout(WAIT_MS);
    const probe = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="fullscreen-gradient-overlay"] canvas') as HTMLCanvasElement;
      const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
      const x = t.getContext('2d')!; x.drawImage(c, 0, 0);
      const { data } = x.getImageData(0, 0, t.width, t.height);
      const W = t.width, H = t.height;
      const x0 = (W*0.3)|0, x1 = (W*0.7)|0, y0 = (H*0.3)|0, y1 = (H*0.7)|0;
      const m = new Map<string, number>(); let n = 0;
      for (let y=y0;y<y1;y++) for (let xx=x0;xx<x1;xx++){const i=(y*W+xx)*4;const k=(data[i]>>3)+','+(data[i+1]>>3)+','+(data[i+2]>>3);m.set(k,(m.get(k)??0)+1);n++;}
      let md=0; for (const v of m.values()) md=Math.max(md,v/n);
      return { dom: md, dataUrl: c.toDataURL('image/png') };
    });
    return { stats, ...probe };
  };

  const sfx = process.env.ITERMUL ? `-im${process.env.ITERMUL}` : '';
  const on = await render(true);
  writeFileSync(`${OUT}/check-la-on${sfx}.png`, Buffer.from(on.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
  console.log(`LA-on : ${JSON.stringify(on.stats)} centralDominant=${on.dom.toFixed(3)}`);
  if (!ONLY_ON) {
    const off = await render(false);
    writeFileSync(`${OUT}/check-la-off${sfx}.png`, Buffer.from(off.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log(`LA-off: ${JSON.stringify(off.stats)} centralDominant=${off.dom.toFixed(3)}`);
    console.log(`Δ centralDominant = ${Math.abs(on.dom-off.dom).toFixed(3)} ${Math.abs(on.dom-off.dom)>0.15?'⚠ SQUARE?':'ok'}`);
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
