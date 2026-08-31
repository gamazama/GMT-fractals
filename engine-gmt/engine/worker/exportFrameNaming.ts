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
 */
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
