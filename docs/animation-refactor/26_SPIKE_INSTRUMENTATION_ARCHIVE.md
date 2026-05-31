# 26 — Spike Instrumentation Archive

> **Status:** archive note, written 2026-05-31 during the v1-readiness sweep.
> **Why this exists:** the three timeline-perf spike worktrees (`probe/dopesheet`,
> `probe/engine-fanout`, `spike/pertrack-sub`) were force-removed during branch
> cleanup. Their **branches were merged ancestors of `dev`** and their **conclusions
> are already archived** in `06_SPIKE_FINDINGS.md`, `08_ENGINE_PROBE_FINDINGS.md`,
> and `15_DOPESHEET_PROBE_FINDINGS.md` (verified byte-identical to the worktree copies).
> What the worktrees *also* held was **uncommitted instrumentation** that never landed.
> Per the owner's call ("keep + document the worthwhile instrumentation, discard the
> rest"), this file preserves the reusable parts so a future timeline-perf pass can
> re-apply them without re-deriving them. The throwaway refactor attempts and the
> measurement `*.json` dumps were discarded with the worktrees.
>
> Nothing here is wired into the live tree — it is a recipe, not a feature.

---

## A. `spike-diff.mts` — bench-delta tool *(most reusable; preserve verbatim)*

A standalone diff of two `bench-perf-timeline` runs: per-scenario notify/frameDt/longTask
deltas, top profilers by `totalActualMs`, and a ≥2-of-3 pass-criteria verdict. Reusable for
**any** future timeline perf spike (re-point the scenario names + criteria). Run:
`npx tsx debug/spike-diff.mts [pre.json] [post.json]` (defaults `debug/spike-pre.json` / `-post.json`).

```ts
/**
 * spike-diff — diff two bench-perf-timeline runs and print pass/fail vs.
 * the spike criteria in docs/animation-refactor/05_SPIKE_PROMPT.md §Step 5.
 *
 * Usage:
 *   npx tsx debug/spike-diff.mts [pre.json] [post.json]
 *   Defaults to debug/spike-pre.json and debug/spike-post.json.
 */
import { readFileSync } from 'fs';

const preP  = process.argv[2] || 'debug/spike-pre.json';
const postP = process.argv[3] || 'debug/spike-post.json';
const pre  = JSON.parse(readFileSync(preP,  'utf8'));
const post = JSON.parse(readFileSync(postP, 'utf8'));

type Bucket = { count: number; totalActualMs: number; totalBaseMs: number; maxActualMs: number };
type Med = {
    fpsP50: number; fpsP5: number;
    storeNotifyCount: number;
    animStoreNotifyCount: number;        // see §B — separate anim-store axis
    longTaskCount: number; longTaskTotalMs: number;
    workerFps: number; heapDeltaMb: number;
    profilers: Record<string, Bucket>;
};
type ScenRow = { name: string; median: Med };

const byName = (rows: ScenRow[]): Record<string, Med> => {
    const o: Record<string, Med> = {};
    for (const r of rows) o[r.name] = r.median;
    return o;
};
const preS:  Record<string, Med> = byName(pre.results  ?? pre.scenarios ?? pre);
const postS: Record<string, Med> = byName(post.results ?? post.scenarios ?? post);

const fmtMs  = (ms: number) => `${ms.toFixed(2)}ms`;
const fmtPct = (a: number, b: number) => {
    if (a === 0) return b === 0 ? '0.0%' : '+inf%';
    const pct = ((b - a) / a) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
};
const frameTimeMs = (fps: number) => fps > 0 ? 1000 / fps : 0;

const scenarios = Array.from(new Set([...Object.keys(preS), ...Object.keys(postS)])).sort();
console.log(`\n=== bench delta: ${preP} → ${postP} ===\n`);

const rows: string[] = [];
rows.push(['scenario', 'eng.notify pre→post', 'anim.notify pre→post (Δ%)', 'frameDt p50 pre→post', 'frameDt p5 pre→post', 'longTask pre→post'].join(' | '));
rows.push(rows[0].split(' | ').map(s => '-'.repeat(s.length)).join('-|-'));
for (const name of scenarios) {
    const a = preS[name], b = postS[name];
    if (!a || !b) { rows.push(`${name} | (missing on one side)`); continue; }
    const aDt50 = frameTimeMs(a.fpsP50), bDt50 = frameTimeMs(b.fpsP50);
    const aDt5  = frameTimeMs(a.fpsP5),  bDt5  = frameTimeMs(b.fpsP5);
    rows.push([
        name,
        `${a.storeNotifyCount.toFixed(0)} → ${b.storeNotifyCount.toFixed(0)}`,
        `${a.animStoreNotifyCount.toFixed(0)} → ${b.animStoreNotifyCount.toFixed(0)} (${fmtPct(a.animStoreNotifyCount, b.animStoreNotifyCount)})`,
        `${fmtMs(aDt50)} → ${fmtMs(bDt50)} (${fmtPct(aDt50, bDt50)})`,
        `${fmtMs(aDt5)} → ${fmtMs(bDt5)} (${fmtPct(aDt5, bDt5)})`,
        `${fmtMs(a.longTaskTotalMs)} → ${fmtMs(b.longTaskTotalMs)} (${fmtPct(a.longTaskTotalMs, b.longTaskTotalMs)})`,
    ].join(' | '));
}
console.log(rows.join('\n'));

console.log('\n=== top profilers by totalActualMs (pre vs post) ===');
for (const name of scenarios) {
    const a = preS[name], b = postS[name];
    if (!a || !b) continue;
    const ids = Array.from(new Set([...Object.keys(a.profilers || {}), ...Object.keys(b.profilers || {})]));
    const top = ids
        .map(id => {
            const av = a.profilers?.[id]?.totalActualMs ?? 0;
            const bv = b.profilers?.[id]?.totalActualMs ?? 0;
            const ac = a.profilers?.[id]?.count ?? 0;
            const bc = b.profilers?.[id]?.count ?? 0;
            return { id, av, bv, ac, bc, max: Math.max(av, bv) };
        })
        .sort((x, y) => y.max - x.max)
        .slice(0, 8);
    console.log(`\n--- ${name} ---`);
    for (const t of top) {
        console.log(`  ${t.id.padEnd(28)} ${fmtMs(t.av).padStart(9)} (${String(t.ac).padStart(4)}x) → ${fmtMs(t.bv).padStart(9)} (${String(t.bc).padStart(4)}x)   ${fmtPct(t.av, t.bv)}`);
    }
}

console.log('\n=== pass criteria (need ≥ 2 of 3) ===');
const passes: { crit: string; pass: boolean; detail: string }[] = [];
const check = (name: string, threshold: number, getA: (m: Med) => number, getB: (m: Med) => number, label: string) => {
    const sc = ['dope-idle', 'dope-scrub', 'dope-play', 'graph-play'];
    let best: { pass: boolean; detail: string } = { pass: false, detail: 'no scenario met threshold' };
    let bestPct = -Infinity;
    for (const s of sc) {
        if (!preS[s] || !postS[s]) continue;
        const a = getA(preS[s]), b = getB(postS[s]);
        if (a === 0) continue;
        const dropPct = ((a - b) / a) * 100;
        if (dropPct > bestPct) {
            bestPct = dropPct;
            const fmt = label.includes('drop') ? `${dropPct.toFixed(1)}% drop` : `${(-dropPct).toFixed(1)}% improve`;
            best = { pass: dropPct >= threshold, detail: `${s}: ${a.toFixed(2)} → ${b.toFixed(2)} (${fmt})` };
        }
    }
    return best;
};
const c1 = check('animStoreNotify -30%', 30, m => m.animStoreNotifyCount, m => m.animStoreNotifyCount, 'drop');
passes.push({ crit: 'animStoreNotifyCount drops ≥30% in dope-idle or dope-scrub', ...c1 });
const c2 = check('frameDt p50 -15%', 15, m => frameTimeMs(m.fpsP50), m => frameTimeMs(m.fpsP50), 'improve');
passes.push({ crit: 'frameDt p50 improves ≥15% (frame time down) in dope-idle or dope-scrub', ...c2 });
let c3pass = false, c3detail = 'no profiler matched';
const profilerKeys = new Set<string>();
for (const m of [...Object.values(preS), ...Object.values(postS)]) for (const k of Object.keys(m.profilers || {})) profilerKeys.add(k);
const candidates = Array.from(profilerKeys).filter(k => /slider|track|useTrackAnimation|TrackRow|Slider/i.test(k));
for (const k of candidates) {
    for (const s of Object.keys(preS)) {
        const a = preS[s]?.profilers?.[k]?.totalActualMs ?? 0;
        const b = postS[s]?.profilers?.[k]?.totalActualMs ?? 0;
        if (a === 0) continue;
        const dropPct = ((a - b) / a) * 100;
        if (dropPct >= 50) { c3pass = true; c3detail = `${k} in ${s}: ${a.toFixed(2)}ms → ${b.toFixed(2)}ms (${dropPct.toFixed(1)}% drop)`; break; }
    }
    if (c3pass) break;
}
passes.push({ crit: 'useTrackAnimation/Slider profiler actualMs drops ≥50% in any scenario', pass: c3pass, detail: c3detail });
for (const p of passes) console.log(`  [${p.pass ? 'PASS' : 'FAIL'}] ${p.crit}\n         ${p.detail}`);
const passCount = passes.filter(p => p.pass).length;
console.log(`\nResult: ${passCount} / 3 criteria met`);
if (passCount >= 2) console.log('Verdict: DIAGNOSIS CONFIRMED — proceed to Phase 0 as planned in 03_SPEC.md §10.');
else if (c1.pass && !c2.pass) console.log('Verdict: DIAGNOSIS PARTIAL — storeNotify drops but frameDt did not. Paint may be dominant; reprioritise canvas DopeSheet.');
else if (!c1.pass) console.log('Verdict: DIAGNOSIS INVALIDATED — storeNotifyCount did not drop. Investigate alternative notification sources before refactor.');
else console.log('Verdict: INCONCLUSIVE — see partial-gain interpretation in 05_SPIKE_PROMPT.md.');
console.log(`\nSeed: ${(pre as any).seedKeyframeCount ?? '?'} keys (pre) / ${(post as any).seedKeyframeCount ?? '?'} keys (post)`);
```

---

## B. `animStoreNotifyCount` — measure the animation store separately *(worthwhile; small)*

The timeline lives on a **separate Zustand store** (`window.useAnimationStore`) from
`engineStore`. The existing bench harness only counted `engineStore` notifications, so a
per-track-subscription spike couldn't actually be evaluated. Add an independent subscriber.
Patch into `debug/bench-perf-timeline.mts` (`initScript` + the `ScenarioMetrics` plumbing):

```js
// in initScript, alongside the engineStore hook:
let animStoreUnsub = null;
const hookAnimStore = () => {
    const s = window.useAnimationStore;
    if (!s || typeof s.subscribe !== 'function') return false;
    animStoreUnsub = s.subscribe(() => { if (b.capturing) b.animStoreNotifyCount += 1; });
    return true;
};
const animStoreHookInterval = setInterval(() => { if (hookAnimStore()) clearInterval(animStoreHookInterval); }, 50);
```
Then thread `animStoreNotifyCount` through `ScenarioMetrics`, the reset block, the snapshot
payload, `summarise()` (median), `snapshotToMetrics()`, and the summary table (add an
`anim.notify` column next to `eng.notify`). `spike-diff.mts` (§A) already reads it.

---

## C. Fit-to-view bench seam — don't let virtualisation clip seeded keys *(worthwhile)*

`TrackRow.visibleSlice` / DopeSheet virtualisation clips off-screen keyframes out of the
**measured** render path, so a perf bench undercounts unless the timeline is fitted to the
viewport first. Needs a `window.__timelineSetFrameWidth(fw)` seam on `Timeline.tsx`. In the
bench, after seeding keyframes and before warm-up:

```js
await page.evaluate(({ duration, vw }) => {
    const setFW = window.__timelineSetFrameWidth;
    if (typeof setFW !== 'function') { console.warn('[bench] __timelineSetFrameWidth missing — TrackRow virtualisation will clip seeded keys'); return; }
    const usable = Math.max(400, vw - 320);   // leave room for sidebar (~256px) + margin
    setFW(Math.max(0.5, usable / Math.max(1, duration)));
}, { duration: seedDuration, vw: VIEWPORT.width });
await page.evaluate(`window.__bench.waitFrames(8)`);
```

---

## D. `TrackRowTickStats` — imperative `TrackRow.tick()` cost probe *(worthwhile for a tick-cost dig)*

Breaks down the imperative per-frame `TrackRow.tick()` cost into display-loop / diamond-loop /
group-diamond-loop time + call counts. Two halves:

**Component side** (`components/timeline/TrackRow.tsx`, in `tick()` — marked "strip before merge"):
populate a `window.__trackRowTickStats` global by wrapping each loop with `performance.now()`
deltas (`displayLoopMs`/`diamondLoopMs`/`groupDiamondLoopMs` + `*Calls` + `totalMs`/`calls`).

**Harness side** (`debug/bench-perf-timeline.mts`): a `TrackRowTickStats` interface on
`ScenarioMetrics`, a `mergeTrackRowStats()` median reducer, a per-scenario reset
(`window.__trackRowTickStats` zeroed before each run), capture after each run
(`m.trackRowTickStats = {...window.__trackRowTickStats}`), and a probe table at the end.
*(Full diff was in the discarded `probe/dopesheet` worktree; reconstruct from this recipe.)*

---

## E. `App.tsx` naked full-store subscription — code smell, NOT a perf win *(measured)*

`App.tsx:34` does `const state = useEngineStore();` — a **naked full-store subscription**.
It's a genuine footgun in shape: App re-renders every frame during playback / active-LFO,
because `setLiveModulations` writes the engine store per frame (the `AnimationSystem` guard at
`:587-610` only suppresses writes when values are *unchanged*, which isn't the case while an LFO
is sweeping). App reads ~12 fields (`isBroadcastMode`, `interactionMode`, `panels`,
`contextMenu`, `helpWindow` + stable action refs); the rest could be per-field selectors.

**But this is already bench-settled — do NOT chase it as a perf fix.** The `probe/engine-fanout`
run (this same spike, `08_ENGINE_PROBE_FINDINGS.md`) narrowed exactly this (Variant C, 12
per-field selectors) and measured **zero impact**: bit-for-bit 480 commits, ±3% ms (noise).
Reason: the per-frame fanout is **system-wide** — every component independently subscribes the
*animation* store at notification rate, so narrowing App alone doesn't reduce React scheduler
passes. The dominant cost the probe isolated was `Timeline:Graph` polyline work (~7 ms/commit),
**since fixed** by the canvas GraphEditor refactor (`utils/GraphRenderer.ts` `_polylineCache`,
100% hit-rate; canvas DopeSheet too — see `11_/16_CANVAS_*_REPORT.md`).

**Disposition:** optional code-hygiene only (one `set()` touches fewer subscribers), low
priority, **not a v1 item**. If ever done, re-derive a *full-coverage* narrowing on `dev` — the
probe's sketch was incomplete (the `const state = {...}` adapter shed reactivity for any field
not listed). The same naked-`useEngineStore()` pattern elsewhere is the more worthwhile grep
(`UI_PERF_HANDOFF.md` documents past cleanups of it), but again as hygiene, not lag-fixing.

---

*Discarded (conclusions preserved in 06/08/15_*FINDINGS.md): the per-track-subscription and
engine-fanout refactor attempts themselves ("does not move the needle"), plus all
`spike-*.json` / `probe-*.json` / `dopesheet-probe-*.json` measurement dumps.*
