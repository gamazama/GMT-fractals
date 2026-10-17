/**
 * deep-zoom/routeRender.tsx - the route, rendered: one PNG a frame into a folder, or one video file.
 *
 * PURPOSE
 *   A zoom video, two ways, from one dialog. Each frame of a range of the timeline is rendered by
 *   itself (`host.renderFrameBlob`: a frame depends on the view and the look and nothing else).
 *   THE LOSSLESS MASTER: every frame written at once into a folder the user picks, under its own
 *   frame number. So a render can be cancelled, or lost to a closed tab, and CONTINUED: a run that
 *   finds frames of its own already in the folder asks what to do with them (see FRAMES ALREADY
 *   IN THE FOLDER), and the frames it goes on from are not rendered again; ffmpeg makes the
 *   video from the frames, and the dialog prints the line for it. A VIDEO FILE (stage R6b,
 *   2026-10-11): the same frames handed to the engine's encoder and written into an MP4 or a WebM
 *   the user picks, as the run goes. A video cannot be resumed. THERE IS NO PREVIEW FEATURE: a
 *   preview is this dialog at a small size and one sample, its Quality row's "Draft" - 320p (a short
 *   edge of 320 px: the owner, 2026-10-16, "for previews, we can use a lowres like 320p for faster
 *   output") - for checking a route's pacing, a smoothing pass's above all; "Final" puts back the
 *   size and the samples that were set before.
 *
 * THE SEAM
 *   - `installRouteRender()` once, from main.tsx: the engine's generic render dialog
 *     (`engine/plugins/RenderDialog`) with this file's runner and the opt-ins `frameFolder` with a
 *     `formatFilter` of two (What = [Video MP4 | Frames (PNG folder)], one segmented row), `shapes`
 *     (a width and [Window | 16:9 | 1:1]), `draft` (Quality = [Draft | Final]) and
 *     `rangeInSeconds`. Its first default (F11, stage 7 of the streamline, 2026-10-17): a Video MP4,
 *     1280 wide, at the Window's shape, 8 samples; after that it opens on what it was left on (the
 *     dialog's own memory, `DZ_RENDER_STORAGE_KEY`). The dialog opens from the timeline toolbar's
 *     Render button and from the Route tab's (`openRenderPopup()` in
 *     engine/animation/renderPopupRegistry.ts).
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
 *     frame is asked for: the dialog says "Waiting for the Mandelbox's shader", the live picture
 *     goes on, Cancel works; then the frame is set up again and rendered. It is asked
 *     before every frame, with that frame's own values in force, so a keyed switch that needs
 *     another shader halfway would be waited for too (not driven: no test route keys one).
 *     SINCE 2026-10-11 THE RAY MARCH'S SHADER IS NEVER WHAT A RUN WAITS FOR: it is the bulb's one
 *     program and what the renderer's `ready` means, and a run does not start before that
 *     (`bootParams()`, below). The wait is the Mandelbox's now - a formula switched to moments
 *     before Start, or keyed halfway.
 *     A BUILD THAT FAILED IS NOT WAITED FOR, and the wait cannot hang on one: `building()` is null
 *     then. A ray march that could not be built is the app's boot failure: there is no host, no
 *     dialog to start a run from.
 *     WHY: the renderer builds what a frame needs before it draws it, on the main thread (grep
 *     `ensureBoxVariant(false)` in `dzRenderFrame`, renderer/core.js; that stays, for a direct
 *     caller). Measured 2026-10-11 without the wait, seven sessions, when the ray march's shader
 *     still arrived after `ready`: Start pressed in the first half minute after the page opened
 *     held the whole page for 4.4 to 26.1 s inside frame 0, with no status line and no Cancel.
 *   - While a run lasts `setRouteRendering(true)` (deep-zoom/route.ts) holds the route still, and
 *     the navigation is locked (`routeRendering()` in DeepZoomNavigation.tsx).
 *   - Afterwards the playhead goes back, and the camera with it.
 *
 * WHAT IS RENDERED
 *   - THE RANGE the dialog shows, BOTH ENDS INCLUDED - the count it shows is the count rendered.
 *     It opens on the route's first to last keyframe, on the whole timeline when there is no route.
 *   - THE SIZE is a width (`DZ_RENDER_WIDTHS`: 640 to 3840) at a shape: the Window's (the picture's
 *     own, `pictureAspect`), 16:9 or 1:1; the dialog makes the height, and the run renders the size
 *     the dialog shows (its long edge and its shape), handed to every frame: a window resized halfway
 *     changes nothing. Draft is 320p (`DZ_PREVIEW_SHORT_EDGE`: a short edge of 320 px, 568 x 320 at
 *     16:9). A run that CONTINUES takes the shape of the frames already in the folder; frames of
 *     another long edge, or of more than one size, cannot be continued.
 *   - THE FILES are named after the project when somebody named it (not "Untitled", and not the
 *     formula's id that `loadPreset` gives a scene called "Untitled"), otherwise after the route's
 *     depth span ("deep zoom 2e0 to 1e-3"; the place's depth with no route): `renderName`, made safe
 *     (`safeFrameName`: deep_zoom_2e0_to_1e-3). A folder's files are `<name>_<timeline frame, five
 *     digits>.png` - the frame's own number, not a count, so a frame keeps its file whatever range is
 *     rendered the next time; a video is offered as `<name>.mp4`, and the picker lets the user rename
 *     it. A route edited to another span is another name: its frames are not this render's.
 *   - ITERATIONS are the count the route keys for the frame. With no iteration keys they are the
 *     count in force when the run starts, for every frame: the renderer's rule only ever raises
 *     the count, so with it running a frame's count would depend on the frames before it.
 *
 * FRAMES ALREADY IN THE FOLDER (stage R6c, 2026-10-11; the owner: "rather than a checkbox, if it
 * detects existing frames, it should come up with options to overwrite, continue, cancel")
 *   - THE FRAMES OF THIS RENDER are the range's frames under this project's file name
 *     (`lookForFrames` in engine/export/frameFolder.ts). A file that is empty is not there;
 *     another name's file, and a frame outside the range, are not this render's. NONE THERE:
 *     nothing is asked and the run starts. SOME THERE: before anything is rendered the dialog
 *     asks (`status.ask`, the render dialog's own question), saying how many of how many are in
 *     which folder:
 *       Overwrite   every frame of the range is rendered, each file replaced as its frame is
 *                   written. Nothing is deleted first.
 *       Continue    only the missing frames are rendered, at the size of the frames there.
 *       Cancel      nothing is rendered, nothing written; the dialog is back on its form.
 *   - CONTINUE IS NOT OFFERED where it could not join on, and the question says why: the frames
 *     there have another long edge than this render (both sizes are said), or more than one size;
 *     or every frame of the range is there already (it would render nothing). The same long edge
 *     at another shape CAN be continued: the run takes their shape, and the question says so.
 *   - THE RESULT says what happened: on Continue how many were written and how many were already
 *     there; on Overwrite how many of the written frames replaced one that was there and, when
 *     the run was stopped, how many from before are still there, not replaced.
 *   - A VIDEO ASKS NOTHING: a picked file is replaced, and the browser's own picker has asked.
 *   - Pitfalls. THE FRAMES ARE KNOWN BY NAME ONLY: nothing says a frame under this name was made
 *     with this route, this look or these samples. AN OVERWRITE STOPPED HALFWAY LEAVES NEW AND OLD
 *     FRAMES SIDE BY SIDE, and at one size nothing tells them apart: the next run finds every
 *     frame there and offers Overwrite and Cancel. WHILE THE QUESTION IS OPEN the route is held as
 *     in a run, nothing has been touched, and the clock has not started ("Time taken" is the
 *     rendering). THE DIALOG CLOSED UNDER IT (the timeline closed; the window's own X, which
 *     works while it asks) is the answer Cancel, with no toast: nothing had started.
 *
 * A VIDEO FILE
 *   - THE FORMAT is "Video MP4", `VIDEO_FORMATS`' H.264 (F11, 2026-10-17: the other three video
 *     entries, MP4 with H.265 or AV1 and WebM, are no longer offered here; this sink still writes any
 *     of them), through `engine/export/videoEncoder.ts`. The dialog's own probe says whether it can
 *     start at the size chosen, and why not (this machine, a picture of 1.28 to 1: at 3840 x 3000
 *     H.264 and H.265 were refused, AV1 and VP9 ran; at 2560 x 2000 all four ran). The frame rate
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
 *     first, and saved as a download at the end - what fluid-toy's runner does. The dialog says
 *     "Saved as a download" beside the format, and so does the result.
 *   - A PICKED FILE THE BROWSER WILL NOT LET THE PAGE WRITE (`createWritable` refused with
 *     NotAllowedError; seen 2026-10-17 by the owner in the Claude app's built-in browser, which shows
 *     the picker and then refuses the write): the same, in memory and a download at the end under the
 *     name picked, and a toast says so before the first frame. A FOLDER the page may not write into
 *     stops the run at its first frame with a line that says why (no frame is lost: none was made).
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
 *     THE` in videoEncoder.ts). So it gets a stream that forwards to the picked file, and Discard
 *     aborts the file itself (`forwardToPickedFile` in engine/export/pickedFile.ts: written here
 *     first, lifted there on 2026-10-11 when fluid-toy's runner needed the same). Handed the
 *     file's stream, a discarded run could neither close nor abort it.
 *   - THE ROUTE AND THE PICTURE ARE FREE BEFORE A VIDEO IS CLOSED. Closing a large file takes the
 *     browser a moment ("Writing the video"); `running`, not `routeRendering()`, is what keeps a
 *     second render from starting meanwhile.
 *   - A HAND ON A PANEL, OR ON THE TIMELINE'S PLAYHEAD, IS NOT HELD. The route, its Play and the
 *     navigation are; a look value changed while a frame is being drawn lands in the middle of
 *     that frame, and a playhead dragged then moves the camera under it.
 *   - The gradient reaches the renderer through a React effect (GradientSync.tsx), not inside the
 *     scrub: a gradient keyed on the timeline would arrive a frame late. Nothing keys it today.
 *   - THE ESTIMATE shown before a run is "about" a time, from the live picture's own last frame that
 *     drew a sample (the telemetry's fps and drawn size, one sample a frame: `liveUnit`), scaled by
 *     pixels, samples and frames - or, at the size and samples of a run EARLIER IN THIS SESSION, the
 *     seconds that run's frames took. (Not that run's cost scaled to another size: a frame's PNG and
 *     orbit cost the same at one sample as at eight, so a Draft's cost said 1 min 33 s for a Final
 *     that took 4 s; measured 2026-10-17, debug/scratch/streamline/stage7-try.mjs.) The live frame's
 *     time is the window's frame interval, so it reads no faster than the display's refresh and no
 *     slower than 20 a second (the renderer's own clamp: grep `Math.min(0.05` in renderer/core.js):
 *     measured headless, it said 4 s for a Draft of 341 frames that took 26 s, and 5 min 24 s for a
 *     Final of 341 whose first 31 frames took 0.13 s each. A deeper route costs more than it says.
 *   - The waits of a frame need no animation frame, so a run goes on with the window minimised or
 *     behind another - slower: measured, a frame of half a second took 3.7 s minimised (a second
 *     of it the PNG, the rest a few hundredths of a second a row of tiles). The clock and the bar
 *     are driven by a timer, which a hidden tab slows to one a second.
 *   - THE PICTURE SHOWS EACH FINISHED FRAME, not a frame building up: nothing is put on the canvas
 *     while a frame is drawn (grep `NO PICTURE ON THE CANVAS` in renderer/core.js for why).
 *   - THE WAIT HAS NO TIME LIMIT: it ends when the build does - done or failed - or with Cancel.
 *     `building()` knows the two programs the `compile` event knows, and there is no third.
 *   - A FRAME WITH GRAIN IS NOT ALWAYS THE SAME FRAME TWICE. A smooth frame is: pixel for pixel,
 *     or a level in a few pixels. A grainy one can come out as another throw of its grain (grep
 *     `MEASURED 2026-10-11` in renderer/core.js; the renderer's own still export does the same).
 *     So a continued run joins on without a seam, but its grainy frames are not byte for byte
 *     what an unbroken run writes. THE CAUSE IS NOT KNOWN, and THE WAIT does not cure it. Measured later
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
 *   a cancel after three frames and a second run that went on from them (asked for on the form
 *   then; since stage R6c by the question, below), the playhead and the camera afterwards. THE WAIT
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
 *   6 frames); and the folder cancelled and gone on from, as that stage did it (48 files, each
 *   written once).
 *   BROKEN ON PURPOSE once: with `mp4FastStart` left at the encoder's default, all three writes of
 *   a 48 MB MP4 came after its last frame (the script's "mp4: ... reached the stream BEFORE the
 *   last frame" line went red, WebM's stayed green); restored, 32 of 46 MiB come before it.
 *   NOT driven: the browser's real picker and a real disk (where the swap file lies there, and
 *   what a tab closed mid-run leaves); Firefox and Safari; a disk that fills up; a codec slower
 *   than the renderer (`MAX_QUEUED`); a route long enough to matter (300 frames was the longest).
 * @assumption FRAMES ALREADY IN THE FOLDER, all of it, was driven in the app on the real GPU on
 *   2026-10-11 (debug/scratch/r6c/frames-question.mts, git-ignored; headless Chrome; an in-memory
 *   folder that records every write; 48 frames at the Draft size): a fresh folder asks nothing,
 *   also with another name's file and a frame outside the range in it; with 6 of 48 there the
 *   question, and Cancel (no write, the six files the very ones, the playhead and the camera
 *   where they were), Continue (42 written, each once, none of the six) and Overwrite (48
 *   written, each once, the six replaced); all 48 there (no Continue) and an Overwrite cancelled
 *   after 14 ("14 replaced ... 34 from before are still there", and 34 files are the old ones);
 *   another size, two sizes (no Continue, the sizes said), 640 x 360 against 640 px (Continue,
 *   and the 42 new frames are 640 x 360); an empty file (5 of 48); an MP4 into a file that held
 *   1,234 bytes (no question); the timeline closed, and the window's X pressed, with the question
 *   open (no write, the route free, the next Start asks again); and 4 s on an open question are
 *   not in "Time taken". BROKEN ON PURPOSE once: the dialog not answering its open question when
 *   it is closed (grep `open.cancel` in engine/plugins/RenderDialog/index.tsx) -> the script's
 *   "the timeline closed under it ..." line red, the route held for good; restored, green.
 *   What stands behind the looking itself: `npm run test:frame-folder`, the "look: ..." lines.
 *   NOT driven: a real folder on a real disk (how long looking through thousands of frames
 *   takes there); a second question asked while one is open (the dialog cancels the first).
 */
import React from 'react';
import { useAnimationStore } from '../store/animationStore';
import { useEngineStore } from '../store/engineStore';
import { VIDEO_FORMATS } from '../data/constants';
import { FRAME_FOLDER_FORMAT_INDEX, installRenderDialog } from '../engine/plugins/RenderDialog';
import type { RenderDialogConfig, RenderDialogPreset, RenderDialogQuestion, RenderDialogResolutionPreset, RenderDialogRunner, RenderDialogShape } from '../engine/plugins/RenderDialog';
import { lookForFrames, pickFrameFolder, safeFrameName } from '../engine/export/frameFolder';
import type { FrameFolder } from '../engine/export/frameFolder';
import { MainThreadEncoder } from '../engine/export/videoEncoder';
import { forwardToPickedFile } from '../engine/export/pickedFile';
import type { SaveFileHandle, SaveFilePicker } from '../engine/export/pickedFile';
import { calcEtaRange, formatTimeWithUnits } from '../components/timeline/exportHelpers';
import { showToast } from '../engine/store/toastStore';
import { getHost } from './host/current';
import { subscribeTelemetry } from './host/telemetry';
import type { DzView } from './host/DeepZoomHost';
import { formatDepthCompact } from './components/depthFormat';
import { depthNow } from './depthNow';
import { routeKeys, routeRendering, scrubRouteTo, setRouteRendering } from './route';
import { flushHostSync, holdAutoIterations } from './useHostSync';

/** The widths offered. The height follows the shape the dialog's Shape row gives. */
export const DZ_RENDER_WIDTHS = [640, 1280, 1920, 2560, 3840] as const;
/** The draft's size, set by Quality = Draft: the frame's SHORT edge, in pixels (320p). */
export const DZ_PREVIEW_SHORT_EDGE = 320;
/** Where the dialog keeps what and how to render (the engine's render dialog, `storageKey`). */
export const DZ_RENDER_STORAGE_KEY = 'deep-zoom.render-dialog';
const DEFAULT_WIDTH = 1280;
const DEFAULT_SAMPLES = 8;
/** `VIDEO_FORMATS`' H.264 MP4: "Video MP4", the one video format offered. */
const MP4_FORMAT_INDEX = VIDEO_FORMATS.findIndex((f) => f.codec === 'avc');
/** How often the run looks for a cancel and moves the clock and the bar. */
const TICK_MS = 250;
/** How often THE WAIT asks whether the shader is there (and an interrupted run whether it may go on), and what the dialog says meanwhile. */
const WAIT_MS = 100;
const WAITING = { rayMarch: 'Waiting for the ray march\'s shader', mandelbox: 'Waiting for the Mandelbox\'s shader', kalibox: 'Waiting for KaliBox\'s shader' } as const;
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

/** The Width row: the widths offered (under `shapes` only a preset's width counts). */
const WIDTHS: RenderDialogResolutionPreset[] = DZ_RENDER_WIDTHS.map((w) => ({ label: `${w} px`, w, h: 0 }));

/** The Shape row. Window: the picture's own shape, asked each time the dialog draws. */
const SHAPES: RenderDialogShape[] = [
    { label: 'Window', title: 'The shape of the picture on the screen', aspect: pictureAspect },
    { label: '16:9', title: 'Wide, as a video player shows it', aspect: 16 / 9 },
    { label: '1:1', title: 'Square', aspect: 1 },
];

/** What the dialog opens with while it keeps nothing: a Video MP4, 1280 wide, 8 samples; the range is the route's own
 *  span, or the whole timeline when there is no route (once the dialog has been open, the range it was left on, while
 *  that span is the same: the dialog's own memory). */
function defaults(): Partial<RenderDialogConfig> {
    const keys = routeKeys();
    return {
        formatIndex: MP4_FORMAT_INDEX,
        samplesPerFrame: DEFAULT_SAMPLES,
        width: DEFAULT_WIDTH,
        ...(keys.length > 1 ? { startFrame: Math.floor(keys[0].frame), endFrame: Math.ceil(keys[keys.length - 1].frame) } : {}),
    };
}

/** Quality = Draft: 320p at the shape set, and one sample a pixel. Final puts back what it replaced (the dialog does). */
const DRAFT: RenderDialogPreset = {
    label: 'Draft',
    title: '320p and 1 sample: a quick look at the whole route, and at its pacing, before the real render',
    // The width whose height at this shape is 320 (the dialog makes the height: the nearest even number).
    apply: (cfg) => {
        const aspect = cfg.width / cfg.height;
        return { width: aspect >= 1 ? 2 * Math.round(DZ_PREVIEW_SHORT_EDGE * aspect / 2) : DZ_PREVIEW_SHORT_EDGE, samplesPerFrame: 1 };
    },
};

/** The last run of this session: its size, its samples and the seconds a frame took. Null: no frame rendered yet. */
let lastRun: { width: number; height: number; samples: number; each: number } | null = null;
/** Seconds one megapixel-sample cost the LIVE picture, at its last frame that drew a sample. Null: none seen yet. */
let liveUnit: number | null = null;

/** The dialog's "Estimate" row: at the size and samples of this session's last run, the seconds its frames took;
 *  otherwise from the live picture, by pixel and by sample. Nothing before either (see the header, THE ESTIMATE). */
const EstimateRow: React.FC<{ cfg: RenderDialogConfig }> = ({ cfg }) => {
    const measured = lastRun && lastRun.width === cfg.width && lastRun.height === cfg.height && lastRun.samples === cfg.samplesPerFrame ? lastRun.each : null;
    const each = measured ?? (liveUnit === null ? null : liveUnit * megapixelSamples(cfg.width, cfg.height, cfg.samplesPerFrame));
    if (each === null) return null;
    const frames = Math.floor((cfg.endFrame - cfg.startFrame) / Math.max(1, cfg.frameStep)) + 1;
    const seconds = each * frames;
    return (
        <div
            data-dz-render-estimate
            className="flex justify-between"
            title={measured !== null
                ? 'From the frames rendered earlier in this session at this size and these samples. A deeper route takes longer.'
                : 'From the live picture\'s last frame, by pixel and by sample. A rendered frame costs more besides, and a deeper route takes longer.'}
        >
            <span className="text-fg-muted">Estimate</span>
            <span className="font-mono text-fg-secondary">about {formatTimeWithUnits(seconds)}</span>
        </div>
    );
};

/** What the files are named after (see the header, THE FILES): the project's name when somebody gave it one,
 *  otherwise the route's depth span, or the place's depth when there is no route. */
function renderName(): string {
    const state = useEngineStore.getState() as { projectSettings?: { name?: string }; formula?: string };
    const name = state.projectSettings?.name?.trim();
    if (name && name !== 'Untitled' && name !== state.formula) return name;
    const keys = routeKeys();
    return keys.length > 1
        ? `deep zoom ${formatDepthCompact(keys[0].depth)} to ${formatDepthCompact(keys[keys.length - 1].depth)}`
        : `deep zoom ${formatDepthCompact(depthNow())}`;
}

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
    /** The timeline frame the range starts on. */
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
    /** Before the first frame: which of `frames` need no rendering (a folder it goes on from; none for a video), and
     *  the shape every frame must have. A sink that finds something in its way ASKS (`ask`: the dialog's question)
     *  and answers NULL when the user backs out there: then nothing is rendered and nothing written. A rejection
     *  stops the run with its line. */
    begin(run: { frames: number[]; longEdge: number; aspect: number; stop: () => boolean; ask: (question: RenderDialogQuestion) => Promise<string> }): Promise<{ there: boolean[]; aspect: number } | null>;
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

/**
 * One PNG a frame, into a folder the user picks. Null: backed out of the picker. THE PICKER IS ITS FIRST AWAIT.
 * FRAMES OF THIS RENDER ALREADY THERE (the range's frames under this project's file name) are a question before
 * anything is rendered - Overwrite, Continue or Cancel: see the header, FRAMES ALREADY IN THE FOLDER.
 */
async function openFolderSink(project: string, fps: number): Promise<FrameSink | null> {
    const folder = await pickFrameFolder(project);
    if (!folder) return null;
    /** The frames of this render that were in the folder before the run; how many of those it has replaced so far. */
    const old = new Set<number>();
    let overwriting = false, replaced = 0;
    /** The frames in the folder now: this run's, the ones it went on from, and the older ones an overwrite has not reached. */
    const inFolder = ({ written, already }: RunSummary): number => written + already + (overwriting ? old.size - replaced : 0);
    return {
        name: folder.folder,
        closing: null,
        async begin({ frames, longEdge, aspect, stop, ask }) {
            const look = await lookForFrames(folder, frames, stop);
            if (stop()) return null;                                     // cancelled while it looked
            if (look.count === 0) return { there: [], aspect };          // nothing of this render is there: nothing is asked
            const total = frames.length, missing = total - look.count, want = renderSize(longEdge, aspect);
            const one = look.sizes.length === 1 ? look.sizes[0] : null, sized = (s: { width: number; height: number }): string => `${s.width} x ${s.height}`;
            // A run can go on only from frames it can join: all of one size, and that size's long edge this render's
            // (their own shape is then the shape of the rest). Frames that say no size are joined as they are.
            const joinable = look.sizes.length === 0 || (!!one && Math.max(one.width, one.height) === longEdge);
            const canContinue = joinable && missing > 0;
            const lines = [missing === 0
                ? `All ${total} frames of this render are already in "${folder.folder}".`
                : `${look.count} of the ${total} frames of this render are already in "${folder.folder}".`];
            if (!joinable) lines.push(one
                ? `They are ${sized(one)}; this render is ${want.w} x ${want.h}. A render cannot continue frames of another size.`
                : `They are of ${look.sizes.length} sizes (${look.sizes.map(sized).join(', ')}); this render is ${want.w} x ${want.h}. A render cannot continue frames of more than one size.`);
            lines.push(`Overwrite renders all ${total}, replacing each file as its frame is done.`
                + (canContinue ? ` Continue renders the ${missing} that ${missing === 1 ? 'is' : 'are'} missing` + (one && (one.width !== want.w || one.height !== want.h) ? `, at their size (${sized(one)}).` : '.') : ''));
            const answer = await ask({
                lines,
                cancel: 'cancel',
                options: [
                    { id: 'overwrite', label: 'Overwrite', title: `Render all ${total} frames. Each file is replaced as its frame is written; nothing is deleted first` },
                    ...(canContinue ? [{ id: 'continue', label: 'Continue', title: `Render only the ${plural(missing, 'frame')} not in the folder`, primary: true }] : []),
                    { id: 'cancel', label: 'Cancel', title: 'Render nothing and write nothing' },
                ],
            });
            if (stop() || (answer !== 'overwrite' && answer !== 'continue')) return null;
            frames.forEach((frame, i) => { if (look.there[i]) old.add(frame); });
            if (answer === 'continue') return { there: look.there, aspect: one ? one.width / one.height : aspect };
            overwriting = true;
            return { there: [], aspect };
        },
        async put(frame, png) {
            try {
                await folder.write(frame, png);
            } catch (err) {
                // The browser showed the folder picker and will not let the page write into it (see the header).
                if (err instanceof Error && err.name === 'NotAllowedError') {
                    throw new Error(`this browser will not let the page write into "${folder.folder}" (the Claude app's built-in browser is one). Render in Chrome or Edge, or to a video file`);
                }
                throw err;
            }
            if (overwriting && old.has(frame)) replaced++;
        },
        end: async () => '',                                             // every frame is a file already: nothing to close, nothing to throw away
        stopWord: () => 'Cancelled.',
        count: inFolder,
        report(sum) {
            const { written, toRender, already, firstFrame, stopped } = sum;
            let line = `${stopped ? `${written} of ${toRender}` : written} frame${toRender === 1 ? '' : 's'} written to "${folder.folder}".`;
            if (already > 0) line += ` ${already} ${already === 1 ? 'was' : 'were'} already there.`;
            if (overwriting) {
                const left = old.size - replaced;
                line += ` ${replaced} replaced a frame that was there.`;
                if (left > 0) line += ` ${left} from before ${left === 1 ? 'is' : 'are'} still there, not replaced.`;
            }
            return inFolder(sum) > 0
                ? { where: [line], command: { say: 'To make a video of them with ffmpeg, run this in that folder:', line: ffmpegLine(folder, fps, firstFrame) } }
                : { where: [line] };
        },
    };
}

/**
 * One video file (`cfg.formatIndex`: an MP4 or a WebM of `VIDEO_FORMATS`), through the engine's main-thread encoder.
 * Null: backed out of the picker. THE PICKER IS ITS FIRST AWAIT. With a picked file the video is written into it AS THE
 * RUN GOES (see the header, A VIDEO FILE); where the browser has no picker, refuses it, or refuses to let the page write
 * the file picked, the video is made in memory and saved as a download at the end.
 */
async function openVideoSink(project: string, cfg: RenderDialogConfig, isDiskMode: boolean): Promise<FrameSink | null> {
    const format = VIDEO_FORMATS[cfg.formatIndex];
    const suggested = `${safeFrameName(project)}.${format.ext}`;
    let handle: SaveFileHandle | null = null;
    // The encoder gets a stream OF OURS that forwards to the file, not the file's own: it locks the stream it is
    // handed and never lets go, and a discarded run has to abort the file itself (engine/export/pickedFile.ts).
    let disk: ReturnType<typeof forwardToPickedFile> | null = null;
    /** The name picked, when the browser would not let the page write that file (see the header). */
    let refused: string | null = null;
    const pick = isDiskMode ? (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker : undefined;
    if (typeof pick === 'function') {
        try {
            handle = await pick.call(window, {
                id: 'route-video',
                suggestedName: suggested,
                types: [{ description: format.label, accept: { [format.mime]: [`.${format.ext}`] } }],
            });
            disk = forwardToPickedFile(handle, await handle.createWritable());
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return null;
            // The picker refused (SecurityError), or the file picked may not be written (NotAllowedError): in memory, as
            // where there is no picker.
            if (!(err instanceof Error && (err.name === 'SecurityError' || err.name === 'NotAllowedError'))) throw err;
            if (handle && err.name === 'NotAllowedError') refused = handle.name;
            handle = null;
            disk = null;
        }
    }
    if (refused) showToast(`This browser will not let the page write "${refused}": the video is made in memory and saved as a download when it is done`, 'warning', 10000);
    const picked = handle && disk ? { handle, file: disk } : null;
    const name = picked ? picked.handle.name : refused ?? suggested;
    const encoder = new MainThreadEncoder();
    let count = 0, bytes = 0, kept = false;
    const stream = picked ? picked.file.stream : null;
    /** Nothing of this run stays: the half-written file is dropped (what was in a file picked to be replaced stays as
     *  it was), and the empty file the picker made is taken away where the browser can. */
    const throwAway = async (): Promise<void> => {
        encoder.cancel();
        await picked?.file.discard();
    };
    return {
        name,
        closing: 'Writing the video',
        async begin({ longEdge, aspect }) {                              // it asks nothing: a picked file is replaced, and the browser's own picker has asked
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
                } else if (picked) bytes = (await picked.handle.getFile()).size;
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
                ? `${plural(count, 'frame')} in "${name}" (${(bytes / 1e6).toFixed(bytes < 1e7 ? 2 : 1)} MB)${picked ? '' : ', saved as a download'}.`
                : 'No video was written.'],
        }),
    };
}

// THE RUN

const runRouteRender: RenderDialogRunner = async ({ cfg, flags, status, isDiskMode }) => {
    const ready = getHost();
    if (running || routeRendering()) { showToast('A render is already running', 'warning'); return; }
    if (!ready?.renderFrameBlob || !ready.bootParams()) { showToast('The renderer is not ready yet', 'warning'); return; }
    let sink: FrameSink | null;
    try {
        const project = renderName();
        // THE FIRST AWAIT, inside the click: the folder picker, or the file picker.
        sink = cfg.formatIndex === FRAME_FOLDER_FORMAT_INDEX
            ? await openFolderSink(project, cfg.fps)
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
    status.setStatusText(cfg.formatIndex === FRAME_FOLDER_FORMAT_INDEX ? 'Looking in the folder' : 'Starting');

    /** The run was thrown away: a folder's Cancel (its frames stay), a video's Discard (no file stays). */
    const thrown = (): boolean => flags.cancelledRef.current;
    /** No further frame: thrown away, a video's Finish, or the dialog gone. */
    const stop = (): boolean => thrown() || flags.finishEarlyRef.current || dialogClosed;
    let started = performance.now();
    const elapsed = (): number => (performance.now() - started) / 1000;
    /** Frames handed to the sink by this run; frames found already there; frames this run has to make. */
    let written = 0, already = 0, toRender = frames.length;
    /** How far the frame in flight is (0..1), the seconds the written frames took, and their size. */
    let fraction = 0, cost = 0, size = { w: 0, h: 0 };
    let problem = '', touched = false;
    /** The user backed out at the sink's own question (frames already in the folder: Cancel): no run. */
    let backedOut = false;

    const tick = setInterval(() => {
        if (stop()) getHost()?.cancel();                                 // reaches the frame in flight at its next row
        const now = useAnimationStore.getState();
        if (now.isPlaying) now.pause();                                  // somebody pressed Play: not during a render
        status.setElapsedTime(elapsed());
        if (toRender > 0) status.setProgress((written + fraction) / toRender);
    }, TICK_MS);
    const offProgress = ready.on('progress', (p) => { fraction = p?.fraction ?? 0; });

    try {
        const begun = await sink.begin({ frames, longEdge, aspect: cfg.width / cfg.height, stop, ask: status.ask });
        backedOut = !begun;
        started = performance.now();                                     // the clock: not while the folder was looked into, or a question stood open
        const there = begun?.there ?? [], aspect = begun?.aspect ?? 1;
        already = there.filter(Boolean).length;
        toRender = frames.length - already;
        const want = renderSize(longEdge, aspect);

        for (let i = 0; begun && i < frames.length && !stop(); i++) {
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
            size = { w: r.width, h: r.height };
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
        if (written > 0) lastRun = { width: size.w, height: size.h, samples, each: cost / written };
        setRouteRendering(false);
    }

    if (backedOut) {
        // Nothing was rendered and nothing written: the dialog goes back to its form, with no result to show.
        await sink.end(false);
        running = false;
        status.setIsRendering(false);
        return;
    }

    // The sink closes: a video's last bytes and its index, or - thrown away - no file. The route and the picture are
    // the user's again meanwhile; only another render has to wait (`running`).
    const wasThrown = thrown();
    if (sink.closing && !wasThrown && written > 0) status.setStatusText(sink.closing);
    const closeProblem = await sink.end(!wasThrown);
    if (closeProblem && !problem) problem = closeProblem;
    running = false;

    const sum: RunSummary = { written, toRender, already, firstFrame: frames[0], stopped: !!problem || written < toRender };
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
        storageKey: DZ_RENDER_STORAGE_KEY,
        frameFolder: true,
        formatFilter: (_format, index) => index === MP4_FORMAT_INDEX || index === FRAME_FOLDER_FORMAT_INDEX,
        resolutionPresets: WIDTHS,
        shapes: SHAPES,
        draft: DRAFT,
        rangeInSeconds: true,
        defaults,
        showFrameStep: false,
        extraInfoRows: EstimateRow,
        baseSize: { width: 320, height: 540 },                           // tall enough that the estimate shows above Start
        onMount: () => () => { if (running) dialogClosed = true; },
    });
    // A frame of the live picture draws one sample a pixel at the drawn size, until its still has all its samples.
    subscribeTelemetry((t) => {
        if (t.live && !t.exporting && t.fps > 0 && t.frameW > 0 && t.frameH > 0 && t.accumN < t.accumMax) liveUnit = 1 / t.fps / megapixelSamples(t.frameW, t.frameH, 1);
    });
}
