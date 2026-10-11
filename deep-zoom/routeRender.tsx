/**
 * deep-zoom/routeRender.tsx - the route, rendered: one PNG a frame into a folder, or one video file.
 *
 * PURPOSE
 *   A zoom video, two ways, from one dialog. Each frame of a range of the timeline is rendered by
 *   itself (`host.renderFrameBlob`: a frame depends on the view and the look and nothing else).
 *   THE LOSSLESS MASTER: every frame written at once into a folder the user picks, under its own
 *   frame number. So a render can be cancelled, or lost to a closed tab, and RESUMED: with
 *   "Resume" ticked the frames already in the folder are not rendered again; ffmpeg makes the
 *   video from the frames, and the dialog prints the line for it. A VIDEO FILE (stage R6b,
 *   2026-10-11): the same frames handed to the engine's encoder and written into an MP4 or a WebM
 *   the user picks, as the run goes. A video cannot be resumed. THERE IS NO PREVIEW FEATURE: a
 *   preview is this dialog at a small size and one sample, and its "Draft" button sets both.
 *
 * THE SEAM
 *   - `installRouteRender()` once, from main.tsx: the engine's generic render dialog
 *     (`engine/plugins/RenderDialog`) with this file's runner and the opt-ins `frameFolder` (with
 *     no `formatFilter`, so the video formats are listed beside the folder), `fixedSizes` and
 *     `presets` (the one "Draft"). The dialog opens from the timeline toolbar's Render button and
 *     from the Route tab's (`openRenderPopup()` in engine/animation/renderPopupRegistry.ts).
 *   - ONE LOOP, TWO SINKS. `runRouteRender` is the one frame loop: the set-up, THE WAIT, the hold
 *     on the live picture, the render, the checks, the clock, the estimate, the restore at the end.
 *     Where a finished frame GOES is a `FrameSink`: `openFolderSink` (a file a frame) or
 *     `openVideoSink` (the encoder). A third kind of output is a third sink, not a second loop.
 *   - ONE FRAME: `scrubRouteTo(frame)` (the playhead, every keyed value, and the camera on the
 *     route whoever held it), `flushHostSync()` (the formula values the sync was holding; with no
 *     route nothing else sends them), the renderer's own iteration rule held off, then
 *     `host.renderFrameBlob`, then the sink. NOTHING IS AWAITED between the scrub and the
 *     render's own start, so no live frame runs in between.
 *   - THE WAIT. With the frame set up, the host is asked whether a shader the picture needs is
 *     still building (`host.building()`: the ray march's, or the Mandelbox's). While one is, no
 *     frame is asked for: the dialog says "Waiting for the ray march's shader", the live picture
 *     goes on, Cancel works; then the frame is set up again and rendered. A build that FAILED is
 *     not waited for: the run goes on with what there is, as the live picture does. It is asked
 *     before every frame, with that frame's own values in force, so a keyed switch that needs
 *     another shader halfway would be waited for too (not driven: no test route keys one).
 *     WHY: the renderer builds what a frame needs before it draws it, on the main thread (grep
 *     `ensureRayVariant(false)` in `dzRenderFrame`, renderer/core.js; that stays, for a direct
 *     caller). Measured 2026-10-11 without the wait, seven sessions: Start pressed in the first
 *     half minute after the page opened held the whole page for 4.4 to 26.1 s inside frame 0,
 *     with no status line and no Cancel.
 *   - While a run lasts `setRouteRendering(true)` (deep-zoom/route.ts) holds the route still, and
 *     the navigation is locked (`routeRendering()` in DeepZoomNavigation.tsx).
 *   - Afterwards the playhead goes back, and the camera with it.
 *
 * WHAT IS RENDERED
 *   - THE RANGE the dialog shows, BOTH ENDS INCLUDED - the count it shows is the count rendered.
 *     It opens on the route's first to last keyframe, on the whole timeline when there is no route.
 *   - THE SIZE is a long edge (`DZ_RENDER_LONG_EDGES`: 640 px, the draft's, to 3840) at the
 *     picture's own shape AS THE RUN STARTS, and that shape is handed to every frame: a window
 *     resized halfway changes nothing. A resumed run takes the shape of the frames already in the
 *     folder, and refuses to add frames of another long edge to them.
 *   - THE FILES of a folder are `<project name>_<timeline frame, five digits>.png` - the frame's
 *     own number, not a count, so a frame keeps its file whatever range is rendered the next time.
 *     A video is offered as `<project name>.mp4` (or `.webm`); the picker lets the user rename it.
 *   - ITERATIONS are the count the route keys for the frame. With no iteration keys they are the
 *     count in force when the run starts, for every frame: the renderer's rule only ever raises
 *     the count, so with it running a frame's count would depend on the frames before it.
 *
 * A VIDEO FILE
 *   - THE FORMATS are the four video entries of `VIDEO_FORMATS`: MP4 with H.264, H.265 or AV1, and
 *     WebM with VP9, through `engine/export/videoEncoder.ts`. The dialog's own probe says which can
 *     start at the size chosen, and why not (this machine, a picture of 1.28 to 1: at 3840 x 3000
 *     H.264 and H.265 are refused, AV1 and VP9 run; at 2560 x 2000 all four run). The frame rate
 *     is the timeline's, the bitrate the dialog's (it follows the size: 40 Mbps at 1920 x 1080, by
 *     area), and a keyframe is forced every second (left to itself the codec makes ONE for the
 *     whole video: 300 frames measured, one keyframe).
 *   - WRITTEN AS IT GOES. The file is asked for first (`showSaveFilePicker`: the runner's first
 *     await). The encoder writes into it in chunks of 16 MiB, an MP4's index last
 *     (`mp4FastStart: false`), so a long route is not held in memory: of a 48 MB run of 48 frames
 *     the first 16 MiB had left after frame 31 (MP4; after frame 21 for WebM) and 32 MiB before the
 *     last frame was made. A video under 16 MiB leaves in one write when it is closed. The browser
 *     keeps what was written in a swap file of its own and puts it under the picked name when the
 *     file is CLOSED: until then the picked file is empty (0 bytes at every write, measured).
 *   - INTERRUPT, THEN RESUME / FINISH / DISCARD: the dialog's own video controls. Interrupt lets
 *     the frame in flight finish; then the run waits between two frames (no frame is made, the
 *     picture and the route stay held). FINISH closes the file with the frames made so far, and
 *     it plays (pressed while a frame is drawn, that frame is dropped). DISCARD aborts the file:
 *     nothing is put under the picked name, the empty file the picker made is removed where the
 *     browser can (`remove()`, Chromium), and a file that was picked to be REPLACED keeps what it
 *     held. A run stopped by a PROBLEM (the renderer restarted, a frame of another size) keeps
 *     its frames as Finish does.
 *   - NO FILE PICKER (Firefox, Safari), or the picker refused: the video is made in memory, index
 *     first, and saved as a download at the end - what fluid-toy's runner does. The dialog's badge
 *     says RAM, and the result says "saved as a download".
 *   - THE PIXELS GO THROUGH A PNG. The renderer hands a frame as a PNG blob and nothing else (grep
 *     `toBlob` in renderer/core.js), so the video sink decodes it again (`createImageBitmap`). At
 *     1920 x 1500 the renderer's encode took 125 ms and the decode here 41 ms of a frame of 0.80 s
 *     (2 samples); at 640 x 500, 16 ms and 5 ms of 0.10 s. A frame handed over as pixels would
 *     save both for a video; that is a change to core.js.
 *
 * PITFALLS
 *   - THE PICKER (the folder's, or the file's) is the runner's FIRST await: the browser shows it
 *     only inside the click that started the render.
 *   - `getHost()` is read again for every frame. A lost WebGL context remounts the renderer: the
 *     run stops with a line, and the frames written stay.
 *   - THE DIALOG IS THE TIMELINE'S CHILD. Closing the timeline in the middle of a run takes the
 *     dialog away, and with it every button: the run ends there (`dialogClosed`). A folder keeps
 *     its frames; a video is closed as by FINISH, so what was rendered is kept; a toast says what
 *     is where.
 *   - THE ENCODER LOCKS THE STREAM IT IS HANDED and its `cancel()` does not let go (grep `LOCKS
 *     THE` in videoEncoder.ts). So it gets a stream of this file's own that forwards to the picked
 *     file, and Discard aborts the file itself. Handed the file's stream, a discarded run could
 *     neither close nor abort it.
 *   - THE ROUTE AND THE PICTURE ARE FREE BEFORE A VIDEO IS CLOSED. Closing a large file takes the
 *     browser a moment ("Writing the video"); `running`, not `routeRendering()`, is what keeps a
 *     second render from starting meanwhile.
 *   - A HAND ON A PANEL, OR ON THE TIMELINE'S PLAYHEAD, IS NOT HELD. The route, its Play and the
 *     navigation are; a look value changed while a frame is being drawn lands in the middle of
 *     that frame, and a playhead dragged then moves the camera under it.
 *   - The gradient reaches the renderer through a React effect (GradientSync.tsx), not inside the
 *     scrub: a gradient keyed on the timeline would arrive a frame late. Nothing keys it today.
 *   - The estimate shown before a run is the cost of the frames rendered EARLIER IN THIS SESSION,
 *     by pixel and by sample. There is none until a frame has been rendered, and a deeper route
 *     costs more than it says.
 *   - The waits of a frame need no animation frame, so a run goes on with the window minimised or
 *     behind another - slower: measured, a frame of half a second took 3.7 s minimised (a second
 *     of it the PNG, the rest a few hundredths of a second a row of tiles). The clock and the bar
 *     are driven by a timer, which a hidden tab slows to one a second.
 *   - THE PICTURE SHOWS EACH FINISHED FRAME, not a frame building up: nothing is put on the canvas
 *     while a frame is drawn (grep `NO PICTURE ON THE CANVAS` in renderer/core.js for why).
 *   - THE WAIT HAS NO TIME LIMIT: it ends when the build does, or with Cancel. And two shaders are
 *     NOT WAITED FOR - the BLA one and the true-gradient one, which a frame needs only with the
 *     ray march off. The renderer still builds either inside the frame that first needs it (grep
 *     `ensureVariant(true, false, false)` and `jacBits()` in `dzRenderFrame`), the page standing
 *     still meanwhile; the host has no question for them (`building()` knows the two variants the
 *     `compile` event knows).
 *   - A FRAME WITH GRAIN IS NOT ALWAYS THE SAME FRAME TWICE. A smooth frame is: pixel for pixel,
 *     or a level in a few pixels. A grainy one can come out as another throw of its grain (grep
 *     `MEASURED 2026-10-11` in renderer/core.js; the renderer's own still export does the same).
 *     So a resumed run joins on without a seam, but its grainy frames are not byte for byte what
 *     an unbroken run writes. THE CAUSE IS NOT KNOWN, and THE WAIT does not cure it. Measured later
 *     that day, twelve frames each time against the same frames rendered afterwards:
 *       frames drawn straight after the ray march's shader arrived   9 of 11 sessions differed, 38 of 132 frames
 *       Start pressed 10 s after it was there                        1 of 4 sessions, 4 frames, drawn 10.8 to 14.1 s after
 *       a chain of twelve a minute after ready / a run after 75 s    0 of 12 frames / 0 of 5 sessions
 *     So no pause of up to 10 s is built in: it would not hold. Ruled out, frame by frame in 276
 *     frames: another shader program (every frame is drawn by the ray march's own), the BLA flag
 *     (off before and after every frame), a setting the host changes (none does), a live frame
 *     drawn inside a frame (none is), and what the page hands WebGL - a frame's commands and their
 *     values are those of its later render but for two set-up values taken from the live
 *     picture's smoothed distance (`setPowerUniforms`; `drawDeep` sets both again before every
 *     draw) and a G-buffer reused from the frame before instead of made anew. Neither is it:
 *     with the two values withheld 4 of 4 sessions still differed; with the G-buffer made anew
 *     for every frame 2 of 4 did (2 frames of 48, where a reused one gave 36 of 117).
 *
 * @assumption All of the above was driven in the app, on the real GPU, on 2026-10-11
 *   (debug/scratch/r6/app-render.mts, git-ignored): a twelve-frame run into an in-memory folder,
 *   a cancel after three frames and its resume, the playhead and the camera afterwards. THE WAIT
 *   and the grain's numbers: debug/scratch/r6/first-minute.mts (git-ignored) - in 18 sessions with
 *   Start pressed 15 to 24 s after ready the line showed and the page went on answering (asked
 *   every 0.15 s through the wait and the run, answered within 0.1 s); a Cancel during the wait
 *   gave the result 0.2 s later, no frame asked for, the playhead back where it was.
 *   There is NO STANDING GUARD for the runner - the owner declined a new smoke. What stands: the
 *   folder sink (`npm run test:frame-folder`), the host members (`npm run
 *   check:deep-zoom-module-host`, the "render: renderFrameBlob ..." and "input: building() ..."
 *   lines) and the route's hold (`npm run check:deep-zoom-route`, the "render: ..." lines).
 * @assumption A VIDEO FILE, all of it, was driven in the app on the real GPU on 2026-10-11
 *   (debug/scratch/r6b/video-render.mts, git-ignored; headless Chrome), with the file picker stood
 *   in for by a REAL File System Access file in the origin's private file system, every write
 *   recorded with its time: a 48-frame Draft to MP4 and to WebM, each read back (mediabunny's
 *   input side: 48 frames, 640 x 500, 30 a second, 1.600 s) and played to its end by a <video>;
 *   six frames of H.265 and of AV1 likewise; the bytes during a run; Interrupt then Resume, then
 *   Finish (4 frames: a file of 0.84 MB that plays) and then Discard (nothing under the
 *   name; an empty file where the handle has no `remove()`; a seeded file of 4,321 bytes kept);
 *   Finish and Discard pressed INSIDE a frame of 5 s (the result a second later, the frame
 *   dropped); the timeline closed mid-run (a file of the 4 frames made); no picker (a download of
 *   6 frames); and the folder cancelled and resumed as before (48 files, each written once).
 *   BROKEN ON PURPOSE once: with `mp4FastStart` left at the encoder's default, all three writes of
 *   a 48 MB MP4 came after its last frame (the script's "mp4: ... reached the stream BEFORE the
 *   last frame" line went red, WebM's stayed green); restored, 32 of 46 MiB come before it.
 *   NOT driven: the browser's real picker and a real disk (where the swap file lies there, and
 *   what a tab closed mid-run leaves); Firefox and Safari; a disk that fills up; a codec slower
 *   than the renderer (`MAX_QUEUED`); a route long enough to matter (300 frames was the longest).
 */
import React from 'react';
import { useAnimationStore } from '../store/animationStore';
import { useEngineStore } from '../store/engineStore';
import { VIDEO_FORMATS } from '../data/constants';
import { FRAME_FOLDER_FORMAT_INDEX, installRenderDialog } from '../engine/plugins/RenderDialog';
import type { RenderDialogConfig, RenderDialogPreset, RenderDialogResolutionPreset, RenderDialogRunner } from '../engine/plugins/RenderDialog';
import { pickFrameFolder, pngSize, safeFrameName } from '../engine/export/frameFolder';
import type { FrameFolder } from '../engine/export/frameFolder';
import { MainThreadEncoder } from '../engine/export/videoEncoder';
import { calcEtaRange, formatTimeWithUnits } from '../components/timeline/exportHelpers';
import { showToast } from '../engine/store/toastStore';
import { getHost } from './host/current';
import type { DzView } from './host/DeepZoomHost';
import { routeKeys, routeRendering, scrubRouteTo, setRouteRendering } from './route';
import { flushHostSync, holdAutoIterations } from './useHostSync';

/** The sizes offered: the frame's long edge in pixels. The other edge follows the picture's shape. */
export const DZ_RENDER_LONG_EDGES = [640, 1280, 1920, 2560, 3840] as const;
const DEFAULT_LONG_EDGE = 1920;
const DEFAULT_SAMPLES = 8;
/** How often the run looks for a cancel and moves the clock and the bar. */
const TICK_MS = 250;
/** How often THE WAIT asks whether the shader is there (and an interrupted run whether it may go on), and what the dialog says meanwhile. */
const WAIT_MS = 100;
const WAITING = { rayMarch: 'Waiting for the ray march\'s shader', mandelbox: 'Waiting for the Mandelbox\'s shader' } as const;
/** Frames the video encoder may have waiting before the run holds the next one back (each holds its picture). */
const MAX_QUEUED = 2;

const say = (err: unknown): string => (err instanceof Error ? err.message : String(err));
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? '' : 's'}`;
const megapixelSamples = (w: number, h: number, samples: number): number => (w * h / 1e6) * samples;

/** The picture's shape now: its canvas's width over its height (16:9 before there is a picture). */
function pictureAspect(): number {
    const canvas = getHost()?.canvas();
    return canvas && canvas.clientWidth > 1 && canvas.clientHeight > 1 ? canvas.clientWidth / canvas.clientHeight : 16 / 9;
}

/** The pixels a long edge gives at a shape: the renderer's own rule, both sides made even (grep
 *  `longEdgeToWH` in deep-zoom/renderer/core.js). The run checks every frame against it. */
function renderSize(longEdge: number, aspect: number): { w: number; h: number } {
    const even = (v: number): number => { const r = Math.max(2, Math.round(v)); return r - (r % 2); };
    return aspect >= 1 ? { w: even(longEdge), h: even(longEdge / aspect) } : { w: even(longEdge * aspect), h: even(longEdge) };
}

const sizes = (): RenderDialogResolutionPreset[] => {
    const aspect = pictureAspect();
    return DZ_RENDER_LONG_EDGES.map((edge) => ({ label: `${edge} px`, ...renderSize(edge, aspect) }));
};

/** What the dialog opens with: the route's own span, or the whole timeline when there is no route. */
function defaults(): Partial<RenderDialogConfig> {
    const keys = routeKeys(), size = renderSize(DEFAULT_LONG_EDGE, pictureAspect());
    return {
        formatIndex: FRAME_FOLDER_FORMAT_INDEX,
        samplesPerFrame: DEFAULT_SAMPLES,
        width: size.w,
        height: size.h,
        ...(keys.length > 1 ? { startFrame: Math.floor(keys[0].frame), endFrame: Math.ceil(keys[keys.length - 1].frame) } : {}),
    };
}

/** The dialog's "Draft" button: the smallest size and one sample a pixel. It leaves the format alone. */
const DRAFT: RenderDialogPreset = {
    label: 'Draft',
    title: 'The smallest size and 1 sample: a quick look at the whole route before the real render',
    apply: () => { const smallest = sizes()[0]; return { width: smallest.w, height: smallest.h, samplesPerFrame: 1 }; },
};

/** Seconds one megapixel-sample cost in the last run of this session. Null: no frame rendered yet. */
let unitCost: number | null = null;

/** The dialog's "Estimate" row. Nothing until a frame has been rendered in this session. */
const EstimateRow: React.FC<{ cfg: RenderDialogConfig }> = ({ cfg }) => {
    if (unitCost === null) return null;
    const frames = Math.floor((cfg.endFrame - cfg.startFrame) / Math.max(1, cfg.frameStep)) + 1;
    const seconds = unitCost * megapixelSamples(cfg.width, cfg.height, cfg.samplesPerFrame) * frames;
    return (
        <div
            data-dz-render-estimate
            className="flex justify-between"
            title="From the frames rendered earlier in this session, by pixel and by sample. A deeper route takes longer."
        >
            <span className="text-fg-muted">Estimate</span>
            <span className="font-mono text-fg-secondary">about {formatTimeWithUnits(seconds)}</span>
        </div>
    );
};

/** A run is in flight, from its picker's answer to its result (the sink closed). */
let running = false;
/** The dialog went away while a run was in flight (see PITFALLS): the run ends there, and what it made is kept. */
let dialogClosed = false;

const sameCamera = (a: DzView, b: DzView): boolean =>
    a.cam.every((c, i) => c === b.cam[i]) && a.yaw === b.yaw && a.pitch === b.pitch && (a.roll ?? 0) === (b.roll ?? 0);

// WHERE A FINISHED FRAME GOES

/** What the loop tells a sink when the run is over. */
interface RunSummary {
    /** Frames this run made and handed over; the frames it had to make; the frames it found already there. */
    written: number;
    toRender: number;
    already: number;
    /** The frames of the range, and the timeline frame the range starts on. */
    total: number;
    firstFrame: number;
    /** The run ended before its last frame. */
    stopped: boolean;
}

/**
 * WHERE A FINISHED FRAME GOES: the one thing the two kinds of run do not share. The loop
 * (`runRouteRender`) is one; a folder of PNG files and a video file are each one of these.
 */
interface FrameSink {
    /** The folder's name, or the file's: what the result and the toast name. */
    readonly name: string;
    /** What the dialog says while `end` works, when that can take a while. */
    readonly closing: string | null;
    /** Before the first frame: which of `frames` need no rendering (a resumed folder; none for a video), and the
     *  shape every frame must have. A rejection stops the run with its line. */
    begin(run: { frames: number[]; longEdge: number; aspect: number; stop: () => boolean }): Promise<{ there: boolean[]; aspect: number }>;
    /** One finished frame, in the order rendered. A rejection stops the run with its line. */
    put(frame: number, png: Blob): Promise<void>;
    /** After the last frame. `keep` false: the user threw the run away. Never rejects: it answers what went wrong, '' for nothing. */
    end(keep: boolean): Promise<string>;
    /** The word for a run that ended early, thrown away or not. */
    stopWord(thrown: boolean): string;
    /** How many frames are there now, for the toast of a run whose dialog went away. */
    count(sum: RunSummary): number;
    /** The result's lines about what is where; and, to go under the time line, a command with the line that introduces it. */
    report(sum: RunSummary): { where: string[]; command?: { say: string; line: string } };
}

/** The ffmpeg line that makes a video of the frames (run in their folder). ffmpeg looks for the
 *  first file among numbers 0 to 4 only, so a sequence that starts later says where. */
const ffmpegLine = (folder: FrameFolder, fps: number, first: number): string =>
    `ffmpeg -framerate ${fps} ${first > 0 ? `-start_number ${first} ` : ''}-i ${folder.name}_%05d.png -c:v libx264 -pix_fmt yuv420p -crf 16 ${folder.name}.mp4`;

/** One PNG a frame, into a folder the user picks. Null: backed out of the picker. THE PICKER IS ITS FIRST AWAIT. */
async function openFolderSink(project: string, resume: boolean, fps: number): Promise<FrameSink | null> {
    const folder = await pickFrameFolder(project);
    if (!folder) return null;
    return {
        name: folder.folder,
        closing: null,
        async begin({ frames, longEdge, aspect, stop }) {
            const there: boolean[] = [];
            if (resume) for (const frame of frames) { if (stop()) break; there.push(await folder.has(frame)); }
            const firstThere = there.indexOf(true);
            if (firstThere >= 0) {
                // The frames already there say what shape the rest must have.
                const file = await folder.read(frames[firstThere]), size = file ? await pngSize(file) : null;
                if (size && Math.max(size.width, size.height) !== longEdge) {
                    throw new Error(`The frames in that folder are ${size.width} x ${size.height}. Pick that size, or another folder`);
                }
                if (size) aspect = size.width / size.height;
            }
            return { there, aspect };
        },
        put: (frame, png) => folder.write(frame, png),
        end: async () => '',                                             // every frame is a file already: nothing to close, nothing to throw away
        stopWord: () => 'Cancelled.',
        count: ({ written, already }) => written + already,
        report({ written, toRender, already, total, firstFrame, stopped }) {
            const where = toRender === 0
                ? [`All ${total} frames are already in "${folder.folder}".`]
                : [`${stopped ? `${written} of ${toRender}` : written} frame${toRender === 1 ? '' : 's'} written to "${folder.folder}".`
                    + (already > 0 ? ` ${already} ${already === 1 ? 'was' : 'were'} already there.` : '')];
            return written + already > 0
                ? { where, command: { say: 'To make a video of them with ffmpeg, run this in that folder:', line: ffmpegLine(folder, fps, firstFrame) } }
                : { where };
        },
    };
}

/** The part of the File System Access API's file picker a video uses. (The project's DOM types do not declare it;
 *  the real handle and stream fit these shapes.) */
interface SaveFileStream {
    write(chunk: unknown): Promise<void>;
    close(): Promise<void>;
    abort(): Promise<void>;
}
interface SaveFileHandle {
    readonly name: string;
    getFile(): Promise<Blob>;
    createWritable(): Promise<SaveFileStream>;
    /** Chromium's own (not in the standard): the file deleted. */
    remove?(): Promise<void>;
}
type SaveFilePicker = (options: { id?: string; suggestedName?: string; types?: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<SaveFileHandle>;

/**
 * One video file (`cfg.formatIndex`: an MP4 or a WebM of `VIDEO_FORMATS`), through the engine's main-thread encoder.
 * Null: backed out of the picker. THE PICKER IS ITS FIRST AWAIT. With a picked file the video is written into it AS THE
 * RUN GOES (see the header, A VIDEO FILE); where the browser has no picker, or refuses it, the video is made in memory
 * and saved as a download at the end.
 */
async function openVideoSink(project: string, cfg: RenderDialogConfig, isDiskMode: boolean): Promise<FrameSink | null> {
    const format = VIDEO_FORMATS[cfg.formatIndex];
    const suggested = `${safeFrameName(project)}.${format.ext}`;
    let handle: SaveFileHandle | null = null, file: SaveFileStream | null = null;
    const pick = isDiskMode ? (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker : undefined;
    if (typeof pick === 'function') {
        try {
            handle = await pick.call(window, {
                id: 'route-video',
                suggestedName: suggested,
                types: [{ description: format.label, accept: { [format.mime]: [`.${format.ext}`] } }],
            });
            file = await handle.createWritable();
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return null;
            if (!(err instanceof Error && err.name === 'SecurityError')) throw err;
            handle = null;                                               // the picker was refused: in memory, as where there is none
            file = null;
        }
    }
    const disk = handle && file ? { handle, file } : null;
    const name = disk ? disk.handle.name : suggested;
    const encoder = new MainThreadEncoder();
    let count = 0, bytes = 0, kept = false, dropped = false;
    // The encoder gets a stream OF OURS that forwards to the file, not the file's own: it locks the stream it is
    // handed and never lets go, and a discarded run has to abort the file itself (grep `LOCKS THE` in videoEncoder.ts).
    const stream = disk
        ? new WritableStream<unknown>({ write: (chunk) => (dropped ? undefined : disk.file.write(chunk)), close: () => disk.file.close() })
        : null;
    /** Nothing of this run stays: the half-written file is dropped (what was in a file picked to be replaced stays as
     *  it was), and the empty file the picker made is taken away where the browser can. */
    const throwAway = async (): Promise<void> => {
        dropped = true;
        encoder.cancel();
        if (!disk) return;
        try {
            await disk.file.abort();
            if ((await disk.handle.getFile()).size === 0) await disk.handle.remove?.();
        } catch { /* closed already, or the file is gone: there is nothing left to take away */ }
    };
    return {
        name,
        closing: 'Writing the video',
        async begin({ longEdge, aspect }) {
            const size = renderSize(longEdge, aspect);
            const fps = cfg.fps / Math.max(1, Math.round(cfg.frameStep)); // the rate the frames PLAY at, as fluid-toy's runner
            await encoder.start({
                width: size.w,
                height: size.h,
                fps,
                bitrate: cfg.bitrate,
                formatIndex: cfg.formatIndex,
                mp4FastStart: stream ? false : 'in-memory',              // into a file: as it goes, the index last
                keyFrameEvery: Math.max(1, Math.round(fps)),             // a keyframe a second: the codec alone makes ONE for the whole video
            }, stream);
            return { there: [], aspect };
        },
        async put(_frame, png) {
            // The renderer hands a PNG and nothing else (grep `toBlob` in renderer/core.js): it is decoded again here.
            const picture = await createImageBitmap(png);
            try { encoder.encodeCanvas(picture, count); } finally { picture.close(); }
            count++;
            while (encoder.queueSize > MAX_QUEUED) await sleep(20);      // a codec slower than the renderer: do not pile pictures up
        },
        async end(keep) {
            try {
                if (!keep || count === 0) { await throwAway(); return ''; }
                const buffer = await encoder.finish();                   // into a file: the last chunk, the index, and the file closed
                if (buffer) {
                    bytes = buffer.byteLength;
                    const link = document.createElement('a'), url = URL.createObjectURL(new Blob([buffer], { type: format.mime }));
                    link.href = url;
                    link.download = name;
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 10_000);
                } else if (disk) bytes = (await disk.handle.getFile()).size;
                kept = true;
                return '';
            } catch (err) {
                await throwAway();
                return say(err);
            }
        },
        stopWord: (thrown) => (thrown ? 'Discarded.' : 'Finished early.'),
        count: () => (kept ? count : 0),
        report: () => ({
            where: [kept
                ? `${plural(count, 'frame')} in "${name}" (${(bytes / 1e6).toFixed(bytes < 1e7 ? 2 : 1)} MB)${disk ? '' : ', saved as a download'}.`
                : 'No video was written.'],
        }),
    };
}

// THE RUN

const runRouteRender: RenderDialogRunner = async ({ cfg, flags, status, resume, isDiskMode }) => {
    const ready = getHost();
    if (running || routeRendering()) { showToast('A render is already running', 'warning'); return; }
    if (!ready?.renderFrameBlob || !ready.bootParams()) { showToast('The renderer is not ready yet', 'warning'); return; }
    let sink: FrameSink | null;
    try {
        const project = (useEngineStore.getState() as { projectSettings?: { name?: string } }).projectSettings?.name || 'deep-zoom';
        // THE FIRST AWAIT, inside the click: the folder picker, or the file picker.
        sink = cfg.formatIndex === FRAME_FOLDER_FORMAT_INDEX
            ? await openFolderSink(project, !!resume, cfg.fps)
            : await openVideoSink(project, cfg, isDiskMode);
    } catch (err) {
        showToast(say(err), 'error', 6000);
        return;
    }
    if (!sink) return;                                                   // backed out of the picker
    running = true;

    const anim = useAnimationStore.getState();
    if (anim.isPlaying) anim.pause();
    const savedFrame = anim.currentFrame, savedView = ready.getView();
    const step = Math.max(1, Math.round(cfg.frameStep)), samples = Math.max(1, Math.round(cfg.samplesPerFrame));
    const longEdge = Math.max(cfg.width, cfg.height);
    const frames: number[] = [];
    for (let f = cfg.startFrame; f <= cfg.endFrame; f += step) frames.push(f);

    dialogClosed = false;
    setRouteRendering(true);
    status.setResult(null);
    status.setIsRendering(true);
    status.setIsStopping(false);
    status.setProgress(0);
    status.setElapsedTime(0);
    status.setEtaRange({ min: 0, max: 0 });
    status.setLastFrameTime(0);
    status.setStatusText(resume ? 'Looking in the folder' : 'Starting');

    /** The run was thrown away: a folder's Cancel (its frames stay), a video's Discard (no file stays). */
    const thrown = (): boolean => flags.cancelledRef.current;
    /** No further frame: thrown away, a video's Finish, or the dialog gone. */
    const stop = (): boolean => thrown() || flags.finishEarlyRef.current || dialogClosed;
    const started = performance.now();
    const elapsed = (): number => (performance.now() - started) / 1000;
    /** Frames handed to the sink by this run; frames found already there; frames this run has to make. */
    let written = 0, already = 0, toRender = frames.length;
    /** How far the frame in flight is (0..1), the seconds the written frames took, and their megapixel-samples. */
    let fraction = 0, cost = 0, units = 0;
    let problem = '', touched = false;

    const tick = setInterval(() => {
        if (stop()) getHost()?.cancel();                                 // reaches the frame in flight at its next row
        const now = useAnimationStore.getState();
        if (now.isPlaying) now.pause();                                  // somebody pressed Play: not during a render
        status.setElapsedTime(elapsed());
        if (toRender > 0) status.setProgress((written + fraction) / toRender);
    }, TICK_MS);
    const offProgress = ready.on('progress', (p) => { fraction = p?.fraction ?? 0; });

    try {
        const begun = await sink.begin({ frames, longEdge, aspect: pictureAspect(), stop });
        const there = begun.there, aspect = begun.aspect;
        already = there.filter(Boolean).length;
        toRender = frames.length - already;
        const want = renderSize(longEdge, aspect);

        for (let i = 0; i < frames.length && !stop(); i++) {
            if (there[i]) continue;
            const frame = frames[i];
            // Interrupt (the dialog of a video): the run waits here, between two frames, for Resume, Finish or Discard.
            if (flags.stoppingRef.current) {
                status.setStatusText('Interrupted');
                while (flags.stoppingRef.current && !stop()) await sleep(WAIT_MS);
                if (stop()) break;
            }
            let host = getHost();
            // The frame is set up, then THE WAIT (see the header): with the frame's own values in force, is a shader
            // the picture needs still building? After a wait the frame is set up again, so that nothing is awaited
            // between the last set-up and the render's own start, and nothing can move the view in between.
            while (host?.renderFrameBlob && !stop()) {
                touched = true;
                scrubRouteTo(frame);
                flushHostSync();
                holdAutoIterations(true);
                let what = host.building();
                if (!what) break;
                host.holdLive(false);                                            // a build is noticed only by a frame that runs
                while (what && !stop()) {
                    status.setStatusText(WAITING[what]);
                    await sleep(WAIT_MS);
                    host = getHost();
                    what = host?.building() ?? null;
                }
            }
            if (stop()) break;
            if (!host?.renderFrameBlob) { problem = 'The renderer was restarted'; break; }
            status.setStatusText(`Frame ${frame} (${written + 1} of ${toRender})`);
            const t0 = performance.now();
            fraction = 0;
            // From here to the end of the run the live picture is held: the canvas shows each finished frame until
            // the next is done, with no low-resolution live frame and no empty canvas in between (the owner,
            // 2026-10-11: "users would only like to see each hires image").
            host.holdLive(true);
            const r = await host.renderFrameBlob({ longEdge, samples, aspect });
            if (!r.ok) { if (r.reason !== 'cancelled') problem = r.message ?? `The renderer answered "${r.reason}"`; break; }
            if (r.width !== want.w || r.height !== want.h) { problem = `A frame came out ${r.width} x ${r.height}, not ${want.w} x ${want.h}`; break; }
            await sink.put(frame, r.data);
            written++;
            fraction = 0;
            const seconds = (performance.now() - t0) / 1000;
            cost += seconds;
            units += megapixelSamples(r.width, r.height, samples);
            status.setLastFrameTime(seconds);
            status.setProgress(written / toRender);
            status.setEtaRange(calcEtaRange(cost, written, toRender));
        }
    } catch (err) {
        problem = say(err);
    } finally {
        clearInterval(tick);
        offProgress();
        getHost()?.holdLive(false);                                              // the live picture again
        if (touched) {
            // The playhead and every keyed value back; then the camera, if it is not where it was. (Only then: a
            // `setView` is a jump to the trail and the route, and with no route the run never moved the camera.)
            holdAutoIterations(false);
            scrubRouteTo(savedFrame);
            const host = getHost();
            if (host && !sameCamera(host.getView(), savedView)) host.setView(savedView);
        }
        if (units > 0) unitCost = cost / units;
        setRouteRendering(false);
    }

    // The sink closes: a video's last bytes and its index, or - thrown away - no file. The route and the picture are
    // the user's again meanwhile; only another render has to wait (`running`).
    const wasThrown = thrown();
    if (sink.closing && !wasThrown && written > 0) status.setStatusText(sink.closing);
    const closeProblem = await sink.end(!wasThrown);
    if (closeProblem && !problem) problem = closeProblem;
    running = false;

    const sum: RunSummary = { written, toRender, already, total: frames.length, firstFrame: frames[0], stopped: !!problem || written < toRender };
    const said = sink.report(sum);
    const lines: string[] = [];
    if (problem) lines.push(`Stopped: ${problem}.`);
    else if (sum.stopped) lines.push(sink.stopWord(wasThrown));
    lines.push(...said.where);
    const each = written > 0 ? cost / written : 0;                       // a draft's frame is a few hundredths of a second
    if (written > 0) lines.push(`Time taken ${formatTimeWithUnits(elapsed())}, ${each.toFixed(each < 1 ? 2 : 1)} s a frame.`);
    if (said.command) lines.push(said.command.say);
    status.setResult({ lines, command: said.command?.line });
    status.setIsRendering(false);
    status.setIsStopping(false);
    if (dialogClosed) {
        const left = sink.count(sum);
        showToast(`Render stopped: its window was closed. ${left} frame${left === 1 ? ' is' : 's are'} in "${sink.name}"`, 'warning', 8000);
    }
};

let installed = false;

/** Call once, from main.tsx, after `installRoute()`. */
export function installRouteRender(): void {
    if (installed) return;
    installed = true;
    installRenderDialog({
        runner: runRouteRender,
        title: 'Render',
        frameFolder: true,                                               // and no `formatFilter`: the folder, and the video formats beside it
        fixedSizes: true,
        resolutionPresets: sizes,
        presets: [DRAFT],
        defaults,
        showFrameStep: false,
        extraInfoRows: EstimateRow,
        onMount: () => () => { if (running) dialogClosed = true; },
    });
}
