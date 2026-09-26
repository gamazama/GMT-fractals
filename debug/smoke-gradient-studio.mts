/**
 * smoke:gradient-studio — GMT's GRADIENT STUDIO wired (2026-09-26): the popout beside a gradient
 * editor's ★ opens a floating window on that param, and its Curves / Adjust / Paint faces (the
 * Gradient Explorer's, shared from `palette/`) preview on the fractal WITHOUT writing the param, then
 * bake as one undo entry on Apply, on leaving the face and on closing the window.
 *
 * Needs `npm run dev` on 3400 (or ENGINE_URL, e.g. http://localhost:3401/app-gmt.html). Boots
 * app-gmt, HMR blocked. Dials and curves are set through their stores (deterministic); the popout,
 * the face tabs, Apply, Esc, the window's ✕ and the paint stroke are real mouse / key input. Since the
 * Explorer-look rework (same day) the Studio is the Explorer's hero + tray: the tabs are `FaceTabs`
 * (`data-gx-tray-tab`) in the bar's row, Paint holds the bar itself (`stripTakeover`), and [1b] checks
 * that a selected stop opens the inspector in the tray.
 *
 *   [1] the popout sits in the Layer 1 editor's header; a click opens the Studio on "Coloring · Layer 1"
 *       with the popout lit, and the Studio's own editor has no popout
 *   [2] Adjust: a dial off the identity previews — the param's uniform is sent a texture while the
 *       param is untouched and NO undo entry is made by the preview
 *   [2b] the SIDEBAR's Layer 1 editor shows that preview too — its bar recoloured, its knots stale —
 *       and drops it when the dials rest (`components/gradient/gradientParamPreview.ts`)
 *   [3] Adjust ▸ Apply is ONE entry: the param changes (keeps stops, keeps its 'linear' colour
 *       space) and the dials reset; one Ctrl+Z gives back the gradient AND the dial
 *   [4] Esc cancels Adjust: the dials reset, the param untouched, the face back on Stops
 *   [5] Curves opens fitted with NO undo entry; leaving it untouched adds none and changes nothing
 *   [6] Curves edited, then Stops: ONE entry that writes the curved gradient; Ctrl+Z restores it
 *   [7] Paint: a stroke changes nothing stored; Apply is ONE entry holding a RAMP
 *   [8] the window's ✕ with a live dial bakes it (one entry) and the window closes
 *   [10] (before [8]) no window title bar: the hero's name row drags the window, the side edges
 *       resize its width (the left one moving its x), a tray that would land below the viewport
 *       scrolls inside the window instead of moving it up, and a move to a dock is refused
 *   [9] no pageerror, no error-boundary fallback
 *
 * Falsified 2026-09-26 five ways against a live server, each reverted (green 11/11 before and after):
 *   F1 `previewGradient` sends nothing for a preview → [2] red ("sent +0").
 *   F2 `bakeStudio`'s write + resets run without their `paramGroup` → [3], [6] and [8] red (no entry
 *      at all — the setter alone never makes one), 8 failures.
 *   F3 `enterCurves` fits inside `paramEdit` → [5] red ("entries +1 / +1": a look costs an entry).
 *   F4 the close watcher does not call `closeGradientStudio` → [8] red ("entries +0, chroma 0.3").
 *   F5 the panel WRITES the preview to the param instead of sending it → [2] red ("sent +53" —
 *      every write re-derived and re-sent), and the run stalls at [3].
 *   F6 `previewGradient` without its `setGradientParamPreview` → [2b] red (the sidebar bar kept its
 *      stored colour, "stale false" — the owner's report: it only updated when the Studio closed).
 * [10] (the bare-chrome window, same day) falsified three ways, each reverted:
 *   G1 the edge grips without `z-20` (under the card, which carries its own z) → the resize step
 *      red ("w … → 760 → 760": the left grip never took the press).
 *   G2 no `autoHeight` height cap (the old 90vh) → the off-screen step red ("scrolls false,
 *      inside false"); G2b the cap AND the old height-based clamp → red with the owner's bug
 *      reproduced exactly: the nudge pushed the window from y 630 to 347.
 *   G3 `movePanel` without the bare-chrome refusal → "it never docks" red (and [8], since a docked
 *      Studio has no card ✕ to press).
 * ⚠ G3 edits a STORE file: restart the dev server before and after, or this smoke reads a second
 *   module instance and goes red at [5] whatever changed (the palette rule's dual-instance warning).
 */

import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';

let failures = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
};

/** A module as the PAGE loaded it (a bare import would be a second instance — see smoke-ge-wave). */
const WM = `window.__wm = function (p) {
  var hit = performance.getEntriesByType('resource').map(function (e) { return e.name; }).filter(function (n) { return n.indexOf(p) >= 0; });
  return import(hit.length ? hit[hit.length - 1] : p);
}; true`;

const GRADIENT = {
  stops: [
    { id: 'a', position: 0, color: '#10204a', bias: 0.5, interpolation: 'linear' },
    { id: 'b', position: 0.35, color: '#e0562b', bias: 0.5, interpolation: 'linear' },
    { id: 'c', position: 0.7, color: '#f5d76e', bias: 0.5, interpolation: 'linear' },
    { id: 'd', position: 1, color: '#2a9d8f', bias: 0.5, interpolation: 'linear' },
  ],
  colorSpace: 'linear',
  blendSpace: 'oklab',
};

async function main() {
  const browser = await chromium.launch({ args: ['--disable-gpu-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 } });
  await ctx.routeWebSocket(/./, () => {});
  const page = await ctx.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('!!window.__store', null, { timeout: 90000 });
  await page.waitForSelector('[aria-label="File"]', { timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.evaluate(WM);

  const undo = () => page.evaluate('window.__store.getState().paramUndoStack.length') as Promise<number>;
  const grad = () => page.evaluate('JSON.stringify(window.__store.getState().coloring.gradient)') as Promise<string>;
  const gen = (k: string) => page.evaluate(`window.__store.getState().paletteGenerator.${k}`) as Promise<number>;
  // the open face as the Studio reports it ('stops' = no face); a face opens by its tab in the bar's
  // control row (the Explorer's FaceTabs), and the open tab clicked again closes it
  const face = () => page.evaluate(`document.querySelector('[data-gradient-studio]').dataset.gradientStudioOpen`) as Promise<string | null>;
  const clickFace = async (f: string) => {
    const cur = await face();
    const tab = f === 'stops' ? cur : f;
    if (tab && tab !== 'stops' && tab !== cur || f === 'stops' && cur !== 'stops') await page.click(`[data-gradient-studio] [data-gx-tray-tab="${tab}"]`);
    await page.waitForTimeout(400);
  };
  // spy the param's uniform: every texture sent to uGradientTexture is counted
  await page.evaluate(`window.__wm('/engine/FractalEvents.ts').then(function (m) { window.__gsSent = 0; m.FractalEvents.on('uniform', function (d) { if (d && d.key === 'uGradientTexture') window.__gsSent++; }); })`);
  const sent = () => page.evaluate('window.__gsSent') as Promise<number>;

  // a known gradient on Layer 1, then the Gradient tab
  await page.evaluate(`window.__store.getState().setColoring({ gradient: ${JSON.stringify(GRADIENT)} })`);
  await page.evaluate(`window.__store.getState().setActiveTab('Gradient')`);
  await page.waitForSelector('[data-gradient-studio-popout]', { timeout: 15000 });

  // ── [1] the popout ──────────────────────────────────────────────────────
  await page.click('[data-gradient-studio-popout]');
  await page.waitForSelector('[data-gradient-studio]', { timeout: 15000 });
  await page.waitForTimeout(600);
  const label = (await page.textContent('[data-gradient-studio-target]')) ?? '';
  const insidePopouts = await page.evaluate(`document.querySelectorAll('[data-gradient-studio] [data-gradient-studio-popout]').length`);
  const lit = await page.evaluate(`/accent/.test(document.querySelector('[data-gradient-studio-popout]').className)`);
  check('[1] the popout opens the Studio on Coloring · Layer 1, lit, with no popout inside it',
    label === 'Coloring · Layer 1' && insidePopouts === 0 && lit === true && (await face()) === 'stops', `label "${label}", inner popouts ${insidePopouts}, lit ${lit}`);

  // ── [1b] the stop inspector is a tray face ─────────────────────────────
  const knot = await page.$('[data-gradient-studio] [data-gx-knot]');
  if (knot) await knot.click();
  await page.waitForTimeout(400);
  const trayNow = await page.evaluate(`(document.querySelector('[data-gradient-studio] [data-gx-tray-root]') || {}).dataset?.gxTray || null`);
  check('[1b] a selected stop opens the inspector in the tray', !!knot && trayNow === 'inspector', `knot ${!!knot}, tray ${trayNow}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // ── [2] Adjust previews ─────────────────────────────────────────────────
  await clickFace('adjust');
  const g0 = await grad();
  const u0 = await undo();
  const s0 = await sent();
  await page.evaluate(`window.__store.getState().setPaletteGenerator({ hueRotate: 110 })`);
  await page.waitForTimeout(500);
  check('[2] a dial previews: a texture is sent, the param is untouched, no entry',
    (await sent()) > s0 && (await grad()) === g0 && (await undo()) === u0, `sent +${(await sent()) - s0}, entries +${(await undo()) - u0}`);

  // ── [2b] the sidebar's own editor shows the preview too ─────────────────
  // the Layer 1 editor OUTSIDE the Studio: its bar paints what the fractal shows, and its knots read
  // as the gradient underneath (the editor's knots-stale state) until the bake
  const sidebar = `(function () {
    var tracks = Array.prototype.filter.call(document.querySelectorAll('[data-gx-knot-track]'), function (t) { return !t.closest('[data-gradient-studio]'); });
    var t = tracks[0]; if (!t) return null;
    var root = t.parentElement; while (root && !root.querySelector('canvas[data-gx-ramp]')) root = root.parentElement;
    var c = root && root.querySelector('canvas[data-gx-ramp]');
    var px = null;
    if (c) { var x = c.getContext('2d').getImageData(Math.round(c.width * 0.35), 0, 1, 1).data; px = [x[0], x[1], x[2]].join(','); }
    return { stale: t.hasAttribute('data-gx-knots-stale'), px: px };
  })()`;
  const side = await page.evaluate(sidebar) as { stale: boolean; px: string } | null;
  await page.evaluate(`window.__store.getState().setPaletteGenerator({ hueRotate: 0 })`);
  await page.waitForTimeout(400);
  const sideOff = await page.evaluate(sidebar) as { stale: boolean; px: string } | null;
  await page.evaluate(`window.__store.getState().setPaletteGenerator({ hueRotate: 110 })`);
  await page.waitForTimeout(400);
  check('[2b] the sidebar editor shows the live preview (bar recoloured, knots stale), and not once the dials rest',
    !!side && side.stale && !!sideOff && !sideOff.stale && side.px !== sideOff.px, `live ${JSON.stringify(side)}, at rest ${JSON.stringify(sideOff)}`);

  // ── [3] Apply is one entry; Ctrl+Z gives both back ──────────────────────
  await page.click('[data-gx-adjust-apply]');
  await page.waitForTimeout(500);
  const applied = JSON.parse(await grad());
  const u1 = await undo();
  check('[3] Apply bakes ONE entry: stops kept, colour space kept, dials reset',
    u1 === u0 + 1 && applied.stops.length >= 2 && applied.colorSpace === 'linear' && (await grad()) !== g0 && (await gen('hueRotate')) === 0,
    `entries +${u1 - u0}, ${applied.stops.length} stops, ${applied.colorSpace}, hue ${await gen('hueRotate')}`);
  await page.mouse.click(20, 900); // focus off the Apply button, onto the page
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(500);
  check('[3] one Ctrl+Z gives back the gradient and the dial', (await grad()) === g0 && (await gen('hueRotate')) === 110, `hue ${await gen('hueRotate')}`);

  // ── [4] Esc cancels ─────────────────────────────────────────────────────
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  check('[4] Esc cancels Adjust: dials reset, the param untouched, back on Stops',
    (await gen('hueRotate')) === 0 && (await grad()) === g0 && (await face()) === 'stops', `hue ${await gen('hueRotate')}, face ${await face()}`);

  // ── [5] Curves: a look costs nothing ────────────────────────────────────
  const u5 = await undo();
  await clickFace('curves');
  const fitted = await page.evaluate(`window.__wm('/palette/store/generatorStore.ts').then(function (m) { var s = m.useGeneratorStore.getState(); return !!s.tracks && s.curvesOn && !s.tracksEdited; })`);
  const u5b = await undo();
  await clickFace('stops');
  check('[5] Curves opens fitted with no entry, and leaving it untouched adds none and writes nothing',
    fitted === true && u5b === u5 && (await undo()) === u5 && (await grad()) === g0, `fitted ${fitted}, entries +${u5b - u5} / +${(await undo()) - u5}`);

  // ── [6] Curves edited → leaving bakes one entry ─────────────────────────
  await clickFace('curves');
  const u6 = await undo();
  await page.evaluate(`window.__wm('/palette/store/generatorStore.ts').then(function (m) {
    var s = m.useGeneratorStore.getState();
    var t = JSON.parse(JSON.stringify(s.tracks));
    var k = Object.keys(t)[0];
    t[k].keyframes.forEach(function (f) { f.value = f.value * 0.5; });
    m.genEdit(function () { s.setTracks(t); });
  })`);
  await page.waitForTimeout(400);
  const edited = await undo();
  await clickFace('stops');
  const curved = await grad();
  check('[6] an edited curve bakes on leaving Curves: ONE entry beyond the edit, the param written',
    edited === u6 + 1 && (await undo()) === u6 + 2 && curved !== g0, `edit +${edited - u6}, bake +${(await undo()) - edited}`);
  await page.mouse.click(20, 900);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  check('[6] Ctrl+Z takes the bake back', (await grad()) === g0);

  // ── [7] Paint ───────────────────────────────────────────────────────────
  await clickFace('paint');
  await page.waitForSelector('[data-gx-paint-surface]', { timeout: 10000 });
  const box = (await page.locator('[data-gx-paint-surface]').boundingBox())!;
  const u7 = await undo();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + box.width * (0.3 + i * 0.03), box.y + box.height / 2);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const strokeOk = (await grad()) === g0 && (await undo()) === u7 && !(await page.evaluate(`document.querySelector('[data-gx-paint-apply]').disabled`));
  await page.click('[data-gx-paint-apply]');
  await page.waitForTimeout(500);
  const painted = JSON.parse(await grad());
  check('[7] a stroke writes nothing; Apply is ONE entry holding a ramp in the param\'s colour space',
    strokeOk && (await undo()) === u7 + 1 && painted.stops.length === 0 && typeof painted.ramp === 'string' && painted.ramp.length > 0 && painted.colorSpace === 'linear',
    `stroke clean ${strokeOk}, entries +${(await undo()) - u7}, stops ${painted.stops.length}`);

  // ── [10] the card is the window: its name row drags it, its sides resize it, it never docks ──
  await clickFace('stops');
  const win = () => page.evaluate(`(function () {
    var el = document.querySelector('[data-gradient-studio]').closest('.fixed'); var r = el.getBoundingClientRect();
    var p = window.__store.getState().panels.GradientStudio;
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), sx: p.floatPos.x, sy: p.floatPos.y, sw: p.floatSize.width, loc: p.location };
  })()`) as Promise<{ x: number; y: number; w: number; sx: number; sy: number; sw: number; loc: string }>;
  const titleBar = await page.evaluate(`!!(document.querySelector('[data-gradient-studio]').closest('.fixed').querySelector('.bg-surface-header'))`);
  const w0 = await win();
  const hb = (await page.locator('[data-gradient-studio-handle]').boundingBox())!;
  await page.mouse.move(hb.x + hb.width * 0.6, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width * 0.6 - 60, hb.y + hb.height / 2 + 40, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const w1 = await win();
  check("[10] no window title bar; the hero's name row drags the window (and it stays)",
    !titleBar && w1.x === w0.x - 60 && w1.y === w0.y + 40 && w1.sx === w1.x && w1.sy === w1.y, `${w0.x},${w0.y} → ${w1.x},${w1.y}`);
  const edgeDrag = async (side: 'left' | 'right', dx: number) => {
    const eb = (await page.locator(`[data-floating-edge="${side}"]`).boundingBox())!;
    await page.mouse.move(eb.x + eb.width / 2, eb.y + 60);
    await page.mouse.down();
    await page.mouse.move(eb.x + eb.width / 2 + dx, eb.y + 60, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  };
  await edgeDrag('right', -100);
  const w2 = await win();
  await edgeDrag('left', -50);
  const w3 = await win();
  check('[10] the right side narrows the window in place; the left side widens it and moves its left edge',
    w2.w === w1.w - 100 && w2.x === w1.x && w2.sw === w2.w && w3.w === w2.w + 50 && w3.x === w2.x - 50 && w3.x + w3.w === w2.x + w2.w,
    `w ${w1.w} → ${w2.w} → ${w3.w}, x ${w1.x} → ${w2.x} → ${w3.x}`);
  // a tray that would land off the bottom scrolls; the window does not move up
  await page.evaluate(`window.__store.getState().setFloatPosition('GradientStudio', ${w3.x}, window.innerHeight - 320)`);
  await page.waitForTimeout(300);
  const yLow = (await win()).y;
  await clickFace('adjust');
  await page.waitForTimeout(500);
  // nudge it by its handle: the drop re-runs the on-screen clamp, which is where an over-tall
  // panel used to be pushed up
  const hb2 = (await page.locator('[data-gradient-studio-handle]').boundingBox())!;
  await page.mouse.move(hb2.x + hb2.width * 0.6, hb2.y + hb2.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb2.x + hb2.width * 0.6, hb2.y + hb2.height / 2 + 4, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const low = await win();
  const scrolls = await page.evaluate(`(function () { var b = document.querySelector('[data-gradient-studio]').closest('.overflow-y-auto'); return b.scrollHeight > b.clientHeight + 4 && getComputedStyle(b).overflowY === 'auto'; })()`);
  const bottom = await page.evaluate(`Math.round(document.querySelector('[data-gradient-studio]').closest('.fixed').getBoundingClientRect().bottom) <= window.innerHeight`);
  check('[10] a tray that would land off-screen scrolls inside the window; the window stays where it was',
    low.y === yLow + 4 && scrolls === true && bottom === true, `y ${yLow} → ${low.y} (nudged 4), scrolls ${scrolls}, inside ${bottom}`);
  await clickFace('stops');
  await page.evaluate(`window.__store.getState().movePanel('GradientStudio', 'right')`);
  await page.waitForTimeout(300);
  check('[10] it never docks: a move to a dock is refused', (await win()).loc === 'float');

  // ── [8] ✕ bakes a live dial ─────────────────────────────────────────────
  await clickFace('adjust');
  const g8 = await grad();
  await page.evaluate(`window.__store.getState().setPaletteGenerator({ chroma: 0.3 })`);
  await page.waitForTimeout(300);
  const u8 = await undo();
  // the ✕ of the floating window that holds the Studio (the nearest ancestor with a Close button)
  const xy = (await page.evaluate(`(function () {
    for (var el = document.querySelector('[data-gradient-studio]'); el; el = el.parentElement) {
      var b = el.querySelector('button[aria-label="Close"]');
      if (b) { var r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }
    }
    return null;
  })()`)) as { x: number; y: number } | null;
  if (xy) await page.mouse.click(xy.x, xy.y);
  await page.waitForTimeout(600);
  check('[8] the window\'s ✕ with a live dial bakes it: one entry, the dial reset, the window gone',
    !!xy && (await undo()) === u8 + 1 && (await grad()) !== g8 && (await gen('chroma')) === 1 && !(await page.$('[data-gradient-studio]')),
    `✕ found ${!!xy}, entries +${(await undo()) - u8}, chroma ${await gen('chroma')}`);

  // ── [9] ─────────────────────────────────────────────────────────────────
  const fallback = await page.evaluate(`!!document.body.innerText.match(/Something went wrong|couldn't load/)`);
  check('[9] no pageerror and no error-boundary fallback', pageErrors.length === 0 && !fallback, pageErrors.join(' | '));

  await browser.close();
  console.log(failures ? `\nsmoke:gradient-studio RED (${failures})` : '\nsmoke:gradient-studio green');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
