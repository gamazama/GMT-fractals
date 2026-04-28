/**
 * MainThreadEncoder — main-thread WebCodecs + mediabunny pipeline.
 *
 * Mirrors the encoder lifecycle that lives inside engine-gmt's
 * `WorkerExporter`, ported to the main thread for apps that don't
 * have a render worker (fluid-toy is single-threaded; the fractal-toy
 * follow-on can reuse this too). Image-sequence + multi-pass support
 * is intentionally left out — apps that need those run through the
 * GMT worker path instead.
 *
 *   const enc = new MainThreadEncoder();
 *   await enc.start({ width, height, fps, bitrate, formatIndex }, stream);
 *   for (let i = 0; i < N; i++) enc.encodeCanvas(canvas, i);
 *   const buffer = await enc.finish();      // null when stream-mode
 *
 * Cancel via `enc.cancel()` — the muxer chain is dropped on the floor;
 * the consumer is responsible for releasing/closing any disk handle.
 */

import * as Mediabunny from 'mediabunny';
import { VIDEO_FORMATS, VIDEO_CONFIG } from '../../data/constants';

export interface MainThreadEncoderConfig {
    width:       number;
    height:      number;
    fps:         number;
    /** Mbps; multiplied by `BITRATE_MULTIPLIER * 2.5` to compensate for
     *  CBR undershoot on smooth-gradient content (matches WorkerExporter). */
    bitrate:     number;
    formatIndex: number;
}

/** Browser-capability gate. Returns `false` (with reason) if WebCodecs
 *  is missing or mediabunny refuses the requested codec/dims combination.
 *  Apps surface the reason in their export UI. */
export const canEncodeFormat = async (
    formatIndex: number,
    width: number,
    height: number,
    bitrateMbps: number,
): Promise<{ ok: boolean; reason?: string }> => {
    if (typeof VideoEncoder === 'undefined') {
        return { ok: false, reason: 'WebCodecs (VideoEncoder) is not available in this browser.' };
    }
    const formatDef = VIDEO_FORMATS[formatIndex] ?? VIDEO_FORMATS[0];
    if (formatDef.imageSequence) {
        return { ok: false, reason: 'Image-sequence formats are not supported on the main-thread encoder.' };
    }
    try {
        const safeW = width  % 2 === 0 ? width  : width  - 1;
        const safeH = height % 2 === 0 ? height : height - 1;
        const ok = await Mediabunny.canEncodeVideo(formatDef.codec as Mediabunny.VideoCodec, {
            width: safeW, height: safeH,
            bitrate: bitrateMbps * VIDEO_CONFIG.BITRATE_MULTIPLIER,
        });
        return ok ? { ok: true } : { ok: false, reason: 'Browser/GPU rejected this codec at the requested resolution.' };
    } catch (e) {
        return { ok: false, reason: e instanceof Error ? e.message : String(e) };
    }
};

export class MainThreadEncoder {
    private output: Mediabunny.Output | null              = null;
    private packetSource: Mediabunny.EncodedVideoPacketSource | null = null;
    private encoder: VideoEncoder | null                  = null;
    private muxerChain: Promise<void>                     = Promise.resolve();
    private firstChunkOffsetMicros: number | null         = null;
    private fps                                           = 30;
    private formatDef: typeof VIDEO_FORMATS[number] | null = null;
    private encoderError: Error | null                    = null;

    get active(): boolean { return this.encoder !== null; }

    /** Open the output (StreamTarget when `stream` is provided, else
     *  in-memory BufferTarget) and configure the encoder. Throws if the
     *  format is image-sequence — main-thread path is video-only. */
    async start(cfg: MainThreadEncoderConfig, stream: WritableStream | null): Promise<void> {
        const formatDef = VIDEO_FORMATS[cfg.formatIndex] ?? VIDEO_FORMATS[0];
        if (formatDef.imageSequence) {
            throw new Error('MainThreadEncoder: image-sequence formats are not supported');
        }
        this.formatDef             = formatDef;
        this.fps                   = cfg.fps;
        this.firstChunkOffsetMicros = null;
        this.muxerChain            = Promise.resolve();
        this.encoderError          = null;

        const target: Mediabunny.Target = stream
            ? new Mediabunny.StreamTarget(stream as unknown as WritableStream, { chunked: true })
            : new Mediabunny.BufferTarget();

        const format: Mediabunny.OutputFormat = formatDef.container === 'webm'
            ? new Mediabunny.WebMOutputFormat()
            : new Mediabunny.Mp4OutputFormat({ fastStart: 'in-memory' });

        this.output = new Mediabunny.Output({ format, target });
        this.packetSource = new Mediabunny.EncodedVideoPacketSource(formatDef.codec as Mediabunny.VideoCodec);

        this.encoder = new VideoEncoder({
            output: (chunk, meta) => this.handleEncodedChunk(chunk, meta),
            error: (e) => {
                console.error('[MainThreadEncoder] Encoder error:', e);
                this.encoderError = e instanceof Error ? e : new Error(String(e));
            },
        });

        // BITRATE_MULTIPLIER * 2.5 mirrors WorkerExporter — CBR encoders
        // under-target on smooth gradient content (low motion); the
        // multiplier keeps player-reported bitrate near the user's setting.
        this.encoder.configure({
            codec:        formatDef.codec === 'avc' ? 'avc1.640034' : (formatDef.codec as string),
            width:        cfg.width,
            height:       cfg.height,
            bitrate:      cfg.bitrate * VIDEO_CONFIG.BITRATE_MULTIPLIER * 2.5,
            framerate:    cfg.fps,
            latencyMode:  'quality',
            bitrateMode:  'constant',
            avc:          { format: formatDef.container === 'mp4' ? 'annexb' : 'avc' },
        });
    }

    /** Encode one frame. Frame 0 is forced to a keyframe so the muxer's
     *  PTS-offset normalization (see `handleEncodedChunk`) works on
     *  Firefox's leading-latency reorder. */
    encodeCanvas(canvas: HTMLCanvasElement | OffscreenCanvas, frameIndex: number): void {
        if (!this.encoder) throw new Error('MainThreadEncoder: not started');
        if (this.encoderError) throw this.encoderError;
        const frame = new VideoFrame(canvas as CanvasImageSource, {
            timestamp: frameIndex * (1e6 / this.fps),
            duration:  1e6 / this.fps,
        });
        this.encoder.encode(frame, { keyFrame: frameIndex === 0 });
        frame.close();
    }

    private handleEncodedChunk(chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined): void {
        if (!this.output || !this.packetSource) return;

        const rawBuffer = new Uint8Array(chunk.byteLength);
        chunk.copyTo(rawBuffer);

        // Snapshot the decoder description so the muxer chain (async)
        // doesn't see it mutated by a later chunk metadata callback.
        const stableMeta = meta
            ? {
                  decoderConfig: {
                      ...meta.decoderConfig,
                      description: meta.decoderConfig?.description
                          ? new Uint8Array(meta.decoderConfig.description as ArrayBufferLike).slice()
                          : undefined,
                  },
              }
            : undefined;

        // Firefox adds a one-frame leading-latency offset to every chunk
        // timestamp; the muxer would bake that into the file's total
        // duration and the played fps would come out as N/(N+1). Subtract
        // the first chunk's timestamp; no-op on Chrome (offset is 0).
        if (this.firstChunkOffsetMicros === null) {
            this.firstChunkOffsetMicros = chunk.timestamp;
        }
        const tsSec     = (chunk.timestamp - this.firstChunkOffsetMicros) / 1e6;
        const durSec    = 1 / this.fps;
        const packet    = new Mediabunny.EncodedPacket(rawBuffer, chunk.type, tsSec, durSec);
        const output    = this.output;
        const source    = this.packetSource;
        const fps       = this.fps;

        this.muxerChain = this.muxerChain.then(async () => {
            try {
                if (output.state === 'pending') {
                    output.addVideoTrack(source, { frameRate: fps });
                    await output.start();
                }
                await source.add(packet, stableMeta as EncodedVideoChunkMetadata | undefined);
            } catch (e) {
                console.error('[MainThreadEncoder] Muxing error:', e);
                this.encoderError = e instanceof Error ? e : new Error(String(e));
            }
        });
    }

    /** Drain the encoder + muxer, finalize the output. Returns the
     *  ArrayBuffer when the target was a BufferTarget; null when streaming
     *  to disk (bytes are already on the stream). */
    async finish(): Promise<ArrayBuffer | null> {
        if (!this.encoder || !this.output) return null;
        try {
            await this.encoder.flush();
            this.encoder.close();
            await this.muxerChain;
            if (this.encoderError) throw this.encoderError;
            await this.output.finalize();
            let blob: ArrayBuffer | null = null;
            if (this.output.target instanceof Mediabunny.BufferTarget) {
                blob = (this.output.target as Mediabunny.BufferTarget).buffer ?? null;
            }
            return blob;
        } finally {
            this.encoder      = null;
            this.output       = null;
            this.packetSource = null;
        }
    }

    /** Best-effort abort. The muxer chain is dropped — partial files on
     *  disk are the caller's problem. */
    cancel(): void {
        try { this.encoder?.close(); } catch { /* already closed */ }
        this.encoder      = null;
        this.output       = null;
        this.packetSource = null;
    }
}
