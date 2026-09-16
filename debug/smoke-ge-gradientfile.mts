/**
 * smoke-ge-gradientfile — the GMT gradient file (ADR-0123) WIRED into the v2 shell: the Export
 * menu writes it, every entrance reads it back through the one loader, and an import lands where
 * you can see it (ADR-0119). The file format and the loader themselves are node-tested
 * (`npm run test:gradient-file`); this is the browser half — the menu rows, the downloads, the
 * real `<input type=file>`, the window drop, the session hand-off and the reveal.
 *
 *   [a0] an UNMODIFIED catalogue pick exported as Export ▸ For GMT ▸ GMT gradient (.png) carries
 *        in its metadata its plain name, its catalogue origin (the credit rides `origin`, not the
 *        name) and a filename with the credit; the For GMT band sits above every registry section
 *        and holds ONE row, the PNG (the .json row went 2026-09-14; until then this step read the
 *        .json download).
 *   [a]  the same pick KEPT and edited to a Step stop and a moved bias, exported as
 *        GMT gradient (.png): the PNG decodes (node) to the working config exactly, with the hero's
 *        name; loaded back through the collection menu's "Import gradient file…" picker while the
 *        catalogue (All) is on the ground, it comes back as the SAME config and name, in Kept, and
 *        the ground SWITCHES to Kept (the chip pressed).
 *   [b]  the same PNG with its text chunks stripped (in node) DROPPED on the wall imports as a ramp
 *        gradient whose display texels equal the original's exactly, and does NOT open the Image
 *        face; [b2] a plain PNG dropped the same way still goes to image extraction (the Image face
 *        opens) and adds nothing to the shelf.
 *   [c]  the owner's bug: with All on the ground, a CSS file picked through the same menu lands in
 *        Kept and the view switches to Kept.
 *   [d]  a `.gxsession.json` (saved through Settings ▸ Files ▸ Session) DROPPED on the wall opens as
 *        the working session — the other gradient picked since is replaced by the saved one — and
 *        one Undo puts the other back (the Settings Load undo behaviour).
 *   [e]  Save collection (.png) decodes (node) to every favourite; Clear, then Replace from file…
 *        with that PNG restores the shelf's count and names; the menu offers no "(.json)" save.
 *   [g1] (2026-09-14) recents stored by an older build — a GMT .json, the ramp's PNG strip, a
 *        repeat — are dropped on load: Again shows one row, no pageerror, storage written back.
 *   [g2] the window's order: subject switch → Again → For GMT (one .png row); no image section.
 *   [g3] the GMT PNG's size: 1000 typed shows 1024 on blur; 512 × 40 (the height committed by
 *        clicking the row straight from the field) downloads a 512 × 40 PNG whose stripped copy
 *        reads back with exact colours; the size is remembered.
 *   [g4] NO REPEATS: CSS linear-gradient twice and CSS variables once → Again is exactly CSS
 *        variables · CSS linear-gradient · GMT gradient, once each, extensions .css .css .png, the
 *        stored list has no repeat, and the hero's hover flyout reads the same three, once each.
 *   [f]  on a Pixel 5, Export ▸ GMT gradient (.png) is on screen, and tapping it downloads a PNG that
 *        decodes to the hero's gradient.
 *
 * FALSIFIED 2026-09-14 against a broken build, each reverted:
 *   - (a) `exportActions.runGradientFile` writing each stop WITHOUT its bias and interpolation →
 *     red "[a] the downloaded PNG does not carry the working config" (the dump shows the 0.75 bias
 *     and the Step stop gone). [a0] stays green through it — an unedited pick has neither.
 *   - (c) the reveal in `GradientExplorerV2App.finishImport` removed → red at [a] "the ground did
 *     not switch to Kept after the import (all)"; run again with [a]'s two reveal checks disabled,
 *     red at [c] "a CSS import on All left the ground on all — the import is invisible".
 *   - (d) `finishImport` not calling `loadGxSessionText` → red "[d] the dropped session did not
 *     open".
 *   - (b) the shell's `preRoute` not passed to `useImageDrop` (so a PNG goes straight to image
 *     extraction, as before ADR-0123) → red "[b] the stripped PNG did not import (added 0 …)".
 *
 * [g1]–[g4] FALSIFIED 2026-09-14 against `gradient-explorer/v2/exportActions.ts`, each reverted:
 *   - `dedupeRecents` returning the list undeduped → red "[g1] stale recents should leave ONE row
 *     … Again shows download:css:ramp | download:css:ramp";
 *   - `exportActionParts` naming only the extension → red "[g4] Again rows should name their
 *     format — got .css | .css | GMT gradient";
 *   - `runGradientFile` not passing the size → red "[g3] the GMT PNG at 512 × 40 downloaded as
 *     1024 × 128";
 *   - `isAction` admitting any `gmt` recent → red "[g1] … Again shows gmt:json | download:css:ramp".
 *
 * Wants `npm run dev` on port 3400. No bare-URL module imports, so an edited store module does not
 * put it in the dual-instance state.
 *
 * Run: `npm run smoke:ge-gradientfile`.
 */
import fs from 'fs';
import { chromium, devices, type Page, type BrowserContext } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';
import { readGradientPng, displayRampBytes } from '../palette/core/gradientPng';
import { stripPngText, encodePng, readPngText, readPngHeader } from '../utils/pngCodec';
import type { GradientConfig } from '../types';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
const RECENT = 'g-recent';

const fail = (msg: string): never => {
  console.log(`✗ ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};

interface Fav { id: string; name: string; group?: string; config: GradientConfig; origin?: { credit?: string } }

/** A config as a comparable string: every stop's position, colour, bias and interpolation, the
 *  two spaces and a ramp's texels. Ids are not part of a gradient. */
const sig = (c: GradientConfig | null | undefined): string =>
  JSON.stringify({
    stops: (c?.stops ?? []).map((s) => [Number(s.position).toFixed(9), String(s.color).toUpperCase(), s.bias ?? 0.5, s.interpolation ?? 'linear']),
    colorSpace: c?.colorSpace ?? 'srgb',
    blendSpace: c?.blendSpace ?? null,
    ramp: (c as { ramp?: unknown } | null | undefined)?.ramp ?? null,
  });

const favs = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gmt.favients') ?? '[]')) as Promise<Fav[]>;
const kept = async (page: Page) => (await favs(page)).filter((f) => (f.group ?? '') !== 'g-recent');
const groundIds = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gmt.ge.groundSet') ?? '["all"]')) as Promise<string[]>;
const chipPressed = (page: Page, id: string) =>
  page.evaluate((i) => document.querySelector(`[data-gx-set="${CSS.escape(i)}"]`)?.getAttribute('aria-pressed') === 'true', id);
const working = (page: Page) =>
  page.evaluate(() => {
    const w = (window as any).__gxWorking?.();
    return w ? { kind: w.input.kind as string, config: w.config as GradientConfig, name: (document.querySelector('[data-gx-hero] input') as HTMLInputElement | null)?.value ?? '' } : null;
  });
const toasts = (page: Page) =>
  page.evaluate(() => Array.from(document.querySelectorAll('button[title="Dismiss"]')).map((b) => b.textContent ?? '').join(' | '));

const settle = async (page: Page, ms = 1500) => {
  await page.waitForTimeout(ms);
};

/** Click a wall tile (the wall is canvas-drawn). */
const pickTile = async (page: Page, dx = 24, dy = 14, tap = false) => {
  const wall = page.locator('[data-gx-keepselect] canvas').first();
  await wall.waitFor({ state: 'visible', timeout: 15000 });
  const b = (await wall.boundingBox())!;
  if (tap) await page.touchscreen.tap(b.x + dx, b.y + dy);
  else await page.mouse.click(b.x + dx, b.y + dy);
  await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('no hero after a wall click'));
  await page.waitForTimeout(600);
};

const openExport = async (page: Page, tap = false) => {
  await page.mouse.move(5, 5);
  const btn = page.locator('[data-gx-hero] [title^="Export"]').first();
  if (tap) await btn.tap(); else await btn.click();
  await page.waitForSelector('[data-gx-export-gmt]', { timeout: 5000 }).catch(() => fail('the Export window opened without the For GMT band'));
};

const download = async (page: Page, click: () => Promise<void>) => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), click()]);
  const p = await dl.path();
  return { name: dl.suggestedFilename(), bytes: new Uint8Array(fs.readFileSync(p!)) };
};

/** The rail's collection kebab, then one of its items. */
const kebab = async (page: Page, label: string | RegExp) => {
  await page.locator('button[title="Collection — save, load, export"]').first().click();
  await page.waitForTimeout(250);
  return page.locator('button', { hasText: label }).first();
};

const pickFileThroughMenu = async (page: Page, label: string | RegExp, file: { name: string; mimeType: string; buffer: Buffer }) => {
  const item = await kebab(page, label);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }), item.click()]);
  await chooser.setFiles(file);
  await page.waitForTimeout(900);
};

/** A drop on the wall as the browser delivers one: a DataTransfer of Files on dragover + drop. */
const dropOnWall = async (page: Page, files: { name: string; type: string; bytes: Uint8Array }[]) => {
  await page.evaluate(
    (list) => {
      const dt = new DataTransfer();
      for (const f of list) {
        const bin = atob(f.b64);
        const u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        dt.items.add(new File([u], f.name, { type: f.type }));
      }
      const target = document.querySelector('[data-gx-keepselect] canvas') ?? document.body;
      target.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
      target.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    },
    files.map((f) => ({ name: f.name, type: f.type, b64: Buffer.from(f.bytes).toString('base64') })),
  );
  await page.waitForTimeout(1200);
};

async function openSessionSettings(page: Page): Promise<void> {
  const gear = page.locator('header button[title="Settings"]').first();
  await gear.click();
  const files = page.locator('button', { hasText: /^Files$/ }).first();
  await files.waitFor({ state: 'visible', timeout: 5000 }).catch(() => fail('Settings opened with no Files tab'));
  await files.click();
  await page.waitForTimeout(300);
}
const rowButton = (page: Page, label: string) =>
  page.locator('div.justify-between', { has: page.locator(`text="${label}"`) }).locator('button').first();

const newPage = async (ctx: BrowserContext, errors: string[]) => {
  await seedGeSmokeState(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('dialog', (d) => void d.accept());
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await settle(page);
  return page;
};

let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

async function main() {
  const b = await chromium.launch();
  browser = b;
  const errors: string[] = [];
  const ctx = await b.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
  const page = await newPage(ctx, errors);

  // [a0] an unmodified pick: plain name, origin carried, credit in the filename; the band first
  await pickTile(page);
  const w0 = (await working(page))!;
  await openExport(page);
  const order = await page.evaluate(() => {
    const w = document.querySelector('[data-gx-export]')!;
    const band = w.querySelector('[data-gx-export-gmt]')!;
    const firstSection = w.querySelector('[data-gx-section]');
    const rows = Array.from(band.querySelectorAll('[data-gx-gmtfile]')).map((e) => (e as HTMLElement).dataset.gxGmtfile);
    return {
      bandFirst: !!firstSection && !!(band.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING),
      rows,
      labels: Array.from(band.querySelectorAll('[data-gx-gmtfile]')).map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim()),
      other: !!w.querySelector('[data-gx-export-other]'),
    };
  });
  if (!order.bandFirst) fail('[a0] the For GMT band is not above the registry sections');
  if (order.rows.join(',') !== 'png') fail(`[a0] the GMT rows are ${order.rows.join(',')}, expected the PNG alone (no .json row since 2026-09-14)`);
  if (!order.other) fail('[a0] nothing labels the registry formats as exports to other software');
  const j = await download(page, () => page.click('[data-gx-export] [data-gx-gmtfile="png"]'));
  const read0 = readGradientPng(j.bytes);
  if (read0.kind !== 'document' || read0.gradients.length !== 1) fail(`[a0] the .png is not a one-gradient GMT document (${j.name}, ${read0.kind})`);
  const doc0 = read0.kind === 'document' ? read0.gradients[0] : null;
  if (doc0!.name !== w0.name) fail(`[a0] the file names the gradient "${doc0!.name}", the hero says "${w0.name}"`);
  const credit = (doc0!.origin as { credit?: string } | undefined)?.credit;
  if (!credit) fail('[a0] an unmodified catalogue pick saved without its origin — the credit would not survive');
  if (!j.name.endsWith('.png')) fail(`[a0] the PNG download is named "${j.name}"`);
  if (!j.name.includes(credit!.split('/')[0].split(' ')[0].replace(/[()]/g, ''))) fail(`[a0] the filename "${j.name}" lost the credit ("${credit}")`);
  if (sig(doc0!.config) !== sig(w0.config)) fail('[a0] the .png config is not the working config');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  console.log(`✓ [a0] For GMT sits first with ONE row (png); "${j.name}" carries "${w0.name}" plain with origin "${credit}"`);

  // [a] keep it, give it a Step stop and a moved bias, export the PNG, pick it back in on All
  await pickTile(page); // the second click keeps (bakes) it
  const knots = await page.$$('[data-gx-knot]');
  if (knots.length < 2) fail(`[a] the kept gradient shows ${knots.length} knots`);
  await knots[1].click();
  await page.waitForTimeout(400);
  await page.locator('select:has(option[value="step"])').first().selectOption('step');
  await page.waitForTimeout(300);
  const biasTrack = async () => (await page.locator('[data-input-skin="soft"]:has(label:text-is("Bias"))').first().locator('.cursor-ew-resize').first().boundingBox())!;
  let bt = await biasTrack();
  await page.mouse.click(bt.x + bt.width * 0.2, bt.y + bt.height / 2);
  await page.waitForTimeout(300);
  await knots[0].click();
  await page.waitForTimeout(400);
  bt = await biasTrack();
  await page.mouse.click(bt.x + bt.width * 0.75, bt.y + bt.height / 2);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const w1 = (await working(page))!;
  const stops1 = w1.config.stops ?? [];
  if (!stops1.some((s) => s.interpolation === 'step')) fail(`[a] the edit left no Step stop (${JSON.stringify(stops1)})`);
  if (!stops1.some((s) => Math.abs((s.bias ?? 0.5) - 0.5) > 0.05)) fail(`[a] the edit left every bias at 0.5 (${JSON.stringify(stops1)})`);
  await openExport(page);
  const png = await download(page, () => page.click('[data-gx-export] [data-gx-gmtfile="png"]'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  if (!png.name.endsWith('.png')) fail(`[a] the PNG download is named "${png.name}"`);
  const read = readGradientPng(png.bytes);
  if (read.kind !== 'document' || read.gradients.length !== 1) fail(`[a] the downloaded PNG is not a one-gradient GMT file (${read.kind})`);
  if (read.kind === 'document' && sig(read.gradients[0].config) !== sig(w1.config))
    fail(`[a] the downloaded PNG does not carry the working config\n    file    ${sig(read.kind === 'document' ? read.gradients[0].config : null)}\n    working ${sig(w1.config)}`);
  if (read.kind === 'document' && read.gradients[0].name !== w1.name) fail(`[a] the PNG names it "${read.gradients[0].name}", the hero "${w1.name}"`);
  // back in, through the real picker, with the catalogue on the ground
  await page.click('[data-gx-set="all"]').catch(() => undefined);
  await page.waitForTimeout(400);
  if ((await groundIds(page)).join() !== 'all') fail(`[a] could not put All on the ground (${(await groundIds(page)).join()})`);
  const keptBefore = (await kept(page)).length;
  await pickFileThroughMenu(page, 'Import gradient file…', { name: png.name, mimeType: 'image/png', buffer: Buffer.from(png.bytes) });
  const keptA = await kept(page);
  const back = keptA.find((f) => f.name === w1.name && sig(f.config) === sig(w1.config));
  if (keptA.length !== keptBefore + 1) fail(`[a] the picker import added ${keptA.length - keptBefore} gradients (toasts: ${await toasts(page)})`);
  if (!back) fail(`[a] no favourite came back as "${w1.name}" with the same config (names: ${keptA.map((f) => f.name).join(', ')})`);
  if ((back!.group ?? '') !== '') fail(`[a] it landed in group "${back!.group}", not Kept`);
  if ((await groundIds(page)).join() !== 'group:') fail(`[a] the ground did not switch to Kept after the import (${(await groundIds(page)).join()})`);
  if (!(await chipPressed(page, 'group:'))) fail('[a] the Kept chip is not pressed after the import');
  console.log(`✓ [a] "${w1.name}" with a Step stop and a moved bias → ${png.name} → picked back in: same config, same name, in Kept, and Kept is on the ground`);

  // [b] the stripped copy, dropped on the wall: exact colours, no Image face
  const stripped = stripPngText(png.bytes)!;
  if (readPngText(stripped, 'gmt-gradients') !== null) fail('[b] stripping left the metadata in');
  const keptB0 = (await kept(page)).length;
  await dropOnWall(page, [{ name: 'stripped copy.png', type: 'image/png', bytes: stripped }]);
  const keptB = await kept(page);
  const ramp = keptB.find((f) => f.name === 'stripped copy');
  if (keptB.length !== keptB0 + 1 || !ramp) fail(`[b] the stripped PNG did not import (added ${keptB.length - keptB0}; toasts: ${await toasts(page)})`);
  if ((ramp!.config.stops ?? []).length) fail('[b] a stripped PNG came back with stops — it should be a ramp gradient');
  const a = displayRampBytes(ramp!.config);
  const e = displayRampBytes(w1.config);
  let worst = 0;
  for (let i = 0; i < e.length; i++) worst = Math.max(worst, Math.abs(a[i] - e[i]));
  if (worst !== 0) fail(`[b] the stripped copy's colours differ from the original by up to ${worst} levels`);
  if ((await working(page))!.kind === 'extract') fail('[b] the gradient PNG was also sent to image extraction');
  console.log('✓ [b] the metadata-stripped PNG dropped on the wall imports as a ramp gradient with exact colours, and no image extraction');

  // [b2] a plain PNG still goes to image extraction
  const W = 64, H = 32;
  const px = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 3; px[o] = x * 4; px[o + 1] = y * 8; px[o + 2] = 128; }
  const keptB2 = (await kept(page)).length;
  await dropOnWall(page, [{ name: 'photo.png', type: 'image/png', bytes: encodePng(W, H, px) }]);
  await page.waitForFunction(() => (window as any).__gxWorking?.().input.kind === 'extract', undefined, { timeout: 8000 }).catch(() => fail(`[b2] a plain PNG dropped did not reach image extraction (toasts: ${'see page'})`));
  if ((await kept(page)).length !== keptB2) fail('[b2] a plain PNG added something to the shelf');
  if (/carries no gradient/i.test(await toasts(page))) fail('[b2] a plain PNG going to extraction was reported as a dead end');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  console.log('✓ [b2] a plain PNG dropped the same way still opens the Image face and adds nothing');

  // [c] the owner's bug: on All, a CSS file lands in Kept and the view follows
  await page.click('[data-gx-set="all"]');
  await page.waitForTimeout(400);
  if ((await groundIds(page)).join() !== 'all') fail('[c] could not put All on the ground');
  const keptC0 = (await kept(page)).length;
  const css = 'background: linear-gradient(90deg, #0b3d5c 0%, #3fa7a0 45%, #f2e6c9 100%);\n';
  await pickFileThroughMenu(page, 'Import gradient file…', { name: 'Tidal_Pool.css', mimeType: 'text/css', buffer: Buffer.from(css) });
  const keptC = await kept(page);
  if (keptC.length !== keptC0 + 1) fail(`[c] the CSS import added ${keptC.length - keptC0} (toasts: ${await toasts(page)})`);
  const tidal = keptC.find((f) => f.name === 'Tidal Pool');
  if (!tidal || (tidal.group ?? '') !== '') fail(`[c] no "Tidal Pool" in Kept (names: ${keptC.map((f) => f.name).join(', ')})`);
  if ((await groundIds(page)).join() !== 'group:') fail(`[c] a CSS import on All left the ground on ${(await groundIds(page)).join()} — the import is invisible`);
  if (!(await chipPressed(page, 'group:'))) fail('[c] the Kept chip is not pressed after the CSS import');
  console.log(`✓ [c] a CSS file picked in on All lands in Kept as "${tidal!.name}" and the ground switches to it`);

  // [d] a session file dropped opens as the session, one Undo puts the other back
  await page.click('[data-gx-set="all"]');
  await page.waitForTimeout(400);
  await pickTile(page, 24 + 34 * 6, 14 + 20 * 3);
  const mine = (await working(page))!;
  await openSessionSettings(page);
  const saveBtn = rowButton(page, 'Save session to a file');
  if (!(await saveBtn.count())) fail('[d] no "Save session to a file" row');
  const sess = await download(page, () => saveBtn.click());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await pickTile(page, 24 + 34 * 12, 14 + 20 * 6);
  const other = (await working(page))!;
  if (sig(other.config) === sig(mine.config)) fail('[d] the second pick is the same gradient — pick another tile');
  const keptD0 = (await kept(page)).length;
  await dropOnWall(page, [{ name: sess.name, type: 'application/json', bytes: sess.bytes }]);
  const opened = (await working(page))!;
  if (sig(opened.config) !== sig(mine.config)) fail(`[d] the dropped session did not open (toasts: ${await toasts(page)})`);
  if ((await kept(page)).length !== keptD0) fail('[d] a session file added gradients to the shelf');
  await page.click('header button[title^="Undo"]');
  await page.waitForTimeout(700);
  const undone = (await working(page))!;
  if (sig(undone.config) !== sig(other.config)) fail('[d] one Undo after the dropped session did not put the other gradient back');
  console.log(`✓ [d] ${sess.name} dropped on the wall opened as the session, and one Undo put the other gradient back`);

  // [e] Save collection (.png) → Clear → Replace from that file
  const before = await favs(page);
  const saved = await download(page, async () => (await kebab(page, 'Save collection (.png)')).click());
  const col = readGradientPng(saved.bytes);
  if (col.kind !== 'document' || col.gradients.length !== before.length) fail(`[e] the collection PNG holds ${col.kind === 'document' ? col.gradients.length : col.kind}, the shelf ${before.length}`);
  await (await kebab(page, 'Clear collection')).click();
  await page.waitForTimeout(600);
  if ((await favs(page)).length !== 0) fail(`[e] Clear left ${(await favs(page)).length}`);
  await pickFileThroughMenu(page, 'Replace from file…', { name: saved.name, mimeType: 'image/png', buffer: Buffer.from(saved.bytes) });
  const after = await favs(page);
  const names = (l: Fav[]) => l.map((f) => `${f.group ?? ''}/${f.name}`).sort().join('|');
  if (after.length !== before.length) fail(`[e] Replace from the PNG restored ${after.length} of ${before.length} (toasts: ${await toasts(page)})`);
  if (names(after) !== names(before)) fail('[e] Replace restored the count but not the same gradients in the same sets');
  console.log(`✓ [e] ${saved.name} (${before.length} gradients) → Clear → Replace from file restored all ${after.length}, sets included`);
  const pngItem = await kebab(page, 'Save collection (.png)'); // opens the menu
  if (!(await pngItem.count())) fail('[e] the collection menu has no "Save collection (.png)"');
  const jsonItems = await page.locator('button', { hasText: 'Save collection (.json)' }).count();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  if (jsonItems) fail('[e] the collection menu still offers "Save collection (.json)" — PNG only since 2026-09-14');

  // [g1] STALE RECENTS: the removed kinds (a GMT .json, the ramp's PNG strip) and a repeat, seeded
  // as an older build stored them, are dropped on load — one row, no pageerror — and the storage is
  // written back clean.
  await page.evaluate(() =>
    localStorage.setItem(
      'gx.v2.recentExports',
      JSON.stringify([{ kind: 'gmt', file: 'json' }, { kind: 'png' }, { kind: 'download', key: 'css' }, { kind: 'download', key: 'css' }, { kind: 'png', subject: 'ramp' }]),
    ),
  );
  await page.reload({ waitUntil: 'networkidle' });
  await settle(page);
  await page.click('[data-gx-set="all"]').catch(() => undefined);
  await page.waitForTimeout(400);
  await pickTile(page);
  const wg = (await working(page))!;
  await openExport(page);
  const againState = () =>
    page.evaluate(() => {
      const w = document.querySelector('[data-gx-export]')!;
      const again = w.querySelector('[data-gx-export-again]');
      const gmt = w.querySelector('[data-gx-export-gmt]');
      const sw = w.querySelector('[data-gx-export-subject]');
      const rows = Array.from(w.querySelectorAll('[data-gx-again]')) as HTMLElement[];
      // (no named helper functions in here: tsx's keepNames wraps them in `__name`, which the page lacks)
      return {
        ids: rows.map((r) => r.dataset.gxAgain ?? ''),
        labels: rows.map((r) => (r.querySelector('span')?.textContent ?? '').trim()),
        exts: rows.map((r) => (r.querySelector('.w-10')?.textContent ?? '').trim()),
        againAboveGmt: !!again && !!gmt && !!(again.compareDocumentPosition(gmt) & Node.DOCUMENT_POSITION_FOLLOWING),
        switchAboveAgain: !!sw && !!again && !!(sw.compareDocumentPosition(again) & Node.DOCUMENT_POSITION_FOLLOWING),
        gmtRows: Array.from(w.querySelectorAll('[data-gx-gmtfile]')).map((e) => (e as HTMLElement).dataset.gxGmtfile),
        imageSection: /As an image|PNG strip|Contact sheet/.test((w as HTMLElement).innerText),
        stored: JSON.parse(localStorage.getItem('gx.v2.recentExports') ?? '[]') as { kind: string; key?: string; file?: string; subject?: string }[],
      };
    });
  const g1 = await againState();
  if (g1.ids.join('|') !== 'download:css:ramp') fail(`[g1] stale recents should leave ONE row (download:css:ramp), Again shows ${g1.ids.join(' | ') || 'nothing'}`);
  if (g1.stored.length !== 1) fail(`[g1] the stored recents were not written back clean (${JSON.stringify(g1.stored)})`);
  if (errors.length) fail(`[g1] pageerror: ${errors.join(' | ')}`);
  console.log('✓ [g1] a stored GMT .json, PNG strip and a repeat are dropped on load: Again shows one row, storage rewritten');

  // [g2] THE ORDER: the subject switch, then Again, then For GMT with ONE row; no image section.
  if (!g1.switchAboveAgain || !g1.againAboveGmt) fail(`[g2] the order is wrong (switch above Again ${g1.switchAboveAgain}, Again above For GMT ${g1.againAboveGmt})`);
  if (g1.gmtRows.join(',') !== 'png') fail(`[g2] For GMT rows: ${g1.gmtRows.join(',')}`);
  if (g1.imageSection) fail('[g2] the "As an image" section (PNG strip / contact sheet) is still in the Ramp window');
  console.log('✓ [g2] switch → Again → For GMT (one .png row), and no image section');

  // [g3] THE SIZE: 1000 typed snaps to 1024 on blur; 512 × 40 (the height committed by clicking the
  // row without leaving the field) downloads a 512 × 40 PNG whose stripped copy reads back exact.
  const wField = page.locator('[data-gx-export] [data-gx-png-size-field="w"]');
  const hField = page.locator('[data-gx-export] [data-gx-png-size-field="h"]');
  if (!(await wField.count()) || !(await hField.count())) fail('[g3] no size fields under the GMT gradient row');
  await wField.fill('1000');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(150);
  if ((await wField.inputValue()) !== '1024') fail(`[g3] a 1000 width shows ${await wField.inputValue()} after blur, expected the snapped 1024`);
  await wField.fill('512');
  await page.keyboard.press('Tab');
  await hField.fill('40');
  const sized = await download(page, () => page.click('[data-gx-export] [data-gx-gmtfile="png"]'));
  const sh = readPngHeader(sized.bytes)!;
  if (sh.width !== 512 || sh.height !== 40) fail(`[g3] the GMT PNG at 512 × 40 downloaded as ${sh.width} × ${sh.height}`);
  const sread = readGradientPng(stripPngText(sized.bytes)!);
  if (sread.kind !== 'bands' || sread.configs.length !== 1) fail(`[g3] the stripped 512 × 40 PNG does not read as one gradient (${sread.kind})`);
  const sa = displayRampBytes(sread.kind === 'bands' ? sread.configs[0] : wg.config);
  const se = displayRampBytes(wg.config);
  let sworst = 0;
  for (let i = 0; i < se.length; i++) sworst = Math.max(sworst, Math.abs(sa[i] - se[i]));
  if (sworst !== 0) fail(`[g3] the stripped 512 × 40 copy's colours differ by up to ${sworst} levels`);
  const settingsStored = await page.evaluate(() => JSON.parse(localStorage.getItem('gx.v2.exportSettings') ?? '{}'));
  if (settingsStored.pngW !== 512 || settingsStored.pngH !== 40) fail(`[g3] the size was not remembered (${JSON.stringify(settingsStored)})`);
  console.log(`✓ [g3] 1000 → 1024 on blur; 512 × 40 → ${sized.name} is 512 × 40 and its stripped copy reads back exact`);

  // [g4] NO REPEATS: CSS linear-gradient twice and CSS variables once → Again holds each export ONCE,
  // each row naming its FORMAT (both are .css).
  if (!(await page.$('[data-gx-export] [data-gx-download="css"]'))) await page.click('[data-gx-export] [data-gx-section="For the web"]');
  await page.waitForSelector('[data-gx-export] [data-gx-download="css"]', { timeout: 3000 }).catch(() => fail('[g4] the For the web section would not open'));
  await download(page, () => page.click('[data-gx-export] [data-gx-download="css"]'));
  await download(page, () => page.click('[data-gx-export] [data-gx-download="css"]'));
  await download(page, () => page.click('[data-gx-export] [data-gx-download="cssvars"]'));
  await page.waitForTimeout(200);
  const g4 = await againState();
  const dupes = g4.ids.filter((id, i) => g4.ids.indexOf(id) !== i);
  if (dupes.length) fail(`[g4] Again repeats ${dupes.join(', ')} (rows: ${g4.labels.join(' | ')})`);
  if (g4.ids.join('|') !== 'download:cssvars:ramp|download:css:ramp|gmt:png') fail(`[g4] Again should be cssvars, css, gmt newest first — got ${g4.ids.join(' | ')}`);
  if (g4.labels.join('|') !== 'CSS variables|CSS linear-gradient|GMT gradient') fail(`[g4] Again rows should name their format — got ${g4.labels.join(' | ')}`);
  if (g4.exts.join('|') !== '.css|.css|.png') fail(`[g4] Again's extension column reads ${g4.exts.join(' | ')}`);
  const storedIds = g4.stored.map((a) => `${a.kind}:${a.key ?? a.file}:${a.subject ?? ''}`);
  if (new Set(storedIds).size !== storedIds.length) fail(`[g4] the stored recents hold a repeat (${storedIds.join(' | ')})`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // the hero's hover flyout shares the source
  await page.mouse.move(5, 5);
  await page.locator('[data-gx-hero] [title^="Export"]').first().hover();
  await page.waitForSelector('[data-gx-export-recent]', { timeout: 3000 }).catch(() => fail('[g4] the Export hover flyout did not open'));
  const fly = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-gx-export-recent] button')).map((b) => (b as HTMLElement).innerText.trim()).filter((t) => !/^All formats/.test(t)),
  );
  if (new Set(fly).size !== fly.length || fly.join('|') !== 'Download CSS variables .css|Download CSS linear-gradient .css|Download GMT gradient .png')
    fail(`[g4] the hover flyout reads ${fly.join(' | ')}`);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  console.log(`✓ [g4] css ×2 + cssvars → Again: ${g4.labels.join(' · ')} (once each); the flyout: ${fly.join(' · ')}`);

  if (errors.length) fail(`pageerror: ${errors.join(' | ')}`);
  await ctx.close();

  // [f] a phone reaches Export ▸ GMT gradient
  const PW = 393, PH = 727;
  const pctx = await b.newContext({ ...devices['Pixel 5'], viewport: { width: PW, height: PH }, acceptDownloads: true });
  const phone = await newPage(pctx, errors);
  await pickTile(phone, 40, 20, true);
  const wp = (await working(phone))!;
  await openExport(phone, true);
  const row = await phone.locator('[data-gx-gmtfile="png"]').boundingBox();
  if (!row || row.x < 0 || row.y < 0 || row.x + row.width > PW + 1 || row.y + row.height > PH + 1) fail(`[f] GMT gradient (.png) is not on the phone screen (${JSON.stringify(row)})`);
  const pp = await download(phone, () => phone.locator('[data-gx-gmtfile="png"]').tap());
  const pr = readGradientPng(pp.bytes);
  if (pr.kind !== 'document' || sig(pr.gradients[0].config) !== sig(wp.config)) fail('[f] the phone download is not the hero gradient as a GMT file');
  if (errors.length) fail(`pageerror: ${errors.join(' | ')}`);
  console.log(`✓ [f] on a Pixel 5, Export ▸ GMT gradient (.png) is on screen and downloads ${pp.name}`);
  await pctx.close();

  await b.close();
  console.log('\nPASS — the GMT gradient file saves from Export and Save collection, and every entrance reads it back where you can see it');
}

main()
  .catch((err) => {
    if (!process.exitCode) console.log(`✗ ${err?.message ?? err}`);
    process.exitCode = 1;
  })
  // a red run must still exit: an open browser keeps node alive
  .finally(() => browser?.close().catch(() => undefined));
