import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const page = await browser.newPage();
await page.goto('http://localhost:3400/app-gmt.html');
await page.waitForFunction(`window.__gmtProxy && window.__gmtProxy.isBooted && window.__gmtProxy.hasCompiledShader`, { timeout: 30000 });
await page.waitForFunction(`window.__gmtProxy.accumulationCount > 2`, { timeout: 30000 });

// Hash before
const h1 = await page.evaluate(async () => {
  const s = await (window as any).__gmtProxy.getCompiledFragmentShader();
  return { len: s?.length ?? 0, mode: (window as any).__store.getState().reflections?.reflectionMode };
});
console.log('BEFORE:', JSON.stringify(h1));

// Set reflectionMode = 3 directly via setReflections
const setResult = await page.evaluate(() => {
  const s = (window as any).__store.getState();
  s.setReflections({ reflectionMode: 3.0, bounces: 1 });
  return { newMode: (window as any).__store.getState().reflections?.reflectionMode };
});
console.log('SET:', JSON.stringify(setResult));

// Wait a bit, then check hash again
await page.evaluate(`new Promise(r => setTimeout(r, 8000))`);
const h2 = await page.evaluate(async () => {
  const s = await (window as any).__gmtProxy.getCompiledFragmentShader();
  return { len: s?.length ?? 0, mode: (window as any).__store.getState().reflections?.reflectionMode, isCompiling: (window as any).__gmtProxy.isCompiling };
});
console.log('AFTER 8s:', JSON.stringify(h2));
console.log('shader changed?', h1.len !== h2.len);

await browser.close();
