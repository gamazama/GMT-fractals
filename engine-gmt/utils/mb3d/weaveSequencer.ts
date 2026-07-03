/**
 * MB3D hybrid weave sequencer.
 *
 * MB3D runs a stateful cursor (`doHybridPas`, formulas.pas:3439-3474): it walks
 * the formula slots, running each for its `iterCount` consecutive iterations,
 * then wraps from `endTo` back to `repeatFrom`. Every input to that state
 * machine (per-slot iterCount, the EndTo/RepeatFrom nibbles) is known at parse
 * time, so we PRECOMPUTE the cursor trajectory and bake it as a GLSL int lookup.
 * This is exact — a pure function of the iteration index `i` — not approximate.
 *
 * @invariant Only mode 0 (ALTERNATE) is a pure ordering. Modes 1 (interpolate),
 *   2 (DEcombine/CSG) and 3 (KIFS) change the DE/blend semantics, not just the
 *   order, and are flagged unsupported by the caller — this module still returns
 *   an order for them but the emit path must gate on `mode === 0`.
 */
import type { MB3DAddon } from './parseMB3D';

export interface WeavePlan {
  mode: number;
  /** Slot index per step, one full intro+cycle. Silent steps (negative MB3D
   *  iterCount: run but don't advance escape) are stored as `~slotIndex`. */
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

/** Port of MB3D's `doHybridPas` cursor, walked until the (slot, countdown)
 *  state repeats — that repetition is the cycle boundary. */
export function buildWeaveSequence(addon: MB3DAddon): WeavePlan {
  const mode = addon.options1 & 3;
  const nHybrid: number[] = [];
  for (let n = 0; n < 6; n++) nHybrid.push(addon.slots[n]?.iterCount ?? 0);

  const allZero = nHybrid.every((v) => v === 0);
  if (allZero) {
    return { mode, order: [0], introLen: 0, cycleLen: 1, endTo: 0, repeatFrom: 0, nHybrid, hasSilent: false };
  }

  let endTo = addon.hybOpt1 & 7;
  let repeatFrom = addon.hybOpt1 >> 4;
  // Mode-0 EndTo override (HeaderTrafos GetHybridPars): clamp EndTo to the last
  // slot with a non-zero iterCount.
  if (mode === 0) {
    let x = 5;
    while (x > 0 && nHybrid[x] === 0) x--;
    endTo = x;
  }
  // Clamp RepeatFrom to a non-empty slot at or before EndTo.
  {
    let x = endTo;
    while (x > 0 && nHybrid[x] <= 0) x--;
    repeatFrom = Math.min(x, repeatFrom);
  }

  const order: number[] = [];
  const seen = new Map<string, number>();
  let introLen = 0;
  let cycleLen = -1;
  let hasSilent = false;

  let n = 0; // StartFrom1 is always 0
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
  return { mode, order, introLen, cycleLen, endTo, repeatFrom, nHybrid, hasSilent };
}

/** Absolute slot index for a step (undoes the `~` silent marker). */
export function stepSlot(step: number): number {
  return step < 0 ? ~step : step;
}

/**
 * Emit the GLSL that maps an iteration index `i` to a slot index:
 * a `const int` lookup over one intro+cycle, with the cycle taken modulo.
 * Declared at shader-function scope (concatenated into `shader.function`).
 */
export function emitWeaveGLSL(plan: WeavePlan, idPrefix: string): { glsl: string; fnName: string } {
  const lut = plan.order.map(stepSlot);
  const fnName = `${idPrefix}_weaveSlot`;
  const arrName = `${idPrefix}_WEAVE`;
  const intro = plan.introLen;
  const cyc = Math.max(1, plan.cycleLen);
  const glsl = `
const int ${arrName}[${lut.length}] = int[](${lut.join(', ')});
int ${fnName}(int i) {
  if (i < ${intro}) return ${arrName}[i];
  return ${arrName}[${intro} + (i - ${intro}) % ${cyc}];
}`;
  return { glsl, fnName };
}
