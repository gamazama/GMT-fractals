/**
 * WorkerExporter — Handles video export rendering + encoding inside the Web Worker.
 *
 * Uses VideoEncoder + Mediabunny for encoding/muxing.
 * Accumulation is done via ping-pong render targets.
 */

import * as THREE from 'three';
import type { FractalEngine } from '../FractalEngine';
import type { VideoExportConfig, ExportPass } from '../../../engine/codec/VideoExportTypes';
import type { EngineRenderState } from '../FractalEngine';
import { VIDEO_CONFIG, VIDEO_FORMATS, MAX_SKY_DISTANCE } from '../../../data/constants';
import * as Mediabunny from 'mediabunny';
import { halton } from '../../../engine/codec/halton';
import { BloomPass } from '../BloomPass';
import { createFullscreenPass } from '../utils/FullscreenQuad';

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

    start(config: VideoExportConfig, stream: WritableStream | null, dirHandle?: FileSystemDirectoryHandle) {
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
            firstChunkOffsetMicros: null
        };

        if (!isImageMode) {
            // ─── Video path: spin up mediabunny output + WebCodecs VideoEncoder ───
            let target: Mediabunny.Target;
            if (stream) {
                target = new Mediabunny.StreamTarget(stream as unknown as WritableStream, { chunked: true });
            } else {
                target = new Mediabunny.BufferTarget();
            }

            const format: Mediabunny.OutputFormat = formatDef.container === 'webm'
                ? new Mediabunny.WebMOutputFormat()
                : new Mediabunny.Mp4OutputFormat({ fastStart: 'in-memory' });

            session.output = new Mediabunny.Output({ format, target });
            session.packetSource = new Mediabunny.EncodedVideoPacketSource(formatDef.codec as Mediabunny.VideoCodec);

            session.encoder = new VideoEncoder({
                output: (chunk, meta) => this.handleEncodedChunk(chunk, meta),
                error: (e) => {
                    console.error('[WorkerExporter] Encoder error:', e);
                    this.postMsg({ type: 'EXPORT_ERROR', message: e.message });
                }
            });

            const encoderConfig: VideoEncoderConfig = {
                codec: formatDef.codec === 'avc' ? 'avc1.640034' : (formatDef.codec as string),
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

        // Per-frame state is set ONCE regardless of how many passes we render. The inner pass
        // loop (image mode) just flips `uOutputPass` between passes — the camera, offset, and
        // scene uniforms don't change across passes.
        this.applyFrameState(cameraData, offset, renderState, modulations, time);

        if (sess.isImageMode) {
            this.renderFrameImageSequence(sess, frameIndex);
        } else {
            this.renderFrameVideo(sess, frameIndex);
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
     */
    private renderOnePass(sess: ExportSession): THREE.WebGLRenderTarget {
        // Clear accumulation ping-pong
        this.renderer.setRenderTarget(sess.accumA);
        this.renderer.clear();
        this.renderer.setRenderTarget(sess.accumB);
        this.renderer.clear();

        const N = sess.config.samples;
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
        const lastWrite = this.renderOnePass(sess);

        // Focus-lock depth probe — only meaningful on the beauty (and depth) pass. During the
        // alpha pass the main shader writes binary 0/1 coverage into the alpha channel, so
        // reading it here would clobber `lastMeasuredDistance` with garbage.
        if (sess.config.pass !== 'alpha') {
            const cx = Math.floor(sess.renderWidth / 2);
            const cy = Math.floor(sess.renderHeight / 2);
            this.renderer.readRenderTargetPixels(lastWrite, cx, cy, 1, 1, sess.depthBuf);
            const measuredDist = sess.depthBuf[3];
            if (measuredDist > 0 && measuredDist < MAX_SKY_DISTANCE && Number.isFinite(measuredDist)) {
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

        const isKey = frameIndex === 0;
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
    private renderFrameImageSequence(sess: ExportSession, frameIndex: number) {
        const passes = sess.config.passes && sess.config.passes.length > 0
            ? sess.config.passes
            : (['beauty'] as ExportPass[]);

        const passBuffers: Map<ExportPass, Uint8Array> = new Map();
        let lastWrite: THREE.WebGLRenderTarget | null = null;

        for (const pass of passes) {
            const passCode = pass === 'alpha' ? 1.0 : pass === 'depth' ? 2.0 : 0.0;
            this.engine.mainUniforms.uOutputPass.value = passCode;

            lastWrite = this.renderOnePass(sess);

            // Focus-lock probe on the beauty pass only (alpha writes binary coverage to alpha;
            // depth writes distance too but we don't need to re-probe it every pass).
            if (pass === 'beauty') {
                const cx = Math.floor(sess.renderWidth / 2);
                const cy = Math.floor(sess.renderHeight / 2);
                this.renderer.readRenderTargetPixels(lastWrite, cx, cy, 1, 1, sess.depthBuf);
                const measuredDist = sess.depthBuf[3];
                if (measuredDist > 0 && measuredDist < MAX_SKY_DISTANCE && Number.isFinite(measuredDist)) {
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
     * block on disk I/O. Errors are logged + surfaced via EXPORT_ERROR but the chain continues.
     */
    private async writeFrameFiles(sess: ExportSession, frameIndex: number, passBuffers: Map<ExportPass, Uint8Array>) {
        if (!sess.dirHandle) return;
        try {
            const frameNum = String(frameIndex).padStart(5, '0');
            const base = sess.config.imageSequenceBaseName || 'frame';
            const ext = sess.formatDef.ext;
            const mime = sess.formatDef.mime;

            if (sess.formatDef.container === 'png') {
                // PNG path: if both beauty and alpha are present, merge beauty.rgb + alpha.r
                // into a single RGBA file; otherwise fall back to whichever pass(es) exist.
                // Depth is always a separate greyscale file.
                const beauty = passBuffers.get('beauty');
                const alphaBuf = passBuffers.get('alpha');
                const depth = passBuffers.get('depth');

                if (beauty && alphaBuf) {
                    const merged = new Uint8Array(beauty.length);
                    for (let i = 0; i < merged.length; i += 4) {
                        merged[i]     = beauty[i];
                        merged[i + 1] = beauty[i + 1];
                        merged[i + 2] = beauty[i + 2];
                        merged[i + 3] = alphaBuf[i]; // alpha-pass luminance → alpha channel
                    }
                    await this.writeOneImageFile(sess, merged, `${base}_${frameNum}.${ext}`, mime);
                } else if (beauty) {
                    await this.writeOneImageFile(sess, beauty, `${base}_${frameNum}.${ext}`, mime);
                } else if (alphaBuf) {
                    await this.writeOneImageFile(sess, alphaBuf, `${base}_alpha_${frameNum}.${ext}`, mime);
                }
                if (depth) {
                    await this.writeOneImageFile(sess, depth, `${base}_depth_${frameNum}.${ext}`, mime);
                }
            } else {
                // JPG (and any future per-pass image format) — one file per selected pass.
                // JPG can't carry alpha, so alpha and depth go out as standalone greyscale files.
                for (const [pass, buf] of passBuffers) {
                    const name = `${base}_${pass}_${frameNum}.${ext}`;
                    await this.writeOneImageFile(sess, buf, name, mime, /* jpegQuality */ 0.95);
                }
            }
        } catch (e) {
            console.error('[WorkerExporter] Image write failed for frame', frameIndex, e);
            this.postMsg({ type: 'EXPORT_ERROR', message: `Image write failed at frame ${frameIndex}: ${e instanceof Error ? e.message : String(e)}` });
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
                    await sess.output!.start();
                }

                await sess.packetSource!.add(packet, stableMeta as EncodedVideoChunkMetadata | undefined);
            } catch (e) {
                console.error('[WorkerExporter] Muxing error:', e);
                this.cancel();
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
            this.cleanup();
            this.postMsg({ type: 'EXPORT_ERROR', message: e instanceof Error ? e.message : String(e) });
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
        }
        // Image mode: any in-flight write is awaited implicitly via the chain in `finish()`;
        // cancel just drops the session — partial files written so far stay on disk.
        this.cleanup();
    }

    // ─── Cleanup ────────────────────────────────────────────────────

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
