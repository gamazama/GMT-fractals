/**
 * Guard: WorkletAnalysis — the main-thread receiver's ring and flux drain.
 *
 * Until this file existed the receiver had no guard at all: no suite imported
 * it, and all five audio suites passed identically whether `takeMaxFlux`'s
 * wrap handling was right, wrong, or absent (overnight audit, cycle 4). This
 * harness stands in for the worklet port — it hands synthetic
 * `AnalysisBatchMessage` payloads to `onBatch`, ticks `update()`, and reads
 * what `filterBank` ends up holding, which is exactly what `ModulationEngine`
 * and `AudioSpectrum` read.
 *
 * What is pinned, in the class's own terms:
 *   [1] levels take the LATEST snapshot of a batch, not the first
 *   [2] flux takes the per-band MAX across every unread snapshot, not the last
 *   [3] a tick with no new snapshot is an HONEST ZERO for flux (levels persist)
 *   [4] the drain spans every batch since the last tick, and never re-reads
 *   [5] the ring is BOUNDED at RING_SNAPSHOTS; the oldest fall out on their own
 *   [6] exactly RING_SNAPSHOTS unread hops drain the WHOLE ring (the aliasing
 *       bug the audit measured: 512 hops of flux 30 used to drain as 0)
 *   [7] past a full lap, everything the ring still holds is drained — not just
 *       the hops written after the writer lapped the reader
 *   [8] `applySnapshotAt` is a rewind for one frame, not a read: the live
 *       drain still sees every snapshot afterwards
 *   [9] a batch from before a reshape (wrong bandCount) never enters the ring
 *
 * Run: `npm run test:worklet-analysis`
 *
 * ── FALSIFIED 2026-09-02 (audit item L769) ──────────────────────────────────
 * Against the UNFIXED drain (`unread = (ringWrite - cursor + 512) % 512`):
 *   A. As shipped → exit 1, 4 failures: [6] "512 unread hops of flux 30 drain
 *      as 30, not 0" read 0 in all three placements (everywhere / newest only
 *      / oldest only), and [7] "an onset at hop 200 (held, older than the
 *      lap)" read 0 after 600 unread hops — the old walk covered only the 88
 *      hops written after the lap. Everything else green: the bug was only
 *      the wrap, and past the wrap.
 *   B. Option (a) as literally proposed, `unread = this.ringCount` in the
 *      dead branch → exit 1, 3 failures. [6]'s three drains went green, but
 *      "the idle tick after a full-ring drain is still an honest zero" read
 *      30, [7]'s hop 200 still read 0 (the branch fires only at a difference
 *      of exactly 0, not at 88), and [7]'s idle tick then reported that missed
 *      onset a tick late. [3]'s idle tick stayed green ONLY because its ring
 *      is not yet full — the branch walked empty slots — so this shortcut is
 *      masked for the first 2.7s of every session and wrong after.
 *   C. `unread = 1` in the dead branch → exit 1, 3 failures. [6] "newest only"
 *      read 0 — `ring[ringWrite]` is the OLDEST survivor, not the newest — the
 *      full-ring idle tick read 30 (one stale entry re-drained), and [7]'s hop
 *      200 still read 0. "Every hop" and "oldest only" passed, which is
 *      exactly why "newest only" is a separate case.
 * Against the FIXED drain (`hopsSinceFluxRead`, min'd with `ringCount`), each
 * break applied and reverted independently:
 *   D. `this.latest` set on the first hop of a batch, not the last
 *      → exit 1, 3 failures: [1] levels read hop 1's 0.1, peak hop 1's 0.01,
 *      and [8]'s "levels are back on the latest snapshot".
 *   E. drain takes the LAST flux instead of the MAX → exit 1, 6 failures: [2]
 *      both per-band checks (7 and 2 instead of 30 and 9), [4]'s multi-batch
 *      span (3), plus [6] "oldest only", [7] hop 200 and [8]'s live tick —
 *      every case where the onset is not the final hop.
 *   F. `out.fill(0)` removed → exit 1, 7 failures: every "honest zero" line in
 *      [3], [6] and [7], and [4]'s two ticks (the 30 from [3] leaked in) — the
 *      previous max carried across ticks.
 *   G. ring write index left unbounded (no `% RING_SNAPSHOTS`) → exit 1, 5
 *      failures: all three of [5] (snapshotAt reached hop 1 instead of hop
 *      89), [6] "newest only", and [7]'s fallen-out onset read 30.
 *   H. `applySnapshotAt` zeroing `hopsSinceFluxRead` → exit 1, 1 failure, [8]
 *      only ("the live tick still drains all three hops" read 0).
 * Count-based, so every assertion runs on every invocation.
 */

import { WorkletAnalysis, RING_SNAPSHOTS } from '../engine/features/audioMod/WorkletAnalysis';
import { filterBank } from '../engine/features/audioMod/filterBank';
import { MAX_SNAPSHOTS_PER_POST, type AnalysisBatchMessage } from '../engine/features/audioMod/worklet/protocol';

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

/** The quantum-aligned hop the processor uses at 48k. */
const HOP = 256 / 48000;
/** With no AudioContext attached the receiver assumes 48k / 4096 / 6 per
 *  octave — the same defaults `filterBank` boots with, so the two agree on
 *  band count without a reshape. 56 bands at those settings. */
const N = filterBank.bands.length;
const A = 3, B = 20, C = 40;   // three bands, far enough apart to be unrelated

type Receiver = { onBatch(msg: AnalysisBatchMessage): void };
/** The worklet port is `onBatch`'s only production caller; this stands in for it. */
const feed = (wa: WorkletAnalysis, msg: AnalysisBatchMessage) => (wa as unknown as Receiver).onBatch(msg);

type Fill = (hop: number, levels: Float32Array, flux: Float32Array) => number; // returns peak
/** One post of `count` hops starting at global hop index `first`. */
const batch = (first: number, count: number, fill: Fill, bandCount = N): AnalysisBatchMessage => {
  const stride = bandCount * 2;
  const data = new Float32Array(count * stride);
  const times = new Float64Array(count);
  const peaks = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const hop = first + i;
    peaks[i] = fill(hop, data.subarray(i * stride, i * stride + bandCount),
      data.subarray(i * stride + bandCount, (i + 1) * stride));
    times[i] = hop * HOP;
  }
  return { kind: 'bands', bandCount, count, times, peaks, data, dropped: 0 };
};
/** Deliver `total` hops from `first` in worklet-sized posts, as the port would. */
const stream = (wa: WorkletAnalysis, first: number, total: number, fill: Fill) => {
  for (let hop = first, end = first + total; hop < end;) {
    const count = Math.min(MAX_SNAPSHOTS_PER_POST, end - hop);
    feed(wa, batch(hop, count, fill));
    hop += count;
  }
};
const silent: Fill = () => 0;
/** A receiver that has seen one silent hop and been ticked once, so its
 *  write index sits at ring index 1 (not the fresh-object origin) with
 *  nothing unread — the state a wrap has to be measured from. */
const primed = () => {
  const wa = new WorkletAnalysis();
  feed(wa, batch(0, 1, silent));
  wa.update();
  return wa;
};
const flux = (band: number) => filterBank.fluxRate[band];
const allZeroFlux = () => Array.from(filterBank.fluxRate).every(v => v === 0);

console.log(`\n[worklet-analysis] ${N} bands, ring of ${RING_SNAPSHOTS}, hop ${(HOP * 1000).toFixed(2)}ms`);

console.log('\n[1] levels take the LATEST snapshot of a batch');
{
  const wa = new WorkletAnalysis();
  assert(!wa.hasSignal(), 'no signal before the first batch');
  wa.update();
  assert(!wa.hasSignal(), 'a tick before any batch changes nothing');
  feed(wa, batch(1, 3, (hop, levels) => { levels[A] = hop / 10; return hop / 100; }));
  wa.update();
  assert(near(filterBank.levels[A], 0.3), 'levels are hop 3\'s, not hop 1\'s', { got: filterBank.levels[A] });
  assert(near(wa.getPeakLevel(), 0.03), 'peak is hop 3\'s', { got: wa.getPeakLevel() });
  assert(wa.hasSignal(), 'signal is reported once a batch has landed');
}

console.log('\n[2] flux takes the per-band MAX across a batch, not the last hop');
{
  const wa = new WorkletAnalysis();
  const fa = [5, 30, 7], fb = [9, 1, 2];
  feed(wa, batch(1, 3, (hop, _l, f) => { f[A] = fa[hop - 1]; f[B] = fb[hop - 1]; return 0; }));
  wa.update();
  assert(flux(A) === 30, 'band A: max 30 in the middle hop, not the last hop\'s 7', { got: flux(A) });
  assert(flux(B) === 9, 'band B: max 9 in the first hop — bands are independent', { got: flux(B) });
  assert(flux(C) === 0, 'band C: nothing happened, nothing reported');

  console.log('\n[3] a tick with no new snapshot is an HONEST ZERO for flux');
  wa.update();
  assert(allZeroFlux(), 'no new snapshot → fluxRate is 0 everywhere', { A: flux(A), B: flux(B) });
  wa.update();
  assert(allZeroFlux(), 'and stays 0 on the next idle tick');
  assert(wa.hasSignal(), 'signal is still up — zero flux is not loss of signal');
}

console.log('\n[4] the drain spans every batch since the last tick, and never re-reads');
{
  const wa = new WorkletAnalysis();
  feed(wa, batch(1, 3, (_h, _l, f) => { f[A] = 4; return 0; }));
  feed(wa, batch(4, 3, (hop, _l, f) => { f[A] = hop === 5 ? 12 : 3; return 0; }));
  wa.update();
  assert(flux(A) === 12, 'two batches between ticks: the max is taken across both', { got: flux(A) });
  feed(wa, batch(7, 2, (_h, _l, f) => { f[A] = 2; return 0; }));
  wa.update();
  assert(flux(A) === 2, 'the next tick sees only the new batch — the 12 is not re-read', { got: flux(A) });
}

console.log('\n[5] the ring is BOUNDED — the oldest snapshots fall out on their own');
{
  const wa = new WorkletAnalysis();
  const TOTAL = RING_SNAPSHOTS + 88;
  stream(wa, 1, TOTAL, (hop, levels) => { levels[A] = hop / 1000; return 0; });
  const oldest = TOTAL - RING_SNAPSHOTS + 1;   // 89
  const newest = wa.snapshotAt(TOTAL * HOP);
  assert(!!newest && near(newest.t, TOTAL * HOP), `the newest hop (${TOTAL}) is in the ring`, { t: newest?.t });
  const back = wa.snapshotAt(0);
  assert(!!back && near(back.t, oldest * HOP),
    `nearest to t=0 is hop ${oldest} — the ring holds exactly ${RING_SNAPSHOTS}, hops 1..${oldest - 1} are gone`,
    { got: back ? Math.round(back.t / HOP) : null });
  assert(!wa.applySnapshotAt(0, HOP), 'applySnapshotAt refuses a time the ring no longer reaches');
}

console.log(`\n[6] exactly ${RING_SNAPSHOTS} unread hops drain the WHOLE ring (the aliasing bug)`);
{
  const cases: Array<[string, (i: number) => number]> = [
    ['every hop carries flux 30', () => 30],
    ['only the NEWEST hop carries it', (i) => (i === RING_SNAPSHOTS - 1 ? 30 : 0)],
    ['only the OLDEST hop carries it', (i) => (i === 0 ? 30 : 0)],
  ];
  for (const [label, at] of cases) {
    const wa = primed();
    stream(wa, 1, RING_SNAPSHOTS, (hop, _l, f) => { f[A] = at(hop - 1); return 0; });
    wa.update();
    assert(flux(A) === 30, `${label}: ${RING_SNAPSHOTS} unread hops of flux 30 drain as 30, not 0`, { got: flux(A) });
  }
  const wa = primed();
  stream(wa, 1, RING_SNAPSHOTS, (_h, _l, f) => { f[A] = 30; return 0; });
  wa.update();
  wa.update();
  assert(allZeroFlux(), 'the idle tick after a full-ring drain is still an honest zero', { A: flux(A) });
}

console.log('\n[7] past a full lap, everything the ring still holds is drained');
{
  const TOTAL = RING_SNAPSHOTS + 88;
  const oldestHeld = TOTAL - RING_SNAPSHOTS + 1;   // 89
  // Hop 200 is inside the ring but NOT among the 88 written after the lap —
  // the old cursor arithmetic drained only those 88.
  const wa = primed();
  stream(wa, 1, TOTAL, (hop, _l, f) => { f[A] = hop === 200 ? 30 : 0; return 0; });
  wa.update();
  assert(flux(A) === 30, `an onset at hop 200 (held, older than the lap) is seen after ${TOTAL} unread hops`, { got: flux(A) });
  wa.update();
  assert(allZeroFlux(), 'and the tick after it is an honest zero');
  // Hop 50 has already fallen out — that is the bounded ring doing its job,
  // not a drain fault. Pinned so the boundary is a stated number.
  const wb = primed();
  stream(wb, 1, TOTAL, (hop, _l, f) => { f[A] = hop === 50 ? 30 : 0; return 0; });
  wb.update();
  assert(flux(A) === 0, `an onset at hop 50 fell out of the ring (oldest held is hop ${oldestHeld}) — not seen, by design`, { got: flux(A) });
}

console.log('\n[8] applySnapshotAt is a rewind for one frame, not a read');
{
  const wa = new WorkletAnalysis();
  feed(wa, batch(1, 3, (hop, levels, f) => { levels[A] = hop / 10; f[A] = hop === 2 ? 30 : 0; return 0; }));
  assert(wa.applySnapshotAt(1 * HOP, HOP / 2), 'the back-fill finds hop 1');
  assert(near(filterBank.levels[A], 0.1) && flux(A) === 0, 'and writes hop 1\'s levels and flux into the bank',
    { levels: filterBank.levels[A], flux: flux(A) });
  wa.update();
  assert(flux(A) === 30, 'the live tick still drains all three hops — the back-fill moved no cursor', { got: flux(A) });
  assert(near(filterBank.levels[A], 0.3), 'and levels are back on the latest snapshot');
}

console.log('\n[9] a batch from before a reshape never enters the ring');
{
  const wa = new WorkletAnalysis();
  feed(wa, batch(1, 2, (_h, _l, f) => { f[A] = 30; return 0; }, N + 1));
  assert(!wa.hasSignal(), 'a wrong-length batch is discarded — no signal, no snapshot');
  // `filterBank` is a singleton shared by every block; clear what [8] left in
  // it so this reads the receiver, not the previous block.
  filterBank.fluxRate.fill(0);
  wa.update();
  assert(allZeroFlux(), 'and contributes no flux');
  feed(wa, { ...batch(1, 1, silent), kind: 'nope' as 'bands' });
  assert(!wa.hasSignal(), 'an unknown message kind is ignored');
}

console.log(failures === 0 ? '\n[worklet-analysis] all green' : `\n[worklet-analysis] ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
