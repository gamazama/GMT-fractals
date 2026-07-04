/**
 * The weave assembler — turns resolved slots + a schedule phase function into the
 * kernel GLSL pieces of a fused weave formula: the per-slot function definitions,
 * the phase dispatcher, and the loopInit/loopBody that thread per-iteration scratch
 * state. Front-end-agnostic: everything domain-specific (MB3D dIFS folds, Rout
 * recomputes, scratch seed values, param labelling) arrives as data/callbacks.
 *
 * Emitted shape (per slot fn `<fnName>(z, dr, trap, c[, scratch...])`):
 *
 *   void formula_<id>(inout vec4 z, inout float dr, inout float trap, inout vec4 c,
 *                     int i[, inout float <scratch>...]) {
 *     int phase = <schedule.fnName>(i);
 *     [preDispatch]
 *     if (phase == k) { <slot fn call>;[postCall] return; }
 *     ...
 *   }
 *
 * Two per-slot state channels, deliberately BOTH first-class (ADR-0089 P4):
 *  - MB3D slots: flat named floats threaded `inout` (a SHARED orbit's accumulators —
 *    mb3dVary/mb3dRout/… are one fused trajectory's state, slots take turns). The
 *    dispatcher signature carries the UNION of all slots' scratch (first-appearance
 *    order); each slot's call passes only its own.
 *  - Native slots: namespace-prefixed GLOBALS (each slot is a distinct formula with
 *    its OWN independent state — the interlace rewriter's channel, generalized).
 *    Globals cross the dispatcher function boundary with no threading; a native
 *    slot arrives with `loopInit` (its per-pixel reset/precalc, hoisted into the
 *    weave loopInit), `call` (its rewritten loopBody — own c + extra args), and
 *    `preCall`/`postCall` (the shared-rotation swap around the call).
 */

export interface ResolvedWeaveSlot {
    /** Dispatch phase id — the value the schedule phase function returns. */
    phase: number;
    /** The slot function's name (called as `<fnName>(z, dr, trap, c[, scratch])`). */
    fnName: string;
    /** The slot function definition(s), emitted verbatim above the dispatcher. */
    glsl: string;
    /** Per-iteration `inout float` state this slot threads (declaration order matters). */
    scratchVars?: string[];
    /** GLSL appended right after this slot's call, before `return;` (e.g. the MB3D
     *  dIFS fold, the native rotation swap-out). Include a leading space. */
    postCall?: string;
    /** GLSL emitted inside this slot's dispatcher branch BEFORE the call (e.g. the
     *  native rotation swap-in + the slot-local `c`). Include a trailing space. */
    preCall?: string;
    /** Full call-statement override, trailing `;` included (native slots: the
     *  rewritten loopBody — its own c var + extra trailing args). Defaults to the
     *  MB3D shape `<fnName>(z, dr, trap, c[, scratch...]);`. */
    call?: string;
    /** This slot's contribution to the weave loopInit (native slots: the formula's
     *  rewritten loopInit — per-pixel state resets + precalc-once globals), emitted
     *  in slot order after `extraLoopInit`. Terminate with a newline. */
    loopInit?: string;
}

export interface AssembleWeaveInput {
    /** Fused formula id — the dispatcher is emitted as `formula_<id>`. */
    id: string;
    /** Phase function from schedule.ts (emitCountsScheduleGLSL / emitModuloScheduleGLSL). */
    schedule: { glsl: string; fnName: string };
    slots: ResolvedWeaveSlot[];
    /** Shared helper GLSL emitted ONCE above all slot functions (e.g. a rotation
     *  helper two slots both need — inlining per slot would redefine it). */
    prelude?: string;
    /** GLSL emitted before the phase branches, inside the dispatcher (e.g. the MB3D
     *  Rout recompute). Include indentation + trailing newline. */
    preDispatch?: string;
    /** Seed expression per scratch var (defaults to '0.0'). */
    scratchSeed?: (name: string) => string;
    /** GLSL prepended to loopInit (e.g. dIFS accumulator reset). */
    extraLoopInit?: string;
    /** GLSL prepended to loopBody (e.g. a per-iteration scratch refresh). */
    loopBodyPrefix?: string;
}

export interface AssembledWeave {
    /** Slot fns + schedule + dispatcher — goes into `shader.function`. */
    functionGLSL: string;
    loopInit: string;
    loopBody: string;
    /** Union of all slots' scratch vars, first-appearance order. */
    scratchVars: string[];
}

export function assembleWeave(input: AssembleWeaveInput): AssembledWeave {
    const { id, schedule, slots } = input;

    const allScratch = [...new Set(slots.flatMap((s) => s.scratchVars ?? []))];
    const scratchSig = allScratch.map((s) => `, inout float ${s}`).join('');
    const scratchArg = allScratch.map((s) => `, ${s}`).join('');
    const slotScratchArg = (s: ResolvedWeaveSlot) => (s.scratchVars ?? []).map((v) => `, ${v}`).join('');

    const callOf = (s: ResolvedWeaveSlot) => s.call ?? `${s.fnName}(z, dr, trap, c${slotScratchArg(s)});`;
    const dispatcher = `
void formula_${id}(inout vec4 z, inout float dr, inout float trap, inout vec4 c, int i${scratchSig}) {
  int phase = ${schedule.fnName}(i);
${input.preDispatch ?? ''}${slots.map((s) => `  if (phase == ${s.phase}) { ${s.preCall ?? ''}${callOf(s)}${s.postCall ?? ''} return; }`).join('\n')}
}`;

    const functionGLSL = [input.prelude ?? '', ...slots.map((s) => s.glsl), schedule.glsl, dispatcher].join('\n');
    const seed = input.scratchSeed ?? (() => '0.0');
    const loopInit = (input.extraLoopInit ?? '')
        + slots.map((s) => s.loopInit ?? '').join('')
        + allScratch.map((s) => `float ${s} = ${seed(s)};`).join('\n');
    const loopBody = `${input.loopBodyPrefix ?? ''}formula_${id}(z, dr, trap, c, i${scratchArg});`;

    return { functionGLSL, loopInit, loopBody, scratchVars: allScratch };
}
