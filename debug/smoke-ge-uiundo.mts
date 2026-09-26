/**
 * smoke-ge-uiundo — the v2 shell's INTERFACE state rides the undo stack.
 *
 * Owner, 2026-09-12: "undo must save interface state … this can solve the issue where we can't
 * see the toast when the heart icon is pressed — the current panel can disappear, as it can be
 * returned during undo." So the ♥ CLOSES whatever covers the set rail before it files, because
 * the flash on the chip is the only thing naming the set that took it — and that is only
 * honest because one Ctrl+Z puts the surface back.
 *
 * Owner, 2026-09-24: "I just want to ensure that UI goes along with undo." Since that day the
 * interface is CONTEXT on every entry (gradient-explorer/v2/uiHistory.ts, historySlice's
 * `HistoryProvider.context`): the face, the inspected stop and the armed Mix slot an entry was
 * made in come back with its undo, and redo gives back the ones you left.
 *
 * The pairing is the point: every step asserts the data AND the interface, undo AND redo, so a
 * build that restores the DATA and forgets the FURNITURE cannot pass.
 *
 *   [1] a tray face is open and the rail is behind it
 *   [2] the ♥ closes the face and the set grows
 *   [3] Ctrl+Z puts the gradient back AND reopens the SAME face
 *   [4] redo files it again and closes the face again — the entry is symmetric
 *   [5] undoing back PAST the document closes the face instead of stranding you in it
 *   ── 2026-09-24, one step per row of that day's audit that came back contradicting its data:
 *   [6] the ♥ over the STOP INSPECTOR: undo gives the inspector back WITH its stop (it came back
 *       empty — the face is only a portal host for the editor's selection)
 *   [7] entering Mix is ONE entry: undo closes the face and disarms, and the next undo reaches
 *       the pick before it (three entries before; undoing the last left an armed Mix face over a
 *       fixed gradient)
 *   [8] leaving Mix (a bake): undo gives the live Mix WITH its face, armed, "live from Mix" (it
 *       gave a live Mix under a closed tray, the chip reading "live from Image")
 *   [9] Mix → Curves in one click is one entry: undo gives the live Mix with its face (it gave a
 *       Mix face over the baked, fixed gradient)
 *   [10] closing an untouched Curves adds no entry (a peek is navigation); opening Curves: undo
 *       closes the face AND drops the fit (it left the face saying "Nothing to fit yet")
 *   [11] closing Adjust with a dial (a bake): undo gives the Adjust face with its dial (it left
 *       the dial live with no face)
 *   [12] deleting the inspected stop: undo gives the stop back INSPECTED
 *   [13] the Image face: undo of a pick over it gives the live image with its face; undo of the
 *       image load closes the face (it left an Image face over a fixed gradient)
 *   [14] an undo under the Reduce popup does not reopen the inspector over its preview
 *   [15] (J02, 2026-09-24) the ♥ with the MIX face open commits the blend the way a tab close
 *       does and files it: no face, no live Mix left behind, no "live from Image", the ♥ lit; one
 *       undo gives the live Mix back with its face AND takes the save back; redo does both again.
 *       FALSIFIED 2026-09-24 by the shell's `revealGround` back to a bare `setTray(null)`: red
 *       "[15] the ♥ closed the Mix face but left the Mix LIVE under it"; reverted.
 *   [16] (ASK-1, 2026-09-24) ESC CANCELS A FACE: Adjust with a dial → Esc → the dial at rest, the
 *       gradient exactly as before the face (not baked), the face closed; one undo gives the dial
 *       back with its face. Mix with a blend → Esc → no longer live, the gradient and name from
 *       before Mix. FALSIFIED 2026-09-24 by the shell's Esc going back to `openTray(null)` (the
 *       bake): red "[16] Esc on Adjust changed the gradient … it baked the dial instead of
 *       cancelling it"; reverted.
 *
 * FALSIFIED 2026-09-12 (steps [1]–[5], against the pre-context build):
 *   · `flushSync(onRevealGround)` → `onRevealGround()` in WorkingHero: [3] RED — React had not
 *     committed the close when `paramEdit` diffed, so the entry carried the save alone. Moot
 *     since 2026-09-24: context is captured when the bracket OPENS, so the ♥ no longer needs
 *     `flushSync` and no longer has it.
 *   · `useShellUiHistory(...)` commented out in GradientExplorerV2App: [3] RED.
 *   · `flushSync(onRevealGround)` deleted entirely: [2] RED, "the face is still open after the ♥".
 *   · the "no document ⇒ no face" invariant disabled in GradientExplorerV2App: [5] RED alone,
 *     "undo left a face open with nothing under it (curves)".
 *
 * FALSIFIED 2026-09-24, each reverted, with a copy of this file that logs a red and carries on
 * (so every step a break reaches is listed, not just the first):
 *   F1 both providers in uiHistory.ts registered with `context: false` (the old "rides when it
 *      changed" semantics): [3], [6], [7], [8], [9], [10], [11], [12], [13] RED — every row the
 *      audit found, each in its measured shape ("the chip reads "live from Image · cancel"",
 *      "left the curves face open saying "Nothing to fit yet"", "gave face null with Phase 0.05").
 *   F2 WorkingHero's `selRestore` effect returning early: [6] "the inspector came back EMPTY",
 *      [12] "not inspected", [14] (an empty inspector face over the popup).
 *   F3 the shell's `openTray` body run without `paramGroup`: [7] "the second undo did not reach
 *      the pick before Mix", [9] "gave face mix over input gradient".
 *   F4 the Curves fit left to the face's mount (the `openTray` fit disabled): [9], [10] "left the
 *      curves face open saying "Nothing to fit yet"".
 *   F5 the armed slot left out of the shell's restore: [7] "armed true", [8] "no longer armed".
 *   F6 `restoreSelection` ignoring an open Reduce popup: [14] alone.
 *   F7 the peek's fit dropped inside the group (`peek` forced false): [10] "added an undo entry".
 *
 * Wants `npm run dev` on 3400 (`ENGINE_URL` points it elsewhere). Run: `npm run smoke:ge-uiundo`.
 */
import { chromium, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';

const fail = (msg: string): never => {
    console.log(`✗ ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
};

/** The face that is open (its tab label), and every set chip's count. */
const shellState = (page: Page) =>
    page.evaluate(`(() => {
      // The tray ROOT is always mounted; data-gx-tray carries the open face's id and is
      // absent when nothing is open (Tray.tsx sets it to the face, or undefined).
      var root = document.querySelector('[data-gx-tray-root]');
      var open = root && root.dataset.gxTray ? root.dataset.gxTray : null;
      var counts = {};
      Array.prototype.slice.call(document.querySelectorAll('[data-gx-set]')).forEach(function (c) {
        counts[c.dataset.gxSet] = Number(c.dataset.gxSetCount);
      });
      return { tray: !!open, face: open, trayH: root ? Math.round(root.getBoundingClientRect().height) : 0, counts: counts };
    })()`) as Promise<{ tray: boolean; face: string | null; trayH: number; counts: Record<string, number> }>;

/** The set whose count differs between two snapshots, and by how much. */
const grew = (a: Record<string, number>, b: Record<string, number>): { id: string; from: number; to: number } | null => {
    for (const id of Object.keys(b)) {
        if ((a[id] ?? 0) !== b[id]) return { id, from: a[id] ?? 0, to: b[id] };
    }
    return null;
};
/** A set with no members is not drawn at all, so an ABSENT chip means zero, not unknown. */
const countOf = (counts: Record<string, number>, id: string): number => counts[id] ?? 0;

/** A 64×8 PNG, red → blue: an image for the Image face ([13]). */
const pngBytes = async (): Promise<Buffer> => {
    const { deflateSync } = await import('zlib');
    const w = 64, h = 8;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const o = y * (w * 3 + 1) + 1 + x * 3;
            raw[o] = Math.round(255 * (1 - x / (w - 1)));
            raw[o + 1] = Math.round(200 * Math.sin((Math.PI * x) / (w - 1)));
            raw[o + 2] = Math.round(255 * (x / (w - 1)));
        }
    }
    const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = table[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (t: string, d: Buffer) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
        const td = Buffer.concat([Buffer.from(t), d]);
        const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
        return Buffer.concat([len, td, c]);
    };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await seedGeSmokeState(ctx);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    console.log(`→ GET ${URL}`);
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const wall = page.locator('[data-gx-keepselect] canvas').first();
    await wall.waitFor({ state: 'visible', timeout: 15000 });
    const box = (await wall.boundingBox())!;
    await page.mouse.click(box.x + 400, box.y + 260);
    await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('no hero after a wall click'));
    await page.waitForTimeout(1200);

    // [1] open a face — the one that hangs the deepest over the rail.
    const curves = page.locator('[data-gx-tray-tab]', { hasText: 'Curves' }).first();
    if (!(await curves.count())) fail('[1] no Curves tab on the hero');
    await curves.click();
    await page.waitForTimeout(900);
    const opened = await shellState(page);
    if (!opened.tray) fail('[1] the Curves face did not open');
    console.log(`✓ [1] the ${opened.face} face is open (${opened.trayH} px over the rail)`);

    // [2] the ♥ — it must close the face AND file the gradient.
    const heart = page.locator('[data-gx-hero] button[title*="Keep"], [data-gx-hero] button[aria-label*="Keep"]').first();
    if (!(await heart.count())) fail('[2] no ♥ in the hero');
    await heart.click();
    await page.waitForTimeout(400);
    const filed = await shellState(page);
    if (filed.tray) fail(`[2] the face is still open after the ♥ (${filed.face}) — the flash plays behind it`);
    const growth = grew(opened.counts, filed.counts);
    if (!growth || growth.to <= growth.from) fail(`[2] nothing was filed by the ♥ (${JSON.stringify(growth)})`);
    console.log(`✓ [2] the ♥ closed the face and filed into "${growth.id}" (${growth.from} → ${growth.to})`);

    // [3] one Ctrl+Z — BOTH halves. A build that restores only the data passes the second
    // assertion and fails the first, which is the whole reason they are separate.
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(700);
    const undone = await shellState(page);
    if (undone.face !== opened.face) fail(`[3] the face did not come back (${undone.face ?? 'null'}, wanted ${opened.face})`);
    if (countOf(undone.counts, growth.id) !== growth.from) fail(`[3] the save did not undo ("${growth.id}" is ${countOf(undone.counts, growth.id)}, wanted ${growth.from})`);
    console.log(`✓ [3] one undo put back BOTH: "${growth.id}" ${growth.to} → ${growth.from}, and the ${undone.face} face`);

    // [4] redo is the same entry read the other way.
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(700);
    const redone = await shellState(page);
    if (countOf(redone.counts, growth.id) !== growth.to) fail(`[4] redo did not re-file ("${growth.id}" is ${countOf(redone.counts, growth.id)}, wanted ${growth.to})`);
    if (redone.tray) fail(`[4] redo left the face open (${redone.face}) — the entry is not symmetric`);
    console.log(`✓ [4] redo re-filed it and closed the face again`);

    // [5] UNDOING PAST THE DOCUMENT must not strand you in a face. The owner's report,
    // 2026-09-12: every entry on the stack had been made while Adjust was open, so every undo
    // restored Adjust while the document kept walking back to nothing — and on a phone, where
    // a full-height face hides the ground, there was no way back to the wall. A face edits a
    // document; with no document there is no face.
    await curves.click();
    await page.waitForTimeout(600);
    if (!(await shellState(page)).tray) fail('[5] could not reopen a face to undo out of');
    for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(120);
    }
    const stranded = await shellState(page);
    if (stranded.tray) fail(`[5] undo left a face open with nothing under it (${stranded.face}) — the stuck state`);
    console.log('✓ [5] undoing back past the document closed the face instead of stranding it');

    // ── 2026-09-24: THE INTERFACE IS CONTEXT ON EVERY ENTRY (owner: "UI goes along with undo").
    // Each step below is a row of that day's audit that came back contradicting its data; each
    // asserts the undo AND the redo, the data AND the interface.
    await page.evaluate(`(async () => {
      const url = performance.getEntriesByType('resource').map((e) => e.name)
        .find((n) => /\\/palette\\/store\\/generatorStore\\.ts(\\?|$)/.test(n)) || '/palette/store/generatorStore.ts';
      window.__uiundoGen = (await import(url)).useGeneratorStore;
    })()`);
    const ui = () => page.evaluate(`(() => {
      const root = document.querySelector('[data-gx-tray-root]');
      const chip = document.querySelector('[data-gx-hero] [data-gx-state]');
      const w = window.__gxWorking ? window.__gxWorking() : null;
      const g = window.__uiundoGen ? window.__uiundoGen.getState() : null;
      const pg = window.__store.getState().paletteGenerator || {};
      return {
        face: root && root.dataset.gxTray ? root.dataset.gxTray : null,
        chip: chip ? chip.dataset.gxState : null,
        chipText: chip ? chip.innerText.replace(/\\s+/g, ' ').trim() : '',
        kind: w && w.input ? w.input.kind : null,
        stops: w && w.config ? w.config.stops.length : 0,
        name: (document.querySelector('[data-gx-hero] input[title="Name"]') || {}).value || '',
        armed: /Pick a gradient to (mix with|replace)/.test(document.body.innerText),
        picker: !!(root && root.querySelector('[data-gx-picker-skin]')),
        nothingToFit: !!(root && /Nothing to fit yet/.test(root.innerText)),
        tracks: g ? !!g.tracks : null,
        phase: pg.phase,
        reduce: !!document.querySelector('[data-gx-reduce]'),
      };
    })()`) as Promise<{ face: string | null; chip: string | null; chipText: string; kind: string | null; stops: number; name: string; armed: boolean; picker: boolean; nothingToFit: boolean; tracks: boolean | null; phase: number; reduce: boolean }>;
    const settle = (ms = 700) => page.waitForTimeout(ms);
    const undo = async () => { await page.keyboard.press('Control+z'); await settle(); };
    const redo = async () => { await page.keyboard.press('Control+y'); await settle(); };
    const tab = async (face: string) => { await page.click(`[data-gx-tray-tab="${face}"]`); await settle(600); };
    /** A dial through the route the Adjust / Mix sliders take (the DDFS bracket). */
    const dial = async (patch: Record<string, number>) => {
        await page.evaluate(`(() => { const s = window.__store.getState(); s.handleInteractionStart('param'); s.setPaletteGenerator(${JSON.stringify(patch)}); s.handleInteractionEnd(); })()`);
        await settle(400);
    };
    /** Pick a wall tile that changes the working gradient (aims that hit-test to the wall itself). */
    const pickNew = async (label: string) => {
        const before = (await ui()).name;
        // Since 2026-09-25 the wall SLEEPS under Curves / Adjust / Paint / Image: a veil takes the
        // first click and only wakes it (grep `wallIdle` in the shell, guard `smoke:ge-wall`). The
        // pick is what is under test here, so wake the wall first — a click on the veil's far corner.
        const veil = (await page.evaluate(`(() => {
          const v = document.querySelector('[data-gx-wall-veil]');
          if (!v || getComputedStyle(v).pointerEvents === 'none') return null;
          const r = v.getBoundingClientRect();
          return { x: r.right - 40, y: Math.min(r.bottom, window.innerHeight) - 20 };
        })()`)) as { x: number; y: number } | null;
        if (veil) {
            await page.mouse.click(veil.x, veil.y);
            await settle(250);
        }
        const aims = (await page.evaluate(`(() => {
          const wallEl = document.querySelector('[data-gx-keepselect]');
          const r = wallEl.getBoundingClientRect();
          const out = [];
          for (let y = r.y + 14; y < Math.min(r.bottom, window.innerHeight) - 8 && out.length < 16; y += 29) {
            for (let k = 0; k < 4; k++) {
              const x = r.x + 24 + 44 * (3 + k * 4);
              const el = document.elementFromPoint(x, y);
              if (el && el.tagName === 'CANVAS' && !el.closest('[data-gx-hero]') && !el.closest('[data-gx-tray-root]') && wallEl.contains(el)) out.push({ x, y });
            }
          }
          return out;
        })()`)) as { x: number; y: number }[];
        for (const a of aims.slice(3)) {
            await page.mouse.click(a.x, a.y);
            await settle(900);
            await page.mouse.move(640, 20);
            if ((await ui()).name !== before) return;
        }
        fail(`${label} setup: no wall click picked a different gradient (still "${before}")`);
    };
    const swatch = page.locator('[data-gx-hero] [class*="cursor-ew-resize"]');
    const inspectStop = async (label: string, nth = 1) => {
        await swatch.nth(nth).click();
        await settle(500);
        await page.mouse.move(640, 20);
        const st = await ui();
        if (st.face !== 'inspector' || !st.picker) fail(`${label} setup: a swatch click did not inspect a stop (face ${st.face}, picker ${st.picker})`);
    };
    let s = await ui();

    // [6] the ♥ with a STOP INSPECTED. The inspector face is only a portal host for the editor's
    // selection, so the pre-context build brought the face back EMPTY (measured: face
    // "inspector", no picker in it). The selection is context too (WorkingHero `selRestore`).
    await pickNew('[6]');
    await inspectStop('[6]');
    const heart6 = page.locator('[data-gx-hero] button[title^="Keep"]').first();
    if (!(await heart6.count())) fail('[6] setup: the picked gradient is already kept — no ♥ to file it with');
    const counts6 = (await shellState(page)).counts;
    await heart6.click();
    await settle(500);
    s = await ui();
    if (s.face) fail(`[6] the ♥ left the inspector open (${s.face})`);
    if (!grew(counts6, (await shellState(page)).counts)) fail('[6] the ♥ filed nothing');
    await undo();
    s = await ui();
    if (s.face !== 'inspector') fail(`[6] one undo did not bring the inspector back (${s.face})`);
    if (!s.picker) fail('[6] the inspector came back EMPTY — the face without the stop it was inspecting');
    await redo();
    s = await ui();
    if (s.face || s.picker) fail(`[6] redo left the inspector open (${s.face}, picker ${s.picker})`);
    console.log('✓ [6] ♥ over a stop inspector: one undo — the inspector came back with its stop; redo closed it');

    // [7] ENTERING MIX IS ONE ENTRY. The tab ran three brackets of its own (two slots and the
    // live input), and undoing only the last left a Mix face, armed, over a fixed gradient; the
    // two undos after it changed nothing you could see. Now one Ctrl+Z is the whole click and the
    // next reaches the gesture before it (the pick).
    await pickNew('[7]');
    const name7 = (await ui()).name;
    await tab('mix');
    s = await ui();
    if (s.face !== 'mix' || s.kind !== 'build' || !s.armed) fail(`[7] setup: Mix did not open live and armed (${s.face}, ${s.kind}, armed ${s.armed})`);
    await undo();
    s = await ui();
    if (s.face || s.kind !== 'gradient' || s.armed) fail(`[7] one undo after entering Mix left face ${s.face}, input ${s.kind}, armed ${s.armed} — wanted no face, the gradient, nothing armed`);
    await undo();
    s = await ui();
    if (s.name === name7) fail(`[7] the second undo did not reach the pick before Mix (still "${name7}") — entering Mix is more than one entry`);
    await redo();
    await redo();
    s = await ui();
    if (s.face !== 'mix' || s.kind !== 'build' || !s.armed || s.chip !== 'live') fail(`[7] redo did not bring the live Mix back with its face, armed (${s.face}, ${s.kind}, armed ${s.armed}, chip ${s.chip})`);
    console.log('✓ [7] entering Mix is one undo step: no face, nothing armed, then the pick before it; redo reopens it live and armed');

    // [8] LEAVING MIX (it bakes, with `use`). The bake was an entry and the face closed outside
    // it: undo put the live Mix back under a closed tray, its chip reading "live from Image".
    await dial({ mixL: 0.5, mixC: 0.5, mixH: 0.5 });
    await tab('mix');
    s = await ui();
    if (s.face || s.kind !== 'gradient') fail(`[8] setup: leaving Mix did not bake (${s.face}, ${s.kind})`);
    await undo();
    s = await ui();
    if (s.face !== 'mix' || s.kind !== 'build') fail(`[8] one undo after leaving Mix gave face ${s.face} over input ${s.kind} — the live Mix without its face`);
    if (!/live from Mix/.test(s.chipText)) fail(`[8] the chip reads "${s.chipText}" over a live Mix`);
    if (!s.armed) fail('[8] the Mix face came back but the other bar is no longer armed');
    await redo();
    s = await ui();
    if (s.face || s.kind !== 'gradient' || s.armed) fail(`[8] redo did not close Mix on its baked result (${s.face}, ${s.kind}, armed ${s.armed})`);
    console.log('✓ [8] leaving Mix: one undo — the Mix face with the live Mix, armed, "live from Mix"; redo closed it again');

    // [9] MIX → CURVES in one click bakes the Mix AND fits the curves. Two entries before, the
    // second (the fit) made with the Mix face still open: its undo left a Mix face over the
    // baked, fixed gradient. One entry now.
    await tab('mix');
    await dial({ mixL: 0.4, mixC: 0.4, mixH: 0.4 });
    await tab('curves');
    s = await ui();
    if (s.face !== 'curves' || !s.tracks || s.nothingToFit) fail(`[9] setup: Curves did not open on curves (${s.face}, tracks ${s.tracks})`);
    await undo();
    s = await ui();
    if (s.face !== 'mix' || s.kind !== 'build') fail(`[9] one undo after Mix → Curves gave face ${s.face} over input ${s.kind} — wanted the live Mix with its face`);
    await redo();
    s = await ui();
    if (s.face !== 'curves' || !s.tracks || s.nothingToFit) fail(`[9] redo did not bring Curves back with its curves (${s.face}, tracks ${s.tracks}, "Nothing to fit" ${s.nothingToFit})`);
    console.log('✓ [9] Mix → Curves is one step: undo gives the live Mix with its face, redo Curves with its curves');

    // [10] OPENING CURVES. The fit ran when the face MOUNTED, so its entry was made with the face
    // open, and its undo left the face saying "Nothing to fit yet" over a gradient. It is fitted
    // inside the tab's click now, before the face opens.
    // Closing an untouched Curves is a PEEK: navigation, so it adds no entry (the fit it drops
    // goes outside any bracket — grep `peek` in the shell's `openTray`).
    const stackLen = () => page.evaluate(`window.__store.getState().paramUndoStack.length`) as Promise<number>;
    const before10 = await stackLen();
    await page.keyboard.press('Escape');
    await settle();
    if ((await stackLen()) !== before10) fail(`[10] closing an untouched Curves face added an undo entry (${before10} → ${await stackLen()}) — a peek is navigation`);
    await tab('curves');
    s = await ui();
    if (s.face !== 'curves' || !s.tracks) fail(`[10] setup: Curves did not open fitted (${s.face}, tracks ${s.tracks})`);
    await undo();
    s = await ui();
    if (s.face) fail(`[10] one undo after opening Curves left the ${s.face} face open${s.nothingToFit ? ' saying "Nothing to fit yet"' : ''}`);
    if (s.tracks) fail('[10] the undo closed Curves but left its fit behind');
    await redo();
    s = await ui();
    if (s.face !== 'curves' || !s.tracks || s.nothingToFit) fail(`[10] redo did not reopen Curves on its fit (${s.face}, tracks ${s.tracks})`);
    console.log('✓ [10] closing an untouched Curves adds no entry; opening Curves: undo closes the face and drops the fit together, redo reopens it fitted');

    // [11] CLOSING ADJUST WITH A DIAL (it bakes). The bake was the entry, the close outside it:
    // undo left the dial live with no face to show it or take it back.
    await page.keyboard.press('Escape');
    await settle();
    await tab('adjust');
    await dial({ phase: 0.05 });
    await tab('adjust');
    s = await ui();
    if (s.face || s.chip !== 'edited' || s.phase !== 0) fail(`[11] setup: closing Adjust did not bake (${s.face}, chip ${s.chip}, phase ${s.phase})`);
    await undo();
    s = await ui();
    if (s.face !== 'adjust' || Math.abs(s.phase - 0.05) > 1e-9) fail(`[11] one undo after closing Adjust gave face ${s.face} with Phase ${s.phase} — wanted the Adjust face with its dial`);
    await redo();
    s = await ui();
    if (s.face || s.chip !== 'edited' || s.phase !== 0) fail(`[11] redo did not bake and close again (${s.face}, chip ${s.chip}, phase ${s.phase})`);
    console.log('✓ [11] closing Adjust with a dial: undo gives the Adjust face and its dial, redo the bake with the face closed');

    // [12] DELETING THE INSPECTED STOP. The delete clears the selection, which closes the face;
    // undo gave the stop back unselected. Where you were is the stop, inspected.
    await inspectStop('[12]', 2);
    const stops12 = (await ui()).stops;
    await page.keyboard.press('Delete');
    await settle();
    s = await ui();
    if (s.stops !== stops12 - 1 || s.face) fail(`[12] setup: Delete did not remove the inspected stop (${stops12} → ${s.stops}, face ${s.face})`);
    await undo();
    s = await ui();
    if (s.stops !== stops12) fail(`[12] the undo did not put the stop back (${s.stops}, wanted ${stops12})`);
    if (s.face !== 'inspector' || !s.picker) fail(`[12] the stop came back but not inspected (face ${s.face}, picker ${s.picker})`);
    await redo();
    s = await ui();
    if (s.stops !== stops12 - 1 || s.face) fail(`[12] redo did not delete it and close the inspector again (${s.stops}, face ${s.face})`);
    console.log('✓ [12] deleting an inspected stop: undo gives the stop back inspected, redo deletes it again');

    // [13] THE IMAGE FACE. Loading an image went live and opened the face in two moves, and a pick
    // over the face committed the pick and closed the face in two: undo left an Image face over a
    // fixed gradient, or a live image under a closed tray.
    await page.setInputFiles('input[type=file][accept="image/*"]', { name: 'uiundo.png', mimeType: 'image/png', buffer: await pngBytes() });
    await settle(1500);
    s = await ui();
    if (s.face !== 'image' || s.kind !== 'extract') fail(`[13] setup: the image did not open the Image face live (${s.face}, ${s.kind})`);
    await pickNew('[13]');
    s = await ui();
    if (s.face || s.kind !== 'gradient') fail(`[13] setup: a pick over the Image face did not replace it (${s.face}, ${s.kind})`);
    // the picture is still loaded, so its tab stays with the face closed (owner, 2026-09-25: the
    // Image tab shows only while an image is loaded — and then it does show)
    if (!(await page.$('[data-gx-tray-tab="image"]'))) fail('[13] the Image tab went with its face while the picture is still loaded');
    await undo();
    s = await ui();
    if (s.face !== 'image' || s.kind !== 'extract' || s.chip !== 'live') fail(`[13] one undo after the pick gave face ${s.face} over input ${s.kind} — wanted the live image with its face`);
    await undo();
    s = await ui();
    if (s.face || s.kind === 'extract') fail(`[13] undoing the image load left face ${s.face} over input ${s.kind}`);
    await redo();
    s = await ui();
    if (s.face !== 'image' || s.kind !== 'extract') fail(`[13] redo did not bring the image back with its face (${s.face}, ${s.kind})`);
    console.log('✓ [13] the Image face: undo of a pick over it gives the live image with its face, undo of the load closes it, redo reopens it');

    // [14] an undo under the REDUCE popup does not reopen the inspector over its preview. The popup
    // clears the selection on purpose (a selected knot keeps the inspector open over knots the
    // preview hides), so a restored selection stands down while it is open.
    await page.keyboard.press('Escape');
    await settle();
    await pickNew('[14]');
    await inspectStop('[14]', 1);
    await page.keyboard.press('ArrowLeft');
    await settle(500);
    await page.keyboard.press('Escape');
    await settle();
    await page.click('[data-gx-hero] button[title^="Stops menu"]');
    await settle(400);
    await page.locator('button:has-text("Reduce Stops…")').first().click();
    await page.waitForSelector('[data-gx-reduce]:not([data-gx-reduce-pending])', { timeout: 5000 }).catch(() => fail('[14] setup: the Reduce popup did not open'));
    await settle(300);
    if (!(await ui()).reduce) fail('[14] setup: the Reduce popup did not open');
    await undo();
    s = await ui();
    if (s.face === 'inspector' || s.picker) fail(`[14] the undo reopened the stop inspector over the Reduce preview (face ${s.face})`);
    if (!s.reduce) fail('[14] the undo closed the Reduce popup — it recomputes over the restored stops by design');
    await page.keyboard.press('Escape');
    await settle();
    console.log('✓ [14] an undo under the Reduce popup keeps the popup and does not reopen the inspector over it');

    // [15] THE ♥ WITH THE MIX FACE OPEN (J02). The ♥ closed the face with a bare close, which
    // skipped the commit every other way out of Mix makes — so it filed the blend and left the
    // Mix LIVE with no face to show or change it, its chip reading "live from Image". Now it
    // leaves Mix the way a tab close does (the shell's `openTray(null)`, one entry with the save),
    // and files the committed result, so the ♥ is lit over the gradient the hero shows.
    await pickNew('[15]');
    await tab('mix');
    await dial({ mixL: 0.5, mixC: 0.5, mixH: 0.5 });
    s = await ui();
    if (s.face !== 'mix' || s.kind !== 'build') fail(`[15] setup: Mix is not open live (${s.face}, ${s.kind})`);
    const heart15 = page.locator('[data-gx-hero] button[title^="Keep"]').first();
    if (!(await heart15.count())) fail('[15] setup: the blend is already kept — no ♥ to file it with');
    const counts15 = (await shellState(page)).counts;
    await heart15.click();
    await settle(500);
    s = await ui();
    if (s.face) fail(`[15] the ♥ left the ${s.face} face open`);
    if (s.kind === 'build') fail(`[15] the ♥ closed the Mix face but left the Mix LIVE under it (chip "${s.chipText}") — a live Mix lives only while its face is open`);
    if (/live from/.test(s.chipText)) fail(`[15] after the ♥ the chip still reads "${s.chipText}"`);
    const grown15 = grew(counts15, (await shellState(page)).counts);
    if (!grown15) fail('[15] the ♥ filed nothing');
    if (!(await page.$('[data-gx-hero] button[title^="Saved in My Gradients"]'))) fail('[15] the ♥ is not lit — it filed something other than the gradient the hero now shows');
    await undo();
    s = await ui();
    if (s.face !== 'mix' || s.kind !== 'build' || s.chip !== 'live') fail(`[15] one undo after the ♥ gave face ${s.face} over input ${s.kind} (chip ${s.chip}) — wanted the live Mix with its face`);
    if (countOf((await shellState(page)).counts, grown15!.id) !== grown15!.from) fail(`[15] the same undo did not take the save back ("${grown15!.id}")`);
    await redo();
    s = await ui();
    if (s.face || s.kind === 'build' || countOf((await shellState(page)).counts, grown15!.id) !== grown15!.to) fail(`[15] redo did not commit and file again (${s.face}, ${s.kind})`);
    console.log('✓ [15] ♥ with the Mix face open: the Mix is committed and filed (♥ lit, no live Mix left behind); one undo gives the live Mix with its face and takes the save back');

    // [16] ESC CANCELS A FACE (owner, 2026-09-24 — ASK-1). It BAKED until then: Esc on Adjust kept
    // the dials in the stops while Adjust's own Cancel, one button over, would have dropped them,
    // and Esc on Mix committed the blend while the Mix words said "Esc cancels". Now Esc is the
    // face's Cancel (the shell's `escapeFace`); a tab click still bakes ([8], [11]).
    const cfg = () => page.evaluate(`JSON.stringify((window.__gxWorking && window.__gxWorking().config || {}).stops || [])`) as Promise<string>;
    await page.keyboard.press('Escape'); // the ♥ left no face; nothing here to cancel
    await settle();
    await pickNew('[16]');
    const before16 = { kind: (await ui()).kind, stops: await cfg() };
    await tab('adjust');
    await dial({ phase: 0.05 });
    s = await ui();
    if (s.face !== 'adjust' || Math.abs(s.phase - 0.05) > 1e-9) fail(`[16] setup: Adjust did not take the dial (${s.face}, phase ${s.phase})`);
    await page.keyboard.press('Escape');
    await settle();
    s = await ui();
    if (s.face) fail(`[16] Esc left the ${s.face} face open`);
    if (s.phase !== 0) fail(`[16] Esc on Adjust left the dial set (phase ${s.phase}) — it should be Adjust's Cancel`);
    if (s.kind !== before16.kind || s.chip === 'edited' || (await cfg()) !== before16.stops) fail(`[16] Esc on Adjust changed the gradient (input ${before16.kind} → ${s.kind}, chip ${s.chip}) — it baked the dial instead of cancelling it`);
    await undo();
    s = await ui();
    if (s.face !== 'adjust' || Math.abs(s.phase - 0.05) > 1e-9) fail(`[16] one undo after Esc did not give back the Adjust face with its dial (${s.face}, phase ${s.phase})`);
    await page.keyboard.press('Escape');
    await settle();
    const preMix = { stops: await cfg(), name: (await ui()).name };
    await tab('mix');
    await dial({ mixL: 0.5, mixC: 0.5, mixH: 0.5 });
    s = await ui();
    if (s.face !== 'mix' || s.kind !== 'build') fail(`[16] setup: Mix is not open live (${s.face}, ${s.kind})`);
    await page.keyboard.press('Escape');
    await settle();
    s = await ui();
    if (s.face) fail(`[16] Esc left the ${s.face} face open`);
    if (s.kind === 'build' || s.chip === 'live') fail(`[16] Esc closed Mix but left it live (chip ${s.chip})`);
    if ((await cfg()) !== preMix.stops || s.name !== preMix.name) fail(`[16] Esc on Mix did not put back the gradient from before it ("${preMix.name}" → "${s.name}") — it committed the blend instead of cancelling it`);
    console.log('✓ [16] Esc cancels a face: Adjust drops its dials (one undo gives them back with the face), Mix gives back the gradient from before it');

    if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
    console.log('\nPASS — every undo entry carries the interface it was made in');
    await browser.close();
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
