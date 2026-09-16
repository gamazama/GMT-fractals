/**
 * smoke-gmt-gradientdrop — a gradient FILE given to app-gmt's SCENE loader imports into My Gradients,
 * and a scene still loads exactly as before (ADR-0123 Decision 3; closes the plan's open item "a
 * gradient PNG dropped on app-gmt's SCENE loader toasts 'Couldn't read a scene'"). The browser half
 * of `palette/installGradientFileClaim.ts` + `engine/plugins/SceneFileClaims.ts`: the decision
 * itself is node-tested (`npm run test:gradient-file` [9], the seam `npm run test:scene-file-claims`).
 *
 *   [1] a GX gradient PNG (with its `gmt-gradients` metadata) dropped on the window, with the My
 *       Gradients panel CLOSED: the shelf gains that gradient under its own name, the toast says
 *       "Imported 1 gradient", no scene-load toast or "Couldn't read a scene" appears, and the panel
 *       is open afterwards (the reveal);
 *   [2] the same kind of PNG with its text chunks stripped imports too (the band layout);
 *   [3] a .zip of two .map files imports both;
 *   [4] one drop of a gradient PNG AND a real scene PNG does both: the gradient is imported and the
 *       scene loads;
 *   [5] a real GMT scene PNG (SceneData carrying this page's own preset) still loads —
 *       `Loaded "…"` — and the shelf does not grow;
 *   [6] a PNG with no metadata that is not a gradient still says "Couldn't read a scene" (today's
 *       message), and a .jpg still gets today's "has no embedded scene" nudge;
 *   [7] File ▸ Load Scene, through the REAL file chooser, given a `.gmt-gradients.json`: the shelf
 *       gains it and no scene loads.
 *
 * WHAT THIS PROVES AND DOES NOT. The drops are SYNTHETIC: a `DragEvent('drop')` carrying a
 * `DataTransfer` built in the page, dispatched on `<body>`. That proves the window listener, the
 * claim, the import, the toast and the reveal. It does not prove what an OS drag delivers (MIME
 * type, the dragenter/dragover sequence, the overlay) — the same limit as
 * `smoke:statelibrary-drop`. Step [7] uses Playwright's file chooser, which is the real `<input>`.
 *
 * FALSIFIED 2026-09-16, each reverted:
 *   - `installGradientFileClaim()` not called in `app-gmt/main.tsx` → red [1] (the shelf does not
 *     grow, "Couldn't read a scene" shows);
 *   - `SceneFileDropZone` not awaiting `claimSceneFiles` (back to `files[0]` straight to the scene
 *     loader) → red [1];
 *   - SceneIO's Load Scene not consulting the claims → red [7];
 *   - the claim not revealing the panel → red [1] "panel open".
 *
 * Wants `npm run dev` on port 3400 (it boots app-gmt, SwiftShader in headless Chromium, so allow a
 * minute). No bare-URL module imports, so an edited store module does not put it in the
 * dual-instance state.
 *
 * Run: `npm run smoke:gmt-gradientdrop`.
 */
import { chromium, type Page } from 'playwright';
import { zipSync, strToU8 } from 'fflate';
import { writeGradientPng } from '../palette/core/gradientPng';
import { encodeGradientDocument } from '../palette/core/gradientDocument';
import { encodePng, stripPngText } from '../utils/pngCodec';
import type { GradientConfig } from '../types';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';

let failures = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const cfg = (hexes: string[]): GradientConfig => ({
  stops: hexes.map((color, i) => ({ id: `s${i}`, position: i / (hexes.length - 1), color, bias: 0.5, interpolation: 'linear' as const })),
  colorSpace: 'srgb',
  blendSpace: 'oklab',
});
const b64 = (u: Uint8Array): string => Buffer.from(u).toString('base64');

// Distinct gradients so nothing dedupes against the seeded presets or each other.
const GRAD_PNG = writeGradientPng([{ name: 'Smoke Drop Teal', config: cfg(['#0B3D4F', '#2A9D8F', '#E9C46A', '#E76F51']) }]);
const GRAD_STRIPPED = stripPngText(writeGradientPng([{ name: 'ignored', config: cfg(['#1B0A3A', '#B8336A', '#F6AE2D']) }]))!;
const GRAD_BOTH = writeGradientPng([{ name: 'Smoke Beside Scene', config: cfg(['#123456', '#abcdef', '#fedcba']) }]);
const ZIP = zipSync({
  'Smoke Zip A.map': strToU8('0 0 0\n200 10 10\n10 200 10\n250 250 250\n'),
  'Smoke Zip B.map': strToU8('5 5 60\n60 5 5\n5 60 5\n90 90 10\n'),
});
const PICKED_JSON = JSON.stringify(encodeGradientDocument([{ name: 'Smoke Picked', config: cfg(['#300030', '#f0a000']) }]));
const noise = new Uint8Array(64 * 64 * 3);
for (let i = 0; i < noise.length; i++) noise[i] = (i * 7919) % 251;
const PHOTO = encodePng(64, 64, noise);

const HELPERS = `(() => {
  window.__gdBytes = function (s) { var bin = atob(s); var u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  window.__gdDrop = function (files) {
    var dt = new DataTransfer();
    files.forEach(function (f) { dt.items.add(new File([window.__gdBytes(f.b64)], f.name, { type: f.type })); });
    document.body.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    return true;
  };
  window.__gdNames = function () { try { return JSON.parse(localStorage.getItem('gmt.favients') || '[]').map(function (f) { return f.name; }); } catch (e) { return []; } };
  window.__gdToasts = function () { return Array.prototype.map.call(document.querySelectorAll('button[title="Dismiss"]'), function (b) { return b.textContent || ''; }).join(' | '); };
  window.__gdClearToasts = function () { Array.prototype.forEach.call(document.querySelectorAll('button[title="Dismiss"]'), function (b) { b.click(); }); return true; };
  window.__gdPanelOpen = function () { var p = (window.__store.getState().panels || {})['Favients']; return !!(p && p.isOpen); };
  // Count scene loads: every scene entrance calls the store's loadScene at call time.
  if (!window.__gdSpied) {
    var orig = window.__store.getState().loadScene;
    window.__gdLoads = 0;
    window.__store.setState({ loadScene: function (a) { window.__gdLoads++; return orig(a); } });
    window.__gdSpied = true;
  }
  return true;
})()`;

type Dropped = { name: string; type: string; b64: string };
const names = (page: Page) => page.evaluate('window.__gdNames()') as Promise<string[]>;
const toasts = (page: Page) => page.evaluate('window.__gdToasts()') as Promise<string>;
const loads = (page: Page) => page.evaluate('window.__gdLoads') as Promise<number>;
const drop = async (page: Page, files: Dropped[]) => {
  await page.evaluate('window.__gdClearToasts()');
  await page.waitForTimeout(150);
  await page.evaluate(`window.__gdDrop(${JSON.stringify(files)})`);
};
/** Wait until the toasts mention `text` (or time out), then return what they say. */
const toastWith = async (page: Page, text: string, ms = 6000): Promise<string> => {
  await page.waitForFunction(`window.__gdToasts().indexOf(${JSON.stringify(text)}) >= 0`, null, { timeout: ms }).catch(() => {});
  return toasts(page);
};

async function main() {
  const browser = await chromium.launch({ args: ['--disable-gpu-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: false });
  // No HMR: the Vite socket is answered by a mock that never delivers an update. The tree is often
  // edited by other work while this runs, and one full reload mid-run wipes the helpers, the spy
  // and the shelf state, which reads as a failure of whatever step was running. The page keeps the
  // modules it booted with.
  await ctx.routeWebSocket(/./, () => {});
  const page = await ctx.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  let navigations = 0;
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) navigations++; });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('!!window.__store', null, { timeout: 90000 });
  // The drop zone and the File menu mount once the loading screen is gone.
  await page.waitForSelector('[aria-label="File"]', { timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.evaluate(HELPERS);
  const bootNavigations = navigations;

  // ── [1] a GX gradient PNG, panel closed ─────────────────────────────────
  await page.evaluate(`window.__store.getState().togglePanel('Favients', false)`);
  await page.waitForTimeout(300);
  const panelClosed = !(await page.evaluate('window.__gdPanelOpen()'));
  const before1 = await names(page);
  const loads0 = await loads(page);
  await drop(page, [{ name: 'Smoke Drop Teal.png', type: 'image/png', b64: b64(GRAD_PNG) }]);
  const t1 = await toastWith(page, 'Imported');
  const after1 = await names(page);
  check('[1] a GX gradient PNG dropped on GMT lands on the shelf under its own name',
    after1.length === before1.length + 1 && after1.includes('Smoke Drop Teal'), `${before1.length} → ${after1.length}`);
  check('[1] the toast says it imported, and nothing says scene', /Imported 1 gradient/.test(t1) && !/Couldn't read a scene|Loaded "/.test(t1), t1);
  check('[1] the My Gradients panel, closed before the drop, is open after it (the reveal)',
    panelClosed && (await page.evaluate('window.__gdPanelOpen()')) === true, `closed before: ${panelClosed}`);

  // ── [2] the stripped copy ───────────────────────────────────────────────
  const before2 = await names(page);
  await drop(page, [{ name: 'Smoke_Stripped.png', type: 'image/png', b64: b64(GRAD_STRIPPED) }]);
  const t2 = await toastWith(page, 'Imported');
  const after2 = await names(page);
  check('[2] a metadata-stripped gradient PNG imports (band layout), named from the file',
    after2.length === before2.length + 1 && after2.includes('Smoke Stripped') && !/Couldn't read a scene/.test(t2), `${before2.length} → ${after2.length}; ${t2}`);

  // ── [3] a set .zip ──────────────────────────────────────────────────────
  const before3 = await names(page);
  await drop(page, [{ name: 'Smoke Set.zip', type: 'application/zip', b64: b64(ZIP) }]);
  const t3 = await toastWith(page, 'Imported');
  const after3 = await names(page);
  check('[3] a .zip of two .map files imports both',
    after3.length === before3.length + 2 && after3.includes('Smoke Zip A') && after3.includes('Smoke Zip B') && !/Can't load/.test(t3), `${before3.length} → ${after3.length}; ${t3}`);
  const loads3 = await loads(page);
  check('[1]–[3] no gradient drop reached the scene loader', loads3 === loads0, `loadScene calls ${loads0} → ${loads3}`);

  // A real scene PNG: this page's own preset in the SceneData chunk, as a snapshot carries it.
  const presetJson = (await page.evaluate('JSON.stringify(window.__store.getState().getPreset({ includeScene: true }))')) as string;
  const SCENE_PNG = encodePng(64, 36, new Uint8Array(64 * 36 * 3).fill(30), { text: [{ keyword: 'SceneData', text: presetJson }] });

  // ── [4] a gradient PNG and a scene PNG in one drop ──────────────────────
  const before4 = await names(page);
  const loads4 = await loads(page);
  await drop(page, [
    { name: 'Smoke Beside Scene.png', type: 'image/png', b64: b64(GRAD_BOTH) },
    { name: 'Smoke Scene A.png', type: 'image/png', b64: b64(SCENE_PNG) },
  ]);
  const t4 = await toastWith(page, 'Loaded "Smoke Scene A.png"');
  const after4 = await names(page);
  check('[4] one drop of a gradient PNG and a scene PNG imports the gradient AND loads the scene',
    after4.length === before4.length + 1 && after4.includes('Smoke Beside Scene') && t4.includes('Loaded "Smoke Scene A.png"') && /Imported 1 gradient/.test(t4) && (await loads(page)) === loads4 + 1, `${before4.length} → ${after4.length}; loadScene +${(await loads(page)) - loads4}; ${t4}`);

  // ── [5] a scene PNG alone ───────────────────────────────────────────────
  await page.waitForTimeout(1500);
  const before5 = await names(page);
  await drop(page, [{ name: 'Smoke Scene B.png', type: 'image/png', b64: b64(SCENE_PNG) }]);
  const t5 = await toastWith(page, 'Loaded "Smoke Scene B.png"');
  const after5 = await names(page);
  check('[5] a GMT scene PNG still loads as a scene, and the shelf does not grow',
    t5.includes('Loaded "Smoke Scene B.png"') && !/Imported|gradient/.test(t5) && after5.length === before5.length, `${before5.length} → ${after5.length}; ${t5}`);

  // ── [6] not a gradient, not a scene ─────────────────────────────────────
  const before6 = await names(page);
  const loads6 = await loads(page);
  await drop(page, [{ name: 'Smoke Photo.png', type: 'image/png', b64: b64(PHOTO) }]);
  const t6 = await toastWith(page, "Couldn't read a scene");
  check('[6] a plain PNG still says "Couldn\'t read a scene" and adds nothing',
    t6.includes(`Couldn't read a scene from "Smoke Photo.png"`) && (await names(page)).length === before6.length && (await loads(page)) === loads6, t6);
  await drop(page, [{ name: 'Smoke Photo.jpg', type: 'image/jpeg', b64: b64(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])) }]);
  const t6b = await toastWith(page, 'has no embedded scene');
  check('[6] a .jpg still gets the "has no embedded scene" nudge', t6b.includes('"Smoke Photo.jpg" has no embedded scene'), t6b);

  // ── [7] File ▸ Load Scene, real file chooser ────────────────────────────
  const loadViaMenu = async (file: { name: string; mimeType: string; buffer: Buffer }) => {
    await page.evaluate('window.__gdClearToasts()');
    await page.locator('[aria-label="File"]').first().click();
    const item = page.locator('button', { hasText: /^Load Scene/ }).first();
    await item.waitFor({ state: 'visible', timeout: 5000 });
    const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }), item.click()]);
    await chooser.setFiles(file);
  };
  const before7 = await names(page);
  const loads7 = await loads(page);
  await loadViaMenu({ name: 'Smoke Picked.gmt-gradients.json', mimeType: 'application/json', buffer: Buffer.from(PICKED_JSON) });
  const t7 = await toastWith(page, 'Imported');
  await page.waitForTimeout(800);
  const after7 = await names(page);
  check('[7] File ▸ Load Scene given a .gmt-gradients.json imports it and loads no scene',
    after7.length === before7.length + 1 && after7.includes('Smoke Picked') && (await loads(page)) === loads7, `${before7.length} → ${after7.length}; loadScene +${(await loads(page)) - loads7}; ${t7}`);
  await page.waitForTimeout(1200);
  const before7b = await names(page);
  const loads7b = await loads(page);
  await loadViaMenu({ name: 'Smoke Scene C.png', mimeType: 'image/png', buffer: Buffer.from(SCENE_PNG) });
  await page.waitForFunction(`window.__gdLoads > ${loads7b}`, null, { timeout: 8000 }).catch(() => {});
  check('[7] File ▸ Load Scene given a GMT scene PNG still loads it as a scene, and the shelf does not grow',
    (await loads(page)) === loads7b + 1 && (await names(page)).length === before7b.length, `loadScene +${(await loads(page)) - loads7b}`);

  check('no pageerror', pageErrors.length === 0, pageErrors.join(' | '));
  check('the page did not reload mid-run (a reload would make every step above meaningless)', navigations === bootNavigations,
    `${navigations - bootNavigations} reload(s) — if HMR is not blocked, restart the run on a quiet tree`);
  await browser.close();
  if (failures) {
    console.error(`\n${failures} gradient-drop case(s) failed`);
    process.exit(1);
  }
  console.log('\nAll gradient-drop cases passed');
}

main().catch((e) => { console.error('SMOKE FAILED:', e.message); process.exit(1); });
