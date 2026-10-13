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
 *
 * Blocks [11] to [14] (2026-10-12) are four fixes to GMT's export, and from [13]
 * on this is no longer the pure mapping alone: [13] builds the real engine store.
 *   [11] the grain of a frame: the sample count a frame's pass starts from
 *        (`exportFrameSampleBase`) is what an unbroken run had counted there
 *   [12] where a feature param's track writes in a scene (`trackScenePath`)
 *   [13] the export version: what a track with a key drives does not raise it
 *        (`store/engineStore.ts`, WHAT THE TIMELINE WRITES)
 *   [14] a picked file handed to another thread, discarded
 *        (`handOverPickedFile`, engine/export/pickedFile.ts)
 * FALSIFICATION RECORD, 2026-10-12, store/engineStore.ts, the timeline's paths
 * no longer taken out in `_exportContentHash` -> 2 red: "[13] the KEYED value
 * moved, as a playhead moves it: the version holds at 2" (got 3) and "[13] with
 * a key, both paths its app declared are left out" (got [5,6]). Blocks [11],
 * [12] and [14] pass and were not broken on purpose.
 */
import { exportFrameFileNumber, exportFrameFileTag, exportFrameFiles, exportFrameSampleBase, exportFrameState } from '../engine-gmt/engine/worker/exportFrameNaming';
import { trackScenePath } from '../engine/animation/trackBinding';
import { handOverPickedFile } from '../engine/export/pickedFile';
import { registerTrackWrittenPaths, useEngineStore } from '../store/engineStore';
import { useAnimationStore } from '../store/animationStore';

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

// [11] The grain of a frame: the sample count its pass starts from is the count an
//      UNBROKEN run had reached there, so a single run counts as it always did and
//      a continued one (frames skipped) counts as the single run would.
{
    /** The worker's counter as it was before 2026-10-12: counted on through the session. */
    const counted = (frames: number, passes: number, samples: number, skip: (frame: number) => boolean): Map<string, number> => {
        const at = new Map<string, number>();
        let count = 0;
        for (let f = 0; f < frames; f++) {
            if (skip(f)) continue;
            for (let p = 0; p < passes; p++) { at.set(`${f}:${p}`, count); count += samples; }
        }
        return at;
    };
    const shapes: Array<[frames: number, passes: number, samples: number]> = [[24, 1, 16], [6, 2, 8], [5, 3, 1], [300, 1, 24]];
    const same = (was: Map<string, number>, passes: number, samples: number): boolean =>
        [...was].every(([key, count]) => { const [f, p] = key.split(':').map(Number); return exportFrameSampleBase(f, p, passes, samples) === count; });
    check('[11] a single run starts every frame and pass where it always did (one, two and three passes a frame)',
        shapes.map(([frames, passes, samples]) => same(counted(frames, passes, samples, () => false), passes, samples)), [true, true, true, true]);
    const continued = counted(24, 1, 16, (f) => f < 10);                 // the session of a run continued from frame 10
    check('[11] before, a run continued from frame 10 started that frame at 0; a single run starts it at 160',
        [continued.get('10:0'), exportFrameSampleBase(10, 0, 1, 16)], [0, 160]);
    check('[11] the count does not depend on which frames were made before: the frame and its pass alone',
        [exportFrameSampleBase(23, 0, 1, 16), exportFrameSampleBase(5, 1, 2, 8), exportFrameSampleBase(0, 0, 3, 64)], [368, 88, 0]);
    check('[11] a pass count or a sample count that is no number counts as one pass, no sample', [exportFrameSampleBase(3, 0, 0, 4), exportFrameSampleBase(3, 0, 1, NaN)], [12, 0]);
}

// [12] Where a feature param's track writes in a scene: the rule its id is made by, read the other way.
{
    const features = { julia: { power: 2, c: { x: 0.1, y: 0.2 }, tilt_x: 4 }, optics: { camFov: 60 } };
    check('[12] a scalar param', trackScenePath('optics.camFov', features), ['features', 'optics', 'camFov']);
    check('[12] one axis of a vector, spelt _x', trackScenePath('julia.c_y', features), ['features', 'julia', 'c', 'y']);
    check('[12] a scalar whose own name ends in _x is not an axis', trackScenePath('julia.tilt_x', features), ['features', 'julia', 'tilt_x']);
    check('[12] the older spelling, .x', trackScenePath('julia.c.x', features), ['features', 'julia', 'c', 'x']);
    check('[12] not a feature param: bound by hand, and only its app knows', [trackScenePath('camera.unified.x', features), trackScenePath('julia', features)], [null, null]);
}

// [13] The export version in the real store: what a track with a key drives is the
//      PLAYHEAD's value, not the scene's, and does not raise the version; everything
//      else still does. (`colorGrading` is one of engine-core's own features.)
{
    const store = () => useEngineStore.getState() as unknown as {
        prepareExport(): number; peekExportVersion(): number;
        setColorGrading(patch: Record<string, number>): void; colorGrading: Record<string, number>;
    };
    const anim = () => useAnimationStore.getState();
    const first = store().prepareExport();
    check('[13] the first export is version 1, and the same scene again is version 1', [first, store().peekExportVersion(), store().prepareExport()], [1, 1, 1]);
    store().setColorGrading({ saturation: 0.5 });
    check('[13] a value with NO track, changed: the next export is version 2', store().peekExportVersion(), 2);
    store().setColorGrading({ saturation: 1 });
    check('[13] changed back: version 1 again', store().peekExportVersion(), 1);

    anim().addTrack('colorGrading.saturation', 'Saturation');
    anim().addKeyframe('colorGrading.saturation', 0, 1);
    anim().addKeyframe('colorGrading.saturation', 60, 0.2);
    const keyed = store().prepareExport();
    check('[13] keys on the timeline are a change of the scene: version 2', keyed, 2);
    store().setColorGrading({ saturation: 0.6 });                       // what the playhead writes on frame 30
    check('[13] the KEYED value moved, as a playhead moves it: the version holds at 2', store().peekExportVersion(), 2);
    store().setColorGrading({ levelsGamma: 1.5 });
    check('[13] another value of the same feature, with no track: version 3', store().peekExportVersion(), 3);
    store().setColorGrading({ levelsGamma: store().colorGrading.levelsGamma, saturation: 0.31 });
    const taken = store().prepareExport();
    const key = anim().sequence.tracks['colorGrading.saturation'].keyframes[1];
    anim().updateKeyframes([{ trackId: 'colorGrading.saturation', keyId: key.id, patch: { value: 0.4 } }]);
    check('[13] a KEY changed: the scene has changed, version 4', [taken, store().peekExportVersion()], [3, 4]);
    anim().updateKeyframes([{ trackId: 'colorGrading.saturation', keyId: key.id, patch: { value: 0.2 } }]);

    // A track bound by hand writes where its app says it does: here two params at once.
    registerTrackWrittenPaths('test', (id) => (id === 'probe.levels' ? ['features.colorGrading.levelsMin', 'features.colorGrading.levelsMax'] : null));
    anim().addTrack('probe.levels', 'Levels');
    const before = store().prepareExport();
    store().setColorGrading({ levelsMin: 0.1, levelsMax: 0.9 });
    check('[13] a hand-bound track with NO key leaves nothing out: its targets changed, the version rises', [before, store().peekExportVersion()], [4, 5]);
    anim().addKeyframe('probe.levels', 0, 0);
    const declared = store().prepareExport();
    store().setColorGrading({ levelsMin: 0.2, levelsMax: 0.8 });
    check('[13] with a key, both paths its app declared are left out: the version holds', [declared, store().peekExportVersion()], [5, 5]);
}

// [14] A picked file whose encoder is on another thread, discarded: nothing is removed
//      before that thread has let go; an empty file goes, one with bytes stays.
{
    const fake = (size: number, canRemove = true) => {
        const log: string[] = [];
        const handle = {
            name: 'video.mp4',
            getFile: async () => { log.push('size'); return { size } as Blob; },
            createWritable: async () => file,
            ...(canRemove ? { remove: async () => { log.push('remove'); } } : {}),
        };
        const file = { write: async () => { log.push('write'); }, close: async () => { log.push('close'); }, abort: async () => { log.push('abort'); } };
        return { log, handle, file };
    };
    const tick = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
    {
        const { log, handle, file } = fake(0), handed = handOverPickedFile(handle, file, 2000);
        const done = handed.discard();
        await tick(30);
        const early = log.join();
        await handed.stream.abort();                                    // the other thread's abort arrives
        check('[14] nothing is touched before the other thread lets go; then the empty file is removed',
            [early, await done, log.join()], ['', 'removed', 'abort,size,remove']);
    }
    {
        const { log, handle, file } = fake(4321), handed = handOverPickedFile(handle, file, 2000);
        await handed.stream.abort();
        check('[14] a file that holds bytes (picked to be replaced) is kept', [await handed.discard(), log.join()], ['kept', 'abort,size']);
    }
    {
        const { log, handle, file } = fake(0, false), handed = handOverPickedFile(handle, file, 2000);
        await handed.stream.abort();
        check('[14] no remove() in this browser: the empty file is left, and it says so', [await handed.discard(), log.join()], ['empty', 'abort,size']);
    }
    {
        const { log, handle, file } = fake(0), handed = handOverPickedFile(handle, file, 20);
        check('[14] the other thread never lets go: after the wait the file is aborted here, then removed', [await handed.discard(), log.join()], ['removed', 'abort,size,remove']);
    }
    {
        const { log, handle, file } = fake(0), handed = handOverPickedFile(handle, file, 2000);
        await handed.stream.write({});
        await handed.stream.close();
        check('[14] writes and the close go on to the file', log.join(), 'write,close');
    }
}

console.log(`\n${failed === 0 ? '✓ export naming OK' : `✗ ${failed} assertion(s) failed`}`);
process.exit(failed > 0 ? 1 : 0);
