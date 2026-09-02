/**
 * Guard: TickRegistry dispatch.
 *
 * `runTicks` is called inline by the tick driver BEFORE it serialises the
 * camera and dispatches the worker frame, so what the loop does with a
 * throwing tick decides whether a broken gizmo reads as "a gizmo is broken"
 * or as "the renderer hung". Nothing else exercises the registry outside a
 * browser: the anim smokes drive it through app-gmt and cannot inject a throw.
 *
 * Pinned here:
 *   [1] ticks run in phase order (SNAPSHOT → ANIMATE → OVERLAY → UI) and the
 *       manifest reports the same order;
 *   [2] a throwing tick is isolated — later ticks in the same frame still run,
 *       the throwing tick keeps being called on later frames, and it is
 *       reported via console.error exactly once per name, not per frame;
 *   [3] the disposer removes the tick;
 *   [4] the double-run guard suppresses a second runTicks within
 *       DOUBLE_RUN_WINDOW_MS (1 ms) — this is the trap the audit named for a
 *       frame-stepping harness: space synthetic frames more than 1 ms apart.
 *
 * Run: `npm run test:tick-registry`
 *
 * ── FALSIFIED 2026-09-02 ─────────────────────────────────────────────────
 *   Against the bare `for … _entries[i].fn(delta)` loop: the process died on
 *   the first synthetic frame with `Error: boom` before any block-2 assertion
 *   ran (exit 1). With the try/catch in place: all green. Then, with the
 *   once-per-name set removed so the error logged every frame: block 2's
 *   "reported once" assertion red (3 reports), everything else green.
 */
import { registerTick, runTicks, getTickManifest, TICK_PHASE } from '../engine/TickRegistry';

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const fail = (m: string) => { failures++; console.log(`  ✗ ${m}`); };
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
// Frames must be > DOUBLE_RUN_WINDOW_MS apart or the guard swallows them (block 4).
const frame = async (dt = 1 / 60) => { await sleep(3); runTicks(dt); };

const reported: string[] = [];
const realError = console.error;
console.error = (...args: unknown[]) => { reported.push(args.map(a => (a instanceof Error ? a.message : String(a))).join(' ')); };

console.log('Block 1 — phase order');
{
    const log: string[] = [];
    const un = [
        registerTick('t-ui', TICK_PHASE.UI, () => log.push('ui')),
        registerTick('t-snapshot', TICK_PHASE.SNAPSHOT, () => log.push('snapshot')),
        registerTick('t-overlay', TICK_PHASE.OVERLAY, () => log.push('overlay')),
        registerTick('t-animate', TICK_PHASE.ANIMATE, () => log.push('animate')),
    ];
    await frame();
    const want = 'snapshot,animate,overlay,ui';
    if (log.join(',') === want) ok(`ticks ran in phase order: ${want}`);
    else fail(`ticks ran as ${log.join(',')}, expected ${want}`);
    const manifest = getTickManifest().map(e => `${e.phase}:${e.name}`).join(',');
    const wantManifest = 'SNAPSHOT:t-snapshot,ANIMATE:t-animate,OVERLAY:t-overlay,UI:t-ui';
    if (manifest === wantManifest) ok('getTickManifest reports the same order');
    else fail(`getTickManifest reports ${manifest}, expected ${wantManifest}`);
    un.forEach(u => u());
}

console.log('\nBlock 2 — a throwing tick is isolated');
{
    let boomCalls = 0;
    const laterCalls: number[] = [];
    const unBoom = registerTick('t-boom', TICK_PHASE.ANIMATE, () => { boomCalls++; throw new Error('boom'); });
    const unLater = registerTick('t-later', TICK_PHASE.UI, (dt) => laterCalls.push(dt));
    for (let i = 0; i < 3; i++) await frame(0.5);
    if (laterCalls.length === 3) ok('later ticks still ran every frame (3 of 3)');
    else fail(`later ticks ran ${laterCalls.length} of 3 frames — a throw upstream took the frame down`);
    if (boomCalls === 3) ok('the throwing tick keeps being called (3 of 3)');
    else fail(`the throwing tick was called ${boomCalls} of 3 times`);
    const reports = reported.filter(r => r.includes('t-boom'));
    if (reports.length === 1) ok('the throwing tick was reported once, not per frame');
    else fail(`the throwing tick was reported ${reports.length} time(s), expected exactly 1`);
    if (reports[0]?.includes('boom')) ok('the report carries the original error');
    else fail(`the report does not carry the original error: ${reports[0] ?? '(none)'}`);
    unBoom(); unLater();
}

console.log('\nBlock 3 — the disposer removes the tick');
{
    let calls = 0;
    const un = registerTick('t-gone', TICK_PHASE.UI, () => { calls++; });
    await frame();
    un();
    await frame();
    if (calls === 1) ok('disposed tick stopped running');
    else fail(`disposed tick ran ${calls} time(s), expected 1`);
}

console.log('\nBlock 4 — the double-run guard suppresses a second call within 1 ms');
{
    let calls = 0;
    const un = registerTick('t-double', TICK_PHASE.UI, () => { calls++; });
    await sleep(3);
    runTicks(1 / 60);
    runTicks(1 / 60);
    if (calls === 1) ok('second runTicks within DOUBLE_RUN_WINDOW_MS was suppressed');
    else fail(`tick ran ${calls} time(s) for two back-to-back runTicks, expected 1`);
    un();
}

console.error = realError;
console.log(failures === 0 ? '\nPASS — tick registry dispatch holds' : `\nFAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
