/**
 * test-number-drag-rate — the rule tying a dragged number field to its slider track
 * (components/inputs/numberDragRate.ts). Owner, 2026-09-13: the number is the PRECISION control,
 * so it is ALWAYS slower than the track — at least `minSlowdown`×, at most `maxSlowdown`× (GMT
 * 2–10×, Gradient Explorer 2–2.5×).
 *
 *   [1] the band holds across a sweep of steps, sensitivities, spans and track widths, for both
 *       feels — "never faster than the track / minSlowdown", "never slower than maxSlowdown"
 *   [2] the controls the 2026-09-13 inventory named, at real numbers: a 1..8 count (was 14 px for
 *       the whole range) lands on the floor; a 1e-6 log param and a 0.001-step formula slider land
 *       on the ceiling; GX's ceiling is 2.5
 *   [3] inside the band the STEP still decides — a finer step is slower until it meets the ceiling
 *   [4] no track: an unmapped number keeps step × 0.5 × sensitivity (vector cells, the timeline's
 *       LEN at 0.15); a MAPPED number gets the virtual track; an unbounded one keeps the step rate
 *
 * Node only, no browser. `npm run test:number-drag-rate`.
 */

import { numberDragRate, DEFAULT_NUMBER_DRAG_FEEL, VIRTUAL_TRACK_PX, type NumberDragFeel } from '../components/inputs/numberDragRate';

let failures = 0;
const check = (ok: boolean, msg: string): void => {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures++;
};
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

const GX: NumberDragFeel = { minSlowdown: 2, maxSlowdown: 2.5 };
const FEELS: [string, NumberDragFeel][] = [['GMT', DEFAULT_NUMBER_DRAG_FEEL], ['GX', GX]];

/** How many times slower than the track the number moves. */
const slowdown = (span: number, trackPx: number, rate: number) => (span / trackPx) / rate;

console.log('[1] the band holds over a sweep');
for (const [name, feel] of FEELS) {
  let n = 0, tooFast = 0, tooSlow = 0;
  for (const step of [1e-6, 1e-4, 0.001, 0.01, 0.05, 0.1, 0.25, 1, 2, 5, 16, 100])
    for (const sensitivity of [0.15, 1, 3])
      for (const span of [1, 2, 7, 14, 100, 360, 4000])
        for (const trackPx of [56, 64, 170, 250, 300, 336, 900])
          for (const mapped of [false, true]) {
            const s = slowdown(span, trackPx, numberDragRate({ step, sensitivity, span, trackPx, mapped, feel }));
            n++;
            if (s < feel.minSlowdown - 1e-9) tooFast++;
            if (s > feel.maxSlowdown + 1e-9) tooSlow++;
          }
  check(tooFast === 0, `${name}: never faster than the track / ${feel.minSlowdown} (${n} cases, ${tooFast} too fast)`);
  check(tooSlow === 0, `${name}: never slower than maxSlowdown ${feel.maxSlowdown}× (${n} cases, ${tooSlow} too slow)`);
}

console.log('[2] the inventory\'s named controls');
{
  // GX Adjust "Repeats": 1..8, step 1, a 250 px bar. The old step rate crossed it in 14 px.
  const repeats = numberDragRate({ step: 1, span: 7, trackPx: 250, feel: GX });
  check(near(slowdown(7, 250, repeats), 2), `a 1..8 count sits on the floor: ${slowdown(7, 250, repeats).toFixed(3)}× (was ${slowdown(7, 250, 0.5).toFixed(3)}×)`);
  check(7 / repeats > 250, `…and crossing it takes longer than the track (${(7 / repeats).toFixed(0)} px > 250)`);

  // GMT "Shadow Bias": log-mapped, display span 100, step 1e-6 — used to need 2e8 px.
  const bias = numberDragRate({ step: 1e-6, span: 100, trackPx: 336, mapped: true });
  check(near(slowdown(100, 336, bias), 10), `a 1e-6 log param sits on GMT's ceiling: ${slowdown(100, 336, bias).toFixed(3)}×`);

  // A formula "Power" 2..16 step 0.001 — was ~95× slower than its track.
  const power = numberDragRate({ step: 0.001, span: 14, trackPx: 300 });
  check(near(slowdown(14, 300, power), 10), `a 0.001-step formula slider sits on the ceiling: ${slowdown(14, 300, power).toFixed(3)}×`);

  // The same slider inside GX is capped at 2.5.
  const gxFine = numberDragRate({ step: 0.001, span: 14, trackPx: 300, feel: GX });
  check(near(slowdown(14, 300, gxFine), 2.5), `GX caps the same slider at 2.5×: ${slowdown(14, 300, gxFine).toFixed(3)}×`);
}

console.log('[3] inside the band the step decides');
{
  // span 100 over 300 px (GMT) = 1/3 per px on the track. Step 0.2 → 0.1/px = 3.3×,
  // 0.1 → 0.05/px = 6.7×, 0.05 → 0.025/px = 13.3× which the ceiling pins to 10.
  const coarse = numberDragRate({ step: 0.2, span: 100, trackPx: 300 });
  const mid = numberDragRate({ step: 0.1, span: 100, trackPx: 300 });
  const fine = numberDragRate({ step: 0.05, span: 100, trackPx: 300 });
  const sCoarse = slowdown(100, 300, coarse), sMid = slowdown(100, 300, mid), sFine = slowdown(100, 300, fine);
  check(sCoarse >= 2 && sCoarse < sMid && sMid < sFine, `coarser is faster: ${sCoarse.toFixed(2)}× < ${sMid.toFixed(2)}× < ${sFine.toFixed(2)}×`);
  check(near(mid, 0.05), `a step inside the band keeps its own rate (0.1 × 0.5 = 0.05/px → ${sMid.toFixed(3)}×)`);
  check(near(sFine, 10), `past the ceiling it pins (${sFine.toFixed(3)}×)`);
}

console.log('[4] no track');
{
  check(near(numberDragRate({ step: 0.01, span: 20 }), 0.005), 'unmapped, no track: step × 0.5 (a vector cell is unchanged)');
  check(near(numberDragRate({ step: 1, sensitivity: 0.15, span: 9990 }), 0.075), 'sensitivity reaches a bare number (timeline LEN 0.15 → 0.075/px)');
  const mappedBare = numberDragRate({ step: 1e-4, span: 100, mapped: true });
  const s = slowdown(100, VIRTUAL_TRACK_PX, mappedBare);
  check(s >= 2 - 1e-9 && s <= 10 + 1e-9, `a mapped number with no track uses the ${VIRTUAL_TRACK_PX} px virtual track (${s.toFixed(2)}×)`);
  check(near(numberDragRate({ step: 0.01, trackPx: 300 }), 0.005), 'unbounded (no span): the step rate, whatever the track');
  check(near(numberDragRate({ step: 0.01, span: Infinity, trackPx: 300 }), 0.005), 'an infinite span is unbounded, not a zero rate');
}

console.log(failures === 0 ? '\nPASS — number drag rate' : `\nFAIL — ${failures} assertion(s)`);
process.exit(failures === 0 ? 0 : 1);
