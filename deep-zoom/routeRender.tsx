/**
 * deep-zoom/routeRender.tsx - the route, rendered: one PNG a frame, written into a folder.
 *
 * PURPOSE
 *   The lossless master of a zoom video. Each frame of a range of the timeline is rendered by
 *   itself (`host.renderFrameBlob`: a frame depends on the view and the look and nothing else)
 *   and written at once into a folder the user picks, under its own frame number. So a render
 *   can be cancelled, or lost to a closed tab, and RESUMED: with "Resume" ticked the frames
 *   already in the folder are not rendered again. Video files and a preview are a later stage;
 *   ffmpeg makes the video from the frames, and the dialog prints the line for it.
 *
 * THE SEAM
 *   - `installRouteRender()` once, from main.tsx: the engine's generic render dialog
 *     (`engine/plugins/RenderDialog`) with this file's runner and the opt-ins `frameFolder` and
 *     `fixedSizes`. The dialog opens from the timeline toolbar's Render button and from the Route
 *     tab's (`openRenderPopup()` in engine/animation/renderPopupRegistry.ts).
 *   - ONE FRAME: `scrubRouteTo(frame)` (the playhead, every keyed value, and the camera on the
 *     route whoever held it), `flushHostSync()` (the formula values the sync was holding; with no
 *     route nothing else sends them), the renderer's own iteration rule held off, then
 *     `host.renderFrameBlob`, then the write. NOTHING IS AWAITED between the scrub and the
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
 *   - THE SIZE is a long edge (`DZ_RENDER_LONG_EDGES`) at the picture's own shape AS THE RUN
 *     STARTS, and that shape is handed to every frame: a window resized halfway changes nothing.
 *     A resumed run takes the shape of the frames already in the folder, and refuses to add
 *     frames of another long edge to them.
 *   - THE FILES are `<project name>_<timeline frame, five digits>.png` - the frame's own number,
 *     not a count, so a frame keeps its file whatever range is rendered the next time.
 *   - ITERATIONS are the count the route keys for the frame. With no iteration keys they are the
 *     count in force when the run starts, for every frame: the renderer's rule only ever raises
 *     the count, so with it running a frame's count would depend on the frames before it.
 *
 * PITFALLS
 *   - `pickFrameFolder` is the runner's FIRST await: the browser shows the folder picker only
 *     inside the click that started the render.
 *   - `getHost()` is read again for every frame. A lost WebGL context remounts the renderer: the
 *     run stops with a line, and the frames written stay.
 *   - THE DIALOG IS THE TIMELINE'S CHILD. Closing the timeline in the middle of a run takes the
 *     dialog away, and with it the only Cancel button: the run is cancelled (`dialogClosed`) and
 *     a toast says what is in the folder.
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
 *   sink (`npm run test:frame-folder`), the host members (`npm run check:deep-zoom-module-host`,
 *   the "render: renderFrameBlob ..." and "input: building() ..." lines) and the route's hold
 *   (`npm run check:deep-zoom-route`, the "render: ..." lines).
 */
import React from 'react';
import { useAnimationStore } from '../store/animationStore';
import { useEngineStore } from '../store/engineStore';
import { FRAME_FOLDER_FORMAT_INDEX, installRenderDialog } from '../engine/plugins/RenderDialog';
import type { RenderDialogConfig, RenderDialogResolutionPreset, RenderDialogRunner } from '../engine/plugins/RenderDialog';
import { pickFrameFolder, pngSize } from '../engine/export/frameFolder';
import type { FrameFolder } from '../engine/export/frameFolder';
import { calcEtaRange, formatTimeWithUnits } from '../components/timeline/exportHelpers';
import { showToast } from '../engine/store/toastStore';
import { getHost } from './host/current';
import type { DzView } from './host/DeepZoomHost';
import { routeKeys, routeRendering, scrubRouteTo, setRouteRendering } from './route';
import { flushHostSync, holdAutoIterations } from './useHostSync';

/** The sizes offered: the frame's long edge in pixels. The other edge follows the picture's shape. */
export const DZ_RENDER_LONG_EDGES = [1280, 1920, 2560, 3840] as const;
const DEFAULT_LONG_EDGE = 1920;
const DEFAULT_SAMPLES = 8;
/** How often the run looks for a cancel and moves the clock and the bar. */
const TICK_MS = 250;
/** How often THE WAIT asks whether the shader is there, and what the dialog says meanwhile. */
const WAIT_MS = 100;
const WAITING = { rayMarch: 'Waiting for the ray march\'s shader', mandelbox: 'Waiting for the Mandelbox\'s shader' } as const;

const say = (err: unknown): string => (err instanceof Error ? err.message : String(err));
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

/** The dialog went away while a run was in flight (see PITFALLS): the run is cancelled. */
let dialogClosed = false;

const sameCamera = (a: DzView, b: DzView): boolean =>
    a.cam.every((c, i) => c === b.cam[i]) && a.yaw === b.yaw && a.pitch === b.pitch && (a.roll ?? 0) === (b.roll ?? 0);

/** The ffmpeg line that makes a video of the frames (run in their folder). ffmpeg looks for the
 *  first file among numbers 0 to 4 only, so a sequence that starts later says where. */
const ffmpegLine = (folder: FrameFolder, fps: number, first: number): string =>
    `ffmpeg -framerate ${fps} ${first > 0 ? `-start_number ${first} ` : ''}-i ${folder.name}_%05d.png -c:v libx264 -pix_fmt yuv420p -crf 16 ${folder.name}.mp4`;

const runRouteRender: RenderDialogRunner = async ({ cfg, flags, status, resume }) => {
    const ready = getHost();
    if (routeRendering()) { showToast('A render is already running', 'warning'); return; }
    if (!ready?.renderFrameBlob || !ready.bootParams()) { showToast('The renderer is not ready yet', 'warning'); return; }
    let folder: FrameFolder | null;
    try {
        const project = (useEngineStore.getState() as { projectSettings?: { name?: string } }).projectSettings?.name;
        folder = await pickFrameFolder(project || 'deep-zoom');          // the FIRST await: inside the click
    } catch (err) {
        showToast(say(err), 'error', 6000);
        return;
    }
    if (!folder) return;                                                 // backed out of the picker

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
    status.setProgress(0);
    status.setElapsedTime(0);
    status.setEtaRange({ min: 0, max: 0 });
    status.setLastFrameTime(0);
    status.setStatusText(resume ? 'Looking in the folder' : 'Starting');

    const cancelled = (): boolean => flags.cancelledRef.current || dialogClosed;
    const started = performance.now();
    const elapsed = (): number => (performance.now() - started) / 1000;
    /** Frames written by this run; frames found in the folder; frames this run has to make. */
    let written = 0, already = 0, toRender = frames.length;
    /** How far the frame in flight is (0..1), the seconds the written frames took, and their megapixel-samples. */
    let fraction = 0, cost = 0, units = 0;
    let problem = '', touched = false;

    const tick = setInterval(() => {
        if (cancelled()) getHost()?.cancel();                            // reaches the frame in flight at its next row
        const now = useAnimationStore.getState();
        if (now.isPlaying) now.pause();                                  // somebody pressed Play: not during a render
        status.setElapsedTime(elapsed());
        if (toRender > 0) status.setProgress((written + fraction) / toRender);
    }, TICK_MS);
    const offProgress = ready.on('progress', (p) => { fraction = p?.fraction ?? 0; });

    try {
        let aspect = pictureAspect();
        const there: boolean[] = [];
        if (resume) for (const frame of frames) { if (cancelled()) break; there.push(await folder.has(frame)); }
        const firstThere = there.indexOf(true);
        if (firstThere >= 0) {
            // The frames already there say what shape the rest must have.
            const file = await folder.read(frames[firstThere]), size = file ? await pngSize(file) : null;
            if (size && Math.max(size.width, size.height) !== longEdge) {
                throw new Error(`The frames in that folder are ${size.width} x ${size.height}. Pick that size, or another folder`);
            }
            if (size) aspect = size.width / size.height;
        }
        already = there.filter(Boolean).length;
        toRender = frames.length - already;
        const want = renderSize(longEdge, aspect);

        for (let i = 0; i < frames.length && !cancelled(); i++) {
            if (there[i]) continue;
            const frame = frames[i];
            let host = getHost();
            // The frame is set up, then THE WAIT (see the header): with the frame's own values in force, is a shader
            // the picture needs still building? After a wait the frame is set up again, so that nothing is awaited
            // between the last set-up and the render's own start, and nothing can move the view in between.
            while (host?.renderFrameBlob && !cancelled()) {
                touched = true;
                scrubRouteTo(frame);
                flushHostSync();
                holdAutoIterations(true);
                let what = host.building();
                if (!what) break;
                while (what && !cancelled()) {
                    status.setStatusText(WAITING[what]);
                    await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
                    host = getHost();
                    what = host?.building() ?? null;
                }
            }
            if (cancelled()) break;
            if (!host?.renderFrameBlob) { problem = 'The renderer was restarted'; break; }
            status.setStatusText(`Frame ${frame} (${written + 1} of ${toRender})`);
            const t0 = performance.now();
            fraction = 0;
            const r = await host.renderFrameBlob({ longEdge, samples, aspect });
            if (!r.ok) { if (r.reason !== 'cancelled') problem = r.message ?? `The renderer answered "${r.reason}"`; break; }
            if (r.width !== want.w || r.height !== want.h) { problem = `A frame came out ${r.width} x ${r.height}, not ${want.w} x ${want.h}`; break; }
            await folder.write(frame, r.data);
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

    const inFolder = written + already, stopped = !!problem || written < toRender;
    const lines: string[] = [];
    if (problem) lines.push(`Stopped: ${problem}.`);
    else if (stopped) lines.push('Cancelled.');
    if (toRender === 0) lines.push(`All ${frames.length} frames are already in "${folder.folder}".`);
    else {
        lines.push(`${stopped ? `${written} of ${toRender}` : written} frame${toRender === 1 ? '' : 's'} written to "${folder.folder}".`
            + (already > 0 ? ` ${already} ${already === 1 ? 'was' : 'were'} already there.` : ''));
    }
    if (written > 0) lines.push(`Time taken ${formatTimeWithUnits(elapsed())}, ${(cost / written).toFixed(1)} s a frame.`);
    if (inFolder > 0) lines.push('To make a video of them with ffmpeg, run this in that folder:');
    status.setResult({ lines, command: inFolder > 0 ? ffmpegLine(folder, cfg.fps, frames[0]) : undefined });
    status.setIsRendering(false);
    if (dialogClosed) showToast(`Render stopped: its window was closed. ${inFolder} frame${inFolder === 1 ? ' is' : 's are'} in "${folder.folder}"`, 'warning', 8000);
};

let installed = false;

/** Call once, from main.tsx, after `installRoute()`. */
export function installRouteRender(): void {
    if (installed) return;
    installed = true;
    installRenderDialog({
        runner: runRouteRender,
        title: 'Render',
        frameFolder: true,
        fixedSizes: true,
        formatFilter: (_format, index) => index === FRAME_FOLDER_FORMAT_INDEX,   // frames only, until video files come
        resolutionPresets: sizes,
        defaults,
        showBitrate: false,
        showFrameStep: false,
        extraInfoRows: EstimateRow,
        onMount: () => () => { if (routeRendering()) dialogClosed = true; },
    });
}
