/**
 * Guard for image-sequence frame numbering.
 *
 * Node-only, no browser, no GPU — imports the pure mapping directly.
 *
 * Written for a production report (2026-08-31): "when you restart a render at
 * frame 690, the numbering of the saved frames starts over from 0". The
 * exporter was stamping files with the 0-based pass index instead of the
 * timeline frame, so two runs over different ranges produced the same names and
 * the second overwrote the first.
 *
 * Falsified before being trusted: replacing the body of exportFrameFileNumber
 * with `return frameIndex` reds blocks [1], [2], [4] and [5].
 */
import { exportFrameFileNumber, exportFrameFileTag } from '../engine-gmt/engine/worker/exportFrameNaming';

let failed = 0;
const check = (label: string, got: unknown, want: unknown) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

// [1] The reported bug: a restart partway down the timeline keeps its numbering.
check('[1] restart at 690 does not restart numbering at 0',
    exportFrameFileNumber(0, 690, 1), 690);
check('[1] and continues from there',
    [1, 2, 3].map((i) => exportFrameFileNumber(i, 690, 1)), [691, 692, 693]);

// [2] Two runs over DIFFERENT ranges must not collide — the overwrite half of
//     the bug, which is the part that destroys work rather than just confusing.
const runA = [0, 1, 2].map((i) => exportFrameFileTag(i, 0, 1));
const runB = [0, 1, 2].map((i) => exportFrameFileTag(i, 690, 1));
check('[2] a 0-based run and a 690-based run share no file name',
    runA.some((n) => runB.includes(n)), false);

// [3] A render that genuinely starts at 0 is unchanged — the old behaviour was
//     correct for this case, which is why the bug survived.
check('[3] a range starting at 0 numbers exactly as before',
    [0, 1, 2].map((i) => exportFrameFileNumber(i, 0, 1)), [0, 1, 2]);

// [4] Step > 1 advances by the step, so names match the timeline frames the
//     user actually rendered rather than being densely packed.
check('[4] frameStep 4 from 100 yields timeline frames',
    [0, 1, 2].map((i) => exportFrameFileNumber(i, 100, 4)), [100, 104, 108]);

// [5] Zero padding, and that it widens rather than truncating past 5 digits.
check('[5] pads to five digits', exportFrameFileTag(0, 690, 1), '00690');
check('[5] does not truncate a six-digit frame', exportFrameFileTag(0, 123456, 1), '123456');

// [6] Degenerate inputs cannot produce a negative or fractional name.
check('[6] frameStep 0 is treated as 1', exportFrameFileNumber(3, 10, 0), 13);
check('[6] negative startFrame clamps to 0', exportFrameFileNumber(2, -5, 1), 2);

console.log(`\n${failed === 0 ? '✓ export naming OK' : `✗ ${failed} assertion(s) failed`}`);
process.exit(failed > 0 ? 1 : 0);
