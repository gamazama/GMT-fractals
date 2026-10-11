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
 *
 * Blocks [7] to [10] (2026-10-11) pin the files ONE frame makes
 * (`exportFrameFiles`) and when a frame counts as there (`exportFrameState`).
 * Both are read twice in the app: by the worker that writes a frame's files,
 * and by the runner that looks for them before a render, to ask whether the
 * frames already in the folder are to be overwritten or continued from. The
 * names here are the names GMT wrote before that day (measured in the app:
 * debug/scratch/r6c/gmt-sequence-names.mts), so a red line is a renamed file.
 *
 * FALSIFICATION RECORD, 2026-10-11, one break per run in
 * engine-gmt/engine/worker/exportFrameNaming.ts:
 *   - PNG alpha alone named as beauty is (`${base}_alpha_${frameTag}` ->
 *     `${base}_${frameTag}`)            -> 2 red ("[7] PNG alpha alone is
 *     <base>_alpha_<frame>.png", "[7] PNG alpha + depth keeps alpha under
 *     its own name")
 *   - an empty file counted as there (`size > 0` -> `size >= 0` in
 *     `exportFrameState`)               -> 1 red ("[10] an empty file: in part")
 * The beauty + alpha merge, the JPG names and block [9] pass and were not
 * broken on purpose.
 */
import { exportFrameFileNumber, exportFrameFileTag, exportFrameFiles, exportFrameState } from '../engine-gmt/engine/worker/exportFrameNaming';

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

// [7] PNG: the files one frame makes. Beauty and alpha together are ONE RGBA
//     file under beauty's own name; depth is always a file of its own.
const BASE = 'Mandelbulb_v3_1280x720';
const png = (passes: Array<'beauty' | 'alpha' | 'depth'>) => exportFrameFiles(BASE, exportFrameFileTag(2, 690, 1), 'png', 'png', passes);
check('[7] PNG beauty is <base>_<frame>.png',
    png(['beauty']), [{ name: 'Mandelbulb_v3_1280x720_00692.png', from: 'beauty' }]);
check('[7] PNG beauty + alpha is that SAME one file, the two merged',
    png(['beauty', 'alpha']), [{ name: 'Mandelbulb_v3_1280x720_00692.png', from: 'beauty+alpha' }]);
check('[7] PNG alpha alone is <base>_alpha_<frame>.png',
    png(['alpha']), [{ name: 'Mandelbulb_v3_1280x720_alpha_00692.png', from: 'alpha' }]);
check('[7] PNG depth is always its own file, after the picture',
    png(['beauty', 'alpha', 'depth']), [
        { name: 'Mandelbulb_v3_1280x720_00692.png', from: 'beauty+alpha' },
        { name: 'Mandelbulb_v3_1280x720_depth_00692.png', from: 'depth' },
    ]);
check('[7] PNG beauty + depth, and depth alone',
    [png(['beauty', 'depth']).map((f) => f.name), png(['depth']).map((f) => f.name)],
    [['Mandelbulb_v3_1280x720_00692.png', 'Mandelbulb_v3_1280x720_depth_00692.png'], ['Mandelbulb_v3_1280x720_depth_00692.png']]);
check('[7] PNG alpha + depth keeps alpha under its own name',
    png(['alpha', 'depth']).map((f) => f.name), ['Mandelbulb_v3_1280x720_alpha_00692.png', 'Mandelbulb_v3_1280x720_depth_00692.png']);

// [8] JPG cannot carry alpha: one file a pass, the pass in the name, in the
//     order the passes are rendered.
const jpg = (passes: Array<'beauty' | 'alpha' | 'depth'>) => exportFrameFiles(BASE, exportFrameFileTag(0, 0, 1), 'jpg', 'jpg', passes);
check('[8] JPG is one file a pass, <base>_<pass>_<frame>.jpg',
    jpg(['beauty', 'alpha', 'depth']), [
        { name: 'Mandelbulb_v3_1280x720_beauty_00000.jpg', from: 'beauty' },
        { name: 'Mandelbulb_v3_1280x720_alpha_00000.jpg', from: 'alpha' },
        { name: 'Mandelbulb_v3_1280x720_depth_00000.jpg', from: 'depth' },
    ]);
check('[8] JPG beauty alone still says its pass',
    jpg(['beauty']).map((f) => f.name), ['Mandelbulb_v3_1280x720_beauty_00000.jpg']);

// [9] No pass, no file; and every name of a frame is its own.
check('[9] no pass makes no file', [png([]), jpg([])], [[], []]);
check('[9] no two files of a frame share a name',
    [png(['beauty', 'alpha', 'depth']), png(['alpha', 'depth']), jpg(['beauty', 'alpha', 'depth'])].every((files) => new Set(files.map((f) => f.name)).size === files.length), true);

// [10] A frame is THERE only with every one of its files, none of them empty
//      (sizes in bytes; -1: no such file). In part is not there: it is rendered again.
check('[10] every file there and none empty: whole', [exportFrameState([812]), exportFrameState([812, 96])], ['whole', 'whole']);
check('[10] a file missing: in part', exportFrameState([812, -1]), 'part');
check('[10] an empty file: in part', [exportFrameState([812, 0]), exportFrameState([0])], ['part', 'part']);
check('[10] nothing of it there: none', [exportFrameState([-1, -1]), exportFrameState([-1])], ['none', 'none']);
check('[10] a frame that makes no file is not there', exportFrameState([]), 'none');

console.log(`\n${failed === 0 ? '✓ export naming OK' : `✗ ${failed} assertion(s) failed`}`);
process.exit(failed > 0 ? 1 : 0);
