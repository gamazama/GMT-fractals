/**
 * spike-diff — diff two bench-perf-timeline runs and print pass/fail vs.
 * the spike criteria in docs/animation-refactor/05_SPIKE_PROMPT.md §Step 5.
 *
 * Usage:
 *   npx tsx debug/spike-diff.mts [pre.json] [post.json]
 *
 * Defaults to debug/spike-pre.json and debug/spike-post.json.
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
    animStoreNotifyCount: number;
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

// ─── top profilers per scenario ────────────────────────────────────────
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

// ─── pass criteria ─────────────────────────────────────────────────────
console.log('\n=== pass criteria (need ≥ 2 of 3) ===');
const passes: { crit: string; pass: boolean; detail: string }[] = [];

// Pass-criteria scenarios per 05_SPIKE_PROMPT.md were dope-idle/dope-scrub,
// but the spike's mechanism only fires when the sequence ref actually
// changes — i.e. during recording writes. Include dope-play / graph-play
// (which have isRecording + recordCamera on, ~480 anim.notifies each)
// alongside the original list so we see signal on the right path.
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

// Bench note: the original spike doc named "storeNotifyCount" but the
// bench instrumentation hooked engineStore. We added animStoreNotifyCount
// to measure the axis the spike actually targets. Apply the criterion
// there.
const c1 = check('animStoreNotify -30%', 30, m => m.animStoreNotifyCount, m => m.animStoreNotifyCount, 'drop');
passes.push({ crit: 'animStoreNotifyCount drops ≥30% in dope-idle or dope-scrub', ...c1 });

const c2 = check('frameDt p50 -15%', 15, m => frameTimeMs(m.fpsP50), m => frameTimeMs(m.fpsP50), 'improve');
passes.push({ crit: 'frameDt p50 improves ≥15% (frame time down) in dope-idle or dope-scrub', ...c2 });

// useTrackAnimation profiler — actualMs drops 50%+
let c3pass = false, c3detail = 'no profiler matched';
const profilerKeys = new Set<string>();
for (const m of [...Object.values(preS), ...Object.values(postS)]) {
    for (const k of Object.keys(m.profilers || {})) profilerKeys.add(k);
}
const candidates = Array.from(profilerKeys).filter(k => /slider|track|useTrackAnimation|TrackRow|Slider/i.test(k));
for (const k of candidates) {
    for (const s of Object.keys(preS)) {
        const a = preS[s]?.profilers?.[k]?.totalActualMs ?? 0;
        const b = postS[s]?.profilers?.[k]?.totalActualMs ?? 0;
        if (a === 0) continue;
        const dropPct = ((a - b) / a) * 100;
        if (dropPct >= 50) {
            c3pass = true;
            c3detail = `${k} in ${s}: ${a.toFixed(2)}ms → ${b.toFixed(2)}ms (${dropPct.toFixed(1)}% drop)`;
            break;
        }
    }
    if (c3pass) break;
}
passes.push({ crit: 'useTrackAnimation/Slider profiler actualMs drops ≥50% in any scenario', pass: c3pass, detail: c3detail });

for (const p of passes) {
    console.log(`  [${p.pass ? 'PASS' : 'FAIL'}] ${p.crit}\n         ${p.detail}`);
}

const passCount = passes.filter(p => p.pass).length;
console.log(`\nResult: ${passCount} / 3 criteria met`);

if (passCount >= 2) {
    console.log('Verdict: DIAGNOSIS CONFIRMED — proceed to Phase 0 as planned in 03_SPEC.md §10.');
} else if (c1.pass && !c2.pass) {
    console.log('Verdict: DIAGNOSIS PARTIAL — storeNotify drops but frameDt did not. Paint may be dominant; reprioritise canvas DopeSheet.');
} else if (!c1.pass) {
    console.log('Verdict: DIAGNOSIS INVALIDATED — storeNotifyCount did not drop. Investigate alternative notification sources before refactor.');
} else {
    console.log('Verdict: INCONCLUSIVE — see partial-gain interpretation in 05_SPIKE_PROMPT.md.');
}

console.log(`\nSeed: ${(pre as any).seedKeyframeCount ?? '?'} keys (pre) / ${(post as any).seedKeyframeCount ?? '?'} keys (post)`);