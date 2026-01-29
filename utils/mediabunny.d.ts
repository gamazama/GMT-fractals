
// Minimal Type Definitions for Mediabunny
// Includes [key: string]: any to prevent strict object literal checks blocking the build

declare module 'mediabunny' {
    export type VideoCodec = 'avc' | 'hevc' | 'vp9' | 'av1' | 'vp8';
    export type AudioCodec = 'aac' | 'opus' | 'mp3' | 'pcm-s16';

    export interface VideoEncodingConfig {
        codec: VideoCodec;
        width: number;
        height: number;
        bitrate: number;
        frameRate: number;
        keyFrameInterval?: number;
        alpha?: 'discard' | 'keep';
        fullCodecString?: string; // Added for explicit profile control
        latencyMode?: 'quality' | 'realtime';
        [key: string]: any; // Allow arbitrary props to prevent TS errors
    }

    export class VideoSample {
        constructor(videoFrame: any, init?: any);
        constructor(data: Uint8Array, init: {
            format: string;
            codedWidth: number;
            codedHeight: number;
            timestamp: number;
            duration: number;
            visibleRect?: { x: number, y: number, width: number, height: number };
            colorSpace?: { primaries?: string, transfer?: string, matrix?: string, fullRange?: boolean };
            [key: string]: any; // Allow relaxed props
        });
        close(): void;
    }

    export class VideoSampleSource {
        constructor(config: VideoEncodingConfig);
        add(sample: VideoSample, options?: any): Promise<void>;
        close(): Promise<void>;
    }
    
    export class EncodedPacket {
        constructor(data: Uint8Array, type: 'key' | 'delta', timestamp: number, duration?: number);
        static fromEncodedChunk(chunk: any): EncodedPacket;
        data: Uint8Array;
    }

    export class EncodedVideoPacketSource {
        constructor(codec: VideoCodec);
        add(packet: EncodedPacket, options?: any): Promise<void>;
    }

    export class Target {
        // Base class
    }

    export class BufferTarget extends Target {
        buffer: ArrayBuffer | null;
    }

    export class StreamTarget extends Target {
        constructor(stream: WritableStream, options?: any);
    }

    export abstract class OutputFormat {}
    export class Mp4OutputFormat extends OutputFormat {
        constructor(options?: any);
    }
    export class WebMOutputFormat extends OutputFormat {
        constructor(options?: any);
    }

    export class Output {
        constructor(options: { format: OutputFormat; target: Target });
        target: Target;
        state: 'pending' | 'started' | 'finalizing' | 'finalized' | 'canceled';
        addVideoTrack(source: VideoSampleSource | EncodedVideoPacketSource, options?: any): void;
        start(): Promise<void>;
        finalize(): Promise<void>;
    }

    export function canEncodeVideo(codec: VideoCodec, config?: Partial<VideoEncodingConfig>): Promise<boolean>;
}
