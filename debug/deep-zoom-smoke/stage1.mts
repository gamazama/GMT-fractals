/**
 * Stage 1 of smoke:deep-zoom: the shell boots on the engine's own chrome with the renderer in the
 * viewport, stepped by the engine's tick, and it flies.
 *
 * Run by `debug/smoke-deep-zoom.mts` (the runner; its header has the step shape, the `ctx` API and
 * the pitfalls). Alone:  ENGINE_URL=http://localhost:3410 npm run smoke:deep-zoom -- --stage 1
 * One step:              ... -- --stage 1 --step "press C"
 *
 * The steps are the stage-1 row of "Smoke growth" in plans/deep-zoom-shell/BUILD-PLAN.md, plus the
 * things only a browser can confirm about the module host (the canvas's size, the camera strings
 * on the real module). How it flies - keys, the look drag, the wheel - is stage N5's file. Each `falsified` field says how that step was seen red.
 *
 * WHAT IS NOT HERE, ON PURPOSE
 *   - Flying. "Hold W, the camera strings change" was a step here until N5; it could not tell
 *     who flew (seen 2026-10-08: green with the shell's navigation unmounted, the module's own
 *     keys moved it). Stage N5's first step can: it holds W with the keyboard on the page body.
 *   - A dive. `host.diveTo` from the boot view lands about 250 times off its target (measured
 *     2026-10-08: the module's distance estimate flips between its f32 and deep modes near 1e-4).
 *   - A lost graphics context (one loss remounts, a second inside a minute shows the card). Probed
 *     once by hand on 2026-10-08; no step.
 *
 * NOTES FOR WHOEVER EDITS A STEP
 *   - Until 2026-10-08 the picture at boot was the f32 baseline, which never accumulates; steps
 *     about the still call `enterDeepView` for that reason. The deep path draws the start view
 *     now and accumulates there too, so new steps need not.
 *   - Every step sets what it needs at its start, so it can run alone and in any order.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { DzCtx, DzStage } from '../smoke-deep-zoom.mts';
import type { DzTelemetry, DzView } from '../../deep-zoom/host/DeepZoomHost';

/**
 * A view that is deep at once and holds its own iteration count, so the picture switches to
 * perturbation and accumulates without flying there. COPIED AS DATA from
 * `deep-zoom-prototype/ui/starters.ts`, `STARTERS[3].view` ("Grain of sand · 1e-30", a frame of the
 * frozen page's sample flight); that folder is deleted in stage 7, so it is not imported.
 * Measured in the shell on 2026-10-08: depth 1.14e-17, mode deep, 64 of 64 samples in about 1.3 s.
 */
export const DEEP_VIEW: DzView = {
    cam: [
        '-19106688270107545123610310944093228319268234083931764161217485625786859879978',
        '2056390632353041980388441420253193046898375110266709396020905008395931668174',
        '106035815535807686550824900054021630250672589610944549407697460964969796977517',
    ],
    yaw: -1.0130614516955045,
    pitch: -0.412169332221097,
    iters: 56,
    power: 8,
    phase: [0, 0],
    light: 0,
    falloff: 4,
    color: 0,
    cscale: 1,
    surf: 1,
};

const DEPTH_TEXT = /^\d\.\d\de-?\d+$/;
const RENAME_BUTTON = 'header button[title="Click to rename project"]';

const cam = (ctx: DzCtx) => ctx.host<string[]>('getView().cam');
const same = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
const short = (c: string[]) => c.map((v) => v.slice(0, 12) + '…(' + v.length + ')').join(', ');

/** Put the camera on `DEEP_VIEW` and wait for the perturbation picture. False when it never came. */
export async function enterDeepView(ctx: DzCtx): Promise<boolean> {
    await ctx.withHost('host.setView(' + JSON.stringify(DEEP_VIEW) + '); return true;');
    // The mode alone says nothing since 2026-10-08 (the deep path draws every depth): wait until a
    // frame has run AT the new view - its distance is under 1e-10 - or a step that reads the
    // picture next measures the old view, or the still of the old view.
    const waited = await ctx.untilHost("host.telemetry().mode === 'deep' && host.telemetry().depth < 1e-10", 20_000, 50);
    return ctx.check(waited >= 0, 'host.setView(a deep view): the deep path is drawing it' + (waited >= 0 ? ' (' + waited + ' ms)' : ' (not after 20 s)'));
}

/** Import specifiers of one source file, comments stripped. The same patterns as
 *  `extractSpecifiers` in plans/context-protocol/scripts/reachability.mjs. */
function importSpecifiers(src: string): string[] {
    const text = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    const out: string[] = [];
    const patterns = [
        /\bimport\s+[^'";]*?\bfrom\s*['"]([^'"]+)['"]/g,
        /\bexport\s+[^'";]*?\bfrom\s*['"]([^'"]+)['"]/g,
        /\bimport\s*['"]([^'"]+)['"]/g,
        /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];
    for (const re of patterns) for (const m of text.matchAll(re)) out.push(m[1]);
    return out;
}

/** Repo-relative source files under `dir` (forward slashes). */
function sourceFiles(root: string, dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        const rel = dir + '/' + entry.name;
        if (entry.isDirectory()) out.push(...sourceFiles(root, rel));
        else if (/\.(ts|tsx|mts|js|jsx|mjs)$/.test(entry.name)) out.push(rel);
    }
    return out;
}

/** The files among `files` that import `deep-zoom/renderer` (the folder or a file in it). */
function rendererImporters(root: string, files: string[]): string[] {
    return files.filter((file) => importSpecifiers(fs.readFileSync(path.join(root, file), 'utf8')).some((spec) => {
        const target = spec.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), spec))
            : spec.startsWith('@/') ? spec.slice(2) : spec;
        return target === 'deep-zoom/renderer' || target.startsWith('deep-zoom/renderer/');
    }));
}

export const stage: DzStage = {
    id: '1',
    title: 'the shell boots on the engine chrome with the renderer in the viewport, and flies',
    steps: [
        {
            name: 'host.ready resolves inside 120 s of loading the page',
            quick: true,
            owner: 'S1-1',
            falsified: '2026-10-08: the `registerTick` call removed from DeepZoomSurface.tsx -> "host.ready resolved: no frame ran in the 15.0 s after the host appeared" and "the promise of the host now in the holder is resolved (pending)". The third check stayed green: the module\'s compile poll runs on a timer, not on frames.',
            async run(ctx) {
                const b = ctx.bootInfo;
                ctx.check(b.ready && b.readyMs <= 120_000, b.ready
                    ? 'host.ready resolved ' + b.readyMs + ' ms after the navigation (host in the holder after ' + b.hostMs + ' ms)'
                    : 'host.ready resolved: ' + b.readyError);
                const now = await ctx.withHost<string>(
                    "return Promise.race([host.ready.then(() => 'resolved', (e) => 'rejected: ' + ((e && e.message) || e)), new Promise((r) => setTimeout(() => r('pending'), 2000))]);",
                );
                ctx.check(now === 'resolved', 'the promise of the host now in the holder is resolved (' + now + ')');
                const tel = await ctx.host<DzTelemetry>('telemetry()');
                ctx.check(tel.ready === true && tel.error === '', 'telemetry says the deep shader compiled (ready ' + tel.ready + ', error "' + tel.error + '")');
            },
        },
        {
            name: 'exactly one canvas#dz-render-canvas, a child of #dz-frame, and it is the host\'s (StrictMode left one)',
            quick: true,
            owner: 'S1-1',
            falsified: '2026-10-08: `canvas.remove()` taken out of `dispose` in host/moduleHost.ts -> "one canvas#dz-render-canvas in the document (found 2)" (StrictMode\'s first mount left its canvas behind) and "it is the canvas the mounted host draws on" red.',
            async run(ctx) {
                const d = await ctx.withHost<{ count: number; parent: string | null; hosts: boolean; mount: string | null }>(
                    "const cs = document.querySelectorAll('canvas#dz-render-canvas'); const f = document.getElementById('dz-frame');"
                    + ' return { count: cs.length, parent: cs[0] && cs[0].parentElement ? cs[0].parentElement.id : null,'
                    + " hosts: cs[0] === host.canvas(), mount: f ? f.getAttribute('data-dz-mount') : null };",
                );
                ctx.check(d.count === 1, 'one canvas#dz-render-canvas in the document (found ' + d.count + ')');
                ctx.check(d.parent === 'dz-frame', 'its parent is #dz-frame (parent id: ' + d.parent + ')');
                ctx.check(d.hosts, 'it is the canvas the mounted host draws on');
                ctx.note('frame remount count (data-dz-mount): ' + d.mount);
            },
        },
        {
            name: 'the TopBarHost header exists, and room is taken beside the picture only where a panel is docked (stage 1 docks none)',
            owner: 'S1-2',
            falsified: '2026-10-08, two breaks in DeepZoomApp.tsx, one run: `<TopBarHost />` removed -> "one <header> across the window (0 found, 0 of 1280 px)"; a 120 px wide div put beside the viewport frame -> "right of the picture: 120 px taken, 0 panel(s) docked right []". Not tried: `components/layout/Dock.tsx` drawing a dock with no panel (an engine file other builders were using that night).',
            async run(ctx) {
                // A dock is found by the room it takes, not by a class: `components/layout/Dock.tsx`
                // returns null for a side with no panel, and its surface class is used by many
                // other components. Panels are counted by their stored location; a later stage
                // that docks a panel behind a `showIf` refines this count.
                const d = await ctx.ev<{ headers: number; headerW: number; winW: number; leftGap: number; rightGap: number; left: string[]; right: string[] }>(
                    "(() => { const hs = document.querySelectorAll('header'); const r = document.getElementById('dz-frame').getBoundingClientRect();"
                    + ' const panels = Object.values(window.__store.getState().panels);'
                    + ' return { headers: hs.length, headerW: hs[0] ? Math.round(hs[0].getBoundingClientRect().width) : 0, winW: window.innerWidth,'
                    + ' leftGap: Math.round(r.left), rightGap: Math.round(window.innerWidth - r.right),'
                    + " left: panels.filter((p) => p.location === 'left').map((p) => p.id), right: panels.filter((p) => p.location === 'right').map((p) => p.id) }; })()",
                );
                ctx.check(d.headers === 1 && d.headerW >= d.winW * 0.9, 'one <header> across the window (' + d.headers + ' found, ' + d.headerW + ' of ' + d.winW + ' px)');
                ctx.check((d.leftGap > 1) === (d.left.length > 0), 'left of the picture: ' + d.leftGap + ' px taken, ' + d.left.length + ' panel(s) docked left [' + d.left.join(', ') + ']');
                ctx.check((d.rightGap > 1) === (d.right.length > 0), 'right of the picture: ' + d.rightGap + ' px taken, ' + d.right.length + ' panel(s) docked right [' + d.right.join(', ') + ']');
            },
        },
        {
            name: 'the adaptive-resolution badge is absent from the top bar',
            owner: 'S1-2',
            falsified: '2026-10-08: `topbar.unregister(\'adaptive\')` commented out in main.tsx -> "none of them is the adaptive-resolution badge" red (9 titled controls, one of them "Adaptive Resolution: Off ...").',
            async run(ctx) {
                // The badge is found by its title. If the engine renames the title this step would
                // pass for the wrong reason, so the title is first checked against the badge's source.
                const src = fs.readFileSync(path.join(ctx.root, 'engine/plugins/viewport/AdaptiveResolutionBadge.tsx'), 'utf8');
                ctx.check(src.includes('title={`Adaptive Resolution:'), 'the engine\'s badge still carries the title this step looks for ("Adaptive Resolution: ...")');
                const titles = await ctx.ev<string[]>("[...document.querySelectorAll('header [title]')].map((e) => e.getAttribute('title').split('\\n')[0])");
                ctx.check(titles.length > 0, 'the top bar has titled controls (' + titles.length + ': ' + titles.map((t) => t.slice(0, 28)).join(' | ') + ')');
                ctx.check(!titles.some((t) => t.startsWith('Adaptive Resolution')), 'none of them is the adaptive-resolution badge');
            },
        },
        {
            name: 'telemetry depth is a finite positive number',
            quick: true,
            owner: 'S1-1',
            falsified: '2026-10-08: `telemetry` in host/moduleHost.ts made to answer `depth: NaN` -> "host.telemetry().depth = NaN". A contrived break: the number comes straight from the module.',
            async run(ctx) {
                const tel = await ctx.host<DzTelemetry>('telemetry()');
                ctx.check(Number.isFinite(tel.depth) && tel.depth > 0, 'host.telemetry().depth = ' + tel.depth + ' (mode ' + tel.mode + ', frame ' + tel.frameW + ' x ' + tel.frameH + ')');
            },
        },
        {
            name: 'host.frameCount() rises while the engine loop runs',
            owner: 'S1-2',
            falsified: '2026-10-08: the `registerTick` call removed from DeepZoomSurface.tsx -> "frameCount 0 -> 0 in 1 s".',
            async run(ctx) {
                const a = await ctx.host<number>('frameCount()');
                await ctx.sleep(1000);
                const b = await ctx.host<number>('frameCount()');
                ctx.check(b > a, 'frameCount ' + a + ' -> ' + b + ' in 1 s');
            },
        },
        {
            name: 'the top-bar fps reads above 0',
            owner: 'S1-2',
            falsified: '2026-10-08: the `viewport.reportRenderFps(t.live ? ...)` line removed from DeepZoomSurface.tsx -> \'the fps counter in the header reads "-- FPS"\'. The same red with the tick removed.',
            async run(ctx) {
                const read = "([...document.querySelectorAll('header [role=button]')].map((e) => e.innerText.trim()).find((t) => /FPS$/.test(t)) || '')";
                const waited = await ctx.until('/^[1-9]\\d* FPS$/.test(' + read + ')', 4000, 100);
                const text = await ctx.ev<string>(read);
                ctx.check(waited >= 0, 'the fps counter in the header reads "' + text + '"');
            },
        },
        {
            // Until 2026-10-17 this was "the status chip shows a depth that matches ...": the chip held the depth, the
            // path, the iterations and the size drawn. They went to Diagnostics and the depth to the picture
            // (STREAMLINE.md stage 4); the chip says only how far the still has gathered.
            name: 'the depth on the picture matches /^\\d\\.\\d\\de-?\\d+$/, and the top-bar chip says only how far the still has gathered',
            owner: 'S1-2; the chip: streamline stage 4',
            falsified: '2026-10-08, as the chip\'s step: `.replace(\'e+\', \'e\')` dropped from `formatDepth` -> \'its depth text is "1.11e+0"\'. With the tick removed: "the chip is in the header" red. As rewritten (2026-10-17) not seen red: the depth line is the same formatter\'s.',
            async run(ctx) {
                const waited = await ctx.until("document.querySelector('[data-dz-depth]')", 4000, 100);
                const depth = (await ctx.ev<string>("(document.querySelector('[data-dz-depth]') || { textContent: '' }).textContent")).trim();
                ctx.check(waited >= 0 && DEPTH_TEXT.test(depth), 'the depth on the picture is "' + depth + '"');
                // A move restarts the still: the chip shows its progress, and nothing once it is gathered.
                await ctx.withHost('host.moveAlong([0, 1, 0], 1e-3); return true;');
                const chip = "(document.querySelector('header [data-dz-status]') || { innerText: '' }).innerText.trim()";
                const gathering = await ctx.until('/^still \\d+ \\/ \\d+$/.test(' + chip + ')', 3000, 10);
                ctx.check(gathering >= 0, 'while the still gathers the chip reads "still n / 64" and nothing else');
                const done = await ctx.until("!document.querySelector('header [data-dz-status-still]')", 15_000, 100);
                ctx.check(done >= 0, 'once it is gathered the chip shows nothing ("' + (await ctx.ev<string>(chip)) + '")');
            },
        },
        {
            name: 'hold w 1 s in the project-name field: the field takes the letter and the cam strings are unchanged',
            owner: 'S1-1',
            falsified: 'not falsified: with `keyTarget` dropped, the break BUILD-PLAN names for this step, it stayed GREEN on 2026-10-08. The field stops the key itself (grep `e.stopPropagation()` in engine/plugins/topbar/ProjectName.tsx; the Feedback form does the same through `stopNavKeys`), so a listener on window never hears it. It can only go red with that engine line removed as well. The `keyTarget` seam is guarded by the step before this one.',
            async run(ctx) {
                await ctx.page.click(RENAME_BUTTON, { timeout: 5000 });
                const editing = await ctx.until("document.activeElement && document.activeElement.tagName === 'INPUT' && !!document.activeElement.closest('header')", 2000, 50);
                ctx.check(editing >= 0, 'the project-name field is open and focused');
                const before = await cam(ctx);
                await ctx.holdKey('w', 1000);
                await ctx.sleep(200);
                const after = await cam(ctx);
                const typed = await ctx.ev<string>("document.activeElement && document.activeElement.tagName === 'INPUT' ? document.activeElement.value : '(no field)'");
                ctx.check(typed.includes('w'), 'the field took the letter (its text is "' + typed + '")');
                ctx.check(same(before, after), 'cam strings equal before and after');
                // Escape cancels the edit without renaming the project.
                await ctx.page.keyboard.press('Escape');
                const closed = await ctx.until("!document.querySelector('header input')", 2000, 50);
                ctx.check(closed >= 0 && (await ctx.store<string>('projectSettings.name')) !== typed, 'Escape closed the field and the project was not renamed');
            },
        },
        {
            // Rewritten in stage 4: this step pressed C until C became the shell's own "next
            // colouring" key. N is a renderer shortcut (next normals mode) the shell does not bind.
            name: 'press N with the picture focused: the shortcut of the renderer is off (normals unchanged)',
            owner: 'S1-1',
            falsified: '2026-10-08, after N5: TWO things keep the renderer\'s shortcuts off now, `shortcuts: false` in `shellOptions` (host/moduleHost.ts) and the input owner (under \'host\' the module reads no key at all). With `shortcuts: true` alone the step stays GREEN; with that and the `host.setInputOwner(\'host\')` call removed from DeepZoomNavigation.tsx -> red, "normals 2 -> 3". Before N5 the first break alone was red.',
            async run(ctx) {
                ctx.check(await ctx.focusPicture(), '#dz-frame takes the keyboard focus');
                const before = await ctx.host<number>('getParams().normals');
                await ctx.page.keyboard.press('n');
                await ctx.sleep(300);
                const after = await ctx.host<number>('getParams().normals');
                ctx.check(typeof before === 'number' && before === after, 'normals ' + before + ' -> ' + after);
            },
        },
        {
            name: 'camera strings set through host.setView come back byte-identical from getView',
            quick: true,
            owner: 'S1-1',
            falsified: '2026-10-08: `getView` in host/moduleHost.ts made to send one `cam` value through `String(Number(...))` -> red, the first string came back as "-1.910668827…" (23 characters instead of 78).',
            async run(ctx) {
                await ctx.withHost('host.setView(' + JSON.stringify(DEEP_VIEW) + '); return true;');
                const frames = await ctx.host<number>('frameCount()');
                await ctx.untilHost('host.frameCount() > ' + (frames + 10), 5000, 50);   // through the frame loop, not only the setter
                const back = await cam(ctx);
                ctx.check(same(back, DEEP_VIEW.cam), 'strings of ' + DEEP_VIEW.cam.map((v) => v.length).join(', ') + ' characters sent; back after 10 frames: ' + short(back));
            },
        },
        {
            name: 'in a deep view the canvas still fills #dz-frame',
            owner: 'S1-1',
            falsified: '2026-10-08: `h-full w-full` dropped from the canvas\'s classes in `mountDeepZoom` (host/moduleHost.ts) -> "canvas box [0, 56, 320, 186] equals the frame box [0, 56, 1280, 744]" red: the deep picture is drawn at 320 x 186 and was shown at that size.',
            async run(ctx) {
                if (!(await enterDeepView(ctx))) return;
                await ctx.sleep(300);
                const d = await ctx.ev<{ frame: number[]; canvas: number[]; buffer: number[] }>(
                    "(() => { const f = document.getElementById('dz-frame').getBoundingClientRect(); const c = document.getElementById('dz-render-canvas'); const r = c.getBoundingClientRect();"
                    + ' return { frame: [f.left, f.top, f.width, f.height].map(Math.round), canvas: [r.left, r.top, r.width, r.height].map(Math.round), buffer: [c.width, c.height] }; })()',
                );
                ctx.note('drawn at ' + d.buffer.join(' x ') + ', shown at ' + d.canvas[2] + ' x ' + d.canvas[3]);
                ctx.check(d.frame.every((v, i) => Math.abs(v - d.canvas[i]) <= 1), 'canvas box [' + d.canvas.join(', ') + '] equals the frame box [' + d.frame.join(', ') + ']');
            },
        },
        {
            name: 'a deep still passes 32 samples; a window resize drops accumN back and the still starts again',
            owner: 'S1-1',
            falsified: '2026-10-08: `resetStillOnResize: true` dropped from `shellOptions` (host/moduleHost.ts) -> "accumN dropped back (33 -> 47)" red: readings 47 53 58 62 64 64 ..., the still never restarted.',
            async run(ctx) {
                if (!(await enterDeepView(ctx))) return;
                const waited = await ctx.untilHost('host.telemetry().accumN > 32', 20_000, 50);
                const before = await ctx.host<number>('telemetry().accumN');
                if (!ctx.check(waited >= 0, 'accumN passed 32 (' + before + ' after ' + waited + ' ms)')) return;
                await ctx.shot('stage1-deep-still');
                const samples: number[] = [];
                try {
                    await ctx.page.setViewportSize({ width: 1180, height: 760 });
                    for (let i = 0; i < 20; i++) {
                        samples.push(await ctx.host<number>('telemetry().accumN'));
                        await ctx.sleep(75);
                    }
                } finally {
                    await ctx.page.setViewportSize({ width: 1280, height: 800 });
                }
                // The resize restarts the still more than once in its first half second, so it is the
                // lowest reading that shows the drop, and a later, higher one that shows the restart.
                const low = Math.min(...samples);
                const lowAt = samples.indexOf(low);
                ctx.note('accumN ' + before + ', then every 75 ms after the resize: ' + samples.join(' '));
                if (!ctx.check(low < before && low <= 16, 'accumN dropped back (' + before + ' -> ' + low + ')')) return;
                ctx.check(Math.max(...samples.slice(lowAt)) > low, 'and the still is accumulating again (' + low + ' -> ' + Math.max(...samples.slice(lowAt)) + ')');
            },
        },
        {
            name: 'source: deep-zoom/renderer is imported only under deep-zoom/host/',
            quick: true,
            owner: 'S1-0',
            falsified: '2026-10-08: `import type { DzView as X } from \'./renderer\'` added to DeepZoomApp.tsx -> "14 shell files outside deep-zoom/host/ scanned, importing the renderer: deep-zoom/DeepZoomApp.tsx".',
            async run(ctx) {
                // Scoped to deep-zoom/ on purpose: debug/deep-zoom-checks/host-contract-types.ts
                // imports the renderer's types to compare them with the contract's.
                const all = sourceFiles(ctx.root, 'deep-zoom').filter((f) => !f.startsWith('deep-zoom/renderer/'));
                const shell = all.filter((f) => !f.startsWith('deep-zoom/host/'));
                const hostSide = rendererImporters(ctx.root, all.filter((f) => f.startsWith('deep-zoom/host/')));
                ctx.check(hostSide.length > 0, 'the scan sees the import it allows (' + (hostSide.join(', ') || 'none found under deep-zoom/host/') + ')');
                const offenders = rendererImporters(ctx.root, shell);
                ctx.check(shell.length > 0 && offenders.length === 0, shell.length + ' shell files outside deep-zoom/host/ scanned' + (offenders.length ? ', importing the renderer: ' + offenders.join(', ') : ', none imports the renderer'));
            },
        },
        {
            name: 'no pageerror and no "[TickRegistry] tick ... threw" console line since the stage began',
            owner: 'S1-2',
            falsified: '2026-10-08, two breaks in DeepZoomSurface.tsx, one run each: the tick made to throw after stepping -> "throwing-tick lines 1" red while the picture kept drawing (frameCount 34 -> 95 in the same run); an uncaught error thrown from a timer in the mount effect -> "pageerror count 2" red. The runner\'s own closing line went red both times as well.',
            async run(ctx) {
                const a = await ctx.host<number>('frameCount()');
                await ctx.sleep(500);
                ctx.check((await ctx.host<number>('frameCount()')) > a, 'the loop is running while this is read');
                const brief = (s: string) => s.replace(/\s+/g, ' ').slice(0, 200);
                ctx.check(ctx.pageErrors.length === 0, 'pageerror count ' + ctx.pageErrors.length + (ctx.pageErrors.length ? ': ' + brief(ctx.pageErrors[0]) : ''));
                const threw = ctx.consoleLines.filter((l) => /^\[TickRegistry\] tick "[^"]+" threw/.test(l.text));
                ctx.check(threw.length === 0, 'throwing-tick lines ' + threw.length + (threw.length ? ': ' + brief(threw[0].text) : ''));
                const byType = new Map<string, number>();
                for (const l of ctx.consoleLines) byType.set(l.type, (byType.get(l.type) ?? 0) + 1);
                ctx.note('console so far: ' + ([...byType].map(([t, n]) => n + ' ' + t).join(', ') || 'nothing'));
            },
        },
    ],
};
