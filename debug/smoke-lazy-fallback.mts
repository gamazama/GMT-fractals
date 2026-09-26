/**
 * smoke-lazy-fallback — a lazily-imported panel whose code can't be fetched
 * shows a notice in place and leaves the app running
 * (components/ui/lazyWithFallback.tsx).
 *
 *   [1] FETCH FAILS: the gradient editor's module request is aborted (what a
 *       stopped dev server or a deploy that replaced the chunk looks like to an
 *       open tab). Opening the Gradient dock tab by a real click shows
 *       "The gradient editor couldn't load.", the root AppErrorBoundary caught
 *       nothing, the crash page is absent, and the renderer is still ticking.
 *   [2] FETCH WORKS: same click on a normal boot loads the editor module and
 *       shows no notice — the wrapper doesn't get in the way of a good load.
 *
 * Wants `npm run dev` on 3400. Boots app-gmt twice under SwiftShader.
 *
 * FALSIFIED 2026-09-25: AutoFeaturePanel put back on plain `React.lazy` →
 * [1] red ("app survived" — the boundary caught "Failed to fetch dynamically
 * imported module", and the crash page was up).
 *
 * Run: `npm run smoke:lazy-fallback`
 */
import { chromium, type Page } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';
const NOTICE = "The gradient editor couldn't load.";
const CRASH = 'Something broke while drawing the app';

let failures = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const browser = await chromium.launch({ args: ['--disable-gpu-sandbox'] });

async function bootAndOpenGradient(blockEditor: boolean): Promise<{ page: Page; pageErrors: string[]; editorLoaded: () => boolean }> {
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    // Watched on the wire: dev mode loads far more modules than the 250-entry
    // resource-timing buffer holds, so performance entries can't be trusted here.
    let editorOk = false;
    page.on('response', (r) => { if (/AdvancedGradientEditor/.test(r.url()) && r.ok()) editorOk = true; });
    if (blockEditor) await page.route('**/*AdvancedGradientEditor*', (route) => route.abort('connectionrefused'));

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('!!(window.__gmtProxy && window.__gmtProxy.isBooted)', null, { timeout: 120000 });
    await page.waitForTimeout(1500); // splash fade

    await page.getByText('Gradient', { exact: true }).first().click();
    await page.waitForTimeout(2000);
    return { page, pageErrors, editorLoaded: () => editorOk };
}

const frameCount = (page: Page) => page.evaluate('window.__gmtProxy ? window.__gmtProxy.frameCount : -1') as Promise<number>;

// ── [1] fetch fails ──────────────────────────────────────────────────────
{
    const { page, pageErrors } = await bootAndOpenGradient(true);
    const boundary = await page.evaluate('window.__lastBoundaryError ? String(window.__lastBoundaryError) : null') as string | null;
    const text = await page.evaluate('document.body.innerText') as string;
    check('[1] app survived — no root-boundary error', boundary === null && !text.includes(CRASH), boundary ?? '');
    check('[1] the notice shows in place of the editor', text.includes(NOTICE));
    const f0 = await frameCount(page);
    await page.mouse.move(700, 450);
    await page.mouse.down(); await page.mouse.move(760, 470, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(1500);
    const f1 = await frameCount(page);
    check('[1] renderer still ticking', f1 > f0, `frames ${f0} → ${f1}`);
    check('[1] no pageerrors', pageErrors.length === 0, pageErrors.join(' | '));
    await page.context().close();
}

// ── [2] fetch works ──────────────────────────────────────────────────────
{
    const { page, pageErrors, editorLoaded } = await bootAndOpenGradient(false);
    const loaded = editorLoaded();
    const text = await page.evaluate('document.body.innerText') as string;
    check('[2] the editor module loaded', loaded);
    check('[2] no notice on a good load', !text.includes(NOTICE));
    check('[2] no crash page, no pageerrors', !text.includes(CRASH) && pageErrors.length === 0, pageErrors.join(' | '));
    await page.context().close();
}

await browser.close();
console.log(failures ? `\nFAIL — ${failures} check(s) failed` : '\nPASS — a failed lazy load degrades to a notice');
process.exit(failures ? 1 : 0);
