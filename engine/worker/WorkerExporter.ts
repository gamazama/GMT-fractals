/**
 * WorkerExporter — Handles video export rendering + encoding inside the Web Worker.
 *
 * Uses VideoEncoder + Mediabunny for encoding/muxing.
 * Accumulation is done via ping-pong render targets.
 */

import * as THREE from 'three';
import type { FractalEngine } from '../FractalEngine';
import type { VideoExportConfig } from '../codec/VideoExportTypes';
import type { EngineRenderState } from '../FractalEngine';
import { VIDEO_CONFIG, VIDEO_FORMATS } from '../../data/constants';
import * as Mediabunny from 'mediabunny';
import { H264Converter, halton } from '../codec/H264Converter';

// ─── Export Session State ────────────────────────────────────────────

interface ExportSession {
    config: VideoExportConfig;
    output: Mediabunny.Output;
    packetSource: Mediabunny.EncodedVideoPacketSource;
    encoder: VideoEncoder;
    muxerChain: Promise<void>;
    formatDef: (typeof VIDEO_FORMATS)[number];

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

    // Post-processing
    ppScene: THREE.Scene;
    ppCamera: THREE.OrthographicCamera;

    // State
    extractedDescription: Uint8Array | null;
    internalFrameCounter: number;
}

export type ExportPostFn = (msg: any, transfer?: Transferable[]) => void;

export class WorkerExporter {
    private session: ExportSession | null = null;
    private engine: FractalEngine;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private postMsg: ExportPostFn;

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
    }

    get active() {
        return !!this.session;
    }

    // ─── Start Export ────────────────────────────────────────────────

    start(config: VideoExportConfig, stream: WritableStream | null) {
        if (this.session) {
            this.postMsg({ type: 'EXPORT_ERROR', message: 'Export already in progress' });
            return;
        }

        const align = 16;
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

        // Create accumulation targets
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

        // Post-processing scene (tone mapping + sRGB via exportMaterial)
        const ppScene = new THREE.Scene();
        const ppCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.engine.materials.exportMaterial);
        quad.frustumCulled = false;
        ppScene.add(quad);

        // Encoder + Muxer
        const formatDef = VIDEO_FORMATS[config.formatIndex] || VIDEO_FORMATS[0];

        let target: Mediabunny.Target;
        if (stream) {
            target = new Mediabunny.StreamTarget(stream as unknown as WritableStream, { chunked: true });
        } else {
            target = new Mediabunny.BufferTarget();
        }

        let format: Mediabunny.OutputFormat;
        if (formatDef.container === 'webm') {
            format = new Mediabunny.WebMOutputFormat();
        } else {
            format = new Mediabunny.Mp4OutputFormat({ fastStart: 'in-memory' });
        }

        const output = new Mediabunny.Output({ format, target });
        const packetSource = new Mediabunny.EncodedVideoPacketSource(formatDef.codec as Mediabunny.VideoCodec);

        const step = Math.max(1, Math.floor(config.frameStep));
        const start = Math.max(0, config.startFrame);
        const end = Math.max(start, config.endFrame);
        const totalFrames = Math.floor((end - start) / step) + 1;

        const session: ExportSession = {
            config,
            output,
            packetSource,
            encoder: null!,
            muxerChain: Promise.resolve(),
            formatDef,
            safeWidth,
            safeHeight,
            renderWidth: renderW,
            renderHeight: renderH,
            totalFrames,
            accumA,
            accumB,
            exportTarget,
            pixelBuffer,
            ppScene,
            ppCamera,
            extractedDescription: null,
            internalFrameCounter: 0
        };

        // Create encoder (must be done after session is created for handleEncodedChunk closure)
        session.encoder = new VideoEncoder({
            output: (chunk, meta) => this.handleEncodedChunk(chunk, meta),
            error: (e) => {
                console.error('[WorkerExporter] Encoder error:', e);
                this.postMsg({ type: 'EXPORT_ERROR', message: e.message });
            }
        });

        const encoderConfig: VideoEncoderConfig = {
            codec: formatDef.codec === 'avc' ? 'avc1.640034' : formatDef.codec,
            width: safeWidth,
            height: safeHeight,
            bitrate: config.bitrate * VIDEO_CONFIG.BITRATE_MULTIPLIER * 2.5,
            framerate: config.fps,
            latencyMode: 'quality',
            avc: { format: formatDef.container === 'mp4' ? 'annexb' : 'avc' }
        };
        session.encoder.configure(encoderConfig);

        this.session = session;

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

        // 1. Apply render state (optics, lighting, quality, geometry)
        this.engine.setRenderState(renderState);
        this.engine.modulations = modulations;

        // 2. Set camera
        this.camera.position.set(cameraData.position[0], cameraData.position[1], cameraData.position[2]);
        this.camera.quaternion.set(cameraData.quaternion[0], cameraData.quaternion[1], cameraData.quaternion[2], cameraData.quaternion[3]);
        this.camera.fov = cameraData.fov;
        this.camera.aspect = sess.safeWidth / sess.safeHeight;
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();

        // 3. Set scene offset
        this.engine.virtualSpace.state = offset;

        // 4. Set resolution & time uniforms
        this.engine.mainUniforms.uResolution.value.set(sess.renderWidth, sess.renderHeight);
        this.engine.mainUniforms.uInternalScale.value = sess.config.internalScale || 1.0;
        this.engine.setUniform('uTime', time);
        this.engine.pipeline.resize(sess.renderWidth, sess.renderHeight);

        // 5. Sync camera uniforms (basis vectors, position, offset, lights, etc.)
        this.engine.syncFrame(this.camera, { clock: { elapsedTime: time } });

        // 6. Clear accumulation targets
        this.renderer.setRenderTarget(sess.accumA);
        this.renderer.clear();
        this.renderer.setRenderTarget(sess.accumB);
        this.renderer.clear();

        // 7. Render N accumulation samples
        const N = sess.config.samples;
        for (let s = 0; s < N; s++) {
            const writeBuffer = s % 2 === 0 ? sess.accumA : sess.accumB;
            const readBuffer = s % 2 === 0 ? sess.accumB : sess.accumA;

            const blend = 1.0 / (s + 1);
            this.engine.mainUniforms.uBlendFactor.value = blend;
            this.engine.mainUniforms.uHistoryTexture.value = readBuffer.texture;

            sess.internalFrameCounter++;
            this.engine.mainUniforms.uFrameCount.value = sess.internalFrameCounter;

            // TAA jitter — use full Halton sequence (not wrapped at 16)
            if (s > 0) {
                const jX = halton(s, 2);
                const jY = halton(s, 3);
                this.engine.mainUniforms.uJitter.value.set(jX * 2.0 - 1.0, jY * 2.0 - 1.0);
            } else {
                this.engine.mainUniforms.uJitter.value.set(0, 0);
            }

            // Render to accumulation target
            this.renderer.setRenderTarget(writeBuffer);
            this.renderer.render(this.engine.mainScene, this.engine.mainCamera);
        }

        // 8. Post-process to export target (tone mapping, sRGB via exportMaterial)
        const lastWrite = (N - 1) % 2 === 0 ? sess.accumA : sess.accumB;

        // 8b. Depth readback for focus lock (center pixel from last accumulation)
        const depthBuf = new Float32Array(4);
        const cx = Math.floor(sess.renderWidth / 2);
        const cy = Math.floor(sess.renderHeight / 2);
        this.renderer.readRenderTargetPixels(lastWrite, cx, cy, 1, 1, depthBuf);
        const measuredDist = depthBuf[3]; // alpha = distance
        if (measuredDist > 0 && measuredDist < 1000 && Number.isFinite(measuredDist)) {
            this.engine.lastMeasuredDistance = measuredDist;
        }
        this.engine.materials.exportMaterial.uniforms.map.value = lastWrite.texture;
        this.engine.materials.exportMaterial.uniforms.uResolution.value.set(sess.safeWidth, sess.safeHeight);

        this.renderer.setRenderTarget(sess.exportTarget);
        this.renderer.setViewport(0, 0, sess.safeWidth, sess.safeHeight);
        this.renderer.render(sess.ppScene, sess.ppCamera);

        // 9. Read pixels
        this.renderer.readRenderTargetPixels(sess.exportTarget, 0, 0, sess.safeWidth, sess.safeHeight, sess.pixelBuffer);

        // Flip Y
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

        // 10. Encode frame
        const frameData = new VideoFrame(sess.pixelBuffer, {
            format: 'RGBX',
            codedWidth: w,
            codedHeight: h,
            timestamp: frameIndex * (1e6 / sess.config.fps),
            duration: 1e6 / sess.config.fps,
            colorSpace: {
                primaries: 'bt709',
                transfer: 'bt709',
                matrix: 'rgb',
                fullRange: true
            }
        });

        const isKey = frameIndex === 0;
        sess.encoder.encode(frameData, { keyFrame: isKey });
        frameData.close();

        // 11. Blit preview to screen (letterboxed)
        this.blitPreview(lastWrite.texture);

        // 12. Send progress
        const progress = ((frameIndex + 1) / sess.totalFrames) * 100;
        this.postMsg({ type: 'EXPORT_FRAME_DONE', frameIndex, progress, measuredDistance: this.engine.lastMeasuredDistance });
    }

    private blitPreview(texture: THREE.Texture) {
        if (!this.session) return;

        const canvas = this.renderer.domElement as OffscreenCanvas;
        const screenW = canvas.width;
        const screenH = canvas.height;
        const imgAspect = this.session.renderWidth / this.session.renderHeight;
        const screenAspect = screenW / screenH;

        let vx = 0, vy = 0, vw = screenW, vh = screenH;
        if (screenAspect > imgAspect) {
            vw = Math.round(screenH * imgAspect);
            vx = Math.round((screenW - vw) / 2);
        } else {
            vh = Math.round(screenW / imgAspect);
            vy = Math.round((screenH - vh) / 2);
        }

        this.engine.materials.displayMaterial.uniforms.map.value = texture;
        this.engine.materials.displayMaterial.uniforms.uResolution.value.set(this.session.renderWidth, this.session.renderHeight);

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

        const packet = new Mediabunny.EncodedPacket(rawBuffer as any, chunk.type, chunk.timestamp / 1e6, (chunk.duration ?? 0) / 1e6);

        sess.muxerChain = sess.muxerChain.then(async () => {
            try {
                if (sess.formatDef.container === 'mp4' && sess.formatDef.codec === 'avc') {
                    const converted = H264Converter.convertChunkToAVCC(packet.data);
                    (packet as any).data = converted.data;
                    if (converted.sps && converted.pps && !sess.extractedDescription) {
                        sess.extractedDescription = H264Converter.createAVCCDescription(converted.sps, converted.pps);
                    }
                }

                if (stableMeta && stableMeta.decoderConfig && !stableMeta.decoderConfig.description && sess.extractedDescription) {
                    stableMeta.decoderConfig.description = new Uint8Array(sess.extractedDescription) as Uint8Array<ArrayBuffer>;
                }

                if (sess.output.state === 'pending') {
                    const desc = sess.extractedDescription || stableMeta?.decoderConfig?.description;
                    if (sess.formatDef.container === 'mp4' && !desc) {
                        console.warn('[WorkerExporter] Waiting for SPS/PPS...');
                        return;
                    }
                    sess.output.addVideoTrack(sess.packetSource, {
                        frameRate: sess.config.fps,
                        width: sess.safeWidth,
                        height: sess.safeHeight,
                        description: desc
                    } as any);
                    await sess.output.start();
                }

                await sess.packetSource.add(packet, stableMeta as any);
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
            await sess.encoder.flush();
            sess.encoder.close();
            await sess.muxerChain;
            await sess.output.finalize();

            let blob: ArrayBuffer | null = null;
            if (sess.output.target instanceof Mediabunny.BufferTarget) {
                const buf = (sess.output.target as Mediabunny.BufferTarget).buffer;
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
        try {
            this.session.encoder.close();
        } catch {}
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

        // Reset renderer state
        const canvas = this.renderer.domElement as OffscreenCanvas;
        this.renderer.setRenderTarget(null);
        this.renderer.setViewport(0, 0, canvas.width, canvas.height);
        this.renderer.setScissor(0, 0, canvas.width, canvas.height);
        this.renderer.setScissorTest(false);

        this.engine.resetAccumulation();
    }
}
