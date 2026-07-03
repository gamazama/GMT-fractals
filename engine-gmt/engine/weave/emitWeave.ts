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
 * Scratch state is flat named floats threaded `inout` (no struct framework yet —
 * the P4 struct-state work lands here when it comes). The dispatcher signature
 * carries the UNION of all slots' scratch (first-appearance order); each slot's
 * call passes only its own.
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
     *  dIFS fold). Include a leading space. */
    postCall?: string;
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

    const dispatcher = `
void formula_${id}(inout vec4 z, inout float dr, inout float trap, inout vec4 c, int i${scratchSig}) {
  int phase = ${schedule.fnName}(i);
${input.preDispatch ?? ''}${slots.map((s) => `  if (phase == ${s.phase}) { ${s.fnName}(z, dr, trap, c${slotScratchArg(s)});${s.postCall ?? ''} return; }`).join('\n')}
}`;

    const functionGLSL = [input.prelude ?? '', ...slots.map((s) => s.glsl), schedule.glsl, dispatcher].join('\n');
    const seed = input.scratchSeed ?? (() => '0.0');
    const loopInit = (input.extraLoopInit ?? '') + allScratch.map((s) => `float ${s} = ${seed(s)};`).join('\n');
    const loopBody = `${input.loopBodyPrefix ?? ''}formula_${id}(z, dr, trap, c, i${scratchArg});`;

    return { functionGLSL, loopInit, loopBody, scratchVars: allScratch };
}
