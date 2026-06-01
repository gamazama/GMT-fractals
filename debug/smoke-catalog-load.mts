/**
 * Smoke: picking a frag/DEC catalog thumbnail in the main picker opens the
 * Workshop with that formula's SOURCE loaded into the editor.
 *
 * Exercises the cross-cutting Increment-A flow: openWorkshop(undefined, '<src>:<id>')
 *   → store.workshopCatalogKey → FormulaWorkshop initialCatalogKey effect
 *   → handleBrowseSelect → setSource + runDetect.
 *
 * Covers both the DEC path (source from cached dec.json, sync) and the frag
 * path (source fetched from public/formulas/frag/, async).
 *
 * Requires app-gmt dev server. ENGINE_URL overrides (default :5173/app-gmt.html).
 */
import { chromium } from 'playwright';
import * as fs from 'fs';

const URL = process.env.ENGINE_URL || 'http://localhost:5173/app-gmt.html';

const dec = JSON.parse(fs.readFileSync('h:/GMT/workspace-gmt/dev/public/formulas/dec.json', 'utf8'));
const decEntry = dec.find((d: any) => d.id === 'fractal_de8') ?? dec[0];
const decToken = (decEntry.code as string).split('\n').map(s => s.trim()).find(s => s.length > 12) ?? 'float';

async function main() {
    const browser = await chromium.launch();
    const page = await browser.newContext({ viewport: { width: 1300, height: 900 } }).then(c => c.newPage());
    const errors: string[] = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => typeof (window as any).__store?.getState?.().openWorkshop === 'function', null, { timeout: 30000 });
    await page.waitForTimeout(2500);

    const close = () => page.evaluate(() => (window as any).__store.getState().closeWorkshop());
    const openWith = (key: string) => page.evaluate((k) => (window as any).__store.getState().openWorkshop(undefined, k), key);
    const expandSource = () => page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find(x => /source code/i.test(x.textContent || ''));
        (b as HTMLButtonElement | undefined)?.click();
    });
    const firstEditor = () => page.evaluate(() => {
        const el = document.querySelector('.cm-content') as HTMLElement | null;
        return el ? el.innerText : '';
    });

    let pass = true;

    // ── DEC path ──
    await openWith('dec:' + decEntry.id);
    await page.waitForTimeout(1500);
    await expandSource();
    await page.waitForTimeout(400);
    const decSrc = await firstEditor();
    const decOk = decSrc.includes(decToken.slice(0, 16));
    console.log(`DEC load (${decEntry.id}): ${decOk ? 'PASS' : 'FAIL'} (editor ${decSrc.length} chars, token "${decToken.slice(0, 16)}")`);
    if (!decOk) pass = false;
    await close();
    await page.waitForTimeout(400);

    // ── Frag path (async fetch) ──
    await openWith('frag:3DickUlus/BuffaloBulb.frag');
    await page.waitForTimeout(2000);
    await expandSource();
    await page.waitForTimeout(400);
    const fragSrc = await firstEditor();
    const fragOk = fragSrc.length > 80 && /float|vec3|DE|de\s*\(/.test(fragSrc);
    console.log(`Frag load (3DickUlus/BuffaloBulb.frag): ${fragOk ? 'PASS' : 'FAIL'} (editor ${fragSrc.length} chars)`);
    if (!fragOk) pass = false;

    if (errors.length) { pass = false; console.log('PAGE ERRORS:', errors.slice(0, 5)); }

    await browser.close();
    console.log(pass ? '\nSMOKE PASS' : '\nSMOKE FAIL');
    process.exit(pass ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
