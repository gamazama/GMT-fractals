/**
 * Smoke: the audio analysis worklet, for real, in a browser.
 *
 * Every other audio guard runs in node on the pure DSP or hands the receiver
 * synthetic batches. None of them loads the worklet. This one does: it boots
 * app-gmt, plays a synthesised 440 Hz tone on deck A and follows the signal the
 * whole way — AudioContext → `analysisBus` → the AudioWorklet processor →
 * `WorkletAnalysis` → `filterBank` → `ModulationEngine` → `liveModulations`.
 *
 * It exists because the fragile part is not the maths. The processor is pulled
 * in through a Vite-only `?worker&url` import, built as its own chunk, and
 * registered by name on the audio thread; there is deliberately NO main-thread
 * fallback (ADR-0110), so if any of that breaks audio modulation simply does
 * not run and the only sign is `analysisFailed` in a panel nobody has open.
 *
 * ASSERTS
 *   [1] the worklet module loaded (`analysisFailed === false`) and is delivering
 *   [2] hops arrive at the rate the protocol promises for this sample rate
 *       (~200 Hz in whole render quanta: 187.5 at 48 kHz, ±15 %), none dropped
 *   [3] an audio rule on the band AROUND the tone moves its target;
 *       one on a band two-plus octaves away does not
 *   [4] pausing the deck lets the level fall back — the ring ages out on
 *       silence instead of freezing on the last loud frame
 *
 * NOT asserted: absolute levels (`test:band-analyser` / `test:fft` own those)
 * and timing against the frame clock.
 *
 *   npm run smoke:audio-worklet                       (dev server on :3400)
 *   npm run smoke:with-server -- npx tsx debug/smoke-audio-worklet.mts
 *   ENGINE_URL=http://localhost:4173/app-gmt.html npm run smoke:audio-worklet   (a production build)
 *
 * FALSIFICATION LOG: at the bottom of this file.
 */
import { chromium } from 'playwright';

/** Hops per second the protocol promises: ~200 Hz, rounded to whole 128-sample
 *  render quanta. Written out here rather than imported from `protocol.ts` on
 *  purpose — an expectation computed by the code under test cannot fail. */
const expectedHopRate = (sampleRate: number) => sampleRate / (Math.max(1, Math.round(sampleRate / 200 / 128)) * 128);

// `/` and `/app-gmt.html` are the same entry, so a bare ENGINE_URL (what
// runWithServer exports) lands on the same app.
const URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';

const TONE_HZ = 440;
const IN_BAND: [number, number] = [330, 590];       // about ±5 semitones around the tone
const OUT_BAND: [number, number] = [2500, 6000];    // 2.5+ octaves above it
const IN_TARGET = 'coreMath.paramA';
const OUT_TARGET = 'coreMath.paramB';

const browser = await chromium.launch({
    args: ['--disable-gpu-sandbox', '--disable-blink-features=AutomationControlled', '--autoplay-policy=no-user-gesture-required'],
});
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && /\[audio\]|worklet/i.test(m.text())) errors.push(`console.error: ${m.text().slice(0, 200)}`); });

// Count worklet → main traffic without touching app code: a second `message`
// listener on every AudioWorkletNode's port. (A string — tsx wraps named inner
// functions in `__name(...)`, which the page does not have.)
await page.addInitScript(`(() => {
  const w = window;
  w.__aw = { msgs: 0, hops: 0, dropped: 0 };
  const Orig = w.AudioWorkletNode;
  if (!Orig) return;
  w.AudioWorkletNode = class extends Orig {
    constructor(...a) {
      super(...a);
      this.port.addEventListener('message', (e) => {
        const d = e.data; if (!d || d.kind !== 'bands') return;
        w.__aw.msgs++; w.__aw.hops += d.count; w.__aw.dropped += d.dropped || 0;
      });
    }
  };
})();`);

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__gmtProxy && window.__gmtProxy.isBooted && window.__audioEngine && window.__store', null, { timeout: 120_000, polling: 200 });

let failures = 0;
const ok = (cond: boolean, msg: string, detail?: unknown) => {
    if (cond) console.log(`  ok: ${msg}`);
    else { failures++; console.error(`  FAIL: ${msg}`, detail === undefined ? '' : JSON.stringify(detail)); }
};

// ── set up: a tone on deck A, one rule on its band and one far from it ──────
await page.evaluate(`(() => {
  const SR = 48000, secs = 12, n = SR * secs;
  const pcm = new Int16Array(n);
  for (let i = 0; i < n; i++) pcm[i] = Math.sin(2 * Math.PI * ${TONE_HZ} * i / SR) * 0.5 * 32767;
  const hdr = new DataView(new ArrayBuffer(44));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) hdr.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); hdr.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt '); hdr.setUint32(16, 16, true); hdr.setUint16(20, 1, true);
  hdr.setUint16(22, 1, true); hdr.setUint32(24, SR, true); hdr.setUint32(28, SR * 2, true); hdr.setUint16(32, 2, true); hdr.setUint16(34, 16, true);
  str(36, 'data'); hdr.setUint32(40, n * 2, true);
  const eng = window.__audioEngine;
  const s = window.__store.getState();
  // The analysis taps masterGain, so the volume IS the level under test.
  eng.init(); eng.setMasterGain(0.8);
  s.setAudio({ isEnabled: true, gain: 0.8, agcEnabled: false, normalizeBands: false });
  eng.loadTrack(0, new File([hdr.buffer, pcm.buffer], 'tone.wav', { type: 'audio/wav' }));
  eng.setCrossfade(0);
  eng.play(0);
  s.addModulation({ target: ${JSON.stringify(IN_TARGET)}, source: 'audio' });
  s.addModulation({ target: ${JSON.stringify(OUT_TARGET)}, source: 'audio' });
  for (const r of window.__store.getState().modulation.rules) {
    const band = r.target === ${JSON.stringify(IN_TARGET)} ? ${JSON.stringify(IN_BAND)} : ${JSON.stringify(OUT_BAND)};
    s.updateModulation({ id: r.id, update: { lowHz: band[0], highHz: band[1], thresholdMin: 0.05, thresholdMax: 1, gain: 1, mode: 'level', attack: 0.02, decay: 0.2 } });
  }
})()`);

const sample = () => page.evaluate(`(() => {
  const eng = window.__audioEngine; const st = window.__store.getState();
  const live = st.liveModulations || {};
  return {
    failed: eng.analysisFailed, signal: eng.hasSignal(), sampleRate: eng.sampleRate, peak: eng.getPeakLevel(),
    aw: { ...window.__aw }, t: performance.now(),
    inBase: st.coreMath.paramA, inLive: live[${JSON.stringify(IN_TARGET)}], outBase: st.coreMath.paramB, outLive: live[${JSON.stringify(OUT_TARGET)}],
  };
})()`) as Promise<{ failed: boolean; signal: boolean; sampleRate: number; peak: number; aw: { msgs: number; hops: number; dropped: number }; t: number;
    inBase: number; inLive?: number; outBase: number; outLive?: number }>;

// ── [1] the worklet is alive ────────────────────────────────────────────────
console.log('[1] the worklet module loaded and is delivering');
await page.waitForFunction('window.__audioEngine.hasSignal() || window.__audioEngine.analysisFailed', null, { timeout: 20_000, polling: 100 }).catch(() => {});
const first = await sample();
ok(first.failed === false, 'the worklet module loaded (analysisFailed is false)', { failed: first.failed, errors: errors.slice(0, 2) });
ok(first.signal === true, 'and has delivered at least one snapshot (hasSignal)');

// ── [2] hop rate ────────────────────────────────────────────────────────────
console.log('[2] hops arrive at the rate the protocol promises');
await page.waitForTimeout(1000);
const a = await sample();
await page.waitForTimeout(3000);
const b = await sample();
const hopsPerSec = (b.aw.hops - a.aw.hops) / ((b.t - a.t) / 1000);
const expected = expectedHopRate(b.sampleRate);
ok(Math.abs(hopsPerSec - expected) / expected < 0.15,
    `${hopsPerSec.toFixed(1)} hops/s against ${expected.toFixed(1)} expected at ${b.sampleRate} Hz (±15%)`, { hopsPerSec, expected });
ok(b.aw.msgs - a.aw.msgs > 60, 'in batches (more than 20 a second)', { batches: b.aw.msgs - a.aw.msgs });
ok(b.aw.dropped === 0, 'none dropped', { dropped: b.aw.dropped });

// ── [3] the band around the tone moves its target; a far band does not ──────
console.log('[3] the right band drives the right rule');
const inOffset = Math.abs((b.inLive ?? b.inBase) - b.inBase);
const outOffset = Math.abs((b.outLive ?? b.outBase) - b.outBase);
ok(b.peak > 0.3, 'the analyser sees the tone (peak level above 0.3)', { peak: b.peak });
ok(inOffset > 0.1, `a rule on ${IN_BAND[0]}-${IN_BAND[1]} Hz is driven by a ${TONE_HZ} Hz tone`, { inOffset, live: b.inLive, base: b.inBase });
ok(outOffset < inOffset / 10, `a rule on ${OUT_BAND[0]}-${OUT_BAND[1]} Hz is not (under a tenth of it)`, { outOffset, inOffset });

// ── [4] silence lets it fall back ───────────────────────────────────────────
console.log('[4] pausing the deck lets the level fall back');
await page.evaluate(`window.__audioEngine.pause(0)`);
await page.waitForTimeout(2500);
const c = await sample();
const inAfter = Math.abs((c.inLive ?? c.inBase) - c.inBase);
ok(inAfter < inOffset / 5, 'the driven target returns toward its base once the deck is paused', { before: inOffset, after: inAfter });
ok(c.aw.hops > b.aw.hops, 'while hops keep arriving (the worklet analyses silence, it does not stall)', { hopsDuring: c.aw.hops - b.aw.hops });

await page.evaluate(`(() => { const s = window.__store.getState(); for (const r of [...s.modulation.rules]) s.removeModulation(r.id); s.setAudio({ isEnabled: false }); })()`);
await browser.close();

ok(errors.length === 0, 'no audio / worklet errors on the page', errors.slice(0, 3));
if (failures) { console.error(`\n✗ audio-worklet: ${failures} failure(s)`); process.exit(1); }
console.log('\n✓ audio-worklet: the worklet loads, delivers at hop rate, and drives the right rule');

/*
 * ── FALSIFICATION LOG (2026-10-04) ─────────────────────────────────────────
 * Each break applied to the source, the smoke run against the dev server, the
 * break reverted. All six exit 1.
 *
 *  a. Processor registered under another name (`registerProcessor('some-other
 *     -name', …)` in analysisProcessor.ts) → [1] "the worklet module loaded"
 *     fails with the page's own "[audio] AudioWorklet analysis failed to load"
 *     error, and everything downstream with it. This is the case the smoke
 *     exists for.
 *  b. Hop four times too long (`hopSamplesFor` ×4) → [2] "46.6 hops/s against
 *     187.5 expected". Only catchable because the expectation is written out
 *     here; computed from `hopSamplesFor` it moved with the break and passed.
 *  c. The processor never posts → [1] hasSignal, [2] 0 hops/s, [4] "while hops
 *     keep arriving".
 *  d. The receiver copies flux into the levels slot (WorkletAnalysis.onBatch)
 *     → [3] "a rule on 330-590 Hz is driven by a 440 Hz tone" reads offset 0.
 *  e. Levels never release (smoothing only follows rises, bandAnalyser.ts) →
 *     [4] "returns toward its base once the deck is paused": 0.57 before,
 *     0.64 after. [1]–[3] stay green — only the fall-back sees it.
 *  f. The worklet ignores the band count it is sent → batches arrive at the
 *     wrong shape and are discarded: [1] hasSignal false.
 *  Restored → exit 0, on the dev server and on a production build
 *  (`vite build` served statically — the `?worker&url` chunk is the part a
 *  dev-only run cannot vouch for).
 */
