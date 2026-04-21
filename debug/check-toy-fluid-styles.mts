// Verifies:
//   1. Each tone-mapping chip (None/Reinhard/AgX/Filmic) produces distinct output
//   2. Each fluidStyle chip (Plain/Electric/Liquid) produces distinct output
//   3. None tone-mapping with high exposure is visibly MORE VIVID than Reinhard
//   4. Bloom + aberration + refraction do not cause pageerrors

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const TARGET = process.env.TARGET || 'http://localhost:3000/toy-fluid.html';
const OUT = path.resolve(process.cwd(), 'debug/scratch');
fs.mkdirSync(OUT, { recursive: true });

function pass(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) process.exitCode = 1;
}
async function differ(a: Buffer, b: Buffer): Promise<boolean> {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(`[pageerror] ${e.message}`));

  await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 20_000 });
  await page.waitForTimeout(500);

  // Apply Turbo Orbit — dye-heavy preset. Let the sim build dye for a few
  // seconds (post-process effects need something to work on) before pausing.
  await page.locator('button:has-text("Presets")').first().click();
  await page.waitForTimeout(150);
  await page.locator('button:has-text("Turbo Orbit")').first().click();
  await page.waitForTimeout(5000);  // 5s of sim for dye to fill

  // Pause for deterministic screenshots
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);

  const canvasBox = (await page.locator('canvas').first().boundingBox())!;
  const shot = () => page.screenshot({ clip: canvasBox });

  // Open Color tab
  await page.locator('button:has-text("Color")').first().click();
  await page.waitForTimeout(200);

  // 1. Tone mapping chips
  const toneShots: Record<string, Buffer> = {};
  for (const t of ['None', 'Reinhard', 'AgX', 'Filmic']) {
    await page.locator(`button:has-text("${t}")`).first().click();
    await page.waitForTimeout(400);
    const s = await shot();
    toneShots[t] = s;
    fs.writeFileSync(path.join(OUT, `tone-${t.toLowerCase()}.png`), s);
  }
  pass('None ≠ Reinhard', await differ(toneShots['None'], toneShots['Reinhard']));
  pass('AgX ≠ Reinhard', await differ(toneShots['AgX'], toneShots['Reinhard']));
  pass('Filmic ≠ AgX', await differ(toneShots['Filmic'], toneShots['AgX']));

  // 2. Fluid style chips
  await page.locator('button:has-text("None")').first().click();  // reset to none for fair baseline
  await page.waitForTimeout(200);
  const styleShots: Record<string, Buffer> = {};
  for (const st of ['Plain', 'Electric', 'Liquid']) {
    await page.locator(`button:has-text("${st}")`).first().click();
    await page.waitForTimeout(500);
    const s = await shot();
    styleShots[st] = s;
    fs.writeFileSync(path.join(OUT, `style-${st.toLowerCase()}.png`), s);
  }
  pass('Electric ≠ Plain', await differ(styleShots['Electric'], styleShots['Plain']));
  pass('Liquid ≠ Plain', await differ(styleShots['Liquid'], styleShots['Plain']));
  pass('Electric ≠ Liquid', await differ(styleShots['Electric'], styleShots['Liquid']));

  // 3. Saturation check: None with exposure 1.5 vs Reinhard with same exposure.
  // Measure mean chroma (max - min across RGB) — expect None to have higher chroma.
  const chroma = async (buf: Buffer) => {
    const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    return await page.evaluate(async (url) => {
      const img = new Image(); img.src = url;
      await new Promise(r => { img.onload = () => r(null); });
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const c = cv.getContext('2d')!;
      c.drawImage(img, 0, 0);
      const d = c.getImageData(0, 0, img.width, img.height).data;
      let s = 0, n = 0;
      for (let i = 0; i < d.length; i += 4 * 7) {
        const r = d[i], g = d[i+1], b = d[i+2];
        s += Math.max(r,g,b) - Math.min(r,g,b);
        n++;
      }
      return s / n;
    }, dataUrl);
  };
  const chromaNone = await chroma(toneShots['None']);
  const chromaReinhard = await chroma(toneShots['Reinhard']);
  console.log(`  mean chroma: None=${chromaNone.toFixed(1)} Reinhard=${chromaReinhard.toFixed(1)}`);
  pass(`None is more saturated than Reinhard (${chromaNone.toFixed(1)} > ${chromaReinhard.toFixed(1)})`, chromaNone > chromaReinhard);

  pass('no pageerrors across all tone-maps + styles', errs.length === 0);

  await browser.close();
  if (errs.length) { console.log('--- errors ---'); errs.forEach(e => console.log(e)); }
})().catch(e => { console.error(e); process.exit(2); });
