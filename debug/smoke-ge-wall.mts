/**
 * smoke:ge-wall — the WALL while a face that does not use it is open (desk; owner, 2026-09-25:
 * "all the faces except mix dont use the selection canvas … dimmed during these modes, and also …
 * a minimize canvas button"). The rules live on `wallIdle` in gradient-explorer/v2/GradientExplorerV2App.tsx.
 * Needs `npm run dev` on 3400 (or ENGINE_URL). Real mouse input, one desktop context.
 *
 *   [1] no face, and the Mix face: no veil, no wall toggle — Mix's wall is its picker;
 *   [2] Curves: the ground is DIM (the veil is up, the toggle is in the wall's toolbar and hit-tests
 *       ABOVE the veil), and a click on a tile under it WAKES the wall and picks nothing (no entry,
 *       the same gradient);
 *   [3] awake, a click on a tile picks (the face stays, refitted), and a press in the tray puts the
 *       wall back to sleep;
 *   [4] a face opens dim even when the last one was left awake (Curves awake → Adjust — through its
 *       tab, which is itself a press in the hero; [8] covers a face reached WITHOUT one);
 *   [5] the toggle HIDES the wall: the ground is invisible, the tool column alone is visible, holds
 *       only the toggle and sits in the ground's bottom-left corner (owner, 2026-09-25); the choice
 *       is written to `gmt.ge.wall-tucked`;
 *   [6] it stays hidden for another such face (Paint), Mix shows the wall again (its picker), and
 *       no face shows it;
 *   [7] it is remembered: after a reload Adjust opens with the wall hidden; the toggle then shows
 *       it AWAKE (you asked to see it) and writes the choice back;
 *   [8] the Image face, opened by a PASTED image with the wall left awake (no press in the hero on
 *       the way, so only the per-face reset can dim it), opens dim; and since it grows from the
 *       card's left edge it pushes the tool column down below itself, where the toggle can be pressed;
 *   [9] a pick under PAINT applies the painting first: two entries (the apply, the pick), and one
 *       Ctrl+Z is the painted gradient — the strokes used to be thrown away with no way back.
 *
 * Falsified 2026-09-25 nine ways, each break reverted after it went red:
 *   F1 the veil never taking clicks (`pointer-events-none` always) → [2] red ("did not dim");
 *   F2 the per-face reset of `wallWake` skipped → [8] red. It first passed GREEN: [4] switches face
 *      by a TAB, which is a press in the hero and dims the wall by itself, so the reset was invisible
 *      there — [8]'s pasted image (a face with no press on the way) was added to reach it;
 *   F3 the pick effect's `commitPaint` removed → [9] red (1 entry, not 2);
 *   F4 the tool column ignoring the tray box → [8] red (toggle under the Image face);
 *   F5 the preference not written → [5] red;
 *   F6 the column's `z-[16]` dropped → [2] red (toggle under the veil);
 *   F7 the hero wrap's re-dim removed → [3] red;
 *   F8 the column's `visible` dropped → [5] red (it vanished with the wall);
 *   F9 the hidden column left at the top → [5] red ("not in the bottom-left corner").
 * The veil's STRENGTH is not asserted — the owner judges it on screen.
 */

import { chromium, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';
import { encodeShare } from '../gradient-explorer/v2/shareUrl';
import type { GradientConfig } from '../types';

const BASE = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';

const fail = (msg: string): never => {
  console.log(`✗ ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};
const ok = (msg: string) => console.log(`✓ ${msg}`);

const blueToRed: GradientConfig = {
  stops: [
    { id: 'a', position: 0, color: '#1030C0', bias: 0.5, interpolation: 'linear' },
    { id: 'b', position: 1, color: '#C01030', bias: 0.5, interpolation: 'linear' },
  ],
  colorSpace: 'srgb',
  blendSpace: 'oklab',
};

const wallState = (page: Page) => page.evaluate(() => document.querySelector('[data-gx-wall]')?.getAttribute('data-gx-wall') ?? null);
const veil = (page: Page) => page.evaluate(() => {
  const v = document.querySelector('[data-gx-wall-veil]') as HTMLElement | null;
  return v ? { up: getComputedStyle(v).pointerEvents !== 'none' } : null;
});
const toggle = (page: Page) => page.evaluate(() => {
  const b = document.querySelector('[data-gx-wall-tuck]') as HTMLElement | null;
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return { pressed: b.getAttribute('aria-pressed') === 'true', reachable: !!hit && b.contains(hit), x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top };
});
const tray = (page: Page) => page.evaluate(() => {
  const t = document.querySelector('[data-gx-tray-root]') as HTMLElement | null;
  return t && !t.hidden ? t.getAttribute('data-gx-tray') : null;
});
const trayBottom = (page: Page) => page.evaluate(() => Math.round((document.querySelector('[data-gx-tray-root]') as HTMLElement).getBoundingClientRect().bottom));
const undoDepth = (page: Page) => page.evaluate(() => (window as any).__store.getState().paramUndoStack.length as number);
const working = (page: Page) => page.evaluate(() => {
  const w = (window as any).__gxWorking?.();
  return w?.config ? { stops: w.config.stops.length as number, ramp: typeof w.config.ramp === 'string', input: JSON.stringify(w.input).slice(0, 400) } : null;
});
const openFace = async (page: Page, face: string) => {
  await page.click(`[data-gx-tray-tab="${face}"]`);
  await page.waitForTimeout(400);
  if ((await tray(page)) !== face) fail(`the ${face} tab did not open its face (${await tray(page)})`);
};
const closeFace = async (page: Page) => {
  for (let i = 0; i < 3 && (await tray(page)); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
};

/** Points on wall TILES clear of the hero and the tray. With `underVeil`, points where the veil is
 *  the top element and a wall canvas lies directly under it; without, points where the canvas is top. */
const wallAims = (page: Page, underVeil: boolean) => page.evaluate((veiled) => {
  const wallEl = document.querySelector('[data-gx-keepselect]')!;
  const r = wallEl.getBoundingClientRect();
  const out: { x: number; y: number }[] = [];
  for (let y = r.y + 14; y < Math.min(r.bottom, window.innerHeight) - 8; y += 29) {
    for (const col of [6, 9, 12, 15]) {
      const x = r.x + 24 + 44 * col;
      if (x > r.right - 12) continue;
      const stack = document.elementsFromPoint(x, y);
      const top = stack[0];
      const under = veiled ? (top?.hasAttribute('data-gx-wall-veil') ? stack[1] : null) : top;
      if (under && under.tagName === 'CANVAS' && !under.closest('[data-gx-hero]') && wallEl.contains(under)) out.push({ x, y });
    }
  }
  return out;
}, underVeil);

/** Pick a gradient the hero is not showing — a real click on an AWAKE wall. A tile that turns out to
 *  BE the working gradient keeps it (the second-click rule): undone and the next tile tried. */
const used = new Set<string>();
const pickAnother = async (page: Page, label: string) => {
  const was = await working(page);
  for (const a of await wallAims(page, false)) {
    const key = `${Math.round(a.x)},${Math.round(a.y)}`;
    if (used.has(key)) continue;
    used.add(key);
    await page.mouse.click(a.x, a.y);
    await page.waitForTimeout(700);
    const now = await working(page);
    if (now && was && now.input !== was.input && now.input.includes('"kind":"gradient"')) return now;
    if (now?.input !== was?.input) {
      await page.mouse.move(640, 20);
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(500);
    }
  }
  return fail(`${label}: setup — no wall tile clear of the tray picked a different gradient`);
};

async function run() {
  const browser = await chromium.launch();
  // Tall enough that the tallest face (Paint) still leaves wall tiles under it.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await seedGeSmokeState(ctx);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log(`  pageerror: ${e.message}`); });
  const boot = async () => {
    await page.goto(`${BASE}?g=${encodeShare(blueToRed, 'Wall smoke')}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('[data-gx-hero] [data-gx-knot-track]', { timeout: 15000 }).catch(() => fail('no hero after opening the share link'));
    await page.waitForSelector('[data-gx-keepselect] canvas', { timeout: 15000 }).catch(() => fail('no wall canvas'));
    await page.waitForTimeout(1200);
  };
  await boot();

  // [1]
  if ((await wallState(page)) !== null || (await veil(page)) || (await toggle(page))) fail('[1] the wall is dimmed or offers its toggle with no face open');
  await openFace(page, 'mix');
  if ((await wallState(page)) !== null || (await veil(page)) || (await toggle(page))) fail('[1] the Mix face dims the wall or offers its toggle — Mix picks from it');
  await closeFace(page);
  ok('[1] no face and Mix: the wall is awake and offers no toggle');

  // [2]
  await openFace(page, 'curves');
  if ((await wallState(page)) !== 'dim' || !(await veil(page))?.up) fail(`[2] Curves did not dim the wall (${await wallState(page)}, ${JSON.stringify(await veil(page))})`);
  const t2 = await toggle(page);
  if (!t2 || !t2.reachable || t2.pressed) fail(`[2] the wall toggle is missing, pressed, or under the veil (${JSON.stringify(t2)})`);
  const aims = await wallAims(page, true);
  if (!aims.length) fail('[2] setup: no wall tile under the veil clear of the tray');
  const depth2 = await undoDepth(page);
  const w2 = await working(page);
  await page.mouse.click(aims[0].x, aims[0].y);
  await page.waitForTimeout(600);
  if ((await undoDepth(page)) !== depth2 || (await working(page))?.input !== w2?.input) fail('[2] a click on the dim wall picked a gradient — it should only wake the wall');
  if ((await wallState(page)) !== null || (await veil(page))?.up) fail(`[2] a click on the dim wall did not wake it (${await wallState(page)})`);
  ok('[2] Curves dims the wall, the toggle sits above the veil, and a click only wakes it');

  // [3]
  await pickAnother(page, '[3]');
  if ((await tray(page)) !== 'curves') fail(`[3] a pick on the awake wall closed Curves (${await tray(page)})`);
  if ((await wallState(page)) !== null) fail('[3] the wall went back to sleep on a pick');
  const tb = (await page.locator('[data-gx-tray-root]').boundingBox())!;
  await page.mouse.click(tb.x + tb.width - 30, tb.y + tb.height - 12);
  await page.waitForTimeout(300);
  if ((await wallState(page)) !== 'dim') fail(`[3] a press in the tray did not dim the wall again (${await wallState(page)})`);
  ok('[3] awake, a click picks (Curves stays); a press in the tray dims the wall again');

  // [4]
  await page.mouse.click(aims[0].x, aims[0].y); // wake
  await page.waitForTimeout(300);
  if ((await wallState(page)) !== null) fail('[4] setup: the wall did not wake');
  await openFace(page, 'adjust');
  if ((await wallState(page)) !== 'dim') fail(`[4] Adjust opened over a wall left awake by Curves (${await wallState(page)})`);
  ok('[4] a new face opens dim, whatever the last one left');

  // [5]
  await page.click('[data-gx-wall-tuck]');
  await page.waitForTimeout(300);
  const hidden5 = await page.evaluate(() => {
    const host = document.querySelector('[data-gx-keepselect]') as HTMLElement;
    const tools = document.querySelector('[data-gx-tools]') as HTMLElement;
    return {
      wall: getComputedStyle(host).visibility,
      tools: getComputedStyle(tools).visibility,
      buttons: Array.from(tools.querySelectorAll('button')).map((b) => b.getAttribute('aria-label')),
      key: localStorage.getItem('gmt.ge.wall-tucked'),
    };
  });
  if ((await wallState(page)) !== 'hidden' || hidden5.wall !== 'hidden') fail(`[5] the toggle did not hide the wall (${await wallState(page)}, ${JSON.stringify(hidden5)})`);
  if (hidden5.tools !== 'visible' || hidden5.buttons.length !== 1 || hidden5.buttons[0] !== 'Show the wall') fail(`[5] the tool column is not the toggle alone (${JSON.stringify(hidden5)})`);
  if (hidden5.key !== '1') fail(`[5] the choice was not remembered (${hidden5.key})`);
  if (!(await toggle(page))?.reachable) fail('[5] the Show the wall button cannot be pressed');
  const corner5 = await page.evaluate(() => {
    const r = (document.querySelector('[data-gx-tools]') as HTMLElement).getBoundingClientRect();
    return { left: Math.round(r.left), gap: Math.round(window.innerHeight - r.bottom) };
  });
  if (corner5.left > 20 || corner5.gap > 24) fail(`[5] the hidden wall's toolbar is not in the bottom-left corner (left ${corner5.left}, ${corner5.gap} px above the bottom)`);
  ok('[5] the toggle hides the wall; the column holds only the way back; the choice is stored');

  // [6]
  await openFace(page, 'paint');
  if ((await wallState(page)) !== 'hidden') fail(`[6] Paint showed the wall again (${await wallState(page)})`);
  await openFace(page, 'mix');
  const mixWall = await page.evaluate(() => getComputedStyle(document.querySelector('[data-gx-keepselect]') as HTMLElement).visibility);
  if ((await wallState(page)) !== null || mixWall !== 'visible' || (await toggle(page))) fail(`[6] Mix did not bring the wall back (${await wallState(page)}, ${mixWall})`);
  await closeFace(page);
  const noneWall = await page.evaluate(() => getComputedStyle(document.querySelector('[data-gx-keepselect]') as HTMLElement).visibility);
  if ((await wallState(page)) !== null || noneWall !== 'visible') fail(`[6] closing the face left the wall hidden (${noneWall})`);
  ok('[6] hidden for every such face; Mix and no face show the wall');

  // [7]
  await boot();
  await openFace(page, 'adjust');
  if ((await wallState(page)) !== 'hidden') fail(`[7] after a reload Adjust opened with the wall ${await wallState(page) ?? 'awake'}, not hidden`);
  await page.click('[data-gx-wall-tuck]');
  await page.waitForTimeout(300);
  const key7 = await page.evaluate(() => localStorage.getItem('gmt.ge.wall-tucked'));
  if ((await wallState(page)) !== null || key7 !== '0') fail(`[7] Show the wall did not bring it back awake and store it (${await wallState(page)}, ${key7})`);
  await closeFace(page);
  ok('[7] the hide survives a reload, and showing the wall brings it back awake');

  // [8] the Image face: an image pasted anywhere opens it (the shell's drop / paste route)
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 200;
    const g = c.getContext('2d')!;
    const lg = g.createLinearGradient(0, 0, 320, 200);
    lg.addColorStop(0, '#203060'); lg.addColorStop(0.5, '#d06020'); lg.addColorStop(1, '#f0e0a0');
    g.fillStyle = lg; g.fillRect(0, 0, 320, 200);
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'wall-smoke.png', { type: 'image/png' }));
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt }));
  });
  await page.waitForFunction(() => document.querySelector('[data-gx-tray-root]')?.getAttribute('data-gx-tray') === 'image', null, { timeout: 8000 })
    .catch(() => fail('[8] setup: a pasted image did not open the Image face'));
  await page.waitForTimeout(800);
  if ((await wallState(page)) !== 'dim') fail(`[8] the Image face opened over a wall left awake (${await wallState(page) ?? 'awake'}) — a face reached without a press in the hero must still open dim`);
  const t8 = await toggle(page);
  const bottom8 = await trayBottom(page);
  if (!t8 || !t8.reachable || t8.top < bottom8) fail(`[8] the tool column is under the Image face (toggle top ${t8?.top}, tray bottom ${bottom8}, reachable ${t8?.reachable})`);
  ok(`[8] a pasted image opens Image dim; the tool column drops below the tray (toggle at ${Math.round(t8!.top)}, tray ends ${bottom8})`);
  await closeFace(page);

  // [9] a pick under PAINT keeps the painting
  await openFace(page, 'paint');
  const bar = (await page.locator('[data-gx-paint-surface]').boundingBox())!;
  const texel = () => page.evaluate(() => {
    const cv = document.querySelector('[data-gx-paint-ramp]') as HTMLCanvasElement | null;
    return cv ? Array.from(cv.getContext('2d')!.getImageData(Math.round(0.28 * 256), 0, 1, 1).data).slice(0, 3) : null;
  });
  const before9 = await texel();
  await page.mouse.move(bar.x + bar.width * 0.2, bar.y + bar.height / 2);
  await page.mouse.down();
  await page.mouse.move(bar.x + bar.width * 0.36, bar.y + bar.height / 2, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const painted9 = await texel();
  const far = (a: number[] | null, b: number[] | null) => !a || !b || Math.max(...a.map((v, k) => Math.abs(v - b[k]))) > 12;
  if (!far(before9, painted9)) fail('[9] setup: the stroke did not paint the bar');
  const depth9 = await undoDepth(page);
  const aims9 = await wallAims(page, true);
  if (!aims9.length) fail('[9] setup: no dim wall tile under the Paint face');
  await page.mouse.click(aims9[0].x, aims9[0].y); // wake
  await page.waitForTimeout(300);
  await pickAnother(page, '[9]');
  if ((await undoDepth(page)) !== depth9 + 2) fail(`[9] a pick under Paint made ${(await undoDepth(page)) - depth9} entries, not two (apply, pick)`);
  await page.mouse.move(640, 20);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  const w9 = await working(page);
  if (!w9 || w9.stops !== 0 || !w9.ramp) fail(`[9] one Ctrl+Z after the pick is not the painted gradient (${JSON.stringify(w9)})`);
  const back9 = await page.evaluate(() => {
    const cv = document.querySelector('[data-gx-paint-ramp]') as HTMLCanvasElement | null;
    return cv ? Array.from(cv.getContext('2d')!.getImageData(Math.round(0.28 * 256), 0, 1, 1).data).slice(0, 3) : null;
  });
  if (far(painted9, back9)) fail(`[9] the bar after Ctrl+Z is not the painting (${painted9} vs ${back9})`);
  ok('[9] a pick under Paint applies the painting first; one Ctrl+Z gives it back');

  if (process.env.WALL_SHOTS) {
    await closeFace(page);
    await openFace(page, 'curves');
    await page.screenshot({ path: `${process.env.WALL_SHOTS}/wall-dim.png` });
    await page.click('[data-gx-wall-tuck]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${process.env.WALL_SHOTS}/wall-hidden.png` });
    await page.click('[data-gx-wall-tuck]');
  }

  if (errors.length) fail(`pageerror during the run: ${errors[0]}`);
  await browser.close();
}

run().then(
  () => { if (!process.exitCode) console.log('\nsmoke:ge-wall green'); },
  (e) => { console.log(e?.message ?? e); process.exitCode = 1; },
).finally(() => process.exit(process.exitCode ?? 0));
