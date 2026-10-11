/**
 * Frame-number mapping for image-sequence exports.
 *
 * Its own module because it is the ONE piece of `WorkerExporter` that is pure
 * arithmetic, and it had a production bug that nothing could have caught: the
 * exporter stamped files with the pass index rather than the timeline frame, so
 * a render restarted at frame 690 wrote `frame_00000` onward and a re-run over a
 * different range overwrote the earlier files. `WorkerExporter.ts` imports THREE
 * and mediabunny, so a node harness cannot reach into it — splitting this out is
 * what makes the mapping falsifiable at all.
 *
 * @invariant The returned number is the TIMELINE frame, so file names line up
 *   with the timeline the user rendered from and two runs over different ranges
 *   never collide. — proven by: npm run test:export-naming ("restart at 690
 *   does not restart numbering at 0"), which fails if this returns the bare
 *   pass index.
 *
 * Deliberately NOT used for the progress percentage or the video muxer's frame
 * timestamps: both of those genuinely want the 0-based pass index, and swapping
 * them would desync the container. Naming is the only consumer.
 *
 * THE FILES OF ONE FRAME (`exportFrameFiles`, 2026-10-11). Which files a frame
 * makes, and under what names, is ONE rule with two readers:
 *   - the worker, which writes them (`writeFrameFiles` in WorkerExporter.ts);
 *   - the runner, which looks for them BEFORE a render, to ask whether frames
 *     already in the folder are to be overwritten or continued from
 *     (`lookForSequenceFrames` in
 *     components/timeline/RenderPopup/exportRunner.ts).
 * Until that day the names were spelt out inside the worker alone. A look that
 * spelt them a second time would drift from the write the first time a pass or
 * a format was added, and a "continued" render would then skip frames that are
 * not there, or render again frames that are.
 *   PNG   beauty                `<base>_<frame>.png`
 *         beauty + alpha        the SAME name: one RGBA file (beauty's colour,
 *                               the alpha pass in the alpha channel)
 *         alpha alone           `<base>_alpha_<frame>.png`
 *         depth                 `<base>_depth_<frame>.png`, always its own file
 *   other (JPG)                 one file a pass, `<base>_<pass>_<frame>.jpg`
 * `exportFrameState` is the other half of the look: a frame is THERE only when
 * every one of its files is there and none is empty (a file is created first
 * and gets its bytes when its stream closes, so a cut-off write leaves an
 * empty one). A frame that is there in part is rendered again, all its passes.
 *
 * @invariant A frame's files are the ones the table above names, in that
 *   order, numbered by the timeline frame; and a frame counts as there only
 *   with all of them non-empty — proven by: npm run test:export-naming (the
 *   "[7] ..." to "[10] ..." lines). Falsified 2026-10-11: see the test's
 *   header.
 * @assumption The worker and the runner both go through `exportFrameFiles`.
 *   No test can see that (the worker imports THREE and mediabunny); it was
 *   measured in app-gmt with real renders on 2026-10-11
 *   (debug/scratch/gmt-export/gmt-sequence.mts, git-ignored): the files in the
 *   folder after a render are exactly the names the look asks for.
 */
import type { ExportPass } from '../../../engine/codec/VideoExportTypes';

export const exportFrameFileNumber = (
    /** 0-based position within this export run. */
    frameIndex: number,
    /** First timeline frame of the render range (`VideoExportConfig.startFrame`). */
    startFrame: number,
    /** Timeline frames advanced per rendered frame (`VideoExportConfig.frameStep`). */
    frameStep: number,
): number => {
    const step = Math.max(1, Math.floor(frameStep || 1));
    const start = Math.max(0, Math.floor(startFrame || 0));
    return start + Math.max(0, Math.floor(frameIndex)) * step;
};

/** Zero-padded form used in the file name. Five digits matches the previous
 *  behaviour and covers ~27 hours at 60fps; longer numbers simply widen. */
export const exportFrameFileTag = (
    frameIndex: number,
    startFrame: number,
    frameStep: number,
    pad = 5,
): string => String(exportFrameFileNumber(frameIndex, startFrame, frameStep)).padStart(pad, '0');

/** One file of a frame: its name, and the pass (or the two passes merged into
 *  one RGBA picture) it holds. */
export interface ExportFrameFile {
    name: string;
    from: ExportPass | 'beauty+alpha';
}

/**
 * The files ONE frame of an image sequence makes, in the order they are
 * written (see THE FILES OF ONE FRAME in the header). The one naming rule: the
 * worker writes exactly these, the runner looks for exactly these.
 */
export const exportFrameFiles = (
    /** What every file of the render starts with (`VideoExportConfig.imageSequenceBaseName`). */
    base: string,
    /** The frame's number as it stands in the name (`exportFrameFileTag`). */
    frameTag: string,
    /** The format's container (`VIDEO_FORMATS[i].container`): 'png', or a format with one file a pass. */
    container: string,
    /** The extension, without the dot. */
    ext: string,
    /** The passes rendered for the frame, in the order they are rendered. */
    passes: readonly ExportPass[],
): ExportFrameFile[] => {
    if (container !== 'png') {
        // JPG (and any future per-pass image format): it cannot carry alpha, so every pass is its own file.
        return passes.map((pass) => ({ name: `${base}_${pass}_${frameTag}.${ext}`, from: pass }));
    }
    const files: ExportFrameFile[] = [];
    const beauty = passes.includes('beauty'), alpha = passes.includes('alpha');
    if (beauty && alpha) files.push({ name: `${base}_${frameTag}.${ext}`, from: 'beauty+alpha' });
    else if (beauty) files.push({ name: `${base}_${frameTag}.${ext}`, from: 'beauty' });
    else if (alpha) files.push({ name: `${base}_alpha_${frameTag}.${ext}`, from: 'alpha' });
    if (passes.includes('depth')) files.push({ name: `${base}_depth_${frameTag}.${ext}`, from: 'depth' });
    return files;
};

/**
 * What of one frame is in the folder, from the size in bytes of each of its
 * files (`-1`: there is no such file). 'whole': every file is there and holds
 * something. 'part': something of the frame is there, but a file is missing or
 * empty - it has to be rendered again. 'none': nothing of it is there.
 */
export const exportFrameState = (sizes: readonly number[]): 'whole' | 'part' | 'none' => {
    if (sizes.length > 0 && sizes.every((size) => size > 0)) return 'whole';
    return sizes.some((size) => size >= 0) ? 'part' : 'none';
};
