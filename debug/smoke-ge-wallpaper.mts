/**
 * GE v2 Wallpaper smoke — the fullscreen preview FOLLOWS the working gradient.
 *
 * The overlay resolves its colour through a host-registered hook
 * (`setFullscreenLiveSource`, `palette/store/fullscreenStore.ts`). The two shells keep their
 * working gradient in different places: the old one in `heroSelection` + the Generator's
 * derivation, v2 in the Working pipeline (`workingStore`, ADR-0111). Before the seam existed
 * the overlay only knew the first pair, so in v2 the wallpaper followed the WALL PICK when
 * there was one and otherwise froze on the snapshot handed to `openFullscreen` — editing the
 * hero with the wallpaper open changed nothing on screen. That is what [2] pins.
 *
 * This is the ONLY guard that reaches `gradient-explorer/v2/registerFeatures.ts`'s live-source
 * registration and the overlay's `RegisteredLiveSource`. (Its `HeroLiveSource` twin, the first
 * shell's resolver, went with that shell at the entry-point swap, 2026-09-16.)
 *
 * [4] (2026-09-24, the polish pass's EW-06): in SPLIT, Escape follows the overlay's own keyboard
 * rule — a press in the app above and then Esc leaves the preview up (the key is the app's), a
 * press in the preview and then Esc closes it. Real mouse presses on control-free points.
 * Falsified that day by restoring the unconditional close in the overlay's Esc listener (grep
 * `split && !pointerInsideRef.current` in FullscreenGradientOverlay.tsx): red "a press in the app
 * (header…) then Esc closed the preview"; green again with it back.
 *
 * Run (needs `npm run dev` — a FRESH server):
 *   npx tsx debug/smoke-ge-wallpaper.mts
 *
 * ⚠ Vite dual-instance hazard, and this smoke is especially exposed to it: it drives
 * `fullscreenStore` through a bare-URL dynamic import, and ANY edit to that file since the
 * server started makes the app hold a `?t=`-timestamped instance while this import yields a
 * second one — whose `liveSourceHook` is null because the v2 boot registered on the other copy.
 * [1] fails with that exact message. Restart `npm run dev` before believing a red run.
 *
 * ⚠⚠ IT IS NOT ONLY [1], and this is the part that cost a session on 2026-09-12. [2] drives
 * `paletteEditorStore` through the same kind of import: on a stale server it sets the config on
 * a copy the app is not rendering, nothing repaints, and the failure reads as a PRODUCT bug —
 * "the wallpaper did not follow the working gradient — it is frozen on the snapshot". It was
 * reported as one, alongside `smoke:gx-spline` [5], which fails the same way for the same
 * reason. **Stashing your changes does not clear it**: the dev server keeps its module graph,
 * so a red run on a clean tree is not evidence of anything. The FIRST thing to do with a red
 * run here is restart the server; both were green on the next run after one.
 */
import { chromium } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
function fail(msg: string): never { console.error(`✗ ${msg}`); process.exit(1); }

const NAVY = [
  { id: 'a', position: 0, color: '#0b1d51' },
  { id: 'b', position: 0.5, color: '#f2a65a' },
  { id: 'c', position: 1, color: '#7a1f4f' },
];
const NEON = [
  { id: 'a', position: 0, color: '#00ff00' },
  { id: 'b', position: 0.5, color: '#ff00ff' },
  { id: 'c', position: 1, color: '#00ffff' },
];

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  await seedGeSmokeState(ctx);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  // The licensed catalogue packs are fetched from the CDN, which allow-lists origins — a dev
  // server on any port but the usual one gets a CORS error that has nothing to do with the
  // wallpaper. Ignored by origin, not by wording, so a real fetch failure still counts.
  const isCatalogCors = (t: string) => t.includes('cdn.gmt-fractals.com') || t.includes('net::ERR_FAILED');
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (isCatalogCors(t)) return;
    errors.push(`console.error: ${t}`);
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // [1] the v2 shell registered a live source at boot.
  const registered = await page.evaluate(async () => {
    const fs = await import('/palette/store/fullscreenStore.ts');
    return !!(fs as any).getFullscreenLiveSource();
  });
  if (!registered) {
    fail('no live-gradient source registered — either v2/registerFeatures.ts stopped calling '
      + 'setFullscreenLiveSource, or this is the Vite dual-instance hazard (restart `npm run dev`)');
  }
  console.log('[1] the v2 shell registers a live gradient source ✓');

  // Drive the working gradient the way the shell does, open the wallpaper on it, and sample.
  const sample = async (stops: unknown): Promise<string> =>
    page.evaluate(async (s) => {
      const pe = await import('/palette/store/paletteEditorStore.ts');
      if (s) {
        (pe as any).usePaletteEditorStore.getState().setConfig({
          colorSpace: 'srgb', blendSpace: 'oklab', stops: s,
        });
      }
      await new Promise((r) => setTimeout(r, 1200));
      const canvas = document.querySelector('[data-testid="fullscreen-gradient-overlay"] canvas') as HTMLCanvasElement | null;
      if (!canvas) return 'NO_CANVAS';
      const c = document.createElement('canvas');
      c.width = 8; c.height = 1;
      const cx = c.getContext('2d')!;
      cx.drawImage(canvas, 0, 0, 8, 1);
      return Array.from(cx.getImageData(0, 0, 8, 1).data).join(',');
    }, stops as never);

  await page.evaluate(async (stops) => {
    const fs = await import('/palette/store/fullscreenStore.ts');
    const ws = await import('/palette/store/workingStore.ts');
    const pe = await import('/palette/store/paletteEditorStore.ts');
    (pe as any).usePaletteEditorStore.getState().setConfig({ colorSpace: 'srgb', blendSpace: 'oklab', stops });
    (ws as any).useWorkingStore.setState({ input: { kind: 'stops' }, name: 'Wallpaper smoke' });
    await new Promise((r) => setTimeout(r, 300));
    const d = (ws as any).deriveWorkingNow();
    (fs as any).openFullscreen(d.config, d.name);
    (fs as any).setFullscreenGeom('linear');
  }, NAVY as never);
  await page.waitForTimeout(1200);

  if (!(await page.locator('[data-testid="fullscreen-gradient-overlay"]').count())) {
    fail('overlay did not open after openFullscreen — likely the Vite dual-instance hazard '
      + '(HMR-invalidated fullscreenStore on a long-running dev server). RESTART `npm run dev`.');
  }

  // [2] editing the WORKING gradient with the wallpaper open repaints it.
  const before = await sample(null);
  if (before === 'NO_CANVAS') fail('no canvas inside the open overlay');
  const after = await sample(NEON);
  if (after === before) {
    fail('the wallpaper did not follow the working gradient — it is frozen on the snapshot '
      + `openFullscreen was given (both samples ${before})`);
  }
  console.log(`[2] the wallpaper follows the working gradient ✓ (${before.slice(0, 15)}… → ${after.slice(0, 15)}…)`);

  // [3] the resolver reports null for an EMPTY input rather than blanking the wallpaper —
  // the overlay must fall back to its snapshot, not to nothing.
  const stillPainted = await page.evaluate(async () => {
    const ws = await import('/palette/store/workingStore.ts');
    (ws as any).useWorkingStore.setState({ input: { kind: 'extract' } }); // no image ⇒ empty
    await new Promise((r) => setTimeout(r, 1000));
    const canvas = document.querySelector('[data-testid="fullscreen-gradient-overlay"] canvas') as HTMLCanvasElement | null;
    if (!canvas) return false;
    const c = document.createElement('canvas');
    c.width = 8; c.height = 1;
    const cx = c.getContext('2d')!;
    cx.drawImage(canvas, 0, 0, 8, 1);
    const d = cx.getImageData(0, 0, 8, 1).data;
    // "still painted" = not a uniform flat frame
    for (let i = 4; i < d.length; i += 4) if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2]) return true;
    return false;
  });
  if (!stillPainted) fail('an empty working input blanked the wallpaper instead of leaving the last gradient up');
  console.log('[3] an empty input leaves the wallpaper painted (falls back, never blanks) ✓');

  // [4] ESC IN SPLIT FOLLOWS THE POINTER (2026-09-24, EW-06). With Split on, the app above is
  // meant to be used, and every other key already went to it after a pointer-down there — but
  // Escape closed the preview from anywhere, so the app's own Esc (a tray face, an armed slot, a
  // wall selection) closed the preview docked on purpose instead. Now: a press in the APP then
  // Esc leaves the overlay open; a press in the PREVIEW then Esc closes it. Both halves, so a
  // fix that simply stopped Esc closing the overlay cannot pass. Real mouse presses on points
  // that hold no control (found with elementFromPoint), so the press itself changes nothing.
  const OVERLAY = '[data-testid="fullscreen-gradient-overlay"]';
  await page.locator(`${OVERLAY} button[title^="Split"]`).click();
  await page.waitForTimeout(500);
  const blankPoint = (where: 'app' | 'preview') =>
    page.evaluate((w) => {
      const ov = document.querySelector('[data-testid="fullscreen-gradient-overlay"]') as HTMLElement | null;
      if (!ov) return null;
      const r = ov.getBoundingClientRect();
      const CONTROL = 'button, a, input, select, textarea, label, canvas, svg, [role], [tabindex], [draggable="true"], [contenteditable]';
      // the app: everything above the docked preview; the preview: its toolbar band
      const y0 = w === 'app' ? 8 : r.top + 16;
      const y1 = w === 'app' ? r.top - 24 : r.top + 64;
      for (let y = y0; y < y1; y += 12) {
        for (let x = 24; x < innerWidth - 24; x += 24) {
          const el = document.elementFromPoint(x, y);
          if (!el || el.closest(CONTROL)) continue;
          if (w === 'app' ? ov.contains(el) : !ov.contains(el)) continue;
          return { x, y, what: `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}` };
        }
      }
      return null;
    }, where);
  const splitOn = () =>
    page.evaluate(async () => {
      const fs = await import('/palette/store/fullscreenStore.ts');
      return !!(fs as any).getFullscreenState?.().split;
    }).catch(() => null);
  const inApp = await blankPoint('app');
  if (!inApp) fail('[4] setup: no control-free point in the app above the split preview to press on');
  await page.mouse.click(inApp!.x, inApp!.y);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  if (!(await page.locator(OVERLAY).count())) {
    fail(`[4] with Split on, a press in the app (${inApp!.what} at ${inApp!.x},${inApp!.y}) then Esc closed the preview — Esc must be the app's there, as every other key is`);
  }
  const inPreview = await blankPoint('preview');
  if (!inPreview) fail('[4] setup: no control-free point in the split preview\'s toolbar to press on');
  await page.mouse.click(inPreview!.x, inPreview!.y);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  if (await page.locator(OVERLAY).count()) {
    fail(`[4] with Split on, a press in the preview (${inPreview!.what}) then Esc left it open (split ${await splitOn()}) — Esc must still close it from there`);
  }
  console.log(`[4] in Split, Esc after a press in the app (${inApp!.what}) leaves the preview up; after a press in the preview (${inPreview!.what}) it closes ✓`);

  if (errors.length) fail(`page errors:\n  ${errors.join('\n  ')}`);
  console.log('\n✓ ALL PASS — the v2 wallpaper follows the working gradient');
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
