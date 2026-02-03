
import * as THREE from 'three';
import { FractalEngine, engine } from './FractalEngine';
import { animationEngine } from './AnimationEngine';
import { useAnimationStore } from '../store/animationStore';
import { useFractalStore } from '../store/fractalStore';
import { VIDEO_CONFIG, VIDEO_FORMATS } from '../data/constants';
import * as Mediabunny from 'mediabunny';

// Utils: H.264 Bitstream Converter (Annex B -> AVCC)
// Fixes Firefox metadata bugs and WMP resolution glitches
class H264Converter {
    static findNALUs(buffer: Uint8Array) {
        const nalus: { type: number, data: Uint8Array }[] = [];
        let i = 0;
        while (i < buffer.length) {
            let prefixLen = 0;
            if (i + 2 < buffer.length && buffer[i] === 0 && buffer[i+1] === 0 && buffer[i+2] === 1) {
                prefixLen = 3;
            } else if (i + 3 < buffer.length && buffer[i] === 0 && buffer[i+1] === 0 && buffer[i+2] === 0 && buffer[i+3] === 1) {
                prefixLen = 4;
            }
            
            if (prefixLen > 0) {
                let end = buffer.length;
                for (let j = i + prefixLen; j < buffer.length - 2; j++) {
                     if (buffer[j] === 0 && buffer[j+1] === 0 && (buffer[j+2] === 1 || (j + 3 < buffer.length && buffer[j+2] === 0 && buffer[j+3] === 1))) {
                         end = j;
                         break;
                     }
                }
                const naluData = buffer.subarray(i + prefixLen, end);
                const type = naluData[0] & 0x1f;
                nalus.push({ type, data: naluData });
                i = end;
            } else {
                i++;
            }
        }
        return nalus;
    }

    static createAVCCDescription(sps: Uint8Array, pps: Uint8Array) {
        const body = [1, sps[1], sps[2], sps[3], 0xFF, 0xE1, (sps.length >> 8) & 0xFF, sps.length & 0xFF];
        for (let i = 0; i < sps.length; i++) body.push(sps[i]);
        body.push(1, (pps.length >> 8) & 0xFF, pps.length & 0xFF);
        for (let i = 0; i < pps.length; i++) body.push(pps[i]);
        return new Uint8Array(body);
    }

    static convertChunkToAVCC(buffer: Uint8Array) {
        const nalus = this.findNALUs(buffer);
        let totalLen = 0;
        nalus.forEach(n => totalLen += 4 + n.data.length);
        const avccBuffer = new Uint8Array(totalLen);
        let offset = 0;
        let sps: Uint8Array | null = null;
        let pps: Uint8Array | null = null;

        for (const nalu of nalus) {
            if (nalu.type === 7) sps = nalu.data;
            if (nalu.type === 8) pps = nalu.data;
            const len = nalu.data.length;
            avccBuffer[offset] = (len >> 24) & 0xFF;
            avccBuffer[offset+1] = (len >> 16) & 0xFF;
            avccBuffer[offset+2] = (len >> 8) & 0xFF;
            avccBuffer[offset+3] = len & 0xFF;
            avccBuffer.set(nalu.data, offset + 4);
            offset += 4 + len;
        }
        return { data: avccBuffer, sps, pps };
    }
}

// CPU Halton Sequence Generator
const halton = (index: number, base: number) => {
    let result = 0;
    let f = 1 / base;
    let i = index;
    while (i > 0) {
        result = result + f * (i % base);
        i = Math.floor(i / base);
        f = f / base;
    }
    return result;
};

export interface VideoExportConfig {
    width: number;
    height: number;
    fps: number;
    bitrate: number; // in Mbps
    samples: number;
    startFrame: number;
    endFrame: number;
    frameStep: number;
    formatIndex: number; // Index in VIDEO_FORMATS
    internalScale?: number; // SSAA Multiplier (Default 1.0)
}

interface ExportSession {
    output: Mediabunny.Output;
    packetSource: Mediabunny.EncodedVideoPacketSource;
    encoder: VideoEncoder;
    muxerChain: Promise<void>; 
    
    config: VideoExportConfig;
    safeWidth: number;
    safeHeight: number;
    totalFrames: number;
    startFrame: number;
    step: number;
    outputFrameIndex: number;
    startTime: number;
    // Restore state
    startState: {
        frame: number;
        offset: any;
        camPos: THREE.Vector3;
        camQuat: THREE.Quaternion;
        wasPlaying: boolean;
    };
    directStream?: FileSystemWritableFileStream | null;
    formatDef: { ext: string, container: string, codec: string, mime: string };
    scale: number;
}

export class VideoExporter {
    private engine: FractalEngine;
    
    // Accumulation Buffers
    private accumTargetA: THREE.WebGLRenderTarget | null = null;
    private accumTargetB: THREE.WebGLRenderTarget | null = null;
    private exportTarget: THREE.WebGLRenderTarget | null = null;
    private pixelBuffer: Uint8Array | null = null;
    
    // Post Processing resources
    private ppScene: THREE.Scene;
    private ppCamera: THREE.OrthographicCamera;
    
    private isCancelled: boolean = false;
    private shouldStitchEarly: boolean = false;
    private isPaused: boolean = false;

    private currentSession: ExportSession | null = null;
    
    constructor(engineInstance: FractalEngine) {
        this.engine = engineInstance;
        this.ppScene = new THREE.Scene();
        this.ppCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.engine.materials.exportMaterial);
        quad.frustumCulled = false;
        this.ppScene.add(quad);
    }

    public cancel() {
        this.isCancelled = true;
        this.shouldStitchEarly = false;
    }

    public finishAndStitch() {
        this.isCancelled = true;
        this.shouldStitchEarly = true;
    }

    public pause() {
        this.isPaused = true;
    }

    public resume() {
        this.isPaused = false;
    }

    private captureCurrentState() {
        const animStore = useAnimationStore.getState();
        const cam = this.engine.activeCamera;
        return {
            frame: animStore.currentFrame,
            offset: { ...engine.sceneOffset },
            camPos: cam ? cam.position.clone() : new THREE.Vector3(),
            camQuat: cam ? cam.quaternion.clone() : new THREE.Quaternion(),
            wasPlaying: animStore.isPlaying
        };
    }

    public async renderSequence(
        config: VideoExportConfig, 
        directStream: FileSystemWritableFileStream | null,
        onProgress: (p: number, frameInfo?: string) => void
    ): Promise<void> {
        if (!this.engine.renderer) throw new Error("Renderer not ready");
        
        console.log("VideoExporter: Starting render sequence", config);

        // 1. Prepare Session
        useFractalStore.getState().setIsExporting(true);
        this.isCancelled = false;
        this.shouldStitchEarly = false;
        this.isPaused = false;
        
        const animStore = useAnimationStore.getState();
        if (animStore.isPlaying) animStore.pause();

        const formatDef = VIDEO_FORMATS[config.formatIndex] || VIDEO_FORMATS[0];
        console.log(`VideoExporter: Using ${formatDef.label} (${formatDef.codec})`);

        // COMPATIBILITY FIX: Enforce 16-pixel alignment for dimensions.
        const align = 16;
        const safeWidth = Math.floor(config.width / align) * align;
        const safeHeight = Math.floor(config.height / align) * align;
        
        const scale = config.internalScale || 1.0;
        this.initTargets(safeWidth, safeHeight, scale);

        const start = Math.max(0, config.startFrame);
        const end = Math.max(start, Math.min(animStore.durationFrames, config.endFrame));
        const step = Math.max(1, Math.floor(config.frameStep));
        const totalFrames = Math.floor((end - start) / step) + 1;

        // 3. Initialize Mediabunny Output
        let target: Mediabunny.Target;
        let format: Mediabunny.OutputFormat;

        if (formatDef.container === 'webm') {
            console.log("VideoExporter: Streaming WebM Mode");
            if (directStream) {
                target = new Mediabunny.StreamTarget(directStream as unknown as WritableStream, { chunked: true });
            } else {
                target = new Mediabunny.BufferTarget();
            }
            format = new Mediabunny.WebMOutputFormat();
        } else {
            if (directStream) {
                console.log("VideoExporter: Streaming MP4 Mode (True Disk Write)");
                target = new Mediabunny.StreamTarget(directStream as unknown as WritableStream, { chunked: true });
                format = new Mediabunny.Mp4OutputFormat({ fastStart: 'in-memory' });
            } else {
                console.log("VideoExporter: Buffered MP4 Mode (RAM)");
                target = new Mediabunny.BufferTarget();
                format = new Mediabunny.Mp4OutputFormat({ fastStart: 'in-memory' });
            }
        }

        const output = new Mediabunny.Output({
            format: format,
            target: target
        });

        const packetSource = new Mediabunny.EncodedVideoPacketSource(formatDef.codec as Mediabunny.VideoCodec);
        
        let encoderError: Error | null = null;
        let muxerChain = Promise.resolve();
        let extractedDescription: Uint8Array | null = null;

        // 5. Setup Encoder
        const encoder = new VideoEncoder({
            output: (chunk, meta) => {
                if (encoderError) return;

                // 1. Capture Raw Data Sync
                const rawBuffer = new Uint8Array(chunk.byteLength);
                chunk.copyTo(rawBuffer);

                // 2. STABLE CLONE OF METADATA (survival in promise chain)
                const stableMeta = meta ? {
                    decoderConfig: {
                        ...meta.decoderConfig,
                        description: meta.decoderConfig?.description ? new Uint8Array(meta.decoderConfig.description as any).slice() : undefined
                    }
                } : undefined;

                // WRAP: Create a new Packet
                // We don't use fromEncodedChunk because we might modify the buffer (AnnexB -> AVCC)
                const packet = new Mediabunny.EncodedPacket(
                    rawBuffer as any,
                    chunk.type,
                    chunk.timestamp / 1e6,
                    (chunk.duration ?? 0) / 1e6
                );

                // 3. Queue to Muxer
                muxerChain = muxerChain.then(async () => {
                    if (encoderError) return;
                    try {
                        // FIX: Perform conversion inside the chain
                        if (formatDef.container === 'mp4' && formatDef.codec === 'avc') {
                            const converted = H264Converter.convertChunkToAVCC(packet.data);
                            (packet as any).data = converted.data; // Mutate internal buffer
                            
                            if (converted.sps && converted.pps && !extractedDescription) {
                                console.log("VideoExporter: Manually extracted SPS/PPS for WMP compatibility.");
                                extractedDescription = H264Converter.createAVCCDescription(converted.sps, converted.pps);
                            }
                        }

                        // INJECTION FIX: Ensure stableMeta has the description if we extracted it.
                        // This prevents Mediabunny from trying to parse the AVCC packet as AnnexB to find the config.
                        if (stableMeta && stableMeta.decoderConfig && !stableMeta.decoderConfig.description && extractedDescription) {
                            stableMeta.decoderConfig.description = extractedDescription;
                        }

                        if (output.state === 'pending') {
                            const desc = extractedDescription || stableMeta?.decoderConfig?.description;
                            if (formatDef.container === 'mp4' && !desc) {
                                throw new Error("Codec configuration (SPS/PPS) missing from stream. Muxer cannot continue.");
                            }
                            
                            output.addVideoTrack(packetSource, {
                                frameRate: config.fps,
                                width: safeWidth,
                                height: safeHeight,
                                displayWidth: safeWidth,
                                displayHeight: safeHeight,
                                trackWidth: safeWidth,
                                trackHeight: safeHeight,
                                description: desc
                            } as any);
                            await output.start();
                        }
                        
                        // PASS THE CLONED META: This fixes "Video chunk metadata must be provided"
                        await packetSource.add(packet, stableMeta as any);

                    } catch (err) {
                        console.error("VideoExporter: Muxing failed", err);
                        encoderError = err as Error;
                    }
                });
            },
            error: (e) => {
                console.error("VideoExporter: WebCodecs Encoder Error", e);
                encoderError = e;
            }
        });

        const encoderConfig: VideoEncoderConfig = {
            // HIGH PROFILE, LEVEL 5.2 (avc1.640034)
            // This unblocks high bitrates and fixes quality issues in Firefox
            // 0x64 = High Profile (100)
            // 0x00 = Constraints
            // 0x34 = Level 5.2 (52)
            codec: formatDef.codec === 'avc' ? 'avc1.640034' : formatDef.codec, 
            width: safeWidth,
            height: safeHeight,
            bitrate: config.bitrate * VIDEO_CONFIG.BITRATE_MULTIPLIER,
            framerate: config.fps,
            latencyMode: 'quality',
            // Force annexb to ensure SPS/PPS are present for manual extraction
            avc: { format: formatDef.container === 'mp4' ? 'annexb' : 'avc' } 
        };

        // FORCE CONSTANT BITRATE (CBR)
        // Helps Firefox software encoder (OpenH264) allocate bits to dark areas
        try {
            const support = await VideoEncoder.isConfigSupported({ ...encoderConfig, bitrateMode: 'constant' });
            if (support.supported) {
                encoderConfig.bitrateMode = 'constant';
                console.log("VideoExporter: CBR Enabled for consistent quality.");
            } else {
                console.warn("VideoExporter: CBR not supported by browser/hardware. Falling back to VBR.");
            }
        } catch(e) {
            console.warn("VideoExporter: CBR Check failed.", e);
        }

        encoder.configure(encoderConfig);
        
        this.currentSession = {
            output,
            encoder,
            packetSource,
            muxerChain,
            config,
            safeWidth,
            safeHeight,
            totalFrames,
            startFrame: start,
            step,
            outputFrameIndex: 0,
            startTime: Date.now(),
            startState: this.captureCurrentState(),
            directStream: directStream,
            formatDef,
            scale
        };

        return new Promise<void>((resolve, reject) => {
             this.processLoop(resolve, reject, onProgress, () => encoderError);
        });
    }

    private async processLoop(
        resolve: () => void, 
        reject: (e: any) => void,
        onProgress: (p: number, frameInfo?: string) => void,
        checkError: () => Error | null
    ) {
        if (!this.currentSession) return;
        const session = this.currentSession;

        const err = checkError();
        if (err) {
            this.emergencyCleanup(session.directStream);
            reject(err);
            return;
        }

        if (this.isPaused) {
            setTimeout(() => this.processLoop(resolve, reject, onProgress, checkError), 100);
            return;
        }

        if (this.isCancelled) {
            if (this.shouldStitchEarly) {
                await this.finalizeExport(resolve);
                return;
            } else {
                this.emergencyCleanup(session.directStream);
                reject(new Error("Cancelled by user"));
                return;
            }
        }

        if (session.outputFrameIndex >= session.totalFrames) {
            await this.finalizeExport(resolve);
            return;
        }

        try {
            const timelineFrame = session.startFrame + (session.outputFrameIndex * session.step);
            const time = timelineFrame / session.config.fps;
            const timestampMicros = session.outputFrameIndex * (1e6 / session.config.fps); 
            const durationMicros = (1e6 / session.config.fps);

            animationEngine.scrub(timelineFrame);
            
            await this.renderFrameToBuffers(
                session.safeWidth, 
                session.safeHeight, 
                time, 
                session.config.samples, 
                session.scale
            );
            
            const buffer = this.captureFrameData(session.safeWidth, session.safeHeight);
            
            const frame = new VideoFrame(buffer, {
                format: 'RGBX',
                codedWidth: session.safeWidth,
                codedHeight: session.safeHeight,
                timestamp: timestampMicros,
                duration: durationMicros,
                visibleRect: { x: 0, y: 0, width: session.safeWidth, height: session.safeHeight },
                colorSpace: {
                    fullRange: true, // Use Full Range RGB for best color retention
                    matrix: 'bt709',
                    primaries: 'bt709',
                    transfer: 'bt709'
                }
            });

            const isFirstFrame = session.outputFrameIndex === 0;
            session.encoder.encode(frame, { keyFrame: isFirstFrame });
            frame.close();
            
            // NOTE: Removed previewBitmap generation to save performance and remove preview from UI
            
            const percent = ((session.outputFrameIndex + 1) / session.totalFrames) * 99;
            onProgress(percent, `Frame ${timelineFrame} (${session.outputFrameIndex + 1}/${session.totalFrames})`);
            
            session.outputFrameIndex++;
            setTimeout(() => this.processLoop(resolve, reject, onProgress, checkError), 0);
        } catch (e) {
            console.error("Frame processing failed", e);
            this.emergencyCleanup(session.directStream);
            reject(e);
        }
    }

    private async finalizeExport(resolve: () => void) {
        if (!this.currentSession) return;
        console.log("VideoExporter: Finalizing...");
        await this.currentSession.encoder.flush();
        this.currentSession.encoder.close();
        await this.currentSession.muxerChain;
        await this.currentSession.output.finalize();

        if (!this.currentSession.directStream) {
             const target = this.currentSession.output.target as Mediabunny.BufferTarget;
             if (target.buffer) {
                 this.triggerDownload(target.buffer, this.currentSession.formatDef);
             }
        } else {
             try { await this.currentSession.directStream.close(); } catch(e) {}
        }
        
        this.restoreState();
        resolve();
    }
    
    private triggerDownload(buffer: ArrayBuffer, formatDef: any) {
         const blob = new Blob([buffer], { type: formatDef.mime });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `fractal_export.${formatDef.ext}`;
         a.click();
         setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

    private async emergencyCleanup(stream?: FileSystemWritableFileStream | null) {
        if (stream) {
            try { await stream.close(); } catch(e) { console.warn("Stream close failed", e); }
        }
        this.restoreState();
    }

    public restoreState(
        frame?: number,
        offset?: any,
        camPos?: THREE.Vector3,
        camQuat?: THREE.Quaternion,
        wasPlaying?: boolean
    ) {
        const session = this.currentSession;
        
        const finalFrame = frame ?? session?.startState.frame ?? 0;
        const finalOffset = offset ?? session?.startState.offset ?? { x:0,y:0,z:0, xL:0, yL:0, zL:0 };
        const finalCamPos = camPos ?? session?.startState.camPos;
        const finalCamQuat = camQuat ?? session?.startState.camQuat;
        const finalPlaying = wasPlaying ?? session?.startState.wasPlaying ?? false;

        useFractalStore.getState().setIsExporting(false);
        this.isPaused = false;
        
        if (this.engine.renderer) {
            this.engine.renderer.setRenderTarget(null);
            const canvas = this.engine.renderer.domElement;
            this.engine.mainUniforms.uResolution.value.set(canvas.width, canvas.height);
        }

        this.cleanupTargets();

        const fractalStore = useFractalStore.getState();
        const animStore = useAnimationStore.getState();
        
        fractalStore.setSceneOffset(finalOffset);
        animStore.seek(finalFrame);
        
        if (this.engine.activeCamera && finalCamPos && finalCamQuat) {
            this.engine.activeCamera.position.copy(finalCamPos);
            this.engine.activeCamera.quaternion.copy(finalCamQuat);
            this.engine.activeCamera.updateMatrixWorld();
        }

        animationEngine.scrub(finalFrame);
        if (finalPlaying) animStore.play();
        
        this.engine.resetAccumulation();
        this.currentSession = null;
    }

    private initTargets(w: number, h: number, scale: number = 1.0) {
        const accW = Math.floor(w * scale);
        const accH = Math.floor(h * scale);
        
        if (this.accumTargetA && (this.accumTargetA.width !== accW || this.accumTargetA.height !== accH)) {
            this.cleanupTargets();
        }

        if (!this.accumTargetA) {
            const accumOpts = {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.HalfFloatType,
                stencilBuffer: false,
                depthBuffer: false,
            };
            this.accumTargetA = new THREE.WebGLRenderTarget(accW, accH, accumOpts);
            this.accumTargetB = new THREE.WebGLRenderTarget(accW, accH, accumOpts);
            
            const exportOpts = {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.UnsignedByteType, 
                stencilBuffer: false,
                depthBuffer: false
            };
            this.exportTarget = new THREE.WebGLRenderTarget(w, h, exportOpts);
            
            this.pixelBuffer = new Uint8Array(w * h * 4);
        }
    }
    
    private cleanupTargets() {
        this.accumTargetA?.dispose();
        this.accumTargetB?.dispose();
        this.exportTarget?.dispose();
        
        this.accumTargetA = null;
        this.accumTargetB = null;
        this.exportTarget = null;
        this.pixelBuffer = null;
    }

    private async renderFrameToBuffers(
        width: number, 
        height: number, 
        time: number, 
        samples: number, 
        scale: number = 1.0
    ) {
        if (!this.engine.renderer || !this.accumTargetA || !this.accumTargetB || !this.exportTarget) return;
        const renderer = this.engine.renderer;
        
        const renderW = Math.floor(width * scale);
        const renderH = Math.floor(height * scale);
        
        this.engine.mainUniforms.uResolution.value.set(renderW, renderH);
        this.engine.mainUniforms.uTime.value = time;
        
        if (this.engine.activeCamera) {
            const cam = this.engine.activeCamera as THREE.PerspectiveCamera;
            const oldAspect = cam.aspect;
            cam.aspect = width / height; 
            cam.updateProjectionMatrix();
            this.engine.syncFrame(cam, { clock: { elapsedTime: time } });
            cam.aspect = oldAspect; 
            cam.updateProjectionMatrix();
        }

        let writeBuffer = this.accumTargetA;
        let readBuffer = this.accumTargetB;
        
        for (let i = 1; i <= samples; i++) {
            const blend = 1.0 / i;
            this.engine.mainUniforms.uBlendFactor.value = blend;
            this.engine.mainUniforms.uExtraSeed.value = Math.random() * 100.0;
            this.engine.mainUniforms.uHistoryTexture.value = readBuffer.texture;
            
            if (i > 1) {
                const idx = (i % 16) + 1;
                const jX = halton(idx, 2);
                const jY = halton(idx, 3);
                this.engine.mainUniforms.uJitter.value.set(jX * 2.0 - 1.0, jY * 2.0 - 1.0);
            } else {
                this.engine.mainUniforms.uJitter.value.set(0, 0);
            }
            
            renderer.setRenderTarget(writeBuffer);
            if (i === 1) renderer.clear(); 
            
            renderer.render(this.engine.mainScene, this.engine.mainCamera);
            
            const temp = writeBuffer;
            writeBuffer = readBuffer;
            readBuffer = temp;
        }
        
        const state = useFractalStore.getState();
        this.engine.materials.updatePostProcessUniforms(state);
        this.engine.materials.exportMaterial.uniforms.map.value = readBuffer.texture;
        this.engine.materials.exportMaterial.uniforms.uResolution.value.set(width, height);
        
        // --- KEY UPDATE: Push frame to main display for visual feedback ---
        this.engine.materials.displayMaterial.uniforms.map.value = readBuffer.texture;
        this.engine.materials.displayMaterial.uniforms.uResolution.value.set(width, height);
        
        // Render Post Process to Export Target
        renderer.setRenderTarget(this.exportTarget);
        renderer.render(this.ppScene, this.ppCamera);
        
        // Also blit to screen (Optional but good for feedback if Canvas is visible)
        // Since we are inside an async loop, this might fight with the main loop if not paused.
        // But renderSequence pauses the main loop first.
        renderer.setRenderTarget(null);
        renderer.render(this.engine.sceneCtrl.displayScene, this.engine.sceneCtrl.mainCamera);
    }

    private captureFrameData(w: number, h: number): Uint8Array {
        if (!this.engine.renderer || !this.pixelBuffer) throw new Error("Export fail: Resources cleaned up");
        if (!this.exportTarget) throw new Error("No buffer rendered");
        
        this.engine.renderer.readRenderTargetPixels(this.exportTarget, 0, 0, w, h, this.pixelBuffer);
        
        const stride = w * 4;
        const halfHeight = Math.floor(h / 2);
        const row = new Uint8Array(stride);
        
        for (let y = 0; y < halfHeight; y++) {
            const topOffset = y * stride;
            const bottomOffset = (h - y - 1) * stride;
            
            row.set(this.pixelBuffer.subarray(topOffset, topOffset + stride));
            this.pixelBuffer.set(this.pixelBuffer.subarray(bottomOffset, bottomOffset + stride), topOffset);
            this.pixelBuffer.set(row, bottomOffset);
        }
        
        for (let i = 3; i < this.pixelBuffer.length; i += 4) {
            this.pixelBuffer[i] = 255;
        }

        return this.pixelBuffer;
    }
}

export const videoExporter = new VideoExporter(engine);
