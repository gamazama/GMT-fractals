/**
 * MB3D → weave-core adapter (the hybrid weave sequencer's original home).
 *
 * The scheduling machinery itself lives in the engine weave core
 * (engine/weave/schedule.ts — counts cursor walk, LUT emission); this module maps
 * MB3D's addon encoding onto it and preserves the original public API:
 *  - the mode nibble (`options1 & 3`),
 *  - the EndTo/RepeatFrom nibbles (`hybOpt1`), with MB3D's HeaderTrafos
 *    GetHybridPars clamps (mode-0 EndTo override to the last active slot;
 *    RepeatFrom clamped to a non-empty slot at or before EndTo),
 *  - the fixed 6-slot iterCount table.
 *
 * @invariant Only mode 0 (ALTERNATE) is a pure ordering. Modes 1 (interpolate),
 *   2 (DEcombine/CSG) and 3 (KIFS) change the DE/blend semantics, not just the
 *   order, and are flagged unsupported by the caller — this module still returns
 *   an order for them but the emit path must gate on `mode === 0`.
 */
import type { MB3DAddon } from './parseMB3D';
import type { WeaveSpec } from '../../engine/weave/types';
import { buildCountsPlan, emitCountsScheduleGLSL, stepSlot } from '../../engine/weave/schedule';
import type { WeaveSchedulePlan } from '../../engine/weave/schedule';

export interface WeavePlan extends WeaveSchedulePlan {
    mode: number;
}

/** MB3D addon → WeaveSpec (the engine weave contract) + the scene's mode nibble.
 *  Wrap bounds arrive pre-clamped per MB3D's own HeaderTrafos GetHybridPars. */
export function weaveSpecFromMB3D(addon: MB3DAddon): { spec: WeaveSpec; mode: number } {
    const mode = addon.options1 & 3;
    const iterCounts: number[] = [];
    for (let n = 0; n < 6; n++) iterCounts.push(addon.slots[n]?.iterCount ?? 0);

    let endTo = addon.hybOpt1 & 7;
    let repeatFrom = addon.hybOpt1 >> 4;
    // Mode-0 EndTo override (HeaderTrafos GetHybridPars): clamp EndTo to the last
    // slot with a non-zero iterCount.
    if (mode === 0) {
        let x = 5;
        while (x > 0 && iterCounts[x] === 0) x--;
        endTo = x;
    }
    // Clamp RepeatFrom to a non-empty slot at or before EndTo.
    {
        let x = endTo;
        while (x > 0 && iterCounts[x] <= 0) x--;
        repeatFrom = Math.min(x, repeatFrom);
    }

    return {
        mode,
        spec: {
            mode: 0,
            slots: iterCounts.map((iterCount, n) => ({
                source: { kind: 'mb3d', slot: addon.slots[n] },
                iterCount,
            })),
            schedule: { kind: 'counts', endTo, repeatFrom },
        },
    };
}

/** Original API: MB3D addon → iteration plan (mode + the counts-cursor walk). */
export function buildWeaveSequence(addon: MB3DAddon): WeavePlan {
    const { spec, mode } = weaveSpecFromMB3D(addon);
    const sched = spec.schedule as { kind: 'counts'; endTo: number; repeatFrom: number };
    const plan = buildCountsPlan({
        iterCounts: spec.slots.map((s) => s.iterCount),
        endTo: sched.endTo,
        repeatFrom: sched.repeatFrom,
    });
    return { mode, ...plan };
}

/** Original API, now the weave core's counts LUT emitter. */
export const emitWeaveGLSL = emitCountsScheduleGLSL;
export { stepSlot };
