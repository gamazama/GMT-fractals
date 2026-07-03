/**
 * WeaveSpec — the single contract for "schedule N formulas across the iteration loop".
 *
 * Every weave front-end (the MB3D importer, the interlace feature, the user-facing
 * weaver) AUTHORS a WeaveSpec; the engine weave core turns it into kernel GLSL via
 * one scheduler (schedule.ts) + one assembler (emitWeave.ts). MB3D parse/decompile/
 * transpile stay consumers — this module knows nothing about any front-end's data.
 *
 * Two schedule kinds, deliberately BOTH first-class (user decision 2026-07-03):
 *  - `counts` — MB3D-style: run slot k for iterCount consecutive iterations, wrap
 *    from endTo back to repeatFrom. Baked as a `const int[]` LUT at compile time —
 *    structure edits recompile.
 *  - `modulo` — interlace / Hybrid Box-style: a runtime-uniform gate (every Nth
 *    iteration from a start offset, optionally capped). Live-editable AND
 *    keyframable (the schedule params are DDFS uniforms) — no recompile.
 * Emission is per-spec: a counts weave carries zero modulo code and vice versa; no
 * weave emits nothing (the no-weave kernel stays byte-identical).
 *
 * @see plans/mb3d/sessions/S-nformula-weave-unification.md (the confirmed design)
 * @see docs/adr/0083 (mode-0 ALTERNATE only; modes 1-3 change DE semantics)
 */

/** Where a slot's formula body comes from. The engine core never inspects the payload —
 *  each front-end registers/invokes its own resolver that turns a source into a
 *  ResolvedWeaveSlot (see emitWeave.ts). `native` arrives with the P2 transpiler. */
export type WeaveSlotSource =
    | { kind: 'mb3d'; /** MB3DFormulaSlot — typed by the MB3D resolver, opaque here. */ slot: unknown }
    | { kind: 'native'; formula: string };

export interface WeaveSlot {
    source: WeaveSlotSource;
    /** counts schedule: consecutive iterations this slot runs per visit.
     *  Negative = "silent" (MB3D: runs without advancing escape); 0 = empty slot. */
    iterCount: number;
}

export interface CountsSchedule {
    kind: 'counts';
    /** Wrap bounds (slot indices): after endTo, the cursor returns to repeatFrom.
     *  Callers should pre-clamp to active slots — see weaveSequencer's MB3D adapter. */
    endTo: number;
    repeatFrom: number;
}

export interface ModuloSchedule {
    kind: 'modulo';
    /** Run the secondary slot every `interval` iterations... */
    interval: number;
    /** ...starting at iteration `startIter`... */
    startIter: number;
    /** ...for at most `maxCount` invocations (Hybrid Box); omit for unbounded (interlace). */
    maxCount?: number;
}

export type WeaveSchedule = CountsSchedule | ModuloSchedule;

export interface WeaveSpec {
    /** Ordering mode. 0 = ALTERNATE (the only supported mode — ADR-0083). */
    mode: 0;
    slots: WeaveSlot[];
    schedule: WeaveSchedule;
}
