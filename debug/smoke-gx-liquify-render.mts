/**
 * Smoke — the LIQUIFY fullscreen mode renders + deforms end-to-end in a real browser.
 *
 * The CPU soft body is unit-tested by debug/test-liquify-mesh.mts, but the GL path (shader
 * compile, the deformed-mesh draw, the dither tail) and the pointer→mesh→render wiring can only
 * be exercised with a real WebGL2 context. This drives the live Gradient Explorer headlessly:
 * opens fullscreen on a colourful gradient, switches to Liquify, asserts the gradient renders
 * (non-blank, non-uniform), then drags real pointer strokes (push + grab) and toggles physics,
 * asserting the mesh actually changes and nothing throws.
 *
 * Headless GPU is SwiftShader. Run (needs `npm run dev` — a FRESH server; see the
 * dual-instance note below):
 *   ENGINE_URL=http://localhost:3411/gradient-explorer.html npx tsx debug/smoke-gx-liquify-render.mts
 *
 * ⚠ Vite dual-instance hazard: this smoke drives the store via a bare-URL dynamic import.
 * On a LONG-RUNNING dev server whose store module has been HMR-invalidated (any edit to it
 * since the server started), the app's module graph holds a `?t=`-timestamped instance and
 * the bare import yields a SECOND instance — openFullscreen then mutates a store no React
 * tree subscribes to and the overlay never appears. The smoke detects this and says so;
 * the fix is restarting the dev server (or pointing ENGINE_URL at a fresh one).
 *
 * ─── FLAKE HISTORY — READ BEFORE LOWERING ANY TIMEOUT ───────────────────────────
 * Measured 2026-07-29 (cycle 12): 3 failures in 13 consecutive runs on an UNMODIFIED
 * tree, ~23%, at three DIFFERENT assertions — "[1] liquify canvas missing",
 * "[3] grab handle did not change the render", "[4] physics frame went blank". A guard
 * with a 23% false-red rate cannot distinguish a regression from its own noise.
 *
 * The renders themselves were never the problem: every green run produced byte-identical
 * numbers (push Δ 3.77, grab Δ 21.03, physics variety 51), so the variance was entirely
 * in setup and read timing. This file had one-shot fixed waits before every readback and
 * neither of the two hardening mechanisms its healthy sibling debug/smoke-gx-geom-handles.mts
 * carries (13/13 clean in the same measurement). Both are now ported here:
 *   · a dep-optimize retry loop around the first page.evaluate — a fresh Vite can reload
 *     the page mid-evaluate while it optimises deps, which kills the call;
 *   · the dual-instance overlay check, which turns "[1] liquify canvas missing" from a
 *     mystery into a message naming the cause and the fix.
 * And the fixed waits are replaced by polling: wait for the render to CHANGE, then wait
 * for it to SETTLE (two consecutive identical signatures), then assert on the settled
 * value. A regression still fails — the poll simply times out and the same assertion
 * reports — so nothing was narrowed; the guard is just no longer racing the renderer.
 *
 * HONEST LIMIT ON THAT EVIDENCE. After hardening: 10/10 consecutive clean runs, every
 * one reporting the same 3.77 / 21.03 / 51. But the flake was NOT reproduced beforehand
 * on a quiet tree either — 3/3 green before any change — so 10/10 is evidence the guard
 * is stable, not proof the fix is what made it stable. The likeliest reading is that the
 * cycle-12 measurement ran while two other auditors were editing tracked source, and an
 * edit to the store module is exactly what HMR-invalidates it into the dual-instance
 * state whose symptom is "[1] liquify canvas missing" — the first of the three observed
 * failures. That case now fails with a message naming the cause and the fix instead of a
 * bare "canvas missing", which is worth having whether or not it was the whole story.
 * If this goes red again on a QUIET tree, treat it as a real liquify regression.
 */
import { chromium } from 'playwright';
import type { Page } from 'playwright';
import { signature, diff, variety } from './helpers/canvas-signature.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
function fail(msg: string): never { console.error(`✗ ${msg}`); process.exit(1); }

/** Poll `signature` until `pred` holds. Returns the last signature seen — on timeout that
 *  is the failing state, so the CALLER's assertion reports it, not this helper. */
async function waitForSig(page: Page, pred: (s: number[]) => boolean, timeoutMs = 8000): Promise<number[]> {
  const t0 = Date.now();
  let last = await signature(page);
  while (!pred(last) && Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(150);
    last = await signature(page);
  }
  return last;
}

/** Poll until two consecutive signatures are identical (the render has stopped moving).
 *  Returns the last signature seen; on timeout that is simply the latest frame. */
async function settledSig(page: Page, timeoutMs = 8000): Promise<number[]> {
  const t0 = Date.now();
  let prev = await signature(page);
  while (Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(150);
    const cur = await signature(page);
    if (cur.length && cur.length === prev.length && cur.every((v, i) => v === prev[i])) return cur;
    prev = cur;
  }
  return prev;
}

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 900, height: 740 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  // First hit on a fresh Vite can trigger a dep-optimize reload mid-evaluate — retry.
  for (let attempt = 0; ; attempt++) {
    try {
      await page.evaluate(async () => {
        const s = await import('/palette/store/fullscreenStore.ts');
        (s as any).openFullscreen({ colorSpace: 'srgb', blendSpace: 'oklab', stops: [
          { id: 'a', position: 0, color: '#03071e' }, { id: 'b', position: 0.4, color: '#48cae4' },
          { id: 'c', position: 0.7, color: '#ffd60a' }, { id: 'd', position: 1, color: '#e63946' } ] }, 'Liquify smoke');
      });
      break;
    } catch (e) {
      if (attempt >= 3) throw e;
      await page.waitForTimeout(3000);
    }
  }
  await page.waitForTimeout(600);

  // Dual-instance guard: the store said "open" — the overlay must exist, or the page's app
  // is subscribed to a DIFFERENT module instance (stale long-running dev server).
  if (!(await page.locator('[data-testid="fullscreen-gradient-overlay"]').count())) {
    fail('overlay did not open after openFullscreen — likely the Vite dual-instance hazard (HMR-invalidated store on a long-running dev server). RESTART `npm run dev` and re-run.');
  }

  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    (s as any).setFullscreenGeom('liquify');
  });

  // [1] the gradient renders (non-blank, non-uniform). Wait for the first painted frame,
  // then for the render to stop moving, rather than reading at a fixed offset.
  await waitForSig(page, (s) => s.length > 0 && variety(s) >= 6);
  const base = await settledSig(page);
  if (!base.length) fail('liquify canvas missing');
  const v = variety(base);
  if (v < 6) fail(`rendered gradient looks blank/uniform (variety=${v})`);
  console.log(`[1] rendered: ${base.length / 3} samples, colour variety ${v} ✓`);

  // Canvas screen rect — the mesh occupies the centred square; drag inside it.
  const rect = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="fullscreen-gradient-overlay"] canvas') as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  const drag = async (x0: number, y0: number, x1: number, y1: number) => {
    await page.mouse.move(x0, y0); await page.mouse.down();
    for (let s = 1; s <= 8; s++) await page.mouse.move(x0 + (x1 - x0) * s / 8, y0 + (y1 - y0) * s / 8);
    await page.mouse.up();
  };

  // [2] push brush deforms the field
  await page.evaluate(async () => {
    const s = await import('/gradient-explorer/fullscreen/modes/liquify/liquifyStore.ts');
    (s as any).setLiquifyBrush('push'); (s as any).setLiquifyStrength(0.9); (s as any).setLiquifyRadius(0.2);
  });
  await drag(cx - 120, cy, cx + 120, cy - 60);
  await waitForSig(page, (s) => diff(base, s) >= 1);
  const afterPush = await settledSig(page);
  const dPush = diff(base, afterPush);
  if (dPush < 1) fail(`push brush did not change the render (Δ=${dPush.toFixed(2)})`);
  console.log(`[2] push deformed the field (Δ=${dPush.toFixed(2)}) ✓`);

  // [3] grab handle deforms
  await page.evaluate(async () => {
    const s = await import('/gradient-explorer/fullscreen/modes/liquify/liquifyStore.ts');
    (s as any).setLiquifyBrush('grab');
  });
  await drag(cx + 40, cy + 40, cx - 80, cy + 120);
  await waitForSig(page, (s) => diff(afterPush, s) >= 1);
  const afterGrab = await settledSig(page);
  const dGrab = diff(afterPush, afterGrab);
  if (dGrab < 1) fail(`grab handle did not change the render (Δ=${dGrab.toFixed(2)})`);
  console.log(`[3] grab deformed the field (Δ=${dGrab.toFixed(2)}) ✓`);

  // [4] physics jiggle runs without crashing + keeps rendering
  await page.evaluate(async () => {
    const s = await import('/gradient-explorer/fullscreen/modes/liquify/liquifyStore.ts');
    (s as any).setLiquifyPhysics(true); (s as any).setLiquifyBrush('push');
  });
  await drag(cx, cy + 20, cx + 100, cy - 40);
  // Physics keeps the mesh moving, so there is no settled frame to wait for here —
  // poll for a live frame instead. On a real blank-out the poll times out and the
  // same assertion below reports it.
  const afterPhysics = await waitForSig(page, (s) => s.length > 0 && variety(s) >= 6);
  if (variety(afterPhysics) < 6) fail('physics frame went blank');
  console.log(`[4] physics jiggle rendered (variety ${variety(afterPhysics)}) ✓`);

  // [5] reset back to flat (via the Reset button path — store has no reset, use the overlay button)
  if (errors.length) fail(`runtime errors:\n  ${errors.join('\n  ')}`);
  console.log('\n✓ LIQUIFY renders + deforms (push/grab) + physics jiggles, no runtime errors');
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
