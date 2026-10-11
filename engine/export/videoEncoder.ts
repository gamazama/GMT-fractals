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
 *
 * PITFALLS (a `stream`, 2026-10-11)
 *   - AN MP4 IS HELD IN MEMORY UNTIL `finish()` BY DEFAULT, WITH A
 *     `stream` TOO: `fastStart: 'in-memory'` puts the index (`moov`) at
 *     the front of the file, so the muxer keeps every encoded frame
 *     until the end and the stream gets its first byte then. A caller
 *     whose file must not be held asks for `mp4FastStart: false`
 *     (opt-in, below). WebM is written as it goes either way.
 *   - WITH A `stream`, BYTES LEAVE IN CHUNKS OF 16 MiB (mediabunny's
 *     `chunked` target): a file smaller than that arrives whole at
 *     `finish()`, whatever the layout.
 *   - `start` LOCKS THE `stream` (mediabunny takes its writer) and
 *     `cancel()` does not release it: after a cancel the caller can
 *     neither close nor abort that stream. A caller that has to throw a
 *     half-written file away hands `start` a stream OF ITS OWN that
 *     forwards to the file, and aborts the file itself.
 *
 * @assumption The three pitfalls above, `mp4FastStart: false`,
 *   `keyFrameEvery` and the codec strings (`codecString`) were measured
 *   in two apps on 2026-10-11, Chrome on the real GPU (debug/scratch/r6b/,
 *   git-ignored: video-render.mts drives an app that streams into a
 *   picked file, fluid-formats.mts drives fluid-toy's dialog through each
 *   of its four formats, before and after). NO STANDING GUARD reaches
 *   this file: no smoke opens a render dialog and starts a render.
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
    /** MP4 only; where the file's index (the `moov` box) goes. OPT-IN:
     *  absent is 'in-memory', what every caller got before this existed.
     *  - 'in-memory': at the front ("fast start", what a web player
     *    wants). Every encoded frame is held in memory until `finish()`,
     *    also when a `stream` was handed in.
     *  - false: the frames go to the target as they are encoded and the
     *    index is written last, so only the open 16 MiB chunk is held.
     *    For a long render into a `stream`; the stream must take writes
     *    at a position (a File System Access stream does). The file plays
     *    wherever a local file plays; over HTTP a player has to fetch its
     *    end first. */
    mp4FastStart?: 'in-memory' | false;
    /** OPT-IN: force a keyframe every this many frames. Absent (or 0):
     *  only frame 0 is forced and the codec decides the rest - which in
     *  Chrome is NONE (measured 2026-10-11: 300 frames of H.264 and of
     *  VP9, one keyframe each), so a player seeking into the file decodes
     *  from its start. A caller whose video will be scrubbed or cut asks
     *  for one a second or so (`fps`). */
    keyFrameEvery?: number;
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

/** The codec string WebCodecs wants for a `VIDEO_FORMATS` codec at a picture
 *  size. H.264 keeps the fixed High 5.2 string it always had. The bare
 *  names of the other three ('hevc', 'av1', 'vp9') are NOT codec strings:
 *  handed over as they are, Chrome answers each with "Unsupported codec
 *  type" and no file is made (measured 2026-10-11 in fluid-toy's own
 *  dialog: three of its four formats). So each says its profile (main,
 *  8 bit) and the level its picture size needs, the highest of that size's
 *  range, high tier: the bitrate then fits whatever the slider says. */
export const codecString = (codec: string, width: number, height: number): string => {
    const pixels = width * height;
    const step = pixels > 8_912_896 ? 2 : pixels > 2_228_224 ? 1 : 0;   // above 4096x2176 / above 2048x1088 / up to it
    switch (codec) {
        case 'avc':  return 'avc1.640034';
        case 'hevc': return `hev1.1.6.H${[123, 156, 186][step]}.B0`;     // level 4.1 / 5.2 / 6.2
        case 'av1':  return `av01.0.${['09', '14', '18'][step]}H.08`;    // level 4.1 / 5.2 / 6.2
        case 'vp9':  return `vp09.00.${[41, 52, 62][step]}.08`;          // level 4.1 / 5.2 / 6.2
        default:     return codec;
    }
};

export class MainThreadEncoder {
    private output: Mediabunny.Output | null              = null;
    private packetSource: Mediabunny.EncodedVideoPacketSource | null = null;
    private encoder: VideoEncoder | null                  = null;
    private muxerChain: Promise<void>                     = Promise.resolve();
    private firstChunkOffsetMicros: number | null         = null;
    private fps                                           = 30;
    private keyFrameEvery                                 = 0;
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
        this.keyFrameEvery         = Math.max(0, Math.round(cfg.keyFrameEvery ?? 0));
        this.firstChunkOffsetMicros = null;
        this.muxerChain            = Promise.resolve();
        this.encoderError          = null;

        const target: Mediabunny.Target = stream
            ? new Mediabunny.StreamTarget(stream as unknown as WritableStream, { chunked: true })
            : new Mediabunny.BufferTarget();

        const format: Mediabunny.OutputFormat = formatDef.container === 'webm'
            ? new Mediabunny.WebMOutputFormat()
            : new Mediabunny.Mp4OutputFormat({ fastStart: cfg.mp4FastStart ?? 'in-memory' });

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
            codec:        codecString(formatDef.codec, cfg.width, cfg.height),
            width:        cfg.width,
            height:       cfg.height,
            bitrate:      cfg.bitrate * VIDEO_CONFIG.BITRATE_MULTIPLIER * 2.5,
            framerate:    cfg.fps,
            latencyMode:  'quality',
            bitrateMode:  'constant',
            avc:          { format: formatDef.container === 'mp4' ? 'annexb' : 'avc' },
        });
    }

    /** Frames handed to `encodeCanvas` that the encoder has not taken up
     *  yet (WebCodecs' `encodeQueueSize`; 0 when not started). Each one
     *  holds its picture: a caller that makes frames faster than the
     *  codec encodes them waits for this to fall before the next. */
    get queueSize(): number { return this.encoder?.encodeQueueSize ?? 0; }

    /** Encode one frame: a canvas, or any other picture a `VideoFrame`
     *  can be made of (an `ImageBitmap`, say). Frame 0 is forced to a
     *  keyframe so the muxer's PTS-offset normalization (see
     *  `handleEncodedChunk`) works on Firefox's leading-latency reorder. */
    encodeCanvas(canvas: CanvasImageSource, frameIndex: number): void {
        if (!this.encoder) throw new Error('MainThreadEncoder: not started');
        if (this.encoderError) throw this.encoderError;
        const frame = new VideoFrame(canvas, {
            timestamp: frameIndex * (1e6 / this.fps),
            duration:  1e6 / this.fps,
        });
        this.encoder.encode(frame, { keyFrame: frameIndex === 0 || (this.keyFrameEvery > 0 && frameIndex % this.keyFrameEvery === 0) });
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
