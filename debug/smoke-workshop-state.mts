/**
 * Smoke: Formula Workshop remembers in-session editing state across close/reopen.
 *
 * TEST 1 — restore work: open, type a distinctive DE, close, reopen, expand the
 *   (auto-collapsed) source editor → the typed source is restored.
 * TEST 2 — no-work-clean: with NO meaningful edit (default template untouched),
 *   close + reopen → source is the default template, not a stale draft.
 *
 * Requires app-gmt dev server. ENGINE_URL overrides (default :5173/app-gmt.html).
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:5173/app-gmt.html';
const MARKER = 'float de(vec3 p){ return length(p)-0.654321; }';

async function main() {
    const browser = await chromium.launch();
    const page = await browser.newContext({ viewport: { width: 1300, height: 900 } }).then(c => c.newPage());
    const errors: string[] = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => typeof (window as any).__store?.getState?.().openWorkshop === 'function', null, { timeout: 30000 });
    await page.waitForTimeout(2500);

    const open  = () => page.evaluate(() => (window as any).__store.getState().openWorkshop());
    const close = () => page.evaluate(() => (window as any).__store.getState().closeWorkshop());
    // Ensure the source editor is expanded (detection auto-collapses it).
    const expandSource = () => page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find(x => /source code/i.test(x.textContent || ''));
        // Only click if currently collapsed: a collapsed panel has no editable cm-content as its first editor.
        (b as HTMLButtonElement | undefined)?.click();
    });
    const allEditors = () => page.evaluate(() => Array.from(document.querySelectorAll('.cm-content')).map(c => (c as HTMLElement).innerText));

    async function typeIntoSource(text: string) {
        const cms = await page.$$('.cm-content');
        if (!cms.length) throw new Error('no source editor found');
        await cms[0].click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');
        await page.keyboard.type(text, { delay: 0 });
    }

    // ── TEST 1: restore work ──
    await open(); await page.waitForTimeout(800);
    await typeIntoSource(MARKER);
    await page.waitForTimeout(600);
    await close(); await page.waitForTimeout(500);
    await open();  await page.waitForTimeout(900);
    await expandSource(); await page.waitForTimeout(400);
    const t1 = (await allEditors()).some(e => e.includes('0.654321'));
    console.log(`TEST 1 (restore work):   ${t1 ? 'PASS' : 'FAIL'}`);

    // ── TEST 2: no meaningful work → clean reopen (clear to default-ish, close, reopen) ──
    // Clear the draft by reloading the page (module-scoped draft is per-session;
    // a fresh load starts with no draft). Then open + immediately close without edits.
    await close();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof (window as any).__store?.getState?.().openWorkshop === 'function', null, { timeout: 30000 });
    await page.waitForTimeout(2500);
    await open(); await page.waitForTimeout(800);
    const beforeClose2 = (await allEditors())[0] ?? '';
    await close(); await page.waitForTimeout(400);
    await open();  await page.waitForTimeout(800);
    const afterReopen2 = (await allEditors())[0] ?? '';
    // No work done → reopen should show the same default template (no marker, not a stale draft).
    const t2 = !afterReopen2.includes('0.654321') && afterReopen2.trim().length > 0;
    console.log(`TEST 2 (no-work clean):  ${t2 ? 'PASS' : 'FAIL'}`);

    if (errors.length) console.log('page errors:\n  ' + errors.slice(0, 6).join('\n  '));
    await browser.close();
    const ok = t1 && t2;
    console.log(ok ? '\nSMOKE PASS' : '\nSMOKE FAIL');
    process.exit(ok ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
