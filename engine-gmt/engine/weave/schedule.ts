/**
 * The weave scheduler — turns a WeaveSchedule into (a) an iteration→slot plan and
 * (b) the GLSL phase function `int <prefix>_weaveSlot(int i)` the dispatcher calls.
 *
 * `counts` (MB3D-style): a stateful cursor walks the slots, running each for its
 * iterCount consecutive iterations, wrapping from endTo back to repeatFrom (port of
 * MB3D `doHybridPas`, formulas.pas:3439-3474). Every input is known at compile time,
 * so the cursor trajectory is PRECOMPUTED and baked as a `const int[]` LUT — exact,
 * a pure function of the iteration index, not approximate. Structure edits recompile.
 *
 * `modulo` (interlace / Hybrid Box-style): the phase function reads RUNTIME uniforms
 * (interval / start / optional cap) — live-editable and keyframable, no recompile.
 *
 * @assumption Only mode 0 (ALTERNATE) is a pure ordering. Modes 1 (interpolate),
 *   2 (DEcombine/CSG) and 3 (KIFS) change the DE/blend semantics, not just the
 *   order — front-ends must gate emission on `mode === 0`. @see docs/adr/0083
 */

export interface CountsScheduleInput {
    /** Per-slot consecutive-iteration counts. 0 = empty, negative = silent. */
    iterCounts: number[];
    /** Wrap bounds (pre-clamped by the front-end — see the MB3D adapter's nibble
     *  clamps in utils/mb3d/weaveSequencer.ts). */
    endTo: number;
    repeatFrom: number;
}

export interface WeaveSchedulePlan {
    /** Slot index per step, one full intro+cycle. Silent steps (negative iterCount:
     *  run but don't advance escape) are stored as `~slotIndex`. */
    order: number[];
    /** Steps before the repeating cycle begins. */
    introLen: number;
    /** Length of the repeating cycle. */
    cycleLen: number;
    endTo: number;
    repeatFrom: number;
    nHybrid: number[];
    hasSilent: boolean;
}

/** Walk the counts cursor until the (slot, countdown) state repeats — that
 *  repetition is the cycle boundary. */
export function buildCountsPlan(input: CountsScheduleInput): WeaveSchedulePlan {
    const nHybrid = input.iterCounts;

    const allZero = nHybrid.every((v) => v === 0);
    if (allZero) {
        return { order: [0], introLen: 0, cycleLen: 1, endTo: 0, repeatFrom: 0, nHybrid, hasSilent: false };
    }

    const endTo = input.endTo;
    const repeatFrom = input.repeatFrom;

    const order: number[] = [];
    const seen = new Map<string, number>();
    let introLen = 0;
    let cycleLen = -1;
    let hasSilent = false;

    let n = 0; // StartFrom is always slot 0
    let bTmp = Math.abs(nHybrid[n] | 0);
    const GUARD = 200000;
    for (let step = 0; step < GUARD; step++) {
        // Advance the cursor over exhausted / empty slots.
        while (bTmp <= 0) {
            n++;
            if (n > endTo) n = repeatFrom;
            bTmp = Math.abs(nHybrid[n] | 0);
        }
        const key = `${n},${bTmp}`;
        const prev = seen.get(key);
        if (prev !== undefined) {
            introLen = prev;
            cycleLen = step - prev;
            break;
        }
        seen.set(key, step);
        bTmp--;
        if (nHybrid[n] < 0) {
            hasSilent = true;
            order.push(~n); // silent step
        } else {
            order.push(n);
        }
    }
    if (cycleLen < 0) {
        // Did not repeat within the guard — treat the whole thing as one cycle.
        introLen = 0;
        cycleLen = order.length || 1;
    }
    return { order, introLen, cycleLen, endTo, repeatFrom, nHybrid, hasSilent };
}

/** Absolute slot index for a step (undoes the `~` silent marker). */
export function stepSlot(step: number): number {
    return step < 0 ? ~step : step;
}

export interface BlockScheduleInput {
    /** Per-slot consecutive-iteration counts (0 = empty, negative = silent). */
    iterCounts: number[];
    /** LOOP DIVIDERS (P4.7): each divides the rows into blocks. The block ending
     *  at `afterRow` (from the previous divider, or row 0) plays `repeat` times as
     *  part of the intro; the segment AFTER the last divider is the repeating
     *  cycle. Empty ⇒ the whole sequence is one repeating cycle (≡ repeatFrom 0).
     *  A single `{afterRow: k, repeat: 1}` is exactly `buildCountsPlan`'s
     *  `repeatFrom = k+1`, so this is a strict generalization. */
    dividers: Array<{ afterRow: number; repeat: number }>;
}

/**
 * Expand LOOP-DIVIDER blocks into a flat plan — a finite intro of repeated
 * blocks followed by ONE repeating cycle — the exact `{order, introLen,
 * cycleLen}` shape `emitCountsScheduleGLSL` already consumes. The engine emitter
 * is unchanged: dividers are purely an authoring-layer expansion.
 *
 * `[A(2) B(1) C(1) D(1)]` with `[{afterRow:1, repeat:2}]` →
 * order `A A B A A B C D`, introLen 6, cycleLen 2 → `A A B A A B C D C D …`.
 */
export function buildBlockPlan(input: BlockScheduleInput): WeaveSchedulePlan {
    const nHybrid = input.iterCounts;
    let endTo = nHybrid.length - 1;
    while (endTo > 0 && (nHybrid[endTo] | 0) === 0) endTo--;

    // One pass over rows [start..end]: each runs |count| consecutive iterations,
    // empties skipped; a negative count is a silent step (stored as ~slot).
    const runSegment = (start: number, end: number): number[] => {
        const seq: number[] = [];
        for (let r = start; r <= end; r++) {
            const c = nHybrid[r] | 0;
            const n = Math.abs(c);
            for (let j = 0; j < n; j++) seq.push(c < 0 ? ~r : r);
        }
        return seq;
    };

    // Dividers clamped to [0, endTo): a divider AT/after endTo leaves no cycle
    // segment, so it's dropped. De-duped + sorted.
    const seen = new Set<number>();
    const divs = input.dividers
        .map((d) => ({ afterRow: Math.floor(d.afterRow), repeat: Math.max(1, Math.floor(d.repeat) || 1) }))
        .filter((d) => d.afterRow >= 0 && d.afterRow < endTo && !seen.has(d.afterRow) && seen.add(d.afterRow))
        .sort((a, b) => a.afterRow - b.afterRow);

    const order: number[] = [];
    let start = 0;
    for (const d of divs) {
        const seg = runSegment(start, d.afterRow);
        for (let n = 0; n < d.repeat; n++) order.push(...seg);
        start = d.afterRow + 1;
    }
    const introLen = order.length;
    const cycle = runSegment(start, endTo);
    order.push(...cycle);

    if (order.length === 0) {
        return { order: [0], introLen: 0, cycleLen: 1, endTo: 0, repeatFrom: 0, nHybrid, hasSilent: false };
    }
    return {
        order, introLen, cycleLen: Math.max(1, cycle.length),
        endTo, repeatFrom: start, nHybrid, hasSilent: order.some((x) => x < 0),
    };
}

/** Opt-in whole-weave master gate (ADR-0089 P4.4 `weaveEnabled`). `enabled` is a
 *  GLSL float-uniform expression (> 0.5 = weave active); when it reads OFF the
 *  phase function returns the BASE slot's phase — base formula only, every layer
 *  dormant (the legacy `interlaceEnabled`/`hybridMode` semantics). Omit the opts
 *  for an ungated (always-on) phase function — emission is then byte-identical
 *  to the pre-gate shape. */
export interface ScheduleGateOptions {
    enabled?: string;
}

/**
 * Emit the `counts` phase function: a `const int` lookup over one intro+cycle,
 * with the cycle taken modulo. Declared at shader-function scope.
 * With `opts.enabled` (the opt-in master gate), disabled returns the BASE slot —
 * the first step of the repeating CYCLE (`order[introLen]`), so a weave with an
 * intro (e.g. a migrated Hybrid Box fast path: fold intro → host loop) renders
 * its looping base formula when disabled, NOT the intro slot. With no intro
 * (introLen 0) this is `order[0]`, unchanged.
 */
export function emitCountsScheduleGLSL(
    plan: Pick<WeaveSchedulePlan, 'order' | 'introLen' | 'cycleLen'>,
    idPrefix: string,
    opts: ScheduleGateOptions = {},
): { glsl: string; fnName: string } {
    const lut = plan.order.map(stepSlot);
    const fnName = `${idPrefix}_weaveSlot`;
    const arrName = `${idPrefix}_WEAVE`;
    const intro = plan.introLen;
    const cyc = Math.max(1, plan.cycleLen);
    const baseSlot = lut[intro] ?? lut[0] ?? 0; // first CYCLE step = looping base
    const glsl = `
const int ${arrName}[${lut.length}] = int[](${lut.join(', ')});
int ${fnName}(int i) {
${opts.enabled ? `  if (${opts.enabled} < 0.5) return ${baseSlot};\n` : ''}  if (i < ${intro}) return ${arrName}[i];
  return ${arrName}[${intro} + (i - ${intro}) % ${cyc}];
}`;
    return { glsl, fnName };
}

/** The runtime uniforms driving a modulo schedule. Each is a GLSL float-uniform
 *  expression (e.g. 'uInterlaceInterval') — DDFS params, so live AND keyframable. */
export interface ModuloScheduleUniforms {
    /** Optional master gate (> 0.5 = weave active); omit for always-on. */
    enabled?: string;
    interval: string;
    startIter: string;
    /** Optional invocation cap (Hybrid Box's `hybridIter`); omit for unbounded. */
    maxCount?: string;
}

/**
 * Emit the `modulo` phase function: phase 1 (the secondary slot) every `interval`
 * iterations from `startIter`, optionally capped at `maxCount` invocations; phase 0
 * (the primary) otherwise. Reads runtime uniforms — schedule edits are live, no
 * recompile. Consumers: the interlace fold (P2) and Hybrid Box interleave (P2.5).
 */
export function emitModuloScheduleGLSL(
    u: ModuloScheduleUniforms,
    idPrefix: string,
): { glsl: string; fnName: string } {
    const fnName = `${idPrefix}_weaveSlot`;
    const glsl = `
int ${fnName}(int i) {
${u.enabled ? `  if (${u.enabled} < 0.5) return 0;\n` : ''}  int skip = int(${u.interval});
  if (skip < 1) skip = 1;
  int rel = i - int(${u.startIter});
  if (rel < 0 || rel % skip != 0) return 0;
${u.maxCount ? `  if (rel / skip >= int(${u.maxCount})) return 0;\n` : ''}  return 1;
}`;
    return { glsl, fnName };
}

/** One rhythm layer of a layered modulo schedule. Each field is a GLSL
 *  float-uniform expression (DDFS params — live + keyframable). */
export interface ModuloLayerUniforms {
    interval: string;
    startIter: string;
    /** Optional beat cap: the layer stops claiming after N beats (≤ 0 = endless).
     *  A bounded dense layer (interval 1, a few beats) doubles as a sequence-style
     *  intro without baking a counts prefix into the shader. */
    beats?: string;
}

/**
 * Emit the LAYERED modulo phase function — the user weaver's Rhythm with N slots
 * (phase 0 = the base slot; layer n claims phase n). Each layer has its own
 * (interval, startIter[, beats]) gate; layers are checked in order and the FIRST
 * beat that hits wins — layer order = precedence, the same arbitration rule as
 * the skipMainFormula dispatch (ADR-0089 P2.5). All inputs are runtime uniforms,
 * so schedule edits are live and keyframable with zero recompile.
 * With `opts.enabled` (the opt-in master gate), disabled returns phase 0 — the
 * base slot runs alone, every layer dormant.
 */
export function emitLayeredModuloGLSL(
    layers: ModuloLayerUniforms[],
    idPrefix: string,
    opts: ScheduleGateOptions = {},
): { glsl: string; fnName: string } {
    const fnName = `${idPrefix}_weaveSlot`;
    const body = layers.map((L, n) =>
        `  skip = int(${L.interval}); if (skip < 1) skip = 1;
  rel = i - int(${L.startIter});
  if (rel >= 0 && rel % skip == 0${L.beats ? ` && (int(${L.beats}) <= 0 || rel / skip < int(${L.beats}))` : ''}) return ${n + 1};`,
    ).join('\n');
    const glsl = `
int ${fnName}(int i) {
${opts.enabled ? `  if (${opts.enabled} < 0.5) return 0;\n` : ''}  int skip; int rel;
${body}
  return 0;
}`;
    return { glsl, fnName };
}
