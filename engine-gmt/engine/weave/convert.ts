/**
 * LUT-preserving Sequence ↔ Rhythm conversion — the pure logic behind the weave
 * editor's mode toggle. Sibling of schedule.ts; NO store / React / GLSL here.
 *
 * The two schedule modes describe the same iteration→slot LUT differently:
 *   - Sequence (counts): rows' iterCount + loop dividers → buildBlockPlan → a
 *     baked `{order, introLen, cycleLen}` LUT. Expressive (any eventually-periodic
 *     pattern) but the editor row model allows only ONE run per row per cycle.
 *   - Rhythm  (modulo): base = first active row; each other active row fires on
 *     ONE arithmetic progression (interval / start / beats). Constrained.
 *
 * So the two directions need different algorithms — a FIT (Sequence→Rhythm) and a
 * SIMULATE-AND-COMPRESS (Rhythm→Sequence) — but share one contract: convert
 * EXACTLY or refuse with a one-line reason; never approximate silently. Exactness
 * is checked by an equality CERTIFICATE over `max(intros) + lcm(cycles)` iterations
 * (two eventually-periodic sequences are equal on ℕ iff they agree on that window).
 *
 * @see plans/mb3d/weave-seq-rhythm-conversion.md (the logic spec)
 * @see engine-gmt/engine/weave/schedule.ts (buildBlockPlan / the phase fns)
 */
import { buildBlockPlan, stepSlot } from './schedule';
import type { WeaveSchedulePlan } from './schedule';

/** The single source of truth for the conversion + the editor's read-clamps.
 *  `layerVal` in WeaveEditorPane imports INTERVAL_MAX/START_MAX/BEATS_MAX so a
 *  fitter can never honour different bounds than the clamp (silent corruption). */
export const BOUNDS = {
    /** Rhythm interval range (a slot firing once per cycle has interval=cycleLen,
     *  so cycles > INTERVAL_MAX are inconvertible — the widening knob, spec §5.2). */
    INTERVAL_MAX: 32,
    START_MAX: 64,
    BEATS_MAX: 64,
    /** Bank cap — a weave holds at most this many slot rows (ADR-0090). */
    MAX_ROWS: 6,
    /** Longest baked intro+cycle a Rhythm→Sequence conversion will materialize. */
    MAX_LUT: 192,
    /** Certificate window cap — beyond this we report "exact within W_MAX". */
    W_MAX: 4096,
} as const;

export interface RhythmLayer {
    interval: number;
    start: number;
    /** ≤ 0 = endless; > 0 = stop after N beats. */
    beats: number;
}

/** A run-length step of a baked LUT: `rowIdx` runs for `count` iterations. */
export interface Run {
    rowIdx: number;
    count: number;
}

/** Structured failure — the editor formats a user-facing string from `reason`
 *  (already label-interpolated via the `label` fn passed into the fitter). */
export interface ConvertFail {
    ok: false;
    reason: string;
}

type PhaseFn = (i: number) => number;

// ── number helpers ──────────────────────────────────────────────────────────
const gcd = (a: number, b: number): number => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; };
const lcm = (a: number, b: number): number => (a && b ? Math.abs(a / gcd(a, b) * b) : Math.max(a, b, 1));
const lcmAll = (xs: number[]): number => xs.reduce((acc, x) => lcm(acc, x), 1);
/** Ascending divisors of n (n ≥ 1). */
function divisors(n: number): number[] {
    const out: number[] = [];
    for (let d = 1; d <= n; d++) if (n % d === 0) out.push(d);
    return out;
}

// ── phase functions (ONE simulator shared by preview + conversion) ────────────

/** Rhythm phase: `base` is the row left running when no layer claims (an EXPLICIT
 *  role, not a position — spec §7); layer j (0-based) drives `layerRows[j]`,
 *  claimed when `rel = i − start ≥ 0 ∧ rel % interval == 0 ∧ (beats ≤ 0 ∨
 *  rel/interval < beats)`. Layers checked in order, FIRST hit wins (matches
 *  emitLayeredModuloGLSL). Returns the ROW index. */
export function rhythmPhase(layers: RhythmLayer[], base: number, layerRows: number[]): PhaseFn {
    return (i: number) => {
        for (let j = 0; j < layers.length; j++) {
            const L = layers[j];
            const iv = Math.max(1, L.interval);
            const rel = i - L.start;
            if (rel >= 0 && rel % iv === 0 && (L.beats <= 0 || rel / iv < L.beats)) return layerRows[j];
        }
        return base;
    };
}

/** Counts/block phase: intro plays once, then the cycle loops. Returns the ROW
 *  index (silent `~row` markers undone via stepSlot). */
export function planPhase(plan: Pick<WeaveSchedulePlan, 'order' | 'introLen' | 'cycleLen'>): PhaseFn {
    const { order, introLen } = plan;
    const cyc = Math.max(1, plan.cycleLen);
    return (i: number) => {
        const idx = i < introLen ? i : introLen + ((i - introLen) % cyc);
        return stepSlot(order[idx] ?? order[order.length - 1] ?? 0);
    };
}

/** Sample a phase fn over `[0, H)`. */
export function simulate(phase: PhaseFn, H: number): number[] {
    const out = new Array<number>(H);
    for (let i = 0; i < H; i++) out[i] = phase(i);
    return out;
}

/** LoopStrip-shaped preview for Rhythm — the editor's old `rhythmPlan` IIFE, now
 *  sharing `rhythmPhase` so preview and conversion can never diverge. */
export function rhythmPreviewPlan(layers: RhythmLayer[], base: number, layerRows: number[], iterCounts: number[], H = 96): WeaveSchedulePlan {
    const order = simulate(rhythmPhase(layers, base, layerRows), H);
    return { order, introLen: order.length, cycleLen: 1, endTo: 0, repeatFrom: 0, nHybrid: iterCounts, hasSilent: false };
}

// ── eventual structure + the equality certificate ────────────────────────────

interface Struct { intro: number; period: number; }

export function planStructure(plan: Pick<WeaveSchedulePlan, 'introLen' | 'cycleLen'>): Struct {
    return { intro: Math.max(0, plan.introLen), period: Math.max(1, plan.cycleLen) };
}

/** Rhythm becomes periodic for `i ≥ intro` where intro = max last-event over
 *  layers (capped: start+interval·beats; endless: start), with period = lcm of
 *  the endless intervals (1 if none). */
export function rhythmStructure(layers: RhythmLayer[]): Struct {
    let intro = 1;
    const endless: number[] = [];
    for (const L of layers) {
        const iv = Math.max(1, L.interval);
        if (L.beats > 0) intro = Math.max(intro, L.start + iv * L.beats);
        else { intro = Math.max(intro, L.start + iv); endless.push(iv); }
    }
    return { intro, period: endless.length ? lcmAll(endless) : 1 };
}

/**
 * The exactness test: two eventually-periodic phase fns are equal on all of ℕ iff
 * they agree on `[0, max(intros) + lcm(periods))`. Returns `capped` when that
 * window exceeds W_MAX (then equality is only proven within W_MAX).
 */
export function certify(a: PhaseFn, sa: Struct, b: PhaseFn, sb: Struct): { equal: boolean; window: number; capped: boolean } {
    const full = Math.max(sa.intro, sb.intro) + lcm(sa.period, sb.period);
    const capped = full > BOUNDS.W_MAX;
    const window = Math.min(full, BOUNDS.W_MAX);
    for (let i = 0; i < window; i++) if (a(i) !== b(i)) return { equal: false, window, capped };
    return { equal: true, window, capped };
}

// ── Sequence → Rhythm : the FIT ───────────────────────────────────────────────

export type FitResult = { ok: true; baseRow: number; layers: RhythmLayer[] } | ConvertFail;

/**
 * Fit a Rhythm to a counts plan's LUT by BASE ELECTION (spec §7).
 *
 * Each non-base active row's occurrence set must be a single AP (constant gap);
 * intro-only rows become beats-capped layers. Per-slot fitting is exact because
 * occurrence sets partition the iterations (disjoint APs → first-beat-wins can
 * never misfire; no composition check needed).
 *
 * The base is the row left running when no layer claims — an explicit ROLE, not a
 * position. It's elected by TAIL DOMINANCE: the base owning the most of the
 * repeating cycle ⇔ minimizing Σ 1/interval over the remaining ENDLESS layers
 * (capped / intro-only layers cost 0), tie-break earliest row. That is the
 * semantic definition of "base", and it makes the modulo enable-gate agree with
 * the counts gate (both fall back to the tail formula). At most ONE row may be
 * unfittable-as-a-layer — it must be the base; two or more ⇒ refuse.
 *
 * @param label rowIdx → display label, for the refusal messages.
 */
export function fitRhythmFromPlan(
    plan: WeaveSchedulePlan,
    activeRows: number[],
    label: (rowIdx: number) => string,
): FitResult {
    if (plan.hasSilent) return { ok: false, reason: 'Silent slots have no Rhythm equivalent — switch them off or remove them.' };
    if (activeRows.length < 2) return { ok: false, reason: 'Rhythm needs at least 2 active formulas.' };

    const H = plan.introLen + 2 * Math.max(1, plan.cycleLen);
    const phase = planPhase(plan);
    const lut = simulate(phase, H);
    const cycleStart = plan.introLen;
    const cycleEnd = plan.introLen + Math.max(1, plan.cycleLen);

    // Fit ONE row's occurrences to a single AP (base-independent — the occurrence
    // set is fixed by the LUT, not by which row is elected base).
    const fitLayer = (r: number): { ok: true; layer: RhythmLayer } | { ok: false; reason: string } => {
        const occ: number[] = [];
        for (let i = 0; i < H; i++) if (lut[i] === r) occ.push(i);
        if (occ.length === 0) return { ok: false, reason: `"${label(r)}" never fires.` };
        const endless = occ.some((i) => i >= cycleStart && i < cycleEnd);
        const gaps: number[] = [];
        for (let m = 1; m < occ.length; m++) gaps.push(occ[m] - occ[m - 1]);
        const even = gaps.every((g) => g === gaps[0]);
        let layer: RhythmLayer;
        if (!endless) {
            if (occ.length === 1) layer = { interval: 1, start: occ[0], beats: 1 };
            else if (even) layer = { interval: gaps[0], start: occ[0], beats: occ.length };
            else return { ok: false, reason: `"${label(r)}" repeats unevenly (gaps ${gaps.join(',')}) — Rhythm fires evenly.` };
        } else if (even) {
            layer = { interval: gaps[0], start: occ[0], beats: 0 };
        } else return { ok: false, reason: `"${label(r)}" repeats unevenly (gaps ${gaps.join(',')}) — Rhythm fires evenly.` };
        if (layer.interval > BOUNDS.INTERVAL_MAX || layer.start > BOUNDS.START_MAX || layer.beats > BOUNDS.BEATS_MAX) {
            return { ok: false, reason: `"${label(r)}" needs interval ${layer.interval} / start ${layer.start} — outside Rhythm's range.` };
        }
        return { ok: true, layer };
    };

    // Memoized per-row layer fit — the occurrence set is base-independent.
    const memo = new Map<number, ReturnType<typeof fitLayer>>();
    const fit1 = (r: number) => { let m = memo.get(r); if (!m) { m = fitLayer(r); memo.set(r, m); } return m; };

    // Try EVERY active row as base; a base is valid iff every OTHER row fits as a
    // layer (a base needs no AP — it fills the gaps — so a row that's uneven OR
    // out-of-range can still be the base). Elect the valid base with the least
    // remaining tail density (⇔ the most-dominant tail), tie-break earliest. The
    // first layer-fit failure supplies the refusal reason if no base works.
    let best: { baseRow: number; layers: RhythmLayer[]; density: number } | null = null;
    let reason = '';
    for (const b of activeRows) {
        const layerRows = activeRows.filter((r) => r !== b);
        const layers: RhythmLayer[] = [];
        let ok = true;
        for (const r of layerRows) { const f = fit1(r); if (!f.ok) { ok = false; if (!reason) reason = f.reason; break; } layers.push(f.layer); }
        if (!ok) continue;
        const density = layers.reduce((s, L) => s + (L.beats <= 0 ? 1 / Math.max(1, L.interval) : 0), 0);
        if (!best || density < best.density) best = { baseRow: b, layers, density };
    }
    if (!best) return { ok: false, reason: reason || 'No slot can serve as the Rhythm base for this pattern.' };

    const layerRows = activeRows.filter((r) => r !== best.baseRow);
    // Certificate (0-diff-gate habit; provably safe by the partition argument).
    if (!certify(phase, planStructure(plan), rhythmPhase(best.layers, best.baseRow, layerRows), rhythmStructure(best.layers)).equal) {
        return { ok: false, reason: 'Internal: fitted Rhythm did not reproduce the sequence.' };
    }
    return { ok: true, baseRow: best.baseRow, layers: best.layers };
}

// ── Rhythm → Sequence : SIMULATE + COMPRESS ───────────────────────────────────

export type RunsResult = { ok: true; introRuns: Run[]; cycleRuns: Run[] } | ConvertFail;

/**
 * Bake a Rhythm's live LUT into Sequence runs (rows + one intro divider).
 *
 * Rhythm interleaves the base between accents (`A A B A C`), which the row model
 * (one run per row per cycle) can only express by DUPLICATING rows — so the
 * caller materializes each run as a row, deep-cloning on a row's 2nd+ use. Refuses
 * when the minimal period needs more than MAX_ROWS runs or MAX_LUT baked steps
 * (co-prime intervals genuinely have no compact sequence form — honest refusal).
 */
export function runsFromRhythm(
    layers: RhythmLayer[],
    base: number,
    layerRows: number[],
    label: (rowIdx: number) => string,
): RunsResult {
    const struct = rhythmStructure(layers);
    if (struct.period > BOUNDS.W_MAX) return { ok: false, reason: `This rhythm's pattern is ${struct.period} iterations long — too long to bake.` };

    const phase = rhythmPhase(layers, base, layerRows);
    const T = struct.intro;
    const P = struct.period;
    const lut = simulate(phase, T + 2 * P);

    // Minimal cycle period: smallest divisor of P that is a period on the tail.
    const tailPeriodic = (p: number) => { for (let i = T; i < T + P; i++) if (lut[i] !== lut[i + p]) return false; return true; };
    let p = P;
    for (const d of divisors(P)) if (tailPeriodic(d)) { p = d; break; }

    // Minimal intro length: scan down from T while p-periodicity still holds.
    let s = T;
    while (s > 0 && lut[s - 1] === lut[s - 1 + p]) s--;

    // RLE the intro [0, s) and one cycle [s, s+p).
    const rle = (from: number, to: number): Run[] => {
        const runs: Run[] = [];
        for (let i = from; i < to; i++) {
            const row = lut[i];
            const last = runs[runs.length - 1];
            if (last && last.rowIdx === row) last.count++;
            else runs.push({ rowIdx: row, count: 1 });
        }
        return runs;
    };
    const introRuns = rle(0, s);
    const cycleRuns = rle(s, s + p);

    const totalRows = introRuns.length + cycleRuns.length;
    if (totalRows > BOUNDS.MAX_ROWS) {
        return { ok: false, reason: `This pattern needs ${totalRows} slot rows — Sequence holds ${BOUNDS.MAX_ROWS}. Simplify intervals or keep Rhythm.` };
    }
    if (s + p > BOUNDS.MAX_LUT) {
        return { ok: false, reason: `This pattern bakes ${s + p} steps — over the ${BOUNDS.MAX_LUT} limit. Simplify intervals or keep Rhythm.` };
    }

    // Verify: the runs, replayed as a counts plan, reproduce the rhythm LUT.
    const iterCounts = [...introRuns, ...cycleRuns].map((r) => r.count);
    const dividers = introRuns.length ? [{ afterRow: introRuns.length - 1, repeat: 1 }] : [];
    const plan2 = buildBlockPlan({ iterCounts, dividers });
    const runRows = [...introRuns, ...cycleRuns].map((r) => r.rowIdx);
    const plan2Phase: PhaseFn = (i) => runRows[planPhase(plan2)(i)] ?? runRows[0];
    const cert = certify(phase, struct, plan2Phase, planStructure(plan2));
    if (!cert.equal) return { ok: false, reason: 'Internal: baked Sequence did not reproduce the rhythm.' };
    void label; // reasons above are self-describing; label reserved for future per-row messages

    return { ok: true, introRuns, cycleRuns };
}
