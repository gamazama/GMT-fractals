/**
 * Imperative export pipelines — one for image sequences (Chrome-only,
 * uses File System Access API) and one for video formats (mediabunny
 * encoder + WebCodecs).
 *
 * Pulled out of the React component so the popup itself is just state
 * + JSX. Callers hand us a `deps` bundle of refs / setters and we drive
 * the worker session, frame loop, and finalize.
 *
 * `runFramePump` is the shared per-frame ratchet — both pipelines share
 * the animation-scrub + serialize-camera + worker-encode + progress-tick
 * inner loop.
 *
 * FRAMES ALREADY IN THE FOLDER (image sequences; 2026-10-11)
 *   The owner: "if it detects existing frames, it should come up with options
 *   to overwrite, continue, cancel". Until that day a render into a folder that
 *   held frames of the same name REPLACED them without a word.
 *   - After the folder is picked and BEFORE anything is rendered the runner
 *     looks for the files of the range's frames (`lookForSequenceFrames`),
 *     under the name this run will use: `<project>_v<version>_<W>x<H>`. A
 *     frame is there only when EVERY file the ticked passes make for it is
 *     there and none is empty. The names are `exportFrameFiles`'
 *     (engine/worker/exportFrameNaming.ts): the rule the worker writes by.
 *   - Nothing there: nothing is asked, and the run is the run it always was.
 *   - Something there: `status.ask` (the render dialog's own question).
 *       OVERWRITE  every frame is rendered and each file replaced as its
 *                  frame is done. The run it always was.
 *       CONTINUE   only the frames not wholly there are rendered
 *                  (`runFramePump`'s `skip`); a frame there in part is
 *                  rendered again, all its passes. Offered only when there is
 *                  a whole frame to go on from and a frame left to make.
 *       CANCEL     nothing: no file, and NO VERSION taken. The name is worked
 *                  out with `peekExportVersion()`; `prepareExport()` is called
 *                  only once the run is certain.
 *     The dialog closed under the question is a Cancel.
 *   - The version must HOLD STILL across a run for the next run to find its
 *     frames. A focus-locked run writes the focus distance into the scene,
 *     which used to count as a change: it is declared as the run's own writing
 *     (`registerRunWrittenPath`, below) and is left out while the lock is on.
 *   - A video asks nothing: the browser's file picker has asked.
 *
 * THE JOIN (measured 2026-10-11, 640 x 360, the range once in one run and once
 * as a cancelled run plus Continue; `K` is the first continued frame)
 *   Two single runs of an unchanged scene are the same pixel for pixel, and so
 *   are the frames before K. From K on a continued render is what one run
 *   makes for a PLAIN scene, and is not in the two cases the question's last
 *   line names:
 *   - THE GRAIN (FIXED 2026-10-12). Until that day every continued frame had
 *     another grain: the worker's sample counter started again with a session.
 *     A plain scene at 16 samples: 11 % of the pixels differed, 2 % by more
 *     than 2 levels of 255, at most 39 to 65, on average 0.15 of a level; with
 *     depth of field at 0.5 the grain was the blur's, 6 to 8 levels on average.
 *     (For scale: a frame against the next one of the animation differs by
 *     2.9.) The counter now starts each frame from the frame's own place in
 *     the range (`exportFrameSampleBase`, engine/worker/exportFrameNaming.ts):
 *     the same plain scene, cancelled at frame 9 and continued, is the single
 *     run pixel for pixel, 24 frames of 24. Depth of field was not measured
 *     again.
 *   - FOCUS LOCK. Frame K is focused where the VIEWPORT is focused (the frame
 *     the playhead sits on), not where frame K-1 was. With the camera flying
 *     40 % of the way to the object over 24 frames: 20 to 23 % off at K, 8 to
 *     9 % at K+1, and from K+2 within what two single runs differ by anyway
 *     (the lock moves in steps of 1 %, so its runs do not repeat: up to 4 %,
 *     once 7 %).
 *   - SMOOTHED MODULATION. A smoothed LFO does not repeat from run to run at
 *     all, continued or not: the live modulation tick keeps running during an
 *     export and feeds the same smoothing state (grep `updateOscillators` in
 *     engine/animation/AnimationSystem.tsx). A sine of +-1 on the power, 1 s,
 *     as measured once: two single runs differ by 1.06, 0.28 and 0.13 at frame
 *     0 (smoothing 0.5, 0.8, 0.9) and are still more than 0.01 apart at the
 *     last of 60 frames. At the join the value STEPS: off by 0.51, 0.08 and
 *     0.06 at K, and still more than 0.01 off 34 to 38 frames later, where
 *     the range ended.
 *
 * @assumption Everything under FRAMES ALREADY IN THE FOLDER and THE JOIN was
 *   driven in app-gmt through its own dialog on 2026-10-11, Chrome on the real
 *   GPU, the folder picker stood in for by a real directory of the origin's
 *   private file system (debug/scratch/gmt-export/gmt-sequence.mts,
 *   git-ignored): a fresh folder asks nothing; the same scene again asks, and
 *   Cancel (no write, the version and the scene it was taken for unchanged),
 *   Overwrite (every file written again) and all-there (no Continue) do what
 *   they say; a changed scene whose next version has a file in the folder is
 *   asked about under that name and a Cancel leaves the version where it was;
 *   the window's X pressed with the question open (nothing rendered or
 *   written, the version unchanged, and the next Start asks again);
 *   PNG with depth and JPG with two passes cancelled part-way, a frame robbed
 *   of a file and another given an empty one, then Continue: exactly the
 *   frames not wholly there asked of the worker, every file there once, none
 *   empty, the whole frames' files not written again; Focus lock: the version
 *   holds across a cancelled run and the next run finds its frames.
 *   BROKEN ON PURPOSE once: the focus path's condition made never true (the
 *   `registerRunWrittenPath` call below) -> "the next export would be version
 *   2" and the next run asked nothing: it did not find its 11 frames.
 *   What stands behind the names and "wholly there": `npm run
 *   test:export-naming` (blocks [7] to [10]). NO STANDING GUARD for the look,
 *   the question or the skip.
 * @assumption THE VERSION HOLDS STILL UNDER A MOVING PLAYHEAD (2026-10-12). In a
 *   keyed scene the keyed values in the store are the playhead's. Until that
 *   day they counted: with the playhead moved between two runs the scene read
 *   as changed, the next run got new names and found nothing (version 2 where
 *   it was, 3 on frame 30); and a camera keyed by hand and not scrubbed since
 *   was left a hair off by the run's own scrubbing (1e-16), which read as
 *   changed once. Now what a track with a key drives is left out of the
 *   comparison (`registerTrackWrittenPaths`, the block under the imports, and
 *   the store's own rule for a feature param's track). The rule itself has a
 *   standing test (`npm run test:export-naming`, block [13]); GMT's own list
 *   below it - the camera's six, the gradient's four, a light's - was driven
 *   in the app once, the same day (debug/scratch/small-three/gmt-four.mts,
 *   git-ignored, steps 2 and 5), and has no standing guard.
 *
 * A VIDEO (2026-10-12)
 *   - THE VERSION IS TAKEN AFTER THE SAVE PICKER, not before it: a picker
 *     backed out of leaves the version where it was. (Before: a changed scene
 *     at version 1, Start, Cancel in the picker: version 2 and no file.)
 *   - A PASS THAT ENDS WITHOUT A VIDEO LEAVES NO FILE. Discard, or a failed
 *     export, used to leave the empty file the picker had made (0 bytes). The
 *     runner keeps the handle (`handOverPickedFile`, engine/export/
 *     pickedFile.ts) and removes it once the worker has let go. A file picked
 *     to be REPLACED keeps what it held. Where the browser has no `remove()`
 *     the empty file stays and a toast says so: the picker makes the file the
 *     moment it answers, so there is no later moment to make it at.
 * @assumption A VIDEO above: driven in app-gmt once, 2026-10-12, Chrome on the
 *   real GPU, the pickers stood in for as on 2026-10-11 (debug/scratch/
 *   small-three/gmt-four.mts, git-ignored, steps 3 and 4). No standing guard:
 *   no smoke starts a render into a picked file.
 */

import * as THREE from 'three';
import { getProxy } from '../../../engine/worker/WorkerProxy';
import { useAnimationStore } from '../../../../store/animationStore';
import { registerRunWrittenPath, registerTrackWrittenPaths, useEngineStore } from '../../../../store/engineStore';
import { showToast } from '../../../../engine/store/toastStore';
import { VIDEO_FORMATS } from '../../../../data/constants';
import { FractalEvents, FRACTAL_EVENTS } from '../../../engine/FractalEvents';
import { animationEngine } from '../../../../engine/AnimationEngine';
import { modulationEngine } from '../../../../engine/features/modulation/ModulationEngine';
import { getViewportCamera } from '../../../engine/worker/ViewportRefs';
import { getExportFileName } from '../../../../utils/fileUtils';
import { applyExportModulations } from '../exportModulations';
import type { SerializedCamera, SerializedOffset } from '../../../engine/worker/WorkerProtocol';
import type { EngineRenderState } from '../../../engine/FractalEngine';
import type { ExportPass, VideoExportConfig } from '../../../../engine/codec/VideoExportTypes';
import type {
    RenderDialogDeps,
    RenderDialogQuestion,
    RenderDialogRunner,
} from '../../../../engine/plugins/RenderDialog';
import { calcEtaRange } from '../exportHelpers';
import { mixAudioClipsForExport } from '../../../../engine/animation/audioExportMix';
import { exportFrameFileTag, exportFrameFiles, exportFrameState } from '../../../engine/worker/exportFrameNaming';
import { handOverPickedFile } from '../../../../engine/export/pickedFile';
import type { HandedOverFile } from '../../../../engine/export/pickedFile';

// THE LOCKED FOCUS IS NOT A CHANGE OF THE SCENE. While Focus lock is on, the frame pump below
// (and the viewport's own probe, engine-gmt/navigation/usePhysicsProbe.ts) writes the distance
// it measures into `optics.dofFocus`. Declared here, so that the export version leaves that
// value out of its comparison while the lock is on: a focus-locked render keeps its version,
// and the next run finds the frames it made (see `registerRunWrittenPath` in the store).
registerRunWrittenPath('features.optics.dofFocus', (state) => !!state.focusLock);

// WHAT GMT'S HAND-BOUND TRACKS WRITE. A keyed value is the playhead's, not the scene's, and the
// export version leaves it out (`registerTrackWrittenPaths` in the store): otherwise the playhead
// moved between two runs is "a changed scene", and a cancelled render cannot be continued. A
// feature param's own track needs no word here; these do, because they write somewhere else:
//   - the camera's six (engine-gmt/animation/cameraBinders.ts): ONE teleport a frame, which
//     writes the scene offset and the rotation whichever of the six hold keys (and leaves a
//     camera keyed by hand a hair off where it was, 1e-16: that no longer counts either);
//   - the gradient's phase and repeats (coloringBinders.ts): each also writes the offset or the
//     scale derived from it;
//   - a light's (`lighting.light<N>_<prop>`, and the older `lights.<N>.<prop>`, both bound in
//     engine/AnimationEngine.ts): one field of one light of the list.
const GMT_TRACK_PATHS: Record<string, readonly string[]> = {
    'coloring.phase':    ['features.coloring.phase', 'features.coloring.offset'],
    'coloring.phase2':   ['features.coloring.phase2', 'features.coloring.offset2'],
    'coloring.repeats':  ['features.coloring.repeats', 'features.coloring.scale'],
    'coloring.repeats2': ['features.coloring.repeats2', 'features.coloring.scale2'],
};
const GMT_CAMERA_TRACK = /^camera\.(?:unified|rotation)\.[xyz]$/;
const GMT_LIGHT_TRACK = /^(?:lighting\.light(\d+)_(intensity|falloff|pos[XYZ]|rot[XYZ])|lights\.(\d+)\.(intensity|falloff|position\.[xyz]))$/;
registerTrackWrittenPaths('gmt', (trackId) => {
    if (GMT_CAMERA_TRACK.test(trackId)) return ['sceneOffset', 'cameraRot'];
    const light = GMT_LIGHT_TRACK.exec(trackId);
    if (light) {
        const prop = light[2] ?? light[4];
        const field = /^pos|^position/.test(prop) ? 'position' : prop.startsWith('rot') ? 'rotation' : prop;
        const axis = field === 'position' || field === 'rotation' ? `.${prop.slice(-1).toLowerCase()}` : '';
        return [`features.lighting.lights.${light[1] ?? light[3]}.${field}${axis}`];
    }
    return GMT_TRACK_PATHS[trackId] ?? null;
});

/** The last line of the question: what a continued render cannot promise. Its two clauses
 *  are measured, not supposed (grep THE JOIN in the header for the numbers). Until 2026-10-12 it
 *  had a third, the grain; a continued plain render is now the single run pixel for pixel. */
const CONTINUE_IS_NOT_EXACT = 'A continued render is exact for a plain scene. In two cases it is not: with Focus lock the first frame or two can be focused elsewhere, and smoothed modulation can jump where it joins.';

// app-gmt's app-specific config bag — fed by the plugin's
// `extraFormFields` slot and threaded into the runner via deps.extra.
export interface AppGmtExtra {
    internalScale: number;
    exportBeauty:  boolean;
    exportAlpha:   boolean;
    exportDepth:   boolean;
    depthMin:      number;
    depthMax:      number;
}

// Adapter: plugin's flat config + extra bag → the legacy
// `cfg.vidRes/.vidSamples/.vidBitrate + multi-pass + depth` shape that
// the runner internals already use. Keeps the runner diff minimal.
type LegacyDeps = Omit<RenderDialogDeps<AppGmtExtra>, 'cfg' | 'extra'> & {
    cfg: {
        vidRes:        { w: number; h: number };
        formatIndex:   number;
        vidSamples:    number;
        vidBitrate:    number;
        startFrame:    number;
        endFrame:      number;
        frameStep:     number;
        fps:           number;
        internalScale: number;
        exportBeauty:  boolean;
        exportAlpha:   boolean;
        exportDepth:   boolean;
        depthMin:      number;
        depthMax:      number;
    };
};

const toLegacyDeps = (deps: RenderDialogDeps<AppGmtExtra>): LegacyDeps => ({
    flags:      deps.flags,
    status:     deps.status,
    isDiskMode: deps.isDiskMode,
    cfg: {
        vidRes:        { w: deps.cfg.width, h: deps.cfg.height },
        formatIndex:   deps.cfg.formatIndex,
        vidSamples:    deps.cfg.samplesPerFrame,
        vidBitrate:    deps.cfg.bitrate,
        startFrame:    deps.cfg.startFrame,
        endFrame:      deps.cfg.endFrame,
        frameStep:     deps.cfg.frameStep,
        fps:           deps.cfg.fps,
        internalScale: deps.extra.internalScale,
        exportBeauty:  deps.extra.exportBeauty,
        exportAlpha:   deps.extra.exportAlpha,
        exportDepth:   deps.extra.exportDepth,
        depthMin:      deps.extra.depthMin,
        depthMax:      deps.extra.depthMax,
    },
});

const engine = getProxy();

/**
 * Per-frame export pump — shared by the video multi-pass path and the image-sequence path.
 *
 * For every frame in [0, totalFrames):
 *   1. Honour the pause/cancel/finish-early flags.
 *   2. Scrub the animation and apply modulations for this timeline frame.
 *   3. Serialize camera + offset + render-state and send to the worker via
 *      `engine.renderExportFrame`. The worker renders + accumulates + encodes.
 *   4. Apply focus-lock if requested (beauty pass only).
 *   5. Push progress / elapsed / ETA / last-frame-time + emit BUCKET_STATUS.
 *
 * Returns a string tag describing how the loop exited — the caller decides
 * whether to call `engine.finishExport` or `engine.cancelExport`.
 */
const runFramePump = async (
    config: VideoExportConfig,
    totalFrames: number,
    applyFocusLock: boolean,
    deps: LegacyDeps,
    passPrefix = '',
    /** A CONTINUED image sequence: `skip[i]` is true for a frame that is wholly in the folder
     *  already. It is not scrubbed to, not rendered and not written; the frames that are made
     *  keep their own index `i`, which is what the worker names their files by. Absent: every
     *  frame is rendered, as before this existed. */
    skip?: readonly boolean[],
): Promise<'completed' | 'cancelled' | 'finishEarly'> => {
    const { cfg, flags, status } = deps;
    const { cancelledRef, finishEarlyRef, stoppingRef, startTimeRef } = flags;
    // The frames this run makes: all of them, or the ones a continued run found missing.
    // Progress, the time a frame and the estimate count THESE, not the range.
    let toRender = totalFrames;
    if (skip) { toRender = 0; for (let i = 0; i < totalFrames; i++) if (!skip[i]) toRender++; }
    let rendered = 0;

    for (let i = 0; i < totalFrames; i++) {
        if (skip?.[i]) continue;
        if (cancelledRef.current) return 'cancelled';
        if (finishEarlyRef.current) return 'finishEarly';
        while (stoppingRef.current && !cancelledRef.current && !finishEarlyRef.current) {
            await new Promise(r => setTimeout(r, 100));
        }
        if (cancelledRef.current) return 'cancelled';
        if (finishEarlyRef.current) return 'finishEarly';

        const timelineFrame = cfg.startFrame + (i * cfg.frameStep);
        const time = timelineFrame / cfg.fps;

        animationEngine.scrub(timelineFrame);
        applyExportModulations(time, 1.0 / cfg.fps);

        const cam = getViewportCamera() as THREE.PerspectiveCamera | null;
        const storeState = useEngineStore.getState();

        const serializedCamera: SerializedCamera = cam ? {
            position:   [cam.position.x, cam.position.y, cam.position.z],
            quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
            fov:        cam.fov || 60,
            aspect:     config.width / config.height,
        } : {
            position:   [0, 0, 0],
            quaternion: [0, 0, 0, 1],
            fov:        (storeState as any).optics?.camFov ?? 60,
            aspect:     config.width / config.height,
        };

        const so = storeState.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
        const serializedOffset: SerializedOffset = {
            x: so.x, y: so.y, z: so.z,
            xL: so.xL ?? 0, yL: so.yL ?? 0, zL: so.zL ?? 0,
        };

        const renderState: Partial<EngineRenderState> = {
            cameraMode:          storeState.cameraMode,
            // Force the accumulation-hold input off for deterministic export
            // frames (ADR-0061 P5: this is the InteractionSession's filtered
            // hold signal, successor to the removed `cameraInUse` hold gate).
            sessionHoldActive:   false,
            optics:              (storeState as any).optics ?? null,
            lighting:            (storeState as any).lighting ?? null,
            quality:             (storeState as any).quality ?? null,
            geometry:            (storeState as any).geometry ?? null,
        };

        // Rejects on a worker crash, an EXPORT_ERROR, or the proxy's stall
        // watchdog (no worker progress for EXPORT_FRAME_STALL_MS — a dropped
        // frame, not a slow one: the worker beats about once per second of GPU
        // time while a frame renders). All three land in the enclosing catch,
        // which alerts, and `finally` releases the dialog.
        const frameResult = await engine.renderExportFrame(
            i, time, serializedCamera, serializedOffset, renderState,
            { ...engine.modulations },
        );

        if (applyFocusLock) {
            const fStore = useEngineStore.getState();
            if (fStore.focusLock && frameResult.measuredDistance > 0 && frameResult.measuredDistance < 1000) {
                const currentFocus = (fStore as any).optics?.dofFocus ?? 0;
                const relChange = Math.abs(frameResult.measuredDistance - currentFocus) / Math.max(currentFocus, 0.0001);
                if (relChange > 0.01) {
                    (fStore as any).setOptics({ dofFocus: frameResult.measuredDistance });
                }
            }
        }

        rendered++;
        const fraction = rendered / toRender;
        // Plugin's setProgress takes 0..1 (it formats as percent for the UI).
        status.setProgress(fraction);
        // A continued run says where in the range it is AND how much of its own work is done.
        status.setStatusText(skip
            ? `${passPrefix}Frame ${i + 1} / ${totalFrames} (${rendered} of ${toRender})`
            : `${passPrefix}Frame ${i + 1} / ${totalFrames}`);

        const now = Date.now();
        const elapsed = (now - startTimeRef.current) / 1000;
        status.setElapsedTime(elapsed);
        const framesDone = rendered;
        status.setEtaRange(calcEtaRange(elapsed, framesDone, toRender));
        status.setLastFrameTime(elapsed / framesDone);

        // BUCKET_STATUS still uses a 0..100 percent — listeners outside
        // the dialog (preview HUD, app-gmt's render-time estimator)
        // expect the legacy units.
        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: true, progress: fraction * 100 });
    }
    return 'completed';
};

/** What of a render's frames is in the folder already (`lookForSequenceFrames`). */
interface SequenceFramesFound {
    /** One answer a frame of the range, in order: the frame is WHOLLY there. */
    there: boolean[];
    /** How many are wholly there. */
    whole: number;
    /** How many are there in part: a file of theirs is missing or empty. They are rendered again. */
    part: number;
}

/**
 * Which frames of the range are in the folder under the name this run will use. A frame is
 * there only when EVERY file the ticked passes make for it is there and none is empty; the
 * names are `exportFrameFiles`' - the rule the worker writes by. It makes no file. `stop`,
 * asked before each frame, ends the look early. One frame after another.
 */
async function lookForSequenceFrames(
    dir: FileSystemDirectoryHandle,
    baseName: string,
    format: { container: string; ext: string },
    passes: readonly ExportPass[],
    startFrame: number,
    frameStep: number,
    totalFrames: number,
    stop: () => boolean,
): Promise<SequenceFramesFound> {
    /** A file's size in bytes; -1 when there is no such file. */
    const sizeOf = async (name: string): Promise<number> => {
        try { return (await (await dir.getFileHandle(name)).getFile()).size; } catch { return -1; }
    };
    const found: SequenceFramesFound = { there: [], whole: 0, part: 0 };
    for (let i = 0; i < totalFrames && !stop(); i++) {
        const files = exportFrameFiles(baseName, exportFrameFileTag(i, startFrame, frameStep), format.container, format.ext, passes);
        const state = exportFrameState(await Promise.all(files.map((file) => sizeOf(file.name))));
        found.there.push(state === 'whole');
        if (state === 'whole') found.whole++;
        else if (state === 'part') found.part++;
    }
    return found;
}

/**
 * The question for frames that are in the folder already (`status.ask`; the answers are
 * 'overwrite', 'continue' and 'cancel'). Continue is offered only when there is a whole frame
 * to go on from and a frame left to render.
 */
function framesQuestion(baseName: string, folder: string, total: number, found: SequenceFramesFound): RenderDialogQuestion {
    const missing = total - found.whole;
    const canContinue = found.whole > 0 && missing > 0;
    const lines = [missing === 0
        ? `All ${total} frames of this render ("${baseName}") are already in "${folder}".`
        : `${found.whole} of the ${total} frames of this render ("${baseName}") ${found.whole === 1 ? 'is' : 'are'} already in "${folder}".`];
    if (found.part > 0) {
        lines.push(`${found.part} more ${found.part === 1 ? 'is' : 'are'} there only in part (a file is missing or empty) and will be rendered again.`);
    }
    lines.push(`Overwrite renders all ${total} and replaces each file as its frame is done.`
        + (canContinue ? ` Continue renders only the ${missing} that ${missing === 1 ? 'is' : 'are'} not there.` : ''));
    if (canContinue) {
        lines.push('Continue goes by the file names alone. It cannot tell how the frames there were made: they may have other samples, another scale or other passes.');
        lines.push(CONTINUE_IS_NOT_EXACT);
    }
    return {
        lines,
        cancel: 'cancel',
        options: [
            { id: 'overwrite', label: 'Overwrite', title: `Render all ${total} frames. Each file is replaced as its frame is written; nothing is deleted first` },
            ...(canContinue ? [{ id: 'continue', label: 'Continue', title: `Render only the ${missing} frame${missing === 1 ? '' : 's'} not in the folder`, primary: true }] : []),
            { id: 'cancel', label: 'Cancel', title: 'Render nothing and write nothing' },
        ],
    };
}

/**
 * Image-sequence export (PNG / JPG). Chrome / Edge only — the File System
 * Access API's `showDirectoryPicker` is not available in Firefox or Safari.
 * One worker session handles all selected passes; the worker loops over
 * them per frame and writes files into the chosen directory (PNG merges
 * beauty+alpha into RGBA, JPG writes separate files per pass, depth is
 * always a separate file).
 */
const runImageSequenceExport = async (
    passesToExport: ExportPass[],
    deps: LegacyDeps,
): Promise<void> => {
    const { cfg, flags, status } = deps;

    if (typeof (window as any).showDirectoryPicker !== 'function') {
        alert('Image-sequence export requires the File System Access API, which is only available in Chrome / Edge. Use an MP4 or WebM format in other browsers.');
        return;
    }

    let dirHandle: FileSystemDirectoryHandle | null = null;
    try {
        // @ts-expect-error — FSA types not in all TS lib targets
        dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return; // user cancelled
        alert('Could not open output folder. Error: ' + (err instanceof Error ? err.message : String(err)));
        return;
    }
    if (!dirHandle) return;

    const totalFrames = Math.floor((cfg.endFrame - cfg.startFrame) / cfg.frameStep) + 1;
    const format = VIDEO_FORMATS[cfg.formatIndex];

    // ── FRAMES ALREADY IN THE FOLDER (see the header) ──
    // The dialog shows the run from here on: nothing else can be started while the
    // folder is looked into, and its Discard backs out of the look.
    flags.cancelledRef.current = false;
    flags.finishEarlyRef.current = false;
    status.setIsRendering(true);
    status.setIsStopping(false);
    status.setProgress(0);
    status.setElapsedTime(0);
    status.setEtaRange({ min: 0, max: 0 });
    status.setLastFrameTime(0);
    status.setStatusText(`Looking in ${dirHandle.name}…`);

    /** Frames wholly in the folder, when the answer was Continue; absent: every frame is rendered. */
    let skip: boolean[] | undefined;
    let baseName = '';
    // Until the version is TAKEN (`prepareExport`, below) nothing of this run exists: no file,
    // and no version number. It is taken only once the run is certain, and without an await in
    // between, so the name looked for is the name written to. If the scene was changed while
    // the question stood open, the name has changed with it: look again, under the new one.
    /** Discard, or Finish, pressed while the folder was looked into: there is no run to finish. */
    const backedOut = (): boolean => flags.cancelledRef.current || flags.finishEarlyRef.current;
    for (;;) {
        const state = useEngineStore.getState();
        const version = state.peekExportVersion();
        baseName = `${state.projectSettings.name}_v${version}_${cfg.vidRes.w}x${cfg.vidRes.h}`;
        const found = await lookForSequenceFrames(
            dirHandle, baseName, format, passesToExport, cfg.startFrame, cfg.frameStep, totalFrames, backedOut,
        );
        let answer = 'overwrite';                                // nothing of this render is there: nothing is asked
        if (!backedOut() && found.whole + found.part > 0) {
            answer = await status.ask(framesQuestion(baseName, dirHandle.name, totalFrames, found));
        }
        if (backedOut() || (answer !== 'overwrite' && answer !== 'continue')) {
            // Backed out: no file was touched and no version was taken.
            status.setIsRendering(false);
            status.setIsStopping(false);
            return;
        }
        if (useEngineStore.getState().peekExportVersion() !== version) continue;
        skip = answer === 'continue' ? found.there : undefined;
        break;
    }
    useEngineStore.getState().prepareExport();                   // taken now: the version that was looked for

    const animState = useAnimationStore.getState();
    const savedFrame = animState.currentFrame;
    const savedIsPlaying = animState.isPlaying;
    if (savedIsPlaying) animState.pause();

    const passLabels = passesToExport.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' + ');

    try {
        // Hand the topbar this render's sample budget. `accumulationCount` is one
        // shared channel, so while the export owns the accumulator the topbar was
        // counting EXPORT samples against the VIEWPORT's Auto-Stop cap. Cleared in
        // the finally below — see activeRenderSampleCap in types/store.ts.
        useEngineStore.getState().setActiveRenderSampleCap(cfg.vidSamples ?? null);
        status.setProgress(0);
        status.setElapsedTime(0);
        status.setEtaRange({ min: 0, max: 0 });
        status.setLastFrameTime(0);
        status.setStatusText(`Image sequence → ${dirHandle.name} (${passLabels})`);
        await new Promise(resolve => setTimeout(resolve, 100));
        flags.startTimeRef.current = Date.now();

        const config: VideoExportConfig = {
            width:                 cfg.vidRes.w,
            height:                cfg.vidRes.h,
            // Output framerate, NOT the timeline's. A stepped export renders every
            // Nth frame, so playing it back at the timeline rate would compress it
            // N-fold into a time-lapse — and desync the full-length audio track from
            // frame 0. Dividing keeps real-world duration, which is what Step is for:
            // cheaper previews, not a speed ramp. See VideoExportConfig.fps.
            fps:                   cfg.fps / Math.max(1, cfg.frameStep),
            samples:               cfg.vidSamples,
            bitrate:               cfg.vidBitrate,
            startFrame:            cfg.startFrame,
            endFrame:              cfg.endFrame,
            frameStep:             cfg.frameStep,
            formatIndex:           cfg.formatIndex,
            internalScale:         cfg.internalScale,
            passes:                passesToExport,
            depthMin:              cfg.depthMin,
            depthMax:              cfg.depthMax,
            imageSequenceBaseName: baseName,
        };

        status.setStatusText(`Initializing (${passLabels})…`);
        await engine.startExport(config, null, dirHandle);

        const outcome = await runFramePump(config, totalFrames, /* applyFocusLock */ true, deps, '', skip);

        if (outcome === 'cancelled') {
            engine.cancelExport();
            status.setStatusText('Cancelled.');
        } else {
            status.setStatusText('Flushing remaining files…');
            await engine.finishExport();
            status.setStatusText(`Complete — wrote to ${dirHandle.name}`);
            showToast(`Image sequence saved to ${dirHandle.name}`, 'success', 4500);
        }
    } catch (e) {
        console.error('RenderPopup: Image sequence export failed', e);
        alert(`Image sequence export failed.\n\nError: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        status.setIsRendering(false);
        useEngineStore.getState().setActiveRenderSampleCap(null);
        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: false, progress: 0 });

        animationEngine.scrub(savedFrame);
        if (savedIsPlaying) useAnimationStore.getState().play();

        engine.modulations = {};
        modulationEngine.resetOffsets();
    }
};

/**
 * Video export (MP4 / WebM / etc.). Routes to image-sequence path when
 * the format is PNG/JPG. Multi-pass: each enabled pass produces its own
 * file; the loop reopens the save dialog per pass (transient activation
 * is preserved across awaits, so this works in browsers that support
 * `showSaveFilePicker`).
 */
export const runVideoExport: RenderDialogRunner<AppGmtExtra> = async (pluginDeps): Promise<void> => {
    const deps = toLegacyDeps(pluginDeps);
    const { cfg, flags, status, isDiskMode } = deps;

    const passesToExport: ExportPass[] = [];
    if (cfg.exportBeauty) passesToExport.push('beauty');
    if (cfg.exportAlpha)  passesToExport.push('alpha');
    if (cfg.exportDepth)  passesToExport.push('depth');
    if (passesToExport.length === 0) {
        alert('Select at least one pass (Beauty, Alpha, or Depth).');
        return;
    }

    const selectedFormat = VIDEO_FORMATS[cfg.formatIndex];

    if (selectedFormat.imageSequence) {
        return runImageSequenceExport(passesToExport, deps);
    }

    const state = useEngineStore.getState();
    // The version the run's files are named by. It is TAKEN (`prepareExport`) only once the
    // first file of the run is certain - below, after the save picker has answered - and until
    // then only looked at (`peekExportVersion`): a picker backed out of must not leave a
    // version number behind with no file to show for it. (Until 2026-10-12 it was taken here.)
    let exportVersion: number | null = null;
    const baseProjectName = state.projectSettings.name;
    const isMultiPass = passesToExport.length > 1;
    /** The picked file of the pass being rendered: dropped when the pass ends without a video. */
    let picked: HandedOverFile | null = null;
    let pickedName = '';
    /** Nothing of the pass's file stays (see `handOverPickedFile`): call after the worker was told to cancel, or has failed. */
    const dropPickedFile = async (): Promise<void> => {
        const file = picked;
        picked = null;
        if (file && (await file.discard()) === 'empty') {
            showToast(`"${pickedName}" is left empty: this browser cannot remove a file it has made`, 'info', 6000);
        }
    };

    status.setIsRendering(true);
    status.setIsStopping(false);

    const animState = useAnimationStore.getState();
    const savedFrame = animState.currentFrame;
    const savedIsPlaying = animState.isPlaying;
    if (savedIsPlaying) animState.pause();

    flags.cancelledRef.current = false;
    flags.finishEarlyRef.current = false;
    let ramFileCount = 0; // RAM-mode downloads written, for the completion toast

    try {
        // Hand the topbar this render's sample budget. `accumulationCount` is one
        // shared channel, so while the export owns the accumulator the topbar was
        // counting EXPORT samples against the VIEWPORT's Auto-Stop cap. Cleared in
        // the finally below — see activeRenderSampleCap in types/store.ts.
        useEngineStore.getState().setActiveRenderSampleCap(cfg.vidSamples ?? null);
        for (let p = 0; p < passesToExport.length; p++) {
            if (flags.cancelledRef.current) break;

            const pass = passesToExport[p];
            const passLabel = pass.charAt(0).toUpperCase() + pass.slice(1);
            const passPrefix = isMultiPass
                ? `Pass ${p + 1}/${passesToExport.length} (${passLabel}) — `
                : '';
            // Multi-pass runs suffix the project name with `_{pass}` so the N files
            // end up as e.g. `MyScene_beauty_v3.mp4`, `MyScene_alpha_v3.mp4`, ….
            const projectNameForFile = isMultiPass ? `${baseProjectName}_${pass}` : baseProjectName;
            const fileNameFor = (version: number): string => getExportFileName(
                projectNameForFile,
                version,
                selectedFormat.ext,
                `${cfg.vidRes.w}x${cfg.vidRes.h}`,
            );

            // Per-pass save dialog (transient activation preserved across awaits).
            let fileStream: any = null;
            let effectiveDiskMode = isDiskMode;
            if (isDiskMode) {
                try {
                    // @ts-expect-error — File System Access API not in all TS lib targets
                    const handle = await window.showSaveFilePicker({
                        // The name the run WILL get: the version is not taken before the picker answers.
                        suggestedName: fileNameFor(exportVersion ?? useEngineStore.getState().peekExportVersion()),
                        types: [{
                            description: selectedFormat.label,
                            accept: { [selectedFormat.mime]: [`.${selectedFormat.ext}`] },
                        }],
                    });
                    // What crosses to the worker forwards to the file, and this side keeps the
                    // handle: a pass that ends without a video drops the file (`dropPickedFile`).
                    picked = handOverPickedFile(handle, await handle.createWritable());
                    pickedName = handle.name;
                    fileStream = picked.stream;
                } catch (err) {
                    if (err instanceof DOMException && err.name === 'AbortError') {
                        flags.cancelledRef.current = true;
                        break;
                    }
                    const errMsg = err instanceof Error ? err.message : String(err);
                    const errName = err instanceof DOMException ? err.name : '';
                    const isSecurityError = errName === 'SecurityError'
                        || errMsg.includes('not supported') || errMsg.includes('not a function');
                    if (isSecurityError) {
                        console.warn('RenderPopup: Disk Access blocked. Fallback to RAM.');
                        showToast('Disk access blocked — saving to RAM instead', 'warning', 4500);
                        fileStream = null;
                        effectiveDiskMode = false;
                    } else {
                        alert('Could not start export. Error: ' + errMsg);
                        flags.cancelledRef.current = true;
                        break;
                    }
                }
            }

            // The run is certain now (a file is picked, or it goes to memory): the version is taken,
            // once for all the passes of the run.
            if (exportVersion === null) exportVersion = useEngineStore.getState().prepareExport();
            const exportFilename = fileNameFor(exportVersion);

            // Per-pass UI reset.
            status.setProgress(0);
            status.setElapsedTime(0);
            status.setEtaRange({ min: 0, max: 0 });
            status.setLastFrameTime(0);
            status.setStatusText(passPrefix + (effectiveDiskMode ? 'Exporting to Disk...' : 'Exporting to RAM...'));

            await new Promise(resolve => setTimeout(resolve, 100));
            flags.startTimeRef.current = Date.now();

            const config: VideoExportConfig = {
                width:         cfg.vidRes.w,
                height:        cfg.vidRes.h,
                // See the note on the single-pass config above — output rate, not timeline rate.
                fps:           cfg.fps / Math.max(1, cfg.frameStep),
                samples:       cfg.vidSamples,
                bitrate:       cfg.vidBitrate,
                startFrame:    cfg.startFrame,
                endFrame:      cfg.endFrame,
                frameStep:     cfg.frameStep,
                formatIndex:   cfg.formatIndex,
                internalScale: cfg.internalScale,
                pass,
                depthMin:      cfg.depthMin,
                depthMax:      cfg.depthMax,
            };

            status.setStatusText(passPrefix + 'Initializing encoder...');

            // Mix any loaded audio clips for the export window. Beauty pass only —
            // alpha + depth passes produce auxiliary video files where audio is
            // meaningless. Encoders can fail (e.g. browser without AAC) so we
            // swallow + log and proceed without audio rather than block export.
            let audioPayload: { pcm: Float32Array; sampleRate: number; numFrames: number; durationSec: number } | undefined;
            if (pass === 'beauty') {
                try {
                    const clips = useAnimationStore.getState().audioClips;
                    const mixed = await mixAudioClipsForExport(clips, cfg.fps, cfg.startFrame, cfg.endFrame);
                    if (mixed) audioPayload = mixed;
                } catch (audioErr) {
                    console.warn('Audio mix failed; exporting silent video.', audioErr);
                }
            }

            await engine.startExport(config, fileStream, undefined, audioPayload);

            // Focus-lock DOF only meaningful on the beauty pass.
            const totalFrames = Math.floor((cfg.endFrame - cfg.startFrame) / cfg.frameStep) + 1;
            const outcome = await runFramePump(config, totalFrames, pass === 'beauty', deps, passPrefix);

            if (outcome === 'cancelled') {
                engine.cancelExport();
                // The worker aborts the file's stream; the empty file the picker made is then
                // taken away (a file picked to be replaced keeps what it held).
                await dropPickedFile();
                status.setStatusText(passPrefix + 'Cancelled.');
                break;
            }

            // Finalize this pass.
            status.setStatusText(passPrefix + 'Finalizing video...');
            const blob = await engine.finishExport();
            picked = null;                                           // the file is whole and closed: it stays

            if (blob && !effectiveDiskMode) {
                const blobObj = new Blob([blob], { type: selectedFormat.mime });
                const url = URL.createObjectURL(blobObj);
                const a = document.createElement('a');
                a.href = url;
                a.download = exportFilename;
                a.click();
                URL.revokeObjectURL(url);
                ramFileCount++;
            }

            // "Finish early" stops the current pass cleanly but also ends the
            // multi-pass run — the user asked to finish, not to proceed to the
            // next pass.
            if (flags.finishEarlyRef.current) break;
        }

        status.setStatusText(flags.cancelledRef.current ? 'Cancelled.' : 'Complete!');
        if (!flags.cancelledRef.current) {
            showToast(
                ramFileCount > 0
                    ? `Video export complete — ${ramFileCount} file${ramFileCount === 1 ? '' : 's'} downloaded`
                    : 'Video export complete — saved to disk',
                'success', 4500,
            );
        }
    } catch (e) {
        console.error('RenderPopup: Export failed', e);
        // A pass that failed has no video: its file is dropped as a discarded one is. Not
        // awaited before the alert - the worker has ended the session by then, or never will.
        void dropPickedFile();
        alert(`Export failed.\n\nError: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        status.setIsRendering(false);
        useEngineStore.getState().setActiveRenderSampleCap(null);
        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: false, progress: 0 });

        animationEngine.scrub(savedFrame);
        if (savedIsPlaying) useAnimationStore.getState().play();

        engine.modulations = {};
        modulationEngine.resetOffsets();
    }
};
