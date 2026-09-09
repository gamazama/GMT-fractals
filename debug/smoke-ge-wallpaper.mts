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
 * registration and the overlay's resolver split (`RegisteredLiveSource` / `HeroLiveSource`).
 *
 * Run (needs `npm run dev` — a FRESH server):
 *   npx tsx debug/smoke-ge-wallpaper.mts
 *
 * ⚠ Vite dual-instance hazard, and this smoke is especially exposed to it: it drives
 * `fullscreenStore` through a bare-URL dynamic import, and ANY edit to that file since the
 * server started makes the app hold a `?t=`-timestamped instance while this import yields a
 * second one — whose `liveSourceHook` is null because the v2 boot registered on the other copy.
 * [1] fails with that exact message. Restart `npm run dev` before believing a red run.
 */
import { chromium } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';
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

  if (errors.length) fail(`page errors:\n  ${errors.join('\n  ')}`);
  console.log('\n✓ ALL PASS — the v2 wallpaper follows the working gradient');
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
