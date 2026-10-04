/**
 * bench-audio — what does audio modulation cost, and where?
 *
 * Boots app-gmt in real headed Chrome on the real GPU, pins a scene, then runs
 * a list of scenarios and reads every layer of the pipeline for each one:
 *
 *   main thread   rAF rate + gap p95/max, long tasks, busy % (CDP TaskDuration /
 *                 ScriptDuration deltas), store notifications, liveModulations
 *                 publishes, messages posted to workers by type
 *   render worker frames delivered, GPU ms per frame (timer query), fence
 *                 latency, achieved frame gap, tick CPU, gate skips, messages
 *                 received by type + CPU spent handling them, internal render
 *                 size — all from the worker's own probe
 *                 (engine-gmt/engine/worker/framePerf.ts)
 *   audio thread  worklet batches + hops delivered, drops, signal present
 *   GPU, outside  Windows per-process GPU-engine utilisation (3D / copy /
 *                 video decode / encode), sampled from outside Chrome; and
 *                 `nvidia-smi` where present — whole-GPU utilisation, power
 *                 draw, core clock and P-state. Power and clock are the ground
 *                 truth for "is the GPU actually working": a card idling at
 *                 300 MHz in P8 makes every frame slower than the same frame
 *                 on a card that has clocked up.
 *
 * SCENARIOS (`--scenarios=a,b,c`, run in the order given; repeat names to ABAB):
 *   still        nothing modulated, infinite accumulation
 *   idle         nothing modulated, converged (sample cap 8) — the loop stops
 *                dispatching, so anything still presenting is the page itself
 *   lfo          N LFOs on the targets, no audio stack at all — THE CONTROL:
 *                "a param changes every frame" with none of the audio code
 *   audio-idle   audio on + a deck playing, no rules
 *   audio        deck playing + N audio rules on the same targets
 *   audio-hover  `audio` with the pointer wandering over the canvas
 *   audio-panel  `audio` with the Audio panel open
 *   mic          Chrome's fake capture device through the mic path + N rules
 *
 * Any scenario takes an `@fg` / `@bg` suffix (`lfo@fg,lfo@bg`) that puts the
 * bench window in the OS foreground or behind the window that had focus when
 * the bench started. Without a suffix the window is left wherever it is — and
 * every row records `fg` (was this Chrome the foreground app), because OS
 * focus changes how Chrome schedules and presents the canvas, and a run that
 * silently lost focus halfway through reads as a regression that isn't one.
 *
 * `lfo` against `audio` is the comparison that isolates the audio stack: same
 * params moving every frame, same render path, the only difference is where
 * the signal comes from.
 *
 * THE PRESENT PROBE. After each scenario's window the bench takes a 1.5 s
 * Chrome trace (gpu + viz only) and reads the GPU process's main thread:
 * `swaps` (compositor presents per second), `presentMs` (mean time blocked in
 * the DXGI swap-chain Present) and `gpuMainBusy` (% of that thread spent
 * busy). This is the state variable everything else follows from: every WebGL
 * context's commands are decoded on that one thread, so when it sits blocked
 * in Present for ~15 of every 16.7 ms, the worker's fence takes four vsyncs to
 * come back and a 6 ms frame is delivered at 14 fps. `--no-present-probe`
 * skips it.
 *
 * WHY NOT FRAMES PER SECOND. Delivered frames are an OUTPUT of two governors:
 * the frames-in-flight gate (a tick is skipped while the previous frame is
 * still on the GPU) and adaptive resolution (which trades pixels for rate
 * against `quality.adaptiveTarget`, default 30). Two runs can deliver the same
 * frames/s at different resolutions, or different frames/s for the same cost.
 * So this bench pins adaptive (`--adaptive=off` by default → full-res frames)
 * and leads with GPU ms per frame, which is a cost. With `--adaptive=<fps>` it
 * reports megapixels/s — rate × internal resolution — as the throughput figure.
 *
 * MEASUREMENT HYGIENE, each learned the hard way (2026-10-04):
 *   - Another process on the GPU invalidates everything. The bench samples
 *     GPU utilisation before launching and refuses to run above
 *     `--gpu-busy-limit` (default 15 % 3D) unless `--force`.
 *   - It takes debug/.bench.lock, so two benches cannot overlap.
 *   - `?perf` is NOT used: that probe costs frames. The worker probe posts one
 *     message a second.
 *   - The deck plays at 2 % volume. `init()` must precede `setMasterGain` or
 *     the call is a no-op and the track plays at full volume.
 *
 *   Usage:
 *     npm run bench:audio                                  # own vite server
 *     npm run bench:audio -- --formula=AmazingBox --secs=8
 *     npm run bench:audio -- --adaptive=60 --scenarios=lfo,audio,lfo,audio
 *     npx tsx debug/bench-audio.mts --url=http://localhost:3400   # reuse a dev server
 *
 * Output: console table + debug/bench-audio-latest.json (gitignored), or
 * `--out=<path>`. `--compare=<path>` prints deltas against a saved run.
 */

import { chromium, type Page, type CDPSession } from 'playwright';
import { execFile, spawn } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { acquireBenchLock } from './helpers/bench-lock.mts';

// ─── args ──────────────────────────────────────────────────────────────
const arg = (name: string, def?: string) => {
    const hit = process.argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
    if (!hit) return def;
    const eq = hit.indexOf('=');
    return eq < 0 ? 'true' : hit.slice(eq + 1);
};
const BASE = arg('url') || process.env.ENGINE_URL || 'http://localhost:3400';
const QUERY = arg('query', '')!;                      // e.g. --query=lowlatency=0
const URL = `${BASE.replace(/\/$/, '')}/app-gmt.html${QUERY ? '?' + QUERY : ''}`;
const FORMULA = arg('formula', 'Mandelbulb')!;
const SECS = Number(arg('secs', '6'));
const SETTLE_MS = Number(arg('settle', '2500'));
const [W, H] = (arg('size', '1280x720')!).split('x').map(Number);
const TARGETS = (arg('targets', 'coreMath.paramA')!).split(',').filter(Boolean);
const AMP = Number(arg('amp', '0.05'));
const ADAPTIVE = arg('adaptive', 'off')!;            // 'off' | 'keep' | '<fps>'
const SCENARIOS = (arg('scenarios', 'still,lfo,audio,lfo,audio,audio-hover,audio-idle')!).split(',').filter(Boolean);
const OUT = arg('out', 'debug/bench-audio-latest.json')!;
const COMPARE = arg('compare');
const LABEL = arg('label', '')!;
const GPU_BUSY_LIMIT = Number(arg('gpu-busy-limit', '15'));
const FORCE = arg('force') === 'true';
const TRACE = (arg('trace', '')!).split(',').filter(Boolean);   // 1-based scenario positions to capture a Chrome trace for, e.g. --trace=2,3
const PRESENT_PROBE = arg('no-present-probe') !== 'true';
const DAMAGE = arg('damage');                         // after the scenarios: what dirties the page in this scenario? (`--damage` = idle, or `--damage=lfo`)
const INJECT_CSS = arg('inject-css', '')!;            // A/B a style change without touching source, e.g. --inject-css=".animate-ping{animation:none!important}"
const WIN = process.platform === 'win32';

// ─── Windows GPU-engine counters (outside view) ────────────────────────
// `-ErrorAction SilentlyContinue` is load-bearing: one invalid sample makes
// Get-Counter throw otherwise. Decimals come back with the locale's separator.
const gpuCounters = (samples: number) => new Promise<{ name: string; pid: number; engine: string; pct: number }[]>((resolve) => {
    if (!WIN) return resolve([]);
    const ps = `$s=(Get-Counter '\\GPU Engine(*)\\Utilization Percentage' -SampleInterval 1 -MaxSamples ${samples} -ErrorAction SilentlyContinue).CounterSamples; $s | Group-Object InstanceName | ForEach-Object { [pscustomobject]@{ n=$_.Name; v=($_.Group | Measure-Object CookedValue -Average).Average } } | Where-Object { $_.v -gt 0.3 } | Sort-Object v -Descending | Select-Object -First 12 | ForEach-Object { $p=[int]($_.n -replace '^pid_(\\d+)_.*','$1'); $e=$_.n -replace '.*engtype_',''; $nm=(Get-Process -Id $p -ErrorAction SilentlyContinue).ProcessName; '{0}|{1}|{2}|{3}' -f [math]::Round($_.v,2).ToString([cultureinfo]::InvariantCulture),$p,$nm,$e }`;
    execFile('powershell', ['-NoProfile', '-Command', ps], { timeout: (samples + 12) * 1000 }, (_e, out) => {
        resolve(String(out || '').trim().split(/\r?\n/).filter(Boolean).map((l) => {
            const [pct, pid, name, engine] = l.split('|');
            return { pct: Number(pct), pid: Number(pid), name: name || '?', engine };
        }));
    });
});
const sum3d = (rows: { engine: string; pct: number }[]) => rows.filter(r => r.engine === '3d').reduce((a, r) => a + r.pct, 0);

// ─── nvidia-smi (whole-GPU ground truth) ───────────────────────────────
const nvidia = (secs: number) => new Promise<{ util: number; watts: number; mhz: number; pstate: string } | null>((resolve) => {
    // nvidia-smi has no sample count — it loops until killed, so run it for the window.
    let out = '';
    let child: ReturnType<typeof spawn>;
    try {
        child = spawn('nvidia-smi', ['--query-gpu=utilization.gpu,power.draw,clocks.current.graphics,pstate', '--format=csv,noheader,nounits', '-lms', '500']);
    } catch { return resolve(null); }
    child.stdout?.on('data', (d) => { out += String(d); });
    child.on('error', () => resolve(null));
    child.on('close', () => {
        const rows = out.trim().split(/\r?\n/).map(l => l.split(',').map(s => s.trim())).filter(r => r.length >= 4);
        if (!rows.length) return resolve(null);
        const avg = (i: number) => rows.reduce((a, r) => a + (Number(r[i]) || 0), 0) / rows.length;
        const ps = [...new Set(rows.map(r => r[3]))].join('/');
        resolve({ util: +avg(0).toFixed(0), watts: +avg(1).toFixed(0), mhz: +avg(2).toFixed(0), pstate: ps });
    });
    setTimeout(() => { try { child.kill(); } catch { /* already gone */ } }, Math.max(1000, secs * 1000));
});

// ─── OS window focus (Windows) ─────────────────────────────────────────
const PS_USER32 = `Add-Type -Namespace B -Name W -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);';`;
const ps = (cmd: string) => new Promise<string>((resolve) => {
    if (!WIN) return resolve('');
    execFile('powershell', ['-NoProfile', '-Command', PS_USER32 + cmd], { timeout: 15000 }, (_e, out) => resolve(String(out || '').trim()));
});
/** `hwnd|pid|processName` of the foreground window. */
const foreground = async () => {
    const [hwnd, pid, name] = (await ps(`$h=[B.W]::GetForegroundWindow(); $p=0; [void][B.W]::GetWindowThreadProcessId($h,[ref]$p); '{0}|{1}|{2}' -f $h,$p,(Get-Process -Id $p -ErrorAction SilentlyContinue).ProcessName`)).split('|');
    return { hwnd: hwnd || '0', pid: Number(pid) || 0, name: name || '?' };
};
/** Bring a window to the OS foreground. The synthetic ALT tap is what lets a
 *  background process pass Windows' foreground lock. */
const activate = (hwnd: string) => ps(`[B.W]::keybd_event(0x12,0,0,[UIntPtr]::Zero); [void][B.W]::SetForegroundWindow([IntPtr]${hwnd}); [B.W]::keybd_event(0x12,0,2,[UIntPtr]::Zero)`);

// ─── page-side instrumentation ─────────────────────────────────────────
// Kept as a STRING: tsx/esbuild wraps named inner functions in `__name(...)`,
// which does not exist in the page.
const INIT_SCRIPT = `(() => {
  const w = window;
  w.__name = (f) => f;
  // Worklet → main traffic, counted without touching app code: a second
  // 'message' listener on every AudioWorkletNode's port.
  w.__aw = { msgs: 0, snaps: 0, bytes: 0, dropped: 0 };
  const OrigAWN = w.AudioWorkletNode;
  if (OrigAWN) {
    w.AudioWorkletNode = class extends OrigAWN {
      constructor(...a) {
        super(...a);
        this.port.addEventListener('message', (e) => {
          const d = e.data; if (!d || d.kind !== 'bands') return;
          w.__aw.msgs++; w.__aw.snaps += d.count; w.__aw.dropped += d.dropped || 0;
          w.__aw.bytes += d.data.byteLength + d.times.byteLength + d.peaks.byteLength;
        });
      }
    };
  }
  // Main → worker messages by type.
  w.__posts = {};
  const origPost = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (msg, ...rest) {
    const t = (msg && msg.type) || '?';
    w.__posts[t] = (w.__posts[t] || 0) + 1;
    return origPost.call(this, msg, ...rest);
  };
  // rAF cadence + long tasks.
  w.__raf = { gaps: [] };
  let last = performance.now();
  const loop = (t) => { w.__raf.gaps.push(t - last); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  w.__long = { n: 0, total: 0, max: 0 };
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { w.__long.n++; w.__long.total += e.duration; w.__long.max = Math.max(w.__long.max, e.duration); } })
      .observe({ type: 'longtask', buffered: false });
  } catch (e) {}
})();`;

/** Scenario controls, installed once after boot. */
const BENCH_HELPERS = `(() => {
  const w = window;
  const store = () => w.__store.getState();
  const baseOf = (target) => { const i = target.indexOf('.'); const v = store()[target.slice(0, i)]?.[target.slice(i + 1)]; return typeof v === 'number' ? v : 0; };
  let deckLoaded = false;
  w.__bench = {
    clear() {
      const s = store();
      s.setAnimations([]);
      for (const r of [...(s.modulation?.rules ?? [])]) s.removeModulation(r.id);
      try { w.__audioEngine.pause(0); } catch (e) {}
      try { if (w.__audioEngine.isMicActive) w.__audioEngine.disconnectLiveInput(); } catch (e) {}
      s.setAudio({ isEnabled: false });
    },
    lfo(targets, amp) {
      const s = store();
      s.setLfosEnabled(true);
      s.setAnimations(targets.map((t, i) => ({
        id: 'bench-lfo-' + i, enabled: true, target: t, shape: 'Sine',
        period: 1.3 + 0.37 * i, amplitude: amp, baseValue: baseOf(t), phase: 0, smoothing: 0,
      })));
    },
    rules(targets, amp) {
      const s = store();
      for (const t of targets) s.addModulation({ target: t, source: 'audio' });
      // Full band, no gate, so the rule is driven the whole time.
      for (const r of store().modulation.rules) s.updateModulation({ id: r.id, update: { lowHz: 20, highHz: 16000, thresholdMin: 0, gain: amp * 2 } });
    },
    deck() {
      const eng = w.__audioEngine;
      if (!deckLoaded) {
        const SR = 48000, secs = 20, n = SR * secs;
        const pcm = new Int16Array(n);
        for (let i = 0; i < n; i++) {
          const t = i / SR, beat = t % 0.5;
          const kick = Math.sin(2 * Math.PI * (50 + 80 * Math.exp(-beat * 30)) * t) * Math.exp(-beat * 9);
          const hat = (Math.random() * 2 - 1) * Math.exp(-((t + 0.25) % 0.5) * 60) * 0.3;
          pcm[i] = Math.max(-1, Math.min(1, 0.7 * kick + hat + 0.15 * Math.sin(2 * Math.PI * 440 * t))) * 30000;
        }
        const hdr = new DataView(new ArrayBuffer(44));
        const str = (o, s) => { for (let i = 0; i < s.length; i++) hdr.setUint8(o + i, s.charCodeAt(i)); };
        str(0, 'RIFF'); hdr.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt '); hdr.setUint32(16, 16, true); hdr.setUint16(20, 1, true);
        hdr.setUint16(22, 1, true); hdr.setUint32(24, SR, true); hdr.setUint32(28, SR * 2, true); hdr.setUint16(32, 2, true); hdr.setUint16(34, 16, true);
        str(36, 'data'); hdr.setUint32(40, n * 2, true);
        // init() FIRST — setMasterGain is a no-op before the graph exists.
        eng.init(); eng.setMasterGain(0.02);
        eng.loadTrack(0, new File([hdr.buffer, pcm.buffer], 'bench.wav', { type: 'audio/wav' }));
        eng.setCrossfade(0);
        deckLoaded = true;
      }
      store().setAudio({ isEnabled: true, gain: 0.02 });
      eng.play(0);
    },
    async mic() {
      store().setAudio({ isEnabled: true, gain: 0.02 });
      return w.__audioEngine.connectMicrophone();
    },
  };
})();`;

interface ScenarioResult { [k: string]: unknown; name: string }

async function setup(page: Page, name: string): Promise<{ stop?: () => Promise<void> }> {
    const targets = JSON.stringify(TARGETS);
    await page.evaluate(`window.__bench.clear()`);
    await page.mouse.move(4, 4);
    await page.evaluate(`(() => { const s = window.__store.getState(); if (s.togglePanel) s.togglePanel('audio', false); })()`).catch(() => {});
    await page.evaluate(`window.__store.getState().setSampleCap(${name === 'idle' ? 8 : 0})`);
    switch (name) {
        case 'still': case 'idle': break;
        case 'lfo': await page.evaluate(`window.__bench.lfo(${targets}, ${AMP})`); break;
        case 'audio-idle': await page.evaluate(`window.__bench.deck()`); break;
        case 'audio': case 'audio-hover': case 'audio-panel':
            await page.evaluate(`window.__bench.deck(); window.__bench.rules(${targets}, ${AMP})`);
            if (name === 'audio-panel') await page.evaluate(`window.__store.getState().togglePanel('audio', true)`);
            if (name === 'audio-hover') {
                let alive = true;
                const loop = (async () => {
                    let k = 0;
                    while (alive) { await page.mouse.move(W / 2 + (W / 6) * Math.cos(k / 9), H / 2 + (H / 6) * Math.sin(k / 7)); k++; await page.waitForTimeout(16); }
                })();
                return { stop: async () => { alive = false; await loop; await page.mouse.move(4, 4); } };
            }
            break;
        case 'mic': await page.evaluate(`window.__bench.mic().then(() => window.__bench.rules(${targets}, ${AMP}))`); break;
        default: throw new Error(`unknown scenario '${name}'`);
    }
    return {};
}

/** 1.5 s of gpu+viz trace → what the GPU process's main thread is doing. */
async function presentProbe(browser: import('playwright').Browser, page: Page) {
    try {
        await browser.startTracing(page, { categories: ['gpu', 'viz', 'toplevel'] });
        await page.waitForTimeout(1500);
        const buf = await browser.stopTracing();
        const ev = JSON.parse(buf.toString('utf8')).traceEvents as { ph: string; name: string; pid: number; tid: number; ts: number; dur?: number; args?: { name?: string } }[];
        let gpuMain = '';
        for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name' && e.args?.name === 'CrGpuMain') gpuMain = `${e.pid}:${e.tid}`;
        let t0 = Infinity, t1 = 0, presentN = 0, presentDur = 0, presentMax = 0, swaps = 0;
        const tasks: { ts: number; dur: number }[] = [];
        for (const e of ev) {
            if (e.ph !== 'X' || !e.dur) continue;
            t0 = Math.min(t0, e.ts); t1 = Math.max(t1, e.ts + e.dur);
            if (`${e.pid}:${e.tid}` !== gpuMain) continue;
            if (e.name === 'DXGISwapChainImageBacking::Present') { presentN++; presentDur += e.dur; presentMax = Math.max(presentMax, e.dur); }
            if (e.name === 'SkiaOutputSurfaceImplOnGpu::SwapBuffers') swaps++;
            tasks.push({ ts: e.ts, dur: e.dur });
        }
        tasks.sort((a, b) => a.ts - b.ts || b.dur - a.dur);
        let end = -1, busy = 0;
        for (const t of tasks) if (t.ts >= end) { busy += t.dur; end = t.ts + t.dur; }
        const wall = (t1 - t0) || 1;
        return {
            swaps: +(swaps / (wall / 1e6)).toFixed(1), presents: +(presentN / (wall / 1e6)).toFixed(1),
            presentMs: +(presentN ? presentDur / presentN / 1000 : 0).toFixed(2), presentMaxMs: +(presentMax / 1000).toFixed(1),
            gpuMainBusy: +((busy / wall) * 100).toFixed(1),
        };
    } catch { return { swaps: -1, presents: -1, presentMs: -1, presentMaxMs: -1, gpuMainBusy: -1 }; }
}

const cdpMetrics = async (cdp: CDPSession) => {
    const { metrics } = await cdp.send('Performance.getMetrics');
    const m: Record<string, number> = {};
    for (const x of metrics) m[x.name] = x.value;
    return m;
};

async function measure(page: Page, cdp: CDPSession, name: string, benchPids: Set<number>): Promise<ScenarioResult> {
    await page.evaluate(`(() => {
      const w = window;
      w.__raf.gaps.length = 0; w.__long.n = 0; w.__long.total = 0; w.__long.max = 0;
      const m = w.__m = { t0: performance.now(), aw: { ...w.__aw }, posts: { ...w.__posts }, notifies: 0, livePub: 0,
        lastLive: w.__store.getState().liveModulations, perfN: w.__gmtProxy.perfHistory.length, perfLast: w.__gmtProxy.perfStats };
      m.unsub = w.__store.subscribe((st) => { m.notifies++; if (st.liveModulations !== m.lastLive) { m.lastLive = st.liveModulations; m.livePub++; } });
    })()`);
    const c0 = await cdpMetrics(cdp);
    const [gpu, nv] = await Promise.all([gpuCounters(Math.max(2, Math.floor(SECS) - 1)), nvidia(SECS - 1), page.waitForTimeout(SECS * 1000)]);
    const c1 = await cdpMetrics(cdp);
    const r = await page.evaluate(`(() => {
      const w = window; const m = w.__m; m.unsub();
      const secs = (performance.now() - m.t0) / 1000;
      const g = [...w.__raf.gaps].sort((a, b) => a - b);
      const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0);
      const posts = {}; let postsTotal = 0;
      for (const k of Object.keys(w.__posts)) { const d = (w.__posts[k] - (m.posts[k] || 0)) / secs; if (d > 0.05) { posts[k] = +d.toFixed(1); postsTotal += d; } }
      // Worker probe windows that closed inside this measurement.
      const hist = w.__gmtProxy.perfHistory; const i0 = hist.indexOf(m.perfLast);
      const wins = hist.slice(i0 < 0 ? Math.max(0, hist.length - Math.floor(secs)) : i0 + 1);
      const wsum = (f) => wins.reduce((a, s) => a + f(s), 0);
      const wsecs = wsum(s => s.windowMs) / 1000 || 1;
      const med = (xs) => { const s = xs.filter(x => x > 0).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
      const msgs = {}; let msgsTotal = 0;
      for (const s of wins) for (const k of Object.keys(s.msgs)) msgs[k] = (msgs[k] || 0) + s.msgs[k];
      for (const k of Object.keys(msgs)) { msgsTotal += msgs[k]; msgs[k] = +(msgs[k] / wsecs).toFixed(1); }
      const last = wins[wins.length - 1];
      const st = w.__store.getState();
      const eng = w.__audioEngine;
      const frames = wsum(s => s.frames) / wsecs;
      return {
        secs: +secs.toFixed(2),
        raf: +(g.length / secs).toFixed(1), rafGapP95: +q(g, 0.95).toFixed(1), rafGapMax: +(g[g.length - 1] || 0).toFixed(1),
        longTasks: w.__long.n, longMs: +w.__long.total.toFixed(0),
        storeNotifies: +(m.notifies / secs).toFixed(1), livePub: +(m.livePub / secs).toFixed(1),
        posts, postsTotal: +postsTotal.toFixed(1),
        frames: +frames.toFixed(1), skips: +(wsum(s => s.skips) / wsecs).toFixed(1),
        gpuMsP50: +med(wins.map(s => s.gpuMs.p50)).toFixed(2), gpuMsP95: +med(wins.map(s => s.gpuMs.p95)).toFixed(2),
        gpuSamples: wsum(s => s.gpuMs.n), gpuDisjoint: wsum(s => s.gpuDisjoint), gpuTimer: !!(last && last.gpuTimerAvailable),
        fenceMsP50: +med(wins.map(s => s.fenceMs.p50)).toFixed(2),
        gapMsP50: +med(wins.map(s => s.gapMs.p50)).toFixed(2), gapMsP95: +med(wins.map(s => s.gapMs.p95)).toFixed(2),
        tickCpuMs: +med(wins.map(s => s.cpuMs.mean)).toFixed(3), computeMs: +med(wins.map(s => s.computeMs.mean)).toFixed(3),
        phaseUpdateMs: +med(wins.map(s => s.phaseMs.update)).toFixed(3), phaseDisplayMs: +med(wins.map(s => s.phaseMs.display)).toFixed(3),
        phaseReadbackMs: +med(wins.map(s => s.phaseMs.readback)).toFixed(3),
        workerMsgs: msgs, workerMsgsTotal: +(msgsTotal / wsecs).toFixed(1), workerMsgCpuPct: +((wsum(s => s.msgCpuMs) / (wsecs * 1000)) * 100).toFixed(2),
        renderW: last ? last.renderW : 0, renderH: last ? last.renderH : 0,
        mpPerSec: +(frames * (last ? last.renderW * last.renderH : 0) / 1e6).toFixed(1),
        accum: last ? last.accumulationCount : 0,
        awBatches: +((w.__aw.msgs - m.aw.msgs) / secs).toFixed(1), awHops: +((w.__aw.snaps - m.aw.snaps) / secs).toFixed(0),
        awKBs: +((w.__aw.bytes - m.aw.bytes) / secs / 1024).toFixed(1), awDropped: w.__aw.dropped - m.aw.dropped,
        input: eng.inputKind, signal: eng.hasSignal(), analysisFailed: eng.analysisFailed,
        rules: (st.modulation?.rules ?? []).length, lfos: (st.animations ?? []).filter(a => a.enabled).length, audioOn: !!st.audio?.isEnabled,
        liveKeys: Object.keys(st.liveModulations ?? {}).length,
      };
    })()`) as Record<string, unknown>;
    const wall = (c1.Timestamp - c0.Timestamp) || 1;
    const pct = (k: string) => +(((c1[k] - c0[k]) / wall) * 100).toFixed(1);
    const chrome = gpu.filter(x => benchPids.has(x.pid));
    return {
        name, ...r,
        mainBusyPct: pct('TaskDuration'), mainScriptPct: pct('ScriptDuration'), mainLayoutPct: pct('LayoutDuration'), mainStylePct: pct('RecalcStyleDuration'),
        heapMB: +(c1.JSHeapUsedSize / 1048576).toFixed(1),
        gpuChrome3dPct: +sum3d(chrome).toFixed(1),
        nvUtil: nv?.util ?? -1, nvWatts: nv?.watts ?? -1, nvMhz: nv?.mhz ?? -1, nvPstate: nv?.pstate ?? '?',
        gpuOther3dPct: +sum3d(gpu.filter(x => !benchPids.has(x.pid))).toFixed(1),
        gpuEngines: gpu.filter(x => x.pct >= 1).map(x => `${x.name}:${x.engine}=${x.pct}`).join(' '),
    };
}

// ─── report ────────────────────────────────────────────────────────────
function table(rows: ScenarioResult[]) {
    const cols: [string, string, number][] = [
        ['name', 'scenario', 15], ['fg', 'fg', 3], ['gpuMsP50', 'gpu ms', 7], ['gpuMsP95', 'p95', 6], ['frames', 'frm/s', 6], ['mpPerSec', 'MP/s', 6],
        ['swaps', 'swap/s', 6], ['presentMs', 'presMs', 6], ['gpuMainBusy', 'gpuTh%', 6], ['renderW', 'w', 5], ['fenceMsP50', 'fence', 6], ['skips', 'skip/s', 6], ['tickCpuMs', 'tick ms', 7], ['phaseReadbackMs', 'rb ms', 6], ['workerMsgsTotal', 'wmsg/s', 7], ['workerMsgCpuPct', 'wmsg %', 6],
        ['raf', 'raf', 5], ['rafGapP95', 'gapP95', 6], ['mainBusyPct', 'main %', 6], ['mainScriptPct', 'script%', 7], ['postsTotal', 'post/s', 6],
        ['storeNotifies', 'store/s', 7], ['livePub', 'pub/s', 5], ['awHops', 'hops', 5], ['gpuChrome3dPct', 'gpu3d%', 6], ['gpuOther3dPct', 'other%', 6], ['nvUtil', 'nv%', 4], ['nvWatts', 'W', 4], ['nvMhz', 'MHz', 5], ['nvPstate', 'P', 6],
    ];
    console.log('\n' + cols.map(([, h, w]) => h.padStart(w)).join(' '));
    for (const r of rows) console.log(cols.map(([k, , w]) => String(r[k] ?? '').padStart(w)).join(' '));
}

function compare(rows: ScenarioResult[], path: string) {
    if (!existsSync(path)) { console.log(`[bench-audio] --compare: ${path} not found`); return; }
    const base = JSON.parse(readFileSync(path, 'utf8')).byScenario as Record<string, Record<string, number>>;
    const mine = byScenario(rows);
    console.log(`\nΔ vs ${path}`);
    for (const name of Object.keys(mine)) {
        const b = base[name]; if (!b) continue;
        const d = (k: string) => { const a = Number(mine[name][k]), c = Number(b[k]); return c ? `${k} ${c} → ${a} (${((a - c) / c * 100).toFixed(1)}%)` : `${k} ${c} → ${a}`; };
        console.log(`  ${name.padEnd(12)} ${['gpuMsP50', 'frames', 'mpPerSec', 'mainBusyPct', 'postsTotal', 'tickCpuMs'].map(d).join('   ')}`);
    }
}

/** Median across repeats of the same scenario name. */
function byScenario(rows: ScenarioResult[]) {
    const out: Record<string, Record<string, number>> = {};
    const names = [...new Set(rows.map(r => r.name))];
    for (const n of names) {
        const group = rows.filter(r => r.name === n);
        const o: Record<string, number> = { runs: group.length };
        for (const k of Object.keys(group[0])) {
            const vals = group.map(g => g[k]).filter(v => typeof v === 'number') as number[];
            if (vals.length !== group.length) continue;
            vals.sort((a, b) => a - b);
            o[k] = vals[Math.floor(vals.length / 2)];
        }
        out[n] = o;
    }
    return out;
}

// ─── main ──────────────────────────────────────────────────────────────
async function main() {
    const pre = await gpuCounters(3);
    const fgBefore = await foreground();     // the window to hand focus back to for `@bg`
    const busy = sum3d(pre);
    console.log(`[bench-audio] GPU before launch: ${busy.toFixed(1)}% 3D in use` + (pre.length ? ` (${pre.slice(0, 3).map(x => `${x.name}:${x.engine}=${x.pct}`).join(' ')})` : ''));
    if (busy > GPU_BUSY_LIMIT && !FORCE) {
        console.error(`[bench-audio] the GPU is already ${busy.toFixed(1)}% busy (limit ${GPU_BUSY_LIMIT}) — readings would be contaminated. Close the app using it, or pass --force.`);
        process.exit(2);
    }
    const release = await acquireBenchLock('bench-audio', { wait: !process.argv.includes('--no-wait'), force: FORCE });
    const browser = await chromium.launch({
        channel: 'chrome', headless: false,
        args: [
            '--use-angle=d3d11',
            '--disable-blink-features=AutomationControlled',
            '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling',
            '--autoplay-policy=no-user-gesture-required',
            '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
        ],
    });
    try {
        const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, permissions: ['microphone'] });
        const page = await ctx.newPage();
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
        page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text().slice(0, 240)); });
        await page.addInitScript(INIT_SCRIPT);
        console.log(`[bench-audio] ${URL}  ${W}x${H}  formula=${FORMULA}  targets=${TARGETS.join(',')}  adaptive=${ADAPTIVE}  ${SECS}s/scenario`);
        await page.goto(URL, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction('window.__gmtProxy && window.__gmtProxy.isBooted && window.__gmtProxy.hasCompiledShader && !window.__gmtProxy.isCompiling', null, { timeout: 120_000, polling: 100 });

        const settle = () => page.evaluate(`(async () => {
          const p = window.__gmtProxy; const start = performance.now(); let quietSince = -1;
          while (performance.now() - start < 60000) {
            if (p.isCompiling) quietSince = -1;
            else if (quietSince < 0) quietSince = performance.now();
            else if (performance.now() - quietSince >= 1500) return true;
            await new Promise(r => setTimeout(r, 80));
          } return false;
        })()`);

        // Pin the scene: the formula's authored preset, then never touch the camera.
        const formulaId = await page.evaluate(`(() => {
          const reg = window.__fractalRegistry; const ids = reg.getAll().map(d => d.id).filter(Boolean);
          const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); const want = norm(${JSON.stringify(FORMULA)});
          const id = ids.find(i => norm(i) === want) || ids.find(i => norm(i).includes(want)) || null;
          if (!id) return null;
          const st = window.__store.getState(); st.setFormula(id);
          const preset = reg.get(id)?.defaultPreset; if (preset) st.loadPreset(JSON.parse(JSON.stringify(preset)));
          return id;
        })()`) as string | null;
        if (!formulaId) throw new Error(`formula '${FORMULA}' not found`);
        await settle();
        await page.evaluate(`(() => {
          const s = window.__store.getState();
          s.setSampleCap(0);                                   // infinite accumulation — 'still' never idles
          ${ADAPTIVE === 'keep' ? '' : `s.setQuality({ adaptiveTarget: ${ADAPTIVE === 'off' ? 0 : Number(ADAPTIVE)} });`}
          window.__gmtProxy.setPerfProbe(true);
        })()`);
        await page.evaluate(BENCH_HELPERS);
        if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
        await settle();
        await page.waitForTimeout(1500);

        const env = await page.evaluate(`(() => {
          const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
          const s = window.__store.getState();
          const anims = document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity).map(a => { const el = a.effect.target; return (a.animationName || '?') + '@' + (el ? el.tagName.toLowerCase() + '.' + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).split(' ').slice(0, 5).join('.') + '[' + (el.textContent || '').slice(0, 24) + ']' : '?'); });
          return { infiniteAnimations: anims.join(',') || 'none', renderer: gl && ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '?', chrome: navigator.userAgent.replace(/.*(Chrome\\/[\\d.]+).*/, '$1'),
            formula: s.formula, adaptiveTarget: s.quality?.adaptiveTarget, dpr: devicePixelRatio, focus: document.hasFocus() };
        })()`) as Record<string, unknown>;
        console.log('[bench-audio] env', JSON.stringify(env));

        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Performance.enable');

        // This Chrome's own processes, so GPU counters and the foreground check
        // are attributed to the bench window and not to any other Chrome.
        const bcdp = await browser.newBrowserCDPSession();
        const procs = ((await bcdp.send('SystemInfo.getProcessInfo')) as { processInfo: { type: string; id: number }[] }).processInfo;
        const benchPids = new Set(procs.map(p => p.id));
        const browserPid = procs.find(p => p.type === 'browser')?.id ?? 0;
        const benchHwnd = await ps(`(Get-Process -Id ${browserPid} -ErrorAction SilentlyContinue).MainWindowHandle`);
        console.log(`[bench-audio] chrome pids: browser ${browserPid}, gpu ${procs.find(p => p.type === 'GPU')?.id ?? '?'}; focus before launch: ${fgBefore.name}`);

        const rows: ScenarioResult[] = [];
        for (const spec of SCENARIOS) {
            const [name, focus] = spec.split('@');
            if (focus === 'fg' && benchHwnd) await activate(benchHwnd);
            if (focus === 'bg' && fgBefore.hwnd !== '0') await activate(fgBefore.hwnd);
            const h = await setup(page, name);
            await page.waitForTimeout(SETTLE_MS);
            const fg0 = await foreground();
            let traceBuf: Buffer | null = null;
            const tracing = TRACE.includes(String(rows.length + 1));
            if (tracing) await browser.startTracing(page, { categories: ['toplevel', 'gpu', 'viz', 'cc', 'benchmark', 'audio', 'webaudio', 'disabled-by-default-gpu.service'] });
            const r = await measure(page, cdp, name, benchPids);
            const fg1 = await foreground();
            if (PRESENT_PROBE && !tracing) Object.assign(r, await presentProbe(browser, page));
            // 1 = bench Chrome held the OS foreground for the whole window, 0 = never, 0.5 = it changed mid-run.
            r.fg = (benchPids.has(fg0.pid) ? 0.5 : 0) + (benchPids.has(fg1.pid) ? 0.5 : 0);
            r.fgApp = fg1.name;
            r.name = spec;
            if (tracing) {
                traceBuf = await browser.stopTracing();
                const tracePath = `debug/scratch/bench-audio-trace-${rows.length + 1}-${name}.json`;
                writeFileSync(tracePath, traceBuf);
                console.log(`[bench-audio] trace → ${tracePath} (${(traceBuf.length / 1e6).toFixed(1)} MB) — open in DevTools Performance or ui.perfetto.dev`);
            }
            await h.stop?.();
            rows.push(r);
            console.log(`  ${spec.padEnd(15)} fg ${r.fg}  gpu ${String(r.gpuMsP50).padStart(6)} ms  frames ${String(r.frames).padStart(5)}/s  fence ${String(r.fenceMsP50).padStart(5)}  tick ${String(r.tickCpuMs).padStart(5)} (rb ${String(r.phaseReadbackMs).padStart(5)})  swaps ${String(r.swaps ?? '').padStart(4)}/s present ${String(r.presentMs ?? '').padStart(5)} ms gpuThread ${String(r.gpuMainBusy ?? '').padStart(4)}%  main ${String(r.mainBusyPct).padStart(5)}%  gpu3d ${String(r.gpuChrome3dPct).padStart(4)}%  nv ${r.nvUtil}% ${r.nvWatts}W ${r.nvMhz}MHz ${r.nvPstate}  ${r.renderW}x${r.renderH}`);
        }
        if (DAMAGE) {
            // Everything that can dirty the page from the main thread, counted for 3 s
            // with the app converged and nothing modulated. The compositor presents
            // whenever ANY of these fire, whether or not the fractal moved.
            const dmgScenario = DAMAGE === 'true' ? 'idle' : DAMAGE;
            await setup(page, dmgScenario);
            await page.waitForTimeout(3000);
            const d = await page.evaluate(`(async () => {
              const counts = { glDraw: 0, glClear: 0, c2d: 0, rafCallbacks: 0 };
              const undo = [];
              for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) for (const [fn, key] of [['drawArrays', 'glDraw'], ['drawElements', 'glDraw'], ['clear', 'glClear']]) {
                const orig = proto[fn]; proto[fn] = function (...a) { counts[key]++; return orig.apply(this, a); }; undo.push(() => { proto[fn] = orig; });
              }
              for (const fn of ['clearRect', 'fillRect', 'drawImage', 'stroke', 'fill', 'putImageData']) {
                const orig = CanvasRenderingContext2D.prototype[fn]; CanvasRenderingContext2D.prototype[fn] = function (...a) { counts.c2d++; return orig.apply(this, a); }; undo.push(() => { CanvasRenderingContext2D.prototype[fn] = orig; });
              }
              const sel = (el) => { if (!el || !el.tagName) return '?'; const c = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || ''; return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(c).split(' ').slice(0, 6).join('.'); };
              const muts = new Map();
              const mo = new MutationObserver((list) => { for (const m of list) { const k = m.type + (m.attributeName ? ':' + m.attributeName : '') + ' ' + sel(m.target.nodeType === 3 ? m.target.parentElement : m.target); muts.set(k, (muts.get(k) || 0) + 1); } });
              mo.observe(document.documentElement, { subtree: true, attributes: true, childList: true, characterData: true });
              await new Promise(r => setTimeout(r, 3000));
              mo.disconnect(); undo.forEach(f => f());
              const anims = document.getAnimations().filter(a => a.playState === 'running').map(a => (a.animationName || a.transitionProperty || '?') + '@' + sel(a.effect && a.effect.target));
              return { perSec: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, +(v / 3).toFixed(1)])),
                mutations: [...muts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, n]) => (n / 3).toFixed(1) + '/s ' + k), runningAnimations: anims,
                videos: [...document.querySelectorAll('video')].map(v => sel(v) + (v.paused ? ' paused' : ' PLAYING')),
                canvases: [...document.querySelectorAll('canvas')].map(c => sel(c) + ' ' + c.width + 'x' + c.height) };
            })()`);
            console.log(`[bench-audio] damage sources in '${dmgScenario}':`, JSON.stringify(d, null, 1));
            Object.assign(d as object, await presentProbe(browser, page));
            console.log(`[bench-audio]   → swaps ${(d as any).swaps}/s`);
        }
        await page.evaluate(`window.__bench.clear(); window.__gmtProxy.setPerfProbe(false)`);

        table(rows);
        const result = { label: LABEL, when: new Date().toISOString(), args: { FORMULA, SECS, W, H, TARGETS, AMP, ADAPTIVE, SCENARIOS }, env, gpuBefore: pre, rows, byScenario: byScenario(rows), errors };
        writeFileSync(OUT, JSON.stringify(result, null, 1));
        console.log(`\n[bench-audio] wrote ${OUT}`);
        if (COMPARE) compare(rows, COMPARE);
        if (errors.length) { console.log(`[bench-audio] ${errors.length} page error(s):`); for (const e of errors.slice(0, 8)) console.log('   ' + e); }
    } finally {
        await browser.close().catch(() => {});
        release();
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
