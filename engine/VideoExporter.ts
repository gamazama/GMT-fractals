
import * as THREE from 'three';
import { FractalEngine } from './FractalEngine';
import { animationEngine } from './AnimationEngine';
import { useAnimationStore } from '../store/animationStore';
import { useFractalStore } from '../store/fractalStore';
import { VIDEO_CONFIG, VIDEO_FORMATS } from '../data/constants';
import { FractalEvents, FRACTAL_EVENTS } from './FractalEvents';
import * as Mediabunny from 'mediabunny';
import { modulationEngine } from '../features/modulation/ModulationEngine';
import { featureRegistry } from './FeatureSystem';
import { ColoringState } from '../features/coloring';
import { GeometryState } from '../features/geometry';

// --- UTILS (Same as before) ---
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
    bitrate: number;
    samples: number;
    startFrame: number;
    endFrame: number;
    frameStep: number;
    formatIndex: number;
    internalScale?: number;
}

interface ExportSession {
    output: Mediabunny.Output;
    packetSource: Mediabunny.EncodedVideoPacketSource;
    encoder: VideoEncoder;
    muxerChain: Promise<void>; 
    config: VideoExportConfig;
    
    // Runtime State
    safeWidth: number;
    safeHeight: number;
    renderWidth: number;
    renderHeight: number;
    totalFrames: number;
    
    currentOutputIndex: number; // 0 to totalFrames
    currentSample: number; // 0 to config.samples
    
    // State Restoration
    startState: {
        frame: number;
        offset: any;
        camPos: THREE.Vector3;
        camQuat: THREE.Quaternion;
        wasPlaying: boolean;
        camAspect: number;
        lastFrameCount: number; // Save frame counter
    };
    directStream?: FileSystemWritableFileStream | null;
    formatDef: any;
}

export class VideoExporter {
    private engine: FractalEngine;
    
    // Accumulation Buffers - MRT for compatibility with main shader
    private accumTargetA: THREE.WebGLRenderTarget | null = null;
    private accumTargetB: THREE.WebGLRenderTarget | null = null;
    private exportTarget: THREE.WebGLRenderTarget | null = null;
    private pixelBuffer: Uint8Array | null = null;
    
    // Post Processing resources
    private ppScene: THREE.Scene;
    private ppCamera: THREE.OrthographicCamera;
    
    private session: ExportSession | null = null;
    private isPaused: boolean = false;
    private shouldStitchEarly: boolean = false;
    private isFinishing: boolean = false; // Guard to prevent double-finish
    
    // Used for AVCC extraction
    private extractedDescription: Uint8Array | null = null;
    
    // Frame counter for blue noise
    private internalFrameCounter: number = 0;
    
    // Scratches for Modulation application
    private juliaScratch = new THREE.Vector3();
    private mat4Scratch = new THREE.Matrix4();
    private mat3Scratch = new THREE.Matrix3();

    constructor(engineInstance: FractalEngine) {
        this.engine = engineInstance;
        this.ppScene = new THREE.Scene();
        this.ppCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.engine.materials.exportMaterial);
        quad.frustumCulled = false;
        this.ppScene.add(quad);
    }

    public get active() { return !!this.session; }
    
    private captureCurrentState() {
        const animStore = useAnimationStore.getState();
        const cam = this.engine.activeCamera;
        return {
            frame: animStore.currentFrame,
            offset: { ...this.engine.sceneOffset },
            camPos: cam ? cam.position.clone() : new THREE.Vector3(),
            camQuat: cam ? cam.quaternion.clone() : new THREE.Quaternion(),
            wasPlaying: animStore.isPlaying,
            camAspect: cam instanceof THREE.PerspectiveCamera ? cam.aspect : 1.0,
            lastFrameCount: this.engine.mainUniforms.uFrameCount.value
        };
    }

    public start(
        config: VideoExportConfig, 
        directStream: FileSystemWritableFileStream | null
    ) {
        if (!this.engine.renderer) throw new Error("Renderer not ready");

        const animStore = useAnimationStore.getState();
        if (animStore.isPlaying) animStore.pause();
        
        // 1. Setup Dimensions
        const align = 16;
        const safeWidth = Math.floor(config.width / align) * align;
        const safeHeight = Math.floor(config.height / align) * align;
        const scale = config.internalScale || 1.0;
        const renderW = Math.floor(safeWidth * scale);
        const renderH = Math.floor(safeHeight * scale);
        
        this.initTargets(safeWidth, safeHeight, renderW, renderH);

        // 2. Setup Camera for Export Aspect Ratio
        const cam = this.engine.activeCamera as THREE.PerspectiveCamera;
        const startState = this.captureCurrentState();
        
        cam.aspect = safeWidth / safeHeight;
        cam.updateProjectionMatrix();
        
        // Reset local frame counter for deterministic noise
        this.internalFrameCounter = 0;

        // 3. Encoder Setup
        const formatDef = VIDEO_FORMATS[config.formatIndex] || VIDEO_FORMATS[0];
        
        let target: Mediabunny.Target;
        let format: Mediabunny.OutputFormat;

        if (formatDef.container === 'webm') {
            target = directStream 
                ? new Mediabunny.StreamTarget(directStream as unknown as WritableStream, { chunked: true })
                : new Mediabunny.BufferTarget();
            format = new Mediabunny.WebMOutputFormat();
        } else {
            target = directStream
                ? new Mediabunny.StreamTarget(directStream as unknown as WritableStream, { chunked: true })
                : new Mediabunny.BufferTarget();
            format = new Mediabunny.Mp4OutputFormat({ fastStart: 'in-memory' });
        }

        const output = new Mediabunny.Output({ format, target });
        const packetSource = new Mediabunny.EncodedVideoPacketSource(formatDef.codec as Mediabunny.VideoCodec);

        let encoderError: Error | null = null;
        this.extractedDescription = null;

        const encoder = new VideoEncoder({
            output: (chunk, meta) => this.handleEncodedChunk(chunk, meta),
            error: (e) => { console.error("Encoder Error", e); encoderError = e; }
        });

        const encoderConfig: VideoEncoderConfig = {
            codec: formatDef.codec === 'avc' ? 'avc1.640034' : formatDef.codec,
            width: safeWidth,
            height: safeHeight,
            bitrate: config.bitrate * VIDEO_CONFIG.BITRATE_MULTIPLIER,
            framerate: config.fps,
            latencyMode: 'quality',
            avc: { format: formatDef.container === 'mp4' ? 'annexb' : 'avc' }
        };

        encoder.configure(encoderConfig);

        const start = Math.max(0, config.startFrame);
        const end = Math.max(start, Math.min(animStore.durationFrames, config.endFrame));
        const step = Math.max(1, Math.floor(config.frameStep));
        const totalFrames = Math.floor((end - start) / step) + 1;

        this.session = {
            output,
            packetSource,
            encoder,
            muxerChain: Promise.resolve(),
            config,
            safeWidth,
            safeHeight,
            renderWidth: renderW,
            renderHeight: renderH,
            totalFrames,
            currentOutputIndex: 0,
            currentSample: 0,
            startState,
            directStream,
            formatDef
        };
        
        this.isPaused = false;
        this.shouldStitchEarly = false;
        this.isFinishing = false;
        
        // Signal Start
        useFractalStore.getState().setIsExporting(true);
        this.engine.resetAccumulation(); // Clear any existing history
    }

    private handleEncodedChunk(chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined) {
        if (!this.session) return;
        const sess = this.session;

        // 1. Clone data
        const rawBuffer = new Uint8Array(chunk.byteLength);
        chunk.copyTo(rawBuffer);

        // 2. Clone Meta
        const stableMeta = meta ? {
            decoderConfig: {
                ...meta.decoderConfig,
                description: meta.decoderConfig?.description ? new Uint8Array(meta.decoderConfig.description as any).slice() : undefined
            }
        } : undefined;

        const packet = new Mediabunny.EncodedPacket(
            rawBuffer as any,
            chunk.type,
            chunk.timestamp / 1e6,
            (chunk.duration ?? 0) / 1e6
        );

        // 3. Queue Mux
        sess.muxerChain = sess.muxerChain.then(async () => {
            try {
                // AnnexB -> AVCC conversion for MP4
                if (sess.formatDef.container === 'mp4' && sess.formatDef.codec === 'avc') {
                    const converted = H264Converter.convertChunkToAVCC(packet.data);
                    (packet as any).data = converted.data;
                    
                    if (converted.sps && converted.pps && !this.extractedDescription) {
                        this.extractedDescription = H264Converter.createAVCCDescription(converted.sps, converted.pps);
                    }
                }

                if (stableMeta && stableMeta.decoderConfig && !stableMeta.decoderConfig.description && this.extractedDescription) {
                    stableMeta.decoderConfig.description = this.extractedDescription;
                }

                if (sess.output.state === 'pending') {
                    const desc = this.extractedDescription || stableMeta?.decoderConfig?.description;
                    if (sess.formatDef.container === 'mp4' && !desc) {
                         // Wait for next keyframe
                         console.warn("Waiting for SPS/PPS...");
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
            } catch(e) {
                console.error("Muxing error:", e);
                this.cancel();
            }
        });
    }

    // --- MAIN LOOP HOOK ---
    // Called by FractalEngine.render() when isExporting is true
    public tick(renderer: THREE.WebGLRenderer) {
        // Stop if session missing OR if we are in the flush phase
        if (!this.session || this.isFinishing) return;
        if (this.isPaused) return;

        const sess = this.session;

        // 1. Check if done
        if (sess.currentOutputIndex >= sess.totalFrames) {
            this.finish();
            return;
        }

        // 2. Prepare Frame State (Only once per frame)
        if (sess.currentSample === 0) {
            const timelineFrame = sess.config.startFrame + (sess.currentOutputIndex * sess.config.frameStep);
            const time = timelineFrame / sess.config.fps;
            
            // Sync Engine State (Keyframes)
            animationEngine.scrub(timelineFrame);
            
            // Apply Modulations (LFOs)
            this.applyModulations(time);
            
            // Sync Derived Logic (Rotation Matrices)
            this.updateDerivedState();

            // Explicitly force correct Time and Resolution uniforms via engine helper
            this.engine.setUniform('uTime', time);
            this.engine.setUniform('uResolution', new THREE.Vector2(sess.renderWidth, sess.renderHeight));
            this.engine.setUniform('uInternalScale', sess.config.internalScale || 1.0);
            this.engine.pipeline.resize(sess.renderWidth, sess.renderHeight);

            // Sync Camera Matrix for this exact time
            const cam = this.engine.activeCamera as THREE.PerspectiveCamera;
            if (cam) this.engine.syncFrame(cam, { clock: { elapsedTime: time } });
            
            // Clear Buffers
            renderer.setRenderTarget(this.accumTargetA); renderer.clear();
            renderer.setRenderTarget(this.accumTargetB); renderer.clear();
            
            // Update Progress UI
            const pct = (sess.currentOutputIndex / sess.totalFrames) * 100;
            // We use a custom event to update the UI without React render loop interference
            FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: true, progress: pct }); 
        }

        // 3. Render Accumulation Step
        this.renderStep(renderer);
        sess.currentSample++;

        // 4. Capture & Advance
        if (sess.currentSample >= sess.config.samples) {
            this.captureAndEncode(renderer);
            sess.currentOutputIndex++;
            sess.currentSample = 0;
            
            if (this.shouldStitchEarly) {
                this.finish();
            }
        }
    }
    
    // Calculates LFOs and applies them to uniforms (mimicking AnimationSystem)
    private applyModulations(time: number) {
        const store = useFractalStore.getState();
        const animations = store.animations;
        
        // 1. Update LFOs
        // Using a fixed delta of 1/fps ensures stability
        modulationEngine.resetOffsets();
        modulationEngine.updateOscillators(animations, time, 1.0 / this.session!.config.fps);
        
        // 2. Apply Rules (if any)
        if (store.modulation && store.modulation.rules) {
            modulationEngine.update(store.modulation.rules, 1.0 / this.session!.config.fps);
        }
        
        // 3. Apply Offsets to Uniforms
        const offsets = modulationEngine.offsets;
        const targets = Object.keys(offsets);
        
        let juliaDirty = false;
        
        targets.forEach(targetKey => {
             const offset = offsets[targetKey];
             if (Math.abs(offset) < 0.000001) return;

             // Handle Special Cases
             if (targetKey.startsWith('coloring.')) {
                 if (targetKey === 'coloring.repeats') {
                     const c = store.coloring as ColoringState;
                     const ratio = c.scale / c.repeats;
                     this.engine.setUniform('uColorScale', (c.repeats + offset) * ratio);
                     return;
                 }
                 if (targetKey === 'coloring.phase') {
                     const c = store.coloring as ColoringState;
                     this.engine.setUniform('uColorOffset', c.offset + offset);
                     return;
                 }
             }
             
             if (targetKey.startsWith('geometry.julia')) {
                 juliaDirty = true;
                 return;
             }
             
             // Handle Standard Uniforms
             let uniformName = '';
             let baseVal = 0;
             
             if (targetKey.includes('.')) {
                 const [fid, pid] = targetKey.split('.');
                 const feat = featureRegistry.get(fid);
                 if (feat && feat.params[pid]) {
                     uniformName = feat.params[pid].uniform || '';
                     const slice = (store as any)[fid];
                     if (slice) baseVal = slice[pid] ?? 0;
                 }
             } else if (targetKey.startsWith('param')) {
                 uniformName = 'u' + targetKey.charAt(0).toUpperCase() + targetKey.slice(1);
                 baseVal = (store.coreMath as any)?.[targetKey] ?? 0;
             }
             
             if (uniformName) {
                 this.engine.setUniform(uniformName, baseVal + offset);
             }
        });
        
        // Julia Composite
        if (juliaDirty) {
             const g = (store as any).geometry;
             const jx = (g.juliaX ?? 0) + (offsets['geometry.juliaX'] || 0);
             const jy = (g.juliaY ?? 0) + (offsets['geometry.juliaY'] || 0);
             const jz = (g.juliaZ ?? 0) + (offsets['geometry.juliaZ'] || 0);
             this.juliaScratch.set(jx, jy, jz);
             this.engine.setUniform('uJulia', this.juliaScratch);
        }
    }
    
    private updateDerivedState() {
        const state = useFractalStore.getState();
        const geom = (state as any).geometry; 
        
        // Geometry Rotation
        // Add modulation offsets if present
        const offsets = modulationEngine.offsets;
        const rotX = (geom.preRotX ?? 0) + (offsets['geometry.preRotX'] || 0);
        const rotY = (geom.preRotY ?? 0) + (offsets['geometry.preRotY'] || 0);
        const rotZ = (geom.preRotZ ?? 0) + (offsets['geometry.preRotZ'] || 0);

        if (geom && geom.preRotMaster) {
             const mx = new THREE.Matrix4().makeRotationX(rotX);
             const my = new THREE.Matrix4().makeRotationY(rotY);
             const mz = new THREE.Matrix4().makeRotationZ(rotZ);
             
             // Order: Z * X * Y 
             this.mat4Scratch.identity().multiply(mz).multiply(mx).multiply(my);
             this.mat3Scratch.setFromMatrix4(this.mat4Scratch);
             
             this.engine.setUniform('uPreRotMatrix', this.mat3Scratch);
        }
    }

    private renderStep(renderer: THREE.WebGLRenderer) {
        if (!this.session) return;
        const { renderWidth, renderHeight, currentSample } = this.session;
        
        // Ping-Pong
        let writeBuffer = this.accumTargetA;
        let readBuffer = this.accumTargetB;
        if (currentSample % 2 !== 0) {
            writeBuffer = this.accumTargetB;
            readBuffer = this.accumTargetA;
        }

        // Update Accumulation Uniforms
        // Blend = 1 / (N + 1)
        // Sample 0: 1/1 = 1.0 (Replace)
        // Sample 1: 1/2 = 0.5 (Mix 50%)
        const blend = 1.0 / (currentSample + 1);
        
        this.engine.mainUniforms.uBlendFactor.value = blend;
        this.engine.mainUniforms.uExtraSeed.value = Math.random() * 100.0;
        this.engine.mainUniforms.uHistoryTexture.value = readBuffer!.texture;
        
        // CRITICAL: Increment Frame Count per sample for Blue Noise Dithering
        // The Blue Noise shader chunks use uFrameCount to offset texture lookup.
        // If this is constant, noise is static and accumulation fails.
        this.internalFrameCounter++;
        this.engine.mainUniforms.uFrameCount.value = this.internalFrameCounter;
        
        // Jitter
        if (currentSample > 0) {
            const idx = (currentSample % 16) + 1;
            const jX = halton(idx, 2);
            const jY = halton(idx, 3);
            this.engine.mainUniforms.uJitter.value.set(jX * 2.0 - 1.0, jY * 2.0 - 1.0);
        } else {
            this.engine.mainUniforms.uJitter.value.set(0, 0);
        }

        // Render to FBO
        renderer.setRenderTarget(writeBuffer);
        renderer.render(this.engine.mainScene, this.engine.mainCamera);
        
        // Blit to Screen (Feedback) with Aspect Fit
        const canvas = renderer.domElement;
        
        // 1. Calculate fit
        const screenW = canvas.width;
        const screenH = canvas.height;
        const screenAspect = screenW / screenH;
        const imgAspect = this.session.renderWidth / this.session.renderHeight;
        
        let vx = 0, vy = 0, vw = screenW, vh = screenH;
        
        if (screenAspect > imgAspect) {
            // Screen is wider than image (Pillarbox)
            vw = Math.round(screenH * imgAspect);
            vx = Math.round((screenW - vw) / 2);
        } else {
            // Screen is taller than image (Letterbox)
            vh = Math.round(screenW / imgAspect);
            vy = Math.round((screenH - vh) / 2);
        }
        
        this.engine.materials.displayMaterial.uniforms.map.value = writeBuffer!.texture;
        this.engine.materials.displayMaterial.uniforms.uResolution.value.set(this.session.renderWidth, this.session.renderHeight);
        
        renderer.setRenderTarget(null);
        
        // Clear background to black (using Scissor to clear full screen efficiently)
        renderer.setScissor(0, 0, screenW, screenH);
        renderer.setScissorTest(true);
        renderer.setClearColor(0x000000, 1.0);
        renderer.clearColor(); 
        
        // Set Viewport for image
        renderer.setViewport(vx, vy, vw, vh);
        renderer.setScissor(vx, vy, vw, vh);
        renderer.render(this.engine.sceneCtrl.displayScene, this.engine.sceneCtrl.mainCamera);
    }

    private captureAndEncode(renderer: THREE.WebGLRenderer) {
        if (!this.session) return;
        
        // Which buffer has the final frame?
        const lastWrite = (this.session.currentSample % 2 !== 0) ? this.accumTargetA : this.accumTargetB;
        
        // Post Process to Export Target
        this.engine.materials.exportMaterial.uniforms.map.value = lastWrite!.texture;
        this.engine.materials.exportMaterial.uniforms.uResolution.value.set(this.session.safeWidth, this.session.safeHeight);
        
        renderer.setRenderTarget(this.exportTarget);
        renderer.setViewport(0, 0, this.session.safeWidth, this.session.safeHeight);
        renderer.render(this.ppScene, this.ppCamera);
        
        // Read Pixels
        renderer.readRenderTargetPixels(this.exportTarget!, 0, 0, this.session.safeWidth, this.session.safeHeight, this.pixelBuffer!);
        
        // Flip Y and Fix Alpha
        const w = this.session.safeWidth;
        const h = this.session.safeHeight;
        const stride = w * 4;
        const halfH = Math.floor(h / 2);
        
        for (let y = 0; y < halfH; y++) {
            const topOff = y * stride;
            const botOff = (h - y - 1) * stride;
            const topRow = this.pixelBuffer!.subarray(topOff, topOff + stride);
            const botRow = this.pixelBuffer!.subarray(botOff, botOff + stride);
            
            // Swap rows in place using a temp buffer isn't easy with typed arrays, 
            // but we can assume we have enough memory to copy.
            // Optimized swap:
            for(let i=0; i<stride; i++) {
                const temp = topRow[i];
                topRow[i] = botRow[i];
                botRow[i] = temp;
            }
        }
        
        // Force Alpha 255
        // (Optional, VideoEncoder usually ignores alpha unless configured otherwise, but safe)
        // Note: doing this in shader is faster. uEncodeOutput ensures alpha=1.0 in shader.

        // Encode
        const frameData = new VideoFrame(this.pixelBuffer!, {
            format: 'RGBX',
            codedWidth: w,
            codedHeight: h,
            timestamp: this.session.currentOutputIndex * (1e6 / this.session.config.fps),
            duration: (1e6 / this.session.config.fps),
            colorSpace: {
                primaries: 'bt709',
                transfer: 'bt709',
                matrix: 'rgb',
                fullRange: true
            }
        });
        
        const isKey = this.session.currentOutputIndex === 0;
        this.session.encoder.encode(frameData, { keyFrame: isKey });
        frameData.close();
    }

    public async finish() {
        if (!this.session || this.isFinishing) return;
        
        this.isFinishing = true;
        const sess = this.session;

        console.log("Export Finishing...");
        
        try {
            await sess.encoder.flush();
            sess.encoder.close();
            await sess.muxerChain;
            await sess.output.finalize();

            if (!sess.directStream) {
                 const target = sess.output.target as Mediabunny.BufferTarget;
                 if (target.buffer) {
                     const blob = new Blob([target.buffer], { type: sess.formatDef.mime });
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement('a');
                     a.href = url;
                     a.download = `fractal_export.${sess.formatDef.ext}`;
                     a.click();
                     setTimeout(() => URL.revokeObjectURL(url), 60000);
                 }
            } else {
                 await sess.directStream.close();
            }
        } catch (e) {
            console.error("Finalize Error", e);
            alert("Error finalizing video file.");
        }

        this.session = null; // Detach after flush completes
        this.isFinishing = false;
        
        // Restore
        this.cleanup();
        this.restoreState(sess.startState);
    }
    
    public cancel() {
        if (!this.session) return;
        const state = this.session.startState;
        if (this.session.directStream) {
            this.session.directStream.close().catch(()=>{});
        }
        this.session = null;
        this.isFinishing = false;
        this.cleanup();
        this.restoreState(state);
    }

    public pause() { this.isPaused = true; }
    public resume() { this.isPaused = false; }
    public finishAndStitch() { this.shouldStitchEarly = true; }

    private cleanup() {
        useFractalStore.getState().setIsExporting(false);
        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: false, progress: 0 });
        this.accumTargetA?.dispose();
        this.accumTargetB?.dispose();
        this.exportTarget?.dispose();
        this.accumTargetA = null;
        this.accumTargetB = null;
        this.exportTarget = null;
        this.pixelBuffer = null;
    }

    private restoreState(s: ExportSession['startState']) {
        const animStore = useAnimationStore.getState();
        const fractalStore = useFractalStore.getState();

        fractalStore.setSceneOffset(s.offset);
        animStore.seek(s.frame);
        
        if (this.engine.activeCamera) {
            const cam = this.engine.activeCamera as THREE.PerspectiveCamera;
            cam.position.copy(s.camPos);
            cam.quaternion.copy(s.camQuat);
            cam.aspect = s.camAspect;
            cam.updateProjectionMatrix();
            cam.updateMatrixWorld();
        }

        animationEngine.scrub(s.frame);
        if (s.wasPlaying) animStore.play();
        
        this.engine.resetAccumulation();
        
        // Restore engine frame count to avoid jump
        this.engine.mainUniforms.uFrameCount.value = s.lastFrameCount;

        // Reset renderer viewport and scissor
        if (this.engine.renderer) {
             const canvas = this.engine.renderer.domElement;
             this.engine.renderer.setViewport(0, 0, canvas.width, canvas.height);
             this.engine.renderer.setScissor(0, 0, canvas.width, canvas.height);
             this.engine.renderer.setScissorTest(false);
             // Force pipeline resize back to screen
             this.engine.pipeline.resize(canvas.width, canvas.height);
        }
    }

    private initTargets(w: number, h: number, rw: number, rh: number) {
        // Force Float Type for accumulation
        const floatType = THREE.FloatType; 
        
        // MRT options for compatibility with main shader (2 outputs: color + depth)
        const mrtOpts = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            stencilBuffer: false,
            depthBuffer: false,
            count: 2 // Use count parameter for MRT
        };
        
        // Re-create if dimensions mismatch
        if (this.accumTargetA && (this.accumTargetA.width !== rw || this.accumTargetA.height !== rh)) {
            this.accumTargetA.dispose();
            this.accumTargetB?.dispose();
            this.exportTarget?.dispose();
            this.accumTargetA = null;
        }

        if (!this.accumTargetA) {
            // Create single render targets (no MRT needed)
            const rtOpts = {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                stencilBuffer: false,
                depthBuffer: false,
                generateMipmaps: false,
                format: THREE.RGBAFormat,
                type: floatType
            };
            
            this.accumTargetA = new THREE.WebGLRenderTarget(rw, rh, rtOpts);
            this.accumTargetB = new THREE.WebGLRenderTarget(rw, rh, rtOpts);
            
            this.exportTarget = new THREE.WebGLRenderTarget(w, h, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.UnsignedByteType,
                stencilBuffer: false,
                depthBuffer: false
            });
            this.pixelBuffer = new Uint8Array(w * h * 4);
        }
    }
}
