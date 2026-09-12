/**
 * smoke-ge-uiundo — the v2 shell's INTERFACE state rides the undo stack.
 *
 * Owner, 2026-09-12: "undo must save interface state … this can solve the issue where we can't
 * see the toast when the heart icon is pressed — the current panel can disappear, as it can be
 * returned during undo." So the ♥ CLOSES whatever covers the set rail before it files, because
 * the flash on the chip is the only thing naming the set that took it — and that is only
 * honest because one Ctrl+Z puts the surface back.
 *
 * Four steps, and the pairing is the point: each half of the undo is asserted separately, so a
 * build that restores the DATA and forgets the FURNITURE cannot pass.
 *
 *   [1] a tray face is open and the rail is behind it
 *   [2] the ♥ closes the face and the set grows
 *   [3] Ctrl+Z puts the gradient back AND reopens the SAME face
 *   [4] redo files it again and closes the face again — the entry is symmetric
 *   [5] undoing back PAST the document closes the face instead of stranding you in it
 *
 * FALSIFIED 2026-09-12, three ways, each against a deliberately broken build:
 *   · `flushSync(onRevealGround)` → `onRevealGround()` in WorkingHero: [3] RED, "the face did
 *     not come back (null)". This is the real defect the guard was written for and the one a
 *     screenshot would not have caught — React had not committed the close when `paramEdit`
 *     diffed, so the entry carried the save alone. The save still undid, which is exactly why
 *     [3] asserts BOTH halves.
 *   · `useShellUiHistory(...)` commented out in GradientExplorerV2App: [3] RED the same way —
 *     with no provider there is no interface state on any entry.
 *   · `flushSync(onRevealGround)` deleted entirely: [2] RED, "the face is still open after the
 *     ♥" — the flash plays behind the tray, which is the state the owner reported.
 *   · the "no document ⇒ no face" invariant disabled in GradientExplorerV2App: [5] RED, "undo
 *     left a face open with nothing under it (curves)", with [1]–[4] all still green — which
 *     is the shape of the bug it guards. Falsified 2026-09-12 after the owner hit it.
 *
 * Wants `npm run dev` on 3400. Run: `npm run smoke:ge-uiundo`.
 */
import { chromium, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';

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

    if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
    console.log('\nPASS — a gesture that moves the furniture carries the furniture on its undo entry');
    await browser.close();
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
