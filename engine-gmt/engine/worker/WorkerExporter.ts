/**
 * WorkerExporter — Handles video export rendering + encoding inside the Web Worker.
 *
 * Uses VideoEncoder + Mediabunny for encoding/muxing.
 * Accumulation is done via ping-pong render targets.
 *
 * HOW A SESSION ENDS. One session at a time: `start()` refuses while one is
 * set ('Export already in progress'), so every exit has to clear it.
 *   - `finish()`  the file is complete: EXPORT_COMPLETE.
 *   - `cancel()`  the main thread asked (EXPORT_CANCEL): no file, and the
 *                 picked file's stream is aborted.
 *   - `fail()`    the session cannot go on (an encoder, muxer or file-write
 *                 error, a frame that threw): a cancel, then ONE EXPORT_ERROR.
 * A frame or finish request that finds no session gets no answer
 * (`renderWorker.ts`). The main thread does not send one after an error it
 * has seen; an error that reached it while nothing was waiting is kept there
 * and settles its next request (`_exportFailure`, WorkerProxy).
 *
 * THE FILE (a video; 2026-10-11)
 *   - INTO A PICKED FILE (`start` is handed a stream) an MP4 is written AS THE
 *     RUN GOES: `fastStart: false`, so the frames leave in chunks of 16 MiB and
 *     the index (`moov`) is written last. Until that day the muxer was told
 *     `fastStart: 'in-memory'` for a stream too and held the whole MP4 until
 *     the last frame, while the dialog's badge said DISK. WebM was always
 *     written as it goes.
 *   - IN MEMORY (no stream: a download at the end) nothing changed: the index
 *     at the front.
 *   - A KEYFRAME A SECOND in both, and in WebM (`keyFrameEvery`). Asked for
 *     frame 0 alone, as it was, Chrome made ONE keyframe for the whole video:
 *     a file an editor cannot scrub.
 *   - NOTHING ELSE OF WHAT THIS FILE DOES BY HAND WAS TOUCHED, and each piece
 *     is still needed: the timestamps rebuilt from the first chunk's offset
 *     and the duration fixed at `1/fps` (`handleEncodedChunk`), the codec
 *     description copied per chunk, the audio encoded in one go at the first
 *     video frame with its own first-chunk offset (`encodeAudioPcm`,
 *     `handleEncodedAudioChunk`), the forwarding stream and its abort
 *     (`start`, `cancel`).
 *   - THE STREAM MUST TAKE A WRITE AT A POSITION: at the end the muxer comes
 *     back to the front of the file for the size of the media data. The picked
 *     file's stream does, through the proxy WorkerProxy.startExport puts in
 *     front of it (a chunk is `{ type: 'write', position, data }` all the way).
 *
 * @assumption THE FILE above was measured in app-gmt's own dialog on
 *   2026-10-11, Chrome on the real GPU (d3d11, RTX 5070 Ti), the picker stood
 *   in for by a real File System Access file that records every write
 *   (debug/scratch/gmt-export/gmt-video.mts, git-ignored):
 *     - each of the four formats into a picked file and in memory, 75 frames at
 *       1280 x 720: read back (mediabunny's input side) with the right codec,
 *       size, frame count and rate, 3 keyframes at 0, 1 and 2 s, the index
 *       after the media data in a picked file and before it in memory, and
 *       played to its end by a <video>;
 *     - H.264 at 1920 x 1080, 300 frames, 51.3 MiB: 48 MiB reach the file
 *       before the last frame is asked for (16 MiB after frames 109, 200 and
 *       290, a frame either way from run to run), then the size of the media
 *       data at byte 28 and the last 3.3 MiB with the index;
 *     - the same with a 12 s tone on the audio deck: 48 of 51.5 MiB before the
 *       last frame, AAC stereo at 48 kHz, 10.005 s of sound beside 10.000 s of
 *       video, both from 0, and a <video> decodes both;
 *     - Interrupt then Finish: a file of the 13 frames made, which plays;
 *       Discard: the stream aborted, an empty file left under a new name
 *       (this worker has no handle to remove it with), a file picked to be
 *       replaced keeps its bytes. (Since 2026-10-12 the RUNNER, which has the
 *       handle, removes that empty file once this worker has aborted the
 *       stream: `handOverPickedFile` in engine/export/pickedFile.ts.)
 *   BROKEN ON PURPOSE twice: `fastStart: 'in-memory'` for a stream again ->
 *   all four writes of the 51 MiB file after its last frame, the index at the
 *   front; a keyframe for frame 0 alone -> one keyframe in each of the four
 *   formats.
 *   NO STANDING GUARD for the layout or the keyframes: `npm run
 *   smoke:export-watchdog` runs on a Chromium with no H.264 encoder and
 *   renders into memory only. NOT measured: a real disk, Firefox, a file
 *   beyond 4 GiB (the muxer reserves the large size for it), a strict player
 *   - the owner opens the files in Windows Media Player
 *   (debug/scratch/strict-player-test/after-streaming/).
 *
 * @invariant An EXPORT_ERROR about a session ends that session: the worker is
 *   free for the next EXPORT_START — proven by: npm run smoke:export-watchdog
 *   ("C2 the export after a failed one starts"). Falsified 2026-10-11 by
 *   posting the error without the cancel in `fail()`: C2 answered 'Export
 *   already in progress', which is what production did until that day (any
 *   encoder error left the worker refusing exports until a reload).
 */

import * as THREE from 'three';
import { exportFrameFileTag, exportFrameFiles, exportFrameSampleBase } from './exportFrameNaming';
import type { FractalEngine } from '../FractalEngine';
import type { VideoExportConfig, ExportPass } from '../../../engine/codec/VideoExportTypes';
import type { EngineRenderState } from '../FractalEngine';
import { VIDEO_CONFIG, VIDEO_FORMATS, isSurfaceHit } from '../../../data/constants';
import * as Mediabunny from 'mediabunny';
import { codecString } from '../../../engine/export/videoEncoder';
import { halton } from '../../../engine/codec/halton';
import { BloomPass } from '../BloomPass';
import { createFullscreenPass } from '../utils/FullscreenQuad';

/**
 * Target spacing, in milliseconds of GPU time, between the EXPORT_HEARTBEAT
 * posts made inside one export frame (see `renderOnePass`). Each beat costs one
 * pipeline drain, so this trades drains against how quickly the main thread
 * learns a frame is still alive. The proxy's stall window
 * (`EXPORT_FRAME_STALL_MS`, 60 s) is many multiples of this, so the schedule
 * only has to be roughly right: at 1 s the drain overhead is ~0.1 % on the
 * frames where a watchdog matters (≥ 50 ms per sample) and the schedule
 * self-tunes to ~1 drain per second on cheap ones.
 */
export const EXPORT_HEARTBEAT_MS = 1000;

// ─── Export Session State ────────────────────────────────────────────

interface ExportSession {
    config: VideoExportConfig;
    formatDef: (typeof VIDEO_FORMATS)[number];
    /** True when the format is an image sequence (PNG / JPG / future EXR). In that mode the
     *  video-encoder + mediabunny fields are unused and `dirHandle` drives per-frame file writes. */
    isImageMode: boolean;

    // ─── Video-mode fields (unused when isImageMode === true) ───
    output?: Mediabunny.Output;
    packetSource?: Mediabunny.EncodedVideoPacketSource;
    encoder?: VideoEncoder;
    muxerChain?: Promise<void>;
    /** Disk mode: the writer of the stream `start` was handed (the picked file). The session
     *  keeps it so that an exit without a finished file can abort the file — see `start()`. */
    fileWriter?: WritableStreamDefaultWriter;

    // ─── Audio (video mode only — null when no clips on the timeline) ───
    audioPacketSource?: Mediabunny.EncodedAudioPacketSource;
    audioEncoder?: AudioEncoder;
    /** PCM payload pending encode. Encoded once (chunked) right after the first
     *  video frame triggers `output.start()`. */
    audioPcm?: Float32Array;
    audioSampleRate?: number;
    audioNumFrames?: number;
    /** Raised when audio encoding has flushed, so finish() can await it. */
    audioFlushed?: Promise<void>;
    audioCodec?: 'mp4a.40.2' | 'opus';
    /** Audio analogue of `firstChunkOffsetMicros` — same encoder-priming /
     *  Firefox-leading-latency normalization applied to the first audio chunk
     *  so the muxed audio track starts at PTS 0 alongside video PTS 0. */
    audioFirstChunkOffsetMicros?: number | null;

    // ─── Image-mode fields (unused when isImageMode === false) ───
    dirHandle?: FileSystemDirectoryHandle;
    /** Promise chain that serializes per-frame file writes so cancel/finish can await them. */
    imageWriteChain?: Promise<void>;

    safeWidth: number;
    safeHeight: number;
    renderWidth: number;
    renderHeight: number;
    totalFrames: number;

    // Accumulation targets (ping-pong)
    accumA: THREE.WebGLRenderTarget;
    accumB: THREE.WebGLRenderTarget;
    exportTarget: THREE.WebGLRenderTarget;
    pixelBuffer: Uint8Array;
    /** Preallocated 4-float scratch for the center-pixel depth readback (focus-lock probe). */
    depthBuf: Float32Array;

    // Post-processing
    ppScene: THREE.Scene;
    ppCamera: THREE.OrthographicCamera;

    // State
    internalFrameCounter: number;
    /** Timestamp (µs) of the first encoded chunk. Subtracted from all subsequent chunk
     *  timestamps to undo Firefox's leading-latency offset (Chrome reports 0 anyway). */
    firstChunkOffsetMicros: number | null;
    /** Video mode: every this many frames one is forced to be a keyframe — the frames of one
     *  second at the rate the file plays at (`config.fps`), never less than 1. */
    keyFrameEvery: number;
}

export type ExportPostFn = (msg: any, transfer?: Transferable[]) => void;

export class WorkerExporter {
    private session: ExportSession | null = null;
    private engine: FractalEngine;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private postMsg: ExportPostFn;
    private bloomPass: BloomPass;

    // Saved state for restoration
    private savedResolution = { w: 0, h: 0 };

    constructor(
        engine: FractalEngine,
        renderer: THREE.WebGLRenderer,
        camera: THREE.PerspectiveCamera,
        postMsg: ExportPostFn
    ) {
        this.engine = engine;
        this.renderer = renderer;
        this.camera = camera;
        this.postMsg = postMsg;
        this.bloomPass = new BloomPass();
    }

    get active() {
        return !!this.session;
    }

    // ─── Start Export ────────────────────────────────────────────────

    start(
        config: VideoExportConfig,
        stream: WritableStream | null,
        dirHandle?: FileSystemDirectoryHandle,
        audio?: { pcm: Float32Array; sampleRate: number; numFrames: number; durationSec: number }
    ) {
        if (this.session) {
            this.postMsg({ type: 'EXPORT_ERROR', message: 'Export already in progress' });
            return;
        }

        const formatDef = VIDEO_FORMATS[config.formatIndex] || VIDEO_FORMATS[0];
        const isImageMode = formatDef.imageSequence;

        if (isImageMode && !dirHandle) {
            this.postMsg({ type: 'EXPORT_ERROR', message: 'Image-sequence export requires a directory handle' });
            return;
        }

        // 2-pixel alignment is enough for AVC/HEVC/VP9/AV1 (chroma subsampling). Image formats
        // don't care about macroblock alignment, but we keep the same rule for consistency with
        // readback buffers and to keep `safeWidth*safeHeight*4 == pixelBuffer.byteLength`.
        const align = 2;
        const safeWidth = Math.floor(config.width / align) * align;
        const safeHeight = Math.floor(config.height / align) * align;
        const scale = config.internalScale || 1.0;
        const renderW = Math.floor(safeWidth * scale);
        const renderH = Math.floor(safeHeight * scale);

        // Save current resolution for restoration
        this.savedResolution = {
            w: this.engine.mainUniforms.uResolution.value.x,
            h: this.engine.mainUniforms.uResolution.value.y
        };

        const rtOpts = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            stencilBuffer: false,
            depthBuffer: false,
            generateMipmaps: false,
            format: THREE.RGBAFormat,
            type: THREE.FloatType
        };

        const accumA = new THREE.WebGLRenderTarget(renderW, renderH, rtOpts);
        const accumB = new THREE.WebGLRenderTarget(renderW, renderH, rtOpts);
        const exportTarget = new THREE.WebGLRenderTarget(safeWidth, safeHeight, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            stencilBuffer: false,
            depthBuffer: false
        });
        const pixelBuffer = new Uint8Array(safeWidth * safeHeight * 4);

        this.bloomPass.resize(renderW, renderH);

        const pp = createFullscreenPass(this.engine.materials.exportMaterial);
        const ppScene = pp.scene;
        const ppCamera = pp.camera;

        const step = Math.max(1, Math.floor(config.frameStep));
        const startF = Math.max(0, config.startFrame);
        const endF = Math.max(startF, config.endFrame);
        const totalFrames = Math.floor((endF - startF) / step) + 1;

        const session: ExportSession = {
            config,
            formatDef,
            isImageMode,
            dirHandle: isImageMode ? dirHandle : undefined,
            imageWriteChain: isImageMode ? Promise.resolve() : undefined,
            muxerChain: isImageMode ? undefined : Promise.resolve(),
            safeWidth,
            safeHeight,
            renderWidth: renderW,
            renderHeight: renderH,
            totalFrames,
            accumA,
            accumB,
            exportTarget,
            pixelBuffer,
            depthBuf: new Float32Array(4),
            ppScene,
            ppCamera,
            internalFrameCounter: 0,
            firstChunkOffsetMicros: null,
            keyFrameEvery: Math.max(1, Math.round(config.fps))
        };

        if (!isImageMode) {
            // ─── Video path: spin up mediabunny output + WebCodecs VideoEncoder ───
            let target: Mediabunny.Target;
            if (stream) {
                // The muxer gets a stream of our own that forwards to the file, and the session
                // keeps the file's writer. Handed the file's stream itself, mediabunny locks it on
                // the first packet and its own cancel CLOSES it (a cut-off file under the picked
                // name), so a session that ends without a finished file could not abort it.
                const fileWriter = stream.getWriter();
                session.fileWriter = fileWriter;
                const forward = new WritableStream({
                    write: (chunk) => fileWriter.write(chunk),
                    close: () => fileWriter.close(),
                });
                target = new Mediabunny.StreamTarget(forward, { chunked: true });
            } else {
                target = new Mediabunny.BufferTarget();
            }

            // THE MP4'S LAYOUT (see THE FILE in the header). Into a picked file the frames go to
            // the stream as they are encoded and the index (`moov`) is written last, so only the
            // open 16 MiB chunk is held. In memory nothing changed: the index at the front.
            // The ORDER of the media data is the same in both - mediabunny lays the chunks of
            // both tracks down in the order they were finished (grep `finalizedChunks` in its
            // isobmff-muxer) - so the audio, which is encoded in one go at the first video
            // frame, sits ahead of the video in the file exactly as it did before.
            const format: Mediabunny.OutputFormat = formatDef.container === 'webm'
                ? new Mediabunny.WebMOutputFormat()
                : new Mediabunny.Mp4OutputFormat({ fastStart: stream ? false : 'in-memory' });

            session.output = new Mediabunny.Output({ format, target });
            session.packetSource = new Mediabunny.EncodedVideoPacketSource(formatDef.codec as Mediabunny.VideoCodec);

            session.encoder = new VideoEncoder({
                output: (chunk, meta) => this.handleEncodedChunk(chunk, meta),
                error: (e) => {
                    console.error('[WorkerExporter] Encoder error:', e);
                    this.fail(session, e.message);
                }
            });

            const encoderConfig: VideoEncoderConfig = {
                // One mapping for both encoders (this one and the main-thread one fluid-toy uses).
                // `formatDef.codec` as it stands ('hevc', 'av1', 'vp9') is not a codec string:
                // until 2026-10-11 Chrome refused all three here with "Unsupported codec type"
                // and H.265, AV1 and WebM exports made no file.
                // @invariant A WebM export from this worker makes a file — proven by: npm run
                //   smoke:export-watchdog ("C3 and comes back as a WebM"). Falsified 2026-10-11
                //   by handing over the bare name again: C3 got "Unsupported codec type".
                // @assumption The H.264, H.265 and AV1 strings work too. Measured 2026-10-11 in
                //   real Chrome (d3d11, RTX 5070 Ti), six frames each at 1280x720, RAM and disk:
                //   four readable files. No standing guard: the smoke's Chromium has no H.264
                //   or H.265 encoder.
                codec: codecString(formatDef.codec, safeWidth, safeHeight),
                width: safeWidth,
                height: safeHeight,
                // The slider value is a "visible bitrate" target; we scale it up by 2.5× when
                // handing it to the encoder because CBR rate-control tends to undershoot the
                // configured target on our content (smooth gradients, low motion — encoders
                // read it as "easy"). The multiplier keeps player-reported bitrate close to
                // what the user set. On Firefox it's moot — the OpenH264 Level-4.0 cap at
                // ~31 Mbps bites first (see `isFirefoxH264BitrateCapped` in RenderPopup).
                bitrate: config.bitrate * VIDEO_CONFIG.BITRATE_MULTIPLIER * 2.5,
                framerate: config.fps,
                // 'quality' enables B-frames and aggressive motion estimation — meaningfully better
                // compression than 'realtime'. We can use it because we don't trust the encoder's
                // chunk timestamps anyway (see `handleEncodedChunk` for the offset-normalization that
                // makes this safe across Chrome and Firefox, with or without B-frame reordering).
                latencyMode: 'quality',
                // 'constant' rate control. Firefox's default 'variable' under-runs the target for
                // fractal renders (large smooth regions look "easy"), producing visibly lower bitrate
                // than Chrome at the same setting.
                bitrateMode: 'constant',
                avc: { format: formatDef.container === 'mp4' ? 'annexb' : 'avc' }
            };
            session.encoder.configure(encoderConfig);

            // ─── Audio encoder (only when timeline has audio clips) ───
            if (audio && audio.pcm.length > 0) {
                const audioCodec: 'mp4a.40.2' | 'opus' = formatDef.container === 'webm' ? 'opus' : 'mp4a.40.2';
                session.audioCodec = audioCodec;
                session.audioPcm = audio.pcm;
                session.audioSampleRate = audio.sampleRate;
                session.audioNumFrames = audio.numFrames;
                session.audioPacketSource = new Mediabunny.EncodedAudioPacketSource(
                    audioCodec === 'opus' ? 'opus' : 'aac'
                );
                session.audioFirstChunkOffsetMicros = null;

                session.audioEncoder = new AudioEncoder({
                    output: (chunk, meta) => this.handleEncodedAudioChunk(chunk, meta),
                    error: (e) => {
                        console.error('[WorkerExporter] Audio encoder error:', e);
                        this.fail(session, e.message);
                    }
                });
                session.audioEncoder.configure({
                    codec: audioCodec,
                    sampleRate: audio.sampleRate,
                    numberOfChannels: 2,
                    bitrate: 192_000,
                });
            }
        }

        this.session = session;

        // Multi-pass export: `uOutputPass` lives in `mainUniforms` so the main shader, the
        // display (preview) material, and the export material all read the same value.
        // Setting it here switches all three in lockstep — that's what makes the viewport
        // preview follow the pass being rendered. The uniform is reset in cleanup().
        // Video mode uses `config.pass` (one pass per session); image mode loops over
        // `config.passes` per frame and sets the uniform inside `renderFrame`.
        if (!isImageMode) {
            const passCode = config.pass === 'alpha' ? 1.0 : config.pass === 'depth' ? 2.0 : 0.0;
            this.engine.mainUniforms.uOutputPass.value = passCode;
        }
        this.engine.mainUniforms.uDepthMin.value = config.depthMin ?? 0.0;
        this.engine.mainUniforms.uDepthMax.value = config.depthMax ?? 5.0;

        // Mark engine as exporting (prevents normal compute() from running)
        this.engine.state.isExporting = true;

        this.postMsg({ type: 'EXPORT_READY' });
    }

    // ─── Render One Export Frame ─────────────────────────────────────

    renderFrame(
        frameIndex: number,
        time: number,
        cameraData: { position: [number, number, number]; quaternion: [number, number, number, number]; fov: number; aspect: number },
        offset: { x: number; y: number; z: number; xL: number; yL: number; zL: number },
        renderState: Partial<EngineRenderState>,
        modulations: Record<string, number>
    ) {
        if (!this.session) return;
        const sess = this.session;

        try {
            // Per-frame state is set ONCE regardless of how many passes we render. The inner pass
            // loop (image mode) just flips `uOutputPass` between passes — the camera, offset, and
            // scene uniforms don't change across passes.
            this.applyFrameState(cameraData, offset, renderState, modulations, time);

            if (sess.isImageMode) {
                this.renderFrameImageSequence(sess, frameIndex);
            } else {
                this.renderFrameVideo(sess, frameIndex);
            }
        } catch (e) {
            this.fail(sess, `Frame render failed: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Apply per-frame engine state (camera, offset, uniforms, modulations) — shared setup
     * between video and image-sequence render paths.
     */
    private applyFrameState(
        cameraData: { position: [number, number, number]; quaternion: [number, number, number, number]; fov: number; aspect: number },
        offset: { x: number; y: number; z: number; xL: number; yL: number; zL: number },
        renderState: Partial<EngineRenderState>,
        modulations: Record<string, number>,
        time: number
    ) {
        if (!this.session) return;
        const sess = this.session;

        this.engine.setRenderState(renderState);
        this.engine.modulations = modulations;

        this.camera.position.set(cameraData.position[0], cameraData.position[1], cameraData.position[2]);
        this.camera.quaternion.set(cameraData.quaternion[0], cameraData.quaternion[1], cameraData.quaternion[2], cameraData.quaternion[3]);
        this.camera.fov = cameraData.fov;
        this.camera.aspect = sess.safeWidth / sess.safeHeight;
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();

        this.engine.virtualSpace.state = offset;

        this.engine.mainUniforms.uResolution.value.set(sess.renderWidth, sess.renderHeight);
        this.engine.mainUniforms.uInternalScale.value = sess.config.internalScale || 1.0;
        this.engine.setUniform('uTime', time);
        this.engine.pipeline.resize(sess.renderWidth, sess.renderHeight);

        this.engine.syncFrame(this.camera, { clock: { elapsedTime: time } });
    }

    /**
     * Run `config.samples` accumulation samples for the current pass and post-process the
     * result into `sess.exportTarget`. Reads the flipped 8-bit RGBA pixels into `sess.pixelBuffer`
     * and returns the accumulation target that holds the HDR result (for preview blit + focus-lock).
     *
     * @assumption `config.samples >= 1` required. Clears `accumA` then
     *   writes to it at s=0. Bloom is applied on BEAUTY only — alpha
     *   and depth passes write greyscale luminance to the alpha channel
     *   and bloom would smear it.
     * @assumption Pixel-buffer Y-flip is IN PLACE. For odd height,
     *   `halfH = floor(h/2)` correctly leaves the middle row untouched
     *   (it is its own mirror). Do not change to `ceil`.
     *
     * Heartbeat. This loop is synchronous and posts nothing on its own, so a
     * frame that takes minutes looked identical to a frame that was dropped —
     * the main thread's `renderExportFrame` had nothing to time out against
     * without aborting real work. The loop now posts EXPORT_HEARTBEAT on a
     * sample schedule: always once after sample 0 (which measures the cost of
     * one sample), then every ~EXPORT_HEARTBEAT_MS of measured GPU time.
     * @invariant Every frame with `samples >= 2` posts at least one
     *   EXPORT_HEARTBEAT before its EXPORT_FRAME_DONE — proven by: npm run
     *   smoke:export-watchdog ("B: live worker posted ≥1
     *   EXPORT_HEARTBEAT"). Falsified 2026-09-02 by removing the postMsg: B
     *   reported 0 beats.
     * @assumption The 1-px `readRenderTargetPixels` before each beat drains
     *   the GPU queue on real drivers (ANGLE/D3D11, Metal), so a beat means
     *   `sample` samples are genuinely complete rather than merely queued.
     *   Without that drain the loop could enqueue every draw in milliseconds,
     *   beat once, and then go silent through the end-of-frame readback for
     *   as long as the GPU takes — exactly the false trip the watchdog exists
     *   to avoid. readPixels is a full sync by spec and the focus probe relies
     *   on the same call, but the queue-depth behaviour has not been measured
     *   on a real GPU; the smoke runs on SwiftShader, which has no meaningful
     *   asynchronous queue.
     */
    private renderOnePass(sess: ExportSession, frameIndex: number, passIndex = 0, passCount = 1): THREE.WebGLRenderTarget {
        // Clear accumulation ping-pong
        this.renderer.setRenderTarget(sess.accumA);
        this.renderer.clear();
        this.renderer.setRenderTarget(sess.accumB);
        this.renderer.clear();

        const N = sess.config.samples;
        // THE GRAIN IS THE FRAME'S OWN (exportFrameNaming.ts, THE GRAIN OF ONE FRAME): the sample
        // count that seeds the shader starts from where an unbroken run had got to at this frame
        // and pass, whatever this session made before it. Counted on through the session, as it
        // was until 2026-10-12, a continued render had another grain from its first frame on.
        sess.internalFrameCounter = exportFrameSampleBase(frameIndex, passIndex, passCount, N);
        // Heartbeat schedule — see the JSDoc above and EXPORT_HEARTBEAT_MS.
        let nextBeatAfter = 1;   // beat once sample 0 is done: that measures a sample's cost
        let beatIssuedAt = performance.now();
        let beatSample = 0;
        for (let s = 0; s < N; s++) {
            const writeBuffer = s % 2 === 0 ? sess.accumA : sess.accumB;
            const readBuffer = s % 2 === 0 ? sess.accumB : sess.accumA;

            const blend = 1.0 / (s + 1);
            this.engine.mainUniforms.uBlendFactor.value = blend;
            this.engine.mainUniforms.uHistoryTexture.value = readBuffer.texture;

            sess.internalFrameCounter++;
            this.engine.mainUniforms.uFrameCount.value = sess.internalFrameCounter;

            // TAA jitter — full Halton sequence (not wrapped at 16)
            if (s > 0) {
                const jX = halton(s, 2);
                const jY = halton(s, 3);
                this.engine.mainUniforms.uJitter.value.set(jX * 2.0 - 1.0, jY * 2.0 - 1.0);
            } else {
                this.engine.mainUniforms.uJitter.value.set(0, 0);
            }

            this.renderer.setRenderTarget(writeBuffer);
            this.renderer.render(this.engine.mainScene, this.engine.mainCamera);

            const done = s + 1;
            if (done === nextBeatAfter && done < N) {
                // Drain so `done` samples are really finished (see @assumption above),
                // then measure and schedule the next beat ~EXPORT_HEARTBEAT_MS out.
                // No beat after the last sample: the full readback + FRAME_DONE follow.
                this.renderer.readRenderTargetPixels(writeBuffer, 0, 0, 1, 1, sess.depthBuf);
                const now = performance.now();
                const perSample = Math.max(0.05, (now - beatIssuedAt) / (done - beatSample));
                nextBeatAfter = done + Math.max(1, Math.floor(EXPORT_HEARTBEAT_MS / perSample));
                beatIssuedAt = now;
                beatSample = done;
                this.postMsg({ type: 'EXPORT_HEARTBEAT', frameIndex, sample: done, samples: N });
            }
        }

        const lastWrite = (N - 1) % 2 === 0 ? sess.accumA : sess.accumB;

        // Bloom (beauty only — alpha/depth passes write greyscale luminance that bloom would
        // smear, changing the "meaning" of the value; skip it for correctness).
        const isBeauty = this.engine.mainUniforms.uOutputPass.value < 0.5;
        const bloomIntensity = this.engine.mainUniforms.uBloomIntensity?.value ?? 0;
        if (isBeauty && bloomIntensity > 0.001) {
            const threshold = this.engine.mainUniforms.uBloomThreshold?.value ?? 0.5;
            const radius = this.engine.mainUniforms.uBloomRadius?.value ?? 1.5;
            this.bloomPass.render(lastWrite.texture, this.renderer, threshold, radius);
            this.engine.materials.exportMaterial.uniforms.uBloomTexture.value = this.bloomPass.getOutput();
        } else {
            this.engine.materials.exportMaterial.uniforms.uBloomTexture.value = null;
        }

        this.engine.materials.exportMaterial.uniforms.map.value = lastWrite.texture;
        this.engine.materials.exportMaterial.uniforms.uResolution.value.set(sess.safeWidth, sess.safeHeight);

        this.renderer.setRenderTarget(sess.exportTarget);
        this.renderer.setViewport(0, 0, sess.safeWidth, sess.safeHeight);
        this.renderer.render(sess.ppScene, sess.ppCamera);

        this.renderer.readRenderTargetPixels(sess.exportTarget, 0, 0, sess.safeWidth, sess.safeHeight, sess.pixelBuffer);

        // Flip Y into pixelBuffer in place
        const w = sess.safeWidth;
        const h = sess.safeHeight;
        const stride = w * 4;
        const halfH = Math.floor(h / 2);
        for (let y = 0; y < halfH; y++) {
            const topOff = y * stride;
            const botOff = (h - y - 1) * stride;
            for (let i = 0; i < stride; i++) {
                const temp = sess.pixelBuffer[topOff + i];
                sess.pixelBuffer[topOff + i] = sess.pixelBuffer[botOff + i];
                sess.pixelBuffer[botOff + i] = temp;
            }
        }

        return lastWrite;
    }

    /**
     * Video mode — single pass per frame, encode via VideoEncoder, progress postMsg after.
     */
    private renderFrameVideo(sess: ExportSession, frameIndex: number) {
        const lastWrite = this.renderOnePass(sess, frameIndex);

        // Focus-lock depth probe — only meaningful on the beauty (and depth) pass. During the
        // alpha pass the main shader writes binary 0/1 coverage into the alpha channel, so
        // reading it here would clobber `lastMeasuredDistance` with garbage.
        if (sess.config.pass !== 'alpha') {
            const cx = Math.floor(sess.renderWidth / 2);
            const cy = Math.floor(sess.renderHeight / 2);
            this.renderer.readRenderTargetPixels(lastWrite, cx, cy, 1, 1, sess.depthBuf);
            const measuredDist = sess.depthBuf[3];
            if (isSurfaceHit(measuredDist)) {
                this.engine.lastMeasuredDistance = measuredDist;
            }
        }

        const frameData = new VideoFrame(sess.pixelBuffer, {
            format: 'RGBX',
            codedWidth: sess.safeWidth,
            codedHeight: sess.safeHeight,
            timestamp: frameIndex * (1e6 / sess.config.fps),
            duration: 1e6 / sess.config.fps,
            colorSpace: { primaries: 'bt709', transfer: 'bt709', matrix: 'rgb', fullRange: true }
        });

        // A keyframe a second (see THE FILE in the header). Frame 0 is always one: the
        // first-chunk offset in `handleEncodedChunk` leans on it.
        const isKey = frameIndex % sess.keyFrameEvery === 0;
        sess.encoder!.encode(frameData, { keyFrame: isKey });
        frameData.close();

        this.blitPreview(lastWrite.texture, sess);

        const progress = ((frameIndex + 1) / sess.totalFrames) * 100;
        this.postMsg({ type: 'EXPORT_FRAME_DONE', frameIndex, progress, measuredDistance: this.engine.lastMeasuredDistance });
    }

    /**
     * Image-sequence mode — render each selected pass for this frame, keep the pixels per pass,
     * combine + encode into per-frame files (PNG RGBA, separate depth; or JPG-per-pass), and
     * write to the session's directory handle. Fire-and-forget write chain so frame-N's file
     * I/O overlaps with frame-N+1's GPU work; cancel/finish await the chain.
     */
    /**
     * @assumption `uOutputPass` MUST be reset to 0 before the preview
     *   blit, so the viewport always shows beauty even when the
     *   rendered passes were alpha/depth.
     */
    private renderFrameImageSequence(sess: ExportSession, frameIndex: number) {
        const passes = sess.config.passes && sess.config.passes.length > 0
            ? sess.config.passes
            : (['beauty'] as ExportPass[]);

        const passBuffers: Map<ExportPass, Uint8Array> = new Map();
        let lastWrite: THREE.WebGLRenderTarget | null = null;

        for (const [passIndex, pass] of passes.entries()) {
            const passCode = pass === 'alpha' ? 1.0 : pass === 'depth' ? 2.0 : 0.0;
            this.engine.mainUniforms.uOutputPass.value = passCode;

            lastWrite = this.renderOnePass(sess, frameIndex, passIndex, passes.length);

            // Focus-lock probe on the beauty pass only (alpha writes binary coverage to alpha;
            // depth writes distance too but we don't need to re-probe it every pass).
            if (pass === 'beauty') {
                const cx = Math.floor(sess.renderWidth / 2);
                const cy = Math.floor(sess.renderHeight / 2);
                this.renderer.readRenderTargetPixels(lastWrite, cx, cy, 1, 1, sess.depthBuf);
                const measuredDist = sess.depthBuf[3];
                if (isSurfaceHit(measuredDist)) {
                    this.engine.lastMeasuredDistance = measuredDist;
                }
            }

            // Copy out: pixelBuffer is reused across passes, so we snapshot per pass.
            passBuffers.set(pass, new Uint8Array(sess.pixelBuffer));
        }

        // Schedule file writes on the image write chain so they serialize with finish()/cancel().
        // The chain is always initialized to `Promise.resolve()` when `isImageMode` is true (see
        // `start()`), so `imageWriteChain!` is safe here.
        sess.imageWriteChain = sess.imageWriteChain!.then(
            () => this.writeFrameFiles(sess, frameIndex, passBuffers)
        );

        // Force the preview to show beauty. The accumulation buffer's RGB is always the
        // tone-mappable color regardless of pass (only the alpha channel differs — see main.ts),
        // so switching `uOutputPass` to 0 for the blit makes displayMaterial read the beauty
        // branch of post_process and the user sees the real rendered image instead of the
        // luminance readout of whichever pass happened to run last. `lastWrite` is always
        // assigned because `passes` is coerced to a non-empty array above.
        this.engine.mainUniforms.uOutputPass.value = 0.0;
        this.blitPreview(lastWrite!.texture, sess);

        const progress = ((frameIndex + 1) / sess.totalFrames) * 100;
        this.postMsg({ type: 'EXPORT_FRAME_DONE', frameIndex, progress, measuredDistance: this.engine.lastMeasuredDistance });
    }

    /**
     * Combine per-pass pixel buffers into the format-appropriate output files and write them to
     * the session's directory handle. Called off the write chain so per-frame GPU work doesn't
     * block on disk I/O. A write that fails ends the session (`fail`): the main thread stops
     * its frame loop on that EXPORT_ERROR, so a session left open would only block the next
     * export. Writes already queued behind it still run.
     */
    private async writeFrameFiles(sess: ExportSession, frameIndex: number, passBuffers: Map<ExportPass, Uint8Array>) {
        if (!sess.dirHandle) return;
        try {
            // Name files by the TIMELINE frame, not the pass index.
            //
            // `frameIndex` is the 0-based position within this export run — correct
            // for the progress percentage and for the video muxer's frame
            // timestamps, and deliberately left alone there. But it is the wrong
            // number to stamp on a file: a render restarted at frame 690 wrote
            // frame_00000 onward, so the numbering silently disagreed with the
            // timeline and a re-run over a different range OVERWROTE the earlier
            // files in the same directory. Reported from production 2026-08-31.
            //
            // The session already carries the range (see `start()`, which derives
            // totalFrames from exactly these two), so this needs no new wire field.
            const frameNum = exportFrameFileTag(
                frameIndex, sess.config.startFrame, sess.config.frameStep,
            );
            const base = sess.config.imageSequenceBaseName || 'frame';
            const ext = sess.formatDef.ext;
            const mime = sess.formatDef.mime;
            const isPng = sess.formatDef.container === 'png';

            // WHICH files this frame makes, and their names, is `exportFrameFiles`: the one
            // rule the runner also looks by before a render (frames already in the folder).
            // Do not spell a name here. PNG: beauty and alpha together are ONE RGBA file,
            // depth is always its own; JPG cannot carry alpha, so it is one file a pass.
            const files = exportFrameFiles(base, frameNum, sess.formatDef.container, ext, [...passBuffers.keys()]);
            for (const file of files) {
                let pixels: Uint8Array;
                if (file.from === 'beauty+alpha') {
                    const beauty = passBuffers.get('beauty')!;
                    const alphaBuf = passBuffers.get('alpha')!;
                    pixels = new Uint8Array(beauty.length);
                    for (let i = 0; i < pixels.length; i += 4) {
                        pixels[i]     = beauty[i];
                        pixels[i + 1] = beauty[i + 1];
                        pixels[i + 2] = beauty[i + 2];
                        pixels[i + 3] = alphaBuf[i]; // alpha-pass luminance → alpha channel
                    }
                } else {
                    pixels = passBuffers.get(file.from)!;
                }
                await this.writeOneImageFile(sess, pixels, file.name, mime, isPng ? undefined : /* jpegQuality */ 0.95);
            }
        } catch (e) {
            console.error('[WorkerExporter] Image write failed for frame', frameIndex, e);
            this.fail(sess, `Image write failed at frame ${frameIndex}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Encode one Uint8Array of RGBA pixels to PNG/JPG via OffscreenCanvas.convertToBlob() and
     * stream the result into a freshly-created file inside the session's directory handle.
     * OffscreenCanvas is available in dedicated workers in all browsers that have File System
     * Access API (i.e. Chromium), which is exactly the set that can get here in the first place.
     */
    private async writeOneImageFile(
        sess: ExportSession,
        pixels: Uint8Array,
        fileName: string,
        mime: string,
        jpegQuality?: number
    ) {
        // Wrap the Uint8Array in ImageData. `new Uint8ClampedArray(pixels)` copies into a
        // plain ArrayBuffer-backed view (the shared-buffer generic in TS 5.x trips up the
        // zero-copy form via `.buffer`). The copy cost is ~one memcpy per frame at output
        // resolution, which is negligible vs. the PNG encode that follows.
        const clamped = new Uint8ClampedArray(pixels);
        const imgData = new ImageData(clamped, sess.safeWidth, sess.safeHeight);

        const canvas = new OffscreenCanvas(sess.safeWidth, sess.safeHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
        ctx.putImageData(imgData, 0, 0);

        const blob = await canvas.convertToBlob(
            jpegQuality !== undefined ? { type: mime, quality: jpegQuality } : { type: mime }
        );

        const fileHandle = await sess.dirHandle!.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
    }

    private blitPreview(texture: THREE.Texture, sess: ExportSession) {
        const canvas = this.renderer.domElement as unknown as OffscreenCanvas;
        const screenW = canvas.width;
        const screenH = canvas.height;
        const imgAspect = sess.safeWidth / sess.safeHeight;
        const screenAspect = screenW / screenH;

        let vx = 0, vy = 0, vw = screenW, vh = screenH;
        if (screenAspect > imgAspect) {
            vw = Math.round(screenH * imgAspect);
            vx = Math.round((screenW - vw) / 2);
        } else {
            vh = Math.round(screenW / imgAspect);
            vy = Math.round((screenH - vh) / 2);
        }

        // Sync bloom texture from the export pipeline onto displayMaterial so the preview
        // bloom matches whatever the encoder is actually seeing for this frame.
        this.engine.materials.displayMaterial.uniforms.uBloomTexture.value =
            this.engine.materials.exportMaterial.uniforms.uBloomTexture.value;
        this.engine.materials.displayMaterial.uniforms.map.value = texture;
        this.engine.materials.displayMaterial.uniforms.uResolution.value.set(sess.renderWidth, sess.renderHeight);
        this.engine.materials.displayMaterial.uniformsNeedUpdate = true;

        this.renderer.setRenderTarget(null);
        this.renderer.setScissor(0, 0, screenW, screenH);
        this.renderer.setScissorTest(true);
        this.renderer.setClearColor(0x000000, 1.0);
        this.renderer.clearColor();
        this.renderer.setViewport(vx, vy, vw, vh);
        this.renderer.setScissor(vx, vy, vw, vh);
        this.renderer.render(this.engine.sceneCtrl.displayScene, this.engine.sceneCtrl.mainCamera);
        this.renderer.setScissorTest(false);

        // Canvas auto-presents via transferControlToOffscreen — just send shadow state
        this.postMsg({ type: 'FRAME_READY', bitmap: null, state: this.buildShadowState() });
    }

    private buildShadowState() {
        const eo = this.engine.sceneOffset;
        return {
            isBooted: true,
            isCompiling: false,
            hasCompiledShader: true,
            isPaused: false,
            dirty: false,
            lastCompileDuration: 0,
            lastMeasuredDistance: this.engine.lastMeasuredDistance ?? 10,
            accumulationCount: 0,
            convergenceValue: 1.0,
            frameCount: 0,
            sceneOffset: {
                x: eo?.x ?? 0, y: eo?.y ?? 0, z: eo?.z ?? 0,
                xL: eo?.xL ?? 0, yL: eo?.yL ?? 0, zL: eo?.zL ?? 0,
            }
        };
    }

    // ─── Encoded Chunk Handler ───────────────────────────────────────

    /**
     * @assumption First-chunk PTS normalization is PER-TRACK — video
     *   and audio offsets are independent because audio enters the
     *   encoder later and has its own priming delay. Duration is
     *   hardcoded to `1/fps` because Firefox does not echo the source
     *   `VideoFrame.duration`.
     */
    private handleEncodedChunk(chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined) {
        if (!this.session) return;
        const sess = this.session;

        const rawBuffer = new Uint8Array(chunk.byteLength);
        chunk.copyTo(rawBuffer);

        const stableMeta = meta
            ? {
                  decoderConfig: {
                      ...meta.decoderConfig,
                      description: meta.decoderConfig?.description ? new Uint8Array(meta.decoderConfig.description as any).slice() : undefined
                  }
              }
            : undefined;

        // Reconstruct PTS as `chunk.timestamp - firstChunkOffset`. Firefox adds a one-frame
        // leading-latency offset to every chunk timestamp; the muxer would otherwise bake that into
        // the file's total duration (`mvhd` / `tkhd` write `lastSample.timestamp + lastSample.duration`)
        // and the muxed fps would come out as N/(N+1) of what was requested. Subtracting the first
        // chunk's offset cancels the shift on Firefox and is a no-op on Chrome (offset is 0).
        // The keyFrame on frame 0 guarantees the first decoded chunk is the I-frame at PTS=0, so
        // this works even with B-frame reordering.
        // Duration is hardcoded to `1/fps` because Firefox doesn't echo back the duration we set on
        // the source VideoFrame — it returns ~33333µs (a 30fps default) regardless of our config.
        if (sess.firstChunkOffsetMicros === null) {
            sess.firstChunkOffsetMicros = chunk.timestamp;
        }
        const tsSec = (chunk.timestamp - sess.firstChunkOffsetMicros) / 1e6;
        const frameDurationSec = 1 / sess.config.fps;
        const packet = new Mediabunny.EncodedPacket(rawBuffer, chunk.type, tsSec, frameDurationSec);

        sess.muxerChain = (sess.muxerChain ?? Promise.resolve()).then(async () => {
            try {
                if (sess.output!.state === 'pending') {
                    sess.output!.addVideoTrack(sess.packetSource!, {
                        frameRate: sess.config.fps
                    });
                    if (sess.audioPacketSource) {
                        sess.output!.addAudioTrack(sess.audioPacketSource);
                    }
                    await sess.output!.start();
                    // Output is now started — kick off the audio encode pump.
                    if (sess.audioEncoder && sess.audioPcm && sess.audioSampleRate) {
                        sess.audioFlushed = this.encodeAudioPcm(
                            sess.audioEncoder,
                            sess.audioPcm,
                            sess.audioSampleRate,
                        );
                    }
                }

                await sess.packetSource!.add(packet, stableMeta as EncodedVideoChunkMetadata | undefined);
            } catch (e) {
                console.error('[WorkerExporter] Muxing error:', e);
                this.fail(sess, `Muxing failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        });
    }

    /** Feeds the interleaved-stereo PCM into the AudioEncoder in 1024-frame
     *  chunks. Returns a promise that resolves after `encoder.flush()` so
     *  finish() can await all audio packets being pushed to the muxer. */
    private async encodeAudioPcm(
        encoder: AudioEncoder,
        pcm: Float32Array,
        sampleRate: number,
    ): Promise<void> {
        const channels = 2;
        const totalFrames = pcm.length / channels;
        const chunkFrames = 1024;
        // WebCodecs AudioData wants planar OR interleaved depending on `format`.
        // We pass 'f32' (interleaved float32). Browsers accept this for AAC + Opus.
        for (let offset = 0; offset < totalFrames; offset += chunkFrames) {
            const frames = Math.min(chunkFrames, totalFrames - offset);
            const slice = pcm.subarray(offset * channels, (offset + frames) * channels);
            // AudioData requires a fresh buffer (it transfers / takes ownership).
            const chunkPcm = new Float32Array(slice.length);
            chunkPcm.set(slice);
            const data = new AudioData({
                format: 'f32',
                sampleRate,
                numberOfFrames: frames,
                numberOfChannels: channels,
                timestamp: Math.round((offset / sampleRate) * 1e6),
                data: chunkPcm,
            });
            encoder.encode(data);
            data.close();
        }
        await encoder.flush();
    }

    private handleEncodedAudioChunk(chunk: EncodedAudioChunk, meta: EncodedAudioChunkMetadata | undefined) {
        if (!this.session) return;
        const sess = this.session;
        if (!sess.audioPacketSource) return;

        const rawBuffer = new Uint8Array(chunk.byteLength);
        chunk.copyTo(rawBuffer);

        // Same first-chunk-offset normalization the video path does — undoes
        // encoder priming delay (AAC ~44ms) + Firefox's leading-latency offset
        // so the audio track and video track both start at output PTS 0.
        if (sess.audioFirstChunkOffsetMicros == null) {
            sess.audioFirstChunkOffsetMicros = chunk.timestamp;
        }
        const tsSec = (chunk.timestamp - sess.audioFirstChunkOffsetMicros) / 1e6;
        const durSec = (chunk.duration ?? 0) / 1e6;
        const packet = new Mediabunny.EncodedPacket(rawBuffer, chunk.type, tsSec, durSec);

        const stableMeta = meta?.decoderConfig
            ? {
                decoderConfig: {
                    ...meta.decoderConfig,
                    description: meta.decoderConfig.description
                        ? new Uint8Array(meta.decoderConfig.description as any).slice()
                        : undefined,
                },
            }
            : undefined;

        sess.muxerChain = (sess.muxerChain ?? Promise.resolve()).then(async () => {
            try {
                await sess.audioPacketSource!.add(packet, stableMeta as EncodedAudioChunkMetadata | undefined);
            } catch (e) {
                console.error('[WorkerExporter] Audio muxing error:', e);
            }
        });
    }

    // ─── Finish Export ───────────────────────────────────────────────

    async finish() {
        if (!this.session) return;
        const sess = this.session;

        try {
            if (sess.isImageMode) {
                // Drain any pending per-frame file writes. No encoder / muxer / blob.
                await sess.imageWriteChain;
                this.cleanup();
                this.postMsg({ type: 'EXPORT_COMPLETE', blob: null });
                return;
            }

            await sess.encoder!.flush();
            sess.encoder!.close();
            // Wait for the audio encode pump (if any) to flush + drain into the
            // muxer chain before finalizing the container.
            if (sess.audioFlushed) {
                await sess.audioFlushed;
                sess.audioEncoder?.close();
            }
            await sess.muxerChain;
            await sess.output!.finalize();

            let blob: ArrayBuffer | null = null;
            if (sess.output!.target instanceof Mediabunny.BufferTarget) {
                const buf = (sess.output!.target as Mediabunny.BufferTarget).buffer;
                if (buf) blob = buf;
            }

            this.cleanup();
            this.postMsg({ type: 'EXPORT_COMPLETE', blob }, blob ? [blob] : []);
        } catch (e) {
            console.error('[WorkerExporter] Finalize error:', e);
            this.fail(sess, e instanceof Error ? e.message : String(e));
        }
    }

    // ─── Cancel Export ───────────────────────────────────────────────

    cancel() {
        if (!this.session) return;
        const sess = this.session;
        if (!sess.isImageMode) {
            try {
                sess.encoder!.close();
            } catch {}
            // No finished file is coming: abort the picked file's stream. That reaches the
            // main thread's FileSystemWritableFileStream (WorkerProxy.startExport forwards it),
            // which throws away what was written and lets go of the file; whatever was under
            // the picked name before stays as it was. Left alone, the stream stayed open for
            // as long as the page did.
            sess.fileWriter?.abort().catch(() => {});
        }
        // Image mode: any in-flight write is awaited implicitly via the chain in `finish()`;
        // cancel just drops the session — partial files written so far stay on disk.
        this.cleanup();
    }

    // ─── Fail Export ─────────────────────────────────────────────────

    /**
     * `sess` cannot go on: end it the way a cancel does, then tell the main thread once.
     * Every error that is fatal to a session comes through here, because the main thread
     * stops its frame loop on EXPORT_ERROR and sends nothing more: a session still set after
     * one stays set, and `start()` refuses every later export.
     *
     * Bound to the session it is about. A second error from a session that has already ended
     * (an encoder error, then the muxer's), or a late one from a write queued by an earlier
     * session, changes nothing and posts nothing — it must not end the session after it.
     */
    private fail(sess: ExportSession, message: string) {
        if (this.session !== sess) return;
        this.cancel();
        this.postMsg({ type: 'EXPORT_ERROR', message });
    }

    // ─── Cleanup ────────────────────────────────────────────────────

    /**
     * @assumption One-shot teardown — `if (!this.session) return` at the
     *   top is what makes `cancel()` and `finish()` both safe to call.
     *   Idempotent.
     */
    private cleanup() {
        if (!this.session) return;

        this.session.accumA.dispose();
        this.session.accumB.dispose();
        this.session.exportTarget.dispose();
        this.session = null;

        // Restore engine state
        this.engine.state.isExporting = false;
        this.engine.mainUniforms.uResolution.value.set(this.savedResolution.w, this.savedResolution.h);
        this.engine.pipeline.resize(this.savedResolution.w, this.savedResolution.h);
        // Reset the pass selector back to beauty so the viewport returns to normal rendering.
        // uDepthMin / uDepthMax are ignored when uOutputPass == 0 so they can be left as-is.
        this.engine.mainUniforms.uOutputPass.value = 0.0;

        // Reset renderer state
        const canvas = this.renderer.domElement as unknown as OffscreenCanvas;
        this.renderer.setRenderTarget(null);
        this.renderer.setViewport(0, 0, canvas.width, canvas.height);
        this.renderer.setScissor(0, 0, canvas.width, canvas.height);
        this.renderer.setScissorTest(false);

        this.engine.resetAccumulation();
    }
}
