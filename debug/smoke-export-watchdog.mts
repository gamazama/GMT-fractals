/**
 * Smoke test: the per-frame stall watchdog on `renderExportFrame`
 * (engine-gmt/engine/worker/WorkerProxy.ts) and the EXPORT_HEARTBEAT it keys
 * on (engine-gmt/engine/worker/WorkerExporter.ts `renderOnePass`).
 *
 * Part A drives the REAL WorkerProxy class on a fresh instance with no worker
 * (`post()` queues into the outbox, so the live render worker is never
 * touched), feeding synthetic worker messages through `_handleWorkerMessage`
 * with a 400 ms window instead of the 60 s default:
 *   A1  silent frame → rejects within the window, names frame + window,
 *       drops isExporting, and queues EXPORT_CANCEL for the worker
 *   A2  a frame that keeps beating outlives the window; once the beats stop
 *       it rejects
 *   A3  EXPORT_FRAME_DONE resolves, disarms, and no late cancel follows
 *   A4  stallMs: 0 disables the watchdog (the documented escape hatch)
 *   A5  a worker crash mid-frame rejects AND clears the watchdog
 *   A6  no opts → the EXPORT_FRAME_STALL_MS default is what gets armed
 *
 * Part B renders one real export frame on the live worker (`window.__gmtProxy`,
 * headless SwiftShader): PNG sequence into an OPFS directory, 64×64, 8
 * samples. The exporter must post ≥1 EXPORT_HEARTBEAT for any frame with ≥2
 * samples (the first beat is the cost-measuring one after sample 0) and the
 * frame must resolve. This does NOT prove a beat tracks real GPU progress —
 * SwiftShader has no meaningful asynchronous queue; see the @assumption on
 * `renderOnePass`.
 *
 * Falsified 2026-09-02: removing the arm in `renderExportFrame` left A1 and
 * A2 PENDING (red); removing the postMsg in `renderOnePass` gave B 0 beats
 * (red).
 *
 * Run:  npx tsx debug/smoke-export-watchdog.mts     (dev server on :3400)
 *
 * NOTE: page.evaluate bodies are strings on purpose — tsx/esbuild annotates
 * named inner functions with a `__name` helper that does not exist in the
 * browser eval context.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';

const failures: string[] = [];
const ok = (cond: boolean, msg: string) => {
    if (cond) console.log(`  ✓ ${msg}`);
    else { console.log(`  ✗ ${msg}`); failures.push(msg); }
};

const browser = await chromium.launch({ args: ['--disable-gpu-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
const page = await context.newPage();

const errors: string[] = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
// Part A only needs the module; Part B needs the booted worker. Wait once.
await page.waitForFunction(() => {
    const p = (window as any).__gmtProxy;
    return !!(p && p.isBooted && p.hasCompiledShader && p.frameCount > 0);
}, { timeout: 40000 });

// ─── Part A: fresh proxy, synthetic messages ─────────────────────────────
console.log('Part A — WorkerProxy stall watchdog (fresh instance, no worker)');
const A = await page.evaluate(`(async function () {
    const mod = await import('/engine-gmt/engine/worker/WorkerProxy.ts');
    const WorkerProxy = mod.WorkerProxy;
    if (!WorkerProxy) return { fatal: 'WorkerProxy not exported' };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const race = (p, ms) => Promise.race([
        p.then(v => ({ state: 'resolved', value: v }), e => ({ state: 'rejected', message: e.message })),
        sleep(ms).then(() => ({ state: 'pending' })),
    ]);
    // Pretend the worker had booted so a synthetic crash does not emit
    // WORKER_BOOT_FAILED onto the live app bus.
    const mkProxy = () => { const p = new WorkerProxy(); p._shadow.isBooted = true; return p; };
    const outboxTypes = (p) => p._outbox.map(m => m.msg.type);
    const CAM = { position: [0, 0, 0], quaternion: [0, 0, 0, 1], fov: 60, aspect: 1 };
    const OFF = { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
    const beat = (p) => p._handleWorkerMessage({ type: 'EXPORT_HEARTBEAT', frameIndex: 0, sample: 1, samples: 2 });
    const out = {};

    // A1 — silent frame
    {
        const p = mkProxy();
        p._isExporting = true;
        const t0 = performance.now();
        const fp = p.renderExportFrame(3, 0, CAM, OFF, {}, {}, { stallMs: 400 });
        fp.catch(() => {});
        out.A1_armed = p._exportFrameWatch !== null;
        out.A1 = await race(fp, 1500);
        out.A1_ms = Math.round(performance.now() - t0);
        out.A1_isExporting = p.isExporting;
        out.A1_outbox = outboxTypes(p);
        out.A1_watchCleared = p._exportFrameWatch === null;
    }
    // A2 — beating frame, then silence
    {
        const p = mkProxy();
        const fp = p.renderExportFrame(0, 0, CAM, OFF, {}, {}, { stallMs: 400 });
        fp.catch(() => {});
        const iv = setInterval(() => beat(p), 100);
        out.A2_whileBeating = await race(fp, 1200);
        clearInterval(iv);
        const t0 = performance.now();
        out.A2_afterSilence = await race(fp, 1500);
        out.A2_ms = Math.round(performance.now() - t0);
    }
    // A3 — FRAME_DONE settles + disarms, no late cancel
    {
        const p = mkProxy();
        const fp = p.renderExportFrame(0, 0, CAM, OFF, {}, {}, { stallMs: 400 });
        fp.catch(() => {});
        p._handleWorkerMessage({ type: 'EXPORT_FRAME_DONE', frameIndex: 0, progress: 50, measuredDistance: 1 });
        out.A3 = await race(fp, 500);
        out.A3_watchCleared = p._exportFrameWatch === null;
        await sleep(700);
        out.A3_outbox = outboxTypes(p);
    }
    // A4 — stallMs 0 disables
    {
        const p = mkProxy();
        const fp = p.renderExportFrame(0, 0, CAM, OFF, {}, {}, { stallMs: 0 });
        fp.catch(() => {});
        out.A4_armed = p._exportFrameWatch !== null;
        out.A4 = await race(fp, 800);
    }
    // A5 — crash mid-frame
    {
        const p = mkProxy();
        const fp = p.renderExportFrame(0, 0, CAM, OFF, {}, {}, { stallMs: 400 });
        fp.catch(() => {});
        p.terminateWorker();
        out.A5 = await race(fp, 500);
        out.A5_watchCleared = p._exportFrameWatch === null;
    }
    // A6 — default window
    {
        const p = mkProxy();
        const fp = p.renderExportFrame(0, 0, CAM, OFF, {}, {});
        fp.catch(() => {});
        out.A6_armedMs = p._exportFrameWatch ? p._exportFrameWatch.stallMs : null;
        out.A6_const = mod.EXPORT_FRAME_STALL_MS;
        p._handleWorkerMessage({ type: 'EXPORT_FRAME_DONE', frameIndex: 0, progress: 100, measuredDistance: 1 });
        await fp;
    }
    return out;
})()`) as any;

if (A.fatal) {
    ok(false, `Part A: ${A.fatal}`);
} else {
    ok(A.A1_armed === true, 'A1 watchdog armed on renderExportFrame');
    ok(A.A1?.state === 'rejected', `A1 silent frame rejects within the window (${A.A1?.state} after ${A.A1_ms} ms)`);
    ok(/frame 3/.test(A.A1?.message ?? '') && /0\.4 s/.test(A.A1?.message ?? ''),
        `A1 message names frame + window: "${A.A1?.message}"`);
    ok(A.A1_isExporting === false, 'A1 trip drops isExporting');
    ok(Array.isArray(A.A1_outbox) && A.A1_outbox.includes('EXPORT_CANCEL'),
        `A1 trip queues EXPORT_CANCEL for the worker (outbox: ${JSON.stringify(A.A1_outbox)})`);
    ok(A.A1_watchCleared === true, 'A1 watchdog cleared after trip');

    ok(A.A2_whileBeating?.state === 'pending', `A2 stays pending while beating (3× the window): ${A.A2_whileBeating?.state}`);
    ok(A.A2_afterSilence?.state === 'rejected', `A2 rejects once beats stop (${A.A2_afterSilence?.state} after ${A.A2_ms} ms)`);

    ok(A.A3?.state === 'resolved', `A3 FRAME_DONE resolves: ${A.A3?.state}`);
    ok(A.A3_watchCleared === true, 'A3 watchdog disarmed on FRAME_DONE');
    ok(Array.isArray(A.A3_outbox) && !A.A3_outbox.includes('EXPORT_CANCEL'),
        `A3 no late EXPORT_CANCEL after the window (outbox: ${JSON.stringify(A.A3_outbox)})`);

    ok(A.A4_armed === false, 'A4 stallMs 0 leaves the watchdog unarmed');
    ok(A.A4?.state === 'pending', `A4 disabled watchdog never trips: ${A.A4?.state}`);

    ok(A.A5?.state === 'rejected' && /crash/i.test(A.A5?.message ?? ''), `A5 crash mid-frame rejects: "${A.A5?.message}"`);
    ok(A.A5_watchCleared === true, 'A5 crash clears the watchdog');

    ok(typeof A.A6_const === 'number' && A.A6_armedMs === A.A6_const && A.A6_const >= 30000,
        `A6 default window is EXPORT_FRAME_STALL_MS (${A.A6_const} ms)`);
}

// ─── Part B: one real export frame on the live worker ────────────────────
console.log('Part B — live worker posts EXPORT_HEARTBEAT during a frame');
const B = await page.evaluate(`(async function () {
    const p = window.__gmtProxy;
    const { VIDEO_FORMATS } = await import('/data/constants.ts');
    const formatIndex = VIDEO_FORMATS.findIndex(f => f.container === 'png');
    if (formatIndex < 0) return { error: 'no PNG sequence format' };

    const root = await navigator.storage.getDirectory();
    const DIR = 'smoke-export-watchdog';
    try { await root.removeEntry(DIR, { recursive: true }); } catch {}
    const dir = await root.getDirectoryHandle(DIR, { create: true });

    const beats = [];
    const orig = p._handleWorkerMessage;
    p._handleWorkerMessage = function (msg) {
        if (msg && msg.type === 'EXPORT_HEARTBEAT') beats.push({ frameIndex: msg.frameIndex, sample: msg.sample, samples: msg.samples });
        return orig.call(this, msg);
    };

    const out = {};
    const cfg = {
        width: 64, height: 64, fps: 24, bitrate: 1, samples: 8,
        startFrame: 0, endFrame: 0, frameStep: 1, formatIndex, internalScale: 1,
        passes: ['beauty'], imageSequenceBaseName: 'smoke',
    };
    const CAM = { position: [0, 0, 3], quaternion: [0, 0, 0, 1], fov: 60, aspect: 1 };
    const OFF = { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
    try {
        await p.startExport(cfg, null, dir);
        out.started = true;
        const t0 = performance.now();
        out.frame = await p.renderExportFrame(0, 0, CAM, OFF, {}, {});
        out.frameMs = Math.round(performance.now() - t0);
        await p.finishExport();
        out.finished = true;
        const names = [];
        for await (const [name] of dir.entries()) names.push(name);
        out.files = names;
    } catch (e) {
        out.error = e && e.message ? e.message : String(e);
        try { p.cancelExport(); } catch {}
    } finally {
        p._handleWorkerMessage = orig;
        try { await root.removeEntry(DIR, { recursive: true }); } catch {}
    }
    out.beats = beats;
    out.isExporting = p.isExporting;
    return out;
})()`) as any;

ok(B.started === true && !B.error, `B export session started + frame ran${B.error ? ` — error: ${B.error}` : ''}`);
ok(B.frame?.frameIndex === 0, `B frame resolved (frameIndex ${B.frame?.frameIndex}, ${B.frameMs} ms)`);
ok(Array.isArray(B.beats) && B.beats.length >= 1,
    `B live worker posted ≥1 EXPORT_HEARTBEAT (${B.beats?.length ?? 0}: ${JSON.stringify(B.beats)})`);
ok(B.beats?.[0]?.frameIndex === 0 && B.beats?.[0]?.sample === 1 && B.beats?.[0]?.samples === 8,
    'B first beat is the sample-0 measurement beat for frame 0 of 8 samples');
ok(B.finished === true && Array.isArray(B.files) && B.files.length >= 1,
    `B finishExport completed and wrote ${B.files?.length ?? 0} file(s)`);
ok(B.isExporting === false, 'B isExporting dropped after finish');

console.log('\n── Page errors ──');
console.log(errors.length ? errors.join('\n') : '(none)');
await browser.close();

if (failures.length || errors.length) {
    console.log(`\nFAIL — ${failures.length} assertion(s), ${errors.length} page error(s)`);
    process.exit(1);
}
console.log('\nOK — export stall watchdog + heartbeat');
process.exit(0);
