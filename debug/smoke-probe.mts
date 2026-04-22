import { chromium } from 'playwright';
const URL = process.env.ENGINE_URL || 'http://localhost:3400/';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const keys = await page.evaluate(() => Object.keys((window as any).__store?.getState?.() ?? {}).sort());
console.log('store keys:', JSON.stringify(keys));
const tabs = await page.evaluate(() => {
    const reg = (window as any).__store?.getState?.()?.panels;
    return JSON.stringify(reg);
});
console.log('panels:', tabs);
await browser.close();
